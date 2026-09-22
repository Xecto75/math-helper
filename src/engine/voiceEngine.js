// ── Voice (dormant) ───────────────────────────────────────────────────────────
// No lesson speaks. This is the client half of a possible move from on-screen
// text to a voice, built ahead so the switch would find it ready; the only way
// to reach it is a "voice-say" step pasted into the Builder's Preview.
//
// The voice is the page's clock. A spoken sentence carries markers — "<2>" —
// and step 2 after the voice-say step starts at the moment the voice reaches
// that point, so the reader hears "then both sides are divided by twelve"
// exactly as the division begins. When an animation runs longer than the words
// that introduce it, the voice waits for it at the next marker instead of
// talking over a picture that has not caught up.
//
// Anything that goes wrong — speech switched off, no voice for the language, a
// browser that refuses to play sound before a click — leaves the page playing
// exactly as it would without a voice. A voice may be missing; the lesson may
// never be stuck because of it.
import { authedFetch, apiUrl } from '../lib/supabase.js'

const MARK_AT = /^(?:<(\d+)>|⟨(\d+)⟩)/

// The sentence as the server will read it — markers out, whitespace collapsed
// and trimmed exactly as the server does — and where each marker falls in it,
// so a marker can be matched to the word the voice is saying at that point.
export function parseMarks(raw) {
  const src = String(raw ?? '')
  const marks = new Map()
  let text = ''
  let space = false
  for (let i = 0; i < src.length;) {
    const m = MARK_AT.exec(src.slice(i))
    if (m) {
      marks.set(Number(m[1] ?? m[2]), text.length + (space && text ? 1 : 0))
      i += m[0].length
      continue
    }
    if (/\s/.test(src[i])) { space = true; i++; continue }
    if (space && text) text += ' '
    space = false
    text += src[i++]
  }
  return { text, marks }
}

// One request per sentence, however often a page asks for it: a page is built
// again on every replay and every ‹, and the audio is the same each time.
const requests = new Map()

export function prepare(rawText, { lang = 'en', voice = null } = {}) {
  const { text, marks } = parseMarks(rawText)
  const key = JSON.stringify([text, lang, voice])
  if (!requests.has(key)) {
    const req = authedFetch('/api/tts', { method: 'POST', body: JSON.stringify({ text, lang, voice }) })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? `Speech failed (${res.status})`)
        return data
      })
    // A failure is kept long enough to cover the build that asked twice (once to
    // fetch ahead, once to start), then dropped so a later build tries again.
    req.catch(() => setTimeout(() => requests.delete(key), 10000))
    requests.set(key, req)
  }
  return requests.get(key).then(data => ({ text, marks, data }))
}

// The time of each marker: the start of the first word at or after it. The
// server sends word times in seconds.
function markTimes(marks, words) {
  const out = new Map()
  for (const [n, at] of marks) {
    const w = words.find(x => x.start >= at)
    out.set(n, w ? w.t0 : Infinity)   // past the last word: when the voice ends
  }
  return out
}

let current = null

// Start the sentence. Returns at once: the steps after it are held by gate().
export async function begin(inputs, stepIndex, { lang = 'en', signal = null, hurried = () => false } = {}) {
  stop()
  let prepared
  try {
    prepared = await prepare(inputs?.text, { lang: inputs?.lang || lang, voice: inputs?.voice || null })
  } catch (e) {
    console.warn('[voice] silent:', e.message)
    return
  }
  if (signal?.cancelled) return

  const words = prepared.data.words ?? []
  const lastWord = words.length ? words[words.length - 1].t1 : 0
  const audio = new Audio(apiUrl(prepared.data.url))
  audio.preload = 'auto'

  const s = {
    audio, times: markTimes(prepared.marks, words), base: stepIndex, signal, hurried,
    // The step the page is on, counted from the voice-say. The page moves to the
    // next step the moment this returns, so a marker at the very start of the
    // sentence has nothing to wait for.
    loopAt: 1,
    held: null,              // the marker the voice is waiting at, if any
    paused: false,
    released: new Set(),     // markers whose step may start
    waiters: new Map(),      // marker → resolve of the step waiting on it
    // A browser that will not play sound before a click still gets the timing:
    // the clock then runs on its own, so the steps come out as they would have.
    silent: false, t0: 0, pausedAt: null,
  }
  s.done = new Promise(r => { s.finish = r })
  current = s

  const onPlayError = (e) => {
    // Our own pause() cutting off a play() that had not started is not a failure.
    if (e?.name === 'AbortError' || s.silent) return
    s.silent = true
    s.t0 = performance.now() - (audio.currentTime || 0) * 1000
    if (s.paused) s.pausedAt = performance.now()
  }
  s.now = () => (s.silent ? ((s.pausedAt ?? performance.now()) - s.t0) / 1000 : audio.currentTime)
  s.pause = () => {
    s.paused = true
    if (!s.silent) audio.pause()
    else if (s.pausedAt === null) s.pausedAt = performance.now()
  }
  s.play = () => {
    s.paused = false
    if (!s.silent) { audio.play().catch(onPlayError); return }
    if (s.pausedAt !== null) { s.t0 += performance.now() - s.pausedAt; s.pausedAt = null }
  }
  s.release = (n) => {
    s.released.add(n)
    const w = s.waiters.get(n)
    if (w) { s.waiters.delete(n); w() }
  }
  s.end = () => {
    clearInterval(s.timer)
    audio.pause()
    for (const n of s.times.keys()) s.release(n)
    s.finish()
    if (current === s) current = null
  }

  s.timer = setInterval(() => {
    if (s.signal?.cancelled || s.hurried()) { s.end(); return }
    const t = s.now()
    for (const [n, at] of s.times) {
      if (s.released.has(n) || t < at) continue
      // The voice got here before the page did: hold it until the step before
      // this one has finished, so it never describes what is not on screen yet.
      if (s.loopAt < n) { if (s.held === null) { s.held = n; s.pause() } continue }
      s.release(n)
    }
    if (s.silent ? (!s.paused && t >= lastWord) : audio.ended) s.end()
  }, 20)
  audio.addEventListener('error', () => { console.warn('[voice] audio failed to load'); s.end() })

  // Not awaited: the page carries on while the voice starts.
  s.play()
}

// Called before every page step. A step no marker names runs as it always has;
// a step a marker names waits for the voice to get there.
export function gate(stepIndex) {
  const s = current
  if (!s) return Promise.resolve()
  const n = stepIndex - s.base
  if (n <= 0) return Promise.resolve()
  s.loopAt = n
  if (s.held !== null && s.held <= n) { s.held = null; s.play() }
  if (!s.times.has(n) || s.released.has(n)) return Promise.resolve()
  if (s.now() >= s.times.get(n)) { s.release(n); return Promise.resolve() }
  return new Promise(r => s.waiters.set(n, r))
}

// The beat is over when the voice is, not when the last animation is.
export function finished() {
  const s = current
  if (!s) return Promise.resolve()
  s.loopAt = Infinity
  if (s.held !== null) { s.held = null; s.play() }
  return s.done
}

export function stop() {
  if (current) current.end()
}
