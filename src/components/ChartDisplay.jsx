import { useImperativeHandle, forwardRef, useState, useRef, useMemo } from 'react'
import { animMs } from '../engine/animSpeed.js'

/**
 * ChartDisplay — fraction circles.
 *
 * Shares the chart panel's slot with TableDisplay, the same way DivisionDisplay
 * shares the equation slot: a page shows a table OR a chart, and which one is
 * visible is CSS. Both stay mounted so their refs are live before a step calls
 * them.
 *
 * Every visible quantity is a NUMBER held in state and drawn from scratch each
 * frame — never a CSS transition on a path. A fraction going from 3/8 to 5/8
 * has to sweep through 3.4/8 and 4.7/8, and only an animated value does that;
 * transitioning a `d` attribute would jump.
 */

const SVG_W = 800
const SVG_H = 600
const TAU   = Math.PI * 2

// Slow at both ends — for a value sliding to a new one.
const easeIO = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
// Fast then settling — for something arriving.
const easeOut = t => 1 - Math.pow(1 - t, 3)

const lerp = (a, b, t) => a + (b - a) * t

// How long each beat of a pie build lasts. Kept together because they are one
// pace, not five independent numbers — the sum at the end is deliberately the
// slowest: it is the step where the separate tallies become one fraction, and
// that is the moment the whole animation exists to make.
// One ring, then its label and examples, then the next ring in.
const SETS_MS = { appear: 420, ring: 620 }

// The three ways one quantity gets written under a pie. Order is the cycle
// "toggle" walks, and it is the order a lesson meets them in.
const PIE_MODES = ['fraction', 'percent', 'decimal']

const PIE_MS = {
  appear: 460,   // the first circle arriving
  expand: 480,   // the row growing by one, existing circles sliding over
  fill:   620,   // one circle filling
  sum:   1100,   // the tallies adding up into the fraction
  change: 820,   // setPie — a value being corrected, not built
  swap:   760,   // fraction ⇄ percent — the same value, written the other way
}

/** Point on a circle, starting at 12 o'clock and going clockwise. */
function polar(cx, cy, r, turns) {
  const a = turns * TAU - Math.PI / 2
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/**
 * A wedge from 12 o'clock clockwise through `turns` of a full circle.
 * A full circle cannot be drawn as one arc (start and end coincide, and the
 * arc collapses to nothing), so it is drawn as two half-arcs instead.
 */
function wedgePath(cx, cy, r, turns) {
  const t = Math.max(0, Math.min(1, turns))
  if (t <= 0) return ''
  if (t >= 1) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`
  }
  const [x0, y0] = polar(cx, cy, r, 0)
  const [x1, y1] = polar(cx, cy, r, t)
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${t > 0.5 ? 1 : 0} 1 ${x1} ${y1} Z`
}

// Where a chart sits when the panel holds more than one: a single one owns the
// panel, several share a row. Computed at render so adding one re-places them
// all, instead of the first keeping a position meant for a panel it no longer
// has to itself. Each fits itself to the slot width it is handed.
function placement(index, count) {
  const slotW = count <= 1 ? SVG_W : SVG_W / count
  return {
    cx: count <= 1 ? SVG_W / 2 : slotW * (index + 0.5),
    cy: SVG_H / 2 - 10,
    slotW,
  }
}

// ── Number sets ──────────────────────────────────────────────────────────────
// The nesting IS the lesson: every natural number is an integer, every integer
// a decimal, and so on out to the reals. Drawn as rings inside one another
// rather than as a list, because a list can be memorised without ever seeing
// that the sets contain each other.
//
// Each ring is smaller AND pushed left of the one around it, which opens a band
// down its right-hand side. That band is where its own examples live — the
// numbers that belong to this set and to no smaller one. Concentric rings would
// have left nowhere to put them.
const NUMBER_SETS = [
  { key: 'R', symbol: 'ℝ', name: 'Réels',      examples: ['π', '√2', '−1,414…'] },
  { key: 'Q', symbol: 'ℚ', name: 'Rationnels', examples: ['5/3', '−1/7'] },
  { key: 'D', symbol: '𝔻', name: 'Décimaux',   examples: ['0,5', '1,32'] },
  { key: 'Z', symbol: 'ℤ', name: 'Entiers',    examples: ['−5', '−2145'] },
  { key: 'N', symbol: 'ℕ', name: 'Naturels',   examples: ['12', '1584'] },
]

// Outermost is darkest, and every step of the ramp stays dark. The labels are
// drawn in the interface grey, and grey sits in the middle of the range: it
// disappears against anything of its own weight, which is exactly what the
// earlier mid-blue was. Keeping the whole ramp well below the text means the
// same grey holds on all five rings instead of on four of them.
const SET_FILL = ['#10233f', '#152c4e', '#1a3660', '#1f3a6a', '#24457c']

// Geometry of ring i, outermost first.
function ringAt(i, n, cx, cy) {
  const RX = 350, RY = 232
  const k  = i / Math.max(1, n)
  const rx = RX * (1 - k * 0.82)
  const ry = RY * (1 - k * 0.80)
  // Left edges nearly aligned, so all the freed room opens on the right.
  return { cx: cx - (RX - rx) * 0.66, cy, rx, ry }
}

// ── Venn ─────────────────────────────────────────────────────────────────────
// Two or three sets, and no more on purpose: with four circles there is no
// arrangement where every combination of memberships has its own region, so a
// four-set "Venn" silently drops regions and teaches something false.
//
// Everything is drawn from the CELLS — the 2^n regions of the diagram — rather
// than from the circles. A cell is one answer to "in or out of each set", so
// any expression a lesson can write (A∩B, A', (A∪B)') is just the set of cells
// that satisfy it, and the same code shades all of them.
const VENN_MS = { appear: 520, shade: 430, dots: 620 }

// ── Elements in the regions ──────────────────────────────────────────────────
// "A:3 AB:2 B:5" — how many elements each region holds. A key is the sets an
// element belongs to, so "AB" is the overlap and "A" is A alone; "U" (or "-")
// is the rest of the universe, outside every circle. A count is read into the
// same cell number the shading uses: bit b set = inside circle b.
function parseVennCounts(raw, sets) {
  const names = sets.map(s => String(s).trim().toUpperCase())
  const out = []
  for (const piece of String(raw ?? '').split(/[,;\n]+/)) {
    const m = /^\s*([^:=]+)[:=]\s*(\d+)\s*$/.exec(piece)
    if (!m) continue
    const key = m[1].replace(/[\s∩&·]/g, '').toUpperCase()
    // A region drawn with more dots than anyone can count is not a diagram.
    const n = Math.min(parseInt(m[2], 10), 60)
    if (!n || !key) continue
    if (['U', '-', 'NONE', 'OUT', 'OUTSIDE'].includes(key)) { out.push({ cell: 0, n }); continue }
    let cell = 0, rest = key
    names.forEach((name, i) => { if (rest.includes(name)) { cell |= 1 << i; rest = rest.replace(name, '') } })
    if (!rest.length) out.push({ cell, n })   // a name this diagram does not have is skipped, not drawn wrong
  }
  return out
}

const VENN_DOT_R = 5

// Dots scattered in a region rather than lined up in it: a point is taken at
// random inside the box and kept only when it sits comfortably inside every
// circle its region belongs to and comfortably outside the others. Of several
// candidates the one furthest from the dots already placed wins, which spaces
// them out without putting them on a grid.
function vennDots(cell, n, circles, box, rnd) {
  const pad = VENN_DOT_R + 4
  const fits = (x, y) => circles.every((c, i) => {
    const d = Math.hypot(x - c.x, y - c.y)
    return (cell & (1 << i)) ? d <= c.r - pad : d >= c.r + pad
  })
  const x0 = box.x + pad + 6, x1 = box.x + box.w - pad - 6
  // The band across the top of the box is where the expression is written.
  const y0 = box.y + 48, y1 = box.y + box.h - pad - 6
  const placed = []
  for (let k = 0; k < n; k++) {
    let best = null, bestGap = -1
    for (let t = 0; t < 140; t++) {
      const x = x0 + rnd() * (x1 - x0)
      const y = y0 + rnd() * (y1 - y0)
      if (!fits(x, y)) continue
      if (!placed.length) { best = { x, y }; break }
      const gap = Math.min(...placed.map(p => Math.hypot(p.x - x, p.y - y)))
      if (gap > bestGap) { bestGap = gap; best = { x, y } }
    }
    if (!best) break          // a region with no room left keeps the dots it has
    placed.push(best)
  }
  return placed
}

// The same scatter on every render: a dot that moved each time the diagram
// animated would read as a different element.
function seededRandom(seed) {
  let s = 0
  for (const ch of String(seed)) s = (Math.imul(s, 31) + ch.charCodeAt(0)) >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), 1 | t)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The universe box, and the circles inside it.
