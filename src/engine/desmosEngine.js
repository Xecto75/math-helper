/**
 * Desmos Engine — drives a DesmosDisplay (Desmos graphing calculator).
 * All functions receive the Desmos calculator instance as first argument.
 * Registry maps logical ids to Desmos expression ids for removal.
 */
import { parse } from 'mathjs'
import { animMs } from './animSpeed.js'

const registry = new Map()
let _vp = { left: -10, right: 10, bottom: -7.5, top: 7.5 }
// True once a step on this page set the view itself (adjustView/setViewport):
// automatic framing may still widen the view, but never closes in over it.
let _vpByLesson = false

// ── Trig-circle HTML overlay ───────────────────────────────────────────────
const _tcListeners = new Set()
export function onTrigOverlay(fn)  { _tcListeners.add(fn) }
export function offTrigOverlay(fn) { _tcListeners.delete(fn) }
function _emitTrigOverlay(items)   { _tcListeners.forEach(fn => fn(items)) }

// ── Graph clear notification — lets DesmosDisplay reset its own pan/zoom
// toggle (and the saved-viewport it's holding onto) whenever a new page/
// lesson starts. Without this, leaving the graph unlocked and navigating
// away would leave the toggle armed with the OLD page's saved viewport,
// so clicking "lock" on the new page would jump it to the wrong bounds.
const _clearListeners = new Set()
export function onGraphClear(fn)  { _clearListeners.add(fn) }
export function offGraphClear(fn) { _clearListeners.delete(fn) }
function _emitClear() { _clearListeners.forEach(fn => fn()) }

// ── Graph interactive (pan/zoom) mode — lets CommentLayer fade out connector
// lines anchored to a graph point/curve while the user is dragging the
// graph around. Tracking each comment's line position live through an
// arbitrary pan/zoom would mean re-deriving it every frame; fading the line
// (never the comment box itself) sidesteps that entirely.
const _interactiveListeners = new Set()
export function onGraphInteractiveChange(fn)  { _interactiveListeners.add(fn) }
export function offGraphInteractiveChange(fn) { _interactiveListeners.delete(fn) }
export function setGraphInteractive(on) { _interactiveListeners.forEach(fn => fn(on)) }

// ── Variable sliders — a |name| token inside a plotFunction expr becomes a
// live-draggable parameter shared by every expression that references it. ──
const sliders = new Map() // name -> { value, min, max, step }
const _sliderListeners = new Set()
export function onSliderChange(fn)  { _sliderListeners.add(fn) }
export function offSliderChange(fn) { _sliderListeners.delete(fn) }
function _emitSliders() { const list = getSliderVars(); _sliderListeners.forEach(fn => fn(list)) }

export function getSliderVars() {
  return [...sliders.entries()].map(([name, s]) => ({ name, ...s }))
}

// Live value getter for valueRefs.js's `[name]v` token — the slider's
// current dragged value (e.g. a plotFunction("|a|*x+|b|") slider named "a").
export function getSliderValue(name) {
  return sliders.get(name)?.value
}

// ── Live equation label — shows a plotted function's expression with its
// CURRENT slider values substituted in, re-rendered on every slider drag
// (React-side, via onSliderChange — same subscribe pattern as SliderPanel;
// deliberately not a Desmos-canvas label, since Desmos's labelOrientation
// API is too unreliable/undocumented for precise placement — see addPoint).
const liveEquations = new Map() // id -> funcId
const _liveEqListeners = new Set()
export function onLiveEquationsChange(fn)  { _liveEqListeners.add(fn) }
export function offLiveEquationsChange(fn) { _liveEqListeners.delete(fn) }
function _emitLiveEquations() { _liveEqListeners.forEach(fn => fn(getLiveEquations())) }

export function showLiveEquation(id, funcId) {
  liveEquations.set(id, funcId)
  _emitLiveEquations()
}
export function hideLiveEquation(id) {
  liveEquations.delete(id)
  _emitLiveEquations()
}
export function getLiveEquations() {
  return [...liveEquations.entries()].map(([id, funcId]) => ({ id, funcId }))
}

function formatSliderNum(v) {
  const r = Math.round(v * 100) / 100
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// Substitutes each |name| in the function's ORIGINAL templated expression
// (before stripSliderPipes) with that slider's current value, then tidies
// the result into displayable LaTeX: drop explicit * (implicit mult reads
// better), promote ^n to ^{n} for KaTeX, and fold a "+ -3" into "- 3".
// The live badge is the one piece of notation a reader actually studies while
// dragging a slider, so it is written the way it is written on a board: ⌊x⌋ and
// ⌈x⌉ rather than the word "floor" set in italics (which reads as f·l·o·o·r
// multiplied together — the very confusion the graph itself had), and √x rather
// than "sqrt(x)". Depth-counted like sqrtToLatex, so the closing paren of
// "floor(b*(x-h))" is the outer one and not the first one encountered.
// "2-4(x-2)/2" is 2 minus a fraction; "3*(x-2)*8/4" is one fraction over 4.
// The difference is not the "/" — it is how far the numerator reaches, and that
// is a MULTIPLICATIVE run: walk left from the slash over factors, parentheses
// and colour wrappers, and stop at the first + or - that is really joining two
// terms (a leading sign is part of the term, not a break). The denominator is
// the same walk to the right. Written out with \frac, the bar then covers
// exactly what is divided, which is the whole point of drawing one.
function fractionsToLatex(str) {
  let depth = 0
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (c === '(' || c === '{') { depth++; continue }
    if (c === ')' || c === '}') { depth--; continue }
    if (c !== '/' || depth !== 0) continue

    let d = 0, a = i - 1
    for (; a >= 0; a--) {
      const ch = str[a]
      if (ch === ')' || ch === '}') d++
      else if (ch === '(' || ch === '{') d--
      else if (d === 0 && (ch === '+' || ch === '-')) {
        const before = str.slice(0, a).trim()
        // Nothing before it, or another operator: it is a SIGN on this term.
        if (before && !/[-+*/(]$/.test(before)) break
      }
    }
    let d2 = 0, b = i + 1
    for (; b < str.length; b++) {
      const ch = str[b]
      if (ch === '(' || ch === '{') d2++
      else if (ch === ')' || ch === '}') { if (d2 === 0) break; d2-- }
      else if (d2 === 0 && (ch === '+' || ch === '-') && b > i + 1) break
    }
    const num = str.slice(a + 1, i)
    const den = str.slice(i + 1, b)
    if (!num.trim() || !den.trim()) continue
    return str.slice(0, a + 1)
      + `\\frac{${fractionsToLatex(num)}}{${fractionsToLatex(den)}}`
      + fractionsToLatex(str.slice(b))
  }
  return str
}

function prettyBadgeLatex(str) {
  const OPEN = {
    floor: ['\\lfloor ', ' \\rfloor'],
    ceil:  ['\\lceil ',  ' \\rceil'],
    sqrt:  ['\\sqrt{',    '}'],
    cbrt:  ['\\sqrt[3]{', '}'],
  }
  let out = ''
  for (let i = 0; i < str.length; i++) {
    const m = /^(floor|ceil|sqrt|cbrt)\(/.exec(str.slice(i))
    if (!m || (i > 0 && /[a-zA-Z\\]/.test(str[i - 1]))) { out += str[i]; continue }
    const open = i + m[1].length          // sits on the '('
    let depth = 0, j = open
    for (; j < str.length; j++) {
      if (str[j] === '(') depth++
      else if (str[j] === ')' && --depth === 0) break
    }
    if (j >= str.length) { out += str[i]; continue }   // unbalanced — leave it
    const [L, R] = OPEN[m[1]]
    out += L + prettyBadgeLatex(str.slice(open + 1, j)) + R
    i = j
  }
  return out
}

export function getLiveEquationText(funcId) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn?.template) return null
  const names = extractSliderVars(fn.template)
  if (!names.length) return null
  // The badge writes its own "y = ", so an expression that already carries one
  // must not get a second: "y=|a|x" was coming out as "y = y=1x".
  let disp = fn.template.replace(/^\s*y\s*=\s*/i, '')
  for (const name of names) {
    const s   = sliders.get(name)
    const val = s ? formatSliderNum(s.value) : name
    // Same colour as the rail that produced it — that pairing IS what makes
    // "which number am I dragging" answerable without reading the letters.
    disp = disp.split(`|${name}|`).join(s?.color ? `\\textcolor{${s.color}}{${val}}` : val)
  }
  const latex = fractionsToLatex(prettyBadgeLatex(disp))
    // A real multiplication dot, not a dropped "*": "1·2" says what it is,
    // "12" says something else entirely.
    .replace(/\*/g, ' \\cdot ')
    .replace(/\^(-?\d+(\.\d+)?)/g, '^{$1}')
    // "+ -3" still folds into "- 3" now that the number is wrapped: the sign is
    // lifted out of the colour box rather than left stranded inside it.
    .replace(/\+\s*(\\textcolor\{[^}]*\}\{)?-/g, (_, pre) => (pre ? `- ${pre}` : '- '))
  return { text: `$y = ${latex}$`, color: fn.color }
}

const PIPE_VAR_RE = /\|([^|]+)\|/g
function extractSliderVars(expr) {
  const names = []
  for (const m of expr.matchAll(PIPE_VAR_RE)) {
    const n = m[1].trim()
    if (n && !names.includes(n)) names.push(n)
  }
  return names
}
function stripSliderPipes(expr) { return expr.replace(PIPE_VAR_RE, '$1') }

// One colour per slider, so the rail a reader is dragging and the number it
// writes into the equation below are recognisably the same thing. The reserved
// blue is deliberately NOT in this ramp: it already belongs to the curve and
// its equation, and a slider wearing it would read as "this one IS the curve".
const SLIDER_COLORS = ['#f97316', '#22c55e', '#a855f7', '#fbbf24', '#06b6d4', '#f472b6']

function registerSlider(calc, name) {
  if (sliders.has(name)) return
  const color = SLIDER_COLORS[sliders.size % SLIDER_COLORS.length]
  const s = { value: 1, min: -10, max: 10, step: 0.1, color }
  sliders.set(name, s)
  calc.setExpression({ id: `slider_${name}`, latex: `${name}=${s.value}` })
}

// Don't trust that clearAll ran at the right moment to reset sliders between
// pages (registry.clear() timing has proven fragile — a page transition
// mid-async-build, an old function's slider outliving its own removal, etc).
// Instead, every plotFunction call resyncs sliders to exactly the union of
// |name| tokens across every CURRENTLY-registered function's template —
// "assume there are none, then check what's actually plotted" — so a stale
// slider from a function that's no longer on screen can never linger.
function pruneOrphanSliders(calc) {
  const used = new Set()
  for (const val of registry.values()) {
    if (val.template) extractSliderVars(val.template).forEach(n => used.add(n))
  }
  for (const name of [...sliders.keys()]) {
    if (used.has(name)) continue
    sliders.delete(name)
    calc?.removeExpression?.({ id: `slider_${name}` })
  }
}

export function setSliderValue(calc, name, value) {
  const s = sliders.get(name)
  if (!s) return
  s.value = value
  calc.setExpression({ id: `slider_${name}`, latex: `${name}=${value}` })
  // a, b, h and k reshape a staircase, so its endpoints move with them.
  refreshAllStepDots(calc)
  _emitSliders()
}

// Auto-generate the next available function id (f, g, h, … f1, f2 …)
export function nextFuncId() {
  for (const l of ['f','g','h','p','q','r','s','t','u','v']) {
    if (!registry.has(`fn::${l}`)) return l
  }
  for (let i = 1; i <= 99; i++) {
    if (!registry.has(`fn::f${i}`)) return `f${i}`
  }
  return `f_${Date.now()}`
}

// Returns the list of currently-registered function ids, in insertion order.
export function getFunctionIds() {
  return [...registry.keys()].filter(k => k.startsWith('fn::')).map(k => k.slice(4))
}

// ── Live value getters ─────────────────────────────────────────────────────
// Read back the exact numbers (or, for a function, its expression string)
// stored when the object was created — used by valueRefs.js so `[id]token`
// never has to duplicate a value the lesson already plotted.

export function getPointCoords(id) {
  const e = registry.get(`pt::${id}`)
  if (!e || !isFinite(e.numX) || !isFinite(e.numY)) return undefined
  return { x: e.numX, y: e.numY }
}

export function getSegmentValue(id, token) {
  const e = registry.get(`seg::${id}`)
  if (!e) return undefined
  switch (token) {
    case 'x1': return e.x1
    case 'y1': return e.y1
    case 'x2': return e.x2
    case 'y2': return e.y2
    case 'len': return Math.hypot(e.x2 - e.x1, e.y2 - e.y1)
    default:   return undefined
  }
}

export function getFunctionExpr(id) {
  return registry.get(`fn::${id}`)?.expr
}

// Walks a parsed expression left-to-right, collecting every numeric literal
// and every non-'x' symbol (resolved through the live slider registry) in
// the order they're written — e.g. "2*x+4" → [2, 4], "a*x+b" (a slider-
// backed plot) → [a's current value, b's current value]. `sign` flips
// across unary/binary minus so a written "2x - 3" correctly yields [2, -3]
// rather than [2, 3]. Unresolvable symbols still push (as undefined) to
// keep every later position correctly aligned.
function collectFunctionParams(node, sign, out) {
  if (!node) return
  switch (node.type) {
    case 'ConstantNode':
      if (typeof node.value === 'number') out.push(sign * node.value)
      return
    case 'SymbolNode':
      if (node.name === 'x') return
      out.push(sliders.has(node.name) ? sign * sliders.get(node.name).value : undefined)
      return
    case 'ParenthesisNode':
      collectFunctionParams(node.content, sign, out)
      return
    case 'FunctionNode':
      node.args.forEach(a => collectFunctionParams(a, sign, out))
      return
    case 'OperatorNode':
      if (node.op === '-' && node.args.length === 1) { collectFunctionParams(node.args[0], -sign, out); return }
      if (node.op === '-' && node.args.length === 2) {
        collectFunctionParams(node.args[0], sign, out)
        collectFunctionParams(node.args[1], -sign, out)
        return
      }
      node.args.forEach(a => collectFunctionParams(a, sign, out))
      return
    default:
      return
  }
}

// Live value getter for valueRefs.js's `[funcId]N` token (bare digit, same
// convention as a shape's `[id]N` side length) — the Nth number written in
// the plotted expression, whether it's a hardcoded literal ("2x+4"'s 2 and
// 4) or a slider's current value ("|a|*x+|b|"'s a and b).
export function getFunctionParam(id, index) {
  const expr = registry.get(`fn::${id}`)?.expr
  if (!expr) return undefined
  let ast
  try { ast = parse(expr) } catch { return undefined }
  const out = []
  collectFunctionParams(ast, 1, out)
  return out[index]
}

export function serializeRegistry() {
  // Deep-clone each entry so mutations (e.g. transformFunction updating fn.expr)
  // never bleed back into the saved snapshot.
  const out = new Map()
  for (const [k, v] of registry) out.set(k, JSON.parse(JSON.stringify(v)))
  return out
}
export function restoreRegistry(saved) { registry.clear(); for (const [k,v] of saved) registry.set(k,v) }

function rgbToHex([r, g, b]) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function darken(hex, factor = 0.65) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return rgbToHex([Math.round(r * factor), Math.round(g * factor), Math.round(b * factor)])
}

// Blend toward white. Because the Desmos container is CSS-inverted, a LIGHTER raw
// color renders DARKER on screen — so this is used to make points darker than the curve.
// ── Fade helpers ──────────────────────────────────────────────────────────────

// An angle mark sits ON the figure it measures, so neither its rim nor its tint
// is drawn at full strength — the segments underneath have to stay readable.
const ANGLE_LINE = 0.85
const ANGLE_FILL = 0.22

const FADE_MS = 380
// An endpoint sliding to a new place. Slower than a fade because the eye has to
// follow it there, not just notice it.
const MOVE_MS = 520
const easeIO = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t) * t

// Animate opacity props from 0 → target values, then resolve.
function fadeIn(calc, ids, props, ms = FADE_MS) {
  if (!ids.length) return Promise.resolve()
  return new Promise(resolve => {
    const t0 = performance.now()
    ;(function tick() {
      const p = Math.min((performance.now() - t0) / animMs(ms), 1)
      const e = easeIO(p)
      const o = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, v * e]))
      ids.forEach(id => calc.setExpression({ id, ...o }))
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })
}

// Animate opacity props from their current target values → 0, then remove and resolve.
function fadeOut(calc, ids, props, ms = FADE_MS) {
  if (!ids.length) return Promise.resolve()
  return new Promise(resolve => {
    const t0 = performance.now()
    ;(function tick() {
      const p = Math.min((performance.now() - t0) / animMs(ms), 1)
      const e = easeIO(p)
      const o = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, v * (1 - e)]))
      ids.forEach(id => calc.setExpression({ id, ...o }))
      if (p < 1) requestAnimationFrame(tick)
      else {
        ids.forEach(id => calc.removeExpression({ id }))
        resolve()
      }
    })()
  })
}

// Desmos paints its expression list in order, so whatever was added LAST is
// drawn on top. A segment added before a curve therefore ends up underneath
// it — and the segment is the thing the lesson is pointing at, so a curve
// plotted afterwards must not cover it. Re-adding the segment expressions
// moves them back to the end of the list.
//
// Each one is re-added from the state Desmos itself is holding, not rebuilt
// from the registry: the registry knows the geometry but not the colour and
// opacity the expression currently carries, and rebuilding would quietly undo
// a fade or a per-step colour change. Remove-then-set happens inside one task,
// so Desmos repaints once at the end and nothing flickers.
function raiseSegments(calc) {
  const states = calc.getExpressions?.()
  if (!states) return
  const byId = new Map(states.map(s => [s.id, s]))
  for (const [key, e] of registry) {
    if (!/^(seg|segtick|vec)::/.test(key)) continue
    const ids = e.calcIds ?? (e.calcId ? [e.calcId] : [])
    for (const cid of ids) {
      const st = byId.get(cid)
      if (!st) continue
      calc.removeExpression({ id: cid })
      calc.setExpression(st)
    }
  }
}

// ── Graph functions ───────────────────────────────────────────────────────────

