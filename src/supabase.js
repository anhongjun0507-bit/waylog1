import { createClient } from '@supabase/supabase-js'

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
  async fetchAll() {
    if (!supabase) return noopArr
    try {
      return await supabase.from('reviews').select('*, profiles (nickname, avatar_url)')
        .order('created_at', { ascending: false }).limit(100)
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
      return await supabase.from('comments').select('*, profiles (nickname, avatar_url)')
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
}
