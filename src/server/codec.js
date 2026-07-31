// Compact codec — the wire format between the generator and the app.
// Extracted from server.js so it can be unit-tested without booting the server
// (importing server.js binds port 3001).
import { CATEGORIES } from '../data/functions.js'

// ── Compact codec ─────────────────────────────────────────────────────────────

const LAYOUTS = {
  // Single-panel
  sg: 'single-graph',     sG: 'single-geo',    sq: 'single-grid',
  se: 'single-equation',  sc: 'single-calc',   s3: 'single-3d',
  sm: 'single-mult',      sk: 'single-clock',  sn: 'single-numbers',
  sM: 'text-mdas',        sT: 'single-text',
  // Dual-panel
  tg: 'text-graph',       tG: 'text-geo',      tq: 'text-grid',
  te: 'text-equation',
  ge: 'graph-equation',   Ge: 'geo-equation',   qe: 'grid-equation',
  qg: 'grid-graph',
}

const FUNCS = {
  // ── Text boxes ──────────────────────────────────────────────────────────────
  tc: 'text-create',         ti: 'text-add-item',       tx: 'text-remove-item',
  tt: 'text-update-title',   td: 'text-remove',         tf: 'text-fade-content',

  // ── Equation ────────────────────────────────────────────────────────────────
  eq: 'eq-create',           ec: 'eq-combine',          eD: 'eq-distribute',
  es: 'eq-send-other-side',  eo: 'eq-reorder',          ed: 'eq-divide',
  ef: 'eq-full-solve',       ev: 'eq-replace-variable', er: 'eq-racine-des-bords',
  ea: 'eq-apply-inverse-trig', ee: 'eq-disparition-exposant',
  eS: 'eq-save-result',        em: 'eq-multiply',
  eQ: 'quadratic-solve',

  // ── Canvas geometry (SVG) ───────────────────────────────────────────────────
  gp: 'geo-create-polygon',  gx: 'geo-erase-shape',     gm: 'geo-move-shape',
  gh: 'geo-highlight-shape', gl: 'geo-label-sides',     gt: 'geo-add-text',
  ga: 'geo-show-angles',     gw: 'geo-show-arrow',      gW: 'geo-remove-arrow',
  gE: 'geo-highlight-edge',  gA: 'geo-highlight-angle', gC: 'geo-clear',
  gr: 'geo-show-measure',    gM: 'geo-show-area-measures', gP: 'geo-show-perimeter-measures',

  // ── 2D shapes — Three.js flat (screen-locked) ───────────────────────────────
  S2c: 'geo3d-create-2d',
  S2m: 'geo3d-move',
  S2h: 'geo3d-highlight',
  S2l: 'geo3d-label-sides',
  S2a: 'geo3d-show-angles',
  S2A: 'geo3d-highlight-angle',
  S2E: 'geo3d-highlight-edge',    S2Ex: 'geo3d-remove-edge-highlight',
  S2F: 'geo3d-highlight-face',    S2Fx: 'geo3d-remove-face-highlight',
  S3m: 'geo3d-show-volume-measures', S3mx: 'geo3d-remove-volume-measures',
  S2tk: 'geo3d-show-tick',    S2tx: 'geo3d-remove-tick',
  S2w: 'geo3d-show-arrow',
  S2W: 'geo3d-remove-arrow',
  S2H: 'geo3d-clear-highlights',
  S2v: 'geo3d-set-view',
  S2x: 'geo3d-remove',
  S2f: 'geo2d-flip',
  S2r: 'geo2d-rotate',

  // ── 3D shapes — Three.js volumetric (rotatable) ─────────────────────────────
  S3c: 'geo3d-create',
  S3t: 'geo3d-add-text',
  S3x: 'geo3d-remove',
  S3C: 'geo3d-clear',

  // ── Graph (Desmos) ───────────────────────────────────────────────────────────
  fp:  'graph-plot-function',      fx:  'graph-remove-function',
  fs:  'graph-shade-area',         fi:  'graph-find-intersections',
  fa:  'graph-add-point',          fap: 'graph-remove-point',
  fbf: 'graph-best-fit-line',
  fsc: 'graph-scatter-plot',       fscx: 'graph-remove-scatter-plot',
  fsg: 'graph-add-segment',       fsgx: 'graph-remove-segment',
  fst: 'graph-segment-tick',      fstx: 'graph-remove-segment-tick',
  fsd: 'graph-divide-segment',    fsdx: 'graph-remove-divide-segment',
  fv:  'graph-adjust-view',        fV:  'graph-set-viewport',
  fn:  'graph-name-func',          ft:  'graph-tangent',
  fh:  'graph-horizontal-line',    fr:  'graph-mark-roots',
  fP:  'graph-show-projection',    fd:  'graph-plot-derivative',
  fR:  'graph-riemann-sum',        fD:  'graph-draw-vector',
  fT:  'graph-transform-function', fg:  'graph-draw-angle',
  fB:  'graph-batch-add-points',   fBP: 'graph-batch-show-projections',
  fTC: 'graph-trig-circle',

  // ── Data tables ──────────────────────────────────────────────────────────────
  Tt: 'table-create',
  Tc: 'tab-create-grid',    Tx: 'tab-erase-grid',     Ta: 'tab-add-column',
  Tr: 'tab-remove-column',  TR: 'tab-add-row',        TrR: 'tab-remove-row',
  Tv: 'tab-change-value',   TV: 'tab-change-values',
  Th: 'tab-highlight-row',  Thx: 'tab-clear-row-highlight',

  // ── Comments & misc ──────────────────────────────────────────────────────────
  cg: 'cmt-graph',       cf: 'cmt-graph-func',   cA: 'cmt-graph-area',
  cq: 'cmt-grid',        cG: 'cmt-geo',          cE: 'cmt-geo-edge',
  ce: 'cmt-equation',    cx: 'cmt-clear',         cu: 'cmt-update',
  cF: 'cmt-free',        cd: 'cmt-remove',
  n:  'narrate',

  // ── Page flow ────────────────────────────────────────────────────────────────
  sL: 'set-layout',

  // ── Step-by-step calc ────────────────────────────────────────────────────────
  Cs: 'calc-step',   Cc: 'calc-clear',

  // ── Arithmetic / multiplication (still used by lesson builder) ───────────────
  as: 'arith-solve',
  mt: 'mult-table-show',     mh: 'mult-table-highlight',
  ck: 'clock-show',          ct: 'clock-set-time',      ch: 'clock-highlight-hand',
  ns: 'numbers-show',        nh: 'numbers-show-numeral',
  Mx: 'mdas-example',
}