function vennBox(cx, cy, slotW) {
  const w = Math.min(slotW * 0.88, 660)
  const h = w * 0.62
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

function vennCircles(n, box) {
  const cx = box.x + box.w / 2
  // The circles sit BELOW a band at the top of the box, because that band is
  // where the expression being shaded is written. Centring them in the box put
  // the two upper circles through the middle of it.
  if (n === 2) {
    const r  = box.h * 0.40
    const cy = box.y + box.h * 0.53
    return [{ x: cx - r * 0.60, y: cy, r }, { x: cx + r * 0.60, y: cy, r }]
  }
  const r  = box.h * 0.295
  const d  = r * 0.60
  const cy = box.y + box.h * 0.12 + r + d * 0.62
  return [
    { x: cx - d, y: cy - d * 0.62, r },
    { x: cx + d, y: cy - d * 0.62, r },
    { x: cx,     y: cy + d * 0.80, r },
  ]
}

/**
 * Reads a set expression — A∩B, A', (A∪B)', A∩B∩C — into a test on one cell's
 * membership vector. Written as a parser rather than a lookup table of the nine
 * usual pictures because the nine are not the interesting ones: a lesson asks
 * for whatever it just wrote on the board, and "(A∪B)'" has to work the first
 * time without anyone having listed it.
 *
 * ∩ · & for intersection, ∪ · U · | for union, a trailing ' · ’ · ^c for the
 * complement, parentheses to group. An unknown name matches nothing, which
 * leaves the diagram unshaded instead of throwing mid-lesson.
 */
function vennPredicate(exprRaw, names) {
  const s = String(exprRaw ?? '').replace(/\s+/g, '')
  let i = 0
  const peek = () => s[i]

  const factor = () => {
    let f
    if (peek() === '(') {
      i++
      f = union()
      if (peek() === ')') i++
    } else {
      const start = i
      while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) i++
      const idx = names.indexOf(s.slice(start, i))
      if (start === i) { i++; return () => false }   // junk: consume, match nothing
      f = idx < 0 ? () => false : (m) => m[idx]
    }
    // Complements stack, so A'' is A again.
    for (;;) {
      if (peek() === "'" || peek() === '’') i++
      else if (peek() === '^') { i++; if (peek() === 'c' || peek() === 'C') i++ }
      else break
      const g = f
      f = (m) => !g(m)
    }
    return f
  }

  const inter = () => {
    let f = factor()
    while (peek() === '∩' || peek() === '&' || peek() === '*') {
      i++
      const a = f, b = factor()
      f = (m) => a(m) && b(m)
    }
    return f
  }

  const union = () => {
    let f = inter()
    while (peek() === '∪' || peek() === 'U' || peek() === '|' || peek() === '+') {
      i++
      const a = f, b = inter()
      f = (m) => a(m) || b(m)
    }
    return f
  }

  if (!s) return () => false
  return union()
}

// The cells an expression covers, as bit patterns over the n sets.
function vennCells(pred, n) {
  const out = []
  for (let k = 0; k < (1 << n); k++) {
    const m = []
    for (let b = 0; b < n; b++) m.push(Boolean(k & (1 << b)))
    if (pred(m)) out.push(k)
  }
  return out
}

// ── Possibility tree ─────────────────────────────────────────────────────────
// One column per stage of the experiment, and every path from the root to a leaf
// is one outcome. Counting them IS the multiplication rule — three coins give
// 2·2·2 = 8 leaves — so the picture and the arithmetic are the same object, which
// a list of eight strings never shows.
//
// Stages need not be the same size: a coin then a die is [['P','F'], ['1'…'6']].
const TREE_MS = { column: 620, path: 520 }

