import 'dotenv/config'
import fs         from 'fs'
import path       from 'path'
import express    from 'express'
import cors       from 'cors'
import Anthropic  from '@anthropic-ai/sdk'
import { CATEGORIES } from './src/data/functions.js'
import { ROUTER_SYSTEM_PROMPT, buildGeneratorPrompt } from './src/data/moduleCatalog.js'

const app  = express()
const port = 3001
app.use(cors())
app.use(express.json())

// ── Example overrides — a real file on disk, not browser localStorage ────────
// A lesson built/edited in the Builder and saved over a bundled Example used
// to live ONLY in the browser's own localStorage: invisible to anyone editing
// the source (including Claude), lost on a cleared profile, never in git.
// Saving now writes here instead — a plain JSON map of exampleId → pages,
// tracked in the repo like any other file, so "I edited and saved it" and
// "it's now the real content" mean the same thing.
const OVERRIDES_PATH = path.join(process.cwd(), 'src/data/exampleOverrides.json')

function readOverridesFile() {
  try { return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8')) } catch { return {} }
}
function writeOverridesFile(obj) {
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(obj, null, 2) + '\n')
}

app.get('/api/example-overrides', (req, res) => {
  res.json(readOverridesFile())
})

app.post('/api/example-overrides/:id', (req, res) => {
  const { pages } = req.body
  if (!Array.isArray(pages)) return res.status(400).json({ error: 'pages must be an array' })
  const all = readOverridesFile()
  all[req.params.id] = pages
  writeOverridesFile(all)
  res.json({ ok: true })
})

app.delete('/api/example-overrides/:id', (req, res) => {
  const all = readOverridesFile()
  delete all[req.params.id]
  writeOverridesFile(all)
  res.json({ ok: true })
})

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

// ── Request 1: Router ─────────────────────────────────────────────────────────

async function routeModules(prompt) {
  const t0 = Date.now()
  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system:     ROUTER_SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: prompt }],
  })
  const raw  = message.content[0]?.text?.trim() ?? '{}'
  const u    = message.usage ?? {}
  const cost = (u.input_tokens * 0.8 + u.output_tokens * 4) / 1_000_000
  console.log(`\n─── Router (haiku) ${Date.now() - t0}ms  in:${u.input_tokens} out:${u.output_tokens}  $${cost.toFixed(5)}`)
  console.log('  raw:', raw)

  let result
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    result = { status: parsed.status ?? 'ok', modules: parsed.modules ?? [], message: parsed.message }
  } catch {
    console.warn('  Router parse failed — falling back to equation+text')
    result = { status: 'ok', modules: ['equation', 'text'] }
  }
  console.log('  status:', result.status, result.status === 'ok' ? `modules:${result.modules}` : result.message ?? '')
  return result
}

// ── Request 2: Generator ──────────────────────────────────────────────────────

async function generateCompact(prompt, moduleIds) {
  const systemPrompt = buildGeneratorPrompt(moduleIds)
  const t0 = Date.now()

  console.log(`\n─── Generator (sonnet) modules=[${moduleIds.join(',')}]`)
  console.log('  system prompt chars:', systemPrompt.length)

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 8192,
    system:     [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = message.content[0]?.text ?? ''
  const u = message.usage ?? {}
  const tok = {
    in:     u.input_tokens                ?? 0,
    cRead:  u.cache_read_input_tokens     ?? 0,
    cWrite: u.cache_creation_input_tokens ?? 0,
    out:    u.output_tokens               ?? 0,
  }
  const cost = (tok.in * 3 + tok.cWrite * 3.75 + tok.cRead * 0.30 + tok.out * 15) / 1_000_000
  console.log(`  ${Date.now() - t0}ms  in:${tok.in} cRead:${tok.cRead} cWrite:${tok.cWrite} out:${tok.out}  $${cost.toFixed(5)}`)
  console.log('  stop reason:', message.stop_reason)
  console.log('─── raw output ──────────────────────────────')
  console.log(rawText)
  console.log('─────────────────────────────────────────────\n')

  return rawText
}

// ── API endpoint ──────────────────────────────────────────────────────────────

app.post('/api/generate-lesson', async (req, res) => {
  const { prompt } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  let rawApiText = null
  try {
    // ── Step 1: Route ────────────────────────────────────────────────────────
    const route = await routeModules(prompt)

    if (route.status !== 'ok') {
      return res.json({ status: route.status, message: route.message })
    }
    const moduleIds = route.modules

    // ── Step 2: Generate ─────────────────────────────────────────────────────
    rawApiText = await generateCompact(prompt, moduleIds)

    const compact  = parseCompact(rawApiText)
    const expanded = expandCompact(compact)
    const lesson   = JSON.stringify(expanded)

    res.json({ lesson, modules: moduleIds })

  } catch (err) {
    console.error('generate-lesson error:', err)
    console.error('raw API output:\n', rawApiText)
    res.status(500).json({ error: err.message ?? 'Generation failed', rawOutput: rawApiText })
  }
})

app.listen(port, () => console.log(`math-engine server → http://localhost:${port}`))
