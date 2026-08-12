import { useState, useRef, useEffect } from 'react'
import { CATEGORIES, defaultInputs } from '../data/functions.js'
import { PRIMARY_DISPLAYS, SECONDARY_ACTIONS } from '../data/primaryDisplays.js'
import ColorInput from './ColorInput.jsx'
import { generateLesson } from '../api/generateLesson.js'
import { EXAMPLE_LESSONS } from '../data/exampleLessons.js'

// Flat funcId → inputDefs for new-style actions
const FUNC_INPUT_DEFS = {}
const FUNC_LABEL_MAP  = {}
for (const pd of PRIMARY_DISPLAYS) {
  for (const sa of pd.subActions) {
    FUNC_INPUT_DEFS[sa.funcId] = sa.inputDefs
    FUNC_LABEL_MAP[sa.funcId]  = (typeof sa.label === 'object' ? sa.label.en : sa.label) + ` (${sa.icon})`
  }
}
for (const sa of SECONDARY_ACTIONS) {
  FUNC_INPUT_DEFS[sa.funcId] = sa.inputDefs
  FUNC_LABEL_MAP[sa.funcId]  = (typeof sa.label === 'object' ? sa.label.en : sa.label) + ` (${sa.icon})`
}


const STORAGE_KEY        = 'math-engine-lessons'
const DRAFT_KEY          = 'math-engine-draft'
const ACTIVE_PAGE_KEY    = 'math-engine-active-page'
const PROMPT_KEY         = 'math-engine-last-prompt'
const EX_OVERRIDES_KEY   = 'math-engine-ex-overrides'
const EX_LOCKS_KEY       = 'math-engine-ex-locks'
const DEFAULT_ANIM_SPEED = 1  // normal playback speed multiplier

function readSlots() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function writeSlots(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
function readExOverrides() {
  try { return JSON.parse(localStorage.getItem(EX_OVERRIDES_KEY) ?? '{}') } catch { return {} }
}
function writeExOverrides(obj) {
  localStorage.setItem(EX_OVERRIDES_KEY, JSON.stringify(obj))
}

// ── Server-persisted example overrides ───────────────────────────────────────
// A real file on disk (src/data/exampleOverrides.json via server.js), not
// localStorage — so "Save" while editing a bundled Example actually becomes
// the shipped content (git-tracked, visible to anyone reading the source),
// instead of a copy only that one browser profile ever sees again.
async function fetchServerOverrides() {
  try {
    const res = await fetch('/api/example-overrides')
    if (!res.ok) return {}
    return await res.json()
  } catch { return {} }
}
async function saveOverrideToServer(id, pages) {
  try {
    await fetch(`/api/example-overrides/${encodeURIComponent(id)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages }),
    })
  } catch { /* server may be offline — local state already updated */ }
}

// ── Example locks — "I'm done building this, it's final" ─────────────────────
// A 2s long-press on an Examples card toggles this instead of opening it —
// a locked example gets a gold border and becomes read-only in the Builder.
//
// Persisted in TWO places, because either one alone loses the lock:
//   - localStorage, written synchronously, so the gold border survives a
//     reload even when the API server isn't reachable. `npm run dev` runs
//     vite and server.js under one `concurrently`; if server.js dies (a
//     stale process still holding port 3001 is enough, and concurrently
//     never restarts it) the app keeps running with a dead /api. Every POST
//     below then failed into an empty catch, so the lock existed only in
//     React state and vanished on the next reload — a purely illusory lock.
//   - the server file (src/data/exampleLocks.json), the durable git-tracked
//     copy that survives a cleared browser profile and is visible to anyone
//     reading the source.
// On mount the two are merged rather than one overwriting the other, so a
// lock made while the API was down is not thrown away when it comes back.
function readLocalLocks() {
  try { return JSON.parse(localStorage.getItem(EX_LOCKS_KEY) ?? '{}') } catch { return {} }
}
function writeLocalLocks(obj) {
  try { localStorage.setItem(EX_LOCKS_KEY, JSON.stringify(obj)) } catch { /* quota/private mode */ }
}

// Switching which saved lesson is being edited remounts this whole component
// (App.jsx keys it on editingLesson?.id), which re-reads locks from scratch.
// If that remount happens right after a toggle, the fresh GET can reach the
// server and resolve BEFORE the still-in-flight POST from the toggle lands —
// the read wins the race and the new mount shows the stale (unlocked) state.
// Tracked at module scope (survives the remount) so any read waits for prior
// in-flight writes to actually land first.
let pendingLockWrite = Promise.resolve()

async function fetchLocks() {
  await pendingLockWrite
  const local = readLocalLocks()
  let server = null
  try {
    const res = await fetch('/api/example-locks')
    if (res.ok) server = await res.json()
  } catch { /* API down — local copy is the only truth we have */ }
  if (!server) return local

  // local wins: it records the most recent toggle this browser made, including
  // an explicit `false` for "deliberately unlocked". Without that false the
  // server copy would resurrect a lock the user had just removed offline.
  const merged = { ...server, ...local }
  // Push anything this browser changed while the API was unreachable, so the
  // durable copy catches up instead of silently staying behind.
  for (const [id, locked] of Object.entries(local)) {
    if (!!locked !== !!server[id]) setLockOnServer(id, !!locked)
  }
  return merged
}

async function setLockOnServer(id, locked) {
  const done = (async () => {
    try {
      await fetch(`/api/example-locks/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked }),
      })
    } catch { /* API down — localStorage already holds the lock */ }
  })()
  pendingLockWrite = done
  await done
}
function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // New format: { pages, editingExampleId } — old format: plain array
    if (Array.isArray(parsed)) return { pages: parsed, editingExampleId: null }
    return parsed
  } catch { return null }
}
function writeDraft(pages, editingExampleId = null) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ pages, editingExampleId }))
}

const LAYOUT_OPTIONS = [
  { value: 'single-graph',    label: 'Graph only' },
  { value: 'single-3d',       label: 'Geometry only' },
  { value: 'single-grid',     label: 'Table only' },
  { value: 'single-equation', label: 'Equation only' },
  { value: 'single-text',     label: 'Text only' },
  { value: 'grid-graph',      label: 'Table + Graph' },
  { value: 'grid-equation',   label: 'Table + Equation' },
  { value: 'geo-equation',    label: 'Geometry + Equation' },
  { value: 'graph-equation',  label: 'Graph + Equation' },
  { value: 'text-graph',      label: 'Text + Graph' },
  { value: 'text-geo',        label: 'Text + Geometry' },
  { value: 'text-grid',       label: 'Text + Table' },
  { value: 'text-equation',   label: 'Text + Equation' },
  { value: 'equation-text',   label: 'Equation + Text' },
]

