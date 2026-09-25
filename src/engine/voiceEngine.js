// ── Narration player ──────────────────────────────────────────────────────────
// Built to the spec of 2026-09-23. No lesson narrates yet: generation is
// unchanged and nothing here is reachable from the AI prompts, so the only way
// in is a "narrate" step pasted into the Builder's Preview.
//
// THE VOICE IS THE CLOCK. A narration carries markers — "@2" written just after
// the word that should trigger it — and the steps marked "@2" fire the moment
// the voice reaches that word. Steps with no marker fire at once, as the page
// loads. A page with no markers at all plays exactly as it always has, one step
// after another, with the voice simply reading alongside.
//
// Because the steps a marker fires are not awaited, the animations a marker
// triggers must be short (under ~400ms) and non-blocking — otherwise the words
// run ahead of the picture.
//
// Playback controls, all of them driven from App.jsx:
//   pause      — audio stops where it is, pending markers are unscheduled
//   resume     — audio plays from where it stopped, markers rescheduled from
//                there; markers already fired never fire twice
//   fast mode  — 10× skip or a rewind: no audio, and every marker still pending
//                fires at once so the picture catches up
//   normal     — leaving fast mode seeks to the next marker still ahead of the
//                audio and speaks from there; with none left it simply carries on
//
// Anything that goes wrong — speech switched off, no voice for the language, a
// browser that refuses to play sound before a click — leaves the page playing as
// it would without a voice. A voice may be missing; a lesson may never be stuck.
import { authedFetch, apiUrl } from '../lib/supabase.js'

// "@2" — the marker. N is 1-10 in lesson text, but nothing here cares.
const MARK_AT = /^@(\d+)/