// Every node of the tree, laid out. Leaves are spread evenly down the box and
// each parent sits at the middle of the leaves it leads to, which is what makes
// the branches fan symmetrically instead of drifting.
function treeNodes(stages, box) {
  const cols   = stages.length + 1          // the stages, then the results
  const colW   = box.w / cols
  const leaves = stages.reduce((n, s) => n * s.length, 1)
  const rowH   = box.h / leaves
  const leafY  = (i) => box.y + (i + 0.5) * rowH

  const spanAt = (d) => stages.slice(d).reduce((n, s) => n * s.length, 1)
  const nodes  = [{ depth: 0, index: 0, key: '', label: '', parent: null,
    x: box.x + colW * 0.12, y: (leafY(0) + leafY(leaves - 1)) / 2 }]

  for (let d = 1; d <= stages.length; d++) {
    const span  = spanAt(d)
    const count = leaves / span
    const size  = stages[d - 1].length
    for (let j = 0; j < count; j++) {
      const from = j * span
      nodes.push({
        depth: d,
        index: j,
        key: '',                                  // filled in below
        label: stages[d - 1][j % size],
        parent: Math.floor(j / size),
        x: box.x + colW * (d - 0.16),
        y: (leafY(from) + leafY(from + span - 1)) / 2,
      })
    }
  }
  // A node's key is the outcome that reaches it — "PF" for heads then tails —
  // which is how a path lookup finds it later without walking the tree again.
  const byDepth = (d) => nodes.filter(n => n.depth === d)
  for (let d = 1; d <= stages.length; d++) {
    const parents = byDepth(d - 1)
    byDepth(d).forEach(n => { n.key = parents[n.parent].key + n.label })
  }
  return { nodes, colW, leaves, leafY, resultX: box.x + colW * (stages.length + 0.5) }
}

