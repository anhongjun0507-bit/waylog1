import { createClient } from '@supabase/supabase-js'
// reports/analytics 는 하단에서 정의.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isConfigured) {
  console.warn('Supabase 환경변수 미설정 - 로컬 모드로 동작합니다.')
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null

const noop = { data: null, error: null }
const noopArr = { data: [], error: null }

export const auth = {
  async signUp(email, password, nickname) {
    if (!supabase) return noop
    try { return await supabase.auth.signUp({ email, password, options: { data: { nickname } } }) }
    catch (e) { return { data: null, error: e } }
  },
  async signIn(email, password) {
    if (!supabase) return noop
    try { return await supabase.auth.signInWithPassword({ email, password }) }
    catch (e) { return { data: null, error: e } }
  },
  async signOut() {
    if (!supabase) return noop
    try { return await supabase.auth.signOut() }
    catch (e) { return { error: e } }
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
}

export const reviews = {
  // limit 기본 30 으로 상향 조정 — UI 에서 무한 스크롤로 추가 fetch.
  // 하위호환: 기존 호출은 limit 파라미터 없이 fetchAll() 로 첫 페이지만 가져온다.
  async fetchAll(limit = 30) {
    if (!supabase) return noopArr
    try {
      return await supabase.from('reviews').select('*, profiles (nickname, avatar_url)')
        .order('created_at', { ascending: false }).limit(limit)
    } catch (e) { return { data: [], error: e } }
  },
  // 커서(마지막 created_at) 이후 페이지 fetch. UI 무한 스크롤용.
  async fetchPage({ cursor = null, limit = 30 } = {}) {
    if (!supabase) return noopArr
    try {
      let q = supabase.from('reviews').select('*, profiles (nickname, avatar_url)')
        .order('created_at', { ascending: false }).limit(limit)
      if (cursor) q = q.lt('created_at', cursor)
      return await q
    } catch (e) { return { data: [], error: e } }
  },
  async fetchMine(userId) {
    if (!supabase) return noopArr
    try {
      return await supabase.from('reviews').select('*, profiles (nickname, avatar_url)')
        .eq('user_id', userId).order('created_at', { ascending: false })
    } catch (e) { return { data: [], error: e } }
  },
  async create(review) {
    if (!supabase) return noop
    try { return await supabase.from('reviews').insert(review).select().single() }
    catch (e) { return { data: null, error: e } }
  },
  async delete(id) {
    if (!supabase) return noop
    try { return await supabase.from('reviews').delete().eq('id', id) }
    catch (e) { return { error: e } }
  },
  async update(id, updates) {
    if (!supabase) return noop
    try { return await supabase.from('reviews').update(updates).eq('id', id).select().single() }
    catch (e) { return { data: null, error: e } }
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
    try {
      const path = `${userId}/${Date.now()}-${fileName}`
      const { data, error } = await supabase.storage
        .from('review-media')
        .upload(path, file, { cacheControl: '31536000', upsert: false })
      if (error) return { url: null, error }
      const { data: urlData } = supabase.storage
        .from('review-media')
        .getPublicUrl(data.path)
      return { url: urlData.publicUrl, error: null }
    } catch (e) { return { url: null, error: e } }
  },
  async deleteMedia(path) {
    if (!supabase) return noop
    try { return await supabase.storage.from('review-media').remove([path]) }
    catch (e) { return { error: e } }
  },
}
