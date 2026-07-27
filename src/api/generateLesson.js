import { authedFetch } from '../lib/supabase.js'

const STATUS_FALLBACK = {
  'off-topic': "I'm focused on math only — try a question about algebra, geometry, trigonometry, calculus…",
  clarify:     'Which math topic? (e.g. algebra, geometry, trigonometry…)',
  trivial:     "That's already a one-line answer — try a topic worth a full lesson.",
}

export async function generateLesson(prompt, lang = 'en') {
  const res  = await authedFetch('/api/generate-lesson', {
    method: 'POST',
    body:   JSON.stringify({ prompt, lang }),
  })
  const data = await res.json()

  if (!res.ok) {
    // 401 (no/expired session) and 402 (out of credits) are normal states the
    // UI reacts to, not bugs — tag them so the caller can show the right thing
    // instead of a generic red error.
    if (res.status === 401) {
      const err = new Error('Sign in to generate a lesson.')
      err.code = 'auth_required'
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
    const err = new Error(data.message ?? STATUS_FALLBACK[data.status] ?? 'Could not generate a lesson for that.')
    err.status = data.status
    throw err
  }
  return data.lesson
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