const ChartDisplay = forwardRef(function ChartDisplay(_, ref) {
  const [charts, setCharts] = useState({})   // id → chart, for rendering
  const [order,  setOrder]  = useState([])   // creation order, drives placement

  // The refs are the source of truth, not the state. A step creates a chart and
  // immediately animates it, and React has not committed the create by then — a
  // ref assigned during render would still be empty, the animation would find
  // nothing to animate and resolve on the spot, and the chart would sit at its
  // starting opacity of zero. Writing both on every change keeps reads correct
  // no matter when they happen, and stops two animations in flight from racing
  // each other through stale values.
  const chartsRef = useRef({})
  const orderRef  = useRef([])

  const commit = (updater) => {
    const next = typeof updater === 'function' ? updater(chartsRef.current) : updater
    chartsRef.current = next
    setCharts(next)
  }
  const commitOrder = (updater) => {
    const next = typeof updater === 'function' ? updater(orderRef.current) : updater
    orderRef.current = next
    setOrder(next)
  }

  useImperativeHandle(ref, () => {
    // ── One animation loop, shared by everything ────────────────────────────
    // `apply` receives the eased 0..1 and returns the fields to merge into the
    // chart. Each call captures the chart's starting values first, so a second
    // animation landing mid-flight picks up from where the first one actually
    // is rather than snapping back to its original value.
    function animate(id, ms, ease, apply) {
      return new Promise(resolve => {
        const from = chartsRef.current[id]
        if (!from) { resolve(); return }
        const t0 = performance.now()
        ;(function tick() {
          // Read the multiplier every frame rather than once: pressing skip
          // part-way through a fill then finishes it, instead of leaving one
          // slow pie in the middle of a hurried page.
          const p = Math.min((performance.now() - t0) / animMs(ms), 1)
          const e = ease(p)
          commit(prev => {
            const c = prev[id]
            if (!c) return prev
            return { ...prev, [id]: { ...c, ...apply(e, from) } }
          })
          if (p < 1) requestAnimationFrame(tick)
          else resolve()
        })()
      })
    }

    function put(id, chart) {
      commit(prev => ({ ...prev, [id]: chart }))
      commitOrder(prev => (prev.includes(id) ? prev : [...prev, id]))
    }

    return {
      isReady: () => true,

      hasChart: (id) => Boolean(chartsRef.current[id]),

      ids: () => [...orderRef.current],

      /** The fraction a pie currently stands for, for value references. */
      pieValue(id) {
        const c = chartsRef.current[id]
        if (!c || c.kind !== 'pie') return null
        return { num: c.num, den: c.den, value: c.den ? c.num / c.den : 0 }
      },

      // ── Pie / fraction circle ─────────────────────────────────────────────
      /**
       * An improper fraction is BUILT, not revealed: the first circle fills, a
       * second arrives to its right while the row slides left to stay centred,
       * and so on until the count is right. Each circle keeps its own tally
       * underneath while this happens, and only at the end do those tallies add
       * up into the one fraction. Drawing all the circles at once and spilling
       * a single fill across them shows the answer without showing where it
       * came from — which is the entire thing being taught.
       */
      /**
       * The nested number sets. Rings arrive from the OUTSIDE IN — ℝ first,
       * then each set drawn inside the last — because that is the order the
       * sentence is spoken in: the reals contain the rationals, which contain
       * the decimals. Labels and examples follow their own ring so nothing is
       * on screen before the shape that holds it.
       */
      /**
       * A Venn diagram of 2 or 3 sets. Circles only — the empty diagram is the
       * thing a lesson draws first and then shades a piece of at a time, so
       * creating it shades nothing.
       */
      /**
       * A possibility tree, revealed one stage at a time — the reader watches the
       * count double (or triple) at each column, which is the point of drawing it
       * rather than listing the outcomes.
       */
      tree(id, spec = {}) {
        const stages = (spec.stages ?? []).filter(s => s.length)
        if (!stages.length) return Promise.resolve()
        put(id, {
          kind: 'tree', stages, headers: spec.headers ?? [],
          results: spec.results !== false,
          shown: 0, appear: 0, path: null, pathShown: 0,
        })
        let seq = animate(id, 320, easeOut, e => ({ appear: e }))
        for (let d = 1; d <= stages.length + (spec.results === false ? 0 : 1); d++) {
          seq = seq.then(() => animate(id, TREE_MS.column, easeOut, e => ({ shown: d - 1 + e })))
        }
        return seq
      },

      /**
       * Light up one outcome, branch by branch. The path is what a probability
       * question actually asks about — "P then F then P" — and following it one
       * stage at a time is how the multiplication along it gets read.
       */
      treePath(id, pathRaw) {
        const c = chartsRef.current[id]
        if (!c || c.kind !== 'tree') return Promise.resolve()
        const path = String(pathRaw ?? '').trim()
        if (!path) {
          commit(prev => ({ ...prev, [id]: { ...prev[id], path: null, pathShown: 0 } }))
          return Promise.resolve()
        }
        // Split by the stage labels rather than by character: an outcome can be
        // "10" or "rouge", and cutting the string into letters would lose it.
        const steps = []
        let rest = path
        for (const stage of c.stages) {
          const hit = stage.find(o => rest.startsWith(o)) ??
            stage.find(o => rest.replace(/^[\s,·-]+/, '').startsWith(o))
          if (!hit) break
          steps.push(hit)
          rest = rest.replace(/^[\s,·-]+/, '').slice(hit.length)
        }
        if (!steps.length) return Promise.resolve()
        commit(prev => ({ ...prev, [id]: { ...prev[id], path: steps, pathShown: 0 } }))
        let seq = Promise.resolve()
        for (let d = 1; d <= steps.length; d++) {
          seq = seq.then(() => animate(id, TREE_MS.path, easeOut, e => ({ pathShown: d - 1 + e })))
        }
        return seq
      },

      venn(id, spec = {}) {
        const raw = Array.isArray(spec.sets)
          ? spec.sets
          : String(spec.sets ?? 'A,B').split(',')
        let sets = raw.map(s => String(s).trim()).filter(Boolean).slice(0, 3)
        if (sets.length < 2) sets = ['A', 'B']
        put(id, { kind: 'venn', sets, appear: 0, hi: null, fade: null, counts: null, countsT: 0 })
        return animate(id, VENN_MS.appear, easeOut, e => ({ appear: e }))
      },

      /**
       * The elements themselves, one dot each, in the region they belong to:
       * "A:3 AB:2 B:5" is three in A alone, two in both, five in B alone. The
       * numbers a lesson then computes — 3 + 2 + 5 for A∪B, 2 for A∩B — are
       * countable on the diagram instead of asserted beside it.
       *
       * They arrive one after another, in the order they were written, so a
       * region fills while the reader watches rather than appearing full.
       */
      vennCounts(id, countsRaw) {
        const c = chartsRef.current[id]
        if (!c || c.kind !== 'venn') return Promise.resolve()
        const counts = parseVennCounts(countsRaw, c.sets)
        commit(prev => ({ ...prev, [id]: { ...prev[id], counts, countsT: 0 } }))
        if (!counts.length) return Promise.resolve()
        const total = counts.reduce((s, r) => s + r.n, 0)
        return animate(id, VENN_MS.dots + total * 55, easeOut, e => ({ countsT: e }))
      },

      /**
       * Shade the region an expression describes. Whatever was shaded fades out
       * as this fades in, in the same pass: the two are two answers about one
       * diagram, and a gap between them reads as the diagram leaving and coming
       * back. An empty expression shades nothing, which is how a lesson clears
       * the shading without removing the chart.
       */
      vennHighlight(id, exprRaw, colorRaw) {
        const c = chartsRef.current[id]
        if (!c || c.kind !== 'venn') return Promise.resolve()
        const cells = vennCells(vennPredicate(exprRaw, c.sets), c.sets.length)
        const hi   = { cells, color: colorRaw || '#60a5fa', label: String(exprRaw ?? '').trim(), t: 0 }
        const fade = c.hi && c.hi.cells.length ? { ...c.hi, t: 1 } : null
        commit(prev => ({ ...prev, [id]: { ...prev[id], hi, fade } }))
        return animate(id, VENN_MS.shade, easeIO, e => {
          const cur = chartsRef.current[id]
          return {
            hi:   { ...cur.hi, t: e },
            fade: cur.fade ? { ...cur.fade, t: 1 - e } : null,
          }
        }).then(() => commit(prev => ({ ...prev, [id]: { ...prev[id], fade: null } })))
      },

      numberSets(id, spec = {}) {
        const sets = Array.isArray(spec.sets) && spec.sets.length ? spec.sets : NUMBER_SETS
        put(id, { kind: 'sets', sets, shown: 0, appear: 0 })
        let seq = animate(id, SETS_MS.appear, easeOut, e => ({ appear: e }))
        for (let i = 0; i < sets.length; i++) {
          seq = seq.then(() => animate(id, SETS_MS.ring, easeOut, e => ({ shown: i + e })))
        }
        return seq
      },

      pie(id, spec = {}) {
        const den = Math.max(1, Math.round(spec.den ?? 1))
        // NOT clamped to den: 8/3 is a real fraction and the whole reason the
        // panel exists — it draws as two full circles and two thirds of a third.
        const num = Math.max(0, Number(spec.num ?? 0))
        const circles = Math.max(1, Math.ceil(num / den - 1e-9))
        put(id, {
          kind: 'pie', num, den,
          shown: 0,                        // animated fill, in parts, running total
          dividers: den,                   // animated separately from `den`
          slots: 1,                        // animated row size — fractional while one arrives
          // One circle has nothing to add up: its tally IS the fraction, so the
          // total is already the thing on screen and there is no summing step.
          sumT: circles > 1 ? 0 : 1,
          color: spec.color ?? '#60a5fa',
          label: spec.label ?? '',
          showValue: spec.showValue !== false,
          // 0 = written as a fraction, 1 = written as a percentage. Animated,
          // Which notation the value is written in, and the cross-fade from the
          // one before it. Two names rather than a number on a scale: fraction →
          // decimal must not slide through "percent" on its way, which is what a
          // single 0..2 parameter would have drawn.
          mode: PIE_MODES.includes(spec.mode) ? spec.mode : 'fraction',
          prevMode: null,
          modeT: 1,
          appear: 0,
        })

        let seq = animate(id, PIE_MS.appear, easeOut, e => ({ appear: e }))
        for (let i = 0; i < circles; i++) {
          const part = Math.min(den, num - i * den)   // what goes into THIS circle
          if (i > 0) {
            // The row grows by one slot: existing circles slide left, the new
            // one fades in on the right. Positions come from this, so both
            // halves of the move are the same number.
            seq = seq.then(() => animate(id, PIE_MS.expand, easeIO, e => ({ slots: lerp(i, i + 1, e) })))
          }
          seq = seq.then(() => animate(id, PIE_MS.fill, easeIO, e => ({ shown: i * den + part * e })))
        }
        if (circles > 1) seq = seq.then(() => animate(id, PIE_MS.sum, easeIO, e => ({ sumT: e })))
        return seq
      },

      /** New value on an existing pie, swept from wherever it is now. */
      /**
       * New value on an existing pie, swept from wherever it is now. Unlike the
       * first build this is ONE continuous move — the row resizes while the fill
       * travels — because a value being corrected is a different story from a
       * quantity being built up for the first time.
       */
      setPie(id, num, den) {
        const c = chartsRef.current[id]
        if (!c || c.kind !== 'pie') return Promise.resolve()
        const nextDen = Math.max(1, Math.round(den ?? c.den))
        const nextNum = Math.max(0, Number(num ?? c.num))
        // The fill is animated in TURNS, not in parts: when the denominator
        // changes too, parts are not comparable (3/4 and 3/8 are different
        // amounts of circle) and animating the numerator alone would sweep
        // backwards through a value nobody asked for.
        const fromTurns = c.den ? c.shown / c.den : 0
        const toTurns   = nextNum / nextDen
        const fromSlots = c.slots ?? Math.max(1, Math.ceil((c.num ?? 0) / c.den - 1e-9))
        const toSlots   = Math.max(1, Math.ceil(nextNum / nextDen - 1e-9))
        commit(prev => ({ ...prev, [id]: { ...prev[id], num: nextNum, den: nextDen } }))
        return animate(id, PIE_MS.change, easeIO, e => ({
          shown:    lerp(fromTurns, toTurns, e) * nextDen,
          dividers: lerp(c.dividers ?? c.den, nextDen, e),
          slots:    lerp(fromSlots, toSlots, e),
          sumT:     toSlots > 1 ? 1 : 1,
        }))
      },

      /** Rewrite the value as a percentage, or back. Same quantity either way. */
      setMode(id, mode) {
        const c = chartsRef.current[id]
        if (!c || c.kind !== 'pie') return Promise.resolve()
        const from = c.mode ?? 'fraction'
        // "toggle" with three notations is a cycle, not a flip.
        const to = PIE_MODES.includes(mode)
          ? mode
          : PIE_MODES[(PIE_MODES.indexOf(from) + 1) % PIE_MODES.length]
        if (from === to) return Promise.resolve()
        commit(prev => ({ ...prev, [id]: { ...prev[id], mode: to, prevMode: from, modeT: 0 } }))
        return animate(id, PIE_MS.swap, easeIO, e => ({ modeT: e }))
          .then(() => commit(prev => ({ ...prev, [id]: { ...prev[id], prevMode: null } })))
      },

      // ── Removal ───────────────────────────────────────────────────────────
      remove(id) {
        const c = chartsRef.current[id]
        if (!c) return Promise.resolve()
        // Fades out before it goes: nothing on this panel is allowed to just
        // vanish from the array.
        return animate(id, 300, easeIO, e => ({ appear: 1 - e })).then(() => {
          commit(prev => { const n = { ...prev }; delete n[id]; return n })
          commitOrder(prev => prev.filter(x => x !== id))
        })
      },

      clearAll() {
        commit({})
        commitOrder([])
      },
    }
  }, [])

  const live = order.filter(id => charts[id])

  return (
    <div className="chart-display">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {live.map((id, i) => {
          const c = charts[id]
          const { cx, cy, slotW } = placement(i, live.length)
          if (c.kind === 'pie')  return <Pie  key={id} c={c} cx={cx} cy={cy} slotW={slotW} />
          if (c.kind === 'sets') return <Sets key={id} c={c} cx={cx} cy={cy} />
          if (c.kind === 'venn') return <Venn key={id} id={id} c={c} cx={cx} cy={cy} slotW={slotW} />
          if (c.kind === 'tree') return <Tree key={id} c={c} cx={cx} cy={cy} slotW={slotW} />
          return null
        })}
      </svg>
    </div>
  )
})

