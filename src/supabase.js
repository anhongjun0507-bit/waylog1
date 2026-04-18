import { createClient } from '@supabase/supabase-js'
// reports/analytics 는 하단에서 정의.

// Supabase 클라이언트 생성 전, 구버전 세션 키를 정리.
// GoTrueClient가 stale 토큰을 복구하다 내부 lock에 걸리는 것을 방지.
try {
  const AUTH_VER = 4;
  const cur = +(localStorage.getItem('waylog:auth-ver') || 0);
  if (cur < AUTH_VER) {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') || key.startsWith('supabase')) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem('waylog:auth-ver', String(AUTH_VER));
  }
} catch {}

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

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'waylog-auth-v2',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: !isNativeApp,
        flowType: 'pkce',
      },
    })
  : null

// 네이티브에서는 OAuth 리다이렉트 URL 로 이 값을 Supabase 로그인 옵션에 넘겨야 함
export const OAUTH_REDIRECT_URL = isNativeApp
  ? "com.waylog.app://auth-callback"
  : (typeof window !== "undefined" ? window.location.origin : undefined)

const noop = { data: null, error: null }
const noopArr = { data: [], error: null }

// GoTrueClient에 의존하지 않는 인증 토큰 관리.
// directSignIn 시 여기에 저장하고, supabase 클라이언트가 세션을 가져가면 그것도 사용.
let _accessToken = null
export const setDirectToken = (token) => { _accessToken = token }
export const getAccessToken = async () => {
  // 1) GoTrueClient에서 가져오기 (2초 타임아웃)
  if (supabase) {
    try {
      const { data } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 1500)),
      ])
      if (data?.session?.access_token) return data.session.access_token
    } catch {}
  }
  // 2) 직접 로그인 시 저장한 토큰
  if (_accessToken) return _accessToken
  // 3) directSignIn이 저장한 토큰
  try {
    const dt = localStorage.getItem('waylog-direct-token')
    if (dt) return dt
  } catch {}
  // 4) localStorage에서 직접 읽기 (storageKey 기반)
  try {
    const raw = localStorage.getItem('waylog-auth-v2')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.access_token) return parsed.access_token
    }
  } catch {}
  return null
}

// Supabase REST API 직접 호출 헬퍼 — GoTrueClient 완전 우회
// AbortController + 15초 기본 타임아웃으로 무한 대기 방지.
// 외부에서 signal 을 주입하면 (예: 사용자 로그아웃 시 abort) 즉시 취소 가능.
const DEFAULT_REST_TIMEOUT = 15000
const directRest = async (method, path, body = null, { signal: externalSignal, timeoutMs = DEFAULT_REST_TIMEOUT } = {}) => {
  const token = await getAccessToken()
  if (!token) return { data: null, error: { message: 'no_auth_token' } }
  const headers = {
    'Content-Type': 'application/json',
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    Prefer: (method === 'POST' || method === 'PATCH') ? 'return=representation' : undefined,
  }
  Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k])

  // 내부 타임아웃 controller — 외부 signal 과 merge
  const controller = new AbortController()
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null
  const onExternalAbort = () => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method, headers,
      signal: controller.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { data: null, error: { message: err.message || err.error || `HTTP ${res.status}` } }
    }
    const data = await res.json().catch(() => null)
    return { data: Array.isArray(data) ? data[0] : data, error: null }
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { data: null, error: { message: externalSignal?.aborted ? 'aborted' : 'timeout' } }
    }
    return { data: null, error: { message: e?.message || 'network_error' } }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
  }
}

// GoTrueClient를 완전히 우회하는 직접 로그인.
// 어떤 클라이언트 상태에서도 멈추지 않는다.
const directSignIn = async (email, password) => {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json()
  if (!res.ok) return { data: null, error: { message: body.error_description || body.msg || 'Login failed' } }
  // 토큰 저장 — 이후 REST API 호출에서 사용
  _accessToken = body.access_token
  try { localStorage.setItem('waylog-direct-token', body.access_token) } catch {}
  // setSession도 시도 (lock 걸리면 무시)
  if (supabase) {
    try { supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token }).catch(() => {}) }
    catch {}
  }
  return { data: { user: body.user, session: body }, error: null }
}

