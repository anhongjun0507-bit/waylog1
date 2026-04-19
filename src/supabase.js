import { createClient } from '@supabase/supabase-js'
// reports/analytics 는 하단에서 정의.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isConfigured) {
  console.warn('Supabase 환경변수 미설정 - 로컬 모드로 동작합니다.')
}

// 네이티브 앱(Capacitor) 에서는 URL 스킴으로 OAuth 콜백을 받으므로
// detectSessionInUrl 을 꺼서 hash fragment 파싱 충돌을 피한다.
// 대신 utils/platform.js 의 initDeepLinkHandler 가 명시적으로 setSession 호출.
const isNativeApp = typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.()

// Supabase 기본 storageKey 포맷은 `sb-<project-ref>-auth-token`.
// 마이그레이션(구→신) 시 대상 키 계산을 위해 여기서도 동일하게 유도.
const getDefaultStorageKey = (url) => {
  try {
    const host = new URL(url).hostname
    const ref = host.split('.')[0]
    return `sb-${ref}-auth-token`
  } catch {
    return 'sb-auth-token'
  }
}
const NEW_STORAGE_KEY = getDefaultStorageKey(supabaseUrl)
const MIGRATION_FLAG = 'waylog:migrated-auth-v3'

// ===== 1회성 마이그레이션 — 구버전(`waylog-auth-v2` 등) → Supabase 기본 키 =====
// 목적: 기존 배포 사용자가 재로그인 없이 세션 유지. 실행 후 구키/우회 키 전부 삭제.
// 실패 시 조용히 해당 키만 삭제(세션은 소실되어도 앱은 정상 동작 — 재로그인 안내).
//
// 웹(동기): localStorage 에서 직접 수행. createClient 전에 완료돼 Supabase 가 신키를 바로 픽업.
// 네이티브(비동기): Preferences 접근은 Promise 기반이라 createClient 뒤로 밀림.
// 대신 migrationReady 가 resolve 된 뒤 supabase.auth.setSession() 으로 세션을 주입.
const migrateLocalStorage = () => {
  if (typeof localStorage === 'undefined') return
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return
    const oldSession = localStorage.getItem('waylog-auth-v2')
    if (oldSession) {
      try {
        JSON.parse(oldSession) // 파싱 가능할 때만 복사
        if (!localStorage.getItem(NEW_STORAGE_KEY)) {
          localStorage.setItem(NEW_STORAGE_KEY, oldSession)
        }
      } catch {}
      localStorage.removeItem('waylog-auth-v2')
    }
    // auth 잔재 키 일괄 삭제 (user 캐시/우회 토큰/구버전 리셋 플래그)
    localStorage.removeItem('waylog:user')
    localStorage.removeItem('waylog-direct-token')
    localStorage.removeItem('waylog:auth-ver')
    localStorage.setItem(MIGRATION_FLAG, '1')
  } catch {}
}
// 웹 마이그레이션은 createClient 전에 동기적으로 수행.
migrateLocalStorage()

// 네이티브에서는 @capacitor/preferences (iOS Keychain / Android SharedPreferences) 로 세션 저장.
// 이유: Capacitor WebView 의 localStorage 는 유실 가능성이 있어 자동 로그인이 끊김.
// 웹에서는 undefined 를 넘겨 기본 localStorage 사용 (기본 동작).
let capacitorStorage = null
if (isNativeApp) {
  capacitorStorage = {
    async getItem(key) {
      try {
        const { Preferences } = await import('@capacitor/preferences')
        const { value } = await Preferences.get({ key })
        return value
      } catch { return null }
    },
    async setItem(key, value) {
      try {
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.set({ key, value })
      } catch {}
    },
    async removeItem(key) {
      try {
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.remove({ key })
      } catch {}
    },
  }
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // storageKey 옵션 제거 — Supabase 기본값(`sb-<ref>-auth-token`) 사용.
        // 구키 `waylog-auth-v2` 는 migrateLocalStorage() / migrationReady 에서 신키로 복사 후 삭제.
        storage: capacitorStorage || undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: !isNativeApp,
        flowType: 'pkce',
      },
    })
  : null

