// Rate card, $ per million tokens. Kept in one place because these numbers are
// what any usage-based billing is derived from — a stale constant here silently
// under- or over-charges every request.
//
// Cache multipliers are the standard ones: a cache WRITE costs 1.25x the input
// rate, a cache READ 0.1x.
const RATES = {
  'claude-haiku-4-5-20251001': { in: 1.00, out:  5.00 },
  'claude-sonnet-4-6':         { in: 3.00, out: 15.00 },
}

// An unpriced model bills at the most expensive rate we know rather than $0 —
// a silent zero would hide a real cost from every ceiling check downstream.
const FALLBACK = { in: 3.00, out: 15.00 }

export function rateFor(model) {
  return RATES[model] ?? FALLBACK
}

export function costOf(model, usage = {}) {
  const r = rateFor(model)
  const inTok  = usage.input_tokens                ?? 0
  const cWrite = usage.cache_creation_input_tokens ?? 0
  const cRead  = usage.cache_read_input_tokens     ?? 0
  const out    = usage.output_tokens               ?? 0
  return (inTok * r.in + cWrite * r.in * 1.25 + cRead * r.in * 0.1 + out * r.out) / 1_000_000
}
