import 'dotenv/config'
import fs         from 'fs'
import path       from 'path'
import express    from 'express'
import cors       from 'cors'
import Anthropic  from '@anthropic-ai/sdk'
import { CATEGORIES } from './src/data/functions.js'
import { ROUTER_SYSTEM_PROMPT, buildGeneratorPrompt, docForCode } from './src/data/moduleCatalog.js'
import { EXAMPLE_LESSONS } from './src/data/exampleLessons.js'
import {
  authConfigured, getUser, getProfile, consumeCredit, refundCredit, FREE_LESSON_LIMIT,
} from './src/server/auth.js'

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

// ── Example locks — "I'm done building this, it's final" ────────────────────
// A plain JSON map of exampleId -> true, tracked in the repo like the
// overrides file above. A locked example is meant to be READ-ONLY from here
// on: the Lesson Builder UI refuses to edit/save over it, and — just as
// importantly — an AI agent editing this codebase directly (exampleLessons.js
// or exampleOverrides.json) must treat a locked id as off-limits too, unless
// the user explicitly asks to unlock/override it first. Toggled by a 2s
// long-press on the example's card (see LessonBuilder.jsx).
const LOCKS_PATH = path.join(process.cwd(), 'src/data/exampleLocks.json')

function readLocksFile() {
  try { return JSON.parse(fs.readFileSync(LOCKS_PATH, 'utf8')) } catch { return {} }
}
function writeLocksFile(obj) {
  fs.writeFileSync(LOCKS_PATH, JSON.stringify(obj, null, 2) + '\n')
}

app.get('/api/example-locks', (req, res) => {
  res.json(readLocksFile())
})

app.post('/api/example-locks/:id', (req, res) => {
  const { locked } = req.body
  const all = readLocksFile()
  if (locked) all[req.params.id] = true
  else delete all[req.params.id]
  writeLocksFile(all)
  res.json({ ok: true })
})

// The rate card now lives in src/server/pricing.js so the transcript writer can
// price each call with the same numbers this file bills from.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

import {
  LAYOUTS, FUNCS, CLR, FUNC_META,
  expandStep, expandCompact, compactStep, compactLesson,
  repairBackslashes, parseCompact, modulesForCompact,
} from './src/server/codec.js'
import { repairLesson, dropBadSteps, buildRepairPrompt } from './src/server/validate.js'
import { startTrace } from './src/server/trace.js'
import { costOf } from './src/server/pricing.js'

// Single door to the API: every request and its full response is written to the
// run's transcript file here, so no call can be logged partially or forgotten.
async function callClaude(trace, label, params) {
  const t0 = Date.now()
  const message = await client.messages.create(params)
  trace?.call(label, params, message, Date.now() - t0)
  return message
}

// ── Request 1: Router ─────────────────────────────────────────────────────────

async function routeModules(prompt, trace) {
  const t0 = Date.now()
  const message = await callClaude(trace, 'Router (haiku)', {
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system:     ROUTER_SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: prompt }],
  })
  const raw  = message.content[0]?.text?.trim() ?? '{}'
  const u    = message.usage ?? {}
  const cost = costOf('claude-haiku-4-5-20251001', u)
  console.log(`\n─── Router (haiku) ${Date.now() - t0}ms  in:${u.input_tokens} out:${u.output_tokens}  $${cost.toFixed(5)}`)
  console.log('  raw:', raw)

  let result
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    result = {
      status:    parsed.status ?? 'ok',
      modules:   parsed.modules ?? [],
      message:   parsed.message,
      exampleId: parsed.exampleId ?? null,
      // too-advanced only: reference lessons to offer instead. Filtered to ids
      // that actually exist, so a hallucinated one can never reach the UI as a
      // button that loads nothing.
      alternatives: (Array.isArray(parsed.alternatives) ? parsed.alternatives : [])
        .filter(id => EXAMPLE_LESSONS.some(e => e.id === id)),
    }
  } catch {
    console.warn('  Router parse failed — falling back to equation+text')
    result = { status: 'ok', modules: ['equation', 'text'], exampleId: null }
  }
  console.log('  status:', result.status, result.status === 'ok' ? `modules:${result.modules} example:${result.exampleId ?? '—'}` : result.message ?? '')
  result.cost = cost
  return result
}

// ── Request 2: Generator ──────────────────────────────────────────────────────

// Resolve the router's pick to compact form. Overrides win over the bundled
// source, so the reference is whatever the author last saved.
function referenceLesson(exampleId) {
  if (!exampleId) return null
  const pages = readOverridesFile()[exampleId]
             ?? EXAMPLE_LESSONS.find(e => e.id === exampleId)?.pages
  if (!pages) return null
  try { return compactLesson(pages) } catch { return null }
}

