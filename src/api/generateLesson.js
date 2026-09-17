import { authedFetch } from '../lib/supabase.js'
import { u } from '../i18n/uiText.js'

// What a verdict says when the router sent no message of its own (uiText.js).
const STATUS_FALLBACK = {
  'off-topic':    'refuseOffTopic',
  'too-advanced': 'refuseTooAdvanced',
  // No "clarify" entry on purpose — the router no longer has that verdict.
  // A vague prompt gets a lesson on the general concept, never a question back.
  trivial:        'refuseTrivial',
}

// No language goes with the prompt: the server reads it off the prompt itself
// and sends it back. `uiLang` is only for a reply that came without one.
// Resolves to { lesson, lang } — lang is what the lesson is written in.
export async function generateLesson(prompt, uiLang = 'en') {
  const res  = await authedFetch('/api/generate-lesson', {
    method: 'POST',
    body:   JSON.stringify({ prompt }),
  })
  const data = await res.json()

  if (!res.ok) {
    // 401 (no/expired session) and 402 (out of credits) are normal states the
    // UI reacts to, not bugs — tag them so the caller can show the right thing
    // instead of a generic red error.
    if (res.status === 401) {
      const err = new Error('Sign in to generate a lesson.')
      err.code = 'auth_required'
      // Why the wall appeared: 'anon_used' (this visitor already had the free
      // one), 'anon_daily_cap' (the free pool is empty today, nothing to do
      // with them), or absent (a real session that expired). Three different
      // things to say, so the caller needs to tell them apart.
      err.reason = data.reason ?? null
      throw err
    }
    if (res.status === 402) {
      const err = new Error(
        `You've used your ${data.limit} free lessons this month. Upgrade for unlimited.`
      )
      err.code  = 'quota_exceeded'
      err.quota = data
      throw err
    }
    if (data.rawOutput) {
      console.group('%c[generateLesson] raw API output (parse failed)', 'color:#f87171;font-weight:bold')
      console.log(data.rawOutput)
      console.groupEnd()
    }
    const err = new Error(data.error ?? `Server error ${res.status}`)
    err.rawOutput = data.rawOutput ?? null
    throw err
  }

  if (data.status && data.status !== 'ok') {
    const fallback = STATUS_FALLBACK[data.status]
    const err = new Error(data.message ?? (fallback ? u(data.lang ?? uiLang, fallback) : 'Could not generate a lesson for that.'))
    err.status = data.status
    // too-advanced comes with reference lessons to offer instead; the caller
    // turns them into buttons that load the lesson.
    err.alternatives = data.alternatives ?? []
    throw err
  }
  return { lesson: data.lesson, lang: data.lang ?? null }
}

// Current plan and remaining credits. Returns null when auth isn't configured,
// so the app still runs without a Supabase project.
export async function fetchMe() {
  try {
    const res = await authedFetch('/api/me')
    if (!res.ok) return null
    const data = await res.json()
    return data.authConfigured ? data : null
  } catch { return null }
}