// ── Pie ──────────────────────────────────────────────────────────────────────

/**
 * A fraction drawn as circles, built one at a time.
 *
 * `slots` is the animated size of the row and it can be fractional: at 1.4 the
 * row is already 1.4 circles wide, the two existing circles have slid apart to
 * suit, and the arriving one is 40% faded in. Position and arrival are the same
 * number, so they cannot disagree.
 *
 * The circle RADIUS comes from the final count, not from `slots` — otherwise
 * every circle would shrink each time a new one landed, and the fraction would
 * look like it was changing size rather than growing in count.
 */
function Pie({ c, cx, cy, slotW }) {
  const appear = c.appear ?? 1
  const den    = Math.max(1, c.den || 1)
  const shown  = Math.max(0, c.shown ?? 0)
  const sumT   = c.sumT ?? 1

  const nFinal = Math.max(1, Math.ceil((c.num ?? 0) / den - 1e-9))
  const slotsF = Math.max(1, c.slots ?? nFinal)
  const nVis   = Math.max(1, Math.ceil(slotsF - 1e-9))
  const lastOp = Math.max(0, Math.min(1, slotsF - (nVis - 1)))

  const gap   = 26
  const avail = slotW * 0.9
  const R     = Math.max(26, Math.min(150, (avail - gap * (nFinal - 1)) / (2 * nFinal)))
  const k     = R / 150
  const r     = R * (0.6 + 0.4 * appear)
  const rowW  = slotsF * 2 * R + gap * (slotsF - 1)
  const x0    = cx - rowW / 2 + R
  const rowY  = cy - 22 * k
  const labelY = rowY + r + 46 * k
  const at    = i => x0 + i * (2 * R + gap)
  const opOf  = i => (i === nVis - 1 ? lastOp : 1)

  // Sector dividers. `dividers` is animated, so it is fractional mid-change:
  // the incoming count fades in as the outgoing one fades out, which reads as
  // the slices being redrawn rather than snapping to a new count.
  const dRaw   = c.dividers ?? den
  const dFloor = Math.max(1, Math.floor(dRaw))
  const dCeil  = Math.max(1, Math.ceil(dRaw))
  const blend  = dRaw - dFloor

  const spokes = (ox, count, opacity) =>
    count <= 1 ? null : Array.from({ length: count }, (_, i) => {
      const [x, y] = polar(ox, rowY, r, i / count)
      return (
        <line key={`${count}-${i}`}
          x1={ox} y1={rowY} x2={x} y2={y}
          stroke="rgba(255,255,255,0.30)" strokeWidth={1.5}
          opacity={opacity * appear}
        />
      )
    })

  return (
    <g opacity={appear}>
      {Array.from({ length: nVis }, (_, i) => {
        const ox     = at(i)
        const filled = Math.max(0, Math.min(den, shown - i * den))
        const op     = opOf(i)
        return (
          <g key={i} opacity={op}>
            <circle cx={ox} cy={rowY} r={r}
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.34)" strokeWidth={2} />

            <path d={wedgePath(ox, rowY, r, filled / den)} fill={c.color} fillOpacity={0.82} />
            <path d={wedgePath(ox, rowY, r, filled / den)} fill="none" stroke={c.color} strokeWidth={2} />

            {spokes(ox, dFloor, 1 - blend)}
            {blend > 0.001 ? spokes(ox, dCeil, blend) : null}

            {/* rim last so the spokes stop cleanly at the edge */}
            <circle cx={ox} cy={rowY} r={r} fill="none"
              stroke="rgba(255,255,255,0.34)" strokeWidth={2} />

            {/* this circle's own tally, while the row is still being built */}
            {c.showValue && nFinal > 1 && sumT < 0.999 ? (
              <g opacity={(1 - sumT) * op}>
                <ValueText cx={ox} y={labelY} num={Math.round(filled)} den={den}
                  scale={k * 0.62} color={c.color} modeT={c.modeT} mode={c.mode} prevMode={c.prevMode} />
              </g>
            ) : null}
          </g>
        )
      })}

      {/* plus signs between the tallies — they are what is being added up */}
      {c.showValue && nFinal > 1 && sumT < 0.999
        ? Array.from({ length: Math.max(0, nVis - 1) }, (_, i) => (
            <text key={`p${i}`}
              x={(at(i) + at(i + 1)) / 2} y={labelY + 14 * k}
              fill={c.color} fontSize={30 * k} fontWeight="700"
              textAnchor="middle" dominantBaseline="middle"
              opacity={(1 - sumT) * Math.min(opOf(i), opOf(i + 1))}
              fontFamily="'Fira Code','Cascadia Code',monospace">+</text>
          ))
        : null}

      {/* the total, fading in exactly where the tallies were */}
      {c.showValue && sumT > 0.001 ? (
        <g opacity={sumT}>
          <ValueText cx={cx} y={labelY} num={c.num} den={c.den} scale={k} color={c.color}
            modeT={c.modeT} mode={c.mode} prevMode={c.prevMode} />
        </g>
      ) : null}

      {c.label ? (
        <text x={cx} y={rowY - r - 26 * k}
          fill="rgba(255,255,255,0.72)" fontSize={22 * k}
          textAnchor="middle" fontFamily="'Fira Code','Cascadia Code',monospace">
          {c.label}
        </text>
      ) : null}
    </g>
  )
}