// The reserved blue is FIRST because a curve drawn with no colour asked for
// is a DEFAULT, and the default is always #60a5fa. The rest of the cycle only
// exists so a second and third curve on the same graph stay tellable apart.
const FUNC_COLORS = ['#60a5fa', '#22c55e', '#fbbf24', '#f97316', '#06b6d4', '#f472b6', '#7c6ef5']

// ── Step-function endpoints ──────────────────────────────────────────────────
// Desmos draws a staircase as bare segments. It has no notion of an endpoint
// that does NOT belong to the curve, so nothing shows where one step stops and
// the next begins — and "which step does x = 2 actually belong to" IS the
// question a step-function lesson asks. The ●/○ pair is the content, not
// decoration, so it is placed automatically and is never an authorable step.
//
// One filled dot and one hollow dot per visible step, both in the curve's own
// colour. Two consequences of the function being infinite and parameterised:
// only the steps currently in view are drawn (recomputed on pan and zoom), and
// they are recomputed when a slider moves, so a, b, h and k stay live.
//
// Boundaries are found by SAMPLING, not algebra: floor can sit anywhere inside
// an expression, and a solver that only understood a*floor(b*(x-h))+k would
// quietly draw nothing for everything else.
const STEP_FN_RE    = /\b(floor|ceil)\s*\(/
const MAX_STEP_DOTS = 60          // past this they are noise, not information
const STEP_DOT_SIZE = 9
const stepDots      = new Map()   // funcId -> { closedId, openId }
const _boundsWatched = new WeakSet()

// The x where f jumps, with the value on each side of the jump.
//
// The candidate filter is what separates a JUMP from a mere slope: on a
// staircase most sample gaps are exactly 0, so any non-zero one is a jump,
// while on something like "x + floor(x)" every gap is non-zero and only the
// ones far above the typical gap are real. Bisecting every interval instead
// would be tens of thousands of evaluations on every frame of a zoom.
function stepBoundaries(f, left, right) {
  const N  = 1200
  const dx = (right - left) / N
  const at = (x) => { try { const y = f(x); return isFinite(y) ? y : null } catch { return null } }

  const xs = [], ys = []
  for (let i = 0; i <= N; i++) { const x = left + i * dx; xs.push(x); ys.push(at(x)) }

  const gaps = []
  for (let i = 1; i <= N; i++)
    if (ys[i - 1] !== null && ys[i] !== null) gaps.push(Math.abs(ys[i] - ys[i - 1]))
  if (!gaps.length) return []
  const sorted = [...gaps].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const minJump = Math.max(median * 8, 1e-9)

  const out = []
  for (let i = 1; i <= N; i++) {
    const yA = ys[i - 1], yB = ys[i]
    if (yA === null || yB === null || Math.abs(yB - yA) <= minJump) continue
    // Squeeze onto the jump itself. 60 halvings of one sample interval is far
    // under a screen pixel at any zoom the reader can reach.
    let lo = xs[i - 1], hi = xs[i]
    for (let j = 0; j < 60; j++) {
      const mid = (lo + hi) / 2
      const ym  = at(mid)
      if (ym === null) break
      if (Math.abs(ym - yA) < Math.abs(ym - yB)) lo = mid
      else hi = mid
    }
    out.push({ x: hi, yLo: yA, yHi: yB })
    if (out.length > MAX_STEP_DOTS) return out
  }
  return out
}

// Read the bounds Desmos is ACTUALLY showing. Deliberately not syncViewport():
// this runs on every frame of a drag, and _vp is written by the animated
// viewport transitions elsewhere — moving it from here would fight them.
function currentXRange(calc) {
  const mc = calc?.graphpaperBounds?.mathCoordinates
  if (mc && isFinite(mc.left) && isFinite(mc.right) && mc.right > mc.left)
    return { left: mc.left, right: mc.right }
  const vp = getViewport()
  return { left: vp.left, right: vp.right }
}

function dropStepDots(calc, id) {
  const d = stepDots.get(id)
  if (!d) return
  calc?.removeExpression({ id: d.closedId })
  calc?.removeExpression({ id: d.openId })
  stepDots.delete(id)
}

// Returns the two expression ids when it drew something, so the first plot can
// fade them in alongside the curve instead of popping them on at the end.
function refreshStepDots(calc, id, pointOpacity = 1) {
  const fn = registry.get(`fn::${id}`)
  if (!calc || !fn || fn.isRegion || !STEP_FN_RE.test(fn.expr ?? '')) { dropStepDots(calc, id); return null }

  const f = makeEval(fn.expr)
  if (!f) { dropStepDots(calc, id); return null }

  const { left, right } = currentXRange(calc)
  const cuts = stepBoundaries(f, left, right)
  if (!cuts.length || cuts.length > MAX_STEP_DOTS) { dropStepDots(calc, id); return null }

  // Which side of the jump the boundary belongs to: floor is right-continuous
  // (f(2) is the NEW step), ceil is left-continuous. A negative coefficient
  // inside would swap them — not a form these lessons use, and guessing it
  // wrong is worse than not guessing.
  const rightClosed = /\bfloor\s*\(/.test(fn.expr) || !/\bceil\s*\(/.test(fn.expr)
  const n = (v) => Number(v.toFixed(6))
  const list = (pts) => `([${pts.map(p => n(p[0])).join(',')}],[${pts.map(p => n(p[1])).join(',')}])`

  const closed = cuts.map(c => [c.x, rightClosed ? c.yHi : c.yLo])
  const open   = cuts.map(c => [c.x, rightClosed ? c.yLo : c.yHi])

  const closedId = `stepc_${id}`, openId = `stepo_${id}`
  const common = { color: fn.color, pointSize: STEP_DOT_SIZE, lines: false, pointOpacity }
  calc.setExpression({ id: closedId, latex: list(closed), pointStyle: 'POINT', ...common })
  calc.setExpression({ id: openId,   latex: list(open),   pointStyle: 'OPEN',  ...common })
  stepDots.set(id, { closedId, openId })
  return [closedId, openId]
}

function refreshAllStepDots(calc) {
  for (const key of registry.keys())
    if (key.startsWith('fn::')) refreshStepDots(calc, key.slice(4))
}

// The dots have to follow the reader's own pan and zoom, not just the steps a
// lesson takes — the curve is infinite and only what is on screen is drawn.
function watchBoundsFor(calc) {
  if (!calc || _boundsWatched.has(calc)) return
  _boundsWatched.add(calc)
  let queued = false
  try {
    calc.observe('graphpaperBounds', () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => { queued = false; refreshAllStepDots(calc) })
    })
  } catch { /* no observer available — the dots still follow the lesson's own steps */ }
}

export async function plotFunction(calc, id, expr, opts = {}) {
  const sliderVars = extractSliderVars(expr)
  const cleanExpr  = stripSliderPipes(expr)
  sliderVars.forEach(name => registerSlider(calc, name))
  const color     = opts.color ? rgbToHex(opts.color) : FUNC_COLORS[getFunctionIds().length % FUNC_COLORS.length]
  const lineWidth = opts.thickness ?? 3
  // Desmos wants LaTeX (\sqrt{...}), makeEval wants the plain source
  // (sqrt(...)) — the two are kept side by side rather than one overwriting
  // the other, so plotting a root no longer silently draws nothing while
  // intersections/roots/tangents keep evaluating it correctly.
  const latexExpr = toDesmos(cleanExpr)
  // An inequality is a REGION, not a curve: "x > -2" means every point to the
  // right of the line x = -2, and "2x - y > 3" every point on one side of that
  // line. Desmos shades exactly that as soon as the latex carries a comparison,
  // so the expression goes in unchanged and only the styling is decided here:
  // the boundary is dashed when the comparison is strict and solid when it
  // includes equality. That dash is not decoration — it is how the reader is
  // told whether the boundary itself belongs to the answer.
  const compare  = inequalityCompare(latexExpr)
  const isRegion = Boolean(compare)
  const strict   = isRegion && (compare[1] === '<' || compare[1] === '>')
  const fillOp   = isRegion ? 0.3 : 0
  const fadeProps = isRegion ? { lineOpacity: 1, fillOpacity: fillOp } : { lineOpacity: 1 }
  calc.setExpression({
    id: `fn_${id}`, latex: latexExpr, color, lineWidth, lineOpacity: 0,
    ...(isRegion ? { fillOpacity: 0, lineStyle: strict ? 'DASHED' : 'SOLID' } : {}),
  })
  // hasSliders marks this as a "drag to explore" curve — its shape is meant to
  // keep changing, so any label on it (getVisibilityAnchors) must never lock
  // the camera onto whatever position happened to be true when it was first
  // drawn (see ensureVisible).
  registry.set(`fn::${id}`, { calcId: `fn_${id}`, expr: cleanExpr, latex: latexExpr, template: expr, color, lineWidth, hasSliders: sliderVars.length > 0, isRegion, fadeProps })
  // Resync now that this function's template is in the registry — a slider
  // no longer referenced by anything currently plotted (e.g. this call just
  // replaced an old "explore" curve with a slider-free one) is removed here,
  // not left to whenever/whether a clear happened to run first.
  pruneOrphanSliders(calc)
  _emitSliders()
  // Not an authorable step — automatic, same spirit as the sliders
  // themselves: a curve either has |name| params to watch update or it
  // doesn't, no separate "turn the badge on" action to remember.
  if (sliderVars.length) showLiveEquation(id, id)
  else hideLiveEquation(id)
  // Placed before the fade so they come up WITH the curve rather than popping
  // on once it has settled, and watched from here so a reader's own zoom keeps
  // them in step without any lesson asking for it.
  watchBoundsFor(calc)
  const dotIds = refreshStepDots(calc, id, 0)
  await Promise.all([
    fadeIn(calc, [`fn_${id}`], fadeProps),
    dotIds ? fadeIn(calc, dotIds, { pointOpacity: 1 }) : Promise.resolve(),
  ])
  raiseSegments(calc)
}

// ── Line of best fit (least-squares regression) through already-placed
// points — "nuage de points" → trend line. Registered in the same fn::
// namespace as plotFunction (ensureVisible/[id]expr/[id]0 all work on it),
// dashed by default so it visually reads as a fitted line, not more data.
export async function plotBestFitLine(calc, id, pointIdsRaw, opts = {}) {
  const trimmed = (pointIdsRaw || '').trim()
  // Blank pointIds = every point currently placed, not "no points" — typing
  // out every id by hand is exactly the friction this function exists to avoid.
  const ids = trimmed
    ? trimmed.split(',').map(s => s.trim()).filter(Boolean)
    : [...registry.keys()].filter(k => k.startsWith('pt::')).map(k => k.slice(4))
  const pts = ids
    .map(pid => registry.get(`pt::${pid}`))
    .filter(p => p && isFinite(p.numX) && isFinite(p.numY))
  if (pts.length < 2) return null

  const n = pts.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (const p of pts) {
    sumX += p.numX; sumY += p.numY
    sumXY += p.numX * p.numY; sumX2 += p.numX * p.numX
  }
  const denom = n * sumX2 - sumX * sumX
  if (!denom) return null // every point shares the same x — no well-defined line

  const slope     = +(((n * sumXY - sumX * sumY) / denom).toFixed(4))
  const intercept = +(((sumY - slope * sumX) / n).toFixed(4))

  const color     = opts.color ? (Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color) : '#60a5fa'
  const lineWidth = opts.thickness ?? 3
  const sign      = intercept < 0 ? '-' : '+'
  const latex     = `y=${slope}x${sign}${Math.abs(intercept)}`
  const cId       = `fn_${id}`

  calc.setExpression({ id: cId, latex, color, lineWidth, lineStyle: 'DASHED', lineOpacity: 0 })
  registry.set(`fn::${id}`, {
    calcId: cId, expr: latex.slice(2), color, lineWidth,
    hasSliders: false, fadeProps: { lineOpacity: 1 },
  })
  await fadeIn(calc, [cId], { lineOpacity: 1 })
  raiseSegments(calc)
  return { slope, intercept }
}

export async function removeFunction(calc, id) {
  const toFadeOut = []

  const e = registry.get(`fn::${id}`)
  if (e) {
    toFadeOut.push({ ids: [e.calcId], props: e.fadeProps ?? { lineOpacity: 1 } })
    registry.delete(`fn::${id}`)
  }
  const dots = stepDots.get(id)
  if (dots) {
    toFadeOut.push({ ids: [dots.closedId, dots.openId], props: { pointOpacity: 1 } })
    stepDots.delete(id)
  }
  for (const [key, val] of [...registry.entries()]) {
    if (val.funcId === id) {
      const ids = val.calcIds ?? (val.calcId ? [val.calcId] : [])
      toFadeOut.push({ ids, props: val.fadeProps ?? { lineOpacity: 1 } })
      registry.delete(key)
      continue
    }
    if (key.startsWith('int::') && (val.f1Id === id || val.f2Id === id)) {
      toFadeOut.push({ ids: val.calcIds ?? [], props: val.fadeProps ?? { pointOpacity: 1 } })
      registry.delete(key)
    }
  }

  await Promise.all(toFadeOut.map(({ ids, props }) => fadeOut(calc, ids, props)))
  pruneOrphanSliders(calc)
  _emitSliders()
  hideLiveEquation(id)
}

export async function shadeUnderCurve(calc, id, funcId, a, b, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return
  // A region is a shaded half-plane, not a curve: it has no y for a given x,
  // so there is nothing here to shade under, cross, root, differentiate or take
  // a tangent to. Bailing keeps a mis-authored step inert instead of placing
  // points at y = true, which is what an inequality evaluates to.
  if (fn.isRegion) return
  const color   = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const fillOp  = opts.fillOpacity ?? 0.4
  const areaId  = `area_${id}`
  const vaId    = `area_va_${id}`
  const vbId    = `area_vb_${id}`
  const latex   = `y\\le\\left(${fn.latex ?? fn.expr}\\right)\\left\\{${a}\\le x\\le${b}\\right\\}\\left\\{y\\ge0\\right\\}`
  calc.setExpression({ id: areaId, latex, color, fillOpacity: 0, lineOpacity: 0 })
  calc.setExpression({ id: vaId, latex: `x=${a}`, color, lineWidth: 1.5, lineOpacity: 0 })
  calc.setExpression({ id: vbId, latex: `x=${b}`, color, lineWidth: 1.5, lineOpacity: 0 })
  registry.set(`area::${id}`, {
    calcIds: [areaId, vaId, vbId],
    funcId,
    fadeProps: { fillOpacity: fillOp, lineOpacity: 1 },
  })
  // Re-add the function curve on top (Desmos draws in list order)
  calc.removeExpression({ id: fn.calcId })
  calc.setExpression({ id: fn.calcId, latex: fn.latex ?? fn.expr, color: fn.color, lineWidth: fn.lineWidth, lineOpacity: 1 })
  await fadeIn(calc, [areaId, vaId, vbId], { fillOpacity: fillOp, lineOpacity: 1 })
  raiseSegments(calc)
}

export async function removeArea(calc, id) {
  const e = registry.get(`area::${id}`)
  if (!e) return
  registry.delete(`area::${id}`)
  await fadeOut(calc, e.calcIds ?? [], e.fadeProps ?? { fillOpacity: 0.4, lineOpacity: 1 })
}

export async function findAndMarkIntersections(calc, id, f1Id, f2Id, opts = {}) {
  const e1 = registry.get(`fn::${f1Id}`)
  const e2 = registry.get(`fn::${f2Id}`)
  if (!e1 || !e2) return []
  // A region is a shaded half-plane, not a curve: it has no y for a given x,
  // so there is nothing here to shade under, cross, root, differentiate or take
  // a tangent to. Bailing keeps a mis-authored step inert instead of placing
  // points at y = true, which is what an inequality evaluates to.
  if (e1.isRegion || e2.isRegion) return []
  const color   = opts.color ? (Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color) : '#60a5fa'
  // Search a generous FIXED range, not the current camera view — the camera
  // is very often narrower than the actual intersection by the time this
  // runs (ensureVisible auto-fits to whatever labels/points exist so far,
  // which can easily exclude an intersection that hasn't been marked yet).
  // Tying the search to _vp meant a perfectly real intersection could sample
  // to nothing just because the view happened to be zoomed somewhere else.
  const searchSpan = Math.max(_vp.right - _vp.left, 60)
  const center      = (_vp.left + _vp.right) / 2
  const pts     = findIntersectionsSampled(e1.expr, e2.expr, center - searchSpan / 2, center + searchSpan / 2)
  const calcIds = pts.map(([x, y], i) => {
    const cId = `int_${id}_${i}`
    calc.setExpression({
      id: cId, latex: `(${x},${y})`, color,
      showLabel: !opts.hideLabel, label: `(${x}, ${y})`, pointSize: 15, pointOpacity: 0,
    })
    return cId
  })
  // Stored so getVisibilityAnchors can pan the camera to actually include
  // these — otherwise a real, correctly-found intersection can sit outside
  // whatever the view happened to be zoomed to, invisible despite existing.
  registry.set(`int::${id}`, { calcIds, f1Id, f2Id, points: pts, fadeProps: { pointOpacity: 1 } })
  await fadeIn(calc, calcIds, { pointOpacity: 1 })
  return pts
}

// Convert common math notation to Desmos LaTeX
// sqrt(x) → \sqrt{x}, a/b → \frac{a}{b}, pi → \pi
// sqrt(...) → \sqrt{...}, matching the CLOSING paren by counting depth rather
// than stopping at the first one — "sqrt(1-(x-2)^2)" (any shifted circle) would
// otherwise cut at the inner ")" and emit garbage.
function sqrtToLatex(s) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    // cbrt gets the same treatment with an index, so the equation panel and the
    // plotter accept the same spelling for the same thing.
    const kind = s.startsWith('sqrt(', i) ? ''
               : s.startsWith('cbrt(', i) ? '[3]'
               : null
    if (kind === null) { out += s[i]; continue }
    let depth = 0, j = i + 4          // j sits on the '('
    for (; j < s.length; j++) {
      if (s[j] === '(') depth++
      else if (s[j] === ')' && --depth === 0) break
    }
    if (j >= s.length) { out += s[i]; continue }   // unbalanced — leave as-is
    out += `\\sqrt${kind}{${sqrtToLatex(s.slice(i + 5, j))}}`
    i = j
  }
  return out
}

