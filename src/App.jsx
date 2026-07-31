import { useState, useRef, useCallback, useEffect } from 'react'
import EquationDisplay      from './components/EquationDisplay.jsx'
import CalcDisplay          from './components/CalcDisplay.jsx'
import ArithmeticDisplay    from './components/ArithmeticDisplay.jsx'
import MultiplicationTable  from './components/MultiplicationTable.jsx'
import ClockDisplay         from './components/ClockDisplay.jsx'
import NumberDisplay        from './components/NumberDisplay.jsx'
import MdasDisplay          from './components/MdasDisplay.jsx'
import PizzaDisplay         from './components/PizzaDisplay.jsx'
import ObjectCounter        from './components/ObjectCounter.jsx'
import NumberLineDisplay    from './components/NumberLineDisplay.jsx'
import GeometryDisplay      from './components/GeometryDisplay.jsx'
import DesmosDisplay        from './components/DesmosDisplay.jsx'
import SliderPanel           from './components/SliderPanel.jsx'
import ThreeDisplay         from './components/ThreeDisplay.jsx'
import TableDisplay         from './components/TableDisplay.jsx'
import TextBoxDisplay       from './components/TextBoxDisplay.jsx'
import CommentLayer         from './components/CommentLayer.jsx'
import LessonBuilder        from './components/LessonBuilder.jsx'
import { ExerciseQuestionBar, ExerciseQuestionHero, ExerciseAnswerBar } from './components/ExercisePanel.jsx'
import Sidebar             from './components/Sidebar.jsx'
import MathText             from './components/RichText.jsx'
import LibraryView          from './views/LibraryView.jsx'
import CustomView           from './views/CustomView.jsx'
import SettingsView         from './views/SettingsView.jsx'
import ProfileView          from './views/ProfileView.jsx'
import { CATEGORIES, defaultInputs } from './data/functions.js'
import { executeScript, cancelAllAnimations, setSubStepGate } from './engine/ActionExecutor.js'
import * as graphEngine     from './engine/desmosEngine.js'
import * as tableEngine     from './engine/tableEngine.js'
import * as textEngine      from './engine/textEngine.js'
import * as geometryEngine  from './engine/geometryEngine.js'
import * as threeEngine     from './engine/threeEngine.js'
import { clearSavedValues } from './engine/valueRefs.js'
import { MDAS_PRESETS }     from './engine/demoScripts.js'
import { LESSON_GRADES }   from './data/builtinLessons.js'
import { u }               from './i18n/uiText.js'
import {
  demoPizzaShow, demoPizzaShade, demoPizzaCompare,
  demoCounterShow, demoCounterAdd, demoCounterGroup, demoCounterRemove,
  demoNumberlineShow, demoNumberlineMark, demoNumberlineJump, demoNumberlineShade,
  demoCelebrate,
} from './engine/demoScripts.js'
import {
  demoEquationCombine, demoEquationSendOtherSide, demoEquationReorder,
  demoEquationDivide, demoEquationMultiply, demoEquationFullSolve, demoEquationCreate, demoEquationDistribute, demoQuadraticSolve,
  demoGeoCreatePolygon, demoGeoEraseShape, demoGeoMoveShape,
  demoGeoHighlightShape, demoGeoLabelSides, demoGeoAddText, demoGeoClear, demoGeoShowMeasure, demoGeoShowAreaMeasures,
  demoGeoShowPerimeterMeasures,
  demoReplaceVariable, demoSaveResult, demoRacineDesBords, demoDisparitionExposant, demoApplyInverseTrig,
  demoShowAngles, demoShowArrow, demoRemoveArrow, demoHighlightAngle, demoGeoHighlightEdge,
  demoGraphPlotFunction, demoGraphRemoveFunction, demoGraphShadeArea, demoGraphBestFitLine,
  demoGraphFindIntersections, demoGraphAddPoint, demoGraphRemovePoint, demoGraphAdjustView,
  demoGraphScatterPlot, demoGraphRemoveScatterPlot,
  demoGraphAddSegment, demoGraphRemoveSegment, demoGraphSegmentTick, demoGraphRemoveSegmentTick,
  demoGraphDivideSegment, demoGraphRemoveDivideSegment,
  demoGraphSetViewport, demoGraphNameFunc, demoGraphTangent,
  demoGraphAddHorizontalLine, demoGraphMarkRoots, demoGraphShowProjection, demoGraphPlotDerivative,
  demoGraphRiemannSum, demoGraphDrawVector, demoGraphDrawAngle, demoGraphTransformFunction,
  demoGraphBatchAddPoints, demoGraphBatchShowProjections, demoGraphTrigCircle,
  demoGeo3dCreate, demoGeo3dRemove, demoGeo3dClear,
  demoGeo3dMove, demoGeo3dHighlight, demoGeo3dLabelSides,
  demoGeo3dShowAngles, demoGeo3dHighlightAngle, demoGeo3dHighlightEdge, demoGeo3dRemoveEdgeHighlight,
  demoGeo3dHighlightFace, demoGeo3dRemoveFaceHighlight,
  demoGeo3dShowTick, demoGeo3dRemoveTick,
  demoGeo3dShowArrow, demoGeo3dRemoveArrow, demoGeo3dClearHighlights, demoGeo3dSetView, demoGeo3dAddText,
  demoGeo3dShowVolumeMeasures, demoGeo3dRemoveVolumeMeasures,
  demoGeo2dFlip, demoGeo2dRotate,
  demoTableCreate, demoTableCreateGrid, demoTableEraseGrid, demoTableAddColumn,
  demoTableRemoveColumn, demoTableAddRow, demoTableRemoveRow,
  demoTableChangeValue, demoTableChangeValues,
  demoTableHighlightRow, demoTableClearRowHighlight,
  demoAddCommentGraph, demoAddCommentGraphFunc, demoAddCommentGraphArea,
  demoAddCommentGrid, demoAddCommentGeo, demoAddCommentGeoEdge,
  demoAddCommentEquation, demoAddCommentFree, demoClearComments, demoRemoveComment, demoUpdateComment, demoNarrate,
  demoTextCreate, demoTextAddItem, demoTextRemoveItem,
  demoTextUpdateTitle, demoTextRemove, demoTextFadeContent,
  demoCalcStep, demoCalcClear,
  demoSimpleCalc,
  demoNumbersShow, demoNumbersShowNumeral,
  demoMultTableShow, demoMultHighlight,
  demoClockShow, demoClockSetTime, demoClockHighlightHand,
  demoMdasExample,
  demoSetLayout,
} from './engine/demoScripts.js'
import { generateLesson } from './api/generateLesson.js'
import { EXAMPLE_LESSONS } from './data/exampleLessons.js'
import './App.css'

const ALL_READY_APP = CATEGORIES.flatMap(c => c.functions).filter(f => f.status === 'ready')

let _appUid = 0
const appUid = () => `a${++_appUid}`

function pagesFromJson(jsonStr) {
  const arr = JSON.parse(jsonStr)
  if (!Array.isArray(arr)) throw new Error('Expected a JSON array of pages.')
  return arr.map(p => ({
    id:     appUid(),
    title:  p.title  ?? '',
    layout: p.layout ?? 'single-graph',
    steps:  (p.steps ?? []).map(s => {
      const fn  = ALL_READY_APP.find(f => f.id === s.func)
      const def = fn ? defaultInputs(fn) : {}
      return { id: appUid(), funcId: s.func, inputs: { ...def, ...(s.inputs ?? {}) } }
    }),
  }))
}

// A 'set-layout' step splits its page into its own extra dot in the lesson
// pagination — the layout change only actually happens once the viewer
// clicks to it, instead of firing automatically mid-page. Each segment
// always replays its page from step 0 (never a lightweight continuation),
// so jumping straight to a later segment — e.g. skipping page 1 entirely —
// still renders correctly instead of assuming the prior segment already ran.
function expandPageSegments(pg) {
  const breaks = []
  pg.steps.forEach((s, i) => { if (s.funcId === 'set-layout') breaks.push(i) })
  if (!breaks.length) return [{ pg, stopStep: null }]
  return [...breaks.map(stopStep => ({ pg, stopStep })), { pg, stopStep: null }]
}

// Thrown by the sub-step gate to unwind a solve whose run was cancelled.
// Not an error condition — buildPage swallows it (its catch already ignores
// anything raised by an already-cancelled signal).
const CANCELLED = Symbol('build-cancelled')

function expandLessonPages(pages) {
  return (pages ?? []).flatMap(expandPageSegments)
}

const AI_HINTS_APP = [
  'Designing lesson structure…',
  'Writing step sequences…',
  'Setting up visualizations…',
  'Polishing the math…',
  'Almost ready…',
]

