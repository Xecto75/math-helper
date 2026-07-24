/**
 * Desmos Engine — drives a DesmosDisplay (Desmos graphing calculator).
 * All functions receive the Desmos calculator instance as first argument.
 * Registry maps logical ids to Desmos expression ids for removal.
 */
import { parse } from 'mathjs'

const registry = new Map()
let _vp = { left: -10, right: 10, bottom: -7.5, top: 7.5 }

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
export function getLiveEquationText(funcId) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn?.template) return null
  const names = extractSliderVars(fn.template)
  if (!names.length) return null
  let disp = fn.template
  for (const name of names) {
    const s   = sliders.get(name)
    const val = s ? formatSliderNum(s.value) : name
    disp = disp.split(`|${name}|`).join(val)
  }
  const latex = disp
    .replace(/\*/g, '')
    .replace(/\^(-?\d+(\.\d+)?)/g, '^{$1}')
    .replace(/\+\s*-/g, '- ')
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

function registerSlider(calc, name) {
  if (sliders.has(name)) return
  const s = { value: 1, min: -10, max: 10, step: 0.1 }
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
function lighten(hex, factor = 0.4) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const L = c => Math.round(c + (255 - c) * factor)
  return rgbToHex([L(r), L(g), L(b)])
}

// ── Fade helpers ──────────────────────────────────────────────────────────────

const FADE_MS = 380
const easeIO = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t) * t

