import { createClient } from '@supabase/supabase-js'

// Browser client. Uses the ANON key, which is meant to be public — it ships in
// the JS bundle and there is no way around that. It is safe ONLY because every
// table has row-level security (see supabase/schema.sql): the anon key lets you
// ask the database questions, and RLS decides which rows you are allowed to
// see. The service-role key, which bypasses RLS, is server-side only.
const url  = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Auth is optional: with no project configured the app still runs, just without
// accounts. Lets the thing be developed and demoed without a Supabase project.
export const authConfigured = Boolean(url && anon)

export const supabase = authConfigured
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,   // needed for the Google OAuth redirect
      },
    })
  : null

// Attach the caller's access token to a request to our own API. The server
// verifies it; we never send the user id or plan from here, because anything
// the client asserts about itself is worthless.
// Where our own API lives. Empty in development: Vite proxies /api to the local
// server, so a relative path works. In production the site and the API sit on
// different hosts (static hosting cannot run Express), so the deployed site is
// built with VITE_API_URL pointing at the API's own address.
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export const apiUrl = (path) => API_BASE + path

export async function authedFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) }
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return fetch(apiUrl(path), { ...options, headers })
}

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })

export const signInWithEmail = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUpWithEmail = (email, password, displayName) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: displayName || undefined } },
  })

export const signOut = () => supabase.auth.signOut()

// Password reset, in two halves. First: mail a one-time link back to this app.
// The link carries a recovery token, so opening it signs the user in JUST long
// enough to set a new password — that is why the second half is a plain
// updateUser and needs no old password.
export const sendPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })

export const updatePassword = (password) =>
  supabase.auth.updateUser({ password })