// 네이티브용 비동기 마이그레이션.
// Preferences 의 구키 값을 읽어 Supabase 에 setSession 으로 주입 → GoTrueClient 가
// 신키로 자동 저장. 기존 구키는 삭제. App.jsx 초기 로드 훅은 이 Promise 를 await 후
// getSession() 을 호출해야 재로그인 플래시가 없음.
// 웹에서는 즉시 resolve — 웹 마이그레이션은 이미 동기 완료.
export const migrationReady = (async () => {
  if (!isNativeApp || !supabase) return
  try {
    const { Preferences } = await import('@capacitor/preferences')
    const flagRes = await Preferences.get({ key: MIGRATION_FLAG })
    if (flagRes.value === '1') return

    const oldRes = await Preferences.get({ key: 'waylog-auth-v2' })
    // 구마이그레이션 플래그(이전 버전 localStorage→Preferences 용) 도 함께 정리
    await Preferences.remove({ key: 'waylog:auth-migrated-to-prefs' })
    await Preferences.remove({ key: 'waylog-auth-v2' })
    await Preferences.set({ key: MIGRATION_FLAG, value: '1' })

    if (oldRes.value) {
      try {
        const parsed = JSON.parse(oldRes.value)
        // Supabase v2 세션 형태: { access_token, refresh_token, ... }
        if (parsed?.access_token && parsed?.refresh_token) {
          await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          })
        }
      } catch {}
    }
  } catch (e) {
    console.warn('native auth 마이그레이션 실패:', e)
  }
})()

// 네이티브에서는 OAuth 리다이렉트 URL 로 이 값을 Supabase 로그인 옵션에 넘겨야 함
export const OAUTH_REDIRECT_URL = isNativeApp
  ? "com.waylog.app://auth-callback"
  : (typeof window !== "undefined" ? window.location.origin : undefined)

const noop = { data: null, error: null }
const noopArr = { data: [], error: null }

// Auth API — Supabase GoTrueClient 를 단일 권위(single source of truth)로 사용.
// 이전 버전의 getAccessToken / directRest / directSignIn / directSignUp 우회 경로는
// 중복 저장소(waylog-direct-token) 와 Supabase 내부 세션 간 경쟁으로 silent fail 을
// 유발해 제거됨. 네트워크 지연/문제는 호출측에서 명시적으로 에러 UI 노출.
export const auth = {
  async signUp(email, password, nickname) {
    if (!supabase) return noop
    try {
      return await supabase.auth.signUp({ email, password, options: { data: { nickname } } })
    } catch (e) {
      return { data: null, error: { message: e?.message || '가입 중 네트워크 오류가 발생했어요. 다시 시도해주세요.' } }
    }
  },
  async signIn(email, password) {
    if (!supabase) return noop
    try {
      return await supabase.auth.signInWithPassword({ email, password })
    } catch (e) {
      return { data: null, error: { message: e?.message || '로그인 중 네트워크 오류가 발생했어요. 다시 시도해주세요.' } }
    }
  },
  async signOut() {
    if (!supabase) return noop
    try {
      return await supabase.auth.signOut()
    } catch (e) {
      return { error: e }
    }
  },
  async getSession() {
    if (!supabase) return null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch { return null }
  },
  async getProfile(userId) {
    if (!supabase) return noop
    try {
      return await supabase.from('profiles').select('*').eq('id', userId).single()
    } catch (e) { return { data: null, error: e } }
  },
  async updateProfile(userId, patch) {
    if (!supabase) return noop
    try {
      return await supabase.from('profiles').upsert({ id: userId, ...patch, updated_at: new Date().toISOString() })
        .select().single()
    } catch (e) { return { data: null, error: e } }
  },
  // 회원가입/최초 로그인 시 profile 테이블에 row 가 없으면 생성.
  // DB trigger (handle_new_user) 가 설정돼 있으면 no-op 이지만, 설정 안 된 환경 방어.
  // 이미 있으면 그대로 반환 (편집한 값이 덮어쓰이지 않도록 insert 만 사용).
  async ensureProfile(userId, { nickname = '', avatar_url = '' } = {}) {
    if (!supabase || !userId) return noop
    try {
      const existing = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
      if (existing.data?.id) return { data: existing.data, error: null }
      return await supabase.from('profiles').insert({ id: userId, nickname, avatar_url }).select().single()
    } catch (e) { return { data: null, error: e } }
  },
  async updateUserMetadata(metadata) {
    if (!supabase) return noop
    try { return await supabase.auth.updateUser({ data: metadata }) }
    catch (e) { return { data: null, error: e } }
  },
}