// Animate opacity props from 0 → target values, then resolve.
function fadeIn(calc, ids, props, ms = FADE_MS) {
  if (!ids.length) return Promise.resolve()
  return new Promise(resolve => {
    const t0 = performance.now()
    ;(function tick() {
      const p = Math.min((performance.now() - t0) / ms, 1)
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
      const p = Math.min((performance.now() - t0) / ms, 1)
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

// ── Graph functions ───────────────────────────────────────────────────────────

const FUNC_COLORS = ['#7c6ef5', '#22c55e', '#60a5fa', '#fbbf24', '#06b6d4', '#f97316', '#f472b6']

export async function plotFunction(calc, id, expr, opts = {}) {
  const sliderVars = extractSliderVars(expr)
  const cleanExpr  = stripSliderPipes(expr)
  sliderVars.forEach(name => registerSlider(calc, name))
  const color     = opts.color ? rgbToHex(opts.color) : FUNC_COLORS[getFunctionIds().length % FUNC_COLORS.length]
  const lineWidth = opts.thickness ?? 3
  calc.setExpression({ id: `fn_${id}`, latex: cleanExpr, color, lineWidth, lineOpacity: 0 })
  // hasSliders marks this as a "drag to explore" curve — its shape is meant to
  // keep changing, so any label on it (getVisibilityAnchors) must never lock
  // the camera onto whatever position happened to be true when it was first
  // drawn (see ensureVisible).
  registry.set(`fn::${id}`, { calcId: `fn_${id}`, expr: cleanExpr, template: expr, color, lineWidth, hasSliders: sliderVars.length > 0, fadeProps: { lineOpacity: 1 } })
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
  await fadeIn(calc, [`fn_${id}`], { lineOpacity: 1 })
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
  return { slope, intercept }
}

export async function removeFunction(calc, id) {
  const toFadeOut = []

  const e = registry.get(`fn::${id}`)
  if (e) {
    toFadeOut.push({ ids: [e.calcId], props: e.fadeProps ?? { lineOpacity: 1 } })
    registry.delete(`fn::${id}`)
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
  const color   = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const fillOp  = opts.fillOpacity ?? 0.4
  const areaId  = `area_${id}`
  const vaId    = `area_va_${id}`
  const vbId    = `area_vb_${id}`
  const latex   = `y\\le\\left(${fn.expr}\\right)\\left\\{${a}\\le x\\le${b}\\right\\}\\left\\{y\\ge0\\right\\}`
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
  calc.setExpression({ id: fn.calcId, latex: fn.expr, color: fn.color, lineWidth: fn.lineWidth, lineOpacity: 1 })
  await fadeIn(calc, [areaId, vaId, vbId], { fillOpacity: fillOp, lineOpacity: 1 })
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
function toDesmos(expr) {
  if (expr == null) return ''
  let s = String(expr).trim()
  s = s.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
  s = s.replace(/\bpi\b/gi, '\\pi')
  // a/b → \frac{a}{b}  (handles -\sqrt{x}/n, \sqrt{x}/n, -n/m, n/m)
  s = s.replace(
    /(-?(?:\\sqrt\{[^}]+\}|\\pi|\d+(?:\.\d+)?))\/(\d+(?:\.\d+)?)/g,
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
  // Color priority: a referenced function's color (darker on screen) → explicit color → default.
  let color
  if (opts.funcId) {
    const fn = registry.get(`fn::${opts.funcId}`)
    color = fn ? lighten(fn.color, 0.4) : '#60a5fa'
  } else if (opts.color) {
    color = Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color
  } else {
    color = '#60a5fa'
  }
  const cId  = `pt_${id}`
  const latX = toDesmos(x)
  const latY = toDesmos(y)
  const numX = evalMathExpr(x)
  const numY = evalMathExpr(y)
  if (!isFinite(numX) || !isFinite(numY)) return

  const calcIds = [cId]

  if (opts.showCoords) {
    // Coordinate label sits directly on the point with a fixed screen-space
    // orientation (always to its right, tight against the dot) — not offset
    // radially from the origin (only reads sensibly for a trig-circle-style
    // point near the center, scatters badly for a general point far from
    // it), and not via a separately-positioned phantom point either — that
    // stacked with Desmos's own labelOrientation push and ended up far from
    // the dot. 'right' alone is the verified-reliable, tight option.
    const xLbl = toUnicodeLabel(x)
    const yLbl = toUnicodeLabel(y)
    calc.setExpression({ id: cId, latex: `(${latX},${latY})`, color,
      showLabel: true, label: `(${xLbl}, ${yLbl})`, labelOrientation: 'right', pointOpacity: 0 })

    // Angle label slightly inside the circle (0.65× toward center) — this one
    // legitimately wants to radiate from the origin (trig-circle angle call-outs).
    if (opts.label) {
      const inId = `pt_in_${id}`
      const inX  = +(numX * 0.65).toFixed(6)
      const inY  = +(numY * 0.65).toFixed(6)
      calc.setExpression({ id: inId, latex: `(${inX},${inY})`, color,
        showLabel: true, label: formatPointLabel(opts.label), pointSize: 1, pointOpacity: 0 })
      calcIds.push(inId)
    }
  } else {
    calc.setExpression({
      id: cId, latex: `(${latX},${latY})`, color,
      showLabel: !!opts.label, label: formatPointLabel(opts.label), pointOpacity: 0,
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
export async function addSegment(calc, id, x1, y1, x2, y2, opts = {}) {
  const color = opts.color ? (Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color) : '#60a5fa'
  const cId   = `seg_${id}`
  calc.setExpression({ id: cId, latex: makeSegment(x1, y1, x2, y2), color, lineWidth: opts.thickness ?? 3, lineOpacity: 0 })
  registry.set(`seg::${id}`, { x1, y1, x2, y2, calcId: cId, fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, [cId], { lineOpacity: 1 })
}

export async function removeSegment(calc, id) {
  const e = registry.get(`seg::${id}`)
  if (!e) return
  registry.delete(`seg::${id}`)
  await fadeOut(calc, [e.calcId], e.fadeProps ?? { lineOpacity: 1 })
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

export async function markRoots(calc, id, funcId, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return []
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

export async function plotDerivative(calc, id, funcId, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return
  const color     = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const lineWidth = opts.thickness ?? 2
  const latex     = `\\frac{d}{dx}\\left(${fn.expr}\\right)`
  calc.setExpression({ id: `deriv_${id}`, latex, color, lineWidth, lineOpacity: 0 })
  registry.set(`deriv::${id}`, { calcId: `deriv_${id}`, funcId, fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, [`deriv_${id}`], { lineOpacity: 1 })
}

export async function removeDerivative(calc, id) {
  const e = registry.get(`deriv::${id}`)
  if (!e) return
  registry.delete(`deriv::${id}`)
  await fadeOut(calc, [e.calcId], e.fadeProps ?? { lineOpacity: 1 })
}

export async function riemannSum(calc, id, funcId, a, b, n, method = 'midpoint', opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return
  const f = makeEval(fn.expr)
  if (!f) return
  const color   = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const fillOp  = opts.fillOpacity ?? 0.5
  const nClamp  = Math.max(1, Math.min(n, 50))
  const dx      = (b - a) / nClamp
  const calcIds = []
  for (let i = 0; i < nClamp; i++) {
    const xi  = a + i * dx
    const xi1 = xi + dx
    const xS  = method === 'left' ? xi : method === 'right' ? xi1 : (xi + xi1) / 2
    let height
    try { height = f(xS) } catch { continue }
    if (!isFinite(height)) continue
    const cId   = `riemann_${id}_${i}`
    const xL    = +xi.toFixed(8)
    const xR    = +xi1.toFixed(8)
    const h     = +height.toFixed(8)
    const latex = h >= 0
      ? `0\\le y\\le${h}\\left\\{${xL}\\le x\\le${xR}\\right\\}`
      : `${h}\\le y\\le0\\left\\{${xL}\\le x\\le${xR}\\right\\}`
    calc.setExpression({ id: cId, latex, color, fillOpacity: 0, lineOpacity: 0, lineWidth: 1 })
    calcIds.push(cId)
  }
  registry.set(`riemann::${id}`, { calcIds, funcId, fadeProps: { fillOpacity: fillOp, lineOpacity: 1 } })
  // Re-add the function curve on top
  calc.removeExpression({ id: fn.calcId })
  calc.setExpression({ id: fn.calcId, latex: fn.expr, color: fn.color, lineWidth: fn.lineWidth, lineOpacity: 1 })
  await fadeIn(calc, calcIds, { fillOpacity: fillOp, lineOpacity: 1 })
}

export async function removeRiemannSum(calc, id) {
  const e = registry.get(`riemann::${id}`)
  if (!e) return
  registry.delete(`riemann::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { fillOpacity: 0.5, lineOpacity: 1 })
}

export async function drawVector(calc, id, x1, y1, x2, y2, opts = {}) {
  const color = opts.color ? rgbToHex(opts.color) : '#60a5fa'
  const lw    = opts.thickness ?? 2
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx*dx + dy*dy)
  if (len < 1e-9) return
  const ux = dx/len, uy = dy/len
  const ARROW = Math.min(len * 0.25, 0.8)
  const WING  = ARROW * 0.45
  const px = -uy, py = ux
  const w1x = x2 - ARROW*ux + WING*px,  w1y = y2 - ARROW*uy + WING*py
  const w2x = x2 - ARROW*ux - WING*px,  w2y = y2 - ARROW*uy - WING*py
  const shaftId = `vec_s_${id}`
  const w1Id    = `vec_w1_${id}`
  const w2Id    = `vec_w2_${id}`
  calc.setExpression({ id: shaftId, latex: makeSegment(x1, y1, x2, y2), color, lineWidth: lw, lineOpacity: 0 })
  calc.setExpression({ id: w1Id,    latex: makeSegment(x2, y2, w1x, w1y), color, lineWidth: lw, lineOpacity: 0 })
  calc.setExpression({ id: w2Id,    latex: makeSegment(x2, y2, w2x, w2y), color, lineWidth: lw, lineOpacity: 0 })
  registry.set(`vec::${id}`, { calcIds: [shaftId, w1Id, w2Id], fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, [shaftId, w1Id, w2Id], { lineOpacity: 1 })
}

export async function removeVector(calc, id) {
  const e = registry.get(`vec::${id}`)
  if (!e) return
  registry.delete(`vec::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { lineOpacity: 1 })
}

// Mark the angle ABC (vertex at B) with an arc + measured-degrees label.
// If the angle is ~90° it draws a right-angle square instead of an arc.
// The measure is computed from the points — the label is always correct.
export async function drawAngle(calc, id, ax, ay, bx, by, cx, cy, opts = {}) {
  const color = Array.isArray(opts.color) ? rgbToHex(opts.color) : (opts.color || '#fbbf24')
  const r  = opts.radius ?? 1
  const f  = n => +Number(n).toFixed(6)
  const t1 = Math.atan2(ay - by, ax - bx)
  const t2 = Math.atan2(cy - by, cx - bx)
  let diff = t2 - t1
  while (diff >   Math.PI) diff -= 2 * Math.PI
  while (diff <= -Math.PI) diff += 2 * Math.PI
  const deg     = Math.abs(diff) * 180 / Math.PI
  const isRight = Math.abs(deg - 90) < 0.5
  const ids = []

  if (isRight) {
    // right-angle square corner
    const s  = r * 0.55
    const p1 = [bx + s * Math.cos(t1), by + s * Math.sin(t1)]
    const p2 = [bx + s * Math.cos(t2), by + s * Math.sin(t2)]
    const cn = [bx + s * (Math.cos(t1) + Math.cos(t2)), by + s * (Math.sin(t1) + Math.sin(t2))]
    const s1 = `ang_s1_${id}`, s2 = `ang_s2_${id}`
    calc.setExpression({ id: s1, latex: makeSegment(p1[0], p1[1], cn[0], cn[1]), color, lineWidth: 2.5, lineOpacity: 0 })
    calc.setExpression({ id: s2, latex: makeSegment(p2[0], p2[1], cn[0], cn[1]), color, lineWidth: 2.5, lineOpacity: 0 })
    ids.push(s1, s2)
  } else {
    const arcId = `ang_arc_${id}`
    const latex = `\\left(${f(bx)}+${f(r)}\\cos\\left(${f(t1)}+${f(diff)}t\\right),\\ ${f(by)}+${f(r)}\\sin\\left(${f(t1)}+${f(diff)}t\\right)\\right)`
    calc.setExpression({ id: arcId, latex, parametricDomain: { min: '0', max: '1' }, color, lineWidth: 2.5, lineOpacity: 0 })
    ids.push(arcId)
  }

  // measured-degrees label on the bisector
  const lblId = `ang_lbl_${id}`
  const lr = r * (isRight ? 1.9 : 1.55)
  const lx = bx + lr * Math.cos(t1 + diff / 2)
  const ly = by + lr * Math.sin(t1 + diff / 2)
  calc.setExpression({
    id: lblId, latex: `(${f(lx)},${f(ly)})`, color,
    showLabel: true, label: opts.label ?? `${+deg.toFixed(1)}°`,
    pointOpacity: 0, pointSize: 1,
  })

  registry.set(`ang::${id}`, { calcIds: [...ids, lblId], fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, ids, { lineOpacity: 1 })
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
      calc.setExpression({ id: cId, latex: exprAt(easeIO(p)) })
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  // Commit the transformed expression as the curve's new definition
  fn.expr = exprAt(1)
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

export function adjustView(calc, cx = 0, cy = 0, range = 10) {
  // 'range' = vertical (y) span. x is derived from pixel ratio so 1 unit = same size on both axes.
  const hy = range / 2
  let pw = 0, ph = 0
  try {
    const pc = calc.graphpaperBounds?.pixelCoordinates
    if (pc) { pw = Math.abs(pc.right - pc.left); ph = Math.abs(pc.bottom - pc.top) }
  } catch {}
  if (!pw || !ph) {
    pw = calc.elt?.clientWidth  || 800
    ph = calc.elt?.clientHeight || 600
  }
  const hx = hy * (pw / ph)
  const from = { ..._vp }
  _vp = { left: cx - hx, right: cx + hx, bottom: cy - hy, top: cy + hy }
  return animateViewport(calc, from, _vp)
}

export function setViewport(calc, xMin, xMax, yMin, yMax) {
  const from = { ..._vp }
  _vp = { left: xMin, right: xMax, bottom: yMin, top: yMax }
  return animateViewport(calc, from, _vp)
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
  // A single point (or several coincident ones) has a zero-size box —
  // give it a sane minimum span instead of zooming in to a single pixel.
  const spanX = Math.max(maxX - minX, 4)
  const spanY = Math.max(maxY - minY, 3)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  let pw = 0, ph = 0
  try {
    const pc = calc.graphpaperBounds?.pixelCoordinates
    if (pc) { pw = Math.abs(pc.right - pc.left); ph = Math.abs(pc.bottom - pc.top) }
  } catch {}
  if (!pw || !ph) {
    pw = calc.elt?.clientWidth  || 800
    ph = calc.elt?.clientHeight || 600
  }
  const aspect = pw / ph

  // Pad 30% beyond the tight bounding box so placed points sit comfortably
  // inside the frame instead of right at its edge, then stretch whichever
  // axis is cramped relative to the container's aspect ratio — never
  // shrink the other axis, so nothing that already fit stops fitting.
  let halfX = (spanX / 2) * 1.3
  let halfY = (spanY / 2) * 1.3
  if (halfX / halfY < aspect) halfX = halfY * aspect
  else halfY = halfX / aspect

  const from = { ..._vp }
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
  _vp = { left: -10, right: 10, bottom: -7.5, top: 7.5 }
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
  const f = makeEval(fn.expr)
  if (!f) return

  let x0 = isFinite(x) ? x : null
  let orientation = 'above'

  if (x0 === null) {
    // No x given — start from the current viewport's own center (so the
    // label lands in view without needing a re-adjust) and, only for this
    // auto-picked case, nudge sideways if that spot would sit too close to
    // another function's label already on screen — an explicit x from the
    // caller is never overridden, even if it happens to collide.
    const vp = getViewport()
    const spanX = (vp.right - vp.left) || 8
    const centerX = (vp.left + vp.right) / 2
    const { px: ppx, py: ppy } = pixelsPerUnit(calc)
    // A rendered label can be 1-3 lines tall (see the |-separator newline
    // support) — plain anchor-to-anchor distance needs real headroom above
    // a single line's height, or two labels whose anchors are "far enough"
    // by this metric can still have their actual text boxes overlapping.
    const minDistPx = 90
    const others = [...registry.entries()]
      .filter(([k]) => k.startsWith('lbl::'))
      .map(([, e]) => e)

    const offsets = [0, 0.12, -0.12, 0.22, -0.22, 0.32, -0.32, 0.42, -0.42]
    let best = null
    for (const frac of offsets) {
      const candX = centerX + frac * spanX
      let candY
      try { candY = f(candX) } catch { continue }
      if (!isFinite(candY)) continue
      const dist = others.length
        ? Math.min(...others.map(o => Math.hypot((candX - o.x) * ppx, (candY - o.y) * ppy)))
        : Infinity
      if (!best || dist > best.dist) best = { x: candX, y: candY, dist }
      if (dist >= minDistPx) break
    }
    x0 = best ? best.x : centerX

    // Sliding along x still couldn't clear the threshold — two near-parallel
    // curves keep the same gap everywhere no matter which x is picked — so
    // flip which side of the curve the text renders on, away from whichever
    // existing label ended up closest, as a second, independent lever.
    if (best && best.dist < minDistPx && others.length) {
      const nearest = others.reduce((a, b) =>
        Math.hypot((x0 - a.x) * ppx, (best.y - a.y) * ppy) <
        Math.hypot((x0 - b.x) * ppx, (best.y - b.y) * ppy) ? a : b)
      orientation = nearest.y > best.y ? 'below' : 'above'
    }
  }

  let yVal = y
  if (yVal === undefined || yVal === null || !isFinite(yVal)) {
    try { yVal = f(x0) } catch { return }
    if (!isFinite(yVal)) return
  }
  const color = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const cId   = `lbl_${id}`
  calc.setExpression({
    id: cId, latex: `(${x0},${+yVal.toFixed(6)})`,
    color, showLabel: true, label: _fmtLabel(label), labelOrientation: orientation, hidden: true,
  })
  registry.set(`lbl::${id}`, { calcId: cId, funcId, x: x0, y: yVal })
}

export function removeNameFunc(calc, id) {
  const e = registry.get(`lbl::${id}`)
  if (e) { calc.removeExpression({ id: e.calcId }); registry.delete(`lbl::${id}`) }
}

export async function tangent(calc, id, funcId, x, y, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return
  const f = makeEval(fn.expr)
  if (!f) return

  const xT = findNearestX(f, x)
  if (xT === null) return

  let yT = y
  if (yT === undefined || yT === null || !isFinite(yT)) {
    try { yT = f(xT) } catch { return }
    if (!isFinite(yT)) return
  }

  const H = 1e-5
  let slope
  try { slope = (f(xT + H) - f(xT - H)) / (2 * H) } catch { return }
  if (!isFinite(slope)) return

  const b       = yT - slope * xT
  const slopeStr = slope.toFixed(8)
  const bStr     = b >= 0 ? `+${b.toFixed(8)}` : b.toFixed(8)
  const lineLatex = `${slopeStr}x${bStr}`

  const color  = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const lineId = `tan_line_${id}`
  const ptId   = `tan_pt_${id}`

  calc.setExpression({ id: lineId, latex: lineLatex, color, lineWidth: 2, lineOpacity: 0 })
  calc.setExpression({
    id: ptId, latex: `(${xT},${+yT.toFixed(6)})`,
    color, showLabel: true, label: `(${xT.toFixed(2)}, ${yT.toFixed(2)})`, pointSize: 8, pointOpacity: 0,
  })
  registry.set(`tan::${id}`, { calcIds: [lineId, ptId], funcId, fadeProps: { lineOpacity: 1, pointOpacity: 1 } })
  await fadeIn(calc, [lineId, ptId], { lineOpacity: 1, pointOpacity: 1 })
}

export async function removeTangent(calc, id) {
  const e = registry.get(`tan::${id}`)
  if (!e) return
  registry.delete(`tan::${id}`)
  await fadeOut(calc, e.calcIds, e.fadeProps ?? { lineOpacity: 1, pointOpacity: 1 })
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function findNearestX(f, x0) {
  try { const v = f(x0); if (isFinite(v)) return x0 } catch {}
  for (let i = 1; i <= 200; i++) {
    const dx = i * 0.05
    for (const candidate of [x0 + dx, x0 - dx]) {
      try { const v = f(candidate); if (isFinite(v)) return candidate } catch {}
    }
  }
  return null
}

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
    .replace(/\\sin\b/g, 'Math.sin')
    .replace(/\\cos\b/g, 'Math.cos')
    .replace(/\\tan\b/g, 'Math.tan')
    .replace(/\\sqrt\{([^}]*)\}/g, 'Math.sqrt($1)')
    .replace(/\\sqrt\b/g, 'Math.sqrt')
    .replace(/\\ln\b/g, 'Math.log')
    .replace(/\\exp\b/g, 'Math.exp')
    .replace(/\\pi\b/g, 'Math.PI')
    .replace(/\\cdot\b/g, '*')
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
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs')
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
function makeImplicitEval(expr) {
  const eqIdx = expr.indexOf('=')
  if (eqIdx < 0) return null
  try {
    const lhsJs = toJsExpr(expr.slice(0, eqIdx).trim())
    const rhsJs = toJsExpr(expr.slice(eqIdx + 1).trim())
    const residual = new Function('x', 'y', `"use strict"; return (${lhsJs}) - (${rhsJs})`)
    return (x) => {
      const g0 = residual(x, 0)
      const g1 = residual(x, 1)
      const k  = g1 - g0
      if (!isFinite(k) || Math.abs(k) < 1e-9) return NaN
      return -g0 / k
    }
  } catch { return null }
}

function makeEval(expr) {
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

export async function showAxisProjection(calc, id, pointId, opts = {}) {
  const pt = registry.get(`pt::${pointId}`)
  if (!pt) return
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

export async function drawTrigCircle(calc) {
  const circColor = '#7c6ef5'
  const ptColor   = '#60a5fa'

  _emitTrigOverlay([]) // clear previous overlay immediately
  await adjustView(calc, 0, 0, 5.5)

  calc.setExpression({ id: 'tc_circ', latex: 'x^2+y^2=1', color: circColor, lineWidth: 3, lineOpacity: 0 })
  registry.set('fn::tc_circ', { calcId: 'tc_circ', expr: 'x^2+y^2=1', color: circColor, lineWidth: 3, fadeProps: { lineOpacity: 1 } })

  const dotIds = []
  const overlayItems = []

  for (let i = 0; i < _TC_ANGLES.length; i++) {
    const a = _TC_ANGLES[i]
    const xF = +a.nx.toFixed(8)
    const yF = +a.ny.toFixed(8)

    const dotId = `tc_dot_${a.id}`
    calc.setExpression({ id: dotId, latex: `(${xF},${yF})`, color: ptColor, showLabel: false, pointSize: 9, pointOpacity: 0 })
    dotIds.push(dotId)

    // Inner angle labels — alternating radius so adjacent labels don't overlap
    const innerR = i % 2 === 0 ? 0.65 : 0.50
    overlayItems.push({ id: `ang_${a.id}`, mathX: a.nx * innerR, mathY: a.ny * innerR, text: a.deg, type: 'angle' })

    // Outer coord labels — staggered radius to separate adjacent labels
    const outerR = i % 2 === 0 ? 1.55 : 2.0
    overlayItems.push({ id: `crd_${a.id}`, mathX: a.nx * outerR, mathY: a.ny * outerR, text: `(${a.sx}, ${a.sy})`, type: 'coord' })

    registry.set(`pt::${a.id}`, { calcId: dotId, calcIds: [dotId], numX: a.nx, numY: a.ny, color: ptColor, fadeProps: { pointOpacity: 1 } })
  }

  await Promise.all([
    fadeIn(calc, ['tc_circ'], { lineOpacity: 1 }),
    fadeIn(calc, dotIds,      { pointOpacity: 1 }),
  ])

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