// ── Domain restrictions and piecewise ────────────────────────────────────────
// Desmos writes both with ESCAPED braces. "-x\{x<-5\}" is an ordinary curve
// with a domain filter — draw y = -x, but only where x < -5. And
// "\{x<-5:-x,x<=0:1,x^2\}" is a whole piecewise function in one expression:
// condition:value pairs read top to bottom, the first true one wins, and a
// last term with no condition is the "otherwise".
//
// The escaping matters. Plain { } already belong to \frac{}{}, \sqrt{} and
// x^{2}, which are NOT restrictions, so only \{ \} pairs are split off here
// and every other brace is left exactly where it was.
//
// Both forms carry a "<" that says WHERE the curve is drawn, not which
// half-plane is the answer — so everything reasoning about the expression has
// to see past them, or an ordinary curve gets read as an inequality and comes
// out dashed, shaded, and unnamed.
function splitBraceGroups(latex) {
  const groups = []
  let outside = '', cur = '', depth = 0
  const s = String(latex ?? '')
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '{') {
      depth++; i++
      if (depth === 1) { cur = ''; continue }
      cur += '\\{'; continue
    }
    if (s[i] === '\\' && s[i + 1] === '}' && depth > 0) {
      depth--; i++
      if (depth === 0) { groups.push(cur); continue }
      cur += '\\}'; continue
    }
    if (depth > 0) cur += s[i]
    else outside += s[i]
  }
  // An unclosed \{ leaves its text in cur and it is dropped on purpose: the
  // expression is malformed, and Desmos will not draw it either.
  return { outside, groups }
}

// The formula a restricted piece is actually about: "-x\{x<-5\}" → "-x".
// Empty for an all-in-one piecewise, which has no single formula to point at.
export function bareExpr(expr) {
  const { outside, groups } = splitBraceGroups(expr)
  return groups.length ? outside.trim() : String(expr ?? '').trim()
}

// A comparison that is the RELATION ITSELF ("x > -2", "2x - y >= 3") makes
// this a region to shade. One tucked inside \{ \} does not.
function inequalityCompare(latex) {
  return splitBraceGroups(latex).outside.match(/(\\ge|\\le|<|>)/)
}