// reviews → profiles 사이에 직접 FK 가 없으면 PostgREST 가 임베드 join 을
// 거부해 쿼리 전체가 실패한다 (둘 다 auth.users 만 참조하기 때문).
// fallback: join 없이 reviews 만 가져온 뒤 user_id 들을 모아 profiles 를
// 한 번 더 fetch 해서 클라이언트 사이드로 합친다.
async function enrichWithProfiles(rows) {
  if (!supabase || !Array.isArray(rows) || rows.length === 0) return rows || []
  const ids = [...new Set(rows.map((r) => r?.user_id).filter(Boolean))]
  if (ids.length === 0) return rows
  try {
    const { data: profs } = await supabase.from('profiles')
      .select('id, nickname, avatar_url').in('id', ids)
    const byId = new Map((profs || []).map((p) => [p.id, p]))
    return rows.map((r) => ({ ...r, profiles: byId.get(r.user_id) || null }))
  } catch {
    return rows
  }
}

// UI(mapReviewRow)에서 실제로 읽는 컬럼만 선택 — payload / 네트워크 절감.
// 새 컬럼을 UI 에서 쓰려면 여기도 같이 추가해야 함 (silent truncation 방지).
const REVIEW_COLS = 'id, user_id, title, content, category, tags, product_name, media, likes_count, views_count, created_at'

export const reviews = {
  // limit 기본 30 으로 상향 조정 — UI 에서 무한 스크롤로 추가 fetch.
  // 하위호환: 기존 호출은 limit 파라미터 없이 fetchAll() 로 첫 페이지만 가져온다.
  async fetchAll(limit = 30) {
    if (!supabase) return noopArr
    try {
      const { data, error } = await supabase.from('reviews').select(REVIEW_COLS)
        .order('created_at', { ascending: false }).limit(limit)
      if (error) return { data: [], error }
      return { data: await enrichWithProfiles(data), error: null }
    } catch (e) { return { data: [], error: e } }
  },
  // 커서(마지막 created_at) 이후 페이지 fetch. UI 무한 스크롤용.
  async fetchPage({ cursor = null, limit = 30 } = {}) {
    if (!supabase) return noopArr
    try {
      let q = supabase.from('reviews').select(REVIEW_COLS)
        .order('created_at', { ascending: false }).limit(limit)
      if (cursor) q = q.lt('created_at', cursor)
      const { data, error } = await q
      if (error) return { data: [], error }
      return { data: await enrichWithProfiles(data), error: null }
    } catch (e) { return { data: [], error: e } }
  },
  async fetchMine(userId) {
    if (!supabase) return noopArr
    try {
      const { data, error } = await supabase.from('reviews').select(REVIEW_COLS)
        .eq('user_id', userId).order('created_at', { ascending: false })
      if (error) return { data: [], error }
      return { data: await enrichWithProfiles(data), error: null }
    } catch (e) { return { data: [], error: e } }
  },
  async create(review) {
    if (!supabase) return noop
    try {
      return await supabase.from('reviews').insert(review).select().single()
    } catch (e) {
      return { data: null, error: { message: e?.message || '리뷰 작성 중 오류가 발생했어요. 다시 시도해주세요.' } }
    }
  },
  async delete(id) {
    if (!supabase) return noop
    try { return await supabase.from('reviews').delete().eq('id', id) }
    catch (e) { return { error: e } }
  },
  async update(id, updates) {
    if (!supabase) return noop
    try {
      return await supabase.from('reviews').update(updates).eq('id', id).select().single()
    } catch (e) {
      return { data: null, error: { message: e?.message || '리뷰 수정 중 오류가 발생했어요. 다시 시도해주세요.' } }
    }
  },
}

