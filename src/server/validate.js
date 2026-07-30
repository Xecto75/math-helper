// Validation + deterministic repair of a generated lesson, in compact form.
//
// SCOPE — read this before adding a rule.
// A rule may block or rewrite a lesson ONLY if it corresponds to something the
// engine actually rejects. An earlier version encoded assumptions instead, and
// produced 24 false positives on lessons that render perfectly. Auditing the
// engine showed why: every registry lookup in threeEngine is null-guarded, so a
// step naming a shape that does not exist is a silent no-op, not a crash; and
// every display slot is mounted on every layout (App.jsx), so a geometry step on
// a text+equation layout draws into a hidden slot rather than failing. Neither
// is an error. They are now warnings — logged, never acted on.
//
// The bar for a hard error is: I can point at the line that throws.
//
// Three layers, in order of preference:
//   1. repairLesson()  — fix it here, no API call. Most model slips are
//                        mechanical ("v0" where a number was wanted) and do not
//                        need a second opinion.
//   2. the AI retry    — only for what layer 1 cannot fix (see buildRepairPrompt)
//   3. dropBadSteps()  — last resort. A missing step is a slightly thinner
//                        lesson; an invalid step is a crash in front of a user.
//
// Layer 3 is what makes the whole thing terminate: there is no "try again until
// it works" path, so no loop.

import { FUNCS, LAYOUTS, FUNC_META, CLR } from './codec.js'
import { PALETTE } from '../engine/palette.js'

// Which display panels each layout actually shows. A geometry step on a layout
// with no geo panel is the class of error that produced a runtime crash.
const PANELS = {
  sg: ['graph'],                sG: ['geo'],      s3: ['geo'],
  sq: ['table'],                se: ['equation'], sc: ['calc'],
  sT: ['text'],                 sm: ['mult'],     sk: ['clock'],
  sn: ['numbers'],              sM: ['text'],
  tg: ['text', 'graph'],        tG: ['text', 'geo'],
  tq: ['text', 'table'],        te: ['text', 'equation'],
  ge: ['graph', 'equation'],    Ge: ['geo', 'equation'],
  qe: ['table', 'equation'],
}

// Panel a function needs, by compact-code prefix. Mirrors moduleForCode in
// codec.js but answers "which panel", not "which doc".
function panelForCode(code) {
  if (code === 'n' || code === 'sL') return null
  if (code.startsWith('S2') || code.startsWith('S3')) return 'geo'
  if (code.startsWith('T')) return 'table'
  if (code.startsWith('f')) return 'graph'
  if (code.startsWith('g')) return 'geo'
  if (code.startsWith('e')) return 'equation'
  if (code.startsWith('t')) return 'text'
  if (code.startsWith('c')) return null      // comments attach to whatever is there
  return null
}

// Codes that CREATE a referenceable shape, and the arg index holding its id.
const SHAPE_CREATORS = { S2c: 0, S3c: 0, gp: 0 }
// Codes that REFERENCE a shape by id, and the arg index holding it.
const SHAPE_REFS = {
  S2l: 0, S2a: 0, S2h: 0, S2E: 0, S2A: 0, S2m: 0, S2x: 0, S2f: 0, S2r: 0,
  S2tk: 0, S2w: 0, S2W: 0, S3m: 0, S3t: 0, S3x: 0,
  cG: 2, cE: 2,                                   // comments: [cmtId, text, shapeId, …]
  gl: 0, ga: 0, gh: 0, gE: 0, gA: 0, gr: 0,
}

const isNumeric = v => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v))
const HEX = /^#[0-9a-f]{3,8}$/i
// "v0" / "e2" — the vertex/edge reference syntax, valid elsewhere but not where
// a bare index is expected.
const VE_REF = /^[ve]\d+$/i
// Every colour the renderer actually accepts: the app palette, the reserved
// system blue, and the 8 pickable compact indices. resolveColor() passes an
// unknown name straight through, so flagging one is about catching typos, not
// preventing a crash.
// 'amber' is not in PALETTE but is the shipped default for several functions
// and appears in hand-built lessons; blanking it would change how existing
// lessons look, which is a worse outcome than tolerating an off-palette name.
const COLOR_NAMES = new Set([...Object.keys(PALETTE), ...CLR, 'blue', 'teal', 'amber', ''])

// Layout may be given as a compact code (te) or a full name (text-equation);
// exercise pages legitimately have none at all.
const LAYOUT_NAMES = new Set(Object.values(LAYOUTS))
const layoutCodeOf = (l) => (LAYOUTS[l] ? l
  : Object.keys(LAYOUTS).find(k => LAYOUTS[k] === l) ?? null)

function defsFor(code) {
  const funcId = FUNCS[code]
  return funcId ? (FUNC_META[funcId] ?? []) : null
}

// The text-box fields whose value is "lines separated by |" (tc.content,
// ti.item, tf.content). No other function has a field with these ids.
const TEXT_CONTENT = new Set(['content', 'item'])

// A line that is nothing but back-to-back $…$ formulas, e.g.
// "$\sin\theta=\frac{o}{h}$ $\cos\theta=\frac{a}{h}$" → one per line.
const ALL_FORMULAS = /^\s*(?:\$[^$]+\$[\s,;]*){2,}$/

