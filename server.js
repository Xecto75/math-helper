import 'dotenv/config'
import fs         from 'fs'
import path       from 'path'
import express    from 'express'
import cors       from 'cors'
import { CATEGORIES } from './src/data/functions.js'
import { routerSystemPrompt, buildGeneratorPrompt, docForCode, lessonLang } from './src/data/moduleCatalog.js'
import { EXAMPLE_LESSONS } from './src/data/exampleLessons.js'
import {
  authConfigured, getUser, getProfile, consumeCredit, refundCredit, FREE_LESSON_LIMIT,
  isAdminEmail,
} from './src/server/auth.js'
import { clientIp, consumeAnon, refundAnon } from './src/server/anonQuota.js'

const app  = express()
// A host decides which port it wants the process to listen on and passes it in;
// 3001 is only the local default. Without this the deployed service binds a
// port nothing is routed to and the platform reports it as unhealthy.
const port = process.env.PORT ?? 3001
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

// Which model answers is a setting, not a rewrite — see src/server/llm.js.
import { generate, MODELS } from './src/server/llm.js'

import {
  LAYOUTS, FUNCS, CLR, FUNC_META,
  expandStep, expandCompact, compactStep, compactLesson,
  repairBackslashes, parseCompact, modulesForCompact,
} from './src/server/codec.js'
import { repairLesson, dropBadSteps, buildRepairPrompt } from './src/server/validate.js'
import { startTrace } from './src/server/trace.js'
import { costOf } from './src/server/pricing.js'

// ── TEMPORARY: the router's refusals are switched off ────────────────────────
// Asked for on 2026-09-20, meant to be short-lived. With this false, a prompt
// the router calls off-topic, too-advanced or trivial is generated anyway,
// out of whatever displays fit it best. To put the limits back: set it to true
// AND delete the paragraph marked TEMPORARY in the router prompt
// (src/data/moduleCatalog.js), which tells the router to answer "ok" to
// everything.
const ENFORCE_ROUTER_VERDICT = false

// Single door to the API: every request and its full response is written to the
// run's transcript file here, so no call can be logged partially or forgotten.
async function callModel(trace, label, params) {
  const t0 = Date.now()
  const res = await generate(params)
  trace?.call(label, res.request, res.raw, Date.now() - t0)
  return res
}

// ── Request 1: Router ─────────────────────────────────────────────────────────

async function routeModules(prompt, trace) {
  const t0 = Date.now()
  const examples = availableExamples()
  const res = await callModel(trace, `Router (${MODELS.router})`, {
    model:     MODELS.router,
    // 256 was sized for the answer alone — a two-line JSON object. This model
    // thinks before it writes and its reasoning is billed against the SAME
    // budget, so the budget ran out during the thinking and the reply was cut
    // off mid-key: "{"status":"ok"," and nothing else. Every downstream
    // symptom came from that one line — no modules, no exampleId, the
    // equation+text fallback, and a lesson with no visual in it. Room to
    // think costs nothing when it is not used: only tokens actually produced
    // are billed.
    maxTokens: 2048,
    system:    routerSystemPrompt(examples),
    user:      prompt,
  })
  const raw  = res.text.trim() || '{}'
  const u    = res.usage ?? {}
  const cost = costOf(MODELS.router, u)
  // Prompts and raw model output go to the transcript file only — the console
  // keeps the one-line summary you actually read while a lesson is building.
  console.log(`\n─── Router (${MODELS.router}) ${Date.now() - t0}ms  in:${u.input_tokens} out:${u.output_tokens}  $${cost.toFixed(5)}`)

  let result
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    result = {
      status:  parsed.status ?? 'ok',
      lang:    lessonLang(parsed.lang),
      modules: parsed.modules ?? [],
      message: parsed.message,
      // 1 to 3 reference lessons, closest first. A lone "exampleId" is read too,
      // since that is the form the prompt's own examples still show. An id that
      // names no lesson with content is the same as none at all — the caller's
      // fallback then picks one that exists.
      exampleIds: [...new Set([].concat(parsed.exampleIds ?? [], parsed.exampleId ?? []))]
        .filter(id => examples.some(e => e.id === id))
        .slice(0, 3),
      // too-advanced only: reference lessons to offer instead. Filtered to ids
      // that actually exist, so a hallucinated one can never reach the UI as a
      // button that loads nothing.
      alternatives: (Array.isArray(parsed.alternatives) ? parsed.alternatives : [])
        .filter(id => examples.some(e => e.id === id)),
    }
  } catch {
    if (res.stopReason === 'MAX_TOKENS' || res.stopReason === 'length') {
      console.warn(`  Router hit its token ceiling and was cut off — raise maxTokens. Raw: ${JSON.stringify(raw.slice(0, 60))}`)
    } else {
      console.warn('  Router parse failed — falling back to equation+text')
    }
    result = { status: 'ok', lang: null, modules: ['equation', 'text'], exampleIds: [] }
  }
  console.log('  status:', result.status, `lang:${result.lang ?? '—'}`, result.status === 'ok' ? `modules:${result.modules} examples:${result.exampleIds.join(',') || '—'}` : result.message ?? '')
  result.cost = cost
  return result
}