function toDesmos(expr) {
  if (expr == null) return ''
  let s = String(expr).trim()
  s = sqrtToLatex(s)
  s = s.replace(/\bpi\b/gi, '\\pi')
  // Desmos reads a bare "floor(x)" as f·l·o·o·r times (x) — implicit
  // multiplication of five variables — and draws nothing at all, with no error
  // anywhere. The rounding functions exist for it only as \operatorname{}.
  // floor is the step / greatest-integer function, so this is what makes
  // "a*floor(b*(x-h))+k" a staircase instead of an empty graph.
  //
  // The leading group is what keeps an already-written \operatorname{floor}
  // from being wrapped a second time: inside it, "floor" is preceded by "{".
  s = s.replace(/(^|[^{a-zA-Z\\])(floor|ceil|round|abs)\s*\(/g, '$1\\operatorname{$2}(')
  // Trig is the same story with a different spelling: Desmos knows \sin, not
  // "sin", and reads the bare word as s·i·n multiplied by whatever follows —
  // so "sin(x)" drew nothing at all. The arc- forms come first in the
  // alternation or "arcsin" would match as "arc" followed by \sin.
  s = s.replace(/(^|[^a-zA-Z\\])(arcsin|arccos|arctan|sin|cos|tan)\s*\(/g, '$1\\$2(')
  // >= and <= are two characters in source and one symbol in LaTeX; left as
  // typed, Desmos reads the "=" as a second, broken comparison and plots
  // nothing at all.
  s = s.replace(/>=|\u2265/g, '\\ge').replace(/<=|\u2264/g, '\\le')
  // a/b → \frac{a}{b}  (handles -\sqrt{x}/n, \sqrt{x}/n, -n/m, n/m) — but not
  // when the number is an exponent, or the tail of a longer number: "x^2/9" is
  // (x²)/9, and turning its "2/9" into a fraction drew x^(2/9) instead, so an
  // ellipse written "x^2/9 + y^2/4 = 1" came out as a small star.
  s = s.replace(
    /(?<![\^\d.])(-?(?:\\sqrt\{[^}]+\}|\\pi|\d+(?:\.\d+)?))\/(\d+(?:\.\d+)?)/g,
    (_, num, den) => `\\frac{${num}}{${den}}`
  )
  return s
}

// Convert math expr to unicode string for point labels (no LaTeX needed)
// sqrt(3)/2 → √3/2,  -sqrt(2)/2 → -√2/2,  pi → π
function toUnicodeLabel(expr) {
  return String(expr ?? '')
    .replace(/sqrt\(([^)]+)\)/g, '√$1')
    .replace(/\bpi\b/gi, 'π')
}

// Evaluate a simple math expression to a number (for registry storage)
function evalMathExpr(expr) {
  try {
    const s = String(expr)
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\babs\(/g, 'Math.abs(')
      .replace(/\bfloor\(/g, 'Math.floor(')
      .replace(/\bceil\(/g, 'Math.ceil(')
      .replace(/\bround\(/g, 'Math.round(')
      .replace(/\bsin\(/g, 'Math.sin(')
      .replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(')
      .replace(/\^/g, '**')
    // eslint-disable-next-line no-new-func
    return Function('"use strict"; return (' + s + ')')()
  } catch { return NaN }
}

// A label written as "Vertex|(2, -1)" reads as two lines, same |-separator
// convention as a text box's content — Desmos itself renders a literal "\n"
// inside a label as a real, centered line break.
function formatPointLabel(label) {
  return (label ?? '').split('|').join('\n')
}

export async function addPoint(calc, id, x, y, opts = {}) {
  // Colour priority: the referenced function's colour → explicit colour → the
  // reserved blue. A point given a funcId takes that curve's colour EXACTLY,
  // not a paler version of it: the endpoint dots of a piecewise piece are part
  // of the curve, and a dot in a different shade reads as a different object.
  let color
  if (opts.funcId) {
    const fn = registry.get(`fn::${opts.funcId}`)
    color = fn ? fn.color : '#60a5fa'
  } else if (opts.color) {
    color = Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color
  } else {
    color = '#60a5fa'
  }
  // A hollow dot is how a graph says "this endpoint is NOT part of the curve" —
  // the whole point of the ○/● pair at the joins of a piecewise function. It is
  // a real distinction in the mathematics, not styling, so it is an option on
  // the point rather than something a lesson has to fake with two shapes.
  const pointStyle = opts.open ? 'OPEN' : 'POINT'
  const cId  = `pt_${id}`
  const latX = toDesmos(x)
  const latY = toDesmos(y)
  const numX = evalMathExpr(x)
  const numY = evalMathExpr(y)
  if (!isFinite(numX) || !isFinite(numY)) return

  const calcIds = [cId]

  // A point says ONE thing. Given a label of its own, that label is what it
  // says and the coordinates are dropped: written as well, the same point read
  // "(2, −1)" beside the dot AND "Vertex (2, −1)" off toward the origin — the
  // same value twice, in two places. With no label, the coordinates are what
  // the point is read by, and they are written here.
  if (opts.showCoords && !opts.label) {
    // Coordinate label sits directly on the point with a fixed screen-space
    // orientation (always to its right, tight against the dot) — not offset
    // radially from the origin (only reads sensibly for a trig-circle-style
    // point near the center, scatters badly for a general point far from
    // it), and not via a separately-positioned phantom point either — that
    // stacked with Desmos's own labelOrientation push and ended up far from
    // the dot. A built-in orientation is the verified-reliable, tight option;
    // 'below_right' keeps it beside the dot but drops it clear of the curve,
    // axis or grid line the point usually sits on.
    const xLbl = toUnicodeLabel(x)
    const yLbl = toUnicodeLabel(y)
    calc.setExpression({ id: cId, latex: `(${latX},${latY})`, color,
      showLabel: true, label: `(${xLbl}, ${yLbl})`, labelOrientation: 'below_right',
      pointStyle, pointOpacity: 0 })
  } else {
    // Same fixed screen-space orientation as the coordinate label above.
    // Without it Desmos falls back to its own anti-collision placement, which
    // picks a DIFFERENT side per point — three points labelled 30°/45°/60°
    // ended up with their labels on three different sides. A label must always
    // sit in the same spot relative to its own dot.
    calc.setExpression({
      id: cId, latex: `(${latX},${latY})`, color,
      showLabel: !!opts.label, label: formatPointLabel(opts.label),
      labelOrientation: 'below_right', pointStyle, pointOpacity: 0,
    })
  }

  registry.set(`pt::${id}`, { calcId: cId, calcIds, numX, numY, color, fadeProps: { pointOpacity: 1 } })
  await fadeIn(calc, calcIds, { pointOpacity: 1 })
}

export async function removePoint(calc, id) {
  const e = registry.get(`pt::${id}`)
  if (!e) return
  registry.delete(`pt::${id}`)
  const ids = e.calcIds ?? (e.calcId ? [e.calcId] : [])
  await fadeOut(calc, ids, e.fadeProps ?? { pointOpacity: 1 })
}

// Scatter plot: N points scattered around the line y = slope·x + intercept.
// coeff controls the scatter amount — 0 = every point sits exactly on the
// line, larger values spread points further from it (teaches correlation
// strength). Points are plotted as one literal Desmos point-list expression.
export async function addScatterPlot(calc, id, { slope, intercept, coeff, xMin, xMax, count }, opts = {}) {
  const color = opts.color ? rgbToHex(opts.color) : '#60a5fa'
  const n     = Math.max(2, Math.round(count ?? 20))
  const lo    = Math.min(xMin ?? -5, xMax ?? 5)
  const hi    = Math.max(xMin ?? -5, xMax ?? 5)
  const spread = coeff ?? 1

  const pairs = []
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (let i = 0; i < n; i++) {
    const x = lo + Math.random() * (hi - lo)
    const noise = (Math.random() * 2 - 1) * spread
    const y = slope * x + intercept + noise
    pairs.push(`(${x.toFixed(3)},${y.toFixed(3)})`)
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }

  const cId = `sc_${id}`
  calc.setExpression({
    id: cId, latex: pairs.join(','), color,
    pointSize: 8, pointOpacity: 0,
  })
  registry.set(`sc::${id}`, { calcId: cId, bbox: { minX, maxX, minY, maxY }, fadeProps: { pointOpacity: 1 } })
  await fadeIn(calc, [cId], { pointOpacity: 1 })
}

export async function removeScatterPlot(calc, id) {
  const e = registry.get(`sc::${id}`)
  if (!e) return
  registry.delete(`sc::${id}`)
  await fadeOut(calc, [e.calcId], e.fadeProps ?? { pointOpacity: 1 })
}

// ── Line segment (finite — NOT an infinite line like y=mx+b) ─────────────────
// A vector is this same segment with an arrow head on it, so it is one function
// with an `arrow` option rather than two that drift apart: give it an arrow and
// everything a segment already has comes with it — a stable id, removal, ticks,
// [id]len and the rest of the value references, the midpoint a comment anchors
// to, and its place above the curves. opts.arrow is 'end' (a vector), 'both' (a
// measured distance) or absent.
export async function addSegment(calc, id, x1, y1, x2, y2, opts = {}) {
  const color = opts.color ? (Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color) : '#60a5fa'
  const lw    = opts.thickness ?? 3
  const cId   = `seg_${id}`
  const arrow = opts.arrow === true ? 'end' : opts.arrow

  // A name — u, AB, u_1 — written beside the middle, in the segment's colour. A
  // vector's name wears its arrow. Desmos sets a label in LaTeX when it sits
  // between backticks, and \vec sets ONE arrow over the whole name (\overrightarrow
  // comes out as a line with a separate head); a combining
  // arrow character covers one letter at most, and the label font has no glyph
  // for it anyway.
  const name     = String(opts.name ?? '').trim()
  const nameId   = `seg_name_${id}`
  const nameText = !name ? '' : arrow === 'end' ? `\`\\vec{${name}}\`` : name
  // Desmos draws a label at its point's opacity: at 0.6 the name came out paler
  // than the arrow it names.
  const NAME_OP  = 1
  const prevSeg  = registry.get(`seg::${id}`)
  // Only a name that was not there before arrives with a fade. One that was
  // there is just rewritten: same id, new name, and nothing leaves the screen.
  const nameIsNew = !!nameText && !(prevSeg?.calcIds ?? []).includes(nameId)
  const placeName = (ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    // Beside the middle, on the side AWAY from the corner (bx, ay) that the
    // vector's Δx and Δy components use — a name and a component label never
    // land on each other. Left of the direction of travel, unless that is
    // where the corner is.
    let nx = -dy / len, ny = dx / len
    if (dx * dy < 0) { nx = -nx; ny = -ny }
    const off = (Math.abs(_vp.top - _vp.bottom) || 10) * 0.02
    const px  = (ax + bx) / 2 + nx * off
    const py  = (ay + by) / 2 + ny * off
    const deg = Math.atan2(ny, nx) * 180 / Math.PI
    const orient = ['right', 'above_right', 'above', 'above_left', 'left', 'below_left', 'below', 'below_right'][((Math.round(deg / 45) % 8) + 8) % 8]
    return { latex: `(${+px.toFixed(6)},${+py.toFixed(6)})`, orient }
  }

  // Draw the whole thing — shaft and head — at one pair of endpoints. Written
  // as a function of the endpoints so the move below can call it every frame
  // and have the arrow head recomputed with the shaft, instead of a head left
  // pointing where the vector used to go.
  //
  // The head is two short segments off the tip rather than a filled triangle:
  // Desmos has no filled polygon that holds its shape through a zoom, and two
  // lines at a fixed fraction of the shaft stay in proportion however far the
  // camera is pulled back. Its size is capped so a long vector does not end in
  // an enormous head.
  const draw = (ax, ay, bx, by, lineOpacity) => {
    const ids = [cId]
    calc.setExpression({ id: cId, latex: makeSegment(ax, ay, bx, by), color, lineWidth: lw, lineOpacity })
    if (nameText) {
      // Desmos draws no label on a fully transparent point, so the one-pixel
      // point under the name is only ever at 0 while the name is fading in.
      const { latex, orient } = placeName(ax, ay, bx, by)
      calc.setExpression({
        // Large, like the other labels that name something on the graph: at the
        // default size a one-letter name under its arrow was a speck.
        id: nameId, latex, color, showLabel: true, label: nameText, labelOrientation: orient, labelSize: 'large',
        pointSize: 1, pointOpacity: lineOpacity > 0 && !nameIsNew ? NAME_OP : 0,
      })
      ids.push(nameId)
    }
    if (!arrow) return ids
    const dx = bx - ax, dy = by - ay
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1e-9) return ids
    const ux = dx / len, uy = dy / len
    const HEAD = Math.min(len * 0.15, 0.45)
    const WING = HEAD * 0.62
    const px = -uy, py = ux
    const tip = (tx, ty, sx, sy, tag) => {
      // sx,sy points back along the shaft from this tip.
      const w1x = tx + HEAD * sx + WING * px, w1y = ty + HEAD * sy + WING * py
      const w2x = tx + HEAD * sx - WING * px, w2y = ty + HEAD * sy - WING * py
      for (const [n, wx, wy] of [[1, w1x, w1y], [2, w2x, w2y]]) {
        const wid = `seg_${tag}${n}_${id}`
        calc.setExpression({ id: wid, latex: makeSegment(tx, ty, wx, wy), color, lineWidth: lw, lineOpacity })
        ids.push(wid)
      }
    }
    tip(bx, by, -ux, -uy, 'a')
    if (arrow === 'both') tip(ax, ay, ux, uy, 'b')
    return ids
  }

  const prev = prevSeg
  let ids
  if (prev) {
    // Re-using an id means this is the SAME segment being changed, not a new
    // one replacing it — so it MOVES. Fading the old one out and the new one in
    // says "forget that, here is another"; sliding the endpoints says "this one
    // got longer", which is the thing a lesson is usually demonstrating.
    await new Promise(resolve => {
      const t0 = performance.now()
      ;(function tick() {
        const t = Math.min((performance.now() - t0) / animMs(MOVE_MS), 1)
        const e = easeIO(t)
        const at = (a, b) => a + (b - a) * e
        ids = draw(at(prev.x1, x1), at(prev.y1, y1), at(prev.x2, x2), at(prev.y2, y2), 1)
        if (t < 1) requestAnimationFrame(tick)
        else resolve()
      })()
    })
    // An arrow that was there and is not any more leaves its wings behind,
    // because nothing in this pass rewrote them.
    for (const old of prev.calcIds ?? [prev.calcId]) {
      if (!ids.includes(old)) calc.removeExpression({ id: old })
    }
  } else {
    ids = draw(x1, y1, x2, y2, 0)
    await fadeIn(calc, ids, { lineOpacity: 1 })
  }
  if (nameIsNew) await fadeIn(calc, [nameId], { pointOpacity: NAME_OP })

  registry.set(`seg::${id}`, { x1, y1, x2, y2, color, calcId: cId, calcIds: ids, fadeProps: { lineOpacity: 1, pointOpacity: NAME_OP } })
}

export async function removeSegment(calc, id) {
  const e = registry.get(`seg::${id}`)
  if (!e) return
  registry.delete(`seg::${id}`)
  await fadeOut(calc, e.calcIds ?? [e.calcId], e.fadeProps ?? { lineOpacity: 1 })
}

// An "on curve" anchor may name a SEGMENT rather than a plotted function, in
// which case it lands on the MIDPOINT — the same point showSegmentTick marks —
// in both x and y. The x argument is ignored on purpose: anchoring a segment by
// x is meaningless on a vertical one, and on any other the field's default of 1
// would silently drag the comment to an end of the segment instead of the
// middle. Returns null when the id is not a segment, which is how callers tell
// the two kinds of target apart.
export function segmentAnchor(id) {
  const seg = registry.get(`seg::${id}`)
  if (!seg) return null
  const { x1, y1, x2, y2 } = seg
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
}

// Congruent-side tick mark(s) at a segment's midpoint — same notation as the
// geometry-canvas version, but computed from a segment added via addSegment.
export async function showSegmentTick(calc, id, ticksRaw, colorRaw) {
  const seg = registry.get(`seg::${id}`)
  if (!seg) return
  const { x1, y1, x2, y2 } = seg
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / len, uy = dy / len
  const nx = -uy, ny = ux

  const ticks   = Math.max(1, Math.min(3, Math.round(ticksRaw ?? 1)))
  const tickLen = Math.min(len * 0.25, 0.6)
  const spacing = tickLen * 0.9
  const color   = colorRaw ? rgbToHex(colorRaw) : '#60a5fa'
  const calcIds = []

  for (let k = 0; k < ticks; k++) {
    const off = (k - (ticks - 1) / 2) * spacing
    const cx = mx + ux * off, cy = my + uy * off
    const ax = cx - nx * tickLen / 2, ay = cy - ny * tickLen / 2
    const bx = cx + nx * tickLen / 2, by = cy + ny * tickLen / 2
    const tid = `segtick_${id}_${k}`
    calc.setExpression({ id: tid, latex: makeSegment(ax, ay, bx, by), color, lineWidth: 3, lineOpacity: 0 })
    calcIds.push(tid)
  }
  registry.set(`segtick::${id}`, { calcIds, fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, calcIds, { lineOpacity: 1 })
}

export async function removeSegmentTick(calc, id) {
  const e = registry.get(`segtick::${id}`)
  if (!e) return
  registry.delete(`segtick::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { lineOpacity: 1 })
}

// Points de partage — mark the (parts-1) points that split a segment into
// "parts" equal sections, optionally labeled P1, P2, …
export async function divideSegmentGraph(calc, id, partsRaw, colorRaw, showLabelsRaw) {
  const seg = registry.get(`seg::${id}`)
  if (!seg) return
  const { x1, y1, x2, y2 } = seg
  const parts      = Math.max(2, Math.round(partsRaw ?? 2))
  const showLabels = showLabelsRaw === true || String(showLabelsRaw).trim() === 'true'
  const color      = colorRaw ? rgbToHex(colorRaw) : '#60a5fa'
  const calcIds    = []

  for (let k = 1; k < parts; k++) {
    const t  = k / parts
    const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t
    const pid = `segdiv_${id}_${k}`
    calc.setExpression({
      id: pid, latex: `(${px.toFixed(6)},${py.toFixed(6)})`, color,
      showLabel: showLabels, label: showLabels ? `P${k}` : '', pointOpacity: 0,
    })
    calcIds.push(pid)
  }
  registry.set(`segdiv::${id}`, { calcIds, fadeProps: { pointOpacity: 1 } })
  await fadeIn(calc, calcIds, { pointOpacity: 1 })
}

export async function removeDivideSegmentGraph(calc, id) {
  const e = registry.get(`segdiv::${id}`)
  if (!e) return
  registry.delete(`segdiv::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { pointOpacity: 1 })
}

export async function addVerticalLine(calc, id, xVal, opts = {}) {
  const color = opts.color ? rgbToHex(opts.color) : '#60a5fa'
  const cId   = `vl_${id}`
  calc.setExpression({ id: cId, latex: `x=${xVal}`, color, lineWidth: 2, lineOpacity: 0 })
  registry.set(`vl::${id}`, { calcId: cId, fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, [cId], { lineOpacity: 1 })
}

export async function addHorizontalLine(calc, id, y, opts = {}) {
  const color = opts.color ? rgbToHex(opts.color) : '#60a5fa'
  const cId   = `hl_${id}`
  const expr  = { id: cId, latex: `y=${y}`, color, lineWidth: opts.thickness ?? 2, lineOpacity: 0 }
  if (opts.dashed) expr.lineStyle = 'DASHED'
  calc.setExpression(expr)
  registry.set(`hl::${id}`, { calcId: cId, fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, [cId], { lineOpacity: 1 })
}

export async function removeHorizontalLine(calc, id) {
  const e = registry.get(`hl::${id}`)
  if (!e) return
  registry.delete(`hl::${id}`)
  await fadeOut(calc, [e.calcId], e.fadeProps ?? { lineOpacity: 1 })
}

// ── Characteristic elements of a conic ───────────────────────────────────────
// The vertices, foci, centre, directrix, asymptotes and axes of a curve already
// plotted — computed from the curve itself, so a lesson never types a focus it
// could get wrong. The relation is sampled and fitted to
// Ax² + Bxy + Cy² + Dx + Ey + F = 0: it is recognised whatever form it was
// written in ("y = 2(x-1)^2 + 3", "(x-2)^2/9 + (y+1)^2/4 = 1",
// "4x^2 + 9y^2 - 16x = 20", "xy = 4") and wherever it sits, tilted or not.
// Every point drawn is a real graph point: its coordinates are [id]x / [id]y
// like any other, so a comment or an equation points at the focus without
// working it out again.

const CONIC_FIT = [-2.37, -1.13, 0.41, 1.73, 2.91].flatMap(x => [-2.11, -0.53, 0.87, 2.29].map(y => [x, y]))
const CONIC_CHECK = [[-3.3, 1.4], [2.6, -2.9], [0.2, 3.7], [-1.8, -3.1], [4.1, 0.9], [-0.6, 0.15], [3.3, 3.3], [-4.2, -0.4]]

// A number as Desmos reads it: fixed-point, never "1e-7".
function conicNum(v) {
  let s = (Math.abs(v) < 5e-9 ? 0 : v).toFixed(8)
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s === '-0' ? '0' : s
}

// A number as a reader sees it in a label: two decimals at most, a real minus.
function conicShow(v) {
  const r = Math.round(v * 100) / 100
  return String(Math.abs(r) < 0.005 ? 0 : r).replace('-', '−')
}

function solveLinear(M, b) {
  const n = b.length
  const A = M.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r
    if (Math.abs(A[piv][col]) < 1e-12) return null
    ;[A[col], A[piv]] = [A[piv], A[col]]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = A[r][col] / A[col][col]
      for (let c = col; c <= n; c++) A[r][c] -= f * A[col][c]
    }
  }
  return A.map((row, i) => row[n] / row[i])
}

// [A, B, C, D, E, F], scaled so the largest square term is 1 — or null when the
// relation is not a curve of degree two in x and y.
function conicCoefficients(expr) {
  const src = bareExpr(expr)
  if (!src || /[<>]|\\le|\\ge/.test(src)) return null
  const eq = src.indexOf('=')
  let lhs = eq >= 0 ? src.slice(0, eq).trim() : 'y'
  const rhs = eq >= 0 ? src.slice(eq + 1).trim() : src
  if (/^[a-zA-Z]\w*\(\s*x\s*\)$/.test(lhs)) lhs = 'y'
  // "xy" and "x(y+1)" are products here, not a name and a call.
  const prep = s => s.replace(/(?<![a-zA-Z])([xy])(?=[xy(])/g, '$1*')
  let left, right
  try {
    left  = parse(prep(lhs)).compile()
    right = parse(prep(rhs)).compile()
  } catch { return null }
  const scope = Object.fromEntries([...sliders].map(([name, s]) => [name, s.value]))
  const g = (x, y) => {
    try {
      const v = Number(left.evaluate({ ...scope, x, y })) - Number(right.evaluate({ ...scope, x, y }))
      return Number.isFinite(v) ? v : NaN
    } catch { return NaN }
  }
  const mono = (x, y) => [x * x, x * y, y * y, x, y, 1]
  const N = Array.from({ length: 6 }, () => new Array(6).fill(0))
  const r = new Array(6).fill(0)
  for (const [x, y] of CONIC_FIT) {
    const v = g(x, y)
    if (!Number.isFinite(v)) return null
    const m = mono(x, y)
    for (let i = 0; i < 6; i++) {
      r[i] += m[i] * v
      for (let j = 0; j < 6; j++) N[i][j] += m[i] * m[j]
    }
  }
  const coef = solveLinear(N, r)
  if (!coef) return null
  // A conic, not something merely close to one: the fit has to give the
  // relation back exactly at points it never saw.
  for (const [x, y] of CONIC_CHECK) {
    const v = g(x, y)
    const fit = mono(x, y).reduce((s, mi, i) => s + mi * coef[i], 0)
    if (!Number.isFinite(v) || Math.abs(v - fit) > 1e-6 * Math.max(1, Math.abs(v))) return null
  }
  const scale = Math.max(Math.abs(coef[0]), Math.abs(coef[1]), Math.abs(coef[2]))
  if (scale < 1e-9 * Math.max(1, ...coef.slice(3).map(Math.abs))) return null
  return coef.map(c => { const v = c / scale; return Math.abs(v) < 1e-10 ? 0 : v })
}

// What the conic is and where its parts are, from its coefficients: turned to
// its own axes (the angle that removes the xy term), then completed squares.
function describeConic([A, B, C, D, E, F]) {
  const th = 0.5 * Math.atan2(B, A - C)
  const cs = Math.cos(th), sn = Math.sin(th)
  const u = [cs, sn], v = [-sn, cs]
  const l1 = A * cs * cs + B * sn * cs + C * sn * sn
  const l2 = A * sn * sn - B * sn * cs + C * cs * cs
  const d1 = D * cs + E * sn
  const d2 = -D * sn + E * cs
  const EPS = 1e-7
  if (Math.abs(l1) > EPS && Math.abs(l2) > EPS) {
    const s0 = -d1 / (2 * l1), t0 = -d2 / (2 * l2)
    const F0 = F - l1 * s0 * s0 - l2 * t0 * t0
    if (Math.abs(F0) < 1e-9 * Math.max(1, Math.abs(F))) return null   // a point, or two crossing lines
    const q1 = -F0 / l1, q2 = -F0 / l2
    if (q1 < 0 && q2 < 0) return null                                 // no real point at all
    const centre = [s0 * u[0] + t0 * v[0], s0 * u[1] + t0 * v[1]]
    if (q1 > 0 && q2 > 0) {
      const [aa, bb, main, minor] = q1 >= q2 ? [q1, q2, u, v] : [q2, q1, v, u]
      const circle = Math.abs(aa - bb) < 1e-7 * aa
      return { type: circle ? 'circle' : 'ellipse', centre, main, minor,
        a: Math.sqrt(aa), b: Math.sqrt(bb), c: circle ? 0 : Math.sqrt(aa - bb) }
    }
    const [aa, bb, main, minor] = q1 > 0 ? [q1, -q2, u, v] : [q2, -q1, v, u]
    return { type: 'hyperbola', centre, main, minor, a: Math.sqrt(aa), b: Math.sqrt(bb), c: Math.sqrt(aa + bb) }
  }
  // No square along one direction: a parabola, whose axis runs along it.
  const [lam, dw, w, dz, z] = Math.abs(l1) > EPS ? [l1, d1, u, d2, v] : [l2, d2, v, d1, u]
  if (Math.abs(dz) < EPS) return null                                // two parallel lines
  const s0 = -dw / (2 * lam)
  const t0 = (lam * s0 * s0 - F) / dz
  return { type: 'parabola', vertex: [s0 * w[0] + t0 * z[0], s0 * w[1] + t0 * z[1]], axis: z, across: w,
    f: -dz / (4 * lam) }                                              // vertex → focus, along the axis
}

// Which parts to draw: the ones named ("foyers, directrice", "vertices") in any
// of the lesson languages, or the ones a figure of that conic usually shows.
function conicShowSet(raw, type) {
  const words = String(raw ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[,;|]/).map(s => s.trim()).filter(Boolean)
  if (!words.length) {
    return new Set({
      parabola:  ['vertices', 'foci', 'directrix', 'axes'],
      ellipse:   ['centre', 'vertices', 'foci'],
      circle:    ['centre'],
      hyperbola: ['centre', 'vertices', 'foci', 'asymptotes'],
    }[type])
  }
  const set = new Set()
  for (const w of words) {
    if (/^(all|tou|tod|alle)/.test(w)) ['centre', 'vertices', 'foci', 'directrix', 'asymptotes', 'axes'].forEach(k => set.add(k))
    else if (/^(vert|som|sch)/.test(w)) set.add('vertices')
    else if (/^(foc|foy|bren)/.test(w)) set.add('foci')
    else if (/^(cent|mitt)/.test(w))    set.add('centre')
    else if (/^(dir|leit)/.test(w))     set.add('directrix')
    else if (/^(asy|asi)/.test(w))      set.add('asymptotes')
    else if (/^(ax|eje|ach)/.test(w))   set.add('axes')
  }
  return set
}

// The side a label sits on, from the direction it should lean: one of the
// eight Desmos orientations.
function conicLabelSide([dx, dy]) {
  if (Math.hypot(dx, dy) < 1e-9) return 'below_left'
  const sides = ['right', 'above_right', 'above', 'above_left', 'left', 'below_left', 'below', 'below_right']
  return sides[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8]
}

function conicLineLatex([px, py], [dx, dy]) {
  if (Math.abs(dx) < 1e-9) return `x=${conicNum(px)}`
  const m = dy / dx
  const q = conicNum(py - m * px)
  return `y=${conicNum(m)}x${q.startsWith('-') ? '' : '+'}${q}`
}

function conicLineLabel([px, py], [dx, dy]) {
  if (Math.abs(dx) < 1e-9) return `x = ${conicShow(px)}`
  const m = dy / dx, q = py - m * px
  if (Math.abs(m) < 1e-9) return `y = ${conicShow(q)}`
  const mr = Math.round(m * 100) / 100
  const mt = mr === 1 ? '' : mr === -1 ? '−' : conicShow(mr)
  const qr = Math.round(q * 100) / 100
  return `y = ${mt}x` + (Math.abs(qr) < 0.005 ? '' : qr > 0 ? ` + ${conicShow(qr)}` : ` − ${conicShow(-qr)}`)
}

// How much of the plane a figure of this conic needs: its points and enough of
// the curve around them to read its shape (a hyperbola's branches beyond the
// foci, a parabola opening out past its focus).
function conicExtent(shape) {
  const at = (P, k, dir) => [P[0] + k * dir[0], P[1] + k * dir[1]]
  const pts = []
  if (shape.type === 'parabola') {
    const { vertex: V, axis, across, f } = shape
    const r = Math.max(Math.abs(f), 0.25)
    const open = f >= 0 ? axis : [-axis[0], -axis[1]]
    pts.push(V, at(V, f, axis), at(V, -f, axis))
    for (const s of [-1, 1]) pts.push(at(at(V, 4 * r, open), s * 4 * r, across))
  } else {
    const { centre: O, main: m, minor: n, a, b, c, type } = shape
    const ka = type === 'hyperbola' ? Math.max(2 * a, c + a) : a
    const kb = type === 'hyperbola' ? 2 * b : b
    for (const s of [-1, 1]) for (const t of [-1, 1]) pts.push(at(at(O, s * ka, m), t * kb, n))
  }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) }
}

// The places along a line where its equation may be written: where it was
// meant to go first, then spread over the part of the line inside the view.
function conicLineSpots({ P, d, anchor }, vp) {
  const L = vp.left, R = vp.right
  const Bo = Math.min(vp.bottom, vp.top), T = Math.max(vp.bottom, vp.top)
  const padX = (R - L) * 0.08, padY = (T - Bo) * 0.08
  let lo = -Infinity, hi = Infinity
  for (const [p, dd, a, b] of [[P[0], d[0], L + padX, R - padX], [P[1], d[1], Bo + padY, T - padY]]) {
    if (Math.abs(dd) < 1e-12) { if (p < a || p > b) return [anchor]; continue }
    const s1 = (a - p) / dd, s2 = (b - p) / dd
    lo = Math.max(lo, Math.min(s1, s2))
    hi = Math.min(hi, Math.max(s1, s2))
  }
  if (!(hi > lo)) return [anchor]
  return [anchor, ...[0.15, 0.3, 0.5, 0.7, 0.85].map(t => [P[0] + (lo + (hi - lo) * t) * d[0], P[1] + (lo + (hi - lo) * t) * d[1]])]
}

const CONIC_SIDES = {
  right: [1, 0], above_right: [1, 1], above: [0, 1], above_left: [-1, 1],
  left: [-1, 0], below_left: [-1, -1], below: [0, -1], below_right: [1, -1],
}

// Where the labels of a conic's elements go. A label is a fixed size on
// screen, so this works in pixels at the current view: each label tries the
// eight sides of its point, starting from the one it leans toward, and takes
// the first that stays clear of the curve, of the lines drawn with it, of the
// other points, of the labels already placed (the curve's own name included)
// and of the edge of the graph — or, when none is entirely clear, the least
// crowded of them.
function conicLabelPlacer(calc, [A, B, C, D, E, F], dots, lines) {
  const { px, py } = pixelsPerUnit(calc)
  const vp = getViewport()
  const g = (x, y) => A * x * x + B * x * y + C * y * y + D * x + E * y + F
  // A little larger than the text Desmos draws, and as close to its point as
  // Desmos puts it: labels that only touch read as one run-on line.
  const H = 20, GAP = 4
  const boxAt = ([x, y], text, side) => {
    const W = String(text).length * 7.5 + 12
    const [sx, sy] = CONIC_SIDES[side]
    const lean = sx && sy ? 0.7 : 1
    const cx = x + sx * (GAP * lean + W / 2) / px
    const cy = y + sy * (GAP * lean + H / 2) / py
    return { x0: cx - W / 2 / px, x1: cx + W / 2 / px, y0: cy - H / 2 / py, y1: cy + H / 2 / py }
  }
  const placed = []
  for (const e of registry.values()) {
    if (e.label && CONIC_SIDES[e.orientation] && Number.isFinite(e.x) && Number.isFinite(e.y)) {
      placed.push(boxAt([e.x, e.y], e.label, e.orientation))
    }
  }
  const crossesCurve = b => {
    let below = false, above = false
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 2; j++) {
      const v = g(b.x0 + (b.x1 - b.x0) * i / 4, b.y0 + (b.y1 - b.y0) * j / 2)
      if (v < 0) below = true
      else if (v > 0) above = true
      if (below && above) return true
    }
    return false
  }
  const crossesLine = (b, { P, d }) => {
    let below = false, above = false
    for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
      const s = d[0] * (y - P[1]) - d[1] * (x - P[0])
      if (s < 0) below = true
      else if (s > 0) above = true
    }
    return below && above
  }
  const overlapPx = (a, b) =>
    Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * px *
    Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)) * py

  const evaluate = (spots, text, lean, own) => {
    const want = Math.atan2(lean[1], lean[0])
    const off = side => {
      const [sx, sy] = CONIC_SIDES[side]
      const dd = Math.abs(Math.atan2(sy, sx) - want) % (2 * Math.PI)
      return dd > Math.PI ? 2 * Math.PI - dd : dd
    }
    const sides = Object.keys(CONIC_SIDES).sort((s1, s2) => off(s1) - off(s2))
    let best = null
    for (const P of spots) sides.forEach((side, rank) => {
      const b = boxAt(P, text, side)
      // What makes a label unreadable — the curve through it, a point under it,
      // text over text, the edge of the graph — is counted apart from what only
      // makes it a little worse: a dashed line under it, a side it did not lean
      // to, a slide along its line away from where it was meant to sit.
      let hard = 0
      if (crossesCurve(b)) hard += 500
      for (const q of dots) {
        if (q === own) continue
        if (q[0] >= b.x0 - 3 / px && q[0] <= b.x1 + 3 / px && q[1] >= b.y0 - 3 / py && q[1] <= b.y1 + 3 / py) hard += 400
      }
      for (const o of placed) hard += 3 * overlapPx(b, o)
      if (b.x0 < vp.left || b.x1 > vp.right || b.y0 < Math.min(vp.bottom, vp.top) || b.y1 > Math.max(vp.bottom, vp.top)) hard += 400
      let cost = hard + rank * 6 + Math.hypot((P[0] - spots[0][0]) * px, (P[1] - spots[0][1]) * py) / 12
      for (const l of lines) if (crossesLine(b, l)) cost += 150
      if (!best || cost < best.cost) best = { side, at: P, b, cost, hard }
    })
    return best
  }
  return { evaluate, commit: best => { placed.push(best.b); return best } }
}

export async function showConicElements(calc, id, funcId, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) throw new Error(`Conic elements: no curve "${funcId}" is plotted`)
  const coef  = conicCoefficients(fn.expr)
  const shape = coef && describeConic(coef)
  if (!shape) throw new Error(`Conic elements: "${fn.expr}" is not a parabola, an ellipse, a circle or a hyperbola`)

  const color  = opts.color ? (Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color) : '#60a5fa'
  const labels = ['names', 'coords', 'none'].includes(opts.labels) ? opts.labels : 'both'
  const wanted = conicShowSet(opts.show, shape.type)
  const nameOf = { vertex: opts.names?.vertex || 'V', focus: opts.names?.focus || 'F', centre: opts.names?.centre || 'C' }
  const SUB = ['', '₁', '₂', '₃', '₄']
  const at  = (P, k, dir) => [P[0] + k * dir[0], P[1] + k * dir[1]]
  const neg = dir => [-dir[0], -dir[1]]
  // A direction turned to point up — or right, when it lies flat — so "above"
  // and "the far side" mean the same whichever way the conic is turned.
  const up    = dir => (dir[1] > 1e-9 || (Math.abs(dir[1]) <= 1e-9 && dir[0] > 0)) ? dir : neg(dir)
  const right = dir => (dir[0] > 1e-9 || (Math.abs(dir[0]) <= 1e-9 && dir[1] > 0)) ? dir : neg(dir)

  const points = []   // { code, kind, name, P, side }
  const lines  = []   // { code, kind, P, d, anchor, side } — a line through P along d, its equation written at anchor
  let numbers
  if (shape.type === 'parabola') {
    const { vertex: V, axis, across, f } = shape
    const open  = f >= 0 ? axis : neg(axis)          // the way it opens
    const aside = right(across)
    const reach = Math.abs(f)
    const foot  = at(V, -f, axis)                      // where the axis meets the directrix
    numbers = { h: V[0], k: V[1], c: reach, p: 2 * reach, e: 1 }
    points.push({ code: 'V', kind: 'vertices', name: nameOf.vertex, P: V, side: at(neg(open), 0.9, aside) })
    points.push({ code: 'F', kind: 'foci', name: nameOf.focus, P: at(V, f, axis), side: aside })
    lines.push({ code: 'D', kind: 'directrix', P: foot, d: across, anchor: at(foot, Math.max(2.5, 3 * reach), aside), side: neg(open) })
    lines.push({ code: 'AX', kind: 'axes', P: V, d: axis, anchor: at(V, Math.max(3, 5 * reach), open), side: aside })
  } else {
    const { centre: O, a, b, c, type } = shape
    const m = right(shape.main), n = up(shape.minor)
    numbers = { h: O[0], k: O[1], a, b, c, e: c / a, ...(type === 'circle' ? { r: a } : {}) }
    // Where each label leans before the placer looks for room: an ellipse's
    // vertices outward, a hyperbola's inward between its branches, and the foci
    // below the axis, apart from the vertices above it.
    const hyper = type === 'hyperbola'
    points.push({ code: 'C', kind: 'centre', name: nameOf.centre, P: O, side: hyper ? neg(n) : at(neg(m), 0.9, n) })
    if (type !== 'circle') {
      points.push({ code: 'V1', kind: 'vertices', name: nameOf.vertex + SUB[1], P: at(O, -a, m), side: at(hyper ? m : neg(m), 0.9, n) })
      points.push({ code: 'V2', kind: 'vertices', name: nameOf.vertex + SUB[2], P: at(O, a, m), side: at(hyper ? neg(m) : m, 0.9, n) })
      if (type === 'ellipse') {
        points.push({ code: 'V3', kind: 'vertices', name: nameOf.vertex + SUB[3], P: at(O, -b, n), side: at(neg(n), 0.9, m) })
        points.push({ code: 'V4', kind: 'vertices', name: nameOf.vertex + SUB[4], P: at(O, b, n), side: at(n, 0.9, m) })
      }
      points.push({ code: 'F1', kind: 'foci', name: nameOf.focus + SUB[1], P: at(O, -c, m), side: hyper ? at(neg(m), 0.9, neg(n)) : neg(n) })
      points.push({ code: 'F2', kind: 'foci', name: nameOf.focus + SUB[2], P: at(O, c, m), side: hyper ? at(m, 0.9, neg(n)) : neg(n) })
      const dd = (a * a) / c
      lines.push({ code: 'D1', kind: 'directrix', P: at(O, -dd, m), d: n, anchor: at(at(O, -dd, m), 0.9 * b, n), side: neg(m) })
      lines.push({ code: 'D2', kind: 'directrix', P: at(O, dd, m), d: n, anchor: at(at(O, dd, m), 0.9 * b, n), side: m })
      if (type === 'hyperbola') {
        for (const [code, s] of [['A1', 1], ['A2', -1]]) {
          const raw = [a * m[0] + s * b * n[0], a * m[1] + s * b * n[1]]
          const len = Math.hypot(raw[0], raw[1])
          const dir = up([raw[0] / len, raw[1] / len])
          // Written on the side the branches are not: toward the conjugate axis.
          const nrm  = [-dir[1], dir[0]]
          const away = (nrm[0] * n[0] + nrm[1] * n[1]) * (dir[0] * n[0] + dir[1] * n[1]) >= 0 ? nrm : neg(nrm)
          lines.push({ code, kind: 'asymptotes', P: O, d: dir, anchor: at(O, 1.6 * c, dir), side: away })
        }
      }
      lines.push({ code: 'AX1', kind: 'axes', P: O, d: m, anchor: at(O, type === 'ellipse' ? 1.35 * a : 1.25 * c, m), side: n })
      lines.push({ code: 'AX2', kind: 'axes', P: O, d: n, anchor: at(O, (type === 'ellipse' ? 1.35 : 1.5) * b, n), side: m })
    }
  }

  const old = new Map([...registry.entries()].filter(([, e]) => e.conic === id))
  registry.set(`con::${id}`, { conic: id, funcId, type: shape.type, ...numbers, calcIds: [], fadeProps: { pointOpacity: 1 } })
  old.delete(`con::${id}`)

  // The view makes room for every point first, so the labels are placed at the
  // scale the reader will actually see them.
  const shownPoints = points.filter(el => wanted.has(el.kind))
  const shownLines  = lines.filter(el => wanted.has(el.kind))
  for (const el of shownPoints) {
    const coords = `(${conicShow(el.P[0])}, ${conicShow(el.P[1])})`
    el.label = labels === 'none' ? '' : labels === 'names' ? el.name : labels === 'coords' ? coords : `${el.name}${coords}`
    registry.set(`pt::${id}${el.code}`, { conic: id, funcId, numX: el.P[0], numY: el.P[1] })
  }
  // A conic drawn small in a wide view leaves its labels no room — a vertex and
  // a focus half a unit apart end up fifteen pixels apart. Unless the lesson
  // framed the page itself, the view closes in on the conic first.
  if (!_vpByLesson) {
    const ext = conicExtent(shape)
    const cx = (ext.left + ext.right) / 2, cy = (ext.bottom + ext.top) / 2
    const w = Math.max((ext.right - ext.left) * 1.45, 4), h = Math.max((ext.top - ext.bottom) * 1.45, 4)
    const target = squareBounds(calc, { left: cx - w / 2, right: cx + w / 2, bottom: cy - h / 2, top: cy + h / 2 })
    // A narrow panel (text beside the graph) is limited by its width, where a
    // conic filling half of it is still cramped — so the bar is two thirds.
    if (target.right - target.left < (_vp.right - _vp.left) * 0.65) {
      const from = { ..._vp }
      _vp = target
      await animateViewport(calc, from, _vp)
    }
  }
  await ensureVisible(calc)
  const placer = conicLabelPlacer(calc, coef, shownPoints.map(el => el.P), shownLines)
  for (const el of shownPoints) {
    if (!el.label) { el.orient = conicLabelSide(el.side); continue }
    let best = placer.evaluate([el.P], el.label, el.side, el.P)
    // Nowhere clear for the name and its coordinates — points crowded close on
    // the screen, a vertex just beside a focus: the name alone, rather than
    // text over text or over the curve. The coordinates are still [idF]x/[idF]y.
    if (best.hard >= 250 && labels === 'both') {
      const short = placer.evaluate([el.P], el.name, el.side, el.P)
      if (short.cost < best.cost) { best = short; el.label = el.name }
    }
    el.orient = placer.commit(best).side
  }
  for (const el of shownLines) {
    el.text = conicLineLabel(el.P, el.d)
    if (labels === 'none') { el.orient = conicLabelSide(el.side); continue }
    const spot = placer.commit(placer.evaluate(conicLineSpots(el, getViewport()), el.text, el.side, null))
    el.orient = spot.side
    el.anchor = spot.at
  }

  // Shown again under the same id (another list, another colour): what is
  // already on the graph changes in place, and only what is new fades in.
  const risingPoints = [], risingLines = []
  const put = (key, entry, expr, rising, prop) => {
    const again = old.has(key)
    old.delete(key)
    calc.setExpression({ ...expr, [prop]: again ? 1 : 0 })
    registry.set(key, { conic: id, funcId, ...entry })
    if (!again) rising.push(expr.id)
  }
  for (const el of shownPoints) {
    const cId = `con_${id}_${el.code}`
    // A real point: [idF]x, a projection, the view keeping it in frame.
    put(`pt::${id}${el.code}`,
      { calcId: cId, calcIds: [cId], numX: el.P[0], numY: el.P[1], color, fadeProps: { pointOpacity: 1 } },
      { id: cId, latex: `(${conicNum(el.P[0])},${conicNum(el.P[1])})`, color, showLabel: !!el.label, label: el.label,
        labelOrientation: el.orient, pointStyle: 'POINT' },
      risingPoints, 'pointOpacity')
  }
  for (const el of shownLines) {
    const lId = `conl_${id}_${el.code}`
    put(`conl::${id}${el.code}`,
      { calcIds: [lId], fadeProps: { lineOpacity: 1 } },
      { id: lId, latex: conicLineLatex(el.P, el.d), color, lineWidth: 2, lineStyle: el.kind === 'axes' ? 'DOTTED' : 'DASHED' },
      risingLines, 'lineOpacity')
    if (labels === 'none') continue
    // Its equation, written beside it where the placer found room.
    const tId = `conlab_${id}_${el.code}`
    put(`conlab::${id}${el.code}`,
      { calcIds: [tId], fadeProps: { pointOpacity: 1 } },
      { id: tId, latex: `(${conicNum(el.anchor[0])},${conicNum(el.anchor[1])})`, color, showLabel: true,
        label: el.text, labelOrientation: el.orient, pointSize: 1 },
      risingPoints, 'pointOpacity')
  }

  // What an earlier call showed under this id and this one does not leaves the
  // way it came.
  const leaving = [...old.entries()]
  leaving.forEach(([key]) => registry.delete(key))
  await Promise.all([
    fadeIn(calc, risingPoints, { pointOpacity: 1 }),
    fadeIn(calc, risingLines, { lineOpacity: 1 }),
    ...leaving.map(([, e]) => fadeOut(calc, e.calcIds ?? [], e.fadeProps ?? { pointOpacity: 1 })),
  ])
  return { type: shape.type, ...numbers }
}