const directSignUp = async (email, password, nickname) => {
  const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
    body: JSON.stringify({ email, password, data: { nickname } }),
  })
  const body = await res.json()
  if (!res.ok) return { data: null, error: { message: body.error_description || body.msg || body.error || 'Signup failed' } }
  if (body.access_token && supabase) {
    try { supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token }).catch(() => {}) }
    catch {}
  }
  return { data: { user: body.user || body, session: body.access_token ? body : null }, error: null }
}

export const auth = {
  async signUp(email, password, nickname) {
    if (!supabase) return noop
    // GoTrueClient 2초 시도 → 실패 시 직접 API 호출
    try {
      const result = await Promise.race([
        supabase.auth.signUp({ email, password, options: { data: { nickname } } }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('__timeout__')), 2000)),
      ])
      return result
    } catch {
      return directSignUp(email, password, nickname)
    }
  },
  async signIn(email, password) {
    if (!supabase) return noop
    // GoTrueClient 2초 시도 → 실패 시 직접 API 호출
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('__timeout__')), 2000)),
      ])
      return result
    } catch {
      return directSignIn(email, password)
    }
  },
  async signOut() {
    if (!supabase) return noop
    try {
      const result = await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(() => resolve({ error: null }), 2000)),
      ])
      return result
    } catch (e) { return { error: e } }
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
    // 1) GoTrueClient 경유 시도 (2초 타임아웃)
    try {
      const result = await Promise.race([
        supabase.from('reviews').insert(review).select().single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('__timeout__')), 2000)),
      ])
      if (result?.data?.id) return result
    } catch {}
    // 2) 직접 REST API 폴백 — GoTrueClient 완전 우회
    return directRest('POST', 'reviews', review)
  },
  async delete(id) {
    if (!supabase) return noop
    try { return await supabase.from('reviews').delete().eq('id', id) }
    catch (e) { return { error: e } }
  },
  async update(id, updates) {
    if (!supabase) return noop
    // GoTrueClient 경유 2초 타임아웃 → 실패 시 직접 REST 폴백 (내부 15초 타임아웃).
    try {
      const result = await Promise.race([
        supabase.from('reviews').update(updates).eq('id', id).select().single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('__timeout__')), 2000)),
      ])
      if (result?.data?.id || result?.data === null) return result
    } catch {}
    return directRest('PATCH', `reviews?id=eq.${encodeURIComponent(id)}`, updates)
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
    // 1) GoTrueClient 경유 시도
    try {
      const { data, error } = await Promise.race([
        supabase.storage.from('review-media').upload(path, file, { cacheControl: '31536000', upsert: false, contentType }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('__timeout__')), 5000)),
      ])
      if (!error && data?.path) {
        const { data: urlData } = supabase.storage.from('review-media').getPublicUrl(data.path)
        return { url: urlData.publicUrl, error: null }
      }
    } catch {}
    // 2) 직접 fetch 폴백 — 30초 타임아웃(이미지/동영상 크기 고려)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    try {
      const token = await getAccessToken()
      if (!token) return { url: null, error: { message: 'no_auth_token' } }
      const res = await fetch(`${supabaseUrl}/storage/v1/object/review-media/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey, 'Content-Type': contentType, 'Cache-Control': 'max-age=31536000' },
        body: file,
        signal: controller.signal,
      })
      if (res.ok) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/review-media/${path}`
        return { url: publicUrl, error: null }
      }
      const err = await res.json().catch(() => ({}))
      return { url: null, error: { message: err.message || `HTTP ${res.status}` } }
    } catch (e) {
      if (e?.name === 'AbortError') return { url: null, error: { message: 'timeout' } }
      return { url: null, error: e }
    } finally {
      clearTimeout(timeoutId)
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