const ALL_READY = CATEGORIES.flatMap(c => c.functions).filter(f => f.status === 'ready')

// Scan steps before `currentStep` on the same page for |label| names in eq-create inputs
function detectVarLabels(page, currentStep) {
  // Only the MOST RECENT eq-create before this step defines the current equation —
  // a new eq-create fully replaces the previous one, so reset the label set each time.
  let labels = []
  for (const step of page.steps) {
    if (step === currentStep) break
    if (step.funcId === 'eq-create') {
      labels = []
      const eq = step.inputs?.eq ?? ''
      for (const m of eq.matchAll(/\|([^|]+)\|/g)) labels.push(m[1].trim())
    }
  }
  return [...new Set(labels)]
}

function isFuncCompatible(fn, layout) {
  if (fn.useAll) return true
  const g   = !!fn.useGraph, geo = !!fn.useGeo, three = !!fn.use3D
  const t   = !!fn.useTable, txt = !!fn.useText, c = !!fn.useCalc
  const ar  = !!fn.useArith, mu  = !!fn.useMult, cl  = !!fn.useClock
  const nb  = !!fn.useNumbers, md = !!fn.useMdas
  const anyGeo = geo || three
  const eq  = !g && !anyGeo && !t && !txt && !c && !ar && !mu && !cl && !nb && !md
  switch (layout) {
    case 'single-graph':    return g
    case 'single-3d':       return three
    case 'single-geo':      return anyGeo      // legacy pages
    case 'single-grid':     return t
    case 'single-equation': return eq
    case 'single-text':     return txt
    case 'single-arith':    return ar
    case 'single-mult':     return mu
    case 'single-clock':    return cl
    case 'single-numbers':  return nb
    case 'text-mdas':       return txt || md
    case 'grid-graph':      return g || t
    case 'grid-equation':   return t || eq
    case 'geo-equation':    return anyGeo || eq
    case 'graph-equation':  return g || eq
    case 'text-graph':      return g || txt
    case 'text-geo':        return anyGeo || txt
    case 'text-grid':       return t || txt
    case 'text-equation':   return eq || txt
    case 'equation-text':   return eq || txt
    default: return true
  }
}

// The page's declared layout only holds until the first mid-page 'set-layout'
// step — after that, whichever layout was most recently set is what's really
// on screen. Insertion picks off the function list for the layout that's
// actually active at that point, not the page's original one (see set-layout,
// App.jsx's expandPageSegments).
function effectiveLayoutAt(page, afterIdx) {
  const upTo = afterIdx == null ? page.steps.length - 1 : afterIdx
  let layout = page.layout
  for (let i = 0; i <= upTo && i < page.steps.length; i++) {
    const step = page.steps[i]
    if (step.funcId === 'set-layout' && step.inputs?.mode) layout = step.inputs.mode
  }
  return layout
}

let _uid = 0
const uid = () => `lb${++_uid}`

function makeStep(funcId) {
  const fn = ALL_READY.find(f => f.id === funcId)
  return { id: uid(), funcId, inputs: fn ? defaultInputs(fn) : {} }
}

function makePage() {
  return { id: uid(), layout: null, background: 'default', title: '', notes: '', steps: [] }
}


function pagesFromJson(jsonStr) {
  const arr = JSON.parse(jsonStr)
  if (!Array.isArray(arr)) throw new Error('Expected a JSON array of pages.')
  return arr.map(p => ({
    id:         uid(),
    title:      p.title      ?? '',
    layout:     p.layout     ?? null,
    background: p.background ?? 'default',
    ...(p.type === 'exercise' ? {
      type: 'exercise',
      question: p.question ?? '',
      exerciseType: p.exerciseType ?? 'choices4',
      choices: p.choices ?? ['', '', '', ''],
      correctChoice: p.correctChoice ?? 0,
      answer: p.answer ?? '',
    } : {}),
    steps:      (p.steps ?? []).map(s => {
      const fn       = ALL_READY.find(f => f.id === s.func)
      const defaults = fn ? defaultInputs(fn) : {}
      return { id: uid(), funcId: s.func, inputs: { ...defaults, ...(s.inputs ?? {}) } }
    }),
  }))
}

function rehydrateDraft(rawPages) {
  if (!Array.isArray(rawPages) || rawPages.length === 0) return null
  return rawPages.map(p => {
    if (p.type === 'exercise') return { ...p, id: uid() }
    return { title: '', ...p, id: uid(), steps: (p.steps ?? []).map(s => ({ ...s, id: uid() })) }
  })
}