export async function removeConicElements(calc, id) {
  const gone = [...registry.entries()].filter(([, e]) => e.conic === id)
  gone.forEach(([key]) => registry.delete(key))
  await Promise.all(gone.map(([, e]) => fadeOut(calc, e.calcIds ?? [], e.fadeProps ?? { pointOpacity: 1 })))
}

// Live value getter for valueRefs.js: a conic's numbers, by the id its
// elements were shown under — [id]a/b (semi-axes), c (centre or vertex → focus),
// p (focus → directrix), e (eccentricity), h/k (vertex or centre), r (circle).
export function getConicValue(id, token) {
  const e = registry.get(`con::${id}`)
  if (!e || !['a', 'b', 'c', 'p', 'e', 'h', 'k', 'r'].includes(token)) return undefined
  return Number.isFinite(e[token]) ? e[token] : undefined
}

export async function markRoots(calc, id, funcId, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return []
  // A region is a shaded half-plane, not a curve: it has no y for a given x,
  // so there is nothing here to shade under, cross, root, differentiate or take
  // a tangent to. Bailing keeps a mis-authored step inert instead of placing
  // points at y = true, which is what an inequality evaluates to.
  if (fn.isRegion) return []
  const f = makeEval(fn.expr)
  if (!f) return []
  const color   = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const zeros   = findZerosSampled(f)
  const calcIds = zeros.map((x, i) => {
    const cId = `root_${id}_${i}`
    calc.setExpression({
      id: cId, latex: `(${x},0)`, color,
      showLabel: true, label: `x = ${x}`, pointSize: 15, pointOpacity: 0,
    })
    return cId
  })
  registry.set(`roots::${id}`, { calcIds, funcId, fadeProps: { pointOpacity: 1 } })
  await fadeIn(calc, calcIds, { pointOpacity: 1 })
  return zeros
}

export async function removeRoots(calc, id) {
  const e = registry.get(`roots::${id}`)
  if (!e) return
  registry.delete(`roots::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { pointOpacity: 1 })
}

// Kept as its own name because lessons and the compact codec already call it,
// but there is only one implementation now: an arrow IS a segment with a head,
// and having drawn them separately is how the vector ended up without the id,
// the removal and the colour that segments have had all along.
export async function drawVector(calc, id, x1, y1, x2, y2, opts = {}) {
  await addSegment(calc, id, x1, y1, x2, y2, { thickness: 2, ...opts, arrow: 'end' })
}

// Old vectors registered under vec::, new ones under seg:: — remove either.
export async function removeVector(calc, id) {
  const e = registry.get(`vec::${id}`)
  if (!e) { await removeSegment(calc, id); return }
  registry.delete(`vec::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { lineOpacity: 1 })
}

// What an angle's label says. Blank is its measure; anything else replaces it —
// a letter, a given value like "40°", or a name written in LaTeX, which is sent
// between backticks because that is how Desmos sets math in a label. "-" means
// no label at all (see showLabel where it is used).
function angleLabelText(label, deg) {
  const s = String(label ?? '').trim()
  if (!s || s === '-') return `${+deg.toFixed(1)}°`
  return s.includes('\\') && !s.startsWith('`') ? `\`${s}\`` : s
}

