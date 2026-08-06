// The first lesson is free and needs no account.
//
// A sign-in wall as the FIRST thing a visitor meets is the single biggest place
// to lose someone arriving from a link: they have not seen the thing yet, so
// there is nothing to make an account for. The wall moves to the second lesson,
// once the product has argued its own case.
//
// The catch is that every call here spends real money on the Anthropic API, and
// an endpoint that needs no token is open to anyone with curl. So there are two
// independent ceilings, because the per-visitor one is not a spending limit on
// its own — one script rotating addresses walks straight through it:
//
//   • per IP  — what an honest first-time visitor gets
//   • per day — the entire anonymous budget, whatever the addresses claim
//
// The daily one is the one that actually bounds the bill.
//
// Both live in process memory, deliberately. This is a spending brake, not a
// security boundary: a restart (on Render's free plan, every wake from sleep)
// clears the table and hands out fresh free lessons. Anything stronger means a
// database round trip on a path that should stay cheap, and the daily ceiling
// already caps the damage. If the free tier ever starts costing real money,
// move THIS to the database — not the per-IP count.

export const ANON_LESSON_LIMIT = Number(process.env.ANON_LESSON_LIMIT ?? 1)
export const ANON_DAILY_TOTAL  = Number(process.env.ANON_DAILY_TOTAL ?? 40)

const WINDOW_MS = 24 * 60 * 60 * 1000

const seen = new Map()          // ip -> { count, resetAt }
let today  = { key: null, count: 0 }

const dayKey = () => new Date().toISOString().slice(0, 10)

function rollDay() {
  const key = dayKey()
  if (today.key !== key) today = { key, count: 0 }
}

// Drop expired rows so a long-running instance does not accumulate one entry
// per address forever. Only when the table is big enough to be worth walking.
function prune(now) {
  if (seen.size < 500) return
  for (const [ip, rec] of seen) if (rec.resetAt <= now) seen.delete(ip)
}

// Render (like every managed host) terminates TLS in front of the app, so the
// socket address is the proxy's, identical for every visitor. The real one is
// the first entry of X-Forwarded-For. Spoofable by design — see the note above
// about what this is and is not.
export function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
  return fwd || req.ip || req.socket?.remoteAddress || 'unknown'
}

// Check-and-consume one anonymous lesson. Returns why it was refused so the UI
// can tell "you have had your free one" apart from "the free pool is empty
// today" — the first is about the visitor, the second is not their doing.
export function consumeAnon(ip) {
  rollDay()
  if (today.count >= ANON_DAILY_TOTAL) return { allowed: false, reason: 'anon_daily_cap' }

  const now = Date.now()
  prune(now)

  const rec  = seen.get(ip)
  const live = rec && rec.resetAt > now ? rec : null
  const used = live?.count ?? 0

  // Checked for an address that has never been seen too, not only for a
  // returning one: ANON_LESSON_LIMIT=0 has to actually turn the free tier off.
  // Testing it against `rec` alone let every new address through a limit of 0.
  if (used >= ANON_LESSON_LIMIT) return { allowed: false, reason: 'anon_used' }

  if (live) live.count = used + 1
  else seen.set(ip, { count: 1, resetAt: now + WINDOW_MS })

  today.count += 1
  return { allowed: true }
}

// Give the credit back when generation failed for a reason that is not the
// visitor's fault. Mirrors refundCredit() for signed-in users: without it, one
// server error costs an anonymous visitor the only lesson they were ever going
// to see, which is precisely the visitor this whole path exists for.
export function refundAnon(ip) {
  const rec = seen.get(ip)
  if (rec && rec.count > 0) rec.count -= 1
  if (today.count > 0) today.count -= 1
}