// Build input metadata from the live function catalog
const FUNC_META = {}
for (const cat of CATEGORIES) {
  for (const fn of cat.functions) {
    FUNC_META[fn.id] = fn.inputs
  }
}

const CLR = ['red','purple','orange','green','yellow','pink','teal','white']

function expandStep([code, ...vals]) {
  const funcId = FUNCS[code]
  if (!funcId) throw new Error(`Unknown compact func code: "${code}"`)
  const inputDefs = FUNC_META[funcId] ?? []
  const inputs = {}
  inputDefs.forEach((def, i) => {
    if (i >= vals.length || vals[i] === null || vals[i] === undefined || vals[i] === '') return
    const raw = vals[i]
    if (def.type === 'color-name' && typeof raw === 'number') {
      inputs[def.id] = CLR[raw] ?? String(raw)
      return
    }
    const isBoolSelect = def.type === 'select' &&
      def.options?.some(o => o.value === 'false') &&
      def.options?.some(o => o.value === 'true')
    inputs[def.id] = (typeof raw === 'number' && isBoolSelect)
      ? (raw === 0 ? 'false' : 'true')
      : String(raw)
  })
  return { func: funcId, inputs }
}

function expandCompact(compact) {
  return compact.map(([title, layoutCode, steps]) => ({
    title:  title ?? '',
    layout: LAYOUTS[layoutCode] ?? layoutCode,
    steps:  (steps ?? []).map(expandStep),
  }))
}

// ── Compact (inverse of expandCompact) ────────────────────────────────────────
// Used to turn one of the curated Examples-tab lessons back into compact codes
// so it can be shown to the generator as a worked reference. Must round-trip
// exactly: an example that expands to something different from what we started
// with would teach the model a broken pattern.
const FUNCS_BY_ID   = Object.fromEntries(Object.entries(FUNCS).map(([c, id]) => [id, c]))
const LAYOUTS_BY_ID = Object.fromEntries(Object.entries(LAYOUTS).map(([c, id]) => [id, c]))
const CLR_BY_NAME   = Object.fromEntries(Object.entries(CLR).map(([n, name]) => [name, Number(n)]))