// UI(mapCommunityRow)에서 실제로 읽는 컬럼만 선택
const COMMUNITY_COLS = 'id, user_id, content, product, image_url, likes_count, created_at'

export const communityApi = {
  async fetchAll(limit = 30) {
    if (!supabase) return noopArr
    try {
      const { data, error } = await supabase.from('community_posts').select(COMMUNITY_COLS)
        .order('created_at', { ascending: false }).limit(limit)
      if (error) return { data: [], error }
      return { data: await enrichWithProfiles(data), error: null }
    } catch (e) { return { data: [], error: e } }
  },
  async fetchPage({ cursor = null, limit = 30 } = {}) {
    if (!supabase) return noopArr
    try {
      let q = supabase.from('community_posts').select(COMMUNITY_COLS)
        .order('created_at', { ascending: false }).limit(limit)
      if (cursor) q = q.lt('created_at', cursor)
      const { data, error } = await q
      if (error) return { data: [], error }
      return { data: await enrichWithProfiles(data), error: null }
    } catch (e) { return { data: [], error: e } }
  },
  async create(post) {
    if (!supabase) return noop
    try {
      return await supabase.from('community_posts').insert(post).select().single()
    } catch (e) {
      return { data: null, error: { message: e?.message || '게시물 작성 중 오류가 발생했어요. 다시 시도해주세요.' } }
    }
  },
  async delete(id) {
    if (!supabase) return noop
    try { return await supabase.from('community_posts').delete().eq('id', id) }
    catch (e) { return { error: e } }
  },

  // ------- 게시물 좋아요 -------
  async fetchMyPostLikes(userId) {
    if (!supabase || !userId) return { data: [], error: null }
    try {
      const { data, error } = await supabase.from('community_post_likes')
        .select('post_id').eq('user_id', userId)
      return { data: (data || []).map((r) => r.post_id), error }
    } catch (e) { return { data: [], error: e } }
  },
  async likePost(userId, postId) {
    if (!supabase) return noop
    try { return await supabase.from('community_post_likes').insert({ user_id: userId, post_id: postId }) }
    catch (e) { return { error: e } }
  },
  async unlikePost(userId, postId) {
    if (!supabase) return noop
    try {
      return await supabase.from('community_post_likes').delete()
        .eq('user_id', userId).eq('post_id', postId)
    } catch (e) { return { error: e } }
  },
  async fetchPostLikeCounts(postIds) {
    // 게시물별 좋아요 개수 집계. likes_count 컬럼이 있지만 트리거가 없어 정확도를 위해 직접 집계.
    if (!supabase || !Array.isArray(postIds) || postIds.length === 0) return { data: {}, error: null }
    try {
      const { data, error } = await supabase.from('community_post_likes')
        .select('post_id').in('post_id', postIds)
      const counts = {}
      ;(data || []).forEach((r) => { counts[r.post_id] = (counts[r.post_id] || 0) + 1 })
      return { data: counts, error }
    } catch (e) { return { data: {}, error: e } }
  },

  // ------- 댓글 -------
  async fetchCommentsByPosts(postIds) {
    if (!supabase || !Array.isArray(postIds) || postIds.length === 0) return { data: [], error: null }
    try {
      const { data, error } = await supabase.from('community_comments')
        .select('*, community_comment_likes (user_id)')
        .in('post_id', postIds).order('created_at', { ascending: true })
      if (error) return { data: [], error }
      return { data: await enrichWithProfiles(data), error: null }
    } catch (e) { return { data: [], error: e } }
  },
  async createComment(comment) {
    if (!supabase) return noop
    try { return await supabase.from('community_comments').insert(comment).select().single() }
    catch (e) { return { data: null, error: e } }
  },
  async deleteComment(id) {
    if (!supabase) return noop
    try { return await supabase.from('community_comments').delete().eq('id', id) }
    catch (e) { return { error: e } }
  },
  async likeComment(userId, commentId) {
    if (!supabase) return noop
    try { return await supabase.from('community_comment_likes').insert({ user_id: userId, comment_id: commentId }) }
    catch (e) { return { error: e } }
  },
  async unlikeComment(userId, commentId) {
    if (!supabase) return noop
    try {
      return await supabase.from('community_comment_likes').delete()
        .eq('user_id', userId).eq('comment_id', commentId)
    } catch (e) { return { error: e } }
  },
}

