/**
 * One door for every model call.
 *
 * server.js does not know which provider answers: it hands over a system
 * prompt, a user message and a token ceiling, and gets back the same shape
 * whatever replied. Swapping provider is an env var, not a rewrite — and going
 * back is the same env var, which matters the first time a new model turns out
 * to format something differently.
 *
 * Usage counts are normalised to Anthropic's field names because the trace
 * writer and the billing ceilings already read those; a second vocabulary would
 * mean every consumer growing a branch it does not need.
 */

const PROVIDER = (process.env.LLM_PROVIDER ?? 'gemini').toLowerCase()

const DEFAULTS = {
  gemini:    { router: 'gemini-3.7-flash',            generator: 'gemini-3.7-flash' },
  anthropic: { router: 'claude-haiku-4-5-20251001',   generator: 'claude-sonnet-4-6' },
}

const base = DEFAULTS[PROVIDER] ?? DEFAULTS.gemini

/**
 * Which model each job uses. Override either one on its own — the router is a
 * classifier and can run on something cheaper than the generator, which is the
 * only call that has to produce a whole lesson.
 */
export const MODELS = {
  router:    process.env.LLM_ROUTER_MODEL    ?? base.router,
  generator: process.env.LLM_GENERATOR_MODEL ?? base.generator,
}

export const providerOf = (model) => (String(model).startsWith('gemini') ? 'gemini' : 'anthropic')

// ── Anthropic ───────────────────────────────────────────────────────────────

let anthropicClient = null
async function anthropic() {
  if (!anthropicClient) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

async function callAnthropic({ model, system, user, maxTokens, cacheSystem }) {
  const client = await anthropic()
  const params = {
    model,
    max_tokens: maxTokens,
    // The system prompt is the expensive half and it is identical between
    // requests, so it is worth caching when the provider can.
    system: cacheSystem
      ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
      : system,
    messages: [{ role: 'user', content: user }],
  }
  const message = await client.messages.create(params)
  return {
    text: message.content?.[0]?.text ?? '',
    usage: message.usage ?? {},
    stopReason: message.stop_reason ?? null,
    request: params,
    raw: message,
  }
}

// ── Gemini ──────────────────────────────────────────────────────────────────

const GEMINI_HOST = 'https://generativelanguage.googleapis.com/v1beta'

async function callGemini({ model, system, user, maxTokens }) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set — put it in .env and restart the server.')

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      // The lesson format is a fixed grammar, not a place for invention. Every
      // degree of freedom here comes back as a code the validator has to reject.
      temperature: 0,
    },
  }

  // The key goes in a header, never in the URL: a query string ends up in
  // proxy logs and in anything that records the request line.
  const res = await fetch(`${GEMINI_HOST}/models/${encodeURIComponent(model)}:generateContent`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 400)}`)
  }

  const json = await res.json()
  const cand = json.candidates?.[0]
  // Parts come back split — a long answer is several of them, and joining is
  // not optional: taking parts[0] alone truncates the lesson silently.
  const text = (cand?.content?.parts ?? []).map(p => p.text ?? '').join('')
  const um   = json.usageMetadata ?? {}

  const usage = {
    input_tokens:            um.promptTokenCount ?? 0,
    // Reasoning tokens are produced and billed like any other output, but
    // they arrive under their own name. Leaving them out made a call that
    // spent its whole budget thinking read as "5 output tokens" in the
    // trace — which is why a truncated router looked impossible.
    output_tokens:           (um.candidatesTokenCount ?? 0) + (um.thoughtsTokenCount ?? 0),
    cache_read_input_tokens: um.cachedContentTokenCount ?? 0,
    // Gemini bills implicit caching as a discount on the read, so there is no
    // separate write to report.
    cache_creation_input_tokens: 0,
  }

  return {
    text,
    usage,
    stopReason: cand?.finishReason ?? null,
    // The transcript reads one shape — system / messages / max_tokens on the
    // request, usage / stop_reason / content on the response. Handing it the
    // provider's own shape instead is why a Gemini run wrote a trace with no
    // prompt, no token counts and no cost: every field it looked for was under
    // a different name. Normalising here means one transcript format whoever
    // answered, and no branch in the writer.
    request: { model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] },
    raw: {
      usage,
      stop_reason: cand?.finishReason ?? null,
      content: [{ type: 'text', text }],
      provider: json,        // the untouched payload, for anything that wants it
    },
  }
}

/**
 * Ask a model. `system` and `user` are plain strings; `cacheSystem` is a hint
 * that the provider may ignore.
 *
 * Returns { text, usage, stopReason, request, raw } — `request` and `raw` are
 * what the transcript records, so a run can be read back exactly as it happened.
 */
export async function generate({ model, system, user, maxTokens = 4096, cacheSystem = false }) {
  const args = { model, system, user, maxTokens, cacheSystem }
  return providerOf(model) === 'gemini' ? callGemini(args) : callAnthropic(args)
}