function splitFormulaLines(content) {
  return content.split('|').map(line => {
    if (!ALL_FORMULAS.test(line)) return line
    return (line.match(/\$[^$]+\$/g) ?? [line]).join('|')
  }).join('|')
}

// ── The rule list ───────────────────────────────────────────────────────────
// Each entry inspects ONE step and returns issues. `fix` mutates vals in place
// and returns true when it repaired the value.
const RULES = [
  {
    id: 'unknown-func',
    check: (code) => (FUNCS[code] ? null : `unknown function code "${code}"`),
    fix: null,                                   // nothing sane to substitute
  },
  {
    id: 'bad-number',
    // Only ONE shape is auto-repaired: "v0"/"e2", the model reusing the
    // vertex/edge REF syntax where a bare index belongs. Anything else that
    // merely looks non-numeric is REPORTED, never coerced — several number
    // fields legitimately hold a comma list ("3,4" = the two legs of a right
    // triangle), and silently turning that into 3 corrupts a valid lesson,
    // which is worse than the error we set out to catch.
    perArg: (def, val) => {
      if (def.type !== 'number' || val === '' || isNumeric(val)) return null
      const v = String(val).trim()
      if (VE_REF.test(v)) return null                      // handled by fixArg below
      if (/^-?\d+(\.\d+)?([,\s]+-?\d+(\.\d+)?)+$/.test(v)) return null   // list of numbers
      if (/[a-z_[\]^*/+()]/i.test(v)) return null          // an expression, ^, or an [id]token ref
      return `${def.id}: expected a number, got ${JSON.stringify(val)}`
    },
    fixArg: null,
  },
  {
    id: 'vertex-ref-as-number',
    perArg: (def, val) => (def.type === 'number' && VE_REF.test(String(val).trim()))
      ? `${def.id}: ${JSON.stringify(val)} is a vertex/edge ref, expected a bare index`
      : null,
    fixArg: (def, val) => Number(String(val).trim().slice(1)),
  },
  {
    id: 'bad-select',
    perArg: (def, val) => {
      if (def.type !== 'select' || val === '') return null
      const allowed = (def.options ?? []).map(o => String(o.value))
      if (!allowed.length) return null
      const v = String(val)
      // 0/1 are the documented booleans for two-value selects.
      if (allowed.includes('false') && allowed.includes('true') && (v === '0' || v === '1')) return null
      return allowed.includes(v) ? null : `${def.id}: ${JSON.stringify(val)} not one of ${allowed.join('|')}`
    },
    fixArg: null,   // a wrong default is worse than the original value
  },
  {
    // Two or more formulas crammed into ONE text-box line: the panel is narrow,
    // so they wrap wherever they happen to run out of room — mid-fraction, with
    // the numerator of one formula sitting above the denominator of the next.
    // Each formula gets its own line (|) instead.
    //
    // Deliberately narrow: only a line made up ENTIRELY of $…$ chunks is split.
    // A sentence like "$a$ and $b$ are equal" also holds two $…$ groups and is
    // perfectly readable on one line — splitting that would break real prose.
    id: 'formulas-on-one-line',
    perArg: (def, val) => {
      if (!TEXT_CONTENT.has(def.id) || typeof val !== 'string') return null
      return splitFormulaLines(val) === val
        ? null
        : `${def.id}: several formulas share one line — they wrap mid-fraction`
    },
    fixArg: (def, val) => splitFormulaLines(String(val)),
  },
  {
    id: 'bad-color',
    perArg: (def, val) => {
      if (def.type !== 'color-name' || val === '') return null
      if (typeof val === 'number') return val >= 0 && val < CLR.length ? null : `${def.id}: color index ${val} out of range`
      const v = String(val)
      return (COLOR_NAMES.has(v.toLowerCase()) || HEX.test(v)) ? null : `${def.id}: unknown color ${JSON.stringify(v)}`
    },
    fixArg: (def, val) => (typeof val === 'number' ? 0 : (def.default || '')),
  },
]