async function generateCompact(prompt, moduleIds, lang = 'en', exampleId = null, trace = null) {
  const reference = referenceLesson(exampleId)

  // Whatever the reference lesson uses, its docs must be in the prompt too —
  // otherwise we hand the model codes it has no definition for and it copies
  // them blindly. Union, not replace: the router's picks reflect what the USER
  // asked for, the reference's are what the EXAMPLE needs to be readable.
  const needed = reference ? modulesForCompact(reference) : []
  const merged = [...new Set([...moduleIds, ...needed])]
  const added  = needed.filter(m => !moduleIds.includes(m))

  const systemPrompt = buildGeneratorPrompt(merged, lang, reference)
  const t0 = Date.now()

  console.log(`\n─── Generator (sonnet) modules=[${moduleIds.join(',')}]`)
  console.log('  system prompt chars:', systemPrompt.length)

  const message = await callClaude(trace, 'Generator (sonnet)', {
    model:      'claude-sonnet-4-6',
    // A 5-6 page lesson in compact codes runs well under this; the headroom is
    // so a long one is never truncated mid-lesson. Even if it were all used the
    // request still lands around $0.20, inside the $0.30 per-prompt ceiling.
    max_tokens: 12000,
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
  const cost = costOf('claude-sonnet-4-6', u)
  console.log(`  ${Date.now() - t0}ms  in:${tok.in} cRead:${tok.cRead} cWrite:${tok.cWrite} out:${tok.out}  $${cost.toFixed(5)}`)
  console.log('  stop reason:', message.stop_reason)
  console.log('─── raw output ──────────────────────────────')
  console.log(rawText)
  console.log('─────────────────────────────────────────────\n')

  return { rawText, cost }
}

// Layer 2 — the third request. Sends only the broken steps, what is wrong with
// them, and the docs for those exact functions.
async function repairWithAI(compact, issues, trace) {
  const t0 = Date.now()
  const message = await callClaude(trace, 'Repair (sonnet)', {
    model:      'claude-sonnet-4-6',
    max_tokens: 12000,
    system:     buildRepairPrompt(compact, issues, docForCode),
    messages:   [{ role: 'user', content: 'Return the corrected lesson.' }],
  })
  const u    = message.usage ?? {}
  const cost = costOf('claude-sonnet-4-6', u)
  console.log(`
─── Repair (sonnet) ${Date.now() - t0}ms  in:${u.input_tokens} out:${u.output_tokens}  $${cost.toFixed(5)}`)
  return message.content[0]?.text ?? ''
}

// ── Who am I / what's left ────────────────────────────────────────────────────
// The client renders from this, but never decides from it — the generate
// endpoint re-checks everything server-side on each call.
app.get('/api/me', async (req, res) => {
  if (!authConfigured) return res.json({ authConfigured: false })
  const { user, error, status } = await getUser(req)
  if (error) return res.status(status).json({ error })

  const { profile, error: pErr, status: pStatus } = await getProfile(user)
  if (pErr) return res.status(pStatus).json({ error: pErr })

  const used = profile.plan === 'pro' ? 0 : profile.lessons_used
  res.json({
    authConfigured: true,
    email: profile.email,
    displayName: profile.display_name,
    plan: profile.plan,
    lessonsUsed: used,
    freeLimit: FREE_LESSON_LIMIT,
    lessonsLeft: profile.plan === 'pro' ? null : Math.max(0, FREE_LESSON_LIMIT - used),
  })
})

// ── API endpoint ──────────────────────────────────────────────────────────────

app.post('/api/generate-lesson', async (req, res) => {
  const { prompt, lang = 'en' } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  // Gate BEFORE any paid API call. Identity and quota are checked here,
  // server-side, because this is the only place that cannot be bypassed. The
  // client also hides the button when a user is out of credits, but that is
  // cosmetic: anyone can POST straight to this endpoint, and each call spends
  // real money on the Anthropic API.
  let auth = null
  if (authConfigured) {
    const { user, error, status } = await getUser(req)
    if (error) return res.status(status).json({ error })

    const { result, error: qErr, status: qStatus } = await consumeCredit(user.id)
    if (qErr) return res.status(qStatus).json({ error: qErr })
    if (!result?.allowed) {
      return res.status(402).json({
        error: 'quota_exceeded',
        plan:  result?.plan ?? 'free',
        used:  result?.lessons_used ?? 0,
        limit: result?.free_limit ?? FREE_LESSON_LIMIT,
      })
    }
    auth = { user, quota: result }
  }

  let rawApiText = null
  const trace = startTrace(prompt, lang)
  try {
    // ── Step 1: Route ────────────────────────────────────────────────────────
    const route = await routeModules(prompt, trace)

    if (route.status !== 'ok') {
      // No lesson was produced, so the credit should not be spent.
      if (auth) await refundCredit(auth.user.id)
      trace.section('REFUSED', `status: ${route.status}\n${route.message ?? ''}\n` +
        `alternatives: ${route.alternatives?.join(', ') || '—'}`)
      trace.finish()
      return res.json({
        status: route.status,
        message: route.message,
        alternatives: route.alternatives ?? [],
      })
    }
    // No reference lesson, no lesson. The generator only produces something
    // worth showing when it has a verified lesson to model from; asked to
    // invent one from the docs alone it returns pages with nothing good on
    // them. Refused here, BEFORE the expensive generator call — and the credit
    // goes back, since the user got no lesson.
    if (!route.exampleId) {
      if (auth) await refundCredit(auth.user.id)
      const message = route.message ??
        'That topic is not covered yet. Every lesson here is built from a verified example, and none of them matches this one closely enough to build from.'
      console.log('  no reference lesson for this prompt — refusing before the generator call')
      trace.section('REFUSED', `status: not-covered (router said ok, exampleId null)\n${message}`)
      trace.finish()
      return res.json({ status: 'too-advanced', message, alternatives: [] })
    }

    const moduleIds = route.modules

    // ── Step 2: Generate ─────────────────────────────────────────────────────
    const gen = await generateCompact(prompt, moduleIds, lang, route.exampleId, trace)
    rawApiText = gen.rawText

    // ── Validate → repair → (one) AI retry → drop ────────────────────────
    // Bounded on purpose: there is no "retry until valid" path. Whatever is
    // still broken after one retry gets deleted, so a bad step can never reach
    // the renderer and the loop always terminates.
    let compact = parseCompact(rawApiText)
    let { lesson: repaired, fixed, warnings, issues } = repairLesson(compact)
    if (fixed.length)    console.log(`  auto-fixed ${fixed.length}:`, fixed.join(' | '))
    // Warnings never change the lesson — they are here to be read, so a rule
    // that keeps firing on good lessons can be spotted and removed rather than
    // silently deleting someone's content.
    if (warnings.length) console.log(`  ${warnings.length} warning(s):`, warnings.join(' | '))

    if (issues.length) {
      console.log(`  ${issues.length} issue(s) need the model:`, issues.map(i => i.kind).join(', '))
      try {
        const retryText = await repairWithAI(repaired, issues, trace)
        const second    = repairLesson(parseCompact(retryText))
        if (second.issues.length < issues.length) {
          repaired = second.lesson
          issues   = second.issues
          console.log(`  after retry: ${issues.length} left`)
        } else {
          console.log('  retry did not improve — keeping the first version')
        }
      } catch (e) {
        console.log('  repair request failed:', e.message)
      }
      if (issues.length) {
        repaired = dropBadSteps(repaired, issues)
        console.log(`  dropped ${issues.filter(i => i.step !== undefined).length} unfixable step(s)`)
      }
    }

    compact = repaired
    const expanded = expandCompact(compact)
    const lesson   = JSON.stringify(expanded)

    // One line to check both things that matter per prompt: did it pick the
    // right modules, and did the whole thing stay inside the cost ceiling.
    const total = (route.cost ?? 0) + (gen.cost ?? 0)
    const pages = Array.isArray(expanded) ? expanded.length : 0
    console.log(`═══ TOTAL  modules:[${moduleIds.join(',')}]  pages:${pages}` +
      `  $${total.toFixed(4)}${total > 0.30 ? '  ⚠ OVER $0.30' : ''}` +
      `${pages < 5 ? `  ⚠ only ${pages} pages (want 5-6)` : ''}
`)

    trace.section('VALIDATION', [
      `auto-fixed (${fixed.length}):`,     ...fixed.map(f => '  ' + f),
      `warnings (${warnings.length}):`,    ...warnings.map(w => '  ' + w),
      `unresolved issues (${issues.length}):`,
      ...issues.map(i => `  ${i.kind}${i.step !== undefined ? ` @step ${i.step}` : ''} ${i.detail ?? ''}`),
    ].join('\n'))
    trace.section('FINAL COMPACT (post-repair)',
      typeof compact === 'string' ? compact : JSON.stringify(compact, null, 2))
    trace.section(`FINAL LESSON — ${pages} page(s), $${total.toFixed(4)}`,
      JSON.stringify(expanded, null, 2))
    trace.finish()

    res.json({ lesson, modules: moduleIds })

  } catch (err) {
    // The user asked for a lesson and did not get one — that is on us, not on
    // their monthly allowance.
    if (auth) await refundCredit(auth.user.id)
    console.error('generate-lesson error:', err)
    console.error('raw API output:\n', rawApiText)
    trace.section('ERROR', `${err.stack ?? err.message}\n\nraw API output:\n${rawApiText ?? '(none)'}`)
    trace.finish()
    res.status(500).json({ error: err.message ?? 'Generation failed', rawOutput: rawApiText })
  }
})

app.listen(port, () => console.log(`math-engine server → http://localhost:${port}`))
