import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client. Uses the SERVICE ROLE key, which bypasses RLS —
// it must never reach the browser. It is read from the server environment only
// (no VITE_ prefix), so Vite cannot inline it into the client bundle.
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

export const authConfigured = Boolean(SUPABASE_URL && SERVICE_KEY)

export const admin = authConfigured
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null

// Emails that get 'pro' without paying. Server-side only and comma-separated,
// e.g. PREMIUM_EMAILS="me@example.com,partner@example.com".
//
// Deliberately NOT a client-side constant: anything the browser can read, an
// attacker can read too, and an email hardcoded in the bundle is an invitation
// to try to spoof it. Here it is only ever compared against the email inside a
// Supabase-verified JWT, which the user cannot forge.
const PREMIUM_EMAILS = new Set(
  (process.env.PREMIUM_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
)

export const FREE_LESSON_LIMIT = Number(process.env.FREE_LESSON_LIMIT ?? 3)

// Who may open the Lesson Builder — the tool that writes the shipped examples.
// Separate from PREMIUM_EMAILS on purpose: a paying customer is 'pro', not an
// author, and the two lists must be able to diverge the day someone pays.
// Falls back to PREMIUM_EMAILS so a single-author setup needs no second entry.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? process.env.PREMIUM_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
)

export const isAdminEmail = (email) => ADMIN_EMAILS.has((email ?? '').toLowerCase())

// Resolve the caller from the Authorization header.
// Returns { user } on success, or { error, status } — never throws, so route
// handlers can branch without try/catch noise.
export async function getUser(req) {
  if (!authConfigured) return { error: 'Auth is not configured on the server', status: 503 }

  const header = req.headers.authorization ?? ''
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) return { error: 'Not signed in', status: 401 }

  // getUser() validates the JWT signature and expiry against the project's
  // keys. We never decode the token ourselves — a self-signed or expired token
  // is rejected here, which is the whole point of doing this server-side.
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return { error: 'Invalid or expired session', status: 401 }

  return { user: data.user }
}

// Load the profile, applying the premium-email override if it applies.
// The override is written back to the DB rather than being computed per
// request, so Stripe and any admin view all agree on one stored value.
export async function getProfile(user) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, display_name, plan, lessons_used, period_start')
    .eq('id', user.id)
    .single()

  if (error) return { error: error.message, status: 500 }

  const shouldBePro = PREMIUM_EMAILS.has((user.email ?? '').toLowerCase())
  if (shouldBePro && data.plan !== 'pro') {
    const { data: upgraded } = await admin
      .from('profiles').update({ plan: 'pro' }).eq('id', user.id)
      .select('id, email, display_name, plan, lessons_used, period_start').single()
    return { profile: upgraded ?? { ...data, plan: 'pro' } }
  }

  return { profile: data }
}

// Atomically check-and-consume one custom-lesson credit.
// The decision lives in SQL (see consume_lesson_credit) so that two requests
// arriving together cannot both pass the check — doing it as read-then-write
// here would let a user exceed the free quota by firing parallel requests.
export async function consumeCredit(userId) {
  const { data, error } = await admin.rpc('consume_lesson_credit', {
    p_user_id: userId,
    p_free_limit: FREE_LESSON_LIMIT,
  })
  if (error) return { error: error.message, status: 500 }
  const row = Array.isArray(data) ? data[0] : data
  return { result: row }
}

// Refund a credit when generation failed for a reason that is not the user's
// fault — otherwise a server error or a bad model response silently costs them
// one of three monthly lessons.
export async function refundCredit(userId) {
  try {
    const { data } = await admin
      .from('profiles').select('lessons_used').eq('id', userId).single()
    if (data && data.lessons_used > 0) {
      await admin.from('profiles')
        .update({ lessons_used: data.lessons_used - 1 }).eq('id', userId)
    }
  } catch { /* best effort — never turn a refund failure into a user-facing error */ }
}
