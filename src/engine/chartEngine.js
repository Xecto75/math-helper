/**
 * Chart Engine — drives a ChartDisplay (fraction circles).
 *
 * Separate from tableEngine on purpose: a table is a grid of cells you fill in,
 * a chart is a quantity you draw. They share the chart panel's slot but nothing
 * else, and the functions that build one are meaningless on the other.
 *
 * The registry mirrors what is on screen so a later step (or a text/equation
 * reference) can read a chart's current value without the caller having to
 * remember what it passed in.
 */
import { resolveColor } from './palette.js'

const registry = new Map()   // id → { kind, num, den, items, ... }

const display = ref => ref?.current

export function getChartIds() {
  return [...registry.keys()]
}

/** The live value behind a chart id — what [id] references resolve through. */
export function getChartValue(id) {
  const e = registry.get(id)
  if (!e) return undefined
  if (e.kind === 'pie') return e.den ? e.num / e.den : 0
  return undefined
}

export function getPieParts(id) {
  const e = registry.get(id)
  return e?.kind === 'pie' ? { num: e.num, den: e.den } : null
}



// ── Pie / fraction circle ───────────────────────────────────────────────────

export async function createPie(chartRef, id, num, den, opts = {}) {
  const d = display(chartRef)
  if (!d?.isReady()) return
  const denN = Math.max(1, Math.round(Number(den) || 1))
  // An improper fraction is allowed through on purpose — see ChartDisplay.
  const numN = Math.max(0, Number(num) || 0)
  const color = opts.color ? resolveColor(opts.color) : '#60a5fa'

  registry.set(id, { kind: 'pie', num: numN, den: denN, color, mode: opts.mode === 'percent' ? 'percent' : 'fraction' })
  await d.pie(id, {
    num: numN, den: denN, color,
    label: opts.label ?? '',
    showValue: opts.showValue !== false,
    mode: opts.mode === 'percent' ? 'percent' : 'fraction',
  })
}

/**
 * Move an existing pie to a new value. Either part can be left blank to keep
 * the one it already has, so "same denominator, one more slice" does not force
 * the caller to restate the denominator it never changed.
 */
// The nested number sets, ℝ down to ℕ. `sets` overrides the default list when a
// lesson wants fewer rings or its own examples.
// A Venn diagram of 2 or 3 sets, empty. What gets shaded is a separate step,
// because a lesson shades one region after another on the SAME diagram.
// A possibility tree: one column per stage, one path per outcome.
export async function createTree(chartRef, id, opts = {}) {
  const d = chartRef?.current
  if (!d) return
  await d.tree(id, opts)
}

// Follow one outcome through the tree, branch by branch. An empty path clears
// the highlight and puts every branch back.
export async function highlightTreePath(chartRef, id, path) {
  const d = chartRef?.current
  if (!d) return
  await d.treePath(id, path)
}

export async function createVenn(chartRef, id, opts = {}) {
  const d = chartRef?.current
  if (!d) return
  await d.venn(id, opts)
}

// Shade the region an expression names. Passing an empty expression clears it.
export async function highlightVenn(chartRef, id, expr, color) {
  const d = chartRef?.current
  if (!d) return
  await d.vennHighlight(id, expr, color)
}

// The elements in each region, as dots: "A:3, AB:2, B:5".
export async function countsVenn(chartRef, id, counts) {
  const d = chartRef?.current
  if (!d) return
  await d.vennCounts(id, counts)
}

export async function createNumberSets(chartRef, id, opts = {}) {
  const d = chartRef?.current
  if (!d) return
  await d.numberSets(id, opts)
}

export async function setPieValue(chartRef, id, num, den) {
  const d = display(chartRef)
  const e = registry.get(id)
  if (!d || e?.kind !== 'pie') return
  const denN = den === '' || den == null ? e.den : Math.max(1, Math.round(Number(den) || e.den))
  const numN = num === '' || num == null ? e.num : Math.max(0, Number(num) || 0)
  registry.set(id, { ...e, num: numN, den: denN })
  await d.setPie(id, numN, denN)
}

/**
 * Rewrite an existing fraction circle as a percentage, or back. The quantity
 * does not change — only how it is written — so nothing about the drawing
 * moves; the number under it is rewritten in place.
 */
export async function setPieMode(chartRef, id, modeRaw) {
  const d = display(chartRef)
  const e = registry.get(id)
  if (!d || e?.kind !== 'pie') return
  const asked = String(modeRaw ?? 'toggle').trim().toLowerCase()
  const mode = asked === 'percent' || asked === 'pourcentage' ? 'percent'
             : asked === 'fraction' ? 'fraction'
             : asked === 'decimal' || asked === 'décimal' || asked === 'decimale' ? 'decimal'
             // toggle walks the three in order rather than flipping two.
             : (e.mode === 'fraction' ? 'percent' : e.mode === 'percent' ? 'decimal' : 'fraction')
  registry.set(id, { ...e, mode })
  await d.setMode(id, mode)
}

/** The value as a percentage, for a text or equation reference. */
export function getPiePercent(id) {
  const e = registry.get(id)
  if (e?.kind !== 'pie' || !e.den) return undefined
  return Number(((e.num / e.den) * 100).toFixed(2))
}


// ── Removal ─────────────────────────────────────────────────────────────────

export async function removeChart(chartRef, id) {
  const d = display(chartRef)
  registry.delete(id)
  if (d) await d.remove(id)
}

export function clearAll(chartRef) {
  registry.clear()
  display(chartRef)?.clearAll()
}
