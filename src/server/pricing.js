// Rate card, $ per million tokens. Kept in one place because these numbers are
// what any usage-based billing is derived from — a stale constant here silently
// under- or over-charges every request.
//
// Cache multipliers are the standard ones: a cache WRITE costs 1.25x the input
// rate, a cache READ 0.1x — unless the entry gives its own `cacheRead` rate.
const DEEPSEEK_FLASH = {
  in: 0.15, out: 0.60, cacheRead: 0.003,
  // DeepSeek doubles the whole card on weekdays, 01:00–04:00 and 06:00–10:00 UTC.
  peak: { in: 0.30, out: 1.20, cacheRead: 0.006 },
}

const RATES = {
  'claude-haiku-4-5-20251001': { in: 1.00, out:  5.00 },
  'claude-sonnet-4-6':         { in: 3.00, out: 15.00 },
  // Gemini 3 Flash introductory rate, in effect until 2026-12-31; it doubles
  // to 1.50 / 7.50 on 2027-01-01. Left as one line to change on that date.
  'gemini-3.7-flash':          { in: 0.75, out:  3.75 },
  'gemini-3.6-flash':          { in: 1.50, out:  7.50 },
  'gemini-3.5-flash':          { in: 0.50, out:  3.00 },
  // V4.1 Flash, under its own name and under the retired V4 Flash name that
  // DeepSeek now routes to it.
  'deepseek-flash':            DEEPSEEK_FLASH,
  'deepseek-v4-flash':         DEEPSEEK_FLASH,
}

// An unpriced model bills at the most expensive rate we know rather than $0 —
// a silent zero would hide a real cost from every ceiling check downstream.
const FALLBACK = { in: 3.00, out: 15.00 }

function isPeak(now = new Date()) {
  const day = now.getUTCDay(), h = now.getUTCHours()
  return day >= 1 && day <= 5 && ((h >= 1 && h < 4) || (h >= 6 && h < 10))
}

export function rateFor(model) {
  const r = RATES[model] ?? FALLBACK
  return r.peak && isPeak() ? r.peak : r
}

export function costOf(model, usage = {}) {
  const r = rateFor(model)
  const inTok  = usage.input_tokens                ?? 0
  const cWrite = usage.cache_creation_input_tokens ?? 0
  const cRead  = usage.cache_read_input_tokens     ?? 0
  const out    = usage.output_tokens               ?? 0
  const read   = r.cacheRead ?? r.in * 0.1
  return (inTok * r.in + cWrite * r.in * 1.25 + cRead * read + out * r.out) / 1_000_000
}