export const follows = {
  // 내가 팔로우한 사용자들의 user_id 배열
  async fetchMine(userId) {
    if (!supabase) return noopArr
    try {
      const { data, error } = await supabase.from('follows')
        .select('followee_id').eq('follower_id', userId)
      return { data: data?.map((f) => f.followee_id) || [], error }
    } catch (e) { return { data: [], error: e } }
  },
  async add(followerId, followeeId) {
    if (!supabase) return noop
    if (followerId === followeeId) return { data: null, error: new Error('cannot follow self') }
    try {
      return await supabase.from('follows')
        .insert({ follower_id: followerId, followee_id: followeeId })
    } catch (e) { return { error: e } }
  },
  async remove(followerId, followeeId) {
    if (!supabase) return noop
    try {
      return await supabase.from('follows').delete()
        .eq('follower_id', followerId).eq('followee_id', followeeId)
    } catch (e) { return { error: e } }
  },
  // 팔로워 수 / 팔로잉 수
  async counts(userId) {
    if (!supabase) return { followers: 0, following: 0 }
    try {
      const [{ count: followers }, { count: followingCount }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      ])
      return { followers: followers || 0, following: followingCount || 0 }
    } catch { return { followers: 0, following: 0 } }
  },
  // 팔로워 목록 (나를 팔로우한 사람들)
  async listFollowers(userId) {
    if (!supabase) return noopArr
    try {
      const { data, error } = await supabase.from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(id, nickname, avatar_url)')
        .eq('followee_id', userId)
      return { data: data?.map((f) => ({ id: f.follower_id, nickname: f.profiles?.nickname, avatar: f.profiles?.avatar_url })) || [], error }
    } catch (e) { return { data: [], error: e } }
  },
  // 팔로잉 목록 (내가 팔로우한 사람들)
  async listFollowing(userId) {
    if (!supabase) return noopArr
    try {
      const { data, error } = await supabase.from('follows')
        .select('followee_id, profiles!follows_followee_id_fkey(id, nickname, avatar_url)')
        .eq('follower_id', userId)
      return { data: data?.map((f) => ({ id: f.followee_id, nickname: f.profiles?.nickname, avatar: f.profiles?.avatar_url })) || [], error }
    } catch (e) { return { data: [], error: e } }
  },
}

export const profilesApi = {
  // 닉네임 → user_id 매핑. 시드(가짜 author) 는 null 을 돌려준다.
  async findByNickname(nickname) {
    if (!supabase || !nickname) return { data: null, error: null }
    try {
      return await supabase.from('profiles')
        .select('id, nickname, avatar_url').eq('nickname', nickname).maybeSingle()
    } catch (e) { return { data: null, error: e } }
  },
  // 여러 user_id 를 한 번에 → profiles 매핑
  async fetchByIds(ids) {
    if (!supabase || !Array.isArray(ids) || ids.length === 0) return { data: [], error: null }
    try {
      return await supabase.from('profiles')
        .select('id, nickname, avatar_url').in('id', ids)
    } catch (e) { return { data: [], error: e } }
  },
}