function compactStep(step) {
  const funcId = step.func ?? step.funcId
  const code   = FUNCS_BY_ID[funcId]
  if (!code) return null                       // not expressible in the codec — drop the step
  const defs = FUNC_META[funcId] ?? []
  const vals = defs.map(def => {
    const v = step.inputs?.[def.id]
    if (v === undefined || v === null || v === '') return ''
    if (def.type === 'color-name' && CLR_BY_NAME[v] !== undefined) return CLR_BY_NAME[v]
    const isBoolSelect = def.type === 'select' &&
      def.options?.some(o => o.value === 'false') &&
      def.options?.some(o => o.value === 'true')
    if (isBoolSelect) return v === 'true' ? 1 : 0
    return v
  })
  while (vals.length && vals[vals.length - 1] === '') vals.pop()   // drop trailing defaults
  return [code, ...vals]
}

function compactLesson(pages) {
  return (pages ?? []).map(pg => [
    pg.title ?? '',
    LAYOUTS_BY_ID[pg.layout] ?? pg.layout,
    (pg.steps ?? []).map(compactStep).filter(Boolean),
  ])
}

// ── JSON repair ───────────────────────────────────────────────────────────────
// Repair lone backslashes that the model forgot to double.
function repairBackslashes(raw) {
  const PH = '\x00'
  let s = raw
  s = s.replace(/\\\\/g, PH)
  s = s.replace(/\\u(?![0-9a-fA-F]{4})/g, PH + 'u')
  s = s.replace(/\\([ftnrb])(?=[a-zA-Z])/g, PH + '$1')
  s = s.replace(/\\(?!["\\/bfnrtu])/g, PH)
  return s.split(PH).join('\\\\')
}

function parseCompact(rawText) {
  let raw = rawText.trim()
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = raw.indexOf('[')
  const end   = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start)
    throw new Error('Response contained no JSON array')
  return JSON.parse(repairBackslashes(raw.slice(start, end + 1)))
}

// ── Which module docs does a lesson actually need? ───────────────────────────
// The reference lesson we show the generator must not contain codes whose
// documentation was left out — the model would see tokens it cannot interpret
// and imitate them blindly. Derived from the codes themselves so it cannot
// drift from FUNCS.
//
// Case matters: tc/ti/tf are text boxes, Tt/Tc/Ta are tables.
function moduleForCode(code) {
  if (code === 'n' || code === 'sL') return null        // narrate / set-layout: always available
  if (code.startsWith('S3')) return 'geo3d'
  if (code.startsWith('S2')) return 'geo2d'
  if (code.startsWith('T'))  return 'table'
  if (code.startsWith('f'))  return 'graph'
  if (code.startsWith('g'))  return 'geo_canvas'
  if (code.startsWith('e'))  return 'equation'
  if (code.startsWith('t'))  return 'text'
  if (code.startsWith('c'))  return 'comments'
  return null
}

// Layout codes that need a given module present to make sense.
const LAYOUT_NEEDS = {
  sg: ['graph'], tg: ['text', 'graph'], ge: ['graph', 'equation'],
  sq: ['table'], tq: ['text', 'table'], qe: ['table', 'equation'],
  se: ['equation'], te: ['text', 'equation'],
  sT: ['text'], sM: ['text'],
  s3: [], sG: [], tG: ['text'], Ge: ['equation'],   // geo module comes from the steps
}

export function modulesForCompact(compact) {
  const needed = new Set()
  for (const [, layoutCode, steps] of compact ?? []) {
    for (const m of LAYOUT_NEEDS[layoutCode] ?? []) needed.add(m)
    for (const [code] of steps ?? []) {
      const m = moduleForCode(code)
      if (m) needed.add(m)
    }
  }
  return [...needed]
}

export {
  LAYOUTS, FUNCS, CLR, FUNC_META,
  expandStep, expandCompact,
  compactStep, compactLesson,
  repairBackslashes, parseCompact,
}
