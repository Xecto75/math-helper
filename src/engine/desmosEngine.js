/**
 * Desmos Engine — drives a DesmosDisplay (Desmos graphing calculator).
 * All functions receive the Desmos calculator instance as first argument.
 * Registry maps logical ids to Desmos expression ids for removal.
 */

const registry = new Map()
let _vp = { left: -10, right: 10, bottom: -7.5, top: 7.5 }

// ── Trig-circle HTML overlay ───────────────────────────────────────────────
const _tcListeners = new Set()
export function onTrigOverlay(fn)  { _tcListeners.add(fn) }
export function offTrigOverlay(fn) { _tcListeners.delete(fn) }
function _emitTrigOverlay(items)   { _tcListeners.forEach(fn => fn(items)) }

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

const FUNC_COLORS = ['#7c6ef5', '#22c55e', '#f87171', '#fbbf24', '#06b6d4', '#f97316', '#f472b6']

export async function plotFunction(calc, id, expr, opts = {}) {
  const color     = opts.color ? rgbToHex(opts.color) : FUNC_COLORS[getFunctionIds().length % FUNC_COLORS.length]
  const lineWidth = opts.thickness ?? 3
  calc.setExpression({ id: `fn_${id}`, latex: expr, color, lineWidth, lineOpacity: 0 })
  registry.set(`fn::${id}`, { calcId: `fn_${id}`, expr, color, lineWidth, fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, [`fn_${id}`], { lineOpacity: 1 })
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
  const color   = opts.color ? rgbToHex(opts.color) : darken(e1.color, 0.7)
  // Search across the full visible viewport + 20% margin on each side
  const span    = _vp.right - _vp.left
  const margin  = span * 0.2
  const pts     = findIntersectionsSampled(e1.expr, e2.expr, _vp.left - margin, _vp.right + margin)
  const calcIds = pts.map(([x, y], i) => {
    const cId = `int_${id}_${i}`
    calc.setExpression({
      id: cId, latex: `(${x},${y})`, color,
      showLabel: true, label: `(${x}, ${y})`, pointSize: 15, pointOpacity: 0,
    })
    return cId
  })
  registry.set(`int::${id}`, { calcIds, f1Id, f2Id, fadeProps: { pointOpacity: 1 } })
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

export async function addPoint(calc, id, x, y, opts = {}) {
  // Color priority: a referenced function's color (darker on screen) → explicit color → default.
  let color
  if (opts.funcId) {
    const fn = registry.get(`fn::${opts.funcId}`)
    color = fn ? lighten(fn.color, 0.4) : '#f87171'
  } else if (opts.color) {
    color = Array.isArray(opts.color) ? rgbToHex(opts.color) : opts.color
  } else {
    color = '#f87171'
  }
  const cId  = `pt_${id}`
  const latX = toDesmos(x)
  const latY = toDesmos(y)
  const numX = evalMathExpr(x)
  const numY = evalMathExpr(y)
  if (!isFinite(numX) || !isFinite(numY)) return

  const calcIds = [cId]

  if (opts.showCoords) {
    // Dot has no label — angle and coords shown as separate floating labels
    calc.setExpression({ id: cId, latex: `(${latX},${latY})`, color, showLabel: false, pointOpacity: 0 })

    // Angle label slightly inside the circle (0.65× toward center)
    if (opts.label) {
      const inId = `pt_in_${id}`
      const inX  = +(numX * 0.65).toFixed(6)
      const inY  = +(numY * 0.65).toFixed(6)
      calc.setExpression({ id: inId, latex: `(${inX},${inY})`, color,
        showLabel: true, label: opts.label, pointSize: 1, pointOpacity: 0 })
      calcIds.push(inId)
    }

    // Coordinate label slightly outside (1.4×)
    const outId  = `pt_out_${id}`
    const outX   = +(numX * 1.4).toFixed(6)
    const outY   = +(numY * 1.4).toFixed(6)
    const xLbl   = toUnicodeLabel(x)
    const yLbl   = toUnicodeLabel(y)
    calc.setExpression({ id: outId, latex: `(${outX},${outY})`, color,
      showLabel: true, label: `(${xLbl}, ${yLbl})`, pointSize: 1, pointOpacity: 0 })
    calcIds.push(outId)
  } else {
    calc.setExpression({
      id: cId, latex: `(${latX},${latY})`, color,
      showLabel: !!opts.label, label: opts.label ?? '', pointOpacity: 0,
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
  for (let i = 0; i < n; i++) {
    const x = lo + Math.random() * (hi - lo)
    const noise = (Math.random() * 2 - 1) * spread
    const y = slope * x + intercept + noise
    pairs.push(`(${x.toFixed(3)},${y.toFixed(3)})`)
  }

  const cId = `sc_${id}`
  calc.setExpression({
    id: cId, latex: pairs.join(','), color,
    pointSize: 8, pointOpacity: 0,
  })
  registry.set(`sc::${id}`, { calcId: cId, fadeProps: { pointOpacity: 1 } })
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
  const color = opts.color ? rgbToHex(opts.color) : '#60a5fa'
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
  const color      = colorRaw ? rgbToHex(colorRaw) : '#a855f7'
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
  const color = opts.color ? rgbToHex(opts.color) : '#f87171'
  const cId   = `vl_${id}`
  calc.setExpression({ id: cId, latex: `x=${xVal}`, color, lineWidth: 2, lineOpacity: 0 })
  registry.set(`vl::${id}`, { calcId: cId, fadeProps: { lineOpacity: 1 } })
  await fadeIn(calc, [cId], { lineOpacity: 1 })
}

export async function addHorizontalLine(calc, id, y, opts = {}) {
  const color = opts.color ? rgbToHex(opts.color) : '#f87171'
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
  const color = opts.color ? rgbToHex(opts.color) : '#f87171'
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
  registry.clear()
  _vp = { left: -10, right: 10, bottom: -7.5, top: 7.5 }
  calc.setBlank()
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

export function nameFunc(calc, id, funcId, label, x, y, opts = {}) {
  const fn = registry.get(`fn::${funcId}`)
  if (!fn) return
  let yVal = y
  if (yVal === undefined || yVal === null || !isFinite(yVal)) {
    const f = makeEval(fn.expr)
    if (!f) return
    try { yVal = f(x) } catch { return }
    if (!isFinite(yVal)) return
  }
  const color = opts.color ? rgbToHex(opts.color) : darken(fn.color, 0.7)
  const cId   = `lbl_${id}`
  calc.setExpression({
    id: cId, latex: `(${x},${+yVal.toFixed(6)})`,
    color, showLabel: true, label: _fmtLabel(label), hidden: true,
  })
  registry.set(`lbl::${id}`, { calcId: cId, funcId })
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

function makeEval(expr) {
  try {
    const js = expr
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
  const ptColor   = '#f87171'

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
    if (prev !== null && prev * v < 0) {
      const xi = bisect(t => { try { return f(t) } catch { return 0 } }, x - dx, x)
      if (isFinite(xi)) pts.push(+xi.toFixed(3))
    }
    prev = v
  }
  return pts
}