/**
 * The value as a real stacked fraction — numerator, rule, denominator — drawn
 * as plain SVG text in the panel itself, not in a text box.
 */
/**
 * The value under a circle, in whichever notation is showing. Both are drawn
 * and cross-faded on `modeT`, each drifting a little as it goes, so the swap
 * reads as one number being rewritten rather than two numbers blinking.
 */
function ValueText({ cx, y, num, den, scale, color, modeT, mode, prevMode }) {
  const t  = Math.max(0, Math.min(1, modeT ?? 1))
  const fs = 46 * scale
  const drift = fs * 0.28
  // The outgoing notation lifts as it fades, the incoming one settles into
  // place — so the swap reads as one number being rewritten, not two numbers
  // blinking at each other.
  const one = (which, opacity, dy) => {
    if (opacity <= 0.001) return null
    const inner =
      which === 'percent'
        ? <PercentText cx={cx} y={y + fs * 0.52} value={den ? (num / den) * 100 : 0} scale={scale} color={color} />
        : which === 'decimal'
          ? <DecimalText cx={cx} y={y + fs * 0.52} value={den ? num / den : 0} scale={scale} color={color} />
          : <FractionText cx={cx} y={y} num={num} den={den} scale={scale} color={color} />
    return <g opacity={opacity} transform={`translate(0 ${dy})`}>{inner}</g>
  }
  return (
    <g>
      {prevMode ? one(prevMode, 1 - t, -drift * t) : null}
      {one(mode ?? 'fraction', prevMode ? t : 1, prevMode ? drift * (1 - t) : 0)}
    </g>
  )
}

/**
 * The same quantity as a decimal. Trimmed the way the percentage is: 3/8 is
 * 0.375, and 1/3 is 0.33 rather than a screenful of threes.
 */
function DecimalText({ cx, y, value, scale, color }) {
  const fs = 46 * scale
  return (
    <text x={cx} y={y} fill={color} fontSize={fs} fontWeight="700"
      textAnchor="middle" dominantBaseline="middle"
      fontFamily="'Fira Code','Cascadia Code',monospace">
      {String(Number(value.toFixed(4)))}
    </text>
  )
}

/**
 * A percentage, trimmed to what the number actually needs: 3/8 is 37.5%, not
 * 37.50%, and 1/3 is 33.33% rather than a screenful of threes.
 */
function PercentText({ cx, y, value, scale, color }) {
  const fs = 46 * scale
  const text = `${Number(value.toFixed(2))}%`
  return (
    <text x={cx} y={y} fill={color} fontSize={fs} fontWeight="700"
      textAnchor="middle" dominantBaseline="middle"
      fontFamily="'Fira Code','Cascadia Code',monospace">
      {text}
    </text>
  )
}

function FractionText({ cx, y, num, den, scale, color }) {
  const fs = 46 * scale
  const w  = Math.max(String(num).length, String(den).length) * fs * 0.62
  return (
    <g>
      <text x={cx} y={y} fill={color} fontSize={fs} fontWeight="700"
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Fira Code','Cascadia Code',monospace">
        {Math.round(num)}
      </text>
      <rect x={cx - w / 2} y={y + fs * 0.36} width={w} height={Math.max(2, 3 * scale)}
        fill={color} rx={1.5} />
      <text x={cx} y={y + fs * 1.05} fill={color} fontSize={fs} fontWeight="700"
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Fira Code','Cascadia Code',monospace">
        {Math.round(den)}
      </text>
    </g>
  )
}



export default ChartDisplay

// ── Sets ─────────────────────────────────────────────────────────────────────

/**
 * `shown` is how many rings have arrived and can be fractional: at 2.4 the
 * outer two are fully drawn and the third is 40% of the way in. One number
 * drives the ellipse, its label and its examples, so they cannot disagree
 * about how far along the ring is.
 */