export const favorites = {
  async fetchMine(userId) {
    if (!supabase) return noopArr
    try {
      const { data, error } = await supabase.from('favorites').select('review_id').eq('user_id', userId)
      return { data: data?.map(f => f.review_id) || [], error }
    } catch (e) { return { data: [], error: e } }
  },
  async add(userId, reviewId) {
    if (!supabase) return noop
    try { return await supabase.from('favorites').insert({ user_id: userId, review_id: reviewId }) }
    catch (e) { return { error: e } }
  },
  async remove(userId, reviewId) {
    if (!supabase) return noop
    try { return await supabase.from('favorites').delete().eq('user_id', userId).eq('review_id', reviewId) }
    catch (e) { return { error: e } }
  },
}

export const comments = {
  async fetchByReview(reviewId) {
    if (!supabase) return noopArr
    try {
      return await supabase.from('comments')
        .select('*, profiles (nickname, avatar_url), comment_likes (user_id)')
        .eq('review_id', reviewId).order('created_at', { ascending: true })
    } catch (e) { return { data: [], error: e } }
  },
  async create(comment) {
    if (!supabase) return noop
    try { return await supabase.from('comments').insert(comment).select().single() }
    catch (e) { return { data: null, error: e } }
  },
  async delete(id) {
    if (!supabase) return noop
    try { return await supabase.from('comments').delete().eq('id', id) }
    catch (e) { return { error: e } }
  },
  async like(userId, commentId) {
    if (!supabase) return noop
    try { return await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId }) }
    catch (e) { return { error: e } }
  },
  async unlike(userId, commentId) {
    if (!supabase) return noop
    try { return await supabase.from('comment_likes').delete().eq('user_id', userId).eq('comment_id', commentId) }
    catch (e) { return { error: e } }
  },
}

export const challenges = {
  async fetchActive(userId) {
    if (!supabase) return noop
    try {
      return await supabase.from('challenges').select('*')
        .eq('user_id', userId).in('status', ['active', 'completed'])
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
    } catch (e) { return { data: null, error: e } }
  },
  async upsert(row) {
    if (!supabase) return noop
    try {
      // id가 있으면 update, 없으면 insert
      if (row.id) {
        return await supabase.from('challenges').update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', row.id).select().single()
      }
      return await supabase.from('challenges').insert(row).select().single()
    } catch (e) { return { data: null, error: e } }
  },
  async fetchLogs(userId, challengeId) {
    if (!supabase) return noopArr
    try {
      return await supabase.from('challenge_logs').select('*')
        .eq('user_id', userId).eq('challenge_id', challengeId)
    } catch (e) { return { data: [], error: e } }
  },
  async upsertLog(row) {
    if (!supabase) return noop
    try {
      return await supabase.from('challenge_logs').upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,challenge_id,day_key' }
      ).select().single()
    } catch (e) { return { data: null, error: e } }
  },
  async fetchInbody(userId) {
    if (!supabase) return noopArr
    try {
      return await supabase.from('inbody_records').select('*')
        .eq('user_id', userId).order('measured_at', { ascending: true })
    } catch (e) { return { data: [], error: e } }
  },
  async addInbody(row) {
    if (!supabase) return noop
    try { return await supabase.from('inbody_records').insert(row).select().single() }
    catch (e) { return { data: null, error: e } }
  },
  async fetchAnonPosts(limit = 50) {
    if (!supabase) return noopArr
    try {
      return await supabase.from('challenge_anon_posts').select('*')
        .order('created_at', { ascending: false }).limit(limit)
    } catch (e) { return { data: [], error: e } }
  },
  async addAnonPost(row) {
    if (!supabase) return noop
    try { return await supabase.from('challenge_anon_posts').insert(row).select().single() }
    catch (e) { return { data: null, error: e } }
  },
}