// ── Validate + repair one lesson ────────────────────────────────────────────
export function repairLesson(compact) {
  const fixed    = []      // human-readable log of what layer 1 changed
  const warnings = []      // cosmetic only — never sent to the AI
  const issues = []        // what it could NOT fix — these go to the AI

  const pages = (compact ?? []).map((page, pi) => {
    let [title, layoutCode, steps] = page
    steps = steps ?? []

    // Exercise pages carry no layout; both the compact code and the full name
    // appear in the wild.
    let curLayout = layoutCode ? layoutCodeOf(layoutCode) : null
    if (layoutCode && !curLayout && !LAYOUT_NAMES.has(layoutCode)) {
      warnings.push(`p${pi}: unknown layout "${layoutCode}"`)
    }

    // Shapes created so far on this page, so a reference to a shape that does
    // not exist can be spotted (a very common cause of a null deref later).
    const created = new Set()

    const outSteps = steps.map((step, si) => {
      const [code, ...vals] = step
      const where = { page: pi, step: si, code }

      const defs = defsFor(code)
      if (!defs) {
        issues.push({ ...where, kind: 'unknown-func', message: `unknown function code "${code}"`, fatal: true })
        return step
      }

      // per-argument type rules
      defs.forEach((def, i) => {
        if (i >= vals.length) return
        const val = vals[i]
        if (val === '' || val === null || val === undefined) return
        for (const rule of RULES) {
          if (!rule.perArg) continue
          const msg = rule.perArg(def, val)
          if (!msg) continue
          if (rule.fixArg) {
            const next = rule.fixArg(def, val)
            fixed.push(`p${pi}s${si} ${code}.${def.id}: ${JSON.stringify(val)} → ${JSON.stringify(next)} (${rule.id})`)
            vals[i] = next
          } else {
            // The input TYPES come from the builder's own field definitions,
            // which are a UI hint, not a contract the engine enforces — a
            // "number" field happily takes "3,4" or "5^2". Report only.
            warnings.push(`p${pi}s${si} ${code}.${def.id}: ${msg}`)
          }
          break
        }
      })

      // shape bookkeeping
      if (SHAPE_CREATORS[code] !== undefined) {
        const id = vals[SHAPE_CREATORS[code]]
        if (id) created.add(String(id))
      } else if (SHAPE_REFS[code] !== undefined) {
        const idx = SHAPE_REFS[code]
        const id  = vals[idx]
        if (id && !created.has(String(id))) {
          if (created.size === 1) {
            const only = [...created][0]
            fixed.push(`p${pi}s${si} ${code}: shape "${id}" never created → "${only}"`)
            vals[idx] = only
          } else {
            // Not an error: threeEngine's lookups are all guarded, so this is a
            // step that quietly does nothing.
            warnings.push(`p${pi}s${si} ${code}: shape "${id}" is never created on this page`)
          }
        }
      }

      // sL switches this page's layout part-way through, so panel checks must
      // follow the CURRENT layout — not the one the page started on. Missing
      // this flagged every valid lesson that evolves its layout mid-page.
      if (code === 'sL' && vals[0]) {
        curLayout = layoutCodeOf(String(vals[0])) ?? curLayout
        return [code, ...vals]
      }

      // panel availability
      const need = panelForCode(code)
      const have = curLayout ? (PANELS[curLayout] ?? []) : []
      if (need && have.length && !have.includes(need)) {
        // Every display slot is mounted on every layout; the panel is merely
        // hidden by CSS. Worth reporting, never worth deleting a step over.
        warnings.push(`p${pi}s${si} ${code}: needs a ${need} panel, layout "${curLayout}" shows ${have.join(' + ')}`)
      }

      return [code, ...vals]
    })

    // a layout with a text panel must actually put something in it
    // An empty text panel looks unfinished but renders fine, and several
    // hand-built lessons do it deliberately — a warning, never a retry trigger.
    if (curLayout && (PANELS[curLayout] ?? []).includes('text') &&
        !outSteps.some(([c]) => c === 'tc' || c === 'tf')) {
      warnings.push(`p${pi}: layout "${curLayout}" has a text panel but no tc step`)
    }

    return [title, layoutCode, outSteps]
  })

  return { lesson: pages, fixed, warnings, issues }
}

// Layer 3. Removes only the steps that are still broken; the page and the rest
// of its steps survive.
export function dropBadSteps(compact, issues) {
  const bad = new Set(issues.filter(i => i.step !== undefined).map(i => `${i.page}:${i.step}`))
  if (!bad.size) return compact
  return compact.map((page, pi) => {
    const [title, layout, steps] = page
    return [title, layout, (steps ?? []).filter((_, si) => !bad.has(`${pi}:${si}`))]
  })
}

// Layer 2. The third prompt: the offending steps, what is wrong with them, and
// the documentation for exactly those functions — nothing else, so the model is
// not re-reading the whole catalogue to fix one argument.
export function buildRepairPrompt(compact, issues, docFor) {
  const byStep = new Map()
  for (const i of issues) {
    if (i.step === undefined) continue
    const key = `${i.page}:${i.step}`
    if (!byStep.has(key)) byStep.set(key, [])
    byStep.get(key).push(i)
  }

  const blocks = [...byStep.entries()].map(([key, list]) => {
    const [pi, si] = key.split(':').map(Number)
    const step = compact[pi]?.[2]?.[si]
    return [
      `PAGE ${pi} STEP ${si}  (layout "${compact[pi]?.[1]}")`,
      `  step   : ${JSON.stringify(step)}`,
      ...list.map(i => `  problem: [${i.kind}] ${i.message}`),
    ].join('\n')
  })

  const codes = [...new Set([...byStep.values()].flat().map(i => i.code).filter(Boolean))]
  const docs  = codes.map(c => docFor(c)).filter(Boolean)

  return `Your compact-format lesson has invalid steps. Fix ONLY these; keep every other step, the topic, the titles and the teaching order exactly as they are.

${blocks.join('\n\n')}

DOCS for the functions involved:
${docs.join('\n')}

Reply with the COMPLETE corrected lesson (all pages, not just the fixed steps) as raw JSON, no prose, no fences.`
}