function Sets({ c, cx, cy }) {
  const n = c.sets.length
  return (
    <g style={{ opacity: c.appear }}>
      {c.sets.map((s, i) => {
        const t = Math.max(0, Math.min(c.shown - i, 1))
        if (t <= 0) return null
        const r     = ringAt(i, n, cx, cy)
        const inner = i + 1 < n ? ringAt(i + 1, n, cx, cy) : null
        const list  = s.examples ?? []
        // The examples live in the band this ring opens to its right, and that
        // band is not a rectangle: an ellipse narrows as you leave its middle, so
        // a line near the top or the bottom has less room than one on the axis.
        // Each line is therefore centred in the band measured AT ITS OWN HEIGHT.
        // Centring every line on the widest point instead is what pushed the last
        // of three examples out past the curve and off the panel.
        const halfW = (e, y) => e.rx * Math.sqrt(Math.max(0, 1 - ((y - e.cy) / e.ry) ** 2))
        const exY   = (j) => r.cy + (j - (list.length - 1) / 2) * 32
        const exX   = (y) => {
          const right = r.cx + halfW(r, y) - 12
          const left  = inner ? inner.cx + halfW(inner, y) + 12 : r.cx - halfW(r, y) * 0.5
          return (left + right) / 2
        }
        // A small ellipse narrows away from its middle much faster than a big one,
        // so a label sitting a fixed distance below the top fits on the outer ring
        // and pokes out of the inner one. Shrink the type with the ring and inset
        // it further as the rings get smaller, and every label stays in its own.
        const labelSize = 21 - i * 1.2
        const labelY    = r.cy - r.ry + 24 + 10 * (i / Math.max(1, n - 1))
        return (
          <g key={s.key ?? i}>
            <ellipse
              cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
              fill={SET_FILL[i % SET_FILL.length]}
              opacity={t}
              style={{ transformOrigin: `${r.cx}px ${r.cy}px`, transform: `scale(${0.92 + 0.08 * t})` }}
            />
            <text
              x={r.cx} y={labelY}
              textAnchor="middle" opacity={Math.max(0, (t - 0.35) / 0.65)}
              style={{ fill: 'var(--text)', fontSize: labelSize, fontWeight: 700 }}
            >
              {s.symbol} : {s.name}
            </text>
            {list.map((e, j) => (
              <text
                key={j}
                x={exX(exY(j))}
                y={exY(j)}
                textAnchor="middle" opacity={Math.max(0, (t - 0.55) / 0.45)}
                style={{ fill: 'var(--text)', fontSize: 19, fontWeight: 600 }}
              >
                {e}
              </text>
            ))}
          </g>
        )
      })}
    </g>
  )
}


// ── Venn ─────────────────────────────────────────────────────────────────────

// One cell, cut out of the universe box by intersecting masks — one per set,
// each either "inside this circle" or "outside it". Nested masks multiply, so
// n of them stacked leave exactly the region that answers all n questions the
// same way. Drawing the cells as paths instead would mean computing circle-arc
// intersections by hand, which is where a three-set diagram goes wrong.
function VennCell({ k, n, mid, box, fill }) {
  let node = <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
  for (let b = n - 1; b >= 0; b--) {
    const side = (k & (1 << b)) ? 'in' : 'out'
    node = <g key={b} mask={`url(#${mid}-${side}-${b})`}>{node}</g>
  }
  return node
}

function Venn({ id, c, cx, cy, slotW }) {
  const n       = c.sets.length
  const box     = vennBox(cx, cy, slotW)
  const circles = vennCircles(n, box)
  const mid     = `venn-${String(id).replace(/[^A-Za-z0-9_-]/g, '')}`
  const gx = circles.reduce((s, p) => s + p.x, 0) / n
  const gy = circles.reduce((s, p) => s + p.y, 0) / n

  // A set name sits INSIDE its own circle, in the lobe that belongs to that set
  // alone — pushed away from the group's centre, so it never lands in an
  // overlap where it would read as naming the intersection. The names are drawn
  // after the shading bands, so a shaded lobe passes under the letter rather
  // than over it.
  const labelAt = (p) => {
    if (n === 2) return { x: p.x + (p.x < gx ? -1 : 1) * p.r * 0.52, y: p.y + p.r * 0.50 }
    const dx = p.x - gx, dy = p.y - gy
    const d  = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / d) * p.r * 0.62, y: p.y + (dy / d) * p.r * 0.62 + 7 }
  }

  const bands = [c.fade, c.hi].filter(h => h && h.cells.length && h.t > 0.001)

  // Sampled once per set of counts, not per frame: the scatter is the same
  // picture for as long as the numbers are.
  const dots = useMemo(() => {
    const out = []
    for (const { cell, n } of c.counts ?? []) {
      const rnd = seededRandom(`${id}:${cell}:${n}`)
      vennDots(cell, n, circles, box, rnd).forEach((p, i) => out.push({ ...p, key: `${cell}-${i}` }))
    }
    return out
  }, [c.counts, id, box.x, box.y, box.w, box.h, n])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <g style={{ opacity: c.appear }}>
      <defs>
        {circles.map((p, b) => (
          <mask key={`in${b}`} id={`${mid}-in-${b}`}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="black" />
            <circle cx={p.x} cy={p.y} r={p.r} fill="white" />
          </mask>
        ))}
        {circles.map((p, b) => (
          <mask key={`out${b}`} id={`${mid}-out-${b}`}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="white" />
            <circle cx={p.x} cy={p.y} r={p.r} fill="black" />
          </mask>
        ))}
      </defs>

      {bands.map((h, i) => (
        <g key={i} opacity={h.t * 0.55}>
          {h.cells.map(k => (
            <VennCell key={k} k={k} n={n} mid={mid} box={box} fill={h.color} />
          ))}
        </g>
      ))}

      <rect
        x={box.x} y={box.y} width={box.w} height={box.h}
        fill="none" stroke="var(--text)" strokeWidth={2}
      />
      <text
        x={box.x + 16} y={box.y + 30}
        style={{ fill: 'var(--text)', fontSize: 22, fontStyle: 'italic', fontWeight: 700 }}
      >
        U
      </text>
      {c.hi && c.hi.label ? (
        <text
          x={box.x + box.w / 2} y={box.y + 32} textAnchor="middle" opacity={c.hi.t}
          style={{ fill: 'var(--text-h)', fontSize: 24, fontWeight: 700 }}
        >
          {c.hi.label}
        </text>
      ) : null}

      {circles.map((p, b) => (
        <circle
          key={b} cx={p.x} cy={p.y} r={p.r}
          fill="none" stroke="var(--text-h)" strokeWidth={2.5}
        />
      ))}

      {dots.map((d, i) => {
        // Each dot has its own slice of the sweep, so they land one by one.
        const t = Math.max(0, Math.min(1, (c.countsT ?? 0) * (dots.length + 2) - i))
        if (t <= 0) return null
        return (
          <circle
            key={d.key} cx={d.x} cy={d.y} r={VENN_DOT_R * (0.6 + 0.4 * t)}
            fill="#60a5fa" opacity={t}
          />
        )
      })}
      {circles.map((p, b) => {
        const l = labelAt(p)
        return (
          <text
            key={b} x={l.x} y={l.y} textAnchor="middle"
            style={{ fill: 'var(--text-h)', fontSize: 22, fontWeight: 700 }}
          >
            {c.sets[b]}
          </text>
        )
      })}
    </g>
  )
}