export const moodsApi = {
  async fetchMine(userId) {
    if (!supabase) return noopArr
    try {
      const { data, error } = await supabase.from('user_moods')
        .select('review_id, mood').eq('user_id', userId)
      return { data: data || [], error }
    } catch (e) { return { data: [], error: e } }
  },
  async upsert(userId, reviewId, mood) {
    if (!supabase) return noop
    try {
      return await supabase.from('user_moods').upsert(
        { user_id: userId, review_id: String(reviewId), mood, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,review_id' }
      )
    } catch (e) { return { error: e } }
  },
  async remove(userId, reviewId) {
    if (!supabase) return noop
    try {
      return await supabase.from('user_moods').delete()
        .eq('user_id', userId).eq('review_id', String(reviewId))
    } catch (e) { return { error: e } }
  },
}

export const notifications = {
  async fetchMine(userId, limit = 50) {
    if (!supabase) return noopArr
    try {
      return await supabase.from('notifications').select('*')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
    } catch (e) { return { data: [], error: e } }
  },
  async create(row) {
    if (!supabase) return noop
    try { return await supabase.from('notifications').insert(row).select().single() }
    catch (e) { return { data: null, error: e } }
  },
  async markAllRead(userId) {
    if (!supabase) return noop
    try {
      return await supabase.from('notifications').update({ read: true })
        .eq('user_id', userId).eq('read', false)
    } catch (e) { return { error: e } }
  },
  async clear(userId) {
    if (!supabase) return noop
    try { return await supabase.from('notifications').delete().eq('user_id', userId) }
    catch (e) { return { error: e } }
  },
}

export const reports = {
  async create({ reporterId, targetType, targetId, reason, detail }) {
    if (!supabase) return noop
    try {
      return await supabase.from('reports').insert({
        reporter_id: reporterId, target_type: targetType, target_id: String(targetId),
        reason, detail: detail || null,
      }).select().single()
    } catch (e) { return { data: null, error: e } }
  },
  async fetchMine(userId) {
    if (!supabase) return noopArr
    try {
      return await supabase.from('reports').select('*')
        .eq('reporter_id', userId).order('created_at', { ascending: false })
    } catch (e) { return { data: [], error: e } }
  },
}

export const analytics = {
  async track(event, properties = {}, userId = null, sessionId = null) {
    if (!supabase) return noop
    try {
      return await supabase.from('analytics_events').insert({
        user_id: userId, event, properties, session_id: sessionId,
      })
    } catch (e) { return { error: e } }
  },
}

export const storage = {
  async uploadMedia(userId, file, fileName) {
    if (!supabase) return { url: null, error: null }
    const path = `${userId}/${Date.now()}-${fileName}`
    const contentType = file?.type || (fileName.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg')
    try {
      const { data, error } = await supabase.storage
        .from('review-media')
        .upload(path, file, { cacheControl: '31536000', upsert: false, contentType })
      if (error) return { url: null, error }
      const { data: urlData } = supabase.storage.from('review-media').getPublicUrl(data.path)
      return { url: urlData.publicUrl, error: null }
    } catch (e) {
      return { url: null, error: { message: e?.message || '미디어 업로드 중 오류가 발생했어요. 다시 시도해주세요.' } }
    }
  },
  async deleteMedia(path) {
    if (!supabase) return noop
    try { return await supabase.storage.from('review-media').remove([path]) }
    catch (e) { return { error: e } }
  },
  async uploadAvatar(userId, file) {
    if (!supabase) return { url: null, error: null }
    try {
      const ext = (file.type && file.type.split('/')[1]) || 'jpg'
      const path = `${userId}/avatar-${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '31536000', upsert: true })
      if (error) return { url: null, error }
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path)
      return { url: urlData.publicUrl, error: null }
    } catch (e) { return { url: null, error: e } }
  },
}
