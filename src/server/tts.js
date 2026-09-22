// ── Text to speech ────────────────────────────────────────────────────────────
// Dormant infrastructure: no lesson speaks, and nothing here is reachable from
// lesson generation. It exists so that, if lessons ever move from on-screen
// text to a voice, the voice side is already built and measured.
//
// The design it serves: the voice is the clock. A spoken sentence carries
// markers, and the step each marker names starts when the voice reaches it.
// That needs the moment every word is spoken, which is why the provider has to
// return word timings — the reason Speechify was picked over the browser's own
// speech synthesis, whose word events depend on the installed voice.
//
// Every sentence is kept WHOLE on disk under a hash of what produced it, so a
// sentence is paid for once. Words are never cut out and re-joined: that loses
// the sentence's intonation and, in French, its liaisons.
import fs     from 'fs'
import path   from 'path'
import crypto from 'crypto'

const CACHE_DIR = path.join(process.cwd(), 'cache', 'tts')
const LOG_DIR   = path.join(process.cwd(), 'logs')
export const TTS_AUDIO_DIR = CACHE_DIR

// Speechify's current models: simba-3.2 is English only and the best English
// voice; simba-3.0 adds six European locales. Anything else has no voice yet —
// a Japanese or Chinese lesson is refused here rather than read by a voice
// that does not speak the language. Another provider slots in beside this one.
const SPEECHIFY = {
  endpoint: 'https://api.speechify.ai/v1',
  locales:  { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-BR' },
  modelFor: (lang) => (lang === 'en' ? 'simba-3.2' : 'simba-3.0'),
}

export const ttsLanguages = () => Object.keys(SPEECHIFY.locales)

// The voice for a language comes from the environment (TTS_VOICE_EN, …) unless
// a request names one, so changing voice never needs a code change.
const defaultVoice = (lang) => process.env[`TTS_VOICE_${lang.toUpperCase()}`] ?? null

const today = () => new Date().toISOString().slice(0, 10)
const logPath = (day = today()) => path.join(LOG_DIR, `tts-${day}.txt`)

// Characters billed today, read back from today's log so a restart does not
// hand out a fresh allowance.
function billedToday() {
  try {
    return fs.readFileSync(logPath(), 'utf8').split('\n').filter(Boolean)
      .reduce((sum, line) => { try { return sum + (JSON.parse(line).billed ?? 0) } catch { return sum } }, 0)
  } catch { return 0 }
}

const dailyLimit = () => Number(process.env.TTS_DAILY_CHAR_LIMIT ?? 3000)

function resolve({ text, lang = 'en', voice = null }) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) return { error: 'text is required', status: 400 }
  const code = String(lang ?? 'en').slice(0, 2).toLowerCase()
  const locale = SPEECHIFY.locales[code]
  if (!locale) return { error: `No voice for language "${code}" yet`, status: 422 }
  const voiceId = voice || defaultVoice(code)
  if (!voiceId) return { error: `No voice set for "${code}" (TTS_VOICE_${code.toUpperCase()})`, status: 422 }
  const model = SPEECHIFY.modelFor(code)
  const key = crypto.createHash('sha256')
    .update(JSON.stringify(['speechify', model, voiceId, locale, clean]))
    .digest('hex').slice(0, 32)
  return { clean, code, locale, voiceId, model, key }
}

// The words and their times, from whatever nesting the marks arrive in —
// one sentence node with word chunks, or sentences inside a paragraph.
function wordsOf(marks) {
  const out = []
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'word') out.push({ start: n.start, end: n.end, t0: n.start_time, t1: n.end_time, value: n.value })
    ;(n.chunks ?? []).forEach(walk)
  }
  walk(marks)
  return out
}

// Word times in SECONDS. Speechify's documentation says seconds, but the API
// answers in milliseconds ("Then" at 3968 in a nine-second sentence). A time
// longer than one second per character can only be milliseconds, so the unit
// is read off the sentence itself rather than trusted from either.
function inSeconds(words, text) {
  const last = words[words.length - 1]?.t1 ?? 0
  if (last <= Math.max(1, text.length)) return words
  return words.map(w => ({ ...w, t0: w.t0 / 1000, t1: w.t1 / 1000 }))
}

const readMeta = (key) => {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, `${key}.json`), 'utf8'))
    return { ...meta, words: inSeconds(meta.words ?? [], meta.text ?? '') }
  } catch { return null }
}

// What a request would cost, without spending anything: the cache key, and
// whether the sentence is already on disk.
export function lookupSpeech(req) {
  const r = resolve(req)
  if (r.error) return r
  const meta = readMeta(r.key)
  return { ...r, meta }
}

export async function synthesize(req) {
  const r = resolve(req)
  if (r.error) return r
  const cached = readMeta(r.key)
  if (cached) return { ...r, meta: cached, cached: true }

  const apiKey = process.env.SPEECHIFY_API_KEY
  if (!apiKey) return { error: 'SPEECHIFY_API_KEY is not set', status: 503 }
  if (billedToday() + r.clean.length > dailyLimit()) {
    return { error: `Daily TTS limit reached (${dailyLimit()} characters, TTS_DAILY_CHAR_LIMIT)`, status: 429 }
  }

  const res = await fetch(`${SPEECHIFY.endpoint}/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      input: r.clean,
      voice_id: r.voiceId,
      model: r.model,
      audio_format: 'mp3',
      // simba-3.2 is English only; the locale is what tells simba-3.0 which of
      // its languages it is reading.
      ...(r.model === 'simba-3.0' ? { language: r.locale } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { error: `Speechify ${res.status}: ${body.slice(0, 300)}`, status: 502 }
  }
  const data = await res.json()
  const billed = Number(data.billable_characters_count ?? r.clean.length)

  // Logged before anything else can fail: this file is the record of what was
  // spent, and the daily limit is read back from it.
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.appendFileSync(logPath(), JSON.stringify({
    at: new Date().toISOString(), provider: 'speechify', model: r.model, voice: r.voiceId,
    lang: r.code, billed, key: r.key, text: r.clean,
  }) + '\n')

  const meta = {
    text: r.clean, provider: 'speechify', model: r.model, voice: r.voiceId, lang: r.code,
    billed, words: inSeconds(wordsOf(data.speech_marks), r.clean), createdAt: new Date().toISOString(),
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(path.join(CACHE_DIR, `${r.key}.mp3`), Buffer.from(data.audio_data ?? '', 'base64'))
  fs.writeFileSync(path.join(CACHE_DIR, `${r.key}.json`), JSON.stringify(meta, null, 2))
  return { ...r, meta, cached: false }
}

// Listing voices generates no audio and bills no characters.
export async function listVoices(lang = null) {
  const apiKey = process.env.SPEECHIFY_API_KEY
  if (!apiKey) return { error: 'SPEECHIFY_API_KEY is not set', status: 503 }
  const res = await fetch(`${SPEECHIFY.endpoint}/voices`, { headers: { Authorization: `Bearer ${apiKey}` } })
  if (!res.ok) return { error: `Speechify ${res.status}`, status: 502 }
  const data = await res.json()
  const all = Array.isArray(data) ? data : (data.voices ?? [])
  const code = lang ? String(lang).slice(0, 2).toLowerCase() : null
  const voices = all
    .map(v => ({
      id: v.id, name: v.display_name, gender: v.gender, locale: v.locale,
      models: (v.models ?? []).map(m => m.name), preview: v.preview_audio ?? null,
    }))
    .filter(v => !code || String(v.locale ?? '').toLowerCase().startsWith(code))
  return { voices }
}