function layoutFromFunc(fn) {
  if (!fn) return 'empty'
  if (fn.useGraph && fn.useTable) return 'grid-graph'
  if (fn.useGraph && fn.useEquation) return 'graph-equation'
  if (fn.useGeo   && fn.useEquation) return 'geo-equation'
  if (fn.use3D)    return 'single-3d'
  if (fn.useGraph) return 'single-graph'
  if (fn.useGeo)   return 'single-geo'
  if (fn.useTable) return 'single-grid'
  if (fn.useText)  return 'text-graph'
  if (fn.useCalc)  return 'single-calc'
  if (fn.useArith) return 'single-arith'
  if (fn.useMult)  return 'single-mult'
  if (fn.useClock)   return 'single-clock'
  if (fn.useNumbers) return 'single-numbers'
  if (fn.useMdas)    return 'text-mdas'
  return 'single-equation'
}

const TOOL_LAYOUTS = {
  numbers: 'single-numbers', clock: 'single-clock', mult: 'single-mult', mdas: 'text-mdas',
}

export default function App() {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [equationSnap, setEquationSnap] = useState(null)
  const [ui,           setUI]           = useState({ title: null, narration: null, answer: null })
  const [error,        setError]        = useState(null)
  const [running,      setRunning]      = useState(false)
  const [graphFuncIds, setGraphFuncIds] = useState([])
  const [tableGridIds, setTableGridIds] = useState([])
  const [geoShapeIds,  setGeoShapeIds]  = useState([])

  // Whether the current graph has any |name| slider vars — the graph panel
  // only reserves screen space for the slider strip/column when this is true
  // (see App.css .has-sliders), so a graph-only page doesn't lose real estate
  // to an empty slider zone.
  const [hasSliders, setHasSliders] = useState(false)
  useEffect(() => {
    const update = vars => setHasSliders(vars.length > 0)
    update(graphEngine.getSliderVars())
    graphEngine.onSliderChange(update)
    return () => graphEngine.offSliderChange(update)
  }, [])

  // ── Layout + comments ──────────────────────────────────────────────────────
  const [layoutMode,      setLayoutMode]      = useState('empty')
  const [pageBackground,  setPageBackground]  = useState('default')
  const [comments,        setComments]        = useState([])

  // ── Exercise pages ─────────────────────────────────────────────────────────
  // exercise = null on a normal script page; otherwise {question, exerciseType,
  // choices, correctChoice, answer} for the current page (see buildPage).
  const [exercise,        setExercise]        = useState(null)
  const [exerciseAnswer,  setExerciseAnswer]  = useState(null) // selected choice index, or input text
  const [exerciseResult,  setExerciseResult]  = useState(null) // 'correct' | 'incorrect' | null

  // ── Section navigation ─────────────────────────────────────────────────────
  const [activeTool,    setActiveTool]    = useState(null)
  const [activePanel,   setActivePanel]   = useState(null)

  const togglePanel = (id) => {
    if (id === 'build') { setBuilderOpen(true); return }
    if (id === 'home')  { setActivePanel(null); return }
    setActivePanel(p => p === id ? null : id)
  }

  // ── Settings / Profile state ───────────────────────────────────────────────
  const [theme,    setThemeState] = useState(() => localStorage.getItem('math-theme') ?? 'dark')
  const [textSize, setTextSize]   = useState(() => localStorage.getItem('math-textsize') ?? 'normal')
  const [plan,      setPlan]      = useState('free')
  const [adminMode, setAdminMode] = useState(() => localStorage.getItem('math-admin') === '1')
  const [lessonOverrides, setLessonOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem('math-lesson-overrides') ?? '{}') } catch { return {} }
  })
  const [editingLesson, setEditingLesson] = useState(null)
  const [profile,  setProfile]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('math-profile') ?? 'null') ?? { name: '', avatarColor: '#818cf8', grade: '' } }
    catch { return { name: '', avatarColor: '#818cf8', grade: '' } }
  })

  const handleTheme = (t) => {
    setThemeState(t)
    localStorage.setItem('math-theme', t)
    document.documentElement.classList.toggle('theme-light', t === 'light')
  }
  const handleTextSize = (s) => {
    setTextSize(s)
    localStorage.setItem('math-textsize', s)
    document.documentElement.setAttribute('data-text-size', s)
  }
  const handleProfile = (p) => {
    setProfile(p)
    localStorage.setItem('math-profile', JSON.stringify(p))
  }

  const handleAdminMode = (on) => {
    setAdminMode(on)
    localStorage.setItem('math-admin', on ? '1' : '0')
  }

  const handleSaveLesson = (lessonId, pages) => {
    const next = { ...lessonOverrides, [lessonId]: pages }
    setLessonOverrides(next)
    localStorage.setItem('math-lesson-overrides', JSON.stringify(next))
  }

  const handleEditLesson = (lesson) => {
    const overriddenPages = lessonOverrides[lesson.id] ?? lesson.pages
    setEditingLesson({ ...lesson, pages: overriddenPages })
    setBuilderOpen(true)
  }

  // Merge static lesson data with any saved overrides
  const mergedGrades = LESSON_GRADES.map(grade => ({
    ...grade,
    lessons: grade.lessons.map(lesson =>
      lessonOverrides[lesson.id]
        ? { ...lesson, pages: lessonOverrides[lesson.id], comingSoon: false }
        : lesson
    ),
  }))

  // Apply persisted theme + text size on mount
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light')
    document.documentElement.setAttribute('data-text-size', textSize)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tool controls ──────────────────────────────────────────────────────────
  const [toolClockH, setToolClockH] = useState(3)
  const [toolClockM, setToolClockM] = useState(0)
  const [toolMultN,  setToolMultN]  = useState(5)
  const [toolHLRow,  setToolHLRow]  = useState(3)
  const [toolHLCol,  setToolHLCol]  = useState(4)

  // ── Lesson UI state ────────────────────────────────────────────────────────
  const [muted,           setMuted]           = useState(false)
  const [lang,            setLang]            = useState(() => localStorage.getItem('math-lang') ?? 'en')
  const [mdasPreset,      setMdasPreset]      = useState(0)
  const [narrationHidden, setNarrationHidden] = useState(false)
  const [builderOpen,     setBuilderOpen]     = useState(false)
  const [lessonPages,     setLessonPages]     = useState(null)
  const [lessonPageIdx,   setLessonPageIdx]   = useState(0)
  const [lastBuiltPage,   setLastBuiltPage]   = useState(null)
  const [paused,          setPaused]          = useState(false)
  // True while the solve coroutine is suspended mid-way through a full-solve —
  // the toolbar's ‹/› then step through mini-steps instead of page steps.
  const [inSubStep,       setInSubStep]       = useState(false)

  // ── AI state ───────────────────────────────────────────────────────────────
  const [promptVal,   setPromptVal]   = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiError,     setAiError]     = useState('')
  // Reference lessons offered when a topic is real maths but past what this
  // teaches — clicking one loads it instead of leaving the user at a dead end.
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiRawOutput, setAiRawOutput] = useState(null)
  const [hintIdx,     setHintIdx]     = useState(0)
  const promptSnapRef = useRef('')

  useEffect(() => {
    if (!aiLoading) { setHintIdx(0); return }
    const iv = setInterval(() => setHintIdx(i => (i + 1) % AI_HINTS_APP.length), 2400)
    return () => clearInterval(iv)
  }, [aiLoading])

  // ── Refs ───────────────────────────────────────────────────────────────────
  const latestEquationSnapRef = useRef(null)
  const equationRef     = useRef(null)
  const geoRef          = useRef(null)
  const graphRef        = useRef(null)
  const tableRef        = useRef(null)
  const textRef         = useRef(null)
  const calcRef         = useRef(null)
  const arithRef        = useRef(null)
  const multRef         = useRef(null)
  const clockRef        = useRef(null)
  const numbersRef      = useRef(null)
  const mdasRef         = useRef(null)
  const pizzaRef        = useRef(null)
  const counterRef      = useRef(null)
  const numberlineRef   = useRef(null)
  const threeRef        = useRef(null)
  const commentLayerRef = useRef(null)
  const contentRef      = useRef(null)
  const audioRef        = useRef(null)
  const mutedRef        = useRef(muted)
  mutedRef.current      = muted
  const langRef         = useRef(lang)
  langRef.current       = lang
  const animSpeedRef      = useRef(1)
  const cancelRef         = useRef(null)
  const pausedRef         = useRef(false)
  const pageStepIdxRef    = useRef(0)
  const currentPageRef    = useRef(null)
  const stepSnapshotsRef  = useRef([])
  // ── Sub-step navigation (inside eq-full-solve) ───────────────────────────
  // full-solve is a single page step that plays many mini-steps internally.
  // Rather than replay-and-stop for each one, the solve coroutine suspends
  // itself on a gate (see setSubStepGate) and these track that suspension:
  //   subGateReleaseRef — resolver while suspended; also the "are we inside a
  //                       sub-step right now?" flag the toolbar keys off.
  //   subBudgetRef      — mini-steps still allowed before suspending again
  //                       (Infinity = ordinary uninterrupted playback).
  //   subDoneRef        — how many have run this page, so ‹ can replay to N-1.
  const subGateReleaseRef = useRef(null)
  const subBudgetRef      = useRef(Infinity)
  const subDoneRef        = useRef(0)
  // One canvas snapshot per mini-step boundary, plus which page step the solve
  // lives in. ‹ restores a snapshot and re-enters the solve at that state —
  // full-solve is driven by the equation state, not by a fixed script, so
  // handing it that state makes it continue from exactly there.
  const subSnapsRef       = useRef([])
  const subPageStepRef    = useRef(0)
  // True while a full-solve is actually running (the gate raises it, the page
  // loop lowers it once that step returns). This — not "is the coroutine
  // parked at this instant" — is what decides whether ‹/› address mini-steps
  // or page steps.
  const inSolveRef        = useRef(false)
  const latestCommentsRef = useRef([])
  const latestUIRef       = useRef({ title: null, narration: null, answer: null })

  const setEquationSnapTracked = useCallback((snap) => {
    latestEquationSnapRef.current = snap
    setEquationSnap(snap)
  }, [])

  const setCommentsTracked = useCallback((c) => {
    const next = typeof c === 'function' ? c(latestCommentsRef.current) : c
    latestCommentsRef.current = next
    setComments(next)
  }, [])

  const setUITracked = useCallback((u) => {
    latestUIRef.current = u
    setUI(u)
  }, [])

  // A 'set-layout' script step stashes the requested layout on ui._layout
  // (see ActionExecutor.js) rather than touching layoutMode directly, so it
  // flows through the same snapshot/undo plumbing as title/narration/answer.
  // This effect is what actually applies it — CSS transitions on
  // .display-slot (App.css) turn the swap into a smooth resize/reposition/fade
  // instead of an instant pop.
  useEffect(() => {
    if (ui._layout) setLayoutMode(ui._layout)
  }, [ui._layout])

  const refreshFuncIds  = () => setGraphFuncIds(graphEngine.getFunctionIds())
  const refreshGridIds  = () => setTableGridIds(tableEngine.getGridIds())
  const refreshShapeIds = () => setGeoShapeIds(geometryEngine.getShapeIds())

  // ── TTS ───────────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  useEffect(() => {
    if (!ui.narration || mutedRef.current) return
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const utter = new SpeechSynthesisUtterance(ui.narration)
    utter.lang  = 'en-US'
    utter.rate  = 0.92
    const voices    = synth.getVoices()
    const preferred = voices.find(v => v.lang === 'en-US' && !v.localService)
                   ?? voices.find(v => v.lang === 'en-US') ?? null
    if (preferred) utter.voice = preferred
    synth.speak(utter)
    return () => synth.cancel()
  }, [ui.narration])

  const toggleMute = useCallback(() => {
    setMuted(m => { if (!m) stopAudio(); return !m })
  }, [stopAudio])

  // ── Lang persist ──────────────────────────────────────────────────────────
  const setLangPersist = (l) => { setLang(l); localStorage.setItem('math-lang', l) }

  // ── Clear all displays ────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (cancelRef.current) cancelRef.current.cancelled = true
    cancelAllAnimations()
    graphEngine.clearAll(graphRef.current?.calculator)
    clearSavedValues()
    tableEngine.clearAll(tableRef)
    geoRef.current?.clearAll?.()
    textEngine.clearAll(textRef)
    calcRef.current?.clearAll()
    arithRef.current?.clearAll()
    multRef.current?.clearAll()
    clockRef.current?.clearAll()
    numbersRef.current?.clearAll()
    mdasRef.current?.clearAll()
    pizzaRef.current?.clearAll()
    counterRef.current?.clearAll()
    numberlineRef.current?.clearAll()
    threeEngine.clearAll3D(threeRef)
    setMdasPreset(0)
    latestEquationSnapRef.current = null
    setEquationSnap(null)
    latestCommentsRef.current = []
    setComments([])
    latestUIRef.current = { title: null, narration: null, answer: null }
    setUI({ title: null, narration: null, answer: null })
    setExercise(null)
    setExerciseAnswer(null)
    setExerciseResult(null)
    setError(null)
    setGraphFuncIds([])
    setTableGridIds([])
    setGeoShapeIds([])
    stopAudio()
  }, [stopAudio])

  // ── Back to section browser ───────────────────────────────────────────────
  const handleBack = useCallback(() => {
    clearAll()
    setLayoutMode('empty')
    setLessonPages(null)
    setLessonPageIdx(0)
    setLastBuiltPage(null)
    setActiveTool(null)
    setRunning(false)
    pausedRef.current = false
    setPaused(false)
  }, [clearAll])

  // ── Run a single tool action ──────────────────────────────────────────────
  const runTool = useCallback(async (demoFn, ...args) => {
    if (cancelRef.current) cancelRef.current.cancelled = true
    cancelAllAnimations()
    const signal = { cancelled: false }
    cancelRef.current = signal
    setRunning(true)
    try {
      const { script } = demoFn(...args)
      await executeScript(script, null, equationRef, setEquationSnap, setUI, geoRef, graphRef, tableRef, setComments, textRef, 1, { skipTitle: true }, calcRef, arithRef, signal, multRef, clockRef, numbersRef, mdasRef, { pizzaRef, counterRef, numberlineRef, threeRef })
    } catch (e) {
      if (!signal.cancelled) setError(e.message ?? 'Error')
    } finally {
      if (!signal.cancelled) setRunning(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open a tool ───────────────────────────────────────────────────────────
  const handleOpenTool = useCallback(async (toolId) => {
    clearAll()
    setActiveTool(toolId)
    setLayoutMode(TOOL_LAYOUTS[toolId])
    await new Promise(r => setTimeout(r, 120))
    const signal = { cancelled: false }
    cancelRef.current = signal
    setRunning(true)
    try {
      let result
      switch (toolId) {
        case 'numbers': result = demoNumbersShow(); break
        case 'clock':   result = demoClockShow(3, 0); break
        case 'mult':    result = demoMultTableShow(5); break
        case 'mdas':    result = demoMdasExample(MDAS_PRESETS[0], langRef.current); break
      }
      if (result) {
        await executeScript(result.script, null, equationRef, setEquationSnap, setUI, geoRef, graphRef, tableRef, setComments, textRef, 1, {}, calcRef, arithRef, signal, multRef, clockRef, numbersRef, mdasRef, { pizzaRef, counterRef, numberlineRef, threeRef })
      }
    } catch (e) {
      if (!signal.cancelled) setError(e.message ?? 'Error')
    } finally {
      if (!signal.cancelled) setRunning(false)
    }
  }, [clearAll]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── MDAS preset switch ────────────────────────────────────────────────────
  const handleMdasPreset = useCallback(async (idx) => {
    if (cancelRef.current) cancelRef.current.cancelled = true
    cancelAllAnimations()
    mdasRef.current?.clearAll()
    textEngine.clearAll(textRef)
    setMdasPreset(idx)
    const signal = { cancelled: false }
    cancelRef.current = signal
    setRunning(true)
    try {
      const { script } = demoMdasExample(MDAS_PRESETS[idx], langRef.current)
      await executeScript(script, null, equationRef, setEquationSnap, setUI, geoRef, graphRef, tableRef, setComments, textRef, 1, {}, calcRef, arithRef, signal, multRef, clockRef, numbersRef, mdasRef, { pizzaRef, counterRef, numberlineRef, threeRef })
    } catch (e) {
      if (!signal.cancelled) setError(e.message ?? 'Error')
    } finally {
      if (!signal.cancelled) setRunning(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play a built-in lesson ────────────────────────────────────────────────
  const handlePlayLesson = useCallback((lesson) => {
    setActiveTool(null)
    handleBuilderBuildAll(lesson.pages, 1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Builder helpers ────────────────────────────────────────────────────────
  function runDemoFunc(funcId, inputs) {
    switch (funcId) {
      case 'eq-combine':           return demoEquationCombine()
      case 'eq-distribute':        return demoEquationDistribute(inputs.eq, latestEquationSnapRef.current)
      case 'eq-send-other-side':   return demoEquationSendOtherSide(inputs.term ?? null)
      case 'eq-reorder':           return demoEquationReorder()
      case 'eq-divide':            return demoEquationDivide(Number(inputs.divisor ?? 2))
      case 'eq-multiply':          return demoEquationMultiply(Number(inputs.multiplier ?? 2))
      case 'eq-full-solve':        return demoEquationFullSolve()
      case 'quadratic-solve':      return demoQuadraticSolve()
      case 'eq-create':            return demoEquationCreate(inputs.eq)
      case 'geo-create-polygon':      return demoGeoCreatePolygon(inputs.shapeId, inputs['shape-type'], inputs.values, inputs.flipX, inputs.flipY, inputs.fillColor, inputs.borderColor)
      case 'geo-show-measure':        return demoGeoShowMeasure(inputs.shapeId, inputs.color, inputs.angle, inputs.label)
      case 'geo-show-area-measures':  return demoGeoShowAreaMeasures(inputs.shapeId, inputs.color)
      case 'geo-show-perimeter-measures': return demoGeoShowPerimeterMeasures(inputs.shapeId, inputs.color)
      case 'geo-erase-shape':         return demoGeoEraseShape(inputs.shapeId)
      case 'geo-move-shape':          return demoGeoMoveShape(inputs.shapeId, inputs.dx, inputs.dy)
      case 'geo-highlight-shape':     return demoGeoHighlightShape(inputs.shapeId)
      case 'geo-label-sides':         return demoGeoLabelSides(inputs.shapeId, inputs.labels)
      case 'geo-add-text':            return demoGeoAddText(inputs.labelId, inputs.text, inputs.x, inputs.y)
      case 'geo-show-angles':         return demoShowAngles(inputs.shapeId, inputs.color)
      case 'geo-show-arrow':          return demoShowArrow(inputs.shapeId, inputs.arrowId, inputs.from, inputs.to, inputs.color)
      case 'geo-remove-arrow':        return demoRemoveArrow(inputs.arrowId)
      case 'geo-highlight-edge':      return demoGeoHighlightEdge(inputs.shapeId, inputs.edgeIndex, inputs.color)
      case 'geo-highlight-angle':     return demoHighlightAngle(inputs.shapeId, inputs.vertexIndex, inputs.color)
      case 'geo-clear':               return demoGeoClear()
      case 'eq-replace-variable': {
        const replacements = Object.entries(inputs)
          .filter(([k, v]) => k.startsWith('var_') && v !== '' && v != null)
          .map(([k, v]) => `${k.slice(4)}=${v}`)
          .join(',')
        return demoReplaceVariable(null, replacements || inputs.replacements || '')
      }
      case 'eq-save-result':         return demoSaveResult(inputs.name)
      case 'eq-racine-des-bords':     return demoRacineDesBords(inputs.eq)
      case 'eq-disparition-exposant': return demoDisparitionExposant(inputs.eq, inputs.newDegree)
      case 'eq-apply-inverse-trig':   return demoApplyInverseTrig(inputs.trig)
      case 'graph-plot-function':     return demoGraphPlotFunction(inputs.expr, inputs.id, inputs.hideLabel)
      case 'graph-best-fit-line':     return demoGraphBestFitLine(inputs.pointIds, inputs.id, inputs.color)
      case 'graph-remove-function':   return demoGraphRemoveFunction(inputs.funcId)
      case 'graph-shade-area':        return demoGraphShadeArea(inputs.funcId, inputs.a, inputs.b)
      case 'graph-find-intersections':return demoGraphFindIntersections(inputs.f1, inputs.f2, inputs.color, inputs.hideLabel)
      case 'graph-add-point':              return demoGraphAddPoint(inputs.x, inputs.y, inputs.id, inputs.funcId, inputs.label, inputs.showCoords)
      case 'graph-remove-point':           return demoGraphRemovePoint(inputs.id)
      case 'graph-scatter-plot':           return demoGraphScatterPlot(inputs.slope, inputs.intercept, inputs.coeff, inputs.count, inputs.xMin, inputs.xMax, inputs.color, inputs.id)
      case 'graph-remove-scatter-plot':    return demoGraphRemoveScatterPlot(inputs.id)
      case 'graph-add-segment':           return demoGraphAddSegment(inputs.x1, inputs.y1, inputs.x2, inputs.y2, inputs.color, inputs.id)
      case 'graph-remove-segment':         return demoGraphRemoveSegment(inputs.id)
      case 'graph-segment-tick':           return demoGraphSegmentTick(inputs.id, inputs.ticks, inputs.color)
      case 'graph-remove-segment-tick':    return demoGraphRemoveSegmentTick(inputs.id)
      case 'graph-divide-segment':         return demoGraphDivideSegment(inputs.id, inputs.parts, inputs.color, inputs.showLabels)
      case 'graph-remove-divide-segment':  return demoGraphRemoveDivideSegment(inputs.id)
      case 'graph-adjust-view':            return demoGraphAdjustView(inputs.cx, inputs.cy, inputs.range)
      case 'graph-set-viewport':           return demoGraphSetViewport(inputs.xMin, inputs.xMax, inputs.yMin, inputs.yMax)
      case 'graph-name-func':              return demoGraphNameFunc(inputs.funcId, inputs.label, inputs.x0, inputs.y0)
      case 'graph-tangent':                return demoGraphTangent(inputs.funcId, inputs.x0, inputs.y0)
      case 'graph-horizontal-line':        return demoGraphAddHorizontalLine(inputs.y)
      case 'graph-mark-roots':             return demoGraphMarkRoots(inputs.funcId)
      case 'graph-show-projection':        return demoGraphShowProjection(inputs.pointId, inputs.showValues)
      case 'graph-trig-circle':            return demoGraphTrigCircle()
      case 'graph-batch-add-points':       return demoGraphBatchAddPoints(inputs.points, inputs.showCoords, inputs.color)
      case 'graph-batch-show-projections': return demoGraphBatchShowProjections(inputs.pointIds)
      case 'graph-plot-derivative':   return demoGraphPlotDerivative(inputs.funcId)
      case 'graph-riemann-sum':       return demoGraphRiemannSum(inputs.funcId, inputs.a, inputs.b, inputs.n, inputs.method)
      case 'graph-draw-vector':       return demoGraphDrawVector(inputs.x1, inputs.y1, inputs.x2, inputs.y2)
      case 'graph-draw-angle':        return demoGraphDrawAngle(inputs.ax, inputs.ay, inputs.bx, inputs.by, inputs.cx, inputs.cy, inputs.color)
      case 'graph-transform-function':return demoGraphTransformFunction(inputs.funcId, inputs.transformType, inputs.value)
      case 'table-create':            return demoTableCreate(inputs.data, inputs.headerRow, inputs.gridId, inputs.color)
      case 'tab-create-grid':         return demoTableCreateGrid(inputs.cols, inputs.rows, inputs.values, inputs.headerRow, inputs.gridId)
      case 'tab-erase-grid':          return demoTableEraseGrid(inputs.gridId)
      case 'tab-add-column':          return demoTableAddColumn(inputs.values, inputs.gridId)
      case 'tab-remove-column':       return demoTableRemoveColumn(inputs.colIndex, inputs.gridId)
      case 'tab-add-row':             return demoTableAddRow(inputs.values, inputs.gridId)
      case 'tab-remove-row':          return demoTableRemoveRow(inputs.rowIndex, inputs.gridId)
      case 'tab-change-value':        return demoTableChangeValue(inputs.col, inputs.row, inputs.value, inputs.gridId)
      case 'tab-change-values':       return demoTableChangeValues(inputs.changes, inputs.gridId)
      case 'tab-highlight-row':       return demoTableHighlightRow(inputs.gridId, inputs.rowIndex, inputs.color)
      case 'tab-clear-row-highlight': return demoTableClearRowHighlight(inputs.gridId)
      case 'cmt-graph':               return demoAddCommentGraph(inputs.text, inputs.x, inputs.y, inputs.color, inputs.cmtId)
      case 'cmt-graph-func':          return demoAddCommentGraphFunc(inputs.text, inputs.funcId, inputs.x, inputs.color, inputs.cmtId)
      case 'cmt-graph-area':          return demoAddCommentGraphArea(inputs.text, inputs.funcId, inputs.x, inputs.color, inputs.cmtId)
      case 'cmt-grid':                return demoAddCommentGrid(inputs.text, inputs.gridId, inputs.col, inputs.row, inputs.color, inputs.cmtId)
      case 'cmt-geo':                 return demoAddCommentGeo(inputs.text, inputs.shapeId, inputs.vertexIndex, inputs.color, inputs.cmtId)
      case 'cmt-geo-edge':            return demoAddCommentGeoEdge(inputs.text, inputs.shapeId, inputs.edgeIndex, inputs.color, inputs.cmtId)
      case 'cmt-equation':            return demoAddCommentEquation(inputs.text, inputs.side, inputs.indices, inputs.color, inputs.cmtId)
      case 'cmt-free':                return demoAddCommentFree(inputs.text, inputs.side, inputs.color, inputs.cmtId, inputs.title)
      case 'cmt-update':              return demoUpdateComment(inputs.cmtId, inputs.text, inputs.color)
      case 'cmt-clear':               return demoClearComments()
      case 'cmt-remove':              return demoRemoveComment(inputs.cmtId)
      case 'narrate':                 return demoNarrate(inputs.text)
      case 'calc-step':               return demoCalcStep(inputs.latex)
      case 'calc-clear':              return demoCalcClear()
      case 'arith-solve':             return demoSimpleCalc(inputs.a, inputs.op, inputs.b)
      case 'numbers-show':         return demoNumbersShow()
      case 'numbers-show-numeral': return demoNumbersShowNumeral(inputs.n)
      case 'mult-table-show':      return demoMultTableShow(inputs.maxN)
      case 'mult-table-highlight':    return demoMultHighlight(inputs.row, inputs.col)
      case 'clock-show':              return demoClockShow(inputs.hour, inputs.minute)
      case 'clock-set-time':          return demoClockSetTime(inputs.hour, inputs.minute)
      case 'clock-highlight-hand':    return demoClockHighlightHand(inputs.hand)
      case 'mdas-example':            return demoMdasExample(inputs.expr, langRef.current)
      // New kid displays
      case 'pizza-show':    return demoPizzaShow(inputs.slices, inputs.shaded, inputs.label)
      case 'pizza-shade':   return demoPizzaShade(inputs.shaded)
      case 'pizza-compare': return demoPizzaCompare(inputs.slices2, inputs.shaded2, inputs.label2)
      case 'counter-show':  return demoCounterShow(inputs.count, inputs.type)
      case 'counter-add':   return demoCounterAdd(inputs.count, inputs.type)
      case 'counter-group': return demoCounterGroup(inputs.groupSize, inputs.color)
      case 'counter-remove':return demoCounterRemove(inputs.count)
      case 'numberline-show':  return demoNumberlineShow(inputs.from, inputs.to)
      case 'numberline-mark':  return demoNumberlineMark(inputs.value, inputs.label, inputs.color)
      case 'numberline-jump':  return demoNumberlineJump(inputs.from, inputs.steps, inputs.size, inputs.color, inputs.label)
      case 'numberline-shade': return demoNumberlineShade(inputs.from, inputs.to, inputs.color)
      case 'celebrate':        return demoCelebrate()
      case 'set-layout':       return demoSetLayout(inputs.mode)
      case 'text-create':             return demoTextCreate(inputs.boxId, inputs.title, inputs.content, inputs.isList, inputs.color)
      case 'text-add-item':           return demoTextAddItem(inputs.boxId, inputs.item)
      case 'text-remove-item':        return demoTextRemoveItem(inputs.boxId, inputs.index)
      case 'text-update-title':       return demoTextUpdateTitle(inputs.boxId, inputs.title)
      case 'text-remove':             return demoTextRemove(inputs.boxId)
      case 'text-fade-content':       return demoTextFadeContent(inputs.boxId, inputs.content)
      // 3D / flat geometry
      case 'geo3d-create-2d':
      case 'geo3d-create':         return demoGeo3dCreate(inputs.id, inputs.type, inputs.a, inputs.b, inputs.c, inputs.color)
      case 'geo3d-remove':         return demoGeo3dRemove(inputs.id)
      case 'geo3d-move':           return demoGeo3dMove(inputs.id, inputs.dx, inputs.dy)
      case 'geo2d-flip':           return demoGeo2dFlip(inputs.id)
      case 'geo2d-rotate':         return demoGeo2dRotate(inputs.id)
      case 'geo3d-highlight':      return demoGeo3dHighlight(inputs.id)
      case 'geo3d-label-sides':    return demoGeo3dLabelSides(inputs.id, inputs.labels)
      case 'geo3d-show-angles':       return demoGeo3dShowAngles(inputs.id, inputs.color, inputs.showValues)
      case 'geo3d-highlight-angle':   return demoGeo3dHighlightAngle(inputs.id, inputs.angleIndex, inputs.color)
      case 'geo3d-highlight-edge':    return demoGeo3dHighlightEdge(inputs.id, inputs.edgeIndex, inputs.color)
      case 'geo3d-remove-edge-highlight': return demoGeo3dRemoveEdgeHighlight(inputs.id, inputs.edgeIndex)
      case 'geo3d-highlight-face':    return demoGeo3dHighlightFace(inputs.id, inputs.faceIndex, inputs.color)
      case 'geo3d-remove-face-highlight': return demoGeo3dRemoveFaceHighlight(inputs.id, inputs.faceIndex)
      case 'geo3d-show-tick':         return demoGeo3dShowTick(inputs.id, inputs.edgeIndex, inputs.ticks, inputs.color)
      case 'geo3d-remove-tick':       return demoGeo3dRemoveTick(inputs.id, inputs.edgeIndex)
      case 'geo3d-show-arrow':        return demoGeo3dShowArrow(inputs.id, inputs.arrowId, inputs.from, inputs.to, inputs.color)
      case 'geo3d-remove-arrow':      return demoGeo3dRemoveArrow(inputs.id, inputs.arrowId)
      case 'geo3d-clear-highlights':  return demoGeo3dClearHighlights(inputs.id)
      case 'geo3d-set-view':          return demoGeo3dSetView(inputs.zoom, inputs.panX, inputs.panY, inputs.distance, inputs.duration, inputs.preset)
      case 'geo3d-add-text':       return demoGeo3dAddText(inputs.labelId, inputs.text, inputs.x, inputs.y)
      case 'geo3d-show-volume-measures': return demoGeo3dShowVolumeMeasures(inputs.id, inputs.color)
      case 'geo3d-remove-volume-measures': return demoGeo3dRemoveVolumeMeasures(inputs.id)
      case 'geo3d-clear':          return demoGeo3dClear()
      default: throw new Error(`Unknown function: "${funcId}"`)
    }
  }

  const restoreSnapshot = useCallback((snap) => {
    if (!snap) return
    cancelAllAnimations()
    latestEquationSnapRef.current = snap.equationSnap
    setEquationSnap(snap.equationSnap)
    latestCommentsRef.current = snap.comments
    setComments(snap.comments)
    commentLayerRef.current?.setResolvedDirect(snap.commentResolved ?? [])
    latestUIRef.current = snap.ui
    setUI(snap.ui)
    geoRef.current?.restoreShapesState(snap.geoShapes, snap.geoVp)
    geometryEngine.restoreRegistryOnly(snap.geoRegistry)
    textRef.current?.restoreBoxesState(snap.textBoxes)
    textEngine.restoreRegistryOnly(snap.textRegistry)
    if (snap.tableDisplay) tableEngine.instantRestoreAll(tableRef, snap.tableDisplay, snap.tableRegistry)
    if (snap.graphCalcState && graphRef.current?.calculator) {
      graphRef.current.calculator.setState(snap.graphCalcState)
    }
    setGraphFuncIds(graphEngine.getFunctionIds())
    setTableGridIds(tableEngine.getGridIds())
    setGeoShapeIds(geometryEngine.getShapeIds())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buildPage = useCallback(async (pg, speed = 1, opts = {}) => {
    if (!pg) return
    const { startFromStep = 0, stopAtStep = null, clearCanvas = true, pauseAtStop = true,
            runSubSteps = Infinity } = opts

    if (cancelRef.current) cancelRef.current.cancelled = true
    const signal = { cancelled: false }
    cancelRef.current = signal
    // A previous run may still be suspended on the sub-step gate — release it
    // so its coroutine can observe `cancelled` and unwind instead of leaking.
    if (subGateReleaseRef.current) { const r = subGateReleaseRef.current; subGateReleaseRef.current = null; r() }
    cancelAllAnimations()

    currentPageRef.current = pg

    if (clearCanvas) {
      graphEngine.clearAll(graphRef.current?.calculator)
      clearSavedValues()
      tableEngine.clearAll(tableRef)
      geoRef.current?.clearAll?.()
      textEngine.clearAll(textRef)
      calcRef.current?.clearAll()
      arithRef.current?.clearAll()
      multRef.current?.clearAll()
      clockRef.current?.clearAll()
      numbersRef.current?.clearAll()
      mdasRef.current?.clearAll()
      pizzaRef.current?.clearAll()
      counterRef.current?.clearAll()
      numberlineRef.current?.clearAll()
      threeEngine.clearAll3D(threeRef)
      // Preset 2D/3D mode immediately so the 120ms wait doesn't flash the wrong view
      if (pg.layout === 'single-3d') {
        const firstCreate = pg.steps?.find(s => s.funcId === 'geo3d-create-2d' || s.funcId === 'geo3d-create')
        threeRef.current?.setDisplayMode(firstCreate?.funcId === 'geo3d-create-2d' ? '2d' : '3d')
      }
      latestEquationSnapRef.current = null
      setEquationSnapTracked(null)
      latestCommentsRef.current = []
      setComments([])
      const initUI = { title: pg.title || null, narration: null, answer: null }
      latestUIRef.current = initUI
      setUI(initUI)
      setError(null)
      setGraphFuncIds([])
      setTableGridIds([])
      setGeoShapeIds([])
      setLayoutMode(pg.layout)
      setPageBackground(pg.background ?? 'default')
      setExercise(pg.type === 'exercise' ? {
        question:      pg.question ?? '',
        exerciseType:  pg.exerciseType ?? 'choices4',
        choices:       pg.choices ?? [],
        correctChoice: pg.correctChoice ?? 0,
        answer:        pg.answer ?? '',
      } : null)
      setExerciseAnswer(null)
      setExerciseResult(null)
      setLastBuiltPage(pg)
      pageStepIdxRef.current = 0
      stepSnapshotsRef.current = []
      pausedRef.current = false
      setPaused(false)
      subDoneRef.current = 0
      subSnapsRef.current = []
      inSolveRef.current = false
    }
    setRunning(true)
    subBudgetRef.current = runSubSteps
    setInSubStep(false)

    const captureSnapshot = () => ({
      equationSnap:    latestEquationSnapRef.current,
      comments:        latestCommentsRef.current,
      commentResolved: commentLayerRef.current?.getResolved() ?? [],
      ui:              { ...latestUIRef.current },
      geoShapes:      geoRef.current?.getShapesState()   ?? {},
      geoVp:          geoRef.current?.getViewportState() ?? null,
      geoRegistry:    geometryEngine.serializeRegistry(),
      textBoxes:      textRef.current?.getBoxesState()   ?? [],
      textRegistry:   textEngine.serializeRegistry(),
      tableDisplay:   tableRef.current
        ? { lines: tableRef.current.getLines(), cells: tableRef.current.getCells(), grid: tableRef.current.getGrid(),
            rowHighlights: tableRef.current.getRowHighlights() }
        : null,
      tableRegistry:  tableEngine.serializeRegistry(),
      graphCalcState: graphRef.current?.calculator?.getState() ?? null,
    })

    const rAF = () => new Promise(r => requestAnimationFrame(r))

    // Called by full-solve immediately BEFORE each of its mini-steps, so when
    // we suspend here the equation is showing the state that mini-step is
    // about to change — same semantics as stopping before a page step.
    setSubStepGate(async () => {
      // Cancelled mid-solve (a newer build started, or the user navigated):
      // THROW rather than return. Returning would hand control back to the
      // solve, which would happily run its remaining mini-steps against a
      // stale state object and fight the new run for the DOM. Throwing
      // unwinds the whole coroutine; buildPage's catch ignores errors from an
      // already-cancelled signal, so this stays silent.
      if (signal.cancelled) throw CANCELLED
      inSolveRef.current = true
      // The state this mini-step is about to change — what ‹ rewinds to.
      subSnapsRef.current[subDoneRef.current] = captureSnapshot()

      // The BUDGET is the single source of truth for whether the solve may
      // proceed. Previously the gate also consulted signal.pausePending, so
      // whether a click did anything depended on catching the coroutine while
      // it happened to be parked — pausing mid-animation left the budget
      // untouched, the gate un-parked, and ‹/› silently fell through to the
      // page-step path, which re-ran the WHOLE solve. Pause now just sets the
      // budget to 0 and every decision here follows from it.
      while (subBudgetRef.current <= 0) {
        // Park. The coroutine keeps its own local state alive, so resuming is
        // exact — no replay, nothing re-derived. A `while` (not `if`) so a
        // spurious wake-up re-checks instead of running a step it wasn't given.
        signal.pausePending = false   // the page loop must not also break
        pausedRef.current   = true
        setPaused(true)
        setInSubStep(true)
        // eslint-disable-next-line no-await-in-loop
        await new Promise(res => { subGateReleaseRef.current = res })
        subGateReleaseRef.current = null
        if (signal.cancelled) throw CANCELLED
      }
      subBudgetRef.current -= 1
      subDoneRef.current   += 1
      setInSubStep(false)
    })

    try {
      if (clearCanvas) {
        await new Promise(r => setTimeout(r, 120))
      } else {
        await rAF()
      }

      if (signal.cancelled) return

      // Re-sync the tracked viewport now that the new layout's CSS has settled —
      // the graph container's aspect ratio varies per layout (e.g. the slider
      // column narrows single-graph/graph-equation), so Desmos' auto-fitted
      // bounds only match reality once this has run post-layout.
      // …then re-square it: the new panel's shape may make the bounds we were
      // tracking the wrong aspect, which is what turns a circle into an oval.
      if (graphRef.current?.calculator) {
        graphEngine.syncViewport(graphRef.current.calculator)
        graphEngine.resquareViewport(graphRef.current.calculator)
      }

      // Second cleanup: any animation coroutine that raced through GSAP-killed
      // tween promises during the settle window may have queued new tweens or
      // left overlay elements. Kill them before we start the new script.
      cancelAllAnimations()

      for (let si = startFromStep; si < pg.steps.length; si++) {
        if (signal.cancelled) break
        if (signal.pausePending) break
        if (stopAtStep !== null && si >= stopAtStep) break

        stepSnapshotsRef.current[si] = captureSnapshot()
        subPageStepRef.current = si   // where a sub-step rewind re-enters

        const step   = pg.steps[si]
        const result = runDemoFunc(step.funcId, step.inputs)
        if (!result) { pageStepIdxRef.current = si + 1; continue }
        const { snapshot, script } = result
        if (snapshot) {
          latestEquationSnapRef.current = snapshot
          setEquationSnapTracked(snapshot)
          if (signal.cancelled) break
          await new Promise(r => setTimeout(r, 120 / speed))
        }
        if (signal.cancelled) break
        await executeScript(script, snapshot ?? latestEquationSnapRef.current, equationRef, setEquationSnapTracked, setUITracked, geoRef, graphRef, tableRef, setCommentsTracked, textRef, speed, { skipTitle: true }, calcRef, arithRef, signal, multRef, clockRef, numbersRef, mdasRef, { pizzaRef, counterRef, numberlineRef, threeRef })
        inSolveRef.current = false   // this step's solve (if any) is finished

        if (!signal.cancelled) {
          pageStepIdxRef.current = si + 1
          await rAF()
        }
      }

      if (!signal.cancelled && (signal.pausePending || (stopAtStep !== null && pauseAtStop))) {
        pausedRef.current = true
        setPaused(true)
      }
    } catch (e) {
      // CANCELLED is the sub-step gate unwinding a superseded run, not a fault.
      if (e !== CANCELLED && !signal.cancelled) {
        console.error(e)
        setError(e.message ?? 'Builder error — see console.')
      }
    } finally {
      if (!signal.cancelled) {
        // Only this run's gate is torn down — a newer buildPage has already
        // installed its own, and clearing unconditionally would strand it.
        setSubStepGate(null)
        setInSubStep(false)
        setRunning(false)
        setGraphFuncIds(graphEngine.getFunctionIds())
        setTableGridIds(tableEngine.getGridIds())
        setGeoShapeIds(geometryEngine.getShapeIds())
      }
    }
  }, [restoreSnapshot]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuilderBuildPage = useCallback((pg, speed = 1) => {
    animSpeedRef.current = speed
    setLessonPages(null)
    setLessonPageIdx(0)
    setActiveTool(null)
    buildPage(pg, speed)
  }, [buildPage])

  const handleBuilderBuildAll = useCallback((pages, speed = 1) => {
    if (!pages?.length) return
    animSpeedRef.current = speed
    const segments = expandLessonPages(pages)
    setLessonPages(segments)
    setLessonPageIdx(0)
    setActiveTool(null)
    buildPage(segments[0].pg, speed, { stopAtStep: segments[0].stopStep, pauseAtStop: false })
  }, [buildPage])

  const handleSendPrompt = useCallback(async (text) => {
    const trimmed = (text ?? promptVal).trim()
    if (!trimmed || aiLoading) return
    setPromptVal(trimmed)
    promptSnapRef.current = trimmed
    setAiLoading(true)
    setAiError('')
    setAiSuggestions([])
    setAiRawOutput(null)
    try {
      const raw    = await generateLesson(trimmed, langRef.current)
      const loaded = pagesFromJson(raw)
      const draft  = loaded.map(p => ({
        title: p.title, layout: p.layout,
        steps: p.steps.map(s => ({ funcId: s.funcId, inputs: s.inputs })),
      }))
      localStorage.setItem('math-engine-draft', JSON.stringify(draft))
      setPromptVal('')
      handleBuilderBuildAll(loaded, 1)
    } catch (err) {
      const msg = err.message ?? 'Generation failed'
      setAiError(msg)
      setAiSuggestions(
        (err.alternatives ?? [])
          .map(id => EXAMPLE_LESSONS.find(e => e.id === id))
          .filter(Boolean)
      )
      if (err.rawOutput) {
        const lineMatch = msg.match(/line (\d+)/)
        setAiRawOutput({ text: err.rawOutput, errLine: lineMatch ? parseInt(lineMatch[1], 10) : null })
      }
    } finally {
      setAiLoading(false)
    }
  }, [promptVal, aiLoading, handleBuilderBuildAll])

  // Load one of the suggested reference lessons. Author edits live in the
  // overrides file, same as the Examples gallery reads — the bundled pages are
  // only the fallback when that request fails.
  const handleLoadSuggestion = useCallback(async (id) => {
    const ex = EXAMPLE_LESSONS.find(e => e.id === id)
    if (!ex) return
    let pages = ex.pages
    try {
      const res = await fetch('/api/example-overrides')
      if (res.ok) {
        const all = await res.json()
        if (Array.isArray(all?.[id])) pages = all[id]
      }
    } catch { /* bundled copy is fine */ }
    setAiError('')
    setAiSuggestions([])
    setPromptVal('')
    handleBuilderBuildAll(pages, 1)
  }, [handleBuilderBuildAll])

  // Stepping forward onto the very next segment of the SAME page (a
  // set-layout split) continues from exactly where the previous segment
  // stopped — animate the layout swap, then keep going — instead of
  // clearing everything and replaying the whole page from step 0. Anything
  // else (backward, skipping several, or a different page entirely) still
  // does a full deterministic replay, since there's no "undo" and no
  // guarantee the target segment was ever actually built yet.
  const navigateToSegment = useCallback((fromIdx, toIdx) => {
    if (!lessonPages) return
    setLessonPageIdx(toIdx)
    const spd = animSpeedRef.current
    const seg = lessonPages[toIdx]
    const prevSeg = lessonPages[fromIdx]
    const continuing = toIdx === fromIdx + 1 && prevSeg?.pg === seg.pg
    if (continuing) {
      buildPage(seg.pg, spd, {
        startFromStep: prevSeg.stopStep ?? 0,
        stopAtStep:    seg.stopStep,
        pauseAtStop:   false,
        clearCanvas:   false,
      })
    } else {
      buildPage(seg.pg, toIdx < fromIdx ? spd * 5 : spd, { stopAtStep: seg.stopStep, pauseAtStop: false })
    }
  }, [lessonPages, buildPage])

  const handleLessonNav = useCallback((dir) => {
    if (!lessonPages) return
    const next = Math.max(0, Math.min(lessonPages.length - 1, lessonPageIdx + dir))
    if (next === lessonPageIdx) return
    navigateToSegment(lessonPageIdx, next)
  }, [lessonPages, lessonPageIdx, navigateToSegment])

  const handleReplay = useCallback(() => {
    const seg = lessonPages ? lessonPages[lessonPageIdx] : null
    if (seg) buildPage(seg.pg, animSpeedRef.current, { stopAtStep: seg.stopStep, pauseAtStop: false })
    else if (lastBuiltPage) buildPage(lastBuiltPage, animSpeedRef.current)
  }, [lessonPages, lessonPageIdx, lastBuiltPage, buildPage])

  const handlePause = useCallback(() => {
    // Two granularities, both needed: pausePending stops the page loop at the
    // next STEP boundary, and a zero budget stops a running full-solve at its
    // next MINI-step. Setting only the former let a solve keep animating to
    // completion after the user pressed pause.
    if (cancelRef.current) cancelRef.current.pausePending = true
    subBudgetRef.current = 0
    pausedRef.current = true
    setPaused(true)
  }, [])

  // Grant the solve `budget` more mini-steps (0 = it parks at the very next
  // boundary, Infinity = play the rest of the solve). Returns false only when
  // no solve is running at all, so the caller can fall back to page steps.
  // Deliberately NOT conditional on the coroutine being parked right now: a
  // solve that is mid-animation simply picks the new budget up at its next
  // gate, which is what made clicks land reliably instead of depending on
  // catching it at rest.
  const grantSubSteps = useCallback((budget) => {
    if (!inSolveRef.current) return false
    subBudgetRef.current = budget
    if (subGateReleaseRef.current) {
      const release = subGateReleaseRef.current
      subGateReleaseRef.current = null
      release()
    }
    return true
  }, [])

  const handleResume = useCallback(() => {
    pausedRef.current = false
    setPaused(false)
    // Parked inside a full-solve: just un-park it. Rebuilding the page here
    // would restart the whole solve from its first mini-step.
    if (grantSubSteps(Infinity)) return
    const pg = currentPageRef.current
    if (!pg) return
    buildPage(pg, animSpeedRef.current, { startFromStep: pageStepIdxRef.current, clearCanvas: false })
  }, [buildPage, grantSubSteps])

  const handleStepForward = useCallback(() => {
    // One mini-step, then park again — budget 0 means the very next gate call
    // (i.e. after exactly one mini-step has played) suspends.
    if (grantSubSteps(1)) return
    const pg = currentPageRef.current
    if (!pg || pageStepIdxRef.current >= pg.steps.length) return
    buildPage(pg, animSpeedRef.current, {
      startFromStep: pageStepIdxRef.current,
      stopAtStep: pageStepIdxRef.current + 1,
      clearCanvas: false,
    })
  }, [buildPage, grantSubSteps])

  const handleStepBackward = useCallback(() => {
    // Inside a full-solve: restore the snapshot taken at the previous mini-step
    // boundary and re-enter the solve THERE. full-solve is driven by the
    // equation state rather than a fixed script, so handing it that state makes
    // it continue from exactly that point — instant, nothing visibly restarts.
    if (inSolveRef.current && subDoneRef.current > 0) {
      const pg   = currentPageRef.current
      const back = subDoneRef.current - 1
      const snap = subSnapsRef.current[back]
      if (!pg || !snap) return
      restoreSnapshot(snap)
      subDoneRef.current = back
      // stopAtStep bounds the re-entry to the solve's OWN page step: rewinding
      // to a boundary where the solve has nothing left to do hits no gate, and
      // unbounded buildPage would then sail on through the rest of the page
      // (layout switches, plots) instead of staying put.
      buildPage(pg, animSpeedRef.current, {
        startFromStep: subPageStepRef.current,
        stopAtStep:    subPageStepRef.current + 1,
        clearCanvas: false,
        runSubSteps: 0,
      })
      return
    }
    const N    = pageStepIdxRef.current
    if (N <= 0) return
    const snap = stepSnapshotsRef.current[N - 1]
    if (!snap) return
    restoreSnapshot(snap)
    pageStepIdxRef.current = N - 1
  }, [restoreSnapshot, buildPage])

  // ── Exercise pages ───────────────────────────────────────────────────────
  const handleExerciseSelectChoice = useCallback((idx) => {
    setExerciseAnswer(idx)
  }, [])

  const handleExerciseInputChange = useCallback((text) => {
    setExerciseAnswer(text)
    // Clear a stale "Incorrect" the moment they start retyping — an input
    // exercise stays editable after a wrong guess, so nothing should lock it.
    setExerciseResult(r => (r === 'incorrect' ? null : r))
  }, [])

  const handleExerciseConfirm = useCallback(() => {
    if (!exercise) return
    let correct
    if (exercise.exerciseType === 'input') {
      const given    = String(exerciseAnswer ?? '').trim()
      const expected = String(exercise.answer ?? '').trim()
      const gNum = Number(given), eNum = Number(expected)
      correct = given.length > 0 && expected.length > 0 && (
        given.toLowerCase() === expected.toLowerCase() ||
        (isFinite(gNum) && isFinite(eNum) && Math.abs(gNum - eNum) < 1e-6)
      )
    } else {
      correct = exerciseAnswer === exercise.correctChoice
    }
    setExerciseResult(correct ? 'correct' : 'incorrect')
  }, [exercise, exerciseAnswer])

  const handleExerciseGiveUp = useCallback(() => {
    setExerciseResult('revealed')
  }, [])

  // A right answer ends the page — there is nothing left to do on it, so move
  // on rather than making the student hunt for the arrow after every question.
  // The delay lets the ✓ Correct! land first. Only on 'correct': a revealed
  // answer is something they may want to sit and read.
  //
  // The cleanup cancels the pending jump if they navigate themselves, replay,
  // or the page changes under it — so this can never fire onto a page the
  // student already left.
  useEffect(() => {
    if (exerciseResult !== 'correct') return
    if (!lessonPages || lessonPageIdx >= lessonPages.length - 1) return
    const t = setTimeout(() => handleLessonNav(1), 1100)
    return () => clearTimeout(t)
  }, [exerciseResult, lessonPages, lessonPageIdx, handleLessonNav])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <Sidebar active={activePanel} onToggle={togglePanel} />

      {/* ── SIDE PANEL ───────────────────────────────────────────────────────── */}
      {activePanel && activePanel !== 'build' && (
        <div className="side-panel">
          <div className="side-panel-header">
            <span className="side-panel-title">
              {activePanel === 'library'  ? 'Library'
             : activePanel === 'saved'   ? 'Saved Lessons'
             : activePanel === 'tools'   ? 'Tools'
             : activePanel === 'profile' ? 'Profile'
             : activePanel === 'settings'? 'Settings'
             : ''}
            </span>
          </div>
          <div className="side-panel-body">
            {activePanel === 'library' && (
              <LibraryView
                grades={LESSON_GRADES}
                lang={lang}
                adminMode={adminMode}
                onPlay={lesson => { setActivePanel(null); handlePlayLesson(lesson) }}
                onEditLesson={lesson => { setActivePanel(null); setEditingLesson(lesson); setBuilderOpen(true) }}
              />
            )}
            {activePanel === 'saved' && (
              <div className="panel-placeholder">
                <span className="panel-placeholder-icon">🔖</span>
                <p>Your saved lessons will appear here.</p>
              </div>
            )}
{activePanel === 'profile' && (
              <ProfileView profile={profile} onSave={handleProfile} lang={lang} />
            )}
            {activePanel === 'settings' && (
              <SettingsView
                theme={theme} onTheme={handleTheme}
                textSize={textSize} onTextSize={handleTextSize}
                lang={lang} onLang={setLangPersist}
                plan={plan} onPlan={setPlan}
                adminMode={adminMode} onAdminMode={v => { setAdminMode(v); localStorage.setItem('math-admin', v ? '1' : '0') }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── MAIN AREA ────────────────────────────────────────────────────────── */}
      <div className="main-area">

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <header className="top-bar">
        <div className="top-bar-left">
          <span className="top-bar-brand">MathEngine</span>
        </div>
        {ui.title && <div className="top-bar-title">{ui.title}</div>}
        <div className="top-bar-right" />
      </header>

      {exercise && layoutMode && layoutMode !== 'empty' && <ExerciseQuestionBar question={exercise.question} />}

      {/* ── MAIN CANVAS ──────────────────────────────────────────────────────── */}
      <div className={`lesson-content lesson-layout--${layoutMode} lesson-bg--${pageBackground}${hasSliders ? ' has-sliders' : ''}`} ref={contentRef}>
        {exercise && (!layoutMode || layoutMode === 'empty') && <ExerciseQuestionHero question={exercise.question} />}
        <div className="display-slot display-slot--text"><TextBoxDisplay ref={textRef} /></div>
        <div className="display-slot display-slot--geo"><GeometryDisplay ref={geoRef} /></div>
        <div className="display-slot display-slot--3d"><ThreeDisplay ref={threeRef} /></div>
        <div className="display-slot display-slot--graph"><DesmosDisplay ref={graphRef} /></div>
        <div className="display-slot display-slot--slider"><SliderPanel graphRef={graphRef} /></div>
        <div className="display-slot display-slot--table"><TableDisplay ref={tableRef} /></div>
        <div className="display-slot display-slot--equation"><EquationDisplay ref={equationRef} snapshot={equationSnap} /></div>
        <div className="display-slot display-slot--calc"><CalcDisplay ref={calcRef} /></div>
        <div className="display-slot display-slot--arith"><ArithmeticDisplay ref={arithRef} /></div>
        <div className="display-slot display-slot--mult"><MultiplicationTable ref={multRef} /></div>
        <div className="display-slot display-slot--clock"><ClockDisplay ref={clockRef} lang={lang} /></div>
        <div className="display-slot display-slot--numbers"><NumberDisplay ref={numbersRef} lang={lang} /></div>
        <div className="display-slot display-slot--mdas"><MdasDisplay ref={mdasRef} presetIdx={mdasPreset} onPresetChange={handleMdasPreset} /></div>
        <div className="display-slot display-slot--pizza"><PizzaDisplay ref={pizzaRef} /></div>
        <div className="display-slot display-slot--counter"><ObjectCounter ref={counterRef} /></div>
        <div className="display-slot display-slot--numberline"><NumberLineDisplay ref={numberlineRef} /></div>

        {error && <div className="lesson-error-toast">{error}</div>}
        {ui.answer && (
          <div className="lesson-answer-badge">
            <span className="answer-label">Answer</span>
            <span className="answer-value">{ui.answer}</span>
          </div>
        )}
        {comments.length > 0 && (
          <CommentLayer
            ref={commentLayerRef}
            comments={comments}
            contentRef={contentRef}
            tableRef={tableRef}
            graphRef={graphRef}
            geoRef={geoRef}
            threeRef={threeRef}
            equationRef={equationRef}
            equationSnap={equationSnap}
            layoutMode={layoutMode}
          />
        )}
      </div>

      {/* ── BOTTOM CONTROLS ──────────────────────────────────────────────────── */}
      <div className="bottom-area">

        {/* ── Exercise answer bar — choices/input + Confirm, above playback ─── */}
        {exercise && (
          <div className="bottom-section bottom-section--exercise">
            <ExerciseAnswerBar
              exercise={exercise}
              answer={exerciseAnswer}
              result={exerciseResult}
              onSelectChoice={handleExerciseSelectChoice}
              onInputChange={handleExerciseInputChange}
              onConfirm={handleExerciseConfirm}
              onGiveUp={handleExerciseGiveUp}
            />
          </div>
        )}

        {/* ── Playback toolbar ─────────────────────────────────────────────── */}
        <div className="bottom-section bottom-section--toolbar">
          <div className="playback-bar">
            <div className="pb-center">
              {lessonPages && (
                paused ? (
                  <>
                    <button className="pb-btn" onClick={handleStepBackward}
                      disabled={inSubStep ? subDoneRef.current === 0 : pageStepIdxRef.current === 0}>‹</button>
                    <button className="pb-btn pb-btn--play" onClick={handleResume}>▶ Resume</button>
                    <button className="pb-btn" onClick={handleStepForward}
                      disabled={!inSubStep && pageStepIdxRef.current >= (currentPageRef.current?.steps.length ?? 0)}>›</button>
                  </>
                ) : (
                  <>
                    <button className="pb-btn" onClick={() => handleLessonNav(-1)} disabled={lessonPageIdx === 0}>‹</button>
                    <div className="page-dots">
                      {lessonPages.map((_, i) => (
                        i === lessonPageIdx
                          ? <button key={i} className="pb-pause-dot" onClick={handlePause} disabled={!running} title="Pause">⏸</button>
                          : <button key={i} className="pb-dot" onClick={() => navigateToSegment(lessonPageIdx, i)} />
                      ))}
                    </div>
                    <button className="pb-btn" onClick={() => handleLessonNav(1)} disabled={lessonPageIdx >= lessonPages.length - 1}>›</button>
                  </>
                )
              )}
            </div>
            <button className="pb-btn pb-btn--restart" onClick={handleReplay} disabled={!lastBuiltPage} title="Restart">↺</button>
          </div>
        </div>

        {/* ── Narration — always rendered so height never collapses ───────── */}
        <div className="bottom-section bottom-section--narration">
          <div className="narration-row" style={{ visibility: (!narrationHidden && ui.narration) ? 'visible' : 'hidden' }}>
            <p className="narration-text"><MathText text={ui.narration ?? ' '} /></p>
            <div className="narration-btns">
              <button className={`narr-btn${muted ? ' narr-btn--active' : ''}`} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
                {muted
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
                }
              </button>
              <button className="narr-btn" onClick={() => setNarrationHidden(true)} title="Hide">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>
          {narrationHidden && (
            <button className="narr-show-btn" onClick={() => setNarrationHidden(false)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Show narration
            </button>
          )}
        </div>

        {/* ── AI Prompt ─────────────────────────────────────────────────────── */}
        <div className="bottom-section bottom-section--prompt">
          <div className="prompt-row">
            <textarea
              className="prompt-input"
              placeholder="Describe a lesson and let AI generate it…"
              value={promptVal}
              onChange={e => setPromptVal(e.target.value)}
              disabled={aiLoading}
              rows={2}
              // Enter sends; Shift+Enter (and Ctrl/Cmd+Enter) still insert a
              // newline, the usual chat-box convention. preventDefault stops
              // the newline that would otherwise be typed before sending.
              onKeyDown={e => {
                if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return
                e.preventDefault()
                if (!aiLoading && promptVal.trim()) handleSendPrompt()
              }}
            />
            <button
              className="prompt-send-btn"
              onClick={() => handleSendPrompt()}
              disabled={aiLoading || !promptVal.trim()}
            >
              {aiLoading ? '…' : '→'}
            </button>
          </div>
          {aiError && <div className="prompt-error">{aiError}</div>}
          {aiSuggestions.length > 0 && (
            <div className="prompt-suggest">
              <span className="prompt-suggest-lead">Try instead:</span>
              {aiSuggestions.map(ex => (
                <button
                  key={ex.id}
                  className="prompt-suggest-btn"
                  style={{ '--ex-color': ex.color }}
                  onClick={() => handleLoadSuggestion(ex.id)}
                >
                  {ex.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      </div> {/* end .main-area */}

      {/* ── AI generation overlay ─────────────────────────────────────────────── */}
      {aiLoading && (
        <div className="ai-gen-overlay">
          <div className="ai-gen-card">
            <div className="ai-gen-spinner" />
            <p className="ai-gen-title">Generating lesson…</p>
            <p className="ai-gen-hint" key={hintIdx}>{AI_HINTS_APP[hintIdx]}</p>
            <p className="ai-gen-prompt">"{promptSnapRef.current.slice(0, 90)}{promptSnapRef.current.length > 90 ? '…' : ''}"</p>
          </div>
        </div>
      )}

      {/* ── Raw output error modal ────────────────────────────────────────────── */}
      {aiRawOutput && (
        <div className="ai-raw-overlay" onClick={() => setAiRawOutput(null)}>
          <div className="ai-raw-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-raw-header">
              <span>Raw API output — {aiError}</span>
              <button onClick={() => setAiRawOutput(null)}>✕</button>
            </div>
            <pre className="ai-raw-body">
              {aiRawOutput.text.split('\n').map((line, i) => {
                const lineNum = i + 1
                const bad = lineNum === aiRawOutput.errLine
                return (
                  <div key={i} className={`ai-raw-line${bad ? ' ai-raw-line--err' : ''}`}
                    ref={bad ? el => el?.scrollIntoView({ block: 'center' }) : null}>
                    <span className="ai-raw-ln">{lineNum}</span>
                    {line}
                  </div>
                )
              })}
            </pre>
          </div>
        </div>
      )}

      {/* ── Lesson Builder drawer ─────────────────────────────────────────────── */}
      {builderOpen && (
        <>
          <div className="dev-overlay" onClick={() => { setBuilderOpen(false); setEditingLesson(null) }} />
          <LessonBuilder
            key={editingLesson?.id ?? 'default'}
            onClose={() => { setBuilderOpen(false); setEditingLesson(null) }}
            onBuildPage={handleBuilderBuildPage}
            onBuildAll={handleBuilderBuildAll}
            editingLesson={editingLesson}
            onSaveLesson={handleSaveLesson}
          />
        </>
      )}

    </div>
  )
}