// Mark the angle ABC (vertex at B) with an arc + measured-degrees label.
// If the angle is ~90° it draws a right-angle square instead of an arc.
// The measure is computed from the points — the label is always correct.
export async function drawAngle(calc, id, ax, ay, bx, by, cx, cy, opts = {}) {
  const color = Array.isArray(opts.color) ? rgbToHex(opts.color) : (opts.color || '#60a5fa')
  const r  = opts.radius ?? 1
  const f  = n => +Number(n).toFixed(6)
  const t1 = Math.atan2(ay - by, ax - bx)
  const t2 = Math.atan2(cy - by, cx - bx)
  let diff = t2 - t1
  while (diff >   Math.PI) diff -= 2 * Math.PI
  while (diff <= -Math.PI) diff += 2 * Math.PI
  const deg     = Math.abs(diff) * 180 / Math.PI
  const isRight = Math.abs(deg - 90) < 0.5
  const strokes = []

  // The region itself is filled, not just outlined. An arc alone reads as a
  // third line in a picture that is already made of lines; a tinted wedge reads
  // as "this much turn", which is the quantity the label then puts a number on.
  // Desmos has no arc-with-fill, so the wedge is a polygon whose rim is sampled
  // along the arc — 28 points, enough that the curve stays smooth at any zoom a
  // lesson uses.
  const pt = (x, y) => `\\left(${f(x)},${f(y)}\\right)`
  const fillId = `ang_fill_${id}`
  let rim
  if (isRight) {
    const s  = r * 0.55
    const p1 = [bx + s * Math.cos(t1), by + s * Math.sin(t1)]
    const p2 = [bx + s * Math.cos(t2), by + s * Math.sin(t2)]
    const cn = [bx + s * (Math.cos(t1) + Math.cos(t2)), by + s * (Math.sin(t1) + Math.sin(t2))]
    rim = [pt(bx, by), pt(p1[0], p1[1]), pt(cn[0], cn[1]), pt(p2[0], p2[1])]
    const s1 = `ang_s1_${id}`, s2 = `ang_s2_${id}`
    calc.setExpression({ id: s1, latex: makeSegment(p1[0], p1[1], cn[0], cn[1]), color, lineWidth: 2.5, lineOpacity: 0 })
    calc.setExpression({ id: s2, latex: makeSegment(p2[0], p2[1], cn[0], cn[1]), color, lineWidth: 2.5, lineOpacity: 0 })
    strokes.push(s1, s2)
  } else {
    const N = 28
    rim = [pt(bx, by)]
    for (let i = 0; i <= N; i++) {
      const th = t1 + diff * (i / N)
      rim.push(pt(bx + r * Math.cos(th), by + r * Math.sin(th)))
    }
    const arcId = `ang_arc_${id}`
    const latex = `\\left(${f(bx)}+${f(r)}\\cos\\left(${f(t1)}+${f(diff)}t\\right),\\ ${f(by)}+${f(r)}\\sin\\left(${f(t1)}+${f(diff)}t\\right)\\right)`
    calc.setExpression({ id: arcId, latex, parametricDomain: { min: '0', max: '1' }, color, lineWidth: 2.5, lineOpacity: 0 })
    strokes.push(arcId)
  }

  // lines:false, or the polygon draws its own border — which for the wedge means
  // two spurs lying on top of the very segments the angle is between.
  calc.setExpression({
    id: fillId, latex: `\\operatorname{polygon}\\left(${rim.join(',')}\\right)`,
    color, lines: false, fill: true, fillOpacity: 0,
  })

  // measured-degrees label on the bisector
  const lblId = `ang_lbl_${id}`
  const lr = r * (isRight ? 1.9 : 1.55)
  const lx = bx + lr * Math.cos(t1 + diff / 2)
  const ly = by + lr * Math.sin(t1 + diff / 2)
  calc.setExpression({
    id: lblId, latex: `(${f(lx)},${f(ly)})`, color,
    showLabel: String(opts.label ?? '').trim() !== '-', label: angleLabelText(opts.label, deg),
    // The label rides on a point, and Desmos fades the LABEL with the point:
    // pointOpacity 0 was hiding the dot and the degrees along with it. The dot
    // stays 1px — invisible in practice — and its opacity is what the fade below
    // animates, so the measure arrives with the arc instead of popping.
    labelSize: 'large', pointOpacity: 0, pointSize: 1,
  })

  registry.set(`ang::${id}`, {
    calcIds: [...strokes, fillId, lblId],
    fadeProps: { lineOpacity: ANGLE_LINE, fillOpacity: ANGLE_FILL, pointOpacity: 1 },
  })
  // The rim and the tint arrive together but at different targets, so they get
  // one fade each rather than one fade with both properties: giving the polygon
  // a line opacity would put its border back.
  await Promise.all([
    fadeIn(calc, strokes, { lineOpacity: ANGLE_LINE }),
    fadeIn(calc, [fillId], { fillOpacity: ANGLE_FILL }),
    fadeIn(calc, [lblId], { pointOpacity: 1 }),
  ])
}

// The angle between two segments or vectors, marked where they actually meet.
// Takes the two ids rather than six coordinates: by the time a lesson has drawn
// the vectors it has already said where they are, and retyping their endpoints
// is how the arc ends up on a corner that has since moved.
//
// The vertex is the endpoint the two SHARE. Two vectors drawn from the origin
// share it there, which is the ordinary case — [-5,0] and [5,0] both start at
// (0,0), and the arc reads 180°. Segments that never touch are measured where
// their lines cross instead, so the angle between them still has somewhere to
// be drawn; parallel ones have no such point and draw nothing.
export async function angleBetween(calc, id, aId, bId, opts = {}) {
  const s1 = registry.get(`seg::${aId}`)
  const s2 = registry.get(`seg::${bId}`)
  if (!s1 || !s2) return
  const A = [[s1.x1, s1.y1], [s1.x2, s1.y2]]
  const B = [[s2.x1, s2.y1], [s2.x2, s2.y2]]
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6

  let vertex = null, ra = null, rb = null
  for (let i = 0; i < 2 && !vertex; i++) {
    for (let j = 0; j < 2 && !vertex; j++) {
      if (near(A[i], B[j])) { vertex = A[i]; ra = A[1 - i]; rb = B[1 - j] }
    }
  }

  if (!vertex) {
    const [p1, p2] = A, [p3, p4] = B
    const d1x = p2[0] - p1[0], d1y = p2[1] - p1[1]
    const d2x = p4[0] - p3[0], d2y = p4[1] - p3[1]
    const den = d1x * d2y - d1y * d2x
    if (Math.abs(den) < 1e-9) return
    const t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / den
    vertex = [p1[0] + t * d1x, p1[1] + t * d1y]
    ra = [vertex[0] + d1x, vertex[1] + d1y]
    rb = [vertex[0] + d2x, vertex[1] + d2y]
  }

  // Two lines that cross make FOUR angles, and the one between the segments' own
  // directions is only one of them. `side` picks another by where it opens from
  // the crossing — "left", "below-right"… — so a vertically opposite angle, or
  // an alternate interior one, is marked without working out a coordinate. The
  // angle chosen is the one whose middle points closest to that direction.
  const SIDES = { right: [1, 0], 'above-right': [1, 1], above: [0, 1], 'above-left': [-1, 1],
                  left: [-1, 0], 'below-left': [-1, -1], below: [0, -1], 'below-right': [1, -1] }
  const want = SIDES[opts.side]
  if (want) {
    const da = [ra[0] - vertex[0], ra[1] - vertex[1]]
    const db = [rb[0] - vertex[0], rb[1] - vertex[1]]
    const la = Math.hypot(da[0], da[1]) || 1, lb = Math.hypot(db[0], db[1]) || 1
    const wl = Math.hypot(want[0], want[1])
    let best = null, bestDot = -Infinity
    for (const [sa, sb] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const mx = sa * da[0] / la + sb * db[0] / lb
      const my = sa * da[1] / la + sb * db[1] / lb
      const ml = Math.hypot(mx, my)
      if (ml < 1e-9) continue
      const dot = (mx * want[0] + my * want[1]) / (ml * wl)
      if (dot > bestDot) { bestDot = dot; best = [sa, sb] }
    }
    if (best) {
      ra = [vertex[0] + best[0] * da[0], vertex[1] + best[0] * da[1]]
      rb = [vertex[0] + best[1] * db[0], vertex[1] + best[1] * db[1]]
    }
  }

  // The mark is sized from the segments it sits between, not from a fixed 1 unit:
  // on a graph zoomed out to 20 units a one-unit arc is a smudge, and on a tight
  // one it swallows the figure. A quarter of the shorter ray reads the same at
  // every zoom, which is what the reader actually compares it against.
  //
  // How far each ray REALLY runs from the vertex: to the end of its own segment
  // in the direction it points. Where two long lines cross in their middles,
  // the whole segment used to be the reach, and the arcs at two nearby
  // crossings (a transversal through two parallels) grew into each other.
  const rayReach = (seg, dx, dy) => {
    let best = 0
    for (const [ex, ey] of [[seg.x1, seg.y1], [seg.x2, seg.y2]]) {
      const vx = ex - vertex[0], vy = ey - vertex[1]
      if (vx * dx + vy * dy > 1e-9) best = Math.max(best, Math.hypot(vx, vy))
    }
    return best || Math.hypot(dx, dy)
  }
  const reach = Math.min(
    rayReach(s1, ra[0] - vertex[0], ra[1] - vertex[1]),
    rayReach(s2, rb[0] - vertex[0], rb[1] - vertex[1]),
  )
  const radius = opts.radius ?? Math.max(0.6, Math.min(reach * 0.26, 2.5))
  await drawAngle(calc, id, ra[0], ra[1], vertex[0], vertex[1], rb[0], rb[1], { ...opts, radius })
}