// ── Possibility tree ─────────────────────────────────────────────────────────

function Tree({ c, cx, cy, slotW }) {
  const w   = Math.min(slotW * 0.94, 760)
  const box = { x: cx - w / 2, y: cy - 205, w, h: 400 }
  const { nodes, colW, leaves, leafY, resultX } = treeNodes(c.stages, box)
  const depth = c.stages.length
  const step  = (d) => Math.max(0, Math.min(c.shown - (d - 1), 1))

  const BLUE = '#60a5fa'
  // A tree with a lot of leaves has to shrink its type or the labels collide;
  // the branches themselves stay readable much longer than the text does.
  const fs = Math.max(12, Math.min(21, (box.h / leaves) * 0.55))

  // Every label sits ON its node, and the branches stop short of it at both
  // ends. Drawing the lines all the way through and putting the letter beside
  // them left the P sitting across three strokes at once — the one place in the
  // picture where something is written is the one place a line must not be.
  const gapOf = (n) => (n.label ? 10 + String(n.label).length * fs * 0.34 : 0)
  const short = (from, to, gFrom, gTo) => {
    const dx = to.x - from.x, dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    return {
      x1: from.x + (dx / len) * gFrom, y1: from.y + (dy / len) * gFrom,
      x2: to.x   - (dx / len) * gTo,   y2: to.y   - (dy / len) * gTo,
    }
  }
  const parentOf = (n) => nodes.filter(x => x.depth === n.depth - 1)[n.parent]

  // Which branches belong to the outcome being followed. Keyed by the node the
  // branch ARRIVES at, since that is what a path names.
  const onPath = new Set()
  if (c.path) {
    let key = ''
    c.path.forEach((label, k) => { key += label; onPath.add((k + 1) + ':' + key) })
  }
  const pathDepth = c.path ? c.pathShown : 0

  return (
    <g style={{ opacity: c.appear }}>
      {/* One band per stage. They are what turn a spray of lines into columns,
          and the reader counts stages by counting bands. */}
      {c.stages.map((_, d) => (
        <rect
          key={'band' + d}
          x={box.x + colW * d} y={box.y - 46} width={colW} height={box.h + 52}
          fill={d % 2 ? '#12213a' : '#16283f'} opacity={step(d + 1) * 0.85} rx={6}
        />
      ))}

      {c.stages.map((_, d) => (
        <text
          key={'hd' + d}
          x={box.x + colW * (d + 0.5)} y={box.y - 22}
          textAnchor="middle" dominantBaseline="central" opacity={step(d + 1)}
          style={{ fill: 'var(--text-h)', fontSize: 17, fontWeight: 700 }}
        >
          {c.headers[d] ?? `Étape ${d + 1}`}
        </text>
      ))}
      {c.results ? (
        <text
          x={resultX} y={box.y - 22} textAnchor="middle" dominantBaseline="central"
          opacity={step(depth + 1)}
          style={{ fill: 'var(--text-h)', fontSize: 17, fontWeight: 700 }}
        >
          Résultats
        </text>
      ) : null}

      {/* The branches. Each one grows from its parent as its column arrives. */}
      {nodes.filter(n => n.depth > 0).map(n => {
        const t = step(n.depth)
        if (t <= 0) return null
        const p = parentOf(n)
        const seg = short(p, n, gapOf(p), gapOf(n))
        const lit = onPath.has(n.depth + ':' + n.key) && pathDepth >= n.depth - 0.001
        const dim = c.path && !onPath.has(n.depth + ':' + n.key)
        return (
          <line
            key={'e' + n.depth + n.key}
            x1={seg.x1} y1={seg.y1}
            x2={seg.x1 + (seg.x2 - seg.x1) * t} y2={seg.y1 + (seg.y2 - seg.y1) * t}
            stroke={lit ? BLUE : 'var(--text-h)'}
            strokeWidth={lit ? 3.5 : 2}
            strokeLinecap="round"
            opacity={dim ? 0.22 : 1}
          />
        )
      })}

      {/* The outcome written at the end of its own branch. */}
      {nodes.filter(n => n.depth > 0).map(n => {
        const t = step(n.depth)
        if (t <= 0.45) return null
        const lit = onPath.has(n.depth + ':' + n.key) && pathDepth >= n.depth - 0.001
        const dim = c.path && !onPath.has(n.depth + ':' + n.key)
        return (
          <text
            key={'l' + n.depth + n.key}
            x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central"
            opacity={dim ? 0.25 : (t - 0.45) / 0.55}
            style={{
              fill: lit ? BLUE : 'var(--text-h)', fontSize: fs, fontWeight: 700,
              fontFamily: "'Fira Code','Cascadia Code',monospace",
            }}
          >
            {n.label}
          </text>
        )
      })}

      {/* The complete outcomes, one per leaf, in the last column. */}
      {c.results ? nodes.filter(n => n.depth === depth).map((n, i) => {
        const t = step(depth + 1)
        if (t <= 0) return null
        const lit = c.path && n.key === c.path.join('') && pathDepth >= depth - 0.001
        const dim = c.path && !lit
        return (
          <text
            key={'r' + n.key}
            x={resultX} y={leafY(i)} textAnchor="middle" dominantBaseline="central"
            opacity={dim ? 0.25 : t}
            style={{
              fill: lit ? BLUE : 'var(--text-h)', fontSize: fs, fontWeight: 700,
              fontFamily: "'Fira Code','Cascadia Code',monospace",
            }}
          >
            {n.key}
          </text>
        )
      }) : null}
    </g>
  )
}