// ── Request 2: Generator ──────────────────────────────────────────────────────

// Which reference lesson stands in when the router names none. Keyed on the
// display the lesson will be built around, since what the generator needs from
// the reference is how a lesson on THAT display is structured — a shape being
// created, labelled and annotated; a curve being plotted and marked up — not
// the topic it happens to teach.
const FALLBACK_BY_MODULE = {
  geo2d:      'pythagoras',
  geo_canvas: 'pythagoras',
  geo3d:      'volumes',
  graph:      'linear-functions',
  table:      'correlation',
  equation:   'linear-eq',
  calc:       'linear-eq',
}
const FALLBACK_ORDER = ['geo2d', 'geo_canvas', 'geo3d', 'graph', 'table', 'calc', 'equation']

function fallbackExample(moduleIds = []) {
  const hit = FALLBACK_ORDER.find(m => moduleIds.includes(m))
  return (hit && FALLBACK_BY_MODULE[hit]) || 'linear-eq'
}

// Resolve the router's pick to compact form. Overrides win over the bundled
// source, so the reference is whatever the author last saved.
// The lessons that can be a model right now: those with at least one step,
// saved or bundled. An example added empty, to be built in the Builder, stays
// out of the router's list until something is in it.
function availableExamples() {
  const overrides = readOverridesFile()
  return EXAMPLE_LESSONS.filter(e =>
    (overrides[e.id] ?? e.pages ?? []).some(p => (p.steps ?? []).length > 0))
}

function referenceLesson(exampleId) {
  if (!exampleId) return null
  const pages = readOverridesFile()[exampleId]
             ?? EXAMPLE_LESSONS.find(e => e.id === exampleId)?.pages
  if (!pages) return null
  try { return compactLesson(pages) } catch { return null }
}

async function generateCompact(prompt, moduleIds, lang = null, exampleIds = [], trace = null) {
  // Last line of defence: an id that resolves to nothing (its pages were
  // deleted, its steps no longer compact cleanly) is dropped, and when none is
  // left the fallback stands in rather than send the generator out with no
  // model at all.
  const hasSteps = r => Array.isArray(r) && r.some(p => (p?.[2] ?? []).length > 0)
  let references = exampleIds.map(referenceLesson).filter(hasSteps)
  if (!references.length) references = [referenceLesson(fallbackExample(moduleIds))].filter(hasSteps)
  if (!references.length) console.warn('  WARNING: no reference lesson resolved — output quality will suffer')

  // Whatever the reference lessons use, their docs must be in the prompt too —
  // otherwise we hand the model codes it has no definition for and it copies
  // them blindly. Union, not replace: the router's picks reflect what the USER
  // asked for, the references' are what the EXAMPLES need to be readable.
  const needed = [...new Set(references.flatMap(r => modulesForCompact(r)))]
  const merged = [...new Set([...moduleIds, ...needed])]
  const added  = needed.filter(m => !moduleIds.includes(m))

  const systemPrompt = buildGeneratorPrompt(merged, lang, references)
  const t0 = Date.now()

  console.log(`\n─── Generator (${MODELS.generator}) modules=[${moduleIds.join(',')}]`)

  const res = await callModel(trace, `Generator (${MODELS.generator})`, {
    model: MODELS.generator,
    // A 5-6 page lesson in compact codes runs well under this; the headroom is
    // so a long one is never truncated mid-lesson.
    maxTokens:   12000,
    system:      systemPrompt,
    user:        prompt,
    cacheSystem: true,
  })

  const rawText = res.text
  const u = res.usage ?? {}
  const tok = {
    in:     u.input_tokens                ?? 0,
    cRead:  u.cache_read_input_tokens     ?? 0,
    cWrite: u.cache_creation_input_tokens ?? 0,
    out:    u.output_tokens               ?? 0,
  }
  const cost = costOf(MODELS.generator, u)
  console.log(`  ${Date.now() - t0}ms  in:${tok.in} cRead:${tok.cRead} cWrite:${tok.cWrite} out:${tok.out}  $${cost.toFixed(5)}`)
  console.log('  stop reason:', res.stopReason)

  return { rawText, cost }
}

// Layer 2 — the third request. Sends only the broken steps, what is wrong with
// them, and the docs for those exact functions.
async function repairWithAI(compact, issues, trace) {
  const t0 = Date.now()
  const res = await callModel(trace, `Repair (${MODELS.generator})`, {
    model:     MODELS.generator,
    maxTokens: 12000,
    system:    buildRepairPrompt(compact, issues, docForCode),
    user:      'Return the corrected lesson.',
  })
  const u    = res.usage ?? {}
  const cost = costOf(MODELS.generator, u)
  console.log(`
─── Repair (${MODELS.generator}) ${Date.now() - t0}ms  in:${u.input_tokens} out:${u.output_tokens}  $${cost.toFixed(5)}`)
  return res.text
}