export async function removeAngle(calc, id) {
  const e = registry.get(`ang::${id}`)
  if (!e) return
  registry.delete(`ang::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { lineOpacity: 1 })
}

// Animate the EXISTING curve transforming in place (translate/scale/reflect) —
// the original curve moves, no new curve is spawned. The expression is
// interpolated from the original to the target over `ms`.
export async function transformFunction(calc, id, funcId, type, value, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return
  const v    = Number(value)
  const base = fn.expr
  const cId  = fn.calcId

  // Build the expression at animation progress p (0 = original, 1 = transformed)
  const exprAt = (p) => {
    switch (type) {
      case 'translateX': return base.replace(/\bx\b/g, `(x-(${v * p}))`)
      case 'translateY': return `(${base})+(${v * p})`
      case 'scaleY':     return `(${1 + (v - 1) * p})*(${base})`
      case 'scaleX':     { const d = 1 + (v - 1) * p || 1e-6; return base.replace(/\bx\b/g, `((x)/(${d}))`) }
      case 'reflectX':   return `(${1 - 2 * p})*(${base})`
      case 'reflectY':   return base.replace(/\bx\b/g, `((${1 - 2 * p})*x)`)
      default:           return base
    }
  }
  if (exprAt(0) === undefined) return

  const ms = (opts.duration ?? 0.6) * 1000
  await new Promise(resolve => {
    const t0 = performance.now()
    ;(function tick() {
      const p = Math.min((performance.now() - t0) / ms, 1)
      calc.setExpression({ id: cId, latex: toDesmos(exprAt(easeIO(p))) })
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  // Commit the transformed expression as the curve's new definition — both
  // forms, or fn.latex would keep describing the pre-transform curve.
  fn.expr  = exprAt(1)
  fn.latex = toDesmos(fn.expr)
  registry.set(`fn::${funcId}`, fn)
}

export async function removeTransform(calc, id) {
  // Back-compat: old transforms spawned a separate curve; fade it out if present.
  const e = registry.get(`tf::${id}`)
  if (!e) return
  registry.delete(`tf::${id}`)
  await fadeOut(calc, [e.calcId], e.fadeProps ?? { lineOpacity: 1 })
}

// ── Viewport ──────────────────────────────────────────────────────────────────

function animateViewport(calc, from, to, duration = 0.35) {
  return new Promise(resolve => {
    const start = performance.now()
    const ease  = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    function tick() {
      const t = Math.min((performance.now() - start) / (duration * 1000), 1)
      const e = ease(t)
      calc.setMathBounds({
        left:   from.left   + (to.left   - from.left)   * e,
        right:  from.right  + (to.right  - from.right)  * e,
        bottom: from.bottom + (to.bottom - from.bottom) * e,
        top:    from.top    + (to.top    - from.top)    * e,
      })
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

// How many pixels wide the graph is per pixel of height. Every viewport goes
// through this: the panel is almost never square, so bounds that ARE square in
// math units get stretched to fill it and a unit circle renders as an oval.
function pixelAspect(calc) {
  let pw = 0, ph = 0
  try {
    const pc = calc?.graphpaperBounds?.pixelCoordinates
    if (pc) { pw = Math.abs(pc.right - pc.left); ph = Math.abs(pc.bottom - pc.top) }
  } catch { /* not mounted yet — the element measurement below covers it */ }
  if (!pw || !ph) {
    pw = calc?.elt?.clientWidth  || 800
    ph = calc?.elt?.clientHeight || 600
  }
  return (pw || 800) / (ph || 600)
}

// Stretch the bounds so one unit of x covers the same number of pixels as one
// unit of y — a circle is round, a square is square, a 45° line looks like 45°.
// Only ever EXPANDS: whatever was asked for stays inside the frame, and the
// extra span goes to whichever axis had pixels to spare.
export function squareBounds(calc, vp) {
  const { left, right, bottom, top } = vp
  let w = Math.abs(right - left)
  let h = Math.abs(top - bottom)
  if (![left, right, bottom, top].every(Number.isFinite) || !w || !h) return { ...vp }
  const asp = pixelAspect(calc)
  const cx  = (left + right) / 2
  const cy  = (top + bottom) / 2
  if (w / h < asp) w = h * asp
  else             h = w / asp
  return { left: cx - w / 2, right: cx + w / 2, bottom: cy - h / 2, top: cy + h / 2 }
}

export function adjustView(calc, cx = 0, cy = 0, range = 10) {
  // 'range' = vertical (y) span; x follows from the pixel ratio.
  const hy   = range / 2
  const hx   = hy * pixelAspect(calc)
  _vpByLesson = true
  const from = { ..._vp }
  _vp = { left: cx - hx, right: cx + hx, bottom: cy - hy, top: cy + hy }
  return animateViewport(calc, from, _vp)
}

export function setViewport(calc, xMin, xMax, yMin, yMax) {
  const from = { ..._vp }
  _vpByLesson = true
  _vp = squareBounds(calc, { left: xMin, right: xMax, bottom: yMin, top: yMax })
  return animateViewport(calc, from, _vp)
}

// The panel's shape changes under a fixed viewport — a layout switch, a window
// resize, the slider column appearing — and the same bounds are suddenly the
// wrong aspect. Re-square around the same centre, no animation.
//
// This one keeps the VERTICAL span and re-derives x from it, unlike
// squareBounds which only ever expands. Expanding is right when a lesson asks
// for explicit bounds (nothing it wanted to show may be cropped) but wrong
// here: a resize fires repeatedly, and expand-only compounds — one measurement
// taken while the panel was a few pixels tall was enough to blow the axes out
// to ±15000 and keep them there. Keeping y makes it idempotent.
export function resquareViewport(calc) {
  if (!calc) return
  // A container mid-mount or mid-transition measures near zero, and its aspect
  // is meaningless. Wait for a real box rather than squaring against garbage.
  let pw = 0, ph = 0
  try {
    const pc = calc.graphpaperBounds?.pixelCoordinates
    if (pc) { pw = Math.abs(pc.right - pc.left); ph = Math.abs(pc.bottom - pc.top) }
  } catch { /* not mounted yet */ }
  if (!pw || !ph) { pw = calc.elt?.clientWidth ?? 0; ph = calc.elt?.clientHeight ?? 0 }
  if (pw < 40 || ph < 40) return

  const asp = pw / ph
  const cx  = (_vp.left + _vp.right) / 2
  const cy  = (_vp.top + _vp.bottom) / 2
  const hy  = Math.abs(_vp.top - _vp.bottom) / 2
  if (!isFinite(cx) || !isFinite(cy) || !isFinite(hy) || hy <= 0) return

  const next = { left: cx - hy * asp, right: cx + hy * asp, top: cy + hy, bottom: cy - hy }
  if (Math.abs(next.left - _vp.left) < 1e-6 && Math.abs(next.right - _vp.right) < 1e-6) return
  _vp = next
  try { calc.setMathBounds(next) } catch { /* calculator torn down mid-resize */ }
}

export function getViewport() {
  return { ..._vp }
}

// Re-derive the tracked viewport from the calculator's actual rendered bounds.
// The graph container's aspect ratio changes across layouts (e.g. the slider
// column narrows single-graph/graph-equation), so Desmos' auto-fitted bounds
// don't match the hardcoded default unless we resync after each layout settles.
export function syncViewport(calc) {
  try {
    const mc = calc?.graphpaperBounds?.mathCoordinates
    if (mc && [mc.left, mc.right, mc.bottom, mc.top].every(isFinite)) {
      _vp = { left: mc.left, right: mc.right, bottom: mc.bottom, top: mc.top }
    }
  } catch {}
}

// Every point-like coordinate a lesson has explicitly placed and expects to
// stay visible: addPoint, segment endpoints, scatter-plot spread, a
// nameFunc label's anchor. Deliberately excludes plotted CURVES themselves
// (fn::) — they're infinite by nature, so "fitting the whole curve" isn't a
// meaningful goal; only concrete placed coordinates are.
function getVisibilityAnchors() {
  const anchors = []
  for (const [key, e] of registry) {
    if (key.startsWith('pt::')) {
      if (isFinite(e.numX) && isFinite(e.numY)) anchors.push({ x: e.numX, y: e.numY })
    } else if (key.startsWith('seg::')) {
      anchors.push({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 })
    } else if (key.startsWith('lbl::')) {
      const fn = registry.get(`fn::${e.funcId}`)
      if (fn?.hasSliders) continue
      if (isFinite(e.x) && isFinite(e.y)) anchors.push({ x: e.x, y: e.y })
    } else if (key.startsWith('sc::') && e.bbox) {
      anchors.push({ x: e.bbox.minX, y: e.bbox.minY }, { x: e.bbox.maxX, y: e.bbox.maxY })
    } else if (key.startsWith('int::') && e.points) {
      for (const [x, y] of e.points) if (isFinite(x) && isFinite(y)) anchors.push({ x, y })
    }
  }
  return anchors
}

// After any graph mutation, pan/zoom so every placed point/segment-endpoint/
// label is actually on screen — a lesson often adds a second point far from
// the first (e.g. two points to derive a line's equation) and the default
// or previously-set viewport has no reason to already show it. No-ops if
// everything already fits (checked with a margin so points don't sit glued
// to the very edge), so it never fights a deliberate setViewport/adjustView
// call elsewhere in the same script. Matches the container's real pixel
// aspect ratio (same approach as adjustView) so nothing looks stretched.
export async function ensureVisible(calc) {
  const anchors = getVisibilityAnchors()
  if (!anchors.length) return

  const vp = getViewport()
  const marginX = (vp.right - vp.left) * 0.1
  const marginY = (vp.top - vp.bottom) * 0.1
  const allVisible = anchors.every(p =>
    p.x >= vp.left + marginX && p.x <= vp.right - marginX &&
    p.y >= vp.bottom + marginY && p.y <= vp.top - marginY
  )
  if (allVisible) return

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of anchors) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
  }
  const from = { ..._vp }
  const w = vp.right - vp.left
  const h = vp.top - vp.bottom

  // PAN FIRST. If the anchors already fit at this zoom, the zoom is not the
  // problem — shift the view by the smallest amount that brings the stragglers
  // inside the margins and leave the span alone. Re-framing tightly around the
  // anchors instead is what turned "plot one line" into a view centred on
  // (3,7) at 4x3: one label an inch inside the top margin re-zoomed everything.
  const usableX = w / 2 - marginX
  const usableY = h / 2 - marginY
  if (maxX - minX <= usableX * 2 && maxY - minY <= usableY * 2) {
    const clamp = (c, lo, hi) => Math.min(Math.max(c, lo), hi)
    const cx = clamp((vp.left + vp.right) / 2, maxX - usableX, minX + usableX)
    const cy = clamp((vp.bottom + vp.top) / 2, maxY - usableY, minY + usableY)
    _vp = { left: cx - w / 2, right: cx + w / 2, bottom: cy - h / 2, top: cy + h / 2 }
    await animateViewport(calc, from, _vp)
    return
  }

  // Genuinely too big for the current frame — zoom OUT to fit, never in.
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  let pw = 0, ph = 0
  try {
    const pc = calc.graphpaperBounds?.pixelCoordinates
    if (pc) { pw = Math.abs(pc.right - pc.left); ph = Math.abs(pc.bottom - pc.top) }
  } catch { /* not mounted — the element measurement below covers it */ }
  if (!pw || !ph) {
    pw = calc.elt?.clientWidth  || 800
    ph = calc.elt?.clientHeight || 600
  }
  const aspect = pw / ph

  // Pad 30% beyond the tight bounding box so placed points sit comfortably
  // inside the frame instead of right at its edge, then stretch whichever
  // axis is cramped relative to the container's aspect ratio.
  let halfX = ((maxX - minX) / 2) * 1.3
  let halfY = ((maxY - minY) / 2) * 1.3
  if (halfX / halfY < aspect) halfX = halfY * aspect
  else halfY = halfX / aspect
  // Never end up more zoomed in than we started: this call exists to reveal
  // something, not to magnify the rest of the lesson away.
  halfX = Math.max(halfX, w / 2)
  halfY = Math.max(halfY, h / 2)

  _vp = { left: cx - halfX, right: cx + halfX, bottom: cy - halfY, top: cy + halfY }
  await animateViewport(calc, from, _vp)
}

// Return the y-value of the registered function whose value at x is closest
// to preferredY. Returns null if no functions are registered.
export function snapToGraph(x, preferredY) {
  let closest = null
  let minDist = Infinity
  for (const [key, fn] of registry) {
    if (!key.startsWith('fn::')) continue
    const f = makeEval(fn.expr)
    if (!f) continue
    try {
      const fy = f(x)
      if (!isFinite(fy)) continue
      const dist = Math.abs(fy - preferredY)
      if (dist < minDist) { minDist = dist; closest = fy }
    } catch { /* skip */ }
  }
  return closest
}

// Evaluate a specific registered function at x. Returns null if unavailable.
export function evalFunction(funcId, x) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return null
  const f = makeEval(fn.expr)
  if (!f) return null
  try {
    const y = f(x)
    return isFinite(y) ? y : null
  } catch { return null }
}

export function setAxesVisible(calc, x, y) {
  try { calc.updateSettings({ showXAxis: x, showYAxis: y }) } catch {}
}

export function setGridVisible(calc, visible) {
  try { calc.updateSettings({ showGrid: visible }) } catch {}
}

export function clearAll(calc) {
  // registry/sliders/_vp are plain JS state — clear them even if the Desmos
  // calculator itself isn't ready yet (e.g. right after switching lessons,
  // while DesmosDisplay is still (re)initializing). Callers used to guard
  // this whole function behind "if there's a live calculator", which meant
  // a lesson switch that raced the calculator's init silently skipped
  // clearing entirely — old sliders/curves stayed registered forever and
  // just kept showing up on every page after, unrelated to their own steps.
  registry.clear()
  sliders.clear()
  liveEquations.clear()
  stepDots.clear()   // setBlank() below drops the expressions themselves
  // Drop the trig-circle labels BEFORE the viewport reset below. They're HTML
  // positioned from _vp at render time, so leaving them mounted through the
  // reset re-projects all 32 of them into a 20-unit-wide view — they pile up
  // in a clump at the centre for a frame before the next draw wipes them.
  _emitTrigOverlay([])
  _vp = { left: -10, right: 10, bottom: -7.5, top: 7.5 }
  _vpByLesson = false
  calc?.setBlank()
  _emitSliders()
  _emitLiveEquations()
  _emitClear()
}

const _SUP = {
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ',
  'k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ',
  'v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','+':'⁺','-':'⁻',
}
function _toSup(s) { return [...s].map(c => _SUP[c] ?? c).join('') }
function _fmtLabel(label) {
  let s = label.replace(/\*\*/g, '^')
  s = s.replace(/\^\{([^}]*)\}/g, (_, i) => _toSup(i))
  s = s.replace(/\^\(([^)]*)\)/g, (_, i) => '⁽' + _toSup(i) + '⁾')
  s = s.replace(/\^([A-Za-z0-9+\-]+)/g, (_, i) => _toSup(i))
  return s
}

// x/y in on-screen pixels per math-unit, from Desmos's own rendered bounds —
// lets "how far apart do two labels look" be judged in the same units the
// student actually sees, not raw math coordinates (where "3 apart" can be
// two pixels at one zoom level and half the screen at another).
function pixelsPerUnit(calc) {
  try {
    const pc = calc.graphpaperBounds?.pixelCoordinates
    const mc = calc.graphpaperBounds?.mathCoordinates
    if (pc && mc) {
      const px = Math.abs(pc.right - pc.left) / (Math.abs(mc.right - mc.left) || 1)
      const py = Math.abs(pc.bottom - pc.top) / (Math.abs(mc.bottom - mc.top) || 1)
      if (isFinite(px) && isFinite(py) && px > 0 && py > 0) return { px, py }
    }
  } catch {}
  return { px: 40, py: 40 }
}

export function nameFunc(calc, id, funcId, label, x, y, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return
  // A region has no curve to sit a name on: makeEval of an inequality returns
  // a BOOLEAN, and true passes isFinite, so the label used to be placed at
  // (x, true) and blow up on toFixed. Naming the shaded half-plane is not a
  // thing a lesson asks for anyway — the boundary is already written on it.
  if (fn.isRegion) return
  const f = makeEval(fn.expr)
  if (!f) return

  const vp   = getViewport()
  const vpW  = (vp.right - vp.left) || 8
  const vpH  = Math.abs(vp.top - vp.bottom) || 8
  const cxV  = (vp.left + vp.right) / 2
  const cyV  = (vp.bottom + vp.top) / 2
  const yLo  = Math.min(vp.bottom, vp.top) + 0.06 * vpH
  const yHi  = Math.max(vp.bottom, vp.top) - 0.06 * vpH
  const { px: ppx, py: ppy } = pixelsPerUnit(calc)
  // A rendered label can be 1-3 lines tall (see the |-separator newline
  // support) — plain anchor-to-anchor distance needs real headroom above a
  // single line's height, or two labels whose anchors are "far enough" by this
  // metric can still have their actual text boxes overlapping.
  const minDistPx = 90
  const others = [...registry.entries()]
    .filter(([k]) => k.startsWith('lbl::'))
    .map(([, e]) => e)

  const evalAt = (xx) => {
    let yy
    try { yy = f(xx) } catch { return null }
    return isFinite(yy) ? yy : null
  }
  const onScreen = (xx, yy) => xx >= vp.left && xx <= vp.right && yy >= yLo && yy <= yHi
  const clearOf  = (xx, yy) => others.every(o =>
    Math.hypot((xx - o.x) * ppx, (yy - o.y) * ppy) >= minDistPx)

  let x0 = null
  let yVal = null
  let orientation = 'above'

  // An explicit x from the caller wins — but only if it actually lands on
  // screen. Honouring one that does not is how a label ended up off frame and
  // dragged the camera after it.
  if (isFinite(x)) {
    const yy = isFinite(y) ? y : evalAt(x)
    if (yy !== null && onScreen(x, yy)) { x0 = x; yVal = yy }
  }

  // Otherwise: the point of the curve NEAREST THE CENTRE of the current view.
  // Sampling x and taking the first in-frame hit put the label wherever the
  // curve happened to be at the middle column, which for a steep line is way
  // off the top or bottom. Ranking by true screen distance to the centre puts
  // it in the middle when the curve passes there, and as close to the middle
  // as the curve allows when it does not.
  if (x0 === null) {
    const cands = []
    const N = 60
    for (let i = 0; i <= N; i++) {
      const xx = vp.left + vpW * (0.06 + 0.88 * (i / N))
      const yy = evalAt(xx)
      if (yy === null || !onScreen(xx, yy)) continue
      cands.push({ x: xx, y: yy, d: Math.hypot((xx - cxV) * ppx, (yy - cyV) * ppy) })
    }
    cands.sort((a, b) => a.d - b.d)
    const pick = cands.find(c => clearOf(c.x, c.y)) ?? cands[0]
    if (pick) {
      x0 = pick.x
      yVal = pick.y
      // Every in-frame spot collides with an existing label — two near-parallel
      // curves keep the same gap everywhere — so flip which side of the curve
      // the text renders on, as a second, independent lever.
      if (!clearOf(pick.x, pick.y) && others.length) {
        const nearest = others.reduce((a, b) =>
          Math.hypot((pick.x - a.x) * ppx, (pick.y - a.y) * ppy) <
          Math.hypot((pick.x - b.x) * ppx, (pick.y - b.y) * ppy) ? a : b)
        orientation = nearest.y > pick.y ? 'below' : 'above'
      }
    }
  }

  // Nothing on the curve is in frame at all — last resort, place it and let
  // ensureVisible pan afterwards.
  if (x0 === null) {
    x0 = isFinite(x) ? x : cxV
    yVal = isFinite(y) ? y : evalAt(x0)
    if (yVal === null) return
  }
  const color = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const cId   = `lbl_${id}`
  calc.setExpression({
    id: cId, latex: `(${x0},${+yVal.toFixed(6)})`,
    color, showLabel: true, label: _fmtLabel(label), labelOrientation: orientation, hidden: true,
  })
  registry.set(`lbl::${id}`, { calcId: cId, funcId, x: x0, y: yVal, label: _fmtLabel(label), orientation })
}

export function removeNameFunc(calc, id) {
  const e = registry.get(`lbl::${id}`)
  if (e) { calc.removeExpression({ id: e.calcId }); registry.delete(`lbl::${id}`) }
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function makeSegment(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  if (Math.abs(dx) < 1e-9) {
    const xF = +x1.toFixed(8)
    const [yA, yB] = y1 <= y2 ? [y1, y2] : [y2, y1]
    return `x=${xF}\\left\\{${+yA.toFixed(8)}\\le y\\le${+yB.toFixed(8)}\\right\\}`
  }
  const m  = dy / dx
  const bv = y1 - m * x1
  const [xA, xB] = x1 <= x2 ? [x1, x2] : [x2, x1]
  const mStr = +m.toFixed(8)
  const bStr = bv >= 0 ? `+${+bv.toFixed(8)}` : `${+bv.toFixed(8)}`
  return `${mStr}x${bStr}\\left\\{${+xA.toFixed(8)}\\le x\\le${+xB.toFixed(8)}\\right\\}`
}

// Shared math-notation → JS-expression-body conversion (LaTeX-ish or plain
// "2x+3"), used by both the explicit y=f(x) evaluator and the implicit-
// equation fallback below — same pipeline, just fed a different substring.
function toJsExpr(raw) {
  let withSliders = raw
  for (const [name, s] of sliders) {
    withSliders = withSliders.replace(new RegExp(`\\b${name}\\b`, 'g'), `(${s.value})`)
  }
  return withSliders
    // LaTeX: \frac{a}{b} → (a)/(b)
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    // LaTeX backslash functions
    .replace(/\\sqrt\{([^}]*)\}/g, 'Math.sqrt($1)')
    .replace(/\\sqrt\b/g, 'Math.sqrt')
    .replace(/\\ln\b/g, 'Math.log')
    .replace(/\\exp\b/g, 'Math.exp')
    .replace(/\\pi\b/g, 'Math.PI')
    .replace(/\\cdot\b/g, '*')
    // Rounding functions, in BOTH the \operatorname{} form Desmos emits and the
    // plain form a lesson types. One pass over the two spellings on purpose:
    // mapping them separately would let the second rule see the "floor" inside
    // the "Math.floor" the first one just wrote ("." is not a word character)
    // and produce "Math.Math.floor". It also has to happen before the lone
    // braces below turn \operatorname{floor} into \operatorname(floor).
    .replace(/(?:\\operatorname\{(floor|ceil|round|abs)\}|\b(floor|ceil|round|abs|cbrt)\b)/g,
             (_, op, plain) => `Math.${op || plain}`)
    // Trig, in both spellings, in ONE pass for the same reason.
    .replace(/\\?\b(arcsin|arccos|arctan|sin|cos|tan)\b/g,
             (_, name) => `Math.${{ arcsin: 'asin', arccos: 'acos', arctan: 'atan' }[name] ?? name}`)
    // LaTeX grouping
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    // Power with braces: x^{2} → x**(2)
    .replace(/\^\{([^}]+)\}/g, '**($1)')
    // Plain power: x^2 → x**2
    .replace(/\^/g, '**')
    // Strip remaining lone braces
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    // Non-LaTeX trig/constants
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    // Implicit multiplication: "2x" → "2*x", "2(" → "2*("
    .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
    // Close-paren immediately before letter or open-paren
    .replace(/\)([a-zA-Z(])/g, ')*$1')
}

// "y" alone, or a function-call form like "f(x)"/"g(x)" — a left-hand side
// that's ALREADY fully isolated, nothing else to solve for.
function isIsolatedLhs(lhs) {
  const t = lhs.trim()
  return /^y$/.test(t) || /^[a-zA-Z]\w*\(\s*x\s*\)$/.test(t)
}

// A line typed in general form ("-6x+3y=12" instead of "y=2x+4") is linear
// in y, so the left-minus-right residual is (stuff without y) + y·k for some
// constant k — sampling the residual at y=0 and y=1 pins down k, and solving
// residual=0 for y needs no string algebra at all. Returns NaN (not a
// number, but a valid function output) for anything not linear in y, e.g. a
// real curve like y²=x, rather than guessing wrong.
export function makeImplicitEval(expr) {
  const eqIdx = expr.indexOf('=')
  if (eqIdx < 0) return null
  try {
    const lhsJs = toJsExpr(expr.slice(0, eqIdx).trim())
    const rhsJs = toJsExpr(expr.slice(eqIdx + 1).trim())
    const residual = new Function('x', 'y', `"use strict"; return (${lhsJs}) - (${rhsJs})`)
    const onCurve  = (x, y) => isFinite(y) && Math.abs(residual(x, y)) < 1e-6

    return (x) => {
      // Fast path, exact for anything linear in y ("-6x+3y=12"): read the
      // residual at two y values and solve the straight line between them.
      const g0 = residual(x, 0)
      const g1 = residual(x, 1)
      const k  = g1 - g0
      if (isFinite(k) && Math.abs(k) > 1e-9) {
        const y = -g0 / k
        if (onCurve(x, y)) return y
      }
      // It wasn't linear in y. That line was previously returned anyway, which
      // for x²+y²=1 means y = 1−x² — a parabola, not the circle, so labels and
      // tangents anchored to points that are nowhere near the curve. Solve it
      // properly instead: walk y looking for a sign change in the residual,
      // then bisect. Returns the LOWEST solution; a circle has two per x.
      const R = 50, steps = 400, dy = (2 * R) / steps
      let yPrev = -R
      let gPrev = residual(x, yPrev)
      for (let i = 1; i <= steps; i++) {
        const yCur = -R + i * dy
        const gCur = residual(x, yCur)
        if (isFinite(gPrev) && isFinite(gCur) && gPrev * gCur <= 0) {
          let lo = yPrev, hi = yCur
          for (let j = 0; j < 60; j++) {
            const mid = (lo + hi) / 2
            if (residual(x, lo) * residual(x, mid) <= 0) hi = mid
            else lo = mid
          }
          const y = (lo + hi) / 2
          if (onCurve(x, y)) return y
        }
        yPrev = yCur; gPrev = gCur
      }
      // No y satisfies the relation at this x — the curve does not exist here.
      return NaN
    }
  } catch { return null }
}

// "-5<x\le0" → a test on x. A chained bound reads as one clause, exactly the
// way it is written: "-5<x<=0" is two comparisons that must both hold.
function makeCondition(condRaw) {
  const s = String(condRaw ?? '').replace(/\\ge/g, '>=').replace(/\\le/g, '<=')
  const parts = s.split(/(<=|>=|<|>)/)
  if (parts.length < 3) return null
  const tests = []
  for (let i = 1; i < parts.length; i += 2) {
    try {
      tests.push(new Function('x',
        `"use strict"; return (${toJsExpr(parts[i - 1])}) ${parts[i]} (${toJsExpr(parts[i + 1])})`))
    } catch { return null }
  }
  return (x) => tests.every(t => { try { return t(x) } catch { return false } })
}

// Split on a separator that is not inside parentheses, so a value like
// "max(x,2)" survives being cut on commas.
function splitTopLevel(str, sep) {
  const out = []
  let cur = '', depth = 0
  for (const ch of String(str ?? '')) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === sep && depth === 0) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

// An evaluator for the two brace forms. Outside its domain a piece returns
// NaN — which every caller already reads as "no curve here", so the label, the
// roots and the intersections all stay inside the piece instead of wandering
// off where nothing is drawn.
//
// This is not decoration: without it, makeEval cut "1\{-5<x<=0\}" at the "="
// of the "<=" and handed back the constant 0. Not an error anyone would see —
// just a wrong answer, silently.
function makePieceEval(expr) {
  const { outside, groups } = splitBraceGroups(expr)
  if (!groups.length) return null

  // "\{cond:val, cond:val, else\}" — the braces ARE the function.
  if (!outside.trim() && groups.length === 1 && groups[0].includes(':')) {
    const branches = []
    let fallback = null
    for (const part of splitTopLevel(groups[0], ',')) {
      const half = splitTopLevel(part, ':')
      if (half.length === 2) {
        const cond = makeCondition(half[0])
        const val  = makeEval(half[1])
        if (!cond || !val) return null
        branches.push({ cond, val })
      } else {
        fallback = makeEval(part)
        if (!fallback) return null
      }
    }
    if (!branches.length) return null
    return (x) => {
      for (const b of branches) if (b.cond(x)) return b.val(x)
      return fallback ? fallback(x) : NaN
    }
  }

  // "base\{cond\}\{cond\}" — the braces filter an ordinary expression, and
  // several of them stack into an AND.
  const base  = makeEval(outside)
  const conds = groups.map(makeCondition)
  if (!base || conds.some(c => !c)) return null
  return (x) => (conds.every(c => c(x)) ? base(x) : NaN)
}

function makeEval(expr) {
  // A restriction or a piecewise is not an ordinary formula, and it must be
  // recognised BEFORE the cut-at-"=" below: "1\{-5<x<=0\}" contains an "="
  // only because it contains a "<=".
  const piece = makePieceEval(expr)
  if (piece) return piece

  // Only cut-at-"=" when the left side is already isolated ("y = ..." /
  // "f(x) = ...") — that's the one case where throwing away the left side
  // is safe. Anything else ("-6x+3y=12", "12=-6x+3y") needs the implicit
  // solver: the naive cut used to either silently keep a stray "y" (throws
  // at call time, swallowed by every try/catch caller → "nothing found") or
  // discard the only side that actually mentioned y (finds a real but wrong
  // point, usually off in a direction nobody's looking).
  if (expr.includes('=')) {
    const lhs = expr.slice(0, expr.indexOf('='))
    if (!isIsolatedLhs(lhs)) {
      const implicit = makeImplicitEval(expr)
      if (implicit) return implicit
    }
  }
  try {
    const rhs = expr.includes('=') ? expr.slice(expr.indexOf('=') + 1) : expr
    const js  = toJsExpr(rhs)
    return new Function('x', `"use strict"; return (${js})`)
  } catch { return null }
}

function bisect(f, a, b) {
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2
    if (f(m) * f(a) <= 0) b = m; else a = m
  }
  return (a + b) / 2
}

function findIntersectionsSampled(e1, e2, xMin = -10, xMax = 10, n = 2000) {
  const f1 = makeEval(e1)
  const f2 = makeEval(e2)
  if (!f1 || !f2) return []
  const dx  = (xMax - xMin) / n
  const pts = []
  let prev  = null
  for (let i = 0; i <= n; i++) {
    const x = xMin + i * dx
    let v1, v2
    try { v1 = f1(x) } catch { prev = null; continue }
    try { v2 = f2(x) } catch { prev = null; continue }
    const d = v1 - v2
    if (prev !== null && isFinite(prev) && isFinite(d) && prev * d < 0) {
      const xi = bisect(x => { try { return f1(x) - f2(x) } catch { return 0 } }, x - dx, x)
      const yi = (f1(xi) + f2(xi)) / 2
      if (isFinite(xi) && isFinite(yi)) pts.push([+xi.toFixed(3), +yi.toFixed(3)])
    }
    prev = d
  }
  return pts
}

// Animate two restricted lines growing outward from (xF, yF) toward the axes.
// Vertical: bound shrinks from yF toward 0. Horizontal: bound shrinks from xF toward 0.
function growProjectionLines(calc, vId, hId, xF, yF, ms = FADE_MS) {
  return new Promise(resolve => {
    const t0 = performance.now()
    function tick() {
      const p = Math.min((performance.now() - t0) / ms, 1)
      const e = easeIO(p)

      // Vertical: bottom bound (if y>0) or top bound (if y<0) moves toward 0
      const vLo = yF >= 0 ? +(yF * (1 - e)).toFixed(6) : +yF.toFixed(6)
      const vHi = yF >= 0 ? +yF.toFixed(6)             : +(yF * (1 - e)).toFixed(6)

      // Horizontal: left bound (if x>0) or right bound (if x<0) moves toward 0
      const hLo = xF >= 0 ? +(xF * (1 - e)).toFixed(6) : +xF.toFixed(6)
      const hHi = xF >= 0 ? +xF.toFixed(6)             : +(xF * (1 - e)).toFixed(6)

      calc.setExpression({ id: vId, latex: `x=${xF}\\left\\{${vLo}\\le y\\le${vHi}\\right\\}` })
      calc.setExpression({ id: hId, latex: `y=${yF}\\left\\{${hLo}\\le x\\le${hHi}\\right\\}` })

      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    }
    tick()
  })
}

// One leg of a vector's components, drawn from where the pen is toward where it
// goes: the Δx leg leaves the tail, the Δy leg leaves the corner.
function growLeg(calc, legId, axis, fixed, from, to, ms = FADE_MS) {
  return new Promise(resolve => {
    const t0 = performance.now()
    const tick = () => {
      const p   = Math.min((performance.now() - t0) / ms, 1)
      const cur = from + (to - from) * easeIO(p)
      const lo  = +Math.min(from, cur).toFixed(6)
      const hi  = +Math.max(from, cur).toFixed(6)
      calc.setExpression({ id: legId, latex: axis === 'x'
        ? `y=${fixed}\\left\\{${lo}\\le x\\le${hi}\\right\\}`
        : `x=${fixed}\\left\\{${lo}\\le y\\le${hi}\\right\\}` })
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    }
    tick()
  })
}

// A vector's components: the dashed Δx leg leaves the tail along x, then the Δy
// leg climbs from that corner to the tip — the move the vector stands for, one
// axis at a time. Same dashes, colour and grow as a point's projections, but
// labelled with what they measure, "Δx = 4" and "Δy = 3". A point's projections
// keep their bare coordinates; a Δ is a change, and only a vector has one.
// Each label sits on the outside of the triangle the legs make with the vector,
// so it never lands on the arrow.
async function showVectorComponents(calc, id, segId, seg, opts = {}) {
  const f  = (n) => +Number(n).toFixed(6)
  const x1 = f(seg.x1), y1 = f(seg.y1), x2 = f(seg.x2), y2 = f(seg.y2)
  if (![x1, y1, x2, y2].every(isFinite)) return
  const dx = x2 - x1, dy = y2 - y1
  const color = darken(seg.color ?? '#60a5fa', 0.3)
  const OP = 0.6
  const hId = `proj_dx_${id}`
  const vId = `proj_dy_${id}`
  const calcIds = []
  // A leg of length zero is not drawn — a vertical vector has no Δx to walk.
  if (Math.abs(dx) > 1e-9) {
    calc.setExpression({ id: hId, latex: `y=${y1}\\left\\{${x1}\\le x\\le${x1}\\right\\}`, color, lineWidth: 2.5, lineStyle: 'DASHED', lineOpacity: OP })
    calcIds.push(hId)
  }
  if (Math.abs(dy) > 1e-9) {
    calc.setExpression({ id: vId, latex: `x=${x2}\\left\\{${y1}\\le y\\le${y1}\\right\\}`, color, lineWidth: 2.5, lineStyle: 'DASHED', lineOpacity: OP })
    calcIds.push(vId)
  }
  registry.set(`proj::${id}`, { calcIds: [...calcIds], pointId: segId, fadeProps: { lineOpacity: OP } })
  if (calcIds.includes(hId)) await growLeg(calc, hId, 'x', y1, x1, x2)
  if (calcIds.includes(vId)) await growLeg(calc, vId, 'y', x2, y1, y2)

  if (opts.showValues === false) return
  const signed = (v) => { const r = +v.toFixed(3); return r < 0 ? `\u2212${Math.abs(r)}` : `${r}` }
  // Under the Δx leg when the vector climbs, over it when it falls; beside the
  // Δy leg on the side away from the tail.
  const dxLblId = `proj_dxl_${id}`
  calc.setExpression({
    id: dxLblId, latex: `(${f((x1 + x2) / 2)},${y1})`, color,
    showLabel: true, label: `Δx = ${signed(dx)}`, labelOrientation: dy >= 0 ? 'below' : 'above',
    pointSize: 1, pointOpacity: 0,
  })
  const dyLblId = `proj_dyl_${id}`
  calc.setExpression({
    id: dyLblId, latex: `(${x2},${f((y1 + y2) / 2)})`, color,
    showLabel: true, label: `Δy = ${signed(dy)}`, labelOrientation: dx >= 0 ? 'right' : 'left',
    pointSize: 1, pointOpacity: 0,
  })
  calcIds.push(dxLblId, dyLblId)
  registry.set(`proj::${id}`, { calcIds, pointId: segId, fadeProps: { lineOpacity: OP, pointOpacity: OP } })
  // Desmos draws no label on a point that is fully transparent: the labels
  // arrive with their one-pixel points, the same way a point's values do.
  await fadeIn(calc, [dxLblId, dyLblId], { pointOpacity: OP })
}

export async function showAxisProjection(calc, id, pointId, opts = {}) {
  const pt = registry.get(`pt::${pointId}`)
  if (!pt) {
    // Not a point: given a vector (any segment), its components instead.
    const seg = registry.get(`seg::${pointId}`)
    if (seg) await showVectorComponents(calc, id, pointId, seg, opts)
    return
  }
  const x = pt.numX, y = pt.numY
  if (!isFinite(x) || !isFinite(y)) return
  const color = darken(pt.color ?? '#60a5fa', 0.3)
  const xF = +x.toFixed(6)
  const yF = +y.toFixed(6)
  const OP = 0.6
  const showValues = opts.showValues !== false

  const vId = `proj_v_${id}`
  calc.setExpression({
    id: vId,
    latex: `x=${xF}\\left\\{${yF}\\le y\\le${yF}\\right\\}`,
    color, lineWidth: 2.5, lineStyle: 'DASHED', lineOpacity: OP,
  })

  const hId = `proj_h_${id}`
  calc.setExpression({
    id: hId,
    latex: `y=${yF}\\left\\{${xF}\\le x\\le${xF}\\right\\}`,
    color, lineWidth: 2.5, lineStyle: 'DASHED', lineOpacity: OP,
  })

  const calcIds = [vId, hId]

  if (showValues) {
    const xLabel = +x.toFixed(3)
    const yLabel = +y.toFixed(3)

    const xAxId = `proj_xa_${id}`
    calc.setExpression({
      id: xAxId, latex: `(${xF},0)`, color,
      showLabel: true, label: `${xLabel}`, pointSize: 8, pointOpacity: 0,
    })

    const yAxId = `proj_ya_${id}`
    calc.setExpression({
      id: yAxId, latex: `(0,${yF})`, color,
      showLabel: false, pointSize: 8, pointOpacity: 0,
    })

    const dyLbl  = (_vp.top - _vp.bottom) * 0.03
    const yLblId = `proj_yl_${id}`
    calc.setExpression({
      id: yLblId, latex: `(0,${+(yF - dyLbl).toFixed(6)})`, color,
      showLabel: true, label: `${yLabel}`, labelOrientation: 'right',
      pointSize: 1, pointOpacity: 0,
    })

    calcIds.push(xAxId, yAxId, yLblId)
    registry.set(`proj::${id}`, { calcIds, pointId, fadeProps: { lineOpacity: OP, pointOpacity: OP } })
    await Promise.all([
      growProjectionLines(calc, vId, hId, xF, yF),
      fadeIn(calc, [xAxId, yAxId, yLblId], { pointOpacity: OP }),
    ])
  } else {
    registry.set(`proj::${id}`, { calcIds, pointId, fadeProps: { lineOpacity: OP } })
    await growProjectionLines(calc, vId, hId, xF, yF)
  }
}

const _TC_ANGLES = [
  { id:'p0',   deg:'0°',   nx:1,                  ny:0,                  sx:'1',      sy:'0'      },
  { id:'p30',  deg:'30°',  nx:Math.sqrt(3)/2,     ny:0.5,                sx:'√3/2',  sy:'1/2'    },
  { id:'p45',  deg:'45°',  nx:Math.sqrt(2)/2,     ny:Math.sqrt(2)/2,     sx:'√2/2',  sy:'√2/2'   },
  { id:'p60',  deg:'60°',  nx:0.5,                ny:Math.sqrt(3)/2,     sx:'1/2',   sy:'√3/2'   },
  { id:'p90',  deg:'90°',  nx:0,                  ny:1,                  sx:'0',      sy:'1'      },
  { id:'p120', deg:'120°', nx:-0.5,               ny:Math.sqrt(3)/2,     sx:'-1/2',  sy:'√3/2'   },
  { id:'p135', deg:'135°', nx:-Math.sqrt(2)/2,    ny:Math.sqrt(2)/2,     sx:'-√2/2', sy:'√2/2'   },
  { id:'p150', deg:'150°', nx:-Math.sqrt(3)/2,    ny:0.5,                sx:'-√3/2', sy:'1/2'    },
  { id:'p180', deg:'180°', nx:-1,                 ny:0,                  sx:'-1',     sy:'0'      },
  { id:'p210', deg:'210°', nx:-Math.sqrt(3)/2,    ny:-0.5,               sx:'-√3/2', sy:'-1/2'   },
  { id:'p225', deg:'225°', nx:-Math.sqrt(2)/2,    ny:-Math.sqrt(2)/2,    sx:'-√2/2', sy:'-√2/2'  },
  { id:'p240', deg:'240°', nx:-0.5,               ny:-Math.sqrt(3)/2,    sx:'-1/2',  sy:'-√3/2'  },
  { id:'p270', deg:'270°', nx:0,                  ny:-1,                 sx:'0',      sy:'-1'     },
  { id:'p300', deg:'300°', nx:0.5,                ny:-Math.sqrt(3)/2,    sx:'1/2',   sy:'-√3/2'  },
  { id:'p315', deg:'315°', nx:Math.sqrt(2)/2,     ny:-Math.sqrt(2)/2,    sx:'√2/2',  sy:'-√2/2'  },
  { id:'p330', deg:'330°', nx:Math.sqrt(3)/2,     ny:-0.5,               sx:'√3/2',  sy:'-1/2'   },
]

// Both label rings are UNIFORM — one radius for the angles inside, one for the
// coordinates outside. The old code alternated the radius every other point to
// dodge collisions, which turned each ring into a zigzag ((0,1) hugging the
// circle while (1/2,√3/2) sat twice as far out). Anchoring every coordinate
// radially instead — it grows away from its own point rather than being
// centred on it — buys the same clearance with a single clean ring.
const _TC_R_ANGLE = 0.87
const _TC_R_COORD = 1.03

export async function drawTrigCircle(calc) {
  const circColor = '#7c6ef5'
  const ptColor   = '#60a5fa'

  _emitTrigOverlay([]) // clear previous overlay immediately
  await adjustView(calc, 0, 0, 3.0)

  calc.setExpression({ id: 'tc_circ', latex: 'x^2+y^2=1', color: circColor, lineWidth: 3, lineOpacity: 0 })
  registry.set('fn::tc_circ', { calcId: 'tc_circ', expr: 'x^2+y^2=1', color: circColor, lineWidth: 3, fadeProps: { lineOpacity: 1 } })

  const dotIds = []
  const overlayItems = []

  for (const a of _TC_ANGLES) {
    const xF = +a.nx.toFixed(8)
    const yF = +a.ny.toFixed(8)

    const dotId = `tc_dot_${a.id}`
    calc.setExpression({ id: dotId, latex: `(${xF},${yF})`, color: ptColor, showLabel: false, pointSize: 9, pointOpacity: 0 })
    dotIds.push(dotId)

    // Inner angle labels — centred on one uniform ring just under the circle
    overlayItems.push({ id: `ang_${a.id}`, mathX: a.nx * _TC_R_ANGLE, mathY: a.ny * _TC_R_ANGLE, text: a.deg, type: 'angle' })

    // Outer coord labels — one uniform ring, each anchored radially outward.
    // anchorY is never 0: the two labels sitting on the x-axis are pushed just
    // above it instead of being struck through by it.
    overlayItems.push({
      id: `crd_${a.id}`,
      mathX: a.nx * _TC_R_COORD,
      mathY: a.ny * _TC_R_COORD,
      text: `(${a.sx}, ${a.sy})`,
      type: 'coord',
      anchorX: Math.sign(a.nx),
      anchorY: a.ny === 0 ? 1 : Math.sign(a.ny),
    })

    registry.set(`pt::${a.id}`, { calcId: dotId, calcIds: [dotId], numX: a.nx, numY: a.ny, color: ptColor, fadeProps: { pointOpacity: 1 } })
  }

  await Promise.all([
    fadeIn(calc, ['tc_circ'], { lineOpacity: 1 }),
    fadeIn(calc, dotIds,      { pointOpacity: 1 }),
  ])

  // Dashed drop-lines from every point to both axes (no values on the axes —
  // the coordinates are already spelled out on the outer ring). The four
  // quadrantal points are skipped: their projection IS the axis, so drawing
  // it only lays a dashed segment on top of a line that's already there.
  await Promise.all(
    _TC_ANGLES
      .filter(a => a.nx !== 0 && a.ny !== 0)
      .map(a => showAxisProjection(calc, a.id, a.id, { showValues: false }))
  )

  _emitTrigOverlay(overlayItems)
}

export async function removeAxisProjection(calc, id) {
  const e = registry.get(`proj::${id}`)
  if (!e) return
  registry.delete(`proj::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { lineOpacity: 1, pointOpacity: 1 })
}

function findZerosSampled(f, xMin = -10, xMax = 10, n = 2000) {
  const dx  = (xMax - xMin) / n
  const pts = []
  let prev  = null
  for (let i = 0; i <= n; i++) {
    const x = xMin + i * dx
    let v
    try { v = f(x) } catch { prev = null; continue }
    if (!isFinite(v)) { prev = null; continue }
    // A sample landing exactly (or within float noise) on zero IS the root —
    // common for "nice" textbook roots (e.g. x=1, x=3 on a grid stepping by
    // 0.01) — and the sign-change check below can never catch it on its own
    // (prev * 0 is never < 0), silently dropping the root entirely.
    if (Math.abs(v) < 1e-9) {
      if (!pts.length || Math.abs(pts[pts.length - 1] - x) > dx * 1.5) pts.push(+x.toFixed(3))
    } else if (prev !== null && prev * v < 0) {
      const xi = bisect(t => { try { return f(t) } catch { return 0 } }, x - dx, x)
      if (isFinite(xi)) pts.push(+xi.toFixed(3))
    }
    prev = v
  }
  return pts
}