// The sentence as the server will read it — markers out, whitespace collapsed
// and trimmed exactly as the server does — and where each marker falls in it.
export function parseMarkers(raw) {
  const src = String(raw ?? '')
  const marks = new Map()
  let text = ''
  let space = false
  for (let i = 0; i < src.length;) {
    const m = MARK_AT.exec(src.slice(i))
    if (m) {
      // The FIRST time a number appears is the one that counts. Writing @1
      // twice is a slip, and keeping the later position fired the step when
      // the voice reached the second one, seconds after the word meant.
      const n = Number(m[1])
      if (!marks.has(n)) marks.set(n, text.length)
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
  const { text, marks } = parseMarkers(rawText)
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

// When each marker fires: the START of the word it was written after, so
// "divided@2 by twelve" fires as "divided" is spoken, not after it. A marker
// before the first word fires with the first word. Times are seconds.
function markerTimes(marks, words) {
  const out = new Map()
  for (const [n, at] of marks) {
    let hit = null
    for (const w of words) { if (w.start <= at) hit = w; else break }
    out.set(n, (hit ?? words[0])?.t0 ?? 0)
  }
  return out
}

let current = null
let fastMode = false

// ── The session ───────────────────────────────────────────────────────────────

export async function start(inputs, { lang = 'en', voice = null, signal = null, fire = () => {}, fromMarker = null } = {}) {
  const from = Number(fromMarker) || null
  stop()
  let prepared
  try {
    prepared = await prepare(inputs?.text, { lang: inputs?.lang || lang, voice: inputs?.voice || voice || null })
  } catch (e) {
    console.warn('[voice] silent:', e.message)
    return null
  }
  if (signal?.cancelled) return null

  const words = prepared.data.words ?? []
  const audio = new Audio(apiUrl(prepared.data.url))
  audio.preload = 'auto'

  const s = {
    audio, signal, fire,
    times: markerTimes(prepared.marks, words),
    end: words.length ? words[words.length - 1].t1 : 0,
    fired: new Set(),
    timers: [],
    paused: false,
    // A browser that will not play sound before a click still gets the timing:
    // the clock then runs on its own, so the markers fire as they would have.
    silent: false, t0: 0, stoppedAt: null,
    over: false,
  }
  s.done = new Promise(r => { s.finish = r })
  current = s

  s.now = () => (s.silent ? Math.max(0, ((s.stoppedAt ?? performance.now()) - s.t0) / 1000) : audio.currentTime)
  s.clearTimers = () => { s.timers.forEach(clearTimeout); s.timers = [] }
  s.fireMark = (n) => {
    if (s.fired.has(n)) return
    s.fired.add(n)
    try { s.fire(n) } catch (e) { console.error(e) }
  }
  s.pending = () => [...s.times.entries()].filter(([n]) => !s.fired.has(n)).sort((a, b) => a[1] - b[1])

  // Only markers still AHEAD are scheduled; one already passed is left alone
  // rather than fired late, which is what keeps a resume from repeating itself.
  s.scheduleFrom = (fromSec) => {
    s.clearTimers()
    for (const [n, at] of s.pending()) {
      if (at <= fromSec) continue
      const id = setTimeout(() => {
        if (s.paused || fastMode || s.over) return
        s.fireMark(n)
      }, (at - fromSec) * 1000)
      s.timers.push(id)
    }
  }

  const onPlayError = (e) => {
    // Our own pause() cutting off a play() that had not started is not a failure.
    if (e?.name === 'AbortError' || s.silent) return
    s.silent = true
    s.t0 = performance.now() - (audio.currentTime || 0) * 1000
    if (s.paused || fastMode) s.stoppedAt = performance.now()
  }
  s.playAudio = () => {
    if (!s.silent) { audio.play().catch(onPlayError); return }
    if (s.stoppedAt !== null) { s.t0 += performance.now() - s.stoppedAt; s.stoppedAt = null }
  }
  s.pauseAudio = () => {
    if (!s.silent) audio.pause()
    else if (s.stoppedAt === null) s.stoppedAt = performance.now()
  }
  s.seek = (sec) => {
    if (!s.silent) audio.currentTime = sec
    else s.t0 = performance.now() - sec * 1000
  }
  s.finishUp = () => {
    if (s.over) return
    s.over = true
    s.clearTimers()
    clearInterval(s.watch)
    audio.pause()
    s.finish()
    if (current === s) current = null
  }

  // The clock is watched rather than trusted: a paused or seeking audio element
  // does not fire timers, and the silent fallback has no events at all.
  s.watch = setInterval(() => {
    if (s.signal?.cancelled) { s.finishUp(); return }
    if (fastMode || s.paused) return
    if (s.silent ? s.now() >= s.end : audio.ended) s.finishUp()
  }, 60)
  audio.addEventListener('ended', () => s.finishUp())
  audio.addEventListener('error', () => { console.warn('[voice] audio failed to load'); s.finishUp() })

  if (fastMode) {
    // Built while skipping or rewinding: no words, but the picture still has to
    // catch up, so everything the narration would have triggered fires now.
    s.pending().forEach(([n]) => s.fireMark(n))
  } else if (from && s.times.has(from)) {
    // Re-entering part-way: the words start at that marker, and everything
    // marked before it is replayed at once so the picture is whole first.
    const at = s.times.get(from)
    s.pending().filter(([, t]) => t < at).forEach(([n]) => s.fireMark(n))
    s.seek(at)
    s.playAudio()
    s.scheduleFrom(at - 0.001)
  } else {
    s.playAudio()
    s.scheduleFrom(0)
  }
  return s
}

export function pause() {
  const s = current
  if (!s || s.paused) return
  s.paused = true
  s.clearTimers()
  s.pauseAudio()
}

export function resume() {
  const s = current
  if (!s || !s.paused) return
  s.paused = false
  if (fastMode) return
  s.playAudio()
  s.scheduleFrom(s.now())
}

// 10× skip or rewind on, then off again.
export function setFastMode(on) {
  const want = !!on
  if (want === fastMode) return
  fastMode = want
  const s = current
  if (!s) return
  if (want) {
    s.clearTimers()
    s.pauseAudio()
    // Every marker still to come fires at once: this is the skip.
    s.pending().forEach(([n]) => s.fireMark(n))
    return
  }
  // Back to normal speed. The words pick up at the first marker still ahead of
  // where the audio was left; with none left, they simply carry on.
  const next = s.pending().find(([, at]) => at > s.now())
  if (next) {
    s.seek(next[1])
    s.scheduleFrom(next[1] - 0.001)
  } else {
    s.scheduleFrom(s.now())
  }
  if (!s.paused) s.playAudio()
}

export const isFastMode = () => fastMode

// The beat is over when the voice is, not when the last animation is.
export function finished() {
  const s = current
  if (!s) return Promise.resolve()
  return s.done
}

export function stop() {
  current?.finishUp()
}