export default function LessonBuilder({ onClose, onBuildPage, onBuildAll, editingLesson, onSaveLesson }) {
  const [tab,            setTab]           = useState('builder')
  const [pages,          setPages]         = useState(() => {
    if (editingLesson) return rehydrateDraft(editingLesson.pages) ?? [makePage()]
    const draft = readDraft()
    return rehydrateDraft(draft?.pages) ?? [makePage()]
  })
  const [activePage,     setActivePage]    = useState(() => {
    if (editingLesson) return 0
    try {
      const draft = readDraft()
      const saved = parseInt(localStorage.getItem(ACTIVE_PAGE_KEY) ?? '0', 10)
      const total = (rehydrateDraft(draft?.pages) ?? [makePage()]).length
      return Number.isFinite(saved) ? Math.min(saved, total - 1) : 0
    } catch { return 0 }
  })
  // null = append at end; number = insert after that step index (-1 = insert at top)
  const [editingExampleId, setEditingExampleId] = useState(() => {
    if (editingLesson) return null
    return readDraft()?.editingExampleId ?? null
  })
  const [insertAfterIdx, setInsertAfterIdx] = useState(null)
  const [newFuncId,      setNewFuncId]     = useState(ALL_READY[0]?.id ?? '')
  const [copied,         setCopied]        = useState(false)
  const [animSpeed,      setAnimSpeed]     = useState(DEFAULT_ANIM_SPEED)

  // Auto-persist draft and active page
  useEffect(() => { writeDraft(pages, editingExampleId) }, [pages, editingExampleId])
  useEffect(() => { localStorage.setItem(ACTIVE_PAGE_KEY, String(activePage)) }, [activePage])

  // ── AI generate mode ──────────────────────────────────────────────────────
  const [aiPrompt,    setAiPrompt]    = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiError,     setAiError]     = useState('')
  // The prompt that produced the current lesson — persisted so it survives reloads.
  const [genPrompt,   setGenPrompt]   = useState(() => {
    try { return localStorage.getItem(PROMPT_KEY) ?? '' } catch { return '' }
  })

  const AI_HINTS = [
    'Designing lesson structure…',
    'Writing step sequences…',
    'Setting up visualizations…',
    'Polishing the math…',
    'Almost ready…',
  ]
  const [hintIdx, setHintIdx] = useState(0)
  useEffect(() => {
    if (!aiLoading) { setHintIdx(0); return }
    const iv = setInterval(() => setHintIdx(i => (i + 1) % AI_HINTS.length), 2400)
    return () => clearInterval(iv)
  }, [aiLoading])

  const handleGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiError('')
    try {
      const raw = await generateLesson(aiPrompt)
      const loaded = pagesFromJson(raw)
      setPages(loaded)
      setActivePage(0)
      setTab('builder')
      // Remember the prompt that produced this lesson
      const usedPrompt = aiPrompt.trim()
      setGenPrompt(usedPrompt)
      try { localStorage.setItem(PROMPT_KEY, usedPrompt) } catch { /* ignore */ }
      // Pre-fill save name from lesson title so user can save immediately
      setSaveName(loaded[0]?.title?.trim() || usedPrompt.slice(0, 40))
    } catch (err) {
      setAiError(err.message ?? 'Unknown error')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Editable preview ────────────────────────────────────────────────────────
  // previewDraft === null  → textarea mirrors the live pages (previewText).
  // non-null               → user is editing; Save applies it back to the pages.
  const [previewDraft, setPreviewDraft] = useState(null)
  const [previewError, setPreviewError] = useState('')

  const handleSavePreview = () => {
    try {
      const loaded = pagesFromJson(previewDraft ?? previewText)
      setPages(loaded)
      setActivePage(0)
      setPreviewDraft(null)
      setPreviewError('')
    } catch (e) {
      setPreviewError(e.message)
    }
  }

  // ── Save / Load ────────────────────────────────────────────────────────────
  const [slots,           setSlots]           = useState(readSlots)
  const [exOverrides,     setExOverrides]     = useState(readExOverrides)
  const [saveName,        setSaveName]        = useState('')
  const [showSlots,       setShowSlots]       = useState(false)
  const saveInputRef                          = useRef(null)
  // Per-example-id long-press bookkeeping for the Examples cards — a plain
  // mutable map (not state) since it's pure gesture timing, never rendered.
  const longPressRef                          = useRef({})

  // On mount: load the server-persisted overrides, then migrate over anything
  // still only sitting in this browser's own localStorage (leftover from
  // before this was server-backed, or a save that landed while offline) —
  // one-time, automatic, so existing edits never need to be manually
  // re-entered just because the persistence layer moved.
  useEffect(() => {
    (async () => {
      const serverOverrides = await fetchServerOverrides()
      const local = readExOverrides()
      const merged = { ...serverOverrides }
      for (const [id, pages] of Object.entries(local)) {
        if (!(id in serverOverrides)) {
          merged[id] = pages
          saveOverrideToServer(id, pages)  // fire-and-forget migration
        }
      }
      setExOverrides(merged)
    })()
  }, [])

  // Seeded from localStorage synchronously so the gold border is correct on
  // the very first paint, then reconciled with the server copy once it answers.
  const [exLocks, setExLocks] = useState(readLocalLocks)
  useEffect(() => { fetchLocks().then(setExLocks) }, [])

  const toggleExampleLock = (id) => {
    setExLocks(prev => {
      const next = { ...prev }
      const willLock = !next[id]
      // Explicit false, never a delete — an absent key is indistinguishable
      // from "never touched", and would let the server copy re-lock it.
      next[id] = willLock
      writeLocalLocks(next)        // synchronous — survives reload even with /api down
      setLockOnServer(id, willLock)  // durable, git-tracked copy
      return next
    })
  }

  // A locked example is READ-ONLY, not closed: every page must stay browsable
  // and playable, only editing is blocked. So this gates the edit controls and
  // the fieldsets around the editable fields — never the page tabs themselves.
  const isLocked = !!(editingExampleId && exLocks[editingExampleId])

  const handleLoadDraft = () => {
    const draft = rehydrateDraft(readDraft())
    if (draft) { setPages(draft); setActivePage(0); setShowSlots(false); setEditingExampleId(null) }
  }

  const handleSave = () => {
    if (editingExampleId) {
      if (exLocks[editingExampleId]) return  // locked — refuse to save over it
      const savedPages = JSON.parse(JSON.stringify(pages))
      const next = { ...exOverrides, [editingExampleId]: savedPages }
      writeExOverrides(next)       // local cache — instant, works offline
      setExOverrides(next)
      saveOverrideToServer(editingExampleId, savedPages)  // the real, durable copy
      return
    }
    const name  = saveName.trim() || `Lesson ${slots.length + 1}`
    const entry = { name, savedAt: new Date().toLocaleString(), prompt: genPrompt || '', pages: JSON.parse(JSON.stringify(pages)) }
    const next  = [entry, ...slots].slice(0, 30)
    writeSlots(next)
    setSlots(next)
    setSaveName('')
    setShowSlots(true)
  }

  const handleLoad = (entry) => {
    const loaded = entry.pages.map(p => ({
      title: '', ...p, id: uid(),
      steps: p.steps.map(s => ({ ...s, id: uid() })),
    }))
    setPages(loaded)
    setActivePage(0)
    setShowSlots(false)
    setEditingExampleId(null)
    setGenPrompt(entry.prompt ?? '')
    try { localStorage.setItem(PROMPT_KEY, entry.prompt ?? '') } catch { /* ignore */ }
  }

  const handleDeleteSlot = (idx) => {
    if (slots[idx]?.fav) return   // favorites are protected — unheart first
    const next = slots.filter((_, i) => i !== idx)
    writeSlots(next)
    setSlots(next)
  }

  const handleToggleFav = (idx) => {
    const next = slots.map((s, i) => i === idx ? { ...s, fav: !s.fav } : s)
    writeSlots(next)
    setSlots(next)
  }

  const page = pages[Math.min(activePage, pages.length - 1)]

  // ── Pages ──────────────────────────────────────────────────────────────────
  const addPage = () => {
    setPages(prev => [...prev, makePage()])
    setActivePage(pages.length)
  }

  const removePage = (idx) => {
    if (pages.length === 1) return
    const next = pages.filter((_, i) => i !== idx)
    setPages(next)
    setActivePage(i => Math.min(i, next.length - 1))
  }

  const movePage = (idx, dir) => {
    const nIdx = idx + dir
    if (nIdx < 0 || nIdx >= pages.length) return
    setPages(prev => {
      const next = [...prev]
      ;[next[idx], next[nIdx]] = [next[nIdx], next[idx]]
      return next
    })
    setActivePage(nIdx)
  }

  const duplicatePage = (idx) => {
    setPages(prev => {
      const copy  = JSON.parse(JSON.stringify(prev[idx]))
      copy.id     = uid()
      copy.steps  = (copy.steps ?? []).map(s => ({ ...s, id: uid() }))
      const next  = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    setActivePage(idx + 1)
  }

  const setPageLayout = (layout) => {
    if (!layout) return
    setPages(prev => prev.map((p, i) => i !== activePage ? p : { ...p, layout }))
  }

  const setPageBackground = (bg) => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, background: bg } : p))
  }

  const clearPageLayout = () => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, layout: null, steps: [] } : p))
  }

  const addFnStep = (funcId, afterIdx = null) => {
    const step = makeStep(funcId)
    setPages(prev => prev.map((p, i) => {
      if (i !== activePage) return p
      const steps = [...p.steps]
      if (afterIdx === null || afterIdx >= steps.length - 1) {
        steps.push(step)
      } else {
        steps.splice(afterIdx + 1, 0, step)
      }
      return { ...p, steps }
    }))
    cancelPick()
  }

  const setPageTitle = (title) => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, title } : p))
  }

  const setPageNotes = (notes) => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, notes } : p))
  }

  // ── Exercise pages ───────────────────────────────────────────────────────
  // An exercise page keeps everything a normal page has (layout/steps still
  // build the optional visual — a graph, a shape, whatever) and adds a
  // question + how it's answered. Toggling preserves layout/steps/title;
  // only the exercise-only fields are added/stripped.
  const setPageIsExercise = (isExercise) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== activePage) return p
      if (isExercise) {
        return {
          ...p,
          type: 'exercise',
          question: p.question ?? '',
          exerciseType: p.exerciseType ?? 'choices4',
          choices: p.choices ?? ['', '', '', ''],
          correctChoice: p.correctChoice ?? 0,
          answer: p.answer ?? '',
        }
      }
      // eslint-disable-next-line no-unused-vars
      const { type, question, exerciseType, choices, correctChoice, answer, ...rest } = p
      return rest
    }))
  }

  const setPageQuestion = (question) => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, question } : p))
  }

  const setPageExerciseType = (exerciseType) => {
    const n = exerciseType === 'choices2' ? 2 : exerciseType === 'choices4' ? 4 : 0
    setPages(prev => prev.map((p, i) => {
      if (i !== activePage) return p
      if (n === 0) return { ...p, exerciseType }
      const choices = Array.from({ length: n }, (_, idx) => p.choices?.[idx] ?? '')
      const correctChoice = (p.correctChoice ?? 0) < n ? p.correctChoice ?? 0 : 0
      return { ...p, exerciseType, choices, correctChoice }
    }))
  }

  const setPageChoiceText = (idx, text) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== activePage) return p
      const choices = [...(p.choices ?? [])]
      choices[idx] = text
      return { ...p, choices }
    }))
  }

  const setPageCorrectChoice = (idx) => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, correctChoice: idx } : p))
  }

  const setPageAnswer = (answer) => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, answer } : p))
  }

  // ── Steps ──────────────────────────────────────────────────────────────────
  // insertAfterIdx doubles as "which divider is currently showing its inline
  // function picker" (null = none expanded).
  const openInsert = (afterIdx) => setInsertAfterIdx(afterIdx)
  const cancelPick = () => setInsertAfterIdx(null)

  const addStep = () => {
    const step = makeStep(newFuncId)
    setPages(prev => prev.map((p, i) => {
      if (i !== activePage) return p
      const steps = [...p.steps]
      if (insertAfterIdx === null || insertAfterIdx >= steps.length - 1) {
        steps.push(step)
      } else {
        steps.splice(insertAfterIdx + 1, 0, step)
      }
      return { ...p, steps }
    }))
    setPickingFunc(false)
    setInsertAfterIdx(null)
  }

  const addSubActionStep = (sa) => {
    const step = { id: uid(), funcId: sa.funcId, inputs: { ...sa.inputs } }
    setPages(prev => prev.map((p, i) => i !== activePage ? p : { ...p, steps: [...p.steps, step] }))
  }

  const removeStep = (stepId) => {
    setPages(prev => prev.map((p, i) => i !== activePage ? p : {
      ...p, steps: p.steps.filter(s => s.id !== stepId)
    }))
  }

  const moveStep = (stepId, dir) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== activePage) return p
      const idx  = p.steps.findIndex(s => s.id === stepId)
      if (idx < 0) return p
      const nIdx = idx + dir
      if (nIdx < 0 || nIdx >= p.steps.length) return p
      const steps = [...p.steps]
      ;[steps[idx], steps[nIdx]] = [steps[nIdx], steps[idx]]
      return { ...p, steps }
    }))
  }

  const moveStepToIdx = (stepId, toIdx) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== activePage) return p
      const fromIdx = p.steps.findIndex(s => s.id === stepId)
      if (fromIdx < 0 || fromIdx === toIdx) return p
      const steps = [...p.steps]
      const [item] = steps.splice(fromIdx, 1)
      steps.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, item)
      return { ...p, steps }
    }))
  }

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────
  const dragRef = useRef(null)  // { stepId, fromIdx, overIdx } — avoids re-render on every pixel
  // { draggingIdx, dropAt } — triggers re-render only when drop slot or dragged item changes
  const [dragVis, setDragVis] = useState(null)

  const startDrag = (e, stepId, fromIdx) => {
    e.preventDefault()
    dragRef.current = { stepId, fromIdx, overIdx: fromIdx }
    setDragVis({ draggingIdx: fromIdx, dropAt: fromIdx })
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    const onMove = (ev) => {
      const items = [...document.querySelectorAll('[data-step-idx]')]
      let over = items.length  // default: drop after last item
      for (const item of items) {
        const rect = item.getBoundingClientRect()
        if (ev.clientY < rect.top + rect.height / 2) {
          over = Number(item.dataset.stepIdx)
          break
        }
      }
      if (dragRef.current) dragRef.current.overIdx = over
      setDragVis(prev => prev?.dropAt === over ? prev : { draggingIdx: fromIdx, dropAt: over })
    }

    const cleanup = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', cleanup)
      window.removeEventListener('mouseleave', cleanup)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    const onUp = () => {
      cleanup()
      if (dragRef.current) {
        moveStepToIdx(dragRef.current.stepId, dragRef.current.overIdx)
        dragRef.current = null
      }
      setDragVis(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mouseleave', cleanup)
  }

  const updateInput = (stepId, inputId, value) => {
    setPages(prev => prev.map((p, i) => i !== activePage ? p : {
      ...p, steps: p.steps.map(s => s.id !== stepId ? s : {
        ...s, inputs: { ...s.inputs, [inputId]: value }
      })
    }))
  }

  // ── Preview text ───────────────────────────────────────────────────────────
  const previewText = JSON.stringify(
    pages.map(p => {
      if (p.type === 'exercise') {
        // eslint-disable-next-line no-unused-vars
        const { id, notes, ...rest } = p
        return rest
      }
      return {
        ...(p.title ? { title: p.title } : {}),
        layout: p.layout,
        ...(p.background && p.background !== 'default' ? { background: p.background } : {}),
        steps: p.steps.map(s => ({ func: s.funcId, inputs: s.inputs })),
      }
    }),
    null, 2
  )

  const handleCopy = () => {
    navigator.clipboard?.writeText(previewText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  // Returns inputDefs for a step (new-style primary display steps first, then legacy)
  const getInputDefs = (step) => {
    if (FUNC_INPUT_DEFS[step.funcId]) return FUNC_INPUT_DEFS[step.funcId]
    const fn = ALL_READY.find(f => f.id === step.funcId)
    return fn ? fn.inputs : []
  }

  const getStepLabel = (step) => {
    if (FUNC_LABEL_MAP[step.funcId]) return FUNC_LABEL_MAP[step.funcId]
    const fn = ALL_READY.find(f => f.id === step.funcId)
    return fn ? fn.label : step.funcId
  }

  // Floats an overflowing text input into a wide fixed-position overlay so
  // typed content is never clipped — re-checked on every keystroke (not just
  // focus) so it also kicks in once existing short text grows past the box.
  const syncOverflowExpand = (el) => {
    if (el.scrollWidth <= el.clientWidth) return
    const r = el.getBoundingClientRect()
    Object.assign(el.style, {
      position: 'fixed', top: r.top + 'px', left: r.left + 'px',
      width: '840px', zIndex: '9999', boxSizing: 'border-box',
    })
  }

  // ── Input renderer for steps ───────────────────────────────────────────────
  const renderStepInput = (step, inp) => {
    const val = step.inputs[inp.id] ?? ''
    if (inp.type === 'select') return (
      <select className="lb-input lb-select-inp"
        value={val} onChange={e => updateInput(step.id, inp.id, e.target.value)}>
        {(inp.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
    if (inp.type === 'color-name') return (
      <ColorInput
        className="lb-input"
        value={val}
        onChange={v => updateInput(step.id, inp.id, v)}
        placeholder={String(inp.placeholder ?? inp.default ?? 'yellow / #hex')}
      />
    )
    return (
      <input className="lb-input"
        type={inp.type === 'number' ? 'number' : 'text'}
        value={val}
        placeholder={String(inp.placeholder ?? inp.default ?? '')}
        onChange={e => {
          updateInput(step.id, inp.id, e.target.value)
          syncOverflowExpand(e.target)
        }}
        onFocus={e => syncOverflowExpand(e.target)}
        onBlur={e => {
          Object.assign(e.target.style, {
            position: '', top: '', left: '', width: '', zIndex: '', boxSizing: '',
          })
        }}
      />
    )
  }

  // Shared <option>/<optgroup> list for a function picker, filtered to
  // whatever layout is actually active at that point in the page (see
  // effectiveLayoutAt — accounts for an earlier set-layout step).
  const fnPickerOptions = (afterIdx) => (
    <>
      <option value="">— select function —</option>
      {CATEGORIES.map(cat => {
        const fns = cat.functions.filter(f => f.status === 'ready' && isFuncCompatible(f, effectiveLayoutAt(page, afterIdx)))
        if (!fns.length) return null
        return (
          <optgroup key={cat.id} label={cat.label}>
            {fns.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </optgroup>
        )
      })}
    </>
  )

  // ── Insert divider between steps ───────────────────────────────────────────
  // Clicking "+" turns the divider itself into a function picker right there,
  // instead of silently changing a distant "Add function" dropdown's target.
  const InsertDivider = ({ afterIdx }) => {
    if (insertAfterIdx === afterIdx) {
      return (
        <div className="lb-insert-divider lb-insert-divider--picking">
          <select
            className="lb-fn-select lb-insert-fn-select"
            autoFocus
            value=""
            onChange={e => { if (e.target.value) addFnStep(e.target.value, afterIdx) }}
            onBlur={cancelPick}
          >
            {fnPickerOptions(afterIdx)}
          </select>
        </div>
      )
    }
    return (
      <div className="lb-insert-divider"
        onClick={() => openInsert(afterIdx)}
        title={afterIdx === -1 ? 'Insert at top' : `Insert after step ${afterIdx + 1}`}>
        <span className="lb-insert-line" />
        <span className="lb-insert-plus">+</span>
        <span className="lb-insert-line" />
      </div>
    )
  }

  return (
    <div className="lb-drawer">

      {/* Full-screen generation overlay */}
      {aiLoading && (
        <div className="ai-gen-overlay">
          <div className="ai-gen-card">
            <div className="ai-gen-spinner" />
            <p className="ai-gen-title">Generating your lesson…</p>
            <p className="ai-gen-hint" key={hintIdx}>{AI_HINTS[hintIdx]}</p>
            <p className="ai-gen-prompt">
              "{aiPrompt.trim().slice(0, 90)}{aiPrompt.trim().length > 90 ? '…' : ''}"
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="lb-hd">
        <span className="lb-hd-title">
          {editingLesson ? `✏️ ${editingLesson.title}` : 'Lesson Builder'}
        </span>
        <button className="lb-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div className="lb-tabs">
        {[['builder', 'Builder'], ['ai', 'AI'], ['dict', 'Dictionary'], ['examples', 'Examples'], ['preview', 'Preview']].map(([id, label]) => (
          <button key={id} className={`lb-tab${tab === id ? ' lb-tab--active' : ''}${id === 'ai' ? ' lb-tab--ai' : ''}${id === 'examples' ? ' lb-tab--ex' : ''}`}
            onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* Body */}
      <div className="lb-body">

        {/* ── AI Generate ───────────────────────────────────────────────────── */}
        {tab === 'ai' && (
          <div className="lb-ai">
            <p className="lb-ai-hint">
              Describe the lesson you want — topic, level, number of pages, shapes to cover, etc.
            </p>
            {genPrompt && !aiLoading && (
              <div className="lb-ai-last">
                <span className="lb-ai-last-label">Last prompt for this lesson</span>
                <p className="lb-ai-last-text">{genPrompt}</p>
                <button className="lb-ai-reuse" onClick={() => { setAiPrompt(genPrompt); setAiError('') }}>
                  Reuse
                </button>
              </div>
            )}
            <textarea
              className={`lb-ai-prompt${aiLoading ? ' lb-ai-prompt--loading' : ''}`}
              placeholder="e.g. Build a 6-page lesson on trigonometry: sin, cos, tan definitions, the unit circle, and solving right triangles."
              value={aiPrompt}
              onChange={e => { setAiPrompt(e.target.value); setAiError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
              spellCheck={false}
            />
            {aiError && <p className="lb-ai-error">{aiError}</p>}
            <button
              className="lb-ai-btn"
              onClick={handleGenerate}
              disabled={!aiPrompt.trim() || aiLoading}
            >
              {aiLoading ? (
                <><span className="lb-ai-spinner" />Generating…</>
              ) : 'Generate Lesson'}
            </button>
            {aiLoading && (
              <p className="lb-ai-status">Claude is building your lesson — this usually takes 10–20 seconds.</p>
            )}
          </div>
        )}

        {/* ── Dictionary ────────────────────────────────────────────────────── */}
        {tab === 'dict' && (
          <div className="lb-dict">
            {CATEGORIES.map(cat => (
              <div key={cat.id} className="lb-dict-cat">
                <div className="lb-dict-cat-hd">{cat.label}</div>
                {cat.functions.map(fn => (
                  <div key={fn.id} className={`lb-dict-fn${fn.status !== 'ready' ? ' lb-dict-fn--dim' : ''}`}>
                    <div className="lb-dict-fn-row">
                      <code className="lb-dict-fn-id">{fn.id}</code>
                      {fn.status !== 'ready' && <span className="lb-dict-badge">soon</span>}
                    </div>
                    {fn.description && <p className="lb-dict-desc">{fn.description}</p>}
                    {fn.inputs.length > 0 && (
                      <div className="lb-dict-params">
                        {fn.inputs.map(inp => (
                          <span key={inp.id} className="lb-dict-param">
                            <b>{inp.id}</b>
                            <span className="lb-dict-type">:{inp.type}</span>
                            {inp.default !== undefined && (
                              <span className="lb-dict-default"> = {String(inp.default)}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Examples gallery ─────────────────────────────────────────────── */}
        {tab === 'examples' && (
          <div className="lb-ex">
            <div className="lb-ex-grid">
              {EXAMPLE_LESSONS.map(ex => {
                const pages  = exOverrides[ex.id] ?? ex.pages
                const locked = !!exLocks[ex.id]

                const startLongPress = () => {
                  longPressRef.current[ex.id] = { fired: false }
                  longPressRef.current[ex.id].timer = setTimeout(() => {
                    longPressRef.current[ex.id].fired = true
                    toggleExampleLock(ex.id)
                  }, 2000)
                }
                const cancelLongPress = () => {
                  const entry = longPressRef.current[ex.id]
                  if (entry?.timer) clearTimeout(entry.timer)
                }

                return (
                  <button key={ex.id} className={`lb-ex-card${locked ? ' lb-ex-card--locked' : ''}`}
                    style={{ '--ex-color': ex.color }}
                    title={locked ? 'Locked — hold 2s to unlock' : 'Hold 2s to lock (mark as final, read-only)'}
                    onMouseDown={startLongPress}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={startLongPress}
                    onTouchEnd={cancelLongPress}
                    onClick={() => {
                      // A long-press that just fired shouldn't ALSO open the
                      // example — the click event fires right after mouseup.
                      if (longPressRef.current[ex.id]?.fired) {
                        longPressRef.current[ex.id].fired = false
                        return
                      }
                      handleLoad({ pages, prompt: '' })
                      setEditingExampleId(ex.id)
                      setTab('builder')
                    }}>
                    <span className="lb-ex-emoji">{ex.emoji}</span>
                    <span className="lb-ex-title">{ex.title}</span>
                    <span className="lb-ex-desc">{ex.desc}</span>
                    <span className="lb-ex-badge">{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Preview / Import ──────────────────────────────────────────────── */}
        {tab === 'preview' && (
          <div className="lb-preview">
            <div className="lb-preview-bar">
              <span className="lb-preview-info">
                {pages.length} page{pages.length !== 1 ? 's' : ''} &middot; {pages.reduce((n, p) => n + (p.steps?.length ?? 0), 0)} steps
                {previewDraft !== null && ' · edited'}
              </span>
              <button className="lb-copy-btn" onClick={handleCopy}>
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              {previewDraft !== null && (
                <button className="lb-copy-btn lb-copy-btn--cancel"
                  onClick={() => { setPreviewDraft(null); setPreviewError('') }}
                  title="Discard edits">
                  Revert
                </button>
              )}
              <button className="lb-import-confirm" onClick={handleSavePreview}
                disabled={previewDraft === null}
                title="Apply edits to the lesson">
                Save
              </button>
            </div>

            <textarea
              className="lb-preview-area"
              value={previewDraft ?? previewText}
              onChange={e => { setPreviewDraft(e.target.value); setPreviewError('') }}
              spellCheck={false}
            />
            {previewError && <p className="lb-import-error">{previewError}</p>}
          </div>
        )}

        {/* ── Builder ───────────────────────────────────────────────────────── */}
        {tab === 'builder' && (
          <div className="lb-builder">

            {isLocked && (
              <div className="lb-locked-banner">
                🔒 Locked — final, read-only. Browse the pages freely; hold this example's card for 2s in Examples to unlock.
              </div>
            )}
            {/* Two fieldsets, split around the page tabs: the tabs sit BETWEEN
                them so switching page still works while locked (a <fieldset
                disabled> kills every nested control, which had made a locked
                example impossible to even look through). Visual order is
                unchanged. */}
            {/* Save / Load bar — OUTSIDE the disabled fieldset. Loading another
                lesson does not touch the locked one, it navigates away from it,
                and having the only way out greyed out left you stuck inside a
                locked example with no route back. Only the controls that would
                WRITE to it (the name field and Save) are gated. */}
            <div className="lb-save-bar">
              <input
                ref={saveInputRef}
                className="lb-save-input"
                type="text"
                placeholder={isLocked ? 'Locked — hold its card 2s to unlock' : 'Lesson name…'}
                value={saveName}
                disabled={isLocked}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button
                className="lb-save-btn"
                onClick={handleSave}
                disabled={isLocked}
                title={isLocked ? 'This example is locked — hold its card 2s to unlock' : 'Save lesson'}
              >Save</button>
              <button
                className={`lb-slots-btn${showSlots ? ' lb-slots-btn--active' : ''}`}
                onClick={() => setShowSlots(v => !v)}
                title="Saved lessons">
                {slots.length > 0 && <span className="lb-slots-count">{slots.length}</span>}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
              </button>
            </div>

            {/* Saved slots panel */}
            {showSlots && (
              <div className="lb-slots-panel">
                <div className="lb-slot-row lb-slot-row--draft">
                  <div className="lb-slot-info">
                    <span className="lb-slot-name">Current Draft</span>
                    <span className="lb-slot-date">
                      {pages.length}p / {pages.reduce((n, p) => n + (p.steps?.length ?? 0), 0)}s · auto-saved
                    </span>
                  </div>
                  <div className="lb-slot-btns">
                    <button className="lb-slot-load" onClick={handleLoadDraft}>Load</button>
                  </div>
                </div>
                {slots.length === 0 && <p className="lb-slots-empty">No saved lessons yet.</p>}
                {slots.map((s, i) => (
                  <div key={i} className="lb-slot-row">
                    <div className="lb-slot-info">
                      <span className="lb-slot-name" title={s.prompt || undefined}>{s.name}</span>
                      <span className="lb-slot-date">{s.savedAt} · {s.pages.length}p / {s.pages.reduce((n, p) => n + (p.steps?.length ?? 0), 0)}s</span>
                      {s.prompt && <span className="lb-slot-prompt" title={s.prompt}>“{s.prompt}”</span>}
                    </div>
                    <div className="lb-slot-btns">
                      <button
                        className={`lb-slot-fav${s.fav ? ' lb-slot-fav--on' : ''}`}
                        onClick={() => handleToggleFav(i)}
                        title={s.fav ? 'Unfavorite' : 'Favorite — protects from deletion'}>
                        {s.fav ? '♥' : '♡'}
                      </button>
                      <button className="lb-slot-load" onClick={() => handleLoad(s)}>Load</button>
                      <button
                        className="lb-slot-del"
                        onClick={() => handleDeleteSlot(i)}
                        disabled={s.fav}
                        title={s.fav ? 'Unfavorite it first to delete' : 'Delete'}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Page tabs — deliberately OUTSIDE both fieldsets so a locked
                example can still be browsed page by page. Only the controls
                that MUTATE the page list (delete ×, add +) drop out when
                locked; selecting a page is not an edit. */}
            <div className="lb-page-tabs">
              {pages.map((p, i) => (
                <button key={p.id}
                  className={`lb-page-tab${i === activePage ? ' lb-page-tab--active' : ''}`}
                  onClick={() => setActivePage(i)}>
                  {p.title ? `${i + 1} · ${p.title.length > 12 ? p.title.slice(0, 12) + '…' : p.title}` : `P${i + 1}`}
                  {pages.length > 1 && !isLocked && (
                    <span className="lb-page-tab-x"
                      onClick={e => { e.stopPropagation(); removePage(i) }}>×</span>
                  )}
                </button>
              ))}
              {!isLocked && <button className="lb-page-add" onClick={addPage} title="Add page">+</button>}
            </div>

            <fieldset className="lb-builder-fieldset" disabled={isLocked}>

            {/* Page action bar — reorder + duplicate current page */}
            <div className="lb-page-actions">
              <button className="lb-page-act-btn" title="Move page left"
                disabled={activePage === 0}
                onClick={() => movePage(activePage, -1)}>◀</button>
              <button className="lb-page-act-btn" title="Move page right"
                disabled={activePage >= pages.length - 1}
                onClick={() => movePage(activePage, 1)}>▶</button>
              <button className="lb-page-act-btn lb-page-act-btn--dup" title="Duplicate this page"
                onClick={() => duplicatePage(activePage)}>⧉ Duplicate</button>
            </div>

            {/* Title */}
            <div className="lb-layout-row">
              <span className="lb-layout-label">Title</span>
              <input
                className="lb-input lb-title-inp"
                type="text"
                placeholder="Page title (shown in header)…"
                value={page.title ?? ''}
                onChange={e => setPageTitle(e.target.value)}
              />
            </div>

            <div className="lb-notes-row">
              <span className="lb-notes-icon" title="Builder notes — not visible in lesson">📝</span>
              <textarea
                className="lb-notes-area"
                placeholder="Private notes for this page…"
                value={page.notes ?? ''}
                onChange={e => setPageNotes(e.target.value)}
                rows={2}
                spellCheck={false}
              />
            </div>

            {/* ── Page type: normal script page vs. a question to answer.
                An exercise page still uses Layout/Steps below for its
                optional visual (a graph, a shape, anything) — it just adds
                a question and how it's answered on top. ──────────────── */}
            <div className="lb-layout-row">
              <span className="lb-layout-label">Page Type</span>
              <div className="lb-exercise-toggle">
                <button
                  type="button"
                  className={`lb-toggle-btn${page.type !== 'exercise' ? ' lb-toggle-btn--active' : ''}`}
                  onClick={() => setPageIsExercise(false)}
                >Script</button>
                <button
                  type="button"
                  className={`lb-toggle-btn${page.type === 'exercise' ? ' lb-toggle-btn--active' : ''}`}
                  onClick={() => setPageIsExercise(true)}
                >Exercise</button>
              </div>
            </div>

            {page.type === 'exercise' && (
              <div className="lb-exercise-editor">
                <div className="lb-notes-row">
                  <span className="lb-notes-icon" title="Shown at the top of the exercise">❓</span>
                  <textarea
                    className="lb-notes-area"
                    placeholder="Question — e.g. What is the slope of this line?"
                    value={page.question ?? ''}
                    onChange={e => setPageQuestion(e.target.value)}
                    rows={2}
                    spellCheck={false}
                  />
                </div>

                <div className="lb-layout-row">
                  <span className="lb-layout-label">Answer Type</span>
                  <select
                    className="lb-layout-sel"
                    value={page.exerciseType ?? 'choices4'}
                    onChange={e => setPageExerciseType(e.target.value)}
                  >
                    <option value="choices2">2 Choices</option>
                    <option value="choices4">4 Choices</option>
                    <option value="input">Text / Number Input</option>
                  </select>
                </div>

                {(page.exerciseType === 'choices2' || page.exerciseType === 'choices4') && (
                  <div className="lb-exercise-choices">
                    {(page.choices ?? []).map((c, idx) => (
                      <div className="lb-exercise-choice-row" key={idx}>
                        <input
                          type="radio"
                          name={`correct-${page.id}`}
                          checked={page.correctChoice === idx}
                          onChange={() => setPageCorrectChoice(idx)}
                          title="Mark as the correct answer"
                        />
                        <input
                          className="lb-input"
                          type="text"
                          placeholder={`Choice ${idx + 1}`}
                          value={c}
                          onChange={e => setPageChoiceText(idx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {page.exerciseType === 'input' && (
                  <div className="lb-layout-row">
                    <span className="lb-layout-label">Correct Answer</span>
                    <input
                      className="lb-input"
                      type="text"
                      placeholder="e.g. 2  or  3.14"
                      value={page.answer ?? ''}
                      onChange={e => setPageAnswer(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Layout selector ──────────────────────────────────────────── */}
            <div className="lb-layout-row">
              <span className="lb-layout-label">Layout</span>
              <select
                className="lb-layout-sel"
                value={page.layout ?? ''}
                onChange={e => setPageLayout(e.target.value)}
              >
                <option value="">— choose layout —</option>
                {LAYOUT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {page.layout && (
                <button className="lb-display-change-btn" onClick={clearPageLayout}>Clear</button>
              )}
            </div>


            {/* Steps list */}
            {page.layout && (
              <div className="lb-steps-list">
                {page.steps.length === 0 ? (
                  <p className="lb-empty-hint">No steps yet — add a function below.</p>
                ) : (
                  <>
                    <InsertDivider afterIdx={-1} />
                    {page.steps.map((step, idx) => {
                      const inputDefs  = getInputDefs(step)
                      const stepLabel  = getStepLabel(step)
                      const isDragging = dragVis?.draggingIdx === idx
                      const showDrop   = dragVis && dragVis.dropAt === idx && !isDragging
                      return (
                        <div key={step.id}>
                          {showDrop && <div className="lb-drop-indicator" />}
                          <div
                            className={`lb-step${isDragging ? ' lb-step--dragging' : ''}`}
                            data-step-idx={idx}
                          >
                            <div className="lb-step-hd">
                              <span className="lb-drag-handle" title="Drag to reorder"
                                onMouseDown={e => startDrag(e, step.id, idx)}>⠿</span>
                              <span className="lb-step-num">{idx + 1}</span>
                              <span className="lb-step-name">{stepLabel}</span>
                              <div className="lb-step-ctrl">
                                <button className="lb-icon-btn lb-icon-btn--del" title="Remove"
                                  onClick={() => removeStep(step.id)}>✕</button>
                              </div>
                            </div>
                            {inputDefs.length > 0 && (() => {
                              if (step.funcId === 'eq-replace-variable') {
                                const detectedVars = detectVarLabels(page, step)
                                if (detectedVars.length > 0) {
                                  return (
                                    <div className="lb-step-inputs">
                                      {detectedVars.map(label => {
                                        const varKey = `var_${label}`
                                        return (
                                          <div key={varKey} className="lb-step-inp-row">
                                            <label className="lb-step-inp-lbl lb-step-inp-lbl--varname">{label} =</label>
                                            <input
                                              className="lb-input"
                                              type="text"
                                              placeholder="value"
                                              value={step.inputs?.[varKey] ?? ''}
                                              onChange={e => updateInput(step.id, varKey, e.target.value)}
                                            />
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )
                                }
                              }
                              return (
                                <div className="lb-step-inputs">
                                  {inputDefs.map(inp => (
                                    <div key={inp.id} className="lb-step-inp-row">
                                      <label className="lb-step-inp-lbl">{inp.label}</label>
                                      {renderStepInput(step, inp)}
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}
                          </div>
                          <InsertDivider afterIdx={idx} />
                        </div>
                      )
                    })}
                    {dragVis && dragVis.dropAt === page.steps.length && (
                      <div className="lb-drop-indicator" />
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Function picker (always appends at the end) ─────────────────── */}
            {page.layout && (
              <div className="lb-subaction-section">
                <span className="lb-subaction-label">Add function</span>
                <select
                  className="lb-fn-select"
                  value=""
                  onChange={e => { if (e.target.value) addFnStep(e.target.value, null) }}
                >
                  {fnPickerOptions(null)}
                </select>
              </div>
            )}

            </fieldset>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="lb-footer">
        <div className="lb-speed-row">
          <span className="lb-speed-label">Speed</span>
          <input
            type="range" className="lb-speed-slider"
            min={0.25} max={4} step={0.25}
            value={animSpeed}
            onChange={e => setAnimSpeed(Number(e.target.value))}
          />
          <span className="lb-speed-val">{animSpeed}×</span>
        </div>
        <div className="lb-footer-btns">
          <button className="lb-build-btn" onClick={() => onBuildPage(page, animSpeed)}>
            ▶ Build Page {activePage + 1}
          </button>
          {pages.length > 1 && (
            <button className="lb-build-btn lb-build-btn--all" onClick={() => onBuildAll(pages, animSpeed)}>
              ▶▶ All Pages
            </button>
          )}
          {editingLesson && onSaveLesson && (
            <button className="lb-build-btn lb-build-btn--save" onClick={() => { onSaveLesson(editingLesson.id, pages); onClose() }}>
              💾 Save to Library
            </button>
          )}
          <button className="lb-reset-btn" onClick={() => { setPages([makePage()]); setActivePage(0) }}>
            Reset
          </button>
        </div>
      </div>

    </div>
  )
}