// ── Health check ─────────────────────────────────────────────────────────────
// The API serves no pages — the site is hosted separately — so hitting the root
// used to return Express's bare "Cannot GET /", which reads as a broken deploy
// when it is really a healthy server with nothing to show at that address. This
// says so, and doubles as the thing a host or an uptime check can poll.
app.get('/', (req, res) => {
  res.json({
    service: 'math-engine API',
    status:  'ok',
    auth:    authConfigured ? 'configured' : 'NOT CONFIGURED',
    hint:    'This is the API. The site is hosted separately. Try /api/me.',
  })
})

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
    // Authoring rights, decided here and nowhere else. The client only ever
    // reads this to decide what to draw.
    admin: isAdminEmail(profile.email),
  })
})

// ── API endpoint ──────────────────────────────────────────────────────────────

app.post('/api/generate-lesson', async (req, res) => {
  const { prompt } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })

  // Gate BEFORE any paid API call. Identity and quota are checked here,
  // server-side, because this is the only place that cannot be bypassed. The
  // client also hides the button when a user is out of credits, but that is
  // cosmetic: anyone can POST straight to this endpoint, and each call spends
  // real money on the model provider (see src/server/llm.js).
  let auth   = null
  let anonIp = null
  if (authConfigured) {
    // No Authorization header at all = someone who has not signed up yet.
    // They get the anonymous allowance instead of a wall (see anonQuota.js).
    //
    // A header that IS present but invalid or expired is NOT this case: it
    // falls through to getUser() and still comes back 401, so a session that
    // died says so rather than quietly looking like a brand-new visitor and
    // spending the free lesson meant for one.
    const hasToken = String(req.headers.authorization ?? '').startsWith('Bearer ')

    if (!hasToken) {
      const ip = clientIp(req)
      const { allowed, reason } = consumeAnon(ip)
      if (!allowed) return res.status(401).json({ error: 'Not signed in', reason })
      anonIp = ip
    } else {
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
  }

  // One credit was taken above — from an account or from the anonymous pool.
  // Every path that ends without a lesson has to give it back through here.
  const refund = async () => {
    if (auth) await refundCredit(auth.user.id)
    else if (anonIp) refundAnon(anonIp)
  }

  let rawApiText = null
  const trace = startTrace(prompt)
  try {
    // ── Step 1: Route ────────────────────────────────────────────────────────
    const route = await routeModules(prompt, trace)
    // The language the prompt is written in, read by the router — there is no
    // setting for it. The lesson, a refusal's message and the labels the
    // client writes itself (conic element names…) all follow it.
    const lang = route.lang
    trace.note(`lang: ${lang ?? '— none from the router, the generator reads it off the request'}`)

    if (ENFORCE_ROUTER_VERDICT && route.status !== 'ok') {
      // No lesson was produced, so the credit should not be spent.
      await refund()
      trace.section('REFUSED', `status: ${route.status}\n${route.message ?? ''}\n` +
        `alternatives: ${route.alternatives?.join(', ') || '—'}`)
      trace.finish()
      return res.json({
        status: route.status,
        message: route.message,
        alternatives: route.alternatives ?? [],
        lang,
      })
    }
    if (route.status !== 'ok') {
      console.log(`  router said "${route.status}" — refusals are off, generating anyway`)
      trace.note(`router verdict "${route.status}" ignored — ENFORCE_ROUTER_VERDICT is off`)
    }
    // A refused verdict comes with no modules of its own, so the equation and
    // text panels stand in: something every topic can be written on.
    const moduleIds = route.modules?.length ? route.modules : ['equation', 'text']
    // The generator is never sent to work without a worked model: it copies
    // one, and with nothing to copy it invents pages with nothing good on them.
    // The reference does NOT have to share the topic — it is a model of how a
    // lesson is BUILT — so when the router sends no example the closest
    // structural match for the modules it picked stands in.
    const exampleIds = route.exampleIds?.length ? route.exampleIds : [fallbackExample(moduleIds)]
    if (!route.exampleIds?.length) {
      console.log(`  router sent no example — falling back to "${exampleIds[0]}"`)
      trace.note(`(no example from the router — fell back to "${exampleIds[0]}")`)
    }

    // ── Step 2: Generate ─────────────────────────────────────────────────────
    const gen = await generateCompact(prompt, moduleIds, lang, exampleIds, trace)
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

    res.json({ lesson, modules: moduleIds, lang })

  } catch (err) {
    // The user asked for a lesson and did not get one — that is on us, not on
    // their monthly allowance.
    await refund()
    // The raw output that caused it is in the transcript file, under ERROR.
    console.error('generate-lesson error:', err.message)
    trace.section('ERROR', `${err.stack ?? err.message}\n\nraw API output:\n${rawApiText ?? '(none)'}`)
    trace.finish()
    res.status(500).json({ error: err.message ?? 'Generation failed', rawOutput: rawApiText })
  }
})

app.listen(port, () => console.log(`math-engine server → http://localhost:${port}`))
