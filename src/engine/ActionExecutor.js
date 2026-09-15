import { flushSync } from 'react-dom'
import { gsap } from 'gsap'
import { EquationState } from './EquationState.js'
import { MathObject } from './MathObject.js'
import * as geoEngine   from './geometryEngine.js'
import * as chartEngine from './chartEngine.js'
import { setAnimK } from './animSpeed.js'
import * as graphEngine  from './desmosEngine.js'
import * as tableEngine  from './tableEngine.js'
import * as textEngine   from './textEngine.js'
import * as threeEngine  from './threeEngine.js'
import { resolveColor }  from './palette.js'
import { generateScript } from './solveScript.js'
import { isNum, isFrac, num, bin, negN, findReady, applyReady, collectLabels, collectLabelNodeIds, substituteLabel, findPm, choosePmBranch, deepClone } from './exprTree.js'
import { saveValue } from './valueRefs.js'
import { parseRichEquation } from './parseEquation.js'

const LANE_H = 72

// Shared by 'update-comment', 'text-fade-content', and 'save-value' — finds
// the equation's one pure numeric term (no variable, no symbolic label, no
// fraction) i.e. the answer once a solve has collapsed everything else away.
function extractEquationResult(state) {
  if (!state) return null
  const all = [...state.left, ...state.right]
  const numericTerm = all.find(t => !t.variable && !t.symbolicLabel && !t.varParts && !t.isFraction)
  if (!numericTerm) return null
  const value = numericTerm.sign === '-' ? -numericTerm.coefficient : numericTerm.coefficient
  return { value, color: numericTerm.color ?? null }
}

// Global animation slowdown. <1 = slower. 0.8 → everything plays 25% slower.
const ANIM_SCALE = 0.8
gsap.globalTimeline.timeScale(ANIM_SCALE)

// ── liftToBody ────────────────────────────────────────────────────────────────
// Physically moves an element OUT of the React tree into document.body as a
// fixed overlay.  React can no longer touch it.  Caller must call el.remove()
// when done.  Returns the element's original rect.
function liftToBody(el) {
  const rect = el.getBoundingClientRect()
  // Read GSAP's current scale so we can back-calculate the natural CSS dimensions.
  // If we set transform:'none' we'd clobber GSAP's state and the fly tween would
  // re-assert the old scale on its first tick, causing a visible flash.
  const sx = gsap.getProperty(el, 'scaleX') || 1
  const sy = gsap.getProperty(el, 'scaleY') || 1
  const cssW = rect.width  / sx
  const cssH = rect.height / sy
  // Center the natural-size element on the same visual center — GSAP's scale
  // transform then renders it back at its original visual footprint.
  const cssL = rect.left + (rect.width  - cssW) / 2
  const cssT = rect.top  + (rect.height - cssH) / 2
  document.body.appendChild(el)
  el.classList.add('_lifted-to-body')
  Object.assign(el.style, {
    position:      'fixed',
    top:           `${cssT}px`,
    left:          `${cssL}px`,
    width:         `${cssW}px`,
    height:        `${cssH}px`,
    margin:        '0',
    pointerEvents: 'none',
    zIndex:        '9999',
    boxSizing:     'border-box',
  })
  return rect
}

// ── makeTermGhost ─────────────────────────────────────────────────────────────
// Creates a free-floating element that looks exactly like a real TermCell.
// sign: '+' | '-'.  body: the text inside the cell (e.g. '5x', '22').
// Appended to document.body (position:fixed).  Caller must call .remove().

// Ghost elements are appended to document.body and don't inherit layout-scoped CSS.
// We detect the active layout and apply matching inline styles so ghosts match the
// equation terms they animate alongside.
// A travelling term is a clone parked on document.body, so it sits OUTSIDE the
// equation: it gets neither the panel's font size nor the scale the equation was
// shrunk by to fit. It used to be given a hardcoded size per layout, which was
// fine while an equation had exactly one size — it does not any more, and the
// clone flew across visibly bigger or smaller than the term it came from.
//
// So the size is READ off a real term that is on screen right now. Whatever the
// layout, whatever the current scale, the clone matches what it left. The
// computed size is layout px, which the transform does not touch, so it is
// multiplied back by the scale the equation is actually being drawn at.
// (Font size rather than a transform: GSAP owns transform on these clones.)
function _ghostStyles() {
  const cell = document.querySelector('.equation-display .term-cell')
  if (!cell) return null
  const S  = eqScale()
  const cs = getComputedStyle(cell)
  const px = parseFloat(cs.fontSize) || 0
  if (!px) return null

  const op    = document.querySelector('.equation-display .term-op')
  const opCs  = op ? getComputedStyle(op) : null
  const opPx  = opCs ? parseFloat(opCs.fontSize) || px * 0.75 : px * 0.75
  const opPad = opCs ? parseFloat(opCs.paddingLeft) || 0 : 0

  return {
    cell: { fontSize: `${px * S}px` },
    op:   { fontSize: `${opPx * S}px`, padding: `0 ${opPad * S}px` },
  }
}

// Ghosts represent a value in flight, not a resting term on the equation —
// reserved light blue, plain text, no bordered pill.
const GHOST_BLUE = '#60a5fa'

// The auto-solve's answer ring is a fixed-position div on document.body, not a
// child of the equation panel — so hiding that panel leaves it floating over
// whatever took its place. Anything that takes the panel over drops it first.
// Whatever scale the equation was shrunk to in order to fit. Overlays measured
// in raw pixels — an arc's height, the gap under a group, a font size — have to
// shrink with it or they drift off the terms they belong to. Element rects are
// already post-transform, so only these derived constants need it.
function eqScale() {
  const el = document.querySelector('.equation-fit')
  const v = el && parseFloat(getComputedStyle(el).getPropertyValue('--eq-scale'))
  return Number.isFinite(v) && v > 0 ? v : 1
}

function dropResultHighlight() {
  document.querySelectorAll('.final-result-highlight').forEach(el => el.remove())
}

// Everything a solve leaves AROUND the equation, not inside it: the answer
// banner, the coefficient bubble, the formula panel it opened. None of it is a
// child of the equation panel, so hiding that panel strands all of it on top of
// whatever replaced it — a quadratic's ANSWER bar and COEFFICIENTS box were
// still sitting over a long division. The author's own text boxes are left
// alone: only what the solve itself created goes.
const SOLVE_ARTIFACT_IDS = ['quad-abc', 'quad-formula', 'pi-explainer']
function dropSolveArtifacts(setUI, setComments, textRef) {
  dropResultHighlight()
  setUI?.(u => ({ ...u, answer: null }))
  setComments?.(cs => (cs ?? []).filter(c => !SOLVE_ARTIFACT_IDS.includes(c.id)))
  for (const id of SOLVE_ARTIFACT_IDS) textEngine.removeBox(textRef, id)
}

function makeTermGhost(sign, body) {
  const wrap = document.createElement('div')
  wrap.className = 'term-wrap _anim-overlay'
  Object.assign(wrap.style, {
    position: 'fixed', zIndex: '9999', pointerEvents: 'none',
    margin: '0', display: 'flex', alignItems: 'center',
  })
  const op = document.createElement('span')
  op.className = 'term-op'
  op.textContent = sign === '-' ? '−' : '+'
  wrap.appendChild(op)
  const cell = document.createElement('div')
  cell.className = 'term-cell'
  const span = document.createElement('span')
  span.className = 'term-body'
  span.textContent = body
  cell.appendChild(span)
  wrap.appendChild(cell)
  const s = _ghostStyles()
  if (s) { Object.assign(cell.style, s.cell); Object.assign(op.style, s.op) }
  Object.assign(cell.style, { background: 'transparent', border: 'none', boxShadow: 'none', padding: '0', color: GHOST_BLUE })
  op.style.color   = GHOST_BLUE
  op.style.opacity = '1'
  document.body.appendChild(wrap)
  return wrap
}

// Animate wrapper width → 0 (gap closes smoothly via GSAP RAF ticks).
// opacity: 0 immediately so the sign / background vanish at once.
function collapseWrap(wrapEl, duration = 0.55, ease = 'power3.in') {
  gsap.set(wrapEl, { opacity: 0 })
  const w = wrapEl.offsetWidth
  gsap.set(wrapEl, { overflow: 'hidden', width: w })
  return gsap.to(wrapEl, { width: 0, duration, ease }).then()
}

// Text body label — mirrors TermCell's termLabel.
function cellLabel(absValue, variable, degree) {
  const sup = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
  const deg = degree >= 2 ? (sup[degree] ?? `^${degree}`) : ''
  if (!variable) return String(parseFloat(absValue.toFixed(3))) + deg
  if (absValue === 1) return variable + deg
  return String(parseFloat(absValue.toFixed(3))) + variable + deg
}

// Update a live term-cell's displayed number in place, safely — mutate the
// TEXT of an existing child only, never replace/insert real DOM nodes.
// React still owns these elements (it hasn't re-rendered this cell yet); if
// we wholesale-replace the cell's innerHTML/textContent we destroy child
// <span>s (.term-coeff / .term-var / .term-exp) that React's fiber tree
// still references, and it crashes the next time it tries to reconcile
// them. A bare variable term (coefficient exactly 1, e.g. "x") has no
// '.term-coeff' span at all — fall back to '.term-var', which always exists
// whenever there's a variable.
function setCellValue(inner, absValue, variable, degree) {
  const coeffEl = inner.querySelector('.term-coeff')
  if (coeffEl) {
    coeffEl.textContent = String(parseFloat(absValue.toFixed(3)))
    return
  }
  const varEl = inner.querySelector('.term-var')
  if (varEl) {
    varEl.textContent = (absValue === 1 && variable) ? variable : String(parseFloat(absValue.toFixed(3)))
    return
  }
  inner.textContent = cellLabel(absValue, variable, degree)
}

function fracSubLabel(t) {
  return cellLabel(Math.abs(t.coefficient ?? 1), t.variable ?? null, t.degree ?? 0)
}

// Visual fraction ghost — mirrors TermCell's fraction layout with frac-bar.
function makeTermGhostFraction(sign, numTerms, denTerms) {
  const wrap = document.createElement('div')
  wrap.className = 'term-wrap _anim-overlay'
  Object.assign(wrap.style, { position: 'fixed', zIndex: '9999', pointerEvents: 'none', margin: '0', display: 'flex', alignItems: 'center' })
  const op = document.createElement('span')
  op.className = 'term-op'
  op.textContent = sign === '-' ? '−' : '+'
  wrap.appendChild(op)
  const cell = document.createElement('div')
  cell.className = 'term-cell term-cell--fraction'
  const fNum = document.createElement('div'); fNum.className = 'frac-num'
  fNum.textContent = (numTerms ?? []).map(fracSubLabel).join('+').replace(/\+-/g, '-') || '1'
  const fBar = document.createElement('div'); fBar.className = 'frac-bar'
  const fDen = document.createElement('div'); fDen.className = 'frac-den'
  fDen.textContent = (denTerms ?? []).map(fracSubLabel).join('+').replace(/\+-/g, '-') || '1'
  cell.appendChild(fNum); cell.appendChild(fBar); cell.appendChild(fDen)
  wrap.appendChild(cell)
  const s = _ghostStyles()
  if (s) { Object.assign(cell.style, s.cell); Object.assign(op.style, s.op) }
  Object.assign(cell.style, { background: 'transparent', border: 'none', boxShadow: 'none', padding: '0', color: GHOST_BLUE })
  op.style.color   = GHOST_BLUE
  op.style.opacity = '1'
  document.body.appendChild(wrap)
  return wrap
}

// Pick the right ghost constructor for any term.
function makeGhostForTerm(sign, term) {
  if (term.isFraction) return makeTermGhostFraction(sign, term.numeratorTerms, term.denominatorTerms)
  return makeTermGhost(sign, cellLabel(Math.abs(term.coefficient), term.variable, term.degree))
}

// ── Hurry ─────────────────────────────────────────────────────────────────────
// Clicking "next" while a beat is still playing means "I have seen enough of
// this, get to the end" — NOT "skip whatever is left", which would leave the
// next beat drawing on top of shapes that were never created. So every
// remaining step still runs; it just runs at a speed nobody waits for.
// 10x still read as "waiting, but faster" on a long solve: a beat is a gsap
// tween plus two or three waits, and a dozen beats of that is seconds even
// divided by ten. At 30x a hurried beat lands in a frame or two, which is
// what "I have seen enough" is asking for. gsap still sets every final value,
// so nothing is skipped — it is only the time nobody wanted that goes.
const HURRY_FACTOR = 30
let _hurry = false
export function setHurry(on) {
  _hurry = !!on
  gsap.globalTimeline.timeScale(on ? ANIM_SCALE * HURRY_FACTOR : ANIM_SCALE)
  // The timeline only reaches gsap. Comment boxes, their connector lines,
  // the geometry tweens and the pie charts time themselves in CSS or in
  // their own rAF loop, and none of them saw a hurry before this line.
  setAnimK(on ? 1 / HURRY_FACTOR : 1)
}
export function isHurrying() { return _hurry }

// ── Tracked waits ─────────────────────────────────────────────────────────────
// All animation delays go through waitMs() so cancelAllAnimations() can abort them.
const _pendingWaits = new Set()
function waitMs(ms) {
  return new Promise(r => {
    const id = setTimeout(() => { _pendingWaits.delete(id); r() }, ms)
    _pendingWaits.add(id)
  })
}

// ── Entry point ───────────────────────────────────────────────────────────────
// geoRef   — ref to GeometryDisplay (SVG canvas), for ggb-* geometry actions
// graphRef — ref to DesmosDisplay, for ggb-* graph actions
// Both are optional; omit for pure equation scripts.
export function cancelAllAnimations() {
  // Cancel all pending animation delays — this is the main mechanism that stops
  // a running animation chain, since GSAP-killed tween promises may still resolve.
  _pendingWaits.forEach(id => clearTimeout(id))
  _pendingWaits.clear()
  gsap.globalTimeline.clear()
  // Cancelling ends any hurry too — the next run starts at normal speed.
  _hurry = false
  gsap.globalTimeline.timeScale(ANIM_SCALE)
  setAnimK(1)
  // Remove all body-overlay elements (ghosts, dividers, sqrt symbols, arrows)
  document.querySelectorAll('._anim-overlay, ._lifted-to-body').forEach(el => el.remove())
  // Clear any GSAP inline styles left on equation cells (outlines, scale, opacity, transforms)
  document.querySelectorAll('.term-cell, .term-wrap, .term-op').forEach(el => {
    gsap.set(el, { clearProps: 'boxShadow,scale,opacity,x,y,transform' })
  })
}

// ── Sub-step gate ─────────────────────────────────────────────────────────────
// full-solve-current is ONE page step that internally plays a dozen mini-steps
// (resolve an expression node, combine like terms, send across, divide…). The
// page runner only knows about page steps, so pause/‹/› could never stop inside
// it — the whole solve replayed as one uninterruptible blob.
//
// Each mini-step now awaits this gate. When nothing is registered it is a plain
// no-op, so ordinary playback is byte-for-byte unchanged; the page runner
// registers one only while a page is building, and can block on it to suspend
// the solve exactly where it stands (the coroutine stays alive, holding its own
// state — no replay, no re-derivation) until the user releases it.
let _subStepGate = null
export function setSubStepGate(fn) { _subStepGate = fn }
// opts.force asks the gate to PARK rather than merely offer a stepping point:
// an ordinary gated action passes straight through during normal playback
// (the budget is unlimited), which is right for a solve that should play, and
// wrong for a step whose whole purpose is to hold the answer back.
export async function subStep(opts) { if (_subStepGate) await _subStepGate(opts) }

export async function executeScript(actions, snapshot, equationRef, setState, setUI, geoRef = null, graphRef = null, tableRef = null, setComments = null, textRef = null, speed = 1, opts = {}, calcRef = null, arithRef = null, signal = null, multRef = null, clockRef = null, numbersRef = null, mdasRef = null, kidRefs = {}) {
  const state = snapshot ? EquationState.fromSnapshot(snapshot) : null
  for (const action of actions) {
    if (signal?.cancelled) return
    if (opts.skipTitle && action.type === 'showTitle') continue
    // A gated action waits for the reader before it runs — the same gate the
    // auto-solve parks on, so ‹ › step through these exactly as they do a solve.
    if (action.gated) await subStep({ force: action.stop === true })
    await runAction(action, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
    if (signal?.cancelled) return
    await frame()
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────
// The steps that turn an expression on display into a problem being solved.
// None of them can run without a second side to work against, which is why the
// "= 0" the parser used to force on every equation is added on the first of
// these instead.
//
// Combining, reordering and distributing are deliberately NOT here: they
// rearrange one side and say nothing about an equality. Treating them as
// solves put "= 0" next to a lesson that was only simplifying an expression —
// "18/3 + 2/3" is asking for one fraction, not for a root.
const SOLVES = new Set([
  'sendToOtherSide', 'autoSendToOtherSide', 'divideBothSides', 'multiplyBothSides',
  'racineDesBords', 'disparitionExposant', 'applyInverseTrig',
  'full-solve-current', 'chooseQuadraticBranch', 'restoreQuadraticBranch',
])


async function runAction(action, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed = 1, calcRef = null, arithRef = null, multRef = null, clockRef = null, numbersRef = null, mdasRef = null, kidRefs = {}) {
  // Extra displays ride in this bundle rather than becoming yet more positional
  // parameters on a signature that already has eighteen.
  const { pizzaRef, counterRef, numberlineRef, threeRef, divisionRef, setDivisionUp } = kidRefs
  const refs    = () => equationRef.current?.cellRefs ?? { left: [], right: [] }
  const graphApi = () => graphRef?.current?.calculator ?? null
  // eslint-disable-next-line no-shadow
  const wait = (s) => waitMs((s / speed) * 1000 / ANIM_SCALE / (_hurry ? HURRY_FACTOR : 1))

  // Shared "spotlight, then resolve" reveal used by every numeric-collapse
  // phase inside full-solve-current (factor products, exponents, fraction
  // combine+divide) so the pacing is IDENTICAL everywhere — highlight what's
  // about to change, hold, fade it out, commit the new value, pop it in, hold
  // again. Matches the same rhythm as the general algebra solver's
  // combine/send-other-side steps (outline → resolve → clear) instead of each
  // phase inventing its own (inconsistent, previously much faster) timing.
  const revealStep = async (getBeforeEl, mutate, getAfterEl) => {
    const before = getBeforeEl()
    if (before) {
      // Highlight what's about to change by tinting it blue — never a box/
      // outline around bare inline numbers, that reads as an odd square patch.
      // EXCEPT a term with its own explicit color (e.g. tied to a matching
      // colored triangle edge) — that color is never overridden by this
      // generic "about to change" cue, only by an actual combine with
      // another term (flyTogether, elsewhere). TermCell/ExprLeaf apply an
      // explicit color as inline style.color, so its presence here IS "this
      // term owns a color".
      // getBeforeEl can return either one .term-cell or an array of them
      // (exprCellsFor returns an array when the expr node itself isn't a
      // bare .term-cell — e.g. an exponent nested inside a product like
      // "π × r² × h" — unlike a power sitting alone as the whole side,
      // which IS its own .term-cell). gsap already accepts either shape;
      // only this plain DOM property read needs to branch on it.
      const beforeEls   = Array.isArray(before) ? before : [before]
      // A cell an earlier beat already unmounted comes back null in this array.
      // Only these two raw DOM reads ever touched it — everything else (gsap)
      // already skips a null target — so guarding them is the whole fix. The
      // animation itself is unchanged.
      const hasOwnColor = beforeEls.length > 0 && beforeEls.every(el => el && el.style.color)
      // .term-cell's own base CSS rule permanently carries
      // `animation: termEnter ... both` (its mount pop-in) — a CSS animation
      // always wins the cascade over an inline style for the properties it
      // controls, for as long as it's assigned, even once finished and just
      // holding its final frame via fill-mode. A bare leaf rendered as its
      // own .term-cell (e.g. a symbolic constant like π, or an exponent
      // nested in a product) still carries this rule, so the opacity fade
      // below would otherwise be silently overridden every frame — the
      // value would appear to swap instantly instead of fading.
      beforeEls.forEach(el => { if (el) el.style.animation = 'none' })
      if (!hasOwnColor) {
        await gsap.to(before, { color: '#60a5fa', duration: 0.35, ease: 'power2.out' }).then()
      }
      await wait(0.75)
      await gsap.to(before, {
        opacity: 0, scale: 0.6,
        duration: 0.35, ease: 'power2.in',
      }).then()
    }
    mutate()
    flushSync(() => setState(state.snapshot()))
    const after = getAfterEl()
    if (after) {
      const afterEls = Array.isArray(after) ? after : [after]
      afterEls.forEach(el => { if (el) el.style.animation = 'none' })
      gsap.set(after, { opacity: 0, scale: 0.5 })
      await gsap.to(after, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }).then()
    }
    await wait(0.75)
  }

  // Shared opening for every binary combine (+, −, ×, ÷): highlight BOTH
  // operands first (they're both about to combine), pick the anchor and ring
  // it as the landing spot, then fly the other chip into it. Only the FINAL
  // commit differs per operator (see combineReveal vs countUpReveal below) —
  // one system, not a per-operator rebuild.
  //
  // The secondary is NEVER lifted/reparented/cloned — no ghost. It travels
  // toward the anchor AND shrinks to zero width/padding in the SAME tween,
  // while still a real, in-flow flex child. Shrinking (instead of yanking it
  // out instantly) means every sibling after it — a closing paren, the next
  // operator — slides left smoothly as a natural side effect of flex layout,
  // at the exact same speed, in the exact same tween. No separate reflow step.
  // Same motion as flyTogether, but it does NOT take the nodes out of the DOM.
  // flyTogether ends with secondary.remove(), which is safe where the term COUNT
  // does not change — the classic combine rewrites a value in place. Here the
  // second fraction really is removed from the state, so React tries to unmount
  // a node that is already gone and throws NotFoundError, taking the rest of the
  // page down with it. Leaving the node be and letting the commit remove it is
  // the same picture with none of that.
  const flyInto = async (anchor, secondary) => {
    anchor.style.animation = 'none'
    secondary.style.animation = 'none'
    await gsap.to([anchor, secondary], { color: '#60a5fa', duration: 0.25, ease: 'power2.out' }).then()
    await wait(0.2)
    // No ring on the anchor. Which one is the landing spot is already obvious
    // from the fact that the other one moves toward it.

    // The operator that has to go is the one BETWEEN the two chips, and which
    // side of the secondary that is depends on which chip is flying. Always
    // taking the one in front of it worked while the anchor was on the left; the
    // moment the right-hand chip became the anchor — the convention everywhere
    // now — the minus in "3,56 − 1,2" was left untouched, hanging in mid-air
    // while the number it belonged to melted away, and then vanishing on its own
    // at the next commit.
    const before   = anchor.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING
    const sibling  = before ? secondary.previousElementSibling : secondary.nextElementSibling
    const operator = (sibling?.classList?.contains('term-op') || sibling?.classList?.contains('exp-op')) ? sibling : null
    const ar = anchor.getBoundingClientRect()
    const sr = secondary.getBoundingClientRect()
    const tx = ar.left + ar.width / 2 - (sr.left + sr.width / 2)
    const ty = ar.top + ar.height / 2 - (sr.top + sr.height / 2)
    secondary.style.overflow = 'hidden'
    if (operator) operator.style.overflow = 'hidden'
    await Promise.all([
      gsap.to(secondary, {
        x: tx, y: ty, opacity: 0,
        width: 0, paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0,
        duration: 0.55, ease: 'power2.inOut',
      }).then(),
      operator
        ? gsap.to(operator, {
            opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0,
            duration: 0.55, ease: 'power2.inOut',
          }).then()
        : Promise.resolve(),
    ])
  }

  // n! taken apart the way it is defined — 5! = 4!·5, 4! = 3!·4 — one factor
  // per beat, until the product is written out in full. Shared by the
  // dedicated step and by the solve, because a solve that skipped straight to
  // 120 would be teaching the answer and not the notation.
  const unpackFactorials = async (term) => {
    if (!term?.expr) return false
    // The factorial still worth opening: one whose argument is 2 or more.
    // 1! and 0! are 1 by definition and unpacking them shows nothing.
    const findFact = (node) => {
      if (!node || typeof node !== 'object') return null
      if (node.t === 'fact' && node.arg?.t === 'num' && Number.isInteger(node.arg.v) && node.arg.v >= 2) return node
      for (const k of ['a', 'b', 'arg', 'base']) {
        const hit = findFact(node[k])
        if (hit) return hit
      }
      return null
    }

    const wrapEl = () => getWrap(refs(), term.side, term.cellIndex)
    let guard = 0
    for (let node = findFact(term.expr); node && guard < 24; node = findFact(term.expr), guard++) {
      const n = node.arg.v
      const peeledId = crypto.randomUUID()
      // Rewritten IN PLACE, so everything around it keeps its identity and its
      // element: only the factorial itself becomes "(n-1)! × n".
      const inner = { t: 'fact', id: crypto.randomUUID(), arg: { t: 'num', id: crypto.randomUUID(), v: n - 1 } }
      const peeled = { t: 'num', id: peeledId, v: n }
      delete node.arg
      node.t = 'bin'
      node.op = '*'
      node.a = inner
      node.b = peeled
      flushSync(() => setState(state.snapshot()))

      // The factor that just came out arrives with its × — nothing else on the
      // line changes, so those two are the only things that move.
      const el = wrapEl()?.querySelector('[data-expr-id="' + peeledId + '"]')
      const op = el?.previousElementSibling
      const born = [el, op?.classList?.contains('term-op') ? op : null].filter(Boolean)
      if (born.length) {
        born.forEach(e => { e.style.animation = 'none' })
        gsap.set(born, { opacity: 0, scale: 0.6 })
        // eslint-disable-next-line no-await-in-loop
        await gsap.to(born, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }).then()
      }
      // eslint-disable-next-line no-await-in-loop
      await wait(0.55)
    }

    // What is left reads "1! × 2 × 3 × …". 1! is 1 by definition, and writing
    // that 1 out is the last thing the definition has to say.
    const lastFact = (node) => {
      if (!node || typeof node !== 'object') return null
      if (node.t === 'fact') return node
      for (const k of ['a', 'b', 'arg', 'base']) {
        const hit = lastFact(node[k])
        if (hit) return hit
      }
      return null
    }
    const one = lastFact(term.expr)
    if (one) {
      const v = one.arg?.t === 'num' ? one.arg.v : 1
      const keptId = one.id
      delete one.arg
      one.t = 'num'
      one.v = v <= 1 ? 1 : v
      flushSync(() => setState(state.snapshot()))
      const el = wrapEl()?.querySelector('[data-expr-id="' + keptId + '"]')
      if (el) {
        el.style.animation = 'none'
        await gsap.to(el, { scale: 1.2, duration: 0.16, ease: 'back.out(2.5)', yoyo: true, repeat: 1 }).then()
      }
      await wait(0.4)
    }
    return true
  }

  const flyTogether = async (anchor, secondary) => {
    // Kill any still-running CSS mount animation (termEnter) on both chips —
    // without this the anchor/secondary can render at a stale mid-animation
    // scale for a frame (same fix combineTerms already applies).
    anchor.style.animation = 'none'
    secondary.style.animation = 'none'

    // 1. Highlight both terms about to combine.
    await gsap.to([anchor, secondary], { color: '#60a5fa', duration: 0.25, ease: 'power2.out' }).then()
    await wait(0.25)

    // 2. Choose the anchor — ring it as the landing spot.
    await gsap.to(anchor, {
      boxShadow: '0 0 0 3px #60a5fa, 0 0 20px #60a5fa88', scale: 1.06,
      duration: 0.25, ease: 'power2.out',
    }).then()

    // 3. Travel + shrink + fade, all at once, still in flow — and the
    // operator right in front of it (e.g. "+") fades away in that SAME
    // tween, since it has no meaning once the two numbers merge.
    // The operator that has to go is the one BETWEEN the two chips, and which
    // side of the secondary that is depends on which chip is flying. Always
    // taking the one in front of it worked while the anchor was on the left; the
    // moment the right-hand chip became the anchor — the convention everywhere
    // now — the minus in "3,56 − 1,2" was left untouched, hanging in mid-air
    // while the number it belonged to melted away, and then vanishing on its own
    // at the next commit.
    const before   = anchor.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING
    const sibling  = before ? secondary.previousElementSibling : secondary.nextElementSibling
    const operator = (sibling?.classList?.contains('term-op') || sibling?.classList?.contains('exp-op')) ? sibling : null
    if (operator) operator.style.overflow = 'hidden'

    const anchorRect    = anchor.getBoundingClientRect()
    const secondaryRect = secondary.getBoundingClientRect()
    const tx = anchorRect.left + anchorRect.width  / 2 - (secondaryRect.left + secondaryRect.width  / 2)
    const ty = anchorRect.top  + anchorRect.height / 2 - (secondaryRect.top  + secondaryRect.height / 2)
    secondary.style.overflow = 'hidden'
    await Promise.all([
      gsap.to(secondary, {
        x: tx, y: ty, opacity: 0,
        width: 0, paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0,
        duration: 0.55, ease: 'power2.inOut',
      }).then(),
      operator
        ? gsap.to(operator, {
            opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0,
            duration: 0.55, ease: 'power2.inOut',
          }).then()
        : Promise.resolve(),
    ])
    secondary.remove()
    if (operator) operator.remove()
  }

  // After the anchor already shows its new value (steps 1-2 are the
  // caller's job), play out the REST as its own clearly-paced beats:
  //   3. the highlight color clears — blue back to normal
  //   4. any leftover parens/operator fade away (opacity only — still
  //      holding their space, so this reads as its own distinct step)
  //   5. THEN that empty space collapses, sliding whatever comes after
  //      (e.g. "×3") back to fill the void
  // Only once all of that has actually played does the real React commit
  // happen — by then the DOM already looks exactly like the result, so the
  // swap itself is invisible.
  const settleAfterMerge = async (anchor, getAfterEl) => {
    // 3. Color clears.
    await gsap.to(anchor, { color: '', duration: 0.3, ease: 'power2.out' }).then()
    await wait(0.3)

    // 4. Leftover decorations fade (opacity only).
    const row = anchor.parentElement
    const decorations = row ? [...row.children].filter(c => c !== anchor) : []
    if (decorations.length) {
      await gsap.to(decorations, { opacity: 0, duration: 0.3, ease: 'power2.in' }).then()
      await wait(0.25)

      // 5. Collapse the now-empty space — siblings slide back to fill it.
      decorations.forEach(el => { el.style.overflow = 'hidden' })
      await gsap.to(decorations, {
        width: 0, paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0,
        duration: 0.4, ease: 'power2.inOut',
      }).then()
      await wait(0.2)
    }

    flushSync(() => setState(state.snapshot()))
    const after = getAfterEl()
    if (after) {
      const cells = Array.isArray(after) ? after : [after]
      cells.forEach(c => { if (c) c.style.animation = 'none' })
    }
    await wait(0.4)
  }

  // +, −, ÷ — a plain two-chip merge.
  const combineReveal = async (getBeforeEls, readyNode, getAfterEl) => {
    const els = getBeforeEls()
    if (!els || els.length < 2) return revealStep(getBeforeEls, () => applyReady(readyNode), getAfterEl)
    const [anchor, secondary] = els

    // 1. "4" travels toward "6" while fading.
    await flyTogether(anchor, secondary)

    // 2. "6" becomes "10" the instant "4" is gone, with its own decisive pop.
    const result = applyReady(readyNode)
    anchor.textContent = String(parseFloat(result.toFixed(3)))
    await gsap.to(anchor, { scale: 1.2, duration: 0.15, ease: 'back.out(2.5)', yoyo: true, repeat: 1 }).then()
    await wait(0.35)

    await settleAfterMerge(anchor, getAfterEl)
  }

  // × — multiplication IS repeated addition: once the two chips fly
  // together, count up visibly in equal steps (4×10 runs 10…20…30…40)
  // before landing on the real product, instead of just popping straight to
  // the answer. Falls back to a single pop when there's no small integer
  // step count to show (e.g. 2.5×4, or a huge multiplier).
  const countUpReveal = async (getBeforeEls, readyNode, getAfterEl) => {
    const els = getBeforeEls()
    if (!els || els.length < 2) return revealStep(getBeforeEls, () => applyReady(readyNode), getAfterEl)
    const [anchor, secondary] = els

    // 1. "4" travels toward "6" while fading.
    await flyTogether(anchor, secondary)

    // Read a/b BEFORE applyReady mutates the node away.
    const a = readyNode.a.v, b = readyNode.b.v
    const bothInt = Number.isInteger(a) && Number.isInteger(b)
    const steps   = Math.round(Math.min(Math.abs(a), Math.abs(b)))
    const stepVal = Math.abs(a) <= Math.abs(b) ? b : a

    if (bothInt && steps >= 2 && steps <= 12) {
      for (let i = 1; i <= steps; i++) {
        anchor.textContent = String(parseFloat((stepVal * i).toFixed(3)))
        // eslint-disable-next-line no-await-in-loop
        await gsap.to(anchor, { scale: 1.12, duration: 0.08, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
        // eslint-disable-next-line no-await-in-loop
        await wait(0.05)
      }
    } else {
      await gsap.to(anchor, { scale: 1.18, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
    }

    // 2. Land on the true (correctly-signed) result with its own decisive pop.
    const result = applyReady(readyNode)
    anchor.textContent = String(parseFloat(result.toFixed(3)))
    await gsap.to(anchor, { scale: 1.2, duration: 0.15, ease: 'back.out(2.5)', yoyo: true, repeat: 1 }).then()
    await wait(0.35)

    await settleAfterMerge(anchor, getAfterEl)
  }

  // A data-expr-id host is either a leaf chip itself (.term-cell) or a group
  // wrapper (bin/pow/neg/sqrt/pm) that just connects several chips with plain
  // operators — animate the actual chip(s), never the unstyled wrapper.
  const exprCellsFor = (container, id) => {
    const host = container?.querySelector(`[data-expr-id="${id}"]`)
    if (!host) return null
    // A group wrapper's own connectors — sin/cos/tan's name and its big
    // parens (.fn-name/.pg-open/.pg-close) — read as part of the thing
    // that's about to change, same as the number chip(s) inside; without
    // them, applying sin(45) tinted only "45" blue and left "sin(" ")"
    // looking untouched, like they weren't part of the operation at all.
    // An exponent that is an expression has no chips — its numbers and letters
    // are .exp-leaf text — and a step on it animates those the same way.
    return host.matches('.term-cell, .exp-leaf') ? host
      : [...host.querySelectorAll('.term-cell, .exp-leaf, .fn-name, .pg-open, .pg-close')]
  }

  // An equation written without "=" is a thing being SHOWN. These steps are the
  // ones that turn it into a problem — none of them can run without a second
  // side to work against — so the "= 0" that used to be forced on every equation
  // at parse time is added here, at the one moment it is actually needed. The
  // side is already empty; dropping the flag is what lets the panel draw the 0.
  //
  // Except when there is nothing to isolate. A one-sided line with no unknown
  // in it — 24,56 × 10² — is an arithmetic to work out, not a problem to solve:
  // there is no x to send anywhere, so the second side it was handed could only
  // ever read "= 0" beside the answer.
  if (state?.oneSided && SOLVES.has(action.type)) {
    const hasUnknown = [...state.left, ...state.right].some(t =>
      t.variable || t.symbolicLabel || (t.expr && collectLabels(t.expr).size > 0))
    if (hasUnknown || action.type !== 'full-solve-current') state.oneSided = false
  }

  switch (action.type) {

    // ── Geometry actions (SVG canvas) ─────────────────────────────────────────

    case 'ggb-clear': {
      geoEngine.clearAll(geoRef)
      await wait(0.2)
      break
    }

    // ── Chart panel (fraction circles) ──────────────────────────────────────

    // ── Equation annotations ────────────────────────────────────────────────

    case 'eq-annotate': {
      await equationRef.current?.annotate({
        id: action.id, side: action.side, from: action.from, to: action.to,
        part: action.part, text: action.text, color: action.color,
      })
      break
    }

    case 'eq-annotate-remove': {
      await equationRef.current?.removeAnnotation(action.id)
      break
    }

    case 'eq-annotate-clear': {
      equationRef.current?.clearAnnotations()
      await wait(0.15)
      break
    }

    case 'eq-arrow': {
      await equationRef.current?.addArrow({
        id: action.id, side: action.side, from: action.from, to: action.to,
        text: action.text, place: action.place, color: action.color,
      })
      break
    }

    case 'eq-arrow-remove': {
      await equationRef.current?.removeArrow(action.id)
      break
    }

    case 'eq-arrow-clear': {
      await equationRef.current?.clearArrows({ fade: true })
      break
    }

    case 'eq-arrow-chain': {
      if (!state) break
      const side  = state.oneSided || action.side !== 'right' ? 'left' : 'right'
      const cells = (side === 'right' ? state.right : state.left).length
      const last  = Math.min(cells - 1, action.to ?? cells - 1)
      // A wave along the row: each hop starts while the one before it is still
      // drawing, so the chain reads as one movement rather than a queue.
      const hops = []
      for (let i = Math.max(0, action.from ?? 0); i < last; i++) {
        hops.push(equationRef.current?.addArrow({
          id: `${action.id}-${i}`, side, from: i, to: i + 1,
          text: action.text, place: action.place, color: action.color,
        }))
        // eslint-disable-next-line no-await-in-loop
        await wait(0.3)
      }
      await Promise.all(hops)
      break
    }

    case 'chart-tree': {
      await chartEngine.createTree(kidRefs.chartRef, action.id, action.opts ?? {})
      break
    }
    case 'chart-tree-path': {
      await chartEngine.highlightTreePath(kidRefs.chartRef, action.id, action.path)
      break
    }

    case 'chart-venn': {
      await chartEngine.createVenn(kidRefs.chartRef, action.id, action.opts ?? {})
      break
    }
    case 'chart-venn-highlight': {
      await chartEngine.highlightVenn(kidRefs.chartRef, action.id, action.expr, action.color)
      break
    }

    case 'chart-number-sets': {
      await chartEngine.createNumberSets(kidRefs.chartRef, action.id, action.opts ?? {})
      break
    }

    case 'chart-pie': {
      await chartEngine.createPie(kidRefs.chartRef, action.id, action.num, action.den, action.opts ?? {})
      break
    }

    case 'chart-pie-set': {
      await chartEngine.setPieValue(kidRefs.chartRef, action.id, action.num, action.den)
      break
    }

    case 'chart-pie-mode': {
      await chartEngine.setPieMode(kidRefs.chartRef, action.id, action.mode)
      break
    }
    case 'chart-remove': {

      await Promise.all(idsOf(action).map(id => chartEngine.removeChart(kidRefs.chartRef, id)))
      break
    }

    case 'ggb-create-polygon': {
      const { id, shapeType, values, opts } = action
      geoEngine.createPolygon(geoRef, id, shapeType, values, opts ?? {})
      await wait(0.5)
      break
    }

    case 'ggb-snap-shape': {
      const { id, parentId, anchors, opts } = action
      geoEngine.snapShape(geoRef, id, parentId, anchors, opts ?? {})
      await wait(0.5)
      break
    }

    case 'ggb-name-vertices': {
      geoEngine.nameVertices(geoRef, action.id, action.names ?? [], action.opts ?? {})
      await wait(0.4)
      break
    }

    case 'ggb-erase-shape': {
      geoEngine.eraseShape(geoRef, action.id)
      await wait(0.3)
      break
    }

    case 'ggb-move-shape': {
      await geoEngine.moveShape(geoRef, action.id, action.dx ?? 0, action.dy ?? 0)
      break
    }

    case 'ggb-highlight-shape': {
      await geoEngine.highlightShape(geoRef, action.id)
      break
    }

    case 'ggb-unhighlight-shape':
    case 'ggb-reset-style': {
      await geoEngine.unhighlightShape(geoRef, action.id)
      break
    }

    case 'ggb-label-sides': {
      geoEngine.labelSides(geoRef, action.id, action.customLabels ?? [])
      await wait(0.4)
      break
    }

    case 'ggb-show-measure': {
      await geoEngine.showMeasure(geoRef, action.id, action.opts ?? {})
      break
    }

    case 'ggb-show-area-measures': {
      // Shapes can live in either registry — geometryEngine's (geo-create-polygon,
      // SVG-ish 2D canvas) or threeEngine's (geo3d-create-2d, flat Three.js canvas).
      if (geoEngine.getShapeIds().includes(action.id)) {
        await geoEngine.showAreaMeasures(geoRef, action.id, action.opts ?? {})
      } else {
        await threeEngine.showAreaMeasures3D(threeRef, action.id, action.opts ?? {})
      }
      break
    }

    case 'ggb-show-perimeter-measures': {
      if (geoEngine.getShapeIds().includes(action.id)) {
        await geoEngine.showPerimeterMeasures(geoRef, action.id, action.opts ?? {})
      } else {
        await threeEngine.showPerimeterMeasures3D(threeRef, action.id, action.opts ?? {})
      }
      break
    }

    case 'ggb-unlabel-sides': {
      geoEngine.unlabelSides(geoRef, action.id)
      await wait(0.2)
      break
    }

    case 'ggb-add-text': {
      geoEngine.addText(geoRef, action.id, action.text, action.x ?? 0, action.y ?? 0, action.opts ?? {})
      await wait(0.4)
      break
    }

    case 'ggb-remove-text': {
      geoEngine.removeText(geoRef, action.id)
      await wait(0.2)
      break
    }

    case 'ggb-eval':
      await wait(action.pause ?? 0.3)
      break

    // ── Graph actions (Desmos) ────────────────────────────────────────────────

    case 'ggb-plot-function': {
      const calc = graphApi(); if (!calc) break
      const id = action.id || graphEngine.nextFuncId()
      await graphEngine.plotFunction(calc, id, action.expr, action.opts ?? {})
      break
    }

    case 'ggb-best-fit-line': {
      const calc = graphApi(); if (!calc) break
      const id = action.id || graphEngine.nextFuncId()
      await graphEngine.plotBestFitLine(calc, id, action.pointIds, action.opts ?? {})
      break
    }

    case 'ggb-remove-function': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.removeFunction(calc, action.id)
      break
    }

    case 'ggb-shade-area': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.shadeUnderCurve(calc, action.id, action.funcId, action.a, action.b, action.opts ?? {})
      break
    }

    case 'ggb-find-intersections': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.findAndMarkIntersections(calc, action.id, action.f1Id, action.f2Id, action.opts ?? {})
      break
    }

    case 'ggb-trig-circle': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.drawTrigCircle(calc)
      break
    }

    case 'ggb-parallel': {
      await Promise.all(
        (action.actions ?? []).map(a => runAction(a, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs))
      )
      break
    }

    // ── 3D geometry actions ───────────────────────────────────────────────────

    case 'ggb-3d-create': {
      await threeEngine.createShape3D(threeRef, action.id, action.shape, action.a, action.b, action.c, action.opts ?? {})
      break
    }

case 'ggb-2d-polygon': {
      threeEngine.createPolygonFromPoints3D(threeRef, action.id, action.points, action.opts ?? {})
      await wait(0.5)
      break
    }

    
case 'ggb-2d-snap': {
      threeEngine.snapShape3D(threeRef, action.id, action.parentId, action.anchors, action.opts ?? {})
      await wait(0.5)
      break
    }

    case 'ggb-2d-name-vertices': {
      threeEngine.nameVertices3D(threeRef, action.id, action.names ?? [], action.opts ?? {})
      await wait(0.4)
      break
    }

    
    case 'ggb-3d-remove': {
      // Together, not one after another: several shapes named in one step are
      // one clearing-out, and fading them in turn reads as a queue.
      await Promise.all(idsOf(action).map(id => threeEngine.removeShape3D(threeRef, id)))
      break
    }

    case 'ggb-3d-move': {
      await threeEngine.moveShape3D(threeRef, action.id, action.dx, action.dy, action.dz ?? 0, action.duration ?? 0.5)
      break
    }

    case 'ggb-2d-flip': {
      await threeEngine.flipShape2D(threeRef, action.id)
      break
    }

    case 'ggb-2d-rotate': {
      await threeEngine.rotateShape2D(threeRef, action.id, action.degrees ?? 90)
      break
    }

    case 'ggb-3d-highlight': {
      await threeEngine.highlightShape3D(threeRef, action.id)
      break
    }

    case 'ggb-3d-label-sides': {
      await threeEngine.labelSides3D(threeRef, action.id, action.labels ?? [])
      break
    }

    case 'ggb-3d-show-angles': {
      await threeEngine.showAngles3D(threeRef, action.id, action.color, action.showValues)
      break
    }

    case 'ggb-3d-highlight-angle': {
      await threeEngine.highlightAngle3D(threeRef, action.id, action.angleIndex, action.color)
      break
    }

    case 'ggb-3d-mark-angle': {
      await threeEngine.markAngle3D(threeRef, action.id, action.markId, action.from, action.vertex, action.to, action.opts ?? {})
      break
    }

    case 'ggb-3d-highlight-edge': {
      await threeEngine.highlightEdge3D(threeRef, action.id, action.edgeIndex, action.color)
      break
    }

    case 'ggb-3d-remove-edge-highlight': {
      threeEngine.removeEdgeHighlight3D(threeRef, action.id, action.edgeIndex)
      await wait(0.1)
      break
    }

    case 'ggb-3d-highlight-face': {
      await threeEngine.highlightFace3D(threeRef, action.id, action.faceIndex, action.color)
      break
    }

    case 'ggb-3d-remove-face-highlight': {
      threeEngine.removeFaceHighlight3D(threeRef, action.id, action.faceIndex)
      await wait(0.1)
      break
    }

    case 'ggb-3d-show-tick': {
      threeEngine.showEqualTick3D(threeRef, action.id, action.edgeIndex, action.ticks, action.color)
      await wait(0.2)
      break
    }

    case 'ggb-3d-remove-tick': {
      threeEngine.removeEqualTick3D(threeRef, action.id, action.edgeIndex)
      await wait(0.1)
      break
    }

    case 'ggb-3d-show-arrow': {
      await threeEngine.showArrow3D(threeRef, action.id, action.arrowId, action.from, action.to, action.color)
      break
    }

    case 'ggb-3d-remove-arrow': {
      await threeEngine.removeArrow3D(threeRef, action.id, action.arrowId)
      break
    }

    case 'ggb-3d-clear-highlights': {
      threeEngine.clearHighlights3D(threeRef, action.id)
      await wait(0.05)
      break
    }

    case 'ggb-3d-set-view': {
      await threeEngine.setView3D(threeRef, {
        zoom:     action.zoom     ?? 1,
        panX:     action.panX     ?? 0,
        panY:     action.panY     ?? 0,
        distance: action.distance ?? null,
        duration: action.duration ?? 0.8,
        preset:   action.preset   || null,
      })
      break
    }

    case 'ggb-3d-add-text': {
      threeEngine.addText3D(threeRef, action.id, action.text, action.x, action.y, action.opts ?? {})
      break
    }

    case 'ggb-3d-remove-text': {
      threeEngine.removeText3D(threeRef, action.id)
      break
    }

    case 'ggb-3d-show-volume-measures': {
      threeEngine.showVolumeMeasures3D(threeRef, action.id, action.opts ?? {})
      await wait(0.2)
      break
    }

    case 'ggb-3d-remove-volume-measures': {
      threeEngine.removeVolumeMeasures3D(threeRef, action.id)
      await wait(0.1)
      break
    }

    case 'ggb-3d-clear': {
      threeEngine.clearAll3D(threeRef)
      break
    }

    case 'ggb-add-point': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.addPoint(calc, action.id, action.x, action.y, action.opts ?? {})
      break
    }

    case 'ggb-remove-point': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.removePoint(calc, action.id)
      break
    }

    case 'ggb-scatter-plot': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.addScatterPlot(calc, action.id, action.params, action.opts ?? {})
      break
    }

    case 'ggb-remove-scatter-plot': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.removeScatterPlot(calc, action.id)
      break
    }

    case 'ggb-add-segment': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.addSegment(calc, action.id, action.x1, action.y1, action.x2, action.y2, action.opts ?? {})
      break
    }

    case 'ggb-remove-segment': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.removeSegment(calc, action.id)
      break
    }

    case 'ggb-segment-tick': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.showSegmentTick(calc, action.id, action.ticks, action.color)
      break
    }

    case 'ggb-remove-segment-tick': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.removeSegmentTick(calc, action.id)
      break
    }

    case 'ggb-divide-segment-graph': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.divideSegmentGraph(calc, action.id, action.parts, action.color, action.showLabels)
      break
    }

    case 'ggb-remove-divide-segment-graph': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.removeDivideSegmentGraph(calc, action.id)
      break
    }

    case 'ggb-vertical-line': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.addVerticalLine(calc, action.id, action.x, action.opts ?? {})
      break
    }

    case 'ggb-adjust-view': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.adjustView(calc, action.cx ?? 0, action.cy ?? 0, action.range ?? 10)
      break
    }

    case 'ggb-set-viewport': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.setViewport(calc, action.xMin, action.xMax, action.yMin, action.yMax)
      break
    }

    case 'ggb-set-axes': {
      const calc = graphApi(); if (!calc) break
      graphEngine.setAxesVisible(calc, action.x ?? true, action.y ?? true)
      await wait(0.2)
      break
    }

    case 'ggb-set-grid': {
      const calc = graphApi(); if (!calc) break
      graphEngine.setGridVisible(calc, action.visible ?? true)
      await wait(0.2)
      break
    }

    case 'ggb-name-func': {
      const calc = graphApi(); if (!calc) break
      graphEngine.nameFunc(calc, action.id, action.funcId, action.label ?? action.funcId, action.x, action.y, action.opts ?? {})
      await wait(0.3)
      break
    }

    case 'ggb-horizontal-line': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.addHorizontalLine(calc, action.id, action.y, action.opts ?? {})
      break
    }

    case 'ggb-mark-roots': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.markRoots(calc, action.id, action.funcId, action.opts ?? {})
      break
    }

    case 'ggb-conic-elements': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.showConicElements(calc, action.id, action.funcId, action.opts ?? {})
      break
    }

    case 'ggb-remove-conic-elements': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.removeConicElements(calc, action.id)
      break
    }

    case 'ggb-show-projection': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.showAxisProjection(calc, action.id, action.pointId, action.opts ?? {})
      break
    }

    case 'ggb-draw-vector': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.drawVector(calc, action.id, action.x1, action.y1, action.x2, action.y2, action.opts ?? {})
      break
    }

    case 'ggb-angle-between': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.angleBetween(calc, action.id, action.a, action.b, action.opts ?? {})
      break
    }
    case 'ggb-remove-angle': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.removeAngle(calc, action.id)
      break
    }

    case 'ggb-draw-angle': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.drawAngle(calc, action.id, action.ax, action.ay, action.bx, action.by, action.cx, action.cy, action.opts ?? {})
      break
    }

    case 'ggb-transform-function': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.transformFunction(calc, action.id, action.funcId, action.transformType, action.value, action.opts ?? {})
      break
    }

    // ── Equation actions ─────────────────────────────────────────────────────

    // ── One TERM, not the equation ────────────────────────────────────────
    // Everything else that scales here acts on both sides, because that is
    // what keeps an equation true. This does the opposite thing: it rewrites a
    // single term into an equal form — 6 into 6/1, 6/1 into 18/3 — which is a
    // statement about that term, not a move on the equation. Both sides stay
    // untouched, and the value never changes.
    // ── Scientific notation, written out ──────────────────────────────────────
    // 24,56 × 10² is 2456, and the reason is that the exponent counts how many
    // places the comma moves. So the comma moves — one place per beat, with the
    // exponent ticking down beside it — instead of the answer simply replacing
    // the question. When the comma runs off the end of the digits a zero is laid
    // down for it to step onto, which is the other half of the same rule.
    // ── n! , taken apart one factor at a time ─────────────────────────────────
    // 5! is not a number a reader can see INTO — it is notation, and the whole
    // lesson is what it stands for. So it is unpacked the way it is defined:
    // 5! = 4!·5, and 4! = 3!·4, until there is no factorial left and the product
    // is written out in full. Each beat peels exactly one factor off the front
    // and sets it down on the right, so the two forms are on screen together and
    // the reader can see they are the same thing.
    case 'factorial-expand': {
      if (!state) break
      const arr  = action.side === 'right' ? state.right : state.left
      const term = arr[action.index]
      if (!term?.expr) {
        console.warn('[factorial-expand] no expression at ' + action.side + '[' + action.index + ']')
        break
      }

      await unpackFactorials(term)
      break
    }

    case 'sci-expand': {
      if (!state) break
      const arr  = action.side === 'right' ? state.right : state.left
      const term = arr[action.index]
      if (!term) { console.warn(`[sci-expand] no term at ${action.side}[${action.index}]`); break }
      const e = term.expr
      // Where the exponent should END. 0 is the original behaviour — write the
      // number out in full — and stays the default, so existing lessons are
      // untouched. Any other value stops the comma early, in either direction:
      // to add 2,34 × 10² and 4,45 × 10⁴, the second is first rewritten as
      // 445 × 10², on the same power of ten, and only then can they combine.
      const target = Number.isFinite(Number(action.target)) ? Math.round(Number(action.target)) : 0
      const isSci = e && e.t === 'bin' && e.op === '*' && e.a.t === 'num' &&
                    e.b.t === 'pow' && e.b.base.t === 'num' && e.b.base.v === 10 &&
                    Number.isFinite(e.b.exp) && e.b.exp !== target
      if (!isSci) {
        console.warn('[sci-expand] needs a term written as m × 10^n whose exponent is not already the target')
        break
      }

      const wrap  = getWrap(refs(), term.side, term.cellIndex)
      const group = wrap?.querySelector('.expr-group')
      const mant  = group?.querySelector(':scope > .term-cell')
      const mul   = group?.querySelector(':scope > .term-op--mul')
      const powEl = group?.querySelector(':scope > .expr-group')
      const expEl = powEl?.querySelector('.term-exp')
      if (!mant) { console.warn('[sci-expand] the mantissa is not on screen'); break }

      const DEC = term.decimalComma ? ',' : '.'
      const SUPS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
      const sup = (v) => String(v).split('').map(c => SUPS[c] ?? c).join('')

      const raw  = String(Math.abs(e.a.v))
      const dot  = raw.indexOf('.')
      const digits = raw.replace('.', '').split('')
      let point  = dot < 0 ? digits.length : dot
      let n      = e.b.exp

      // Each digit is its own element from the start, so the separator has
      // somewhere to move BETWEEN. A rewritten text node would put the comma in
      // its new place without ever crossing anything.
      const mkDigit = (ch) => {
        const s = document.createElement('span')
        s.className = 'sci-digit'
        s.textContent = ch
        return s
      }

      const digitEls = digits.map(mkDigit)
      const sepEl = document.createElement('span')
      sepEl.className = 'term-sep'
      sepEl.textContent = DEC
      // The cell drew the number as three children — integer, separator, decimal —
      // and paid the 3px cell gap twice for it. With the gap off, that spacing is
      // given back to the separator alone, so the number is exactly as wide the
      // instant this step takes the cell over as it was the instant before.
      sepEl.style.margin = '0 3px'

      // .term-cell is a flex row with a 3px gap, which a single text node never
      // paid for and six digit spans do — the number jumped 15px wider the moment
      // it was split up. The gap goes while this step owns the cell.
      const prevGap = mant.style.gap
      mant.style.gap = '0px'

      const relayout = () => {
        mant.textContent = ''
        digitEls.forEach((d, k) => {
          if (k === point) mant.appendChild(sepEl)
          mant.appendChild(d)
        })
        if (point >= digitEls.length) mant.appendChild(sepEl)
      }
      relayout()

    // The panel centres its content, so the equation re-centred every time a
    // digit was laid down or the comma changed place — a shuffle sideways a
    // second, right beside the thing being followed. For the length of this
    // step it is anchored by its LEFT edge instead: one style change, set once,
    // after which the number simply grows to the right and nothing re-centres.
    // Reserving the space up front instead made the number widen at the start
    // as if digits had been hidden, and compensating per frame with a transform
    // was fighting the layout rather than choosing one.
      // Both the panel AND the side inside it centre what they hold, so
      // anchoring only the outer one still left the term sliding 16px the
      // moment a digit was added. Each container on the way down to the term is
      // switched to left-aligned and given the exact padding that reproduces
      // where it already was — measured after the switch, because a box that
      // shrink-wraps its content has no such offset until it stops.
      const anchorOf = (el) => {
        const first = el?.firstElementChild
        if (!el || !first) return null
        const was  = first.getBoundingClientRect().left
        const prev = { justify: el.style.justifyContent, width: el.style.width, pad: el.style.paddingLeft }
        el.style.width = '100%'
        el.style.justifyContent = 'flex-start'
        el.style.paddingLeft = '0px'
        el.style.paddingLeft = `${was - first.getBoundingClientRect().left}px`
        return { el, prev, first }
      }
      const stage   = wrap.closest('.equation-display')
      const anchors = [stage, wrap.parentElement].map(anchorOf).filter(Boolean)

      // The exponent counts down through different digits, and ³ ² ¹ ⁰ are not
      // all the same width — a two-pixel wobble a beat, which is exactly the
      // thing this step is trying not to do. Its box is set to the widest of the
      // values it will actually show and left there.
      if (expEl) {
        const was = expEl.textContent
        let widest = 0
        // Every value between where the exponent starts and where it stops —
        // no longer 0..n, now that it need not end at 0.
        for (let k = Math.min(n, target); k <= Math.max(n, target); k++) {
          expEl.textContent = sup(k)
          widest = Math.max(widest, expEl.getBoundingClientRect().width)
        }
        expEl.textContent = was
        expEl.style.display = 'inline-block'
        expEl.style.width = `${Math.ceil(widest)}px`
        expEl.style.textAlign = 'center'
      }

      const rectsOf = (els) => els.map(el => el.getBoundingClientRect())

      while (n !== target) {
        const dir = n > target ? 1 : -1

        // A zero is laid down BEFORE the comma steps onto it, so the reader sees
        // what the comma is moving past rather than a digit appearing from under
        // it after the fact.
        // A zero is laid down BEFORE the comma steps onto it, so the reader sees
        // what the comma is moving past rather than a digit appearing from under
        // it after the fact.
        let fresh = null
        if (dir > 0 && point + 1 > digitEls.length) {
          fresh = mkDigit('0')
          digitEls.push(fresh)
        } else if (dir < 0 && point - 1 === 0) {
          fresh = mkDigit('0')
          digitEls.unshift(fresh)
          point += 1
        }
        if (fresh) {
          relayout()
          gsap.set(fresh, { opacity: 0, scale: 0.5 })
          // eslint-disable-next-line no-await-in-loop
          await gsap.to(fresh, { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(2)' }).then()
          // A beat to look at the zero before the comma steps onto it.
          // eslint-disable-next-line no-await-in-loop
          await wait(0.22)
        }

        const moving = [...digitEls, sepEl]
        const before = rectsOf(moving)
        point += dir
        n     -= dir
        relayout()
        const after = rectsOf(moving)
        moving.forEach((el, k) => gsap.set(el, { x: before[k].left - after[k].left }))

        // eslint-disable-next-line no-await-in-loop
        await Promise.all([
          gsap.to(moving, { x: 0, duration: 0.5, ease: 'power2.inOut' }).then(),
          expEl
            ? gsap.to(expEl, { scale: 1.35, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1,
                onRepeat: () => { expEl.textContent = sup(n) } }).then()
            : Promise.resolve(),
        ])

        // Each place is a separate step of the rule, so it gets a beat of its
        // own. Run together they read as one long slide and the count of places
        // — which is the whole thing the exponent is telling you — is lost.
        // eslint-disable-next-line no-await-in-loop
        await wait(0.4)
      }

      // × 10⁰ multiplies by one. It has done its work and it goes. Stopped at
      // any other exponent the × 10ᵏ is still part of the number and stays —
      // only a comma left dangling at the end ("445,") is taken away.
      const gone = target === 0 ? [mul, powEl].filter(Boolean) : []
      if (point >= digitEls.length) gone.push(sepEl)
      if (gone.length) {
        gone.forEach(el => { el.style.overflow = 'hidden' })
        await gsap.to(gone, {
          opacity: 0, width: 0, marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0,
          duration: 0.4, ease: 'power2.inOut',
        }).then()
      }

      // Out of the layout entirely, not merely zero-width: a flex gap survives a
      // width of 0, so 30px of empty room stayed behind and the equation jumped
      // that far the moment React dropped these for real. Taking them out now
      // means the release below is measured against the FINAL layout and covers
      // the whole distance in its one move.
      gone.forEach(el => { el.style.display = 'none' })

      // Before the commit, not after: React re-creates the side when the term
      // changes shape, and every inline style holding the anchor goes with it —
      // so a release that ran afterwards was releasing something the browser had
      // already snapped back. By now the × 10⁰ is collapsed to nothing, so its
      // removal at the commit costs no width and nothing moves again.
      // Centring goes back on, and the one move it costs is animated the same way
      // every other move in this file is: measure where it was, put the real
      // styles back, measure where it landed, and slide it from one to the other.
      // Tweening the padding itself did not work — the value animated but the
      // layout it belonged to had already been replaced, so the whole move
      // arrived as a snap.
      if (anchors.length) {
        // Measured on the TERM, not on the container that holds it: releasing the
        // anchor can leave a full-width side exactly where it was while the term
        // inside it slides across, and it is the term the reader is watching.
        const target = anchors[anchors.length - 1].el
        const was = wrap.getBoundingClientRect().left
        anchors.forEach(({ el, prev }) => {
          el.style.justifyContent = prev.justify
          el.style.width          = prev.width
          el.style.paddingLeft    = prev.pad
        })
        const dx = was - wrap.getBoundingClientRect().left
        if (Math.abs(dx) > 0.5) {
          gsap.set(target, { x: dx })
          await gsap.to(target, { x: 0, duration: 0.45, ease: 'power2.inOut' }).then()
        }
      }

      // The value comes from the digits on screen, not from m × 10^n: 24.56 × 100
      // is 2456.0000000000005 in binary floating point, and that is what would
      // have been written under an animation that just showed 2456.

      const whole = digitEls.map(d => d.textContent).join('')
      const text  = point >= whole.length ? whole : whole.slice(0, point) + '.' + whole.slice(point)
      if (target === 0) {
        term.expr        = null
        term.coefficient = Number(text)
        term.variable    = null
        term.degree      = 0
      } else {
        // Still m × 10ᵏ — the same shape the parser builds for "445 x 10^2", so a
        // later step (another shift, a combine) reads it exactly like a typed one.
        const uid = () => crypto.randomUUID()
        term.expr = {
          t: 'bin', id: uid(), op: '*',
          a: { t: 'num', id: uid(), v: Number(text) },
          b: { t: 'pow', id: uid(), base: { t: 'num', id: uid(), v: 10 }, exp: target },
        }
        // The shape did not change, so React would REUSE the mantissa cell —
        // whose children this step replaced by hand with one span per digit —
        // and patch text nodes it no longer owns. A new id (terms are keyed by
        // it) makes it mount a clean cell instead.
        term.id = uid()
      }
      flushSync(() => setState(state.snapshot()))

      // The committed term is a brand new element, and .term-cell carries a
      // mount animation — which played here as a blink, the number vanishing
      // and snapping back for one beat. The value on screen did not change, so
      // neither should anything else.
      const settled = getCellInner(getWrap(refs(), term.side, term.cellIndex))
      if (settled) settled.style.animation = 'none'


      break
    }

    case 'term-op': {
      if (!state) break
      const arr = action.side === 'right' ? state.right : state.left
      const term = arr[action.index]
      if (!term) { console.warn(`[term-op] no term at ${action.side}[${action.index}]`); break }

      const numNode = (v) => ({ t: 'num', id: crypto.randomUUID(), v })
      const wrapEl  = () => getWrap(refs(), term.side, term.cellIndex)
      const halves  = (w) => (w ? [...w.querySelectorAll('.expr-fraction-row .term-cell')].slice(0, 2) : [])
      const barEl    = (w) => w?.querySelector('.frac-bar') ?? null

      if (action.op === 'over') {
        // The 6 does not vanish and come back as a numerator — it BECOMES one.
        // It lights up, travels up into place, and the bar and the 1 arrive
        // underneath it. Replacing the term wholesale broke the one thing the
        // step is teaching: that this is the same 6.
        const before = getCellInner(wrapEl())
        if (before) {
          before.style.animation = 'none'
          // No tint. The move IS the explanation — the number rising into the
          // numerator says everything colouring it would have said, and one more
          // blue thing on screen only competes with the marks that mean something.
          await wait(0.15)
        }
        const fromRect = before?.getBoundingClientRect() ?? null

        term.expr = { t: 'bin', id: crypto.randomUUID(), op: '/', a: numNode(Math.abs(term.coefficient ?? 0)), b: numNode(1) }
        term.coefficient = 1
        term.variable = null
        term.degree = 0
        flushSync(() => setState(state.snapshot()))

        const w = wrapEl()
        const [num, den] = halves(w)
        const bar = barEl(w)
        // The denominator and the bar are what is NEW, so they are the only
        // things that fade in. The numerator slides from wherever the whole
        // number stood a moment ago.
        if (den) gsap.set(den, { opacity: 0, y: -6 })
        if (bar) gsap.set(bar, { opacity: 0, scaleX: 0.2 })
        if (num && fromRect) {
          const r = num.getBoundingClientRect()
          num.style.animation = 'none'
          gsap.set(num, { y: fromRect.top - r.top, x: fromRect.left - r.left })
          await gsap.to(num, { x: 0, y: 0, duration: 0.45, ease: 'power3.out' }).then()
        }
        await Promise.all([
          bar ? gsap.to(bar, { opacity: 1, scaleX: 1, duration: 0.3, ease: 'power2.out' }).then() : Promise.resolve(),
          den ? gsap.to(den, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)', delay: 0.08 }).then() : Promise.resolve(),
        ])
        await wait(0.3)
      } else if (action.op === 'amplify') {
        const k = Number(action.value)
        const isFrac = term.expr && term.expr.t === 'bin' && term.expr.op === '/' &&
                       term.expr.a.t === 'num' && term.expr.b.t === 'num'
        if (!isFrac || !isFinite(k) || k === 0) {
          console.warn('[term-op] amplify needs a numeric fraction and a non-zero k')
          break
        }
        // Show the work: a "×k" beside each half. Multiplying both by the same
        // number IS the idea of an equivalent fraction.
        const w0 = wrapEl()
        const marks = halves(w0).map(c => {
          const r  = c.getBoundingClientRect()
          const el = document.createElement('div')
          el.className = '_anim-overlay eq-times-mark'
          el.textContent = `×${k}`
          el.style.cssText = `position:fixed; left:${r.right + 8}px; top:${r.top + r.height / 2}px;`
            + 'transform:translateY(-50%); opacity:0;'
          document.body.appendChild(el)
          return el
        })
        if (marks.length) {
          await gsap.to(marks, { opacity: 1, duration: 0.3, ease: 'power2.out', stagger: 0.1 }).then()
          await wait(0.55)
        }

        const { a, b } = term.expr
        term.expr = {
          t: 'bin', id: crypto.randomUUID(), op: '/',
          a: numNode(parseFloat((a.v * k).toFixed(6))),
          b: numNode(parseFloat((b.v * k).toFixed(6))),
        }
        flushSync(() => setState(state.snapshot()))

        // The numbers change IN PLACE with a pop — nothing leaves and comes
        // back — and the ×k blurs away in the same breath, because it has
        // just been spent.
        const parts = halves(wrapEl())
        parts.forEach(c => { c.style.animation = 'none' })
        await Promise.all([
          parts.length
            ? gsap.fromTo(parts, { scale: 0.75 }, { scale: 1, duration: 0.4, ease: 'back.out(2.2)' }).then()
            : Promise.resolve(),
          marks.length
            ? gsap.to(marks, { opacity: 0, filter: 'blur(6px)', duration: 0.32, ease: 'power2.in' }).then()
            : Promise.resolve(),
        ])
        marks.forEach(el => el.remove())
        await wait(0.25)
      } else {
        console.warn(`[term-op] unknown op "${action.op}"`)
      }
      break
    }

    case 'renderEquation': {
      // Annotations address cells by index, and a new equation renumbers them —
      // so they go with the equation they were describing.
      equationRef.current?.clearAnnotations()
      // Arrows join cells by index too.
      equationRef.current?.clearArrows?.()
      if (!state) break
      document.querySelectorAll('.final-result-highlight').forEach(el => el.remove())
      // No cross-fade here, and none is possible: eq-create hands App a SNAPSHOT
      // that is applied before this script ever runs, so by the time we get here
      // the new equation is already on screen. Fading "the old one" out therefore
      // faded out the new one and brought it straight back — the flash at the
      // start of every page. Replacing one equation with a visibly different one
      // needs the old to leave BEFORE the snapshot lands, which is a different
      // mechanism than this.
      setState(state.snapshot())
      await wait(0.35)

      // A mixed number went up as written — "6 2/3", no operator. Now the "+"
      // arrives, so the reader sees the two notations are one and the same
      // before any step operates on them.
      const held = [...state.left, ...state.right].filter(t => t.mixedJoin)
      if (held.length) {
        await wait(0.5)
        held.forEach(t => { t.mixedJoin = false })
        setState(state.snapshot())
        await wait(0.4)
      }
      break
    }

    // ── Replace the whole equation with a new one (whole-panel cross-fade) ──────
    // Used when an equation needs to morph into a structurally different one
    // (e.g. ax²+bx+c=0 → the quadratic formula → its resolved value) rather than
    // a term-level transform. Every value in action.left/right must already be
    // fully resolved — this action does not evaluate anything itself.
    case 'replaceEquation': {
      if (!state) break
      // The previous equation's final-result highlight (if any) belongs to
      // content that's about to disappear — never let it linger over new,
      // differently-shaped content.
      document.querySelectorAll('.final-result-highlight').forEach(el => el.remove())
      const oldWraps = allWraps(refs())
      if (oldWraps.length)
        await gsap.to(oldWraps, { opacity: 0, scale: 0.85, duration: 0.28, ease: 'power2.in', stagger: 0.02 }).then()

      state.left  = (action.left  ?? []).map(t => new MathObject(t))
      state.right = (action.right ?? []).map(t => new MathObject(t))
      state.reflow()
      flushSync(() => setState(state.snapshot()))

      const newWraps = allWraps(refs())
      if (newWraps.length) {
        gsap.set(newWraps, { opacity: 0, scale: 0.85 })
        await gsap.to(newWraps, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.6)', stagger: 0.03 }).then()
      }
      await wait(0.35)
      break
    }

    // ── Resolve the quadratic formula's "±" into a definite branch, IN PLACE
    // — the SAME tree that x = (-b±√Δ)/2a already resolved to (e.g. (5±1)/2)
    // continues from exactly that point instead of being rebuilt from Δ.
    case 'chooseQuadraticBranch': {
      if (!state) break
      // Relabelling x to x₁ makes the left side wider, so the ring drawn around
      // the previous result no longer fits what is under it. restoreQuadraticBranch
      // (the x → x₂ half) already dropped it here; this half did not, which is
      // why x₁ ended up with a border cutting through it and x₂ did not.
      document.querySelectorAll('.final-result-highlight').forEach(el => el.remove())
      const { newLabel, sign } = action
      const leftTerm  = state.left[0]
      const rightTerm = state.right.find(t => t.expr)
      const pmNode    = rightTerm && findPm(rightTerm.expr)
      if (!pmNode) {
        if (leftTerm && newLabel) { leftTerm.variable = newLabel; flushSync(() => setState(state.snapshot())) }
        break
      }

      // Stash a clone of the pre-branch tree so the OTHER branch (x₂) can
      // restore this exact shared point later, via 'restoreQuadraticBranch'.
      state._quadBranchClone = deepClone(rightTerm.expr)

      const wrap = () => getWrap(refs(), rightTerm.side, rightTerm.cellIndex)
      const el   = () => exprCellsFor(wrap(), pmNode.id)
      await revealStep(
        () => el(),
        () => {
          if (leftTerm && newLabel) leftTerm.variable = newLabel
          choosePmBranch(pmNode, sign)
        },
        () => el(),
      )
      break
    }

    // ── Rewind to the shared "x = (...±...)/2a" point stashed by the FIRST
    // branch choice, so the second branch (x₂) continues from there too,
    // instead of re-deriving the whole formula from Δ again.
    case 'restoreQuadraticBranch': {
      if (!state) break
      const clone = state._quadBranchClone
      if (!clone) break
      const { newLabel } = action

      document.querySelectorAll('.final-result-highlight').forEach(el => el.remove())
      const oldWraps = allWraps(refs())
      if (oldWraps.length)
        await gsap.to(oldWraps, { opacity: 0, scale: 0.85, duration: 0.28, ease: 'power2.in', stagger: 0.02 }).then()

      state.left  = [new MathObject({ sign: '+', coefficient: 1, variable: newLabel, degree: 1 })]
      state.right = [new MathObject({ sign: '+', expr: clone, coefficient: 1, variable: null, degree: 0 })]
      state.reflow()
      flushSync(() => setState(state.snapshot()))

      const newWraps = allWraps(refs())
      if (newWraps.length) {
        gsap.set(newWraps, { opacity: 0, scale: 0.85 })
        await gsap.to(newWraps, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.6)', stagger: 0.03 }).then()
      }
      await wait(0.35)
      break
    }

    case 'showTitle': {
      setUI(u => ({ ...u, title: action.text, answer: null }))
      await wait(0.08)
      break
    }
    case 'showAnswer': {
      setUI(u => ({ ...u, answer: action.text }))
      await wait(0.3)
      break
    }
    case 'pause': {
      await wait(action.seconds ?? 1.5)
      break
    }

    // ── Polynomial long division ─────────────────────────────────────────────
    // Draws the tableau set up but unsolved, then parks on the sub-step gate.
    // The reader sees the problem before the method, and each click brings down
    // one subtraction — same gate the auto-solve uses, so ‹ › work identically.
    case 'division-create': {
      dropSolveArtifacts(setUI, setComments, textRef)
      divisionRef?.current?.create(action.work)
      setDivisionUp?.(true)
      await wait(0.5)
      break
    }
    case 'division-reveal': {
      divisionRef?.current?.reveal(action.step, action.part)
      await wait(0.55)
      break
    }
    case 'division-quotient': {
      divisionRef?.current?.revealQuotient()
      await wait(0.4)
      break
    }
    case 'division-clear': {
      divisionRef?.current?.clearAll()
      setDivisionUp?.(false)
      await wait(0.1)
      break
    }

    case 'outlineDegree': {
      if (!state) break
      const { degree, side, color = '#60a5fa' } = action
      // Ring only — no size change. Scale is reserved for the moment a
      // number's value actually changes; merely marking it "about to be
      // operated on" shouldn't make it pop.
      getDegreeInners(state, refs(), degree, side).forEach(el => {
        gsap.to(el, { boxShadow: `0 0 0 3px ${color}, 0 0 22px ${color}88`, duration: 0.4, ease: 'power2.out' })
      })
      await wait(0.7)
      break
    }

    case 'clearOutlines': {
      allInners(refs()).forEach(el => {
        gsap.to(el, { boxShadow: '0 0 0 0px transparent', duration: 0.35 })
      })
      await wait(0.35)
      break
    }

    // ── Reorder ───────────────────────────────────────────────────────────────
    case 'reorderEquation': {
      if (!state) break
      const { left: leftIds, right: rightIds } = action
      const r = refs()

      // Record old positions + silence all visible cells
      const before = {}
      allWraps(r).forEach(wrapEl => {
        wrapEl.style.visibility = 'hidden'
        const inner = getCellInner(wrapEl)
        if (inner) inner.style.animation = 'none'
      })
      ;[...state.left, ...state.right].forEach(t => {
        const el = getWrap(r, t.side, t.cellIndex)
        if (el) before[t.id] = el.getBoundingClientRect()
      })

      if (leftIds)  state.left  = leftIds.map(id => state.findById(id)).filter(Boolean)
      if (rightIds) state.right = rightIds.map(id => state.findById(id)).filter(Boolean)
      state.reflow()

      // Commit — DOM reordered, still invisible (no paint between commit and FLIP)
      flushSync(() => setState(state.snapshot()))

      const fresh = refs()
      const anims = []

      const animateTerm = (t, i, side) => {
        const wrapEl = fresh[side]?.[i]
        const b      = before[t.id]
        if (!wrapEl || !b) return

        wrapEl.style.visibility = ''      // restore visibility

        const nr = wrapEl.getBoundingClientRect()
        const dx = b.left - nr.left
        if (Math.abs(dx) < 1) return      // didn't move

        const lane = (t.degree ?? 0) * LANE_H
        gsap.set(wrapEl, { x: dx, y: 0 })

        if (lane > 0) {
          const tl = gsap.timeline()
          tl.to(wrapEl, { y:  lane, duration: 0.22, ease: 'power2.inOut' })
          tl.to(wrapEl, { x:  0,    duration: 0.52, ease: 'power2.inOut' })
          tl.to(wrapEl, { y:  0,    duration: 0.22, ease: 'power2.inOut' })
          anims.push(tl.then())
        } else {
          anims.push(gsap.to(wrapEl, { x: 0, duration: 0.68, ease: 'power3.inOut' }).then())
        }
      }

      state.left.forEach((t, i)  => animateTerm(t, i, 'left'))
      state.right.forEach((t, i) => animateTerm(t, i, 'right'))
      // Restore any wrapper not touched by animateTerm
      allWraps(fresh).forEach(el => { el.style.visibility = '' })

      await Promise.all(anims)
      await wait(0.2)
      break
    }

    // ── Auto-Reorder (no eqText needed — operates on current state) ───────────
    case 'autoReorder': {
      if (!state) break
      let animated = false
      for (const side of ['left', 'right']) {
        for (const degree of [1, 0]) {
          const terms = state.findByDegree(degree, side)
          if (terms.length < 2) continue
          const arr       = side === 'left' ? state.left : state.right
          const positions = terms.map(t => arr.indexOf(t))
          const scattered = positions.some((p, i) => i > 0 && p !== positions[i - 1] + 1)
          if (!scattered) continue
          animated = true
          const others    = arr.filter(t => t.degree !== degree)
          const reordered = degree > 0 ? [...terms, ...others] : [...others, ...terms]
          // eslint-disable-next-line no-await-in-loop
          await runAction({ type: 'reorderEquation', [side]: reordered.map(t => t.id) }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
        }
      }
      if (!animated) throw new Error('Terms are already grouped.')
      break
    }

    // ── Combine ───────────────────────────────────────────────────────────────
    case 'combineTerms': {
      if (!state) break
      const { ids, result, firstPos } = action
      const side    = result?.side ?? 'left'
      const isLeft  = side === 'left'

      // Anchor: right side of = → leftmost; left side of = → rightmost
      const anchorIdx  = isLeft ? ids.length - 1 : 0
      const anchorId   = ids[anchorIdx]
      const anchorTerm = state.findById(anchorId)
      if (!anchorTerm) break

      // Secondaries closest-first
      const secIds = isLeft
        ? [...ids.slice(0, -1)].reverse()   // rightmost secondary first
        : ids.slice(1)                       // leftmost secondary first
      const secondaryTerms = secIds.map(id => state.findById(id)).filter(Boolean)

      const r          = refs()
      const anchorWrap = getWrap(r, anchorTerm.side, anchorTerm.cellIndex)
      const anchorInner = getCellInner(anchorWrap)
      const anchorRect  = anchorInner?.getBoundingClientRect() ?? null

      let runningValue = anchorTerm.value

      // ── Fly each secondary into anchor ────────────────────────────────────
      // Key: we do NOT animate the wrapper's width.  Animating width triggers a
      // full layout reflow every RAF tick — on a flex-end container this shifts
      // all preceding terms (like 2x) back-and-forth as the width changes.
      // Instead: opacity:0 the wrapper instantly (keeps its footprint in the
      // flex layout → zero reflow → zero bystander movement during the fly).
      // They ALL set off together. One at a time — fly, land, pop, next — made
      // 35+11+14+12 take three seconds of watching a queue; here every term is
      // in the air at once and only the ARRIVALS are staggered, so the total
      // still climbs 46 → 60 → 72 in order and it reads as a single motion.
      const FLIGHT  = 0.62   // how long each term is in the air
      const STAGGER = 0.22   // gap between arrivals — one tick of the total

      // Lift them all first: every rect is measured before any wrapper collapses,
      // so nothing shifts under a term that has not left yet.
      const flights = []
      for (const sec of secondaryTerms) {
        const secWrap  = getWrap(r, sec.side, sec.cellIndex)
        const secInner = getCellInner(secWrap)
        if (!secWrap || !secInner || !anchorRect) continue

        // Lock wrapper width and capture it BEFORE pulling the inner cell out.
        const lockedW = secWrap.offsetWidth
        gsap.set(secWrap, { width: lockedW, overflow: 'hidden' })

        // Kill the CSS termEnter animation before lifting — moving an element
        // to a new parent via appendChild restarts CSS animations, which snaps
        // secInner to opacity:0 scale(0.55) for one frame (the 'from' keyframe).
        secInner.style.animation = 'none'

        // Move real inner cell to body FIRST — while secWrap is still visible so
        // secInner never inherits opacity:0 from its parent.
        const secRect = liftToBody(secInner)
        // Lock font-size/padding so secInner keeps its size after leaving the CSS scope
        const _gs = _ghostStyles()
        if (_gs) Object.assign(secInner.style, _gs.cell)

        // The sign lives in the wrapper's own "+"/"−" span, and the wrapper is
        // about to be hidden — so in 23+3-4+2 a bare "4" flew across and it
        // looked like 4 was being ADDED. Carry the minus into the chip itself,
        // so what travels is "−4": the same thing the viewer must add.
        if (sec.sign === '-') {
          const signEl = secInner.querySelector('.term-coeff') ?? secInner
          const txt    = signEl.textContent ?? ''
          if (!txt.startsWith('−') && !txt.startsWith('-')) signEl.textContent = `−${txt}`
        }

        // Now hide the empty wrapper — layout footprint unchanged
        gsap.set(secWrap, { opacity: 0 })

        flights.push({ sec, secInner, secRect })
      }

      const coeffEl = anchorInner?.querySelector('.term-coeff')
      const opEl    = anchorWrap?.querySelector('.term-op')
      // .term-cell permanently carries `animation: termEnter ... both`, and a
      // CSS animation outranks an inline style for the properties it controls
      // — including transform. Without clearing it the pop tween ran on
      // schedule and was overridden every frame, so the number just changed
      // with no pop at all. The secondaries already get this treatment before
      // they fly; the anchor needs it before it can be scaled.
      if (anchorInner) anchorInner.style.animation = 'none'

      await Promise.all(flights.map(({ sec, secInner, secRect }, i) => gsap.to(secInner, {
        x: anchorRect.left - secRect.left,
        y: anchorRect.top  - secRect.top,
        opacity: 0,
        duration: FLIGHT,
        delay: i * STAGGER,
        ease: 'power3.in',
        onComplete: () => {
          secInner.remove()
          // The total takes each term as it lands, in the order they were sent.
          runningValue += sec.value
          if (coeffEl) coeffEl.textContent = String(parseFloat(Math.abs(runningValue).toFixed(3)))
          if (opEl)    opEl.textContent = runningValue < 0 ? '−' : '+'
          // Same decisive pop as every other number-change in the equation
          // (sendToOtherSide's merge, divideBothSides) — one shared rhythm,
          // not a per-action variant. Short enough to finish before the next
          // term lands, so the pops read as separate beats.
          if (anchorInner) {
            gsap.to(anchorInner, { scale: 1.16, duration: 0.11, ease: 'back.out(2.5)', yoyo: true, repeat: 1 })
          }
        },
      }).then()))
      await wait(0.12)

      // ── Record bystander positions BEFORE removing anything from the DOM ──
      // Bystanders = terms not being combined.  After the commit their positions
      // change (collapsed invisible wrappers disappear); we FLIP them once,
      // smoothly in one direction only — never back-and-forth.
      const bystanderBefore = {}
      const currentRefs = refs()
      ;[...state.left, ...state.right].forEach(t => {
        if (ids.includes(t.id)) return
        const el = getWrap(currentRefs, t.side, t.cellIndex)
        if (el) bystanderBefore[t.id] = el.getBoundingClientRect()
      })

      // Hide anchor in place — keeps layout footprint, no reflow
      gsap.set(anchorWrap, { opacity: 0 })

      // ── Commit ───────────────────────────────────────────────────────────
      ids.forEach(id => state.remove(id))
      if (result) state.insertAt(new MathObject(result), side, firstPos ?? 0)

      flushSync(() => setState(state.snapshot()))

      // ── FLIP bystanders once + pop result in ─────────────────────────────
      const fresh2      = refs()
      const resultWrap  = findWrapById(fresh2, state, result?.id)
      const resultInner = getCellInner(resultWrap)
      const anims       = []

      // Bystanders: one smooth slide to their real final position
      ;[...state.left, ...state.right].forEach(t => {
        if (t.id === result?.id) return
        const b  = bystanderBefore[t.id]
        const el = getWrap(fresh2, t.side, t.cellIndex)
        if (!b || !el) return
        const nr = el.getBoundingClientRect()
        const dx = b.left - nr.left
        if (Math.abs(dx) < 1) return
        gsap.set(el, { x: dx })
        anims.push(gsap.to(el, { x: 0, duration: 0.35, ease: 'power3.out' }).then())
      })

      // Result: kill entry anim, fade in — no scale change so it doesn't look like the anchor shrank
      if (resultInner) {
        resultInner.style.animation = 'none'
        gsap.set(resultInner, { opacity: 0 })
        anims.push(
          gsap.to(resultInner, { opacity: 1, duration: 0.22 }).then()
        )
      }

      await Promise.all(anims)
      await wait(0.2)
      break
    }

    // ── Auto-Combine (no eqText needed — operates on current state) ───────────
    case 'autoCombine': {
      if (!state) break
      let animated = false

      // Fractions FIRST, and as fractions. The generic pass below adds terms by
      // their numeric value, which turns 18/3 + 2/3 into 6.667 — arithmetically
      // true and pedagogically useless in a lesson whose whole subject is the
      // fraction. Two fractions over the same denominator add by their
      // numerators and keep that denominator, which is the rule being taught.
      //
      // It plays as the ordinary combine does: the second flies into the first
      // and the two become one. A fade-out-fade-in would have said "these were
      // replaced" where the point is that they were ADDED.
      for (const side of ['left', 'right']) {
        const arr = side === 'left' ? state.left : state.right
        const isNumFrac = (t) => t.expr && t.expr.t === 'bin' && t.expr.op === '/' &&
                                 t.expr.a.t === 'num' && t.expr.b.t === 'num'
        const byDen = new Map()
        for (const t of arr) {
          if (!isNumFrac(t)) continue
          const d = t.expr.b.v
          if (!byDen.has(d)) byDen.set(d, [])
          byDen.get(d).push(t)
        }
        for (const [den, group] of byDen) {
          if (group.length < 2) continue
          animated = true
          const num = group.reduce((s, t) => s + (t.sign === '-' ? -1 : 1) * t.expr.a.v, 0)
          // The anchor is the one that STAYS PUT, and it is the term the others
          // travel toward — rightmost on the left side, leftmost on the right,
          // the same convention every other combine in this panel follows. It
          // reads as "these are being gathered into that one"; picking the first
          // term regardless made the survivor jump across the panel instead.
          group.sort((x, y) => x.cellIndex - y.cellIndex)
          const keep   = side === 'left' ? group[group.length - 1] : group[0]
          const others = group.filter(t => t !== keep)

          for (const t of others) {
            const anchor    = getWrap(refs(), keep.side, keep.cellIndex)
            const secondary = getWrap(refs(), t.side, t.cellIndex)
            if (!anchor || !secondary) continue
            // eslint-disable-next-line no-await-in-loop
            await flyInto(anchor, secondary)
          }
          const anchor = getWrap(refs(), keep.side, keep.cellIndex)

          // The anchor already shows the answer before React commits, so the
          // swap itself is never seen — same trick the ordinary combine uses.
          const numCell = anchor?.querySelector('.expr-fraction-row .term-cell')
          if (numCell) numCell.textContent = String(Math.abs(num))
          // The numerator is the ONLY thing that changes in this whole move —
          // 5 and 8 arrive and 13 is what is left. A 0.15s nudge was easy to
          // miss, so it lands the way every other fraction step lands: a real
          // pop out of nothing, same curve and same length, so the sum reads as
          // an arrival rather than a digit quietly swapping itself out.
          // eslint-disable-next-line no-await-in-loop
          if (numCell) {
            numCell.style.animation = 'none'
            // eslint-disable-next-line no-await-in-loop
            await gsap.fromTo(numCell, { scale: 1 },
              { scale: 1.22, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
          }

          for (const t of others) state.remove(t.id)
          keep.sign = num < 0 ? '-' : '+'
          keep.expr = {
            t: 'bin', id: crypto.randomUUID(), op: '/',
            a: { t: 'num', id: crypto.randomUUID(), v: Math.abs(num) },
            b: { t: 'num', id: crypto.randomUUID(), v: den },
          }
          // eslint-disable-next-line no-await-in-loop
          flushSync(() => setState(state.snapshot()))
          // React reuses the DOM nodes of the side it just re-rendered, and the
          // one that flew away still carried opacity:0 and width:0 from that
          // tween. Whichever node the surviving term lands on, it inherits them
          // and the answer is invisible. Wipe what the animation wrote.
          gsap.set(allWraps(refs()), { clearProps: 'opacity,width,paddingLeft,paddingRight,marginLeft,marginRight,x,y,transform,overflow,scale,boxShadow' })
          // The anchor kept the blue of the merge and the ring that marked it as
          // the landing spot; both belong to a move that is now finished.
          const merged = getWrap(refs(), keep.side, keep.cellIndex)
          if (merged) {
            // eslint-disable-next-line no-await-in-loop
            await gsap.to(merged, { boxShadow: '0 0 0 0px transparent', scale: 1, color: '', duration: 0.35, ease: 'power2.out' }).then()
          }
          // eslint-disable-next-line no-await-in-loop
          await wait(0.3)
        }
      }
      for (const side of ['left', 'right']) {
        for (const degree of [1, 0]) {
          // Exclude fraction terms — they can't be naively combined with plain constants
          // Expression terms are excluded for the same reason fraction terms are:
          // their "value" is the tree, not the coefficient. Adding 1/2 and 1/3 as
          // coefficients gave 1 + 1 = 2 — a wrong answer, silently.
          let terms = state.findByDegree(degree, side).filter(t => !t.isFraction && !t.symbolicLabel && !t.expr)
          if (terms.length < 2) continue
          animated = true
          const arr       = side === 'left' ? state.left : state.right
          const positions = terms.map(t => arr.indexOf(t))
          const scattered = positions.some((p, i) => i > 0 && p !== positions[i - 1] + 1)
          if (scattered) {
            const others    = arr.filter(t => t.degree !== degree || t.isFraction)
            const reordered = degree > 0 ? [...terms, ...others] : [...others, ...terms]
            // eslint-disable-next-line no-await-in-loop
            await runAction({ type: 'reorderEquation', [side]: reordered.map(t => t.id) }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
            terms = state.findByDegree(degree, side).filter(t => !t.isFraction && !t.symbolicLabel && !t.expr)
          }
          const freshArr    = side === 'left' ? state.left : state.right
          const combinedVal = terms.reduce((s, t) => s + t.value, 0)
          const newId       = crypto.randomUUID()
          const firstPos    = freshArr.indexOf(terms[0])
          // eslint-disable-next-line no-await-in-loop
          await runAction({ type: 'outlineDegree', degree, side, color: degree > 0 ? '#a855f7' : '#f97316' }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
          // eslint-disable-next-line no-await-in-loop
          await runAction({
            type: 'combineTerms',
            ids:  terms.map(t => t.id),
            firstPos,
            result: {
              id:          newId,
              sign:        combinedVal >= 0 ? '+' : '-',
              coefficient: Math.abs(combinedVal),
              variable:    degree > 0 ? terms[0].variable : null,
              degree,
              side,
            },
          }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
          // eslint-disable-next-line no-await-in-loop
          await runAction({ type: 'clearOutlines' }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
        }
      }
      if (!animated) throw new Error('No like terms to combine.')
      break
    }

    // ── Send to other side ────────────────────────────────────────────────────
    case 'sendToOtherSide': {
      if (!state) break
      const { id, resultId, combineWithIds = [], combinedVal } = action
      const term   = state.findById(id)
      if (!term) break

      const fromSide = term.side
      const toSide   = fromSide === 'left' ? 'right' : 'left'
      const r        = refs()
      const srcWrap  = getWrap(r, fromSide, term.cellIndex)
      const srcInner = getCellInner(srcWrap)
      if (!srcWrap || !srcInner) break

      // Resolve the combine anchors on the target side
      const combineTermObjs = combineWithIds
        .map(cid => state.findById(cid))
        .filter(Boolean)
      const lastAnchorTerm = combineTermObjs[combineTermObjs.length - 1] ?? null
      const lastAnchorWrap = lastAnchorTerm
        ? getWrap(r, toSide, lastAnchorTerm.cellIndex)
        : null

      // Insert position for the result (before any removals)
      const targetArr = toSide === 'left' ? state.left : state.right
      const firstAnchorTerm = combineTermObjs[0] ?? null
      const resultInsertIdx = firstAnchorTerm
        ? targetArr.indexOf(firstAnchorTerm)
        : targetArr.length

      const flippedSign = term.sign === '-' ? '+' : '-'

      // ── Rects ─────────────────────────────────────────────────────────────
      const srcWrapR    = srcWrap.getBoundingClientRect()
      const srcCellRect = srcInner.getBoundingClientRect()
      const srcCellCX   = srcCellRect.left + srcCellRect.width / 2

      let anchorR
      if (lastAnchorWrap) {
        anchorR = lastAnchorWrap.getBoundingClientRect()
      } else {
        // No existing term of the same degree to land on — center under
        // the terms actually on that side instead. .equation-side itself
        // is the wrong rect to center under: its side is flex-end/flex-
        // start aligned inside a container that's often wider than its
        // visible content (so the equals sign can stay centered), so the
        // CONTAINER's midpoint drifts toward whichever edge the terms are
        // pushed against — it does not track where the terms actually are.
        const sideWraps = ((toSide === 'left' ? r.left : r.right) ?? []).filter(Boolean)
        if (sideWraps.length > 0) {
          const rects = sideWraps.map(w => w.getBoundingClientRect())
          const left  = Math.min(...rects.map(rc => rc.left))
          const right = Math.max(...rects.map(rc => rc.right))
          const top    = Math.min(...rects.map(rc => rc.top))
          const bottom = Math.max(...rects.map(rc => rc.bottom))
          anchorR = { left, right, top, bottom, width: right - left, height: bottom - top }
        } else {
  const sideEl = document.querySelector(`.equation-side[data-side="${toSide}"]`)
          anchorR = sideEl?.getBoundingClientRect() ?? srcWrapR
        }
      }
      const lastAnchorInner = lastAnchorWrap ? getCellInner(lastAnchorWrap) : null
      const anchorCellRect  = lastAnchorInner ? lastAnchorInner.getBoundingClientRect() : anchorR
      const anchorCellCX    = anchorCellRect.left + anchorCellRect.width / 2

      // ── Phase 1: appear below (fade in + 20 px rise) ──────────────────────
      const BELOW = 14
      const RISE  = 20

      // Pin a temp ghost at (0,0) so getBoundingClientRect gives reliable absolute offsets.
      // _cellOff = distance from ghost wrap's left edge to the .term-cell's left edge.
      const _tmpG    = makeGhostForTerm(flippedSign, term)
      gsap.set(_tmpG, { top: 0, left: 0 })
      const _tmpCell = _tmpG.querySelector('.term-cell')
      const _tmpCR   = _tmpCell?.getBoundingClientRect()
      const _cellOff = _tmpCR ? _tmpCR.left : 0
      const _cellW   = _tmpCR ? _tmpCR.width : 40
      _tmpG.remove()

      // ghost left = targetCellCX - _cellOff - _cellW/2
      // → ghost.left + _cellOff + _cellW/2 = targetCellCX  (cell centered on target)
      const ghostA = makeGhostForTerm(flippedSign, term)
      const gaTop  = srcWrapR.bottom + BELOW
      gsap.set(ghostA, { left: srcCellCX - _cellOff - _cellW / 2, xPercent: 0, top: gaTop + RISE, opacity: 0 })

      const ghostB = makeGhostForTerm(flippedSign, term)
      const gbTop  = anchorR.bottom + BELOW
      gsap.set(ghostB, { left: anchorCellCX - _cellOff - _cellW / 2, xPercent: 0, top: gbTop + RISE, opacity: 0 })

      await Promise.all([
        gsap.to(ghostA, { opacity: 1, top: gaTop, duration: 0.36, ease: 'power2.out' }).then(),
        gsap.to(ghostB, { opacity: 1, top: gbTop, duration: 0.36, ease: 'power2.out' }).then(),
      ])

      // ── Phase 2: pause ────────────────────────────────────────────────────
      await wait(0.9)

      // ── Phase 3: rise into the equation row, dissolving as they travel —
      // each ghost fades out WHILE it moves up, so it visibly melts into
      // the term instead of arriving solid and only then fading.
      const srcRowTop    = srcWrapR.top
      const anchorRowTop = lastAnchorWrap ? anchorR.top : srcRowTop

      // ── Phase 4: source cancels down to a held "0", target merges with a
      // decisive pop — nothing here disappears or swaps instantly. Both
      // sides land on their resting values FIRST; only then (4c) does the
      // now-empty source term fade away and the gap close.
      const beforePos = {}
      const preRefs   = refs()
      ;[...state.left, ...state.right].forEach(t => {
        const el = getWrap(preRefs, t.side, t.cellIndex)
        if (el) beforePos[t.id] = el.getBoundingClientRect()
      })

      // A standalone fraction (e.g. an existing "2/3") can't be reused as
      // the merge anchor — it's a stacked num/bar/den block, a completely
      // different DOM shape than a plain number box, so there's no sane
      // way to "become" the merged value in place. Treat it as unreusable
      // (like term.isFraction already does for the classic fraction type)
      // so it gets a clean fade instead of a garbled partial text-write,
      // and the merged result pops in fresh — same as when there's no
      // existing target term at all.
      const anchorIsExprFraction = lastAnchorTerm?.expr != null
      const anchorTerm    = (term.isFraction || anchorIsExprFraction) ? null : lastAnchorTerm
      const extraAnchors  = anchorTerm ? combineTermObjs.slice(0, -1) : combineTermObjs
      const anchorWrapEl  = anchorTerm ? getWrap(preRefs, anchorTerm.side, anchorTerm.cellIndex) : null
      const anchorInnerEl = anchorWrapEl ? getCellInner(anchorWrapEl) : null
      let runningValue    = anchorTerm ? anchorTerm.value : 0

      srcInner.style.animation = 'none'
      if (anchorInnerEl) anchorInnerEl.style.animation = 'none'

      // 4a. Source: ghostA rises into the row while dissolving, cancelling
      // the source term down to 0.
      const cancelSource = async () => {
        await gsap.to(ghostA, { top: srcRowTop, opacity: 0, scale: 0.7, duration: 0.55, ease: 'power2.in' }).then()
        ghostA.remove()
        setCellValue(srcInner, 0, term.variable, term.degree)
        await gsap.to(srcInner, { scale: 1.2, duration: 0.15, ease: 'back.out(2.5)', yoyo: true, repeat: 1 }).then()
      }

      // 4b. Target: absorb any pre-existing terms of the same degree into the
      // last one first (rare — usually there's at most one already there),
      // each with its own live update + pop, then merge the incoming ghost.
      // Runs in step with 4a (Promise.all below) so both sides of the
      // equation change at once, not one after the other.
      let finalVal = 0
      const mergeTarget = async () => {
        for (const extra of extraAnchors) {
          const extraWrap  = getWrap(preRefs, extra.side, extra.cellIndex)
          const extraInner = getCellInner(extraWrap)
          if (!extraWrap || !extraInner || !anchorInnerEl) continue
          extraInner.style.animation = 'none'
          const lockedW = extraWrap.offsetWidth
          gsap.set(extraWrap, { width: lockedW, overflow: 'hidden' })
          const liftedRect = liftToBody(extraInner)
          const gs = _ghostStyles()
          if (gs) Object.assign(extraInner.style, gs.cell)
          gsap.set(extraWrap, { opacity: 0 })
          const anchorRect = anchorInnerEl.getBoundingClientRect()
          // eslint-disable-next-line no-await-in-loop
          await gsap.to(extraInner, {
            x: anchorRect.left - liftedRect.left, y: anchorRect.top - liftedRect.top,
            opacity: 0, duration: 0.45, ease: 'power3.in',
          }).then()
          extraInner.remove()
          runningValue += extra.value
          setCellValue(anchorInnerEl, Math.abs(runningValue), anchorTerm.variable, anchorTerm.degree)
          const exOpEl = anchorWrapEl.querySelector('.term-op')
          if (exOpEl) exOpEl.textContent = runningValue < 0 ? '−' : '+'
          // eslint-disable-next-line no-await-in-loop
          await gsap.to(anchorInnerEl, { scale: 1.15, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
          // eslint-disable-next-line no-await-in-loop
          await wait(0.1)
        }

        finalVal = combinedVal ?? (runningValue + (-term.value))

        if (anchorInnerEl) {
          await gsap.to(ghostB, { top: anchorRowTop, opacity: 0, scale: 0.7, duration: 0.55, ease: 'power2.in' }).then()
          ghostB.remove()
          setCellValue(anchorInnerEl, Math.abs(finalVal), anchorTerm.variable, anchorTerm.degree)
          const opEl = anchorWrapEl.querySelector('.term-op')
          if (opEl) opEl.textContent = finalVal < 0 ? '−' : '+'
          await gsap.to(anchorInnerEl, { scale: 1.2, duration: 0.15, ease: 'back.out(2.5)', yoyo: true, repeat: 1 }).then()
        } else if (anchorIsExprFraction && lastAnchorTerm) {
          // The existing target was a fraction — fade the whole stacked
          // block away (never a partial text-write into it) at the same
          // time the incoming ghost fades; the merged result pops in on
          // its own once committed, exactly like the "no existing target"
          // case just below.
          const fracWrap  = getWrap(preRefs, lastAnchorTerm.side, lastAnchorTerm.cellIndex)
          const fracInner = fracWrap ? getCellInner(fracWrap) : null
          if (fracInner) fracInner.style.animation = 'none'
          await Promise.all([
            gsap.to(ghostB, { top: anchorRowTop, opacity: 0, duration: 0.5, ease: 'power2.in' }).then(),
            fracInner ? gsap.to(fracInner, { opacity: 0, duration: 0.4, ease: 'power2.in' }).then() : Promise.resolve(),
          ])
          ghostB.remove()
        } else {
          await gsap.to(ghostB, { top: anchorRowTop, opacity: 0, duration: 0.5, ease: 'power2.in' }).then()
          ghostB.remove()
        }
      }

      // Both sides cancel/merge together, then hold once, together.
      await Promise.all([cancelSource(), mergeTarget()])
      await wait(0.45)

      // 4c. Both sides now visually rest at their final values — only now
      // does the spent source term (its "+0") fade away. If the target
      // anchor also cancelled to 0, it fades away the same way, together.
      const srcOpEl     = srcWrap.querySelector('.term-op')
      const fadeEls     = [srcOpEl, srcInner].filter(Boolean)
      const anchorGone  = !term.isFraction && anchorInnerEl && Math.abs(finalVal) <= 1e-9
      if (anchorGone) fadeEls.push(anchorWrapEl.querySelector('.term-op'), anchorInnerEl)
      await gsap.to(fadeEls.filter(Boolean), { opacity: 0, duration: 0.3, ease: 'power2.in' }).then()

      // ── Phase 5: commit + close the gap ────────────────────────────────
      state.remove(id)
      extraAnchors.forEach(t => state.remove(t.id))

      let survivingId = null
      if (term.isFraction) {
        state.insertAt(new MathObject({
          id:              resultId,
          sign:            flippedSign,
          isFraction:      true,
          numeratorTerms:  term.numeratorTerms,
          denominatorTerms: term.denominatorTerms,
          coefficient: 1, variable: null, degree: term.degree,
        }), toSide, resultInsertIdx)
      } else if (anchorTerm) {
        survivingId = anchorTerm.id
        if (Math.abs(finalVal) > 1e-9) {
          anchorTerm.sign        = finalVal >= 0 ? '+' : '-'
          anchorTerm.coefficient = Math.abs(finalVal)
        } else {
          state.remove(anchorTerm.id)
        }
      } else if (Math.abs(finalVal) > 1e-9) {
        state.insertAt(new MathObject({
          id:          resultId,
          sign:        finalVal >= 0 ? '+' : '-',
          coefficient: Math.abs(finalVal),
          variable:    action.variable  ?? term.variable,
          degree:      action.degree    ?? term.degree,
        }), toSide, resultInsertIdx)
      }

      flushSync(() => setState(state.snapshot()))

      const fresh = refs()
      const anims = []

      // A reused anchor already shows the right value in the right spot —
      // nothing to fade. Only a freshly-inserted term (no prior anchor to
      // merge into) needs to pop in from nothing.
      let newInner = null
      if (!survivingId) {
        const newWrap = findWrapById(fresh, state, resultId)
        newInner = getCellInner(newWrap)
        if (newInner) {
          newInner.style.animation = 'none'
          gsap.set(newInner, { opacity: 0, scale: 0.5 })
        }
      }

      // FLIP all remaining terms on BOTH sides from their before-positions
      ;[...state.left, ...state.right].forEach(t => {
        if (newInner && t.id === resultId) return   // result pops in separately
        const b  = beforePos[t.id]
        const el = getWrap(fresh, t.side, t.cellIndex)
        if (!b || !el) return
        const nr = el.getBoundingClientRect()
        const dx = b.left - nr.left
        if (Math.abs(dx) < 1) return
        gsap.set(el, { x: dx })
        anims.push(gsap.to(el, { x: 0, duration: 0.38, ease: 'power3.out' }).then())
      })

      // Freshly-inserted result pops in
      if (newInner) {
        anims.push(gsap.to(newInner, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }).then())
      }

      await Promise.all(anims)
      await wait(0.2)
      break
    }

    // ── Auto Send To Other Side (no eqText — operates on current state) ───────
    case 'autoSendToOtherSide': {
      if (!state) break
      const { termIndex } = action
      const allTerms = [...state.left, ...state.right]
      let term = (termIndex != null && termIndex >= 0) ? (allTerms[termIndex] ?? null) : null
      // Fallback: auto-pick first moveable term
      if (!term) term = state.findByDegree(1, 'right')[0] ?? state.findByDegree(0, 'left')[0]
      if (!term) throw new Error('No moveable term found.')
      const fromSide       = term.side
      const toSide         = fromSide === 'left' ? 'right' : 'left'
      const resultId       = crypto.randomUUID()
      const targetArr      = toSide === 'left' ? state.left : state.right
      // Fraction terms can't be numerically combined — always append separately
      const targetSame     = term.isFraction ? [] : state.findByDegree(term.degree, toSide).filter(t => !t.isFraction)
      const combineWithIds = targetSame.map(t => t.id)
      const combinedVal    = term.isFraction ? null : (targetSame.reduce((s, t) => s + t.value, 0) + (-term.value))
      const firstPos       = targetSame.length > 0 ? targetArr.indexOf(targetSame[0]) : targetArr.length
      await runAction({ type: 'sendToOtherSide', id: term.id, resultId, combineWithIds, combinedVal, variable: term.variable, degree: term.degree }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
      break
    }

    // ── Divide both sides ─────────────────────────────────────────────────────
    case 'divideBothSides': {
      if (!state) break
      const { divisor } = action

      // One bracket-line + label per SIDE (not per term) — the line still
      // spans that whole side's terms (same "divide everything under here"
      // reading as before), but the divisor label sits at the side's own
      // OUTER edge (far left of the left side, far right of the right
      // side) instead of centered under each individual wrap — reads as
      // "apply this to the whole side", the same way sendToOtherSide reads
      // as "this term crosses the equals sign", not a cluster of repeated
      // labels under every term. A side with no terms (fully cancelled out)
      // just gets no overlay at all rather than guessing a position.
      const sideBox = wraps => {
        const live = wraps.filter(Boolean)
        if (!live.length) return null
        const rects = live.map(w => w.getBoundingClientRect())
        return {
          top:    Math.min(...rects.map(r => r.top)),
          bottom: Math.max(...rects.map(r => r.bottom)),
          left:   Math.min(...rects.map(r => r.left)),
          right:  Math.max(...rects.map(r => r.right)),
        }
      }
      const cellRefsNow = refs()
      const leftBox  = sideBox(cellRefsNow.left  ?? [])
      const rightBox = sideBox(cellRefsNow.right ?? [])

      const makeOverlay = (box, edge) => {
        if (!box) return null
        const fs = Math.max(Math.round((box.bottom - box.top) * 0.52), 14)

        const line = document.createElement('div')
        line.className = '_anim-overlay'
        line.style.cssText = `
          position:fixed;left:${box.left-3}px;top:${box.bottom+6}px;
          width:${box.right - box.left + 6}px;height:2.5px;
          background:#60a5fa;
          border-radius:2px;transform-origin:center;transform:scaleX(0);
        `
        document.body.appendChild(line)

        // Centered under the side's own content — NOT the outer edge. For
        // the overwhelmingly common case (one term per side, e.g. "2x = 4")
        // an edge-anchored label reads as misplaced, floating off to the
        // side instead of under the thing it divides. Still one tag per
        // SIDE (not one per individual term) so a multi-term side doesn't
        // get the same divisor repeated under every term.
        const lbl = document.createElement('div')
        lbl.className = '_anim-overlay'
        lbl.textContent = String(divisor)
        lbl.style.cssText = `
          position:fixed;
          left:${(box.left + box.right) / 2}px;top:${box.bottom + 14}px;
          transform:translateX(-50%) translateY(10px);
          font-family:'Fira Code','Cascadia Code',ui-monospace,monospace;
          font-size:${fs}px;font-weight:600;color:#60a5fa;
          opacity:0;white-space:nowrap;
        `
        document.body.appendChild(lbl)
        return { line, lbl }
      }

      const overlays = [makeOverlay(leftBox, 'left'), makeOverlay(rightBox, 'right')].filter(Boolean)

      await gsap.to(overlays.map(o => o.line), { scaleX: 1, duration: 0.55, ease: 'power2.out' }).then()
      await gsap.to(overlays.map(o => o.lbl),  { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' }).then()
      await wait(0.75)

      // Fade the divisor overlay away before the values themselves change.
      await gsap.to(
        [...overlays.map(o => o.line), ...overlays.map(o => o.lbl)],
        { opacity: 0, duration: 0.3 }
      ).then()
      overlays.forEach(o => { o.line.remove(); o.lbl.remove() })

      // Same treatment as every other number-change in the equation: swap
      // the text IN PLACE and pop — never fade a term out and pop a
      // different element in behind it.
      const preRefs = refs()
      const cells = [...state.left, ...state.right].map(t => {
        const wrapEl = getWrap(preRefs, t.side, t.cellIndex)
        const inner  = getCellInner(wrapEl)
        if (inner) inner.style.animation = 'none'
        return { t, wrapEl, inner }
      })

      cells.forEach(({ t, wrapEl, inner }) => {
        if (!inner) return
        const nv = t.value / divisor
        const coeffEl = inner.querySelector('.term-coeff')
        // A variable term whose coefficient lands on 1 shows no coefficient
        // at all (just "x", never "1x") — match that immediately instead of
        // flashing "1x" for a frame before the real commit strips it.
        const hideCoeff = t.variable && Math.abs(Math.abs(nv) - 1) < 1e-9 && !t.symbolicLabel
        if (coeffEl) coeffEl.textContent = hideCoeff ? '' : String(parseFloat(Math.abs(nv).toFixed(3)))
        const opEl = wrapEl?.querySelector('.term-op')
        if (opEl) opEl.textContent = nv < 0 ? '−' : '+'
      })

      await gsap.to(cells.map(c => c.inner).filter(Boolean), {
        scale: 1.2, duration: 0.15, ease: 'back.out(2.5)', yoyo: true, repeat: 1,
      }).then()

      ;[...state.left, ...state.right].forEach(t => {
        const nv = t.value / divisor
        t.sign = nv >= 0 ? '+' : '-'
        t.coefficient = Math.abs(nv)
      })
      flushSync(() => setState(state.snapshot()))

      await wait(0.35)
      break
    }

    // ── Multiply both sides (clearing a unit-fraction coefficient, e.g.
    // x/2 = 4 → ×2 → x = 8) — same rhythm as divideBothSides, just no
    // division-bracket line: a floating "×N" label instead, since there's
    // no natural "multiplication bracket" equivalent to draw.
    case 'multiplyBothSides': {
      if (!state) break
      const { multiplier } = action

      // Same per-SIDE placement as divideBothSides — one "×N" centered
      // under each side's own content instead of one repeated under every
      // individual term.
      const sideBox = wraps => {
        const live = wraps.filter(Boolean)
        if (!live.length) return null
        const rects = live.map(w => w.getBoundingClientRect())
        return {
          top:    Math.min(...rects.map(r => r.top)),
          bottom: Math.max(...rects.map(r => r.bottom)),
          left:   Math.min(...rects.map(r => r.left)),
          right:  Math.max(...rects.map(r => r.right)),
        }
      }
      const cellRefsNow = refs()
      const leftBox  = sideBox(cellRefsNow.left  ?? [])
      const rightBox = sideBox(cellRefsNow.right ?? [])

      const makeOverlay = (box, edge) => {
        if (!box) return null
        const fs = Math.max(Math.round((box.bottom - box.top) * 0.52), 14)

        const lbl = document.createElement('div')
        lbl.className = '_anim-overlay'
        lbl.textContent = `×${multiplier}`
        lbl.style.cssText = `
          position:fixed;
          left:${(box.left + box.right) / 2}px;top:${box.bottom + 14}px;
          transform:translateX(-50%) translateY(10px) scale(0.6);
          font-family:'Fira Code','Cascadia Code',ui-monospace,monospace;
          font-size:${fs}px;font-weight:600;color:#60a5fa;
          opacity:0;white-space:nowrap;
        `
        document.body.appendChild(lbl)
        return { lbl }
      }

      const overlays = [makeOverlay(leftBox, 'left'), makeOverlay(rightBox, 'right')].filter(Boolean)

      await gsap.to(overlays.map(o => o.lbl), { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }).then()
      await wait(0.75)

      // Fade the multiplier overlay away before the values themselves change.
      await gsap.to(overlays.map(o => o.lbl), { opacity: 0, duration: 0.3 }).then()
      overlays.forEach(o => { o.lbl.remove() })

      // Same treatment as every other number-change in the equation: swap
      // the text IN PLACE and pop — never fade a term out and pop a
      // different element in behind it.
      const preRefs = refs()
      const cells = [...state.left, ...state.right].map(t => {
        const wrapEl = getWrap(preRefs, t.side, t.cellIndex)
        const inner  = getCellInner(wrapEl)
        if (inner) inner.style.animation = 'none'
        return { t, wrapEl, inner }
      })

      cells.forEach(({ t, wrapEl, inner }) => {
        if (!inner) return
        const nv = t.value * multiplier
        const coeffEl = inner.querySelector('.term-coeff')
        const hideCoeff = t.variable && Math.abs(Math.abs(nv) - 1) < 1e-9 && !t.symbolicLabel
        if (coeffEl) coeffEl.textContent = hideCoeff ? '' : String(parseFloat(Math.abs(nv).toFixed(3)))
        const opEl = wrapEl?.querySelector('.term-op')
        if (opEl) opEl.textContent = nv < 0 ? '−' : '+'
      })

      await gsap.to(cells.map(c => c.inner).filter(Boolean), {
        scale: 1.2, duration: 0.15, ease: 'back.out(2.5)', yoyo: true, repeat: 1,
      }).then()

      ;[...state.left, ...state.right].forEach(t => {
        const nv = t.value * multiplier
        t.sign = nv >= 0 ? '+' : '-'
        t.coefficient = Math.abs(nv)
      })
      flushSync(() => setState(state.snapshot()))

      await wait(0.35)
      break
    }

    // ── Replace Variable ──────────────────────────────────────────────────────
    // All replacements animate AT ONCE: collect every element, fade them out
    // together, update state in one commit, then pop the new values in together.
    case 'replaceVariable': {
      if (!state) break

      // ── Expression replacements ("y = -x+3") ────────────────────────────
      // A number swaps into the term it labels. An expression cannot: 3y with
      // y = -x+3 is 3(-x+3), a different KIND of term. Build that term with the
      // same parser the rest of the engine uses — synthesising one by hand is
      // how term shapes drift apart — then splice it in where the label was.
      // A single-term expression needs no parentheses (3y with y = 2x is 6x),
      // which is the one case that folds into the existing term instead.
      // Which terms does "y" name? A bare |y| parses as a symbolic label, but
      // 3|y| parses as an ordinary 3y term — the pipes only marked it
      // replaceable. Matching symbolicLabel alone meant "replace y" silently
      // did nothing on "-6x+3|y|=12", for expressions AND for plain numbers.
      const namedBy = (label) => (t) =>
        !t.expr && (t.symbolicLabel === label || t.variable === label)

      const exprPlans = (action.replacements ?? []).filter(r => r.exprText)
      let exprChanged = false

      // Fade the labels being replaced before anything moves, so the swap reads
      // as one motion rather than the new terms appearing over the old.
      if (exprPlans.length) {
        const labels = new Set(exprPlans.map(r => r.label))
        const outEls = [...state.left, ...state.right]
          .filter(t => [...labels].some(l => namedBy(l)(t)))
          .map(t => getWrap(refs(), t.side, t.cellIndex))
          .filter(Boolean)
        if (outEls.length) {
          outEls.forEach(el => { el.style.animation = 'none' })
          await gsap.to(outEls, { opacity: 0, scale: 0.7, duration: 0.28, ease: 'power2.in' }).then()
        }
      }

      for (const { label, exprText } of exprPlans) {
        // Squared and higher labels would need (…)² around the group, which the
        // paren term cannot carry — left alone rather than substituted wrongly.
        const targets = [...state.left, ...state.right]
          .filter(t => namedBy(label)(t) && (t.degree ?? 0) <= 1)
        if (!targets.length) continue

        let built
        try { built = parseRichEquation(`1(${exprText})=0`).left[0] } catch { built = null }
        if (!built?.isParenGroup || !built.innerTerms?.length) {
          console.warn(`replaceVariable: could not read "${exprText}" as an expression`)
          continue
        }

        for (const t of targets) {
          const coeff = Math.abs(t.coefficient ?? 1)
          const outerNeg = t.sign === '-'
          const arr = t.side === 'left' ? state.left : state.right
          const idx = arr.findIndex(x => x.id === t.id)
          if (idx < 0) continue

          let replacement
          if (built.innerTerms.length === 1) {
            // One term — multiply it out, no parentheses.
            const inner = built.innerTerms[0]
            const neg   = outerNeg !== (inner.sign === '-')
            replacement = new MathObject({
              sign: neg ? '-' : '+',
              coefficient: coeff * Math.abs(inner.coefficient ?? 1),
              variable: inner.variable ?? null,
              degree: inner.variable ? (inner.degree ?? 1) : 0,
              color: t.color ?? null,
            })
          } else {
            const group = parseRichEquation(`${coeff}(${exprText})=0`).left[0]
            if (!group?.isParenGroup) continue
            replacement = new MathObject({ ...group, sign: outerNeg ? '-' : '+', color: t.color ?? null })
          }
          state.remove(t.id)
          state.insertAt(replacement, t.side, idx)
          exprChanged = true
        }
      }

      if (exprChanged) {
        // The new cells carry the standard term mount animation, so they pop in
        // on their own once React has them.
        flushSync(() => setState(state.snapshot()))
        await wait(0.45)
      }

      // Resolve each replacement against the current state — either a plain
      // symbolic term (t.symbolicLabel === label) or every leaf holding this
      // label inside a term's expr tree (see exprTree.js) — a label can
      // appear more than once in one tree, e.g. "2*|r| + |r|^2".
      const plans = (action.replacements ?? []).filter(r => !r.exprText).map(({ label, value }) => {
        const all   = [...state.left, ...state.right]
        const terms = all.filter(namedBy(label))
        const exprHits = all
          .filter(t => t.expr && collectLabels(t.expr).has(label))
          .map(t => ({ t, nodeIds: collectLabelNodeIds(t.expr, label) }))
        return { label, value, terms, exprHits }
      }).filter(p => p.terms.length || p.exprHits.length)

      if (!plans.length) break

      const collect = (cellRefs) => {
        const els = []
        for (const p of plans) {
          for (const t of p.terms) {
            const el = getWrap(cellRefs, t.side, t.cellIndex)?.querySelector('.term-coeff')
            if (el) els.push(el)
          }
          for (const { t, nodeIds } of p.exprHits) {
            const wrap = getWrap(cellRefs, t.side, t.cellIndex)
            for (const nodeId of nodeIds) {
              const el = wrap?.querySelector(`[data-expr-id="${nodeId}"]`)
              if (el) els.push(el)
            }
          }
        }
        return els
      }

      // Fade out every targeted element together
      const outEls = collect(refs())
      if (outEls.length) {
        // .term-cell's own base CSS rule permanently carries
        // `animation: termEnter ... both` (its mount pop-in) — a CSS
        // animation always wins the cascade over an inline style for the
        // properties it controls, for as long as it's assigned, even once
        // it's finished and just holding its final frame via fill-mode.
        // Fading a bare .term-coeff span (an expr-less symbolic term, e.g.
        // page 1's "a") never hit this because the span itself carries no
        // such animation — only a whole .term-cell (what an expr-tree leaf
        // renders as, e.g. page 2's "r"/"h") does. Without clearing it here,
        // gsap's opacity tween below runs on schedule but is invisibly
        // overridden every frame, so the value appears to swap instantly.
        outEls.forEach(el => { el.style.animation = 'none' })
        await gsap.to(outEls, { opacity: 0, scale: 0.7, duration: 0.3, ease: 'power2.in' }).then()
      }

      // Commit every replacement in a single state update.
      // The existing sign is the OPERATOR (e.g. the "−" in "y₂ − y₁") — keep it,
      // only flipping when the substituted value itself is negative.
      for (const p of plans) {
        p.terms.forEach(t => {
          // A labelled COEFFICIENT (|b|) is replaced outright; a labelled
          // VARIABLE (the y in 3y) is multiplied out and disappears — 3y with
          // y = 2 is 6, not 2. The exponent comes along: 3y² with y = 2 is 12.
          const isVar  = t.variable === p.label
          const deg    = isVar ? (t.degree ?? 1) : 1
          const signed = (t.sign === '-' ? -1 : 1) * Math.abs(t.coefficient ?? 1) * Math.pow(p.value, deg)
          t.sign = signed < 0 ? '-' : '+'
          t.coefficient = Math.abs(signed)
          if (isVar) { t.variable = null; t.degree = 0; t.varParts = null }
          t.symbolicLabel = undefined
        })
        p.exprHits.forEach(({ t }) => substituteLabel(t.expr, p.label, p.value))
      }
      flushSync(() => setState(state.snapshot()))
      await wait(0.08)

      // Pop the new values in together
      const inEls = collect(refs())
      if (inEls.length) {
        inEls.forEach(el => { el.style.animation = 'none' })
        gsap.set(inEls, { opacity: 0, scale: 0.5 })
        await gsap.to(inEls, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.5)' }).then()
      }
      await wait(0.18)
      break
    }

    // ── Square root both sides ────────────────────────────────────────────────
    case 'racineDesBords': {
      if (!state) break

      const squaredTerm = [...state.left, ...state.right].find(t => t.degree === 2 && t.variable)
      if (!squaredTerm) break
      // Constant can be on either side — whichever side doesn't have the squared term
      const constSide = squaredTerm.side === 'left' ? 'right' : 'left'
      const rhsConst  = (constSide === 'right' ? state.right : state.left).find(t => !t.variable)
                     ?? (squaredTerm.side === 'right' ? state.right : state.left).find(t => !t.variable)
      if (!rhsConst) break

      const r0      = refs()
      const sqWrap  = getWrap(r0, squaredTerm.side, squaredTerm.cellIndex)
      const rhsWrap = getWrap(r0, rhsConst.side, rhsConst.cellIndex)

      function makeSqrtOverlay(wrapEl) {
        if (!wrapEl) return null
        const rect = wrapEl.getBoundingClientRect()
        const div  = document.createElement('div')
        div.className = '_anim-overlay'
        div.textContent = '√'
        div.style.cssText = [
          `position:fixed`,
          `left:${rect.left - 22}px`,
          `top:${rect.top - 2}px`,
          `font-size:${Math.round(rect.height * 1.05)}px`,
          `font-weight:700`,
          `color:#a855f7`,
          `opacity:0`,
          `line-height:1`,
          `font-family:'Fira Code','Cascadia Code',monospace`,
          `pointer-events:none`,
          `z-index:9999`,
        ].join(';')
        document.body.appendChild(div)
        return div
      }

      const sqrtLeft  = makeSqrtOverlay(sqWrap)
      const sqrtRight = makeSqrtOverlay(rhsWrap)
      const sqrtEls   = [sqrtLeft, sqrtRight].filter(Boolean)

      await gsap.to(sqrtEls, { opacity: 1, duration: 0.35, ease: 'back.out(1.5)', stagger: 0.1 }).then()
      await wait(0.7)

      // Fade out the exponent ² on the squared term
      const expEl = sqWrap?.querySelector('.term-exp')
      if (expEl) {
        await gsap.to(expEl, { opacity: 0, y: -8, duration: 0.35, ease: 'power2.in' }).then()
      }

      // Update: degree 2 → 1; RHS constant → √(value)
      squaredTerm.degree     = 1
      squaredTerm.showDegree = false
      const rootVal = Math.sqrt(rhsConst.coefficient)
      rhsConst.coefficient = parseFloat(rootVal.toFixed(3))

      flushSync(() => setState(state.snapshot()))
      await wait(0.35)

      await gsap.to(sqrtEls, { opacity: 0, duration: 0.3 }).then()
      sqrtEls.forEach(el => el.remove())
      break
    }

    // ── Fade exponent to new degree ───────────────────────────────────────────
    case 'disparitionExposant': {
      if (!state) break
      const { termId, newDegree } = action
      const term = state.findById(termId)
      if (!term || !term.variable) break

      const r0     = refs()
      const wrapEl = getWrap(r0, term.side, term.cellIndex)

      // Fade out current exponent (if visible)
      const oldExpEl = wrapEl?.querySelector('.term-exp')
      if (oldExpEl) {
        await gsap.to(oldExpEl, { opacity: 0, y: -6, duration: 0.32, ease: 'power2.in' }).then()
      }

      // Update term: showDegree=true for degree 0 or negative
      term.degree     = newDegree
      term.showDegree = (newDegree === 0 || newDegree < 0)

      flushSync(() => setState(state.snapshot()))
      await wait(0.08)

      // Pop-in new exponent if it will be shown
      const willShow = newDegree >= 2 || newDegree < 0 || newDegree === 0
      if (willShow) {
        const r2      = refs()
        const newWrap = getWrap(r2, term.side, term.cellIndex)
        const newExp  = newWrap?.querySelector('.term-exp')
        if (newExp) {
          gsap.set(newExp, { opacity: 0, y: -6 })
          await gsap.to(newExp, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' }).then()
        }
      }
      await wait(0.22)
      break
    }

    // ── Geometry: show angles ─────────────────────────────────────────────────
    case 'ggb-show-angles': {
      await geoEngine.showAngles(geoRef, action.id, action.color)
      break
    }

    // ── Geometry: show arrow ──────────────────────────────────────────────────
    case 'ggb-show-arrow': {
      const arrowOpts = { ...action.opts ?? {}, color: resolveColor(action.opts?.color) }
      await geoEngine.showArrow(geoRef, action.shapeId, action.arrowId, action.from, action.to, arrowOpts)
      break
    }

    case 'ggb-remove-arrow': {
      await geoEngine.removeArrow(geoRef, action.arrowId)
      break
    }

    // ── Geometry: highlight edge ──────────────────────────────────────────────
    case 'ggb-highlight-edge': {
      await geoEngine.highlightEdge(geoRef, action.shapeId, action.edgeIndex, resolveColor(action.color), action.opts ?? {})
      break
    }

    // ── Geometry: highlight angle ─────────────────────────────────────────────
    case 'ggb-highlight-angle': {
      await geoEngine.highlightAngle(geoRef, action.shapeId, action.vertexIndex, resolveColor(action.color))
      break
    }

    // ── Table actions (SVG grid) ──────────────────────────────────────────────

    case 'table-create-grid': {
      await tableEngine.createGrid(tableRef, action.id, action.cols, action.rows, action.values ?? [], action.opts ?? {})
      break
    }

    case 'table-erase-grid': {
      await tableEngine.eraseGrid(tableRef, action.id)
      break
    }

    case 'table-add-column': {
      await tableEngine.addColumn(tableRef, action.id, action.values ?? [])
      break
    }

    case 'table-remove-column': {
      await tableEngine.removeColumn(tableRef, action.id, action.colIndex ?? -1)
      break
    }

    case 'table-add-row': {
      await tableEngine.addRow(tableRef, action.id, action.values ?? [])
      break
    }

    case 'table-remove-row': {
      await tableEngine.removeRow(tableRef, action.id, action.rowIndex ?? -1)
      break
    }

    case 'table-change-value': {
      await tableEngine.changeValue(tableRef, action.id, action.col, action.row, action.value)
      break
    }

    case 'table-change-values': {
      await tableEngine.changeValues(tableRef, action.id, action.changes ?? [])
      break
    }

    case 'table-highlight-row': {
      await tableEngine.highlightRow(tableRef, action.id, action.rowIndex, action.color)
      break
    }

    case 'table-clear-row-highlight': {
      await tableEngine.clearRowHighlight(tableRef, action.id)
      break
    }

    case 'table-clear': {
      tableEngine.clearAll(tableRef)
      await wait(0.2)
      break
    }

    // ── Comment actions ───────────────────────────────────────────────────────

    case 'add-comment': {
      if (!setComments) break
      const { id, text, color, title = null } = action
      let target = action.target
      if (target?.type === 'graph') {
        if (target.mode === 'func') {
          // The id may name a SEGMENT instead of a curve — anchor on it (its
          // midpoint unless the given x really lands on it) rather than making
          // the author hand-type coordinates that drift the moment the
          // segment moves.
          const seg = graphEngine.segmentAnchor(target.funcId)
          if (seg) {
            target = { ...target, x: seg.x, y: seg.y }
          } else {
            // y = f(x) for the named function (a blank x reads as 0, as before)
            const fx = Number(target.x) || 0
            const y  = graphEngine.evalFunction(target.funcId, fx)
            if (y !== null) target = { ...target, x: fx, y }
          }
        } else if (target.mode === 'area') {
          // y = 40% of f(x) — places dot inside the shaded region
          const fy = graphEngine.evalFunction(target.funcId, target.x)
          if (fy !== null) target = { ...target, y: fy * 0.4 }
        }
      }
      setComments(prev => {
        const without = prev.filter(c => c.id !== id)
        return [...without, { id, text, title, color: resolveColor(color) ?? '#60a5fa', target }]
      })
      await wait(0.15)
      break
    }

    case 'remove-comment': {
      if (!setComments) break
      // Fade out, then unmount — nothing on screen disappears between two
      // frames. Same two-phase removal the text boxes use.
      const leaving = new Set(idsOf(action))
      setComments(prev => prev.map(c => leaving.has(c.id) ? { ...c, leaving: true } : c))
      await wait(0.3)
      setComments(prev => prev.filter(c => !(leaving.has(c.id) && c.leaving)))
      break
    }

    case 'update-comment': {
      if (!setComments) break
      let resolvedText  = action.text  ?? null
      let resolvedColor = action.color ?? null

      // Resolve [eq-result] from current equation state
      if (resolvedText?.includes('[eq-result]')) {
        const result = extractEquationResult(state)
        if (result) {
          resolvedText  = resolvedText.replace(/\[eq-result\]/g, String(result.value))
          if (!resolvedColor) resolvedColor = result.color
        }
      }

      if (resolvedColor) resolvedColor = resolveColor(resolvedColor)

      setComments(prev => prev.map(c =>
        c.id === action.id
          ? {
              ...c,
              ...(resolvedText  != null ? { text:  resolvedText  } : {}),
              ...(resolvedColor != null ? { color: resolvedColor } : {}),
            }
          : c
      ))
      // Wait covers the CommentBox fade-out + fade-in (0.18s × 2)
      await wait(0.45)
      break
    }

    // Silent bookkeeping step: stash the current equation's solved numeric
    // result under a name so a LATER eq-create/eq-replace-variable (or a
    // text/comment) can pull it back via [name]v — e.g. solve for the slope
    // between two points, save it as "m", solve for b using [m]v, save that
    // too, then show "y = mx + b" with both substituted in.
    case 'save-value': {
      const result = extractEquationResult(state)
      if (result) saveValue(action.name, result.value)
      break
    }

    case 'clear-comments': {
      if (!setComments) break
      setComments([])
      await wait(0.1)
      break
    }

    case 'set-layout': {
      // The final-result box is a fixed-position overlay measured against the
      // equation panel. Changing layout can move or remove that panel, leaving
      // the ring floating over empty space (e.g. solve for b, then switch to
      // text+graph to plot the answer) — it belongs to the equation, so it
      // goes when the equation's slot may no longer be there.
      document.querySelectorAll('.final-result-highlight').forEach(el => el.remove())
      setUI(u => ({ ...u, _layout: action.mode }))
      await wait(0.1)
      break
    }

    // ── Text box actions ──────────────────────────────────────────────────────

    case 'text-create': {
      textEngine.createBox(textRef, action.id, {
        title:  action.title  ?? null,
        items:  action.items  ?? [],
        isList: action.isList ?? false,
        color:  action.color  || null,
      })
      await wait(0.2)
      break
    }

    case 'text-add-item': {
      textEngine.addItem(textRef, action.id, action.text ?? '')
      await wait(0.15)
      break
    }

    case 'text-remove-item': {
      textEngine.removeItem(textRef, action.id, action.index ?? -1)
      await wait(0.15)
      break
    }

    case 'text-update-title': {
      textEngine.updateTitle(textRef, action.id, action.title ?? '')
      await wait(0.1)
      break
    }

    // Both wait out the fade rather than the old 0.15s, so the next step does
    // not start on top of a card that is still on screen.
    case 'text-remove': {
      for (const id of idsOf(action)) textEngine.removeBox(textRef, id)
      await wait(0.3)
      break
    }

    case 'text-clear': {
      textEngine.clearAllAnimated(textRef)
      await wait(0.3)
      break
    }

    case 'text-fade-content': {
      const { id: boxId, content = '[eq-result]' } = action

      // Resolve [eq-result]: find the pure numeric term (no variable, no symbolic label)
      let resolved = content
      let resultColor = null
      if (content.includes('[eq-result]')) {
        const result = extractEquationResult(state)
        if (result) {
          resolved    = content.replace(/\[eq-result\]/g, String(result.value))
          resultColor = result.color
        }
      }

      // Find the content container inside the box card
      const boxEl     = textRef?.current?.getBoxEl(boxId)
      const contentEl = boxEl?.querySelector('.tb-body, .tb-list') ?? null

      // Fade out existing content
      if (contentEl) {
        await gsap.to(contentEl, { opacity: 0, y: -10, duration: 0.22, ease: 'power2.in' }).then()
      }

      // "|" separates lines here exactly as it does in text-create — passing
      // the whole string as a single item made every | render as a literal
      // pipe on one long line.
      const items = resolved.split('|').map(s => s.trim()).filter(Boolean)

      // Swap content + color synchronously so React doesn't flicker between
      flushSync(() => {
        textEngine.replaceItems(textRef, boxId, items.length ? items : [resolved])
        if (resultColor) textEngine.updateBoxColor(textRef, boxId, resultColor)
      })

      // Re-query: React may have updated the DOM node
      const boxEl2     = textRef?.current?.getBoxEl(boxId)
      const contentEl2 = boxEl2?.querySelector('.tb-body, .tb-list') ?? null

      if (contentEl2) {
        gsap.set(contentEl2, { opacity: 0, y: 10 })
        await gsap.to(contentEl2, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.5)' }).then()
      } else {
        await wait(0.3)
      }
      break
    }

    case 'calc-step': {
      if (!calcRef?.current) break
      calcRef.current.addStep({ id: action.id ?? `cs_${Date.now()}`, latex: action.latex ?? '' })
      await wait(0.55)
      break
    }

    case 'calc-clear': {
      calcRef?.current?.clearAll()
      await wait(0.1)
      break
    }

    // ── Apply inverse trig (arcsin / arccos / arctan) to both sides ───────────
    //
    // Inverse trig is the "undo" of a trig function:
    //   sin(θ) = 0.8  →  arcsin(0.8) = θ  →  θ ≈ 53.13°
    //
    // This works because arcsin(sin(θ)) = θ — the two functions cancel.
    // Same logic for arccos and arctan.
    //
    // Visual sequence:
    //   1. Insert real "arcXXX(" and ")" operator tokens on both sides — they
    //      are actual equation terms (isOperator:true), so they push content and
    //      take up real space.  Existing terms FLIP to their new positions.
    //   2. On the trig side: sin( and ) fade away — only θ remains, because
    //      arcsin(sin(θ)) collapses to θ.  Operator tokens removed.
    //   3. On the numeric side: the ratio evaluates to the angle in degrees.
    //      All numeric terms replaced by the computed value.
    case 'applyInverseTrig': {
      if (!state) break
      const { trig } = action  // 'sin' | 'cos' | 'tan'
      const invName  = `arc${trig}`
      const LABEL    = `${invName}(`

      const all = [...state.left, ...state.right]

      // Find the term that contains sin(θ) / cos(θ) / tan(θ) — identified by varParts
      const trigTerm = all.find(t =>
        t.varParts?.length > 0 && t.varParts[0].text.startsWith(trig + '(')
      )
      if (!trigTerm) {
        console.warn(`[applyInverseTrig] No ${trig}(…) term found in equation`)
        break
      }

      // The argument text and color inside the function (e.g. 'θ' with its color)
      const argText  = trigTerm.varParts[1]?.text  ?? 'θ'
      const argColor = trigTerm.varParts[1]?.color ?? null

      // The other side holds the numeric / fraction value
      const numSide  = trigTerm.side === 'left' ? 'right' : 'left'
      const numTerms = (numSide === 'left' ? state.left : state.right).slice()

      // Pre-compute the angle (degrees) from the numeric side
      const ratio    = evaluateSideValue(numTerms)
      const angleRad = Math[`a${trig}`](ratio)
      const angleDeg = parseFloat((angleRad * 180 / Math.PI).toFixed(2))

      // ── Phase 1: Insert arcXXX( and ) as real operator terms on both sides ──

      // Snapshot all current positions for FLIP
      const r0 = refs()
      const beforeInsert = {}
      ;[...state.left, ...state.right].forEach(t => {
        const el = getWrap(r0, t.side, t.cellIndex)
        if (el) beforeInsert[t.id] = el.getBoundingClientRect()
      })

      // IDs for the four new operator tokens
      const trigPreId = crypto.randomUUID()
      const trigSufId = crypto.randomUUID()
      const numPreId  = crypto.randomUUID()
      const numSufId  = crypto.randomUUID()
      const opIds     = [trigPreId, trigSufId, numPreId, numSufId]

      const mkOp = (id, text) =>
        new MathObject({ id, isOperator: true, text, sign: '+', coefficient: 0, variable: null, degree: 0 })

      const trigSideLen = (trigTerm.side === 'left' ? state.left : state.right).length
      const numSideLen  = (numSide === 'left' ? state.left : state.right).length

      state.insertAt(mkOp(trigPreId, LABEL), trigTerm.side, 0)
      state.insertAt(mkOp(trigSufId, ')'),   trigTerm.side, trigSideLen + 1)  // after the shifted content
      state.insertAt(mkOp(numPreId,  LABEL), numSide, 0)
      state.insertAt(mkOp(numSufId,  ')'),   numSide, numSideLen + 1)

      // Commit, but immediately hide the new operator tokens so they don't pop in
      flushSync(() => setState(state.snapshot()))

      const r1 = refs()
      opIds.forEach(id => {
        const t = state.findById(id)
        if (t) gsap.set(getWrap(r1, t.side, t.cellIndex), { opacity: 0 })
      })

      // FLIP all original terms to their new (shifted) positions
      const flipAnims = []
      ;[...state.left, ...state.right].forEach(t => {
        if (opIds.includes(t.id)) return
        const before = beforeInsert[t.id]
        const el = getWrap(r1, t.side, t.cellIndex)
        if (!before || !el) return
        const after = el.getBoundingClientRect()
        const dx = before.left - after.left
        if (Math.abs(dx) < 1) return
        gsap.set(el, { x: dx })
        flipAnims.push(gsap.to(el, { x: 0, duration: 0.4, ease: 'power3.out' }).then())
      })
      await Promise.all(flipAnims)

      // Fade in the four operator tokens
      await gsap.to(
        opIds.map(id => { const t = state.findById(id); return t ? getWrap(r1, t.side, t.cellIndex) : null }).filter(Boolean),
        { opacity: 1, duration: 0.35, ease: 'back.out(1.5)', stagger: 0.06 }
      ).then()
      await wait(0.9)

      // ── Phase 2+3: Collapse both sides simultaneously ───────────────────────
      //
      // Trig side:  arcsin(sin(θ)) → θ  (operator tokens + inner spans fade out)
      // Numeric side: arcsin(4/5) → 53.13  (operator tokens + value terms fade out)
      // Both fade-outs fire in parallel, then one flushSync commit, then both pop-ins.

      const r2 = refs()

      // Trig-side elements for fade-out
      const trigPreT  = state.findById(trigPreId)
      const trigSufT  = state.findById(trigSufId)
      const trigPreEl = trigPreT ? getWrap(r2, trigPreT.side, trigPreT.cellIndex) : null
      const trigSufEl = trigSufT ? getWrap(r2, trigSufT.side, trigSufT.cellIndex) : null
      const trigTermNow = state.findById(trigTerm.id)
      const trigWrapNow = trigTermNow ? getWrap(r2, trigTermNow.side, trigTermNow.cellIndex) : null
      const trigCell    = trigWrapNow?.querySelector('.term-cell')
      const partSpans   = trigCell ? [...trigCell.querySelectorAll('span')] : []

      // Numeric-side elements for fade-out
      const numPreT   = state.findById(numPreId)
      const numSufT   = state.findById(numSufId)
      const numPreEl  = numPreT  ? getWrap(r2, numPreT.side,  numPreT.cellIndex)  : null
      const numSufEl  = numSufT  ? getWrap(r2, numSufT.side,  numSufT.cellIndex)  : null
      const currentNumTerms = (numSide === 'left' ? state.left : state.right).filter(t => !t.isOperator)
      const numInners = currentNumTerms.map(t => getCellInner(getWrap(r2, t.side, t.cellIndex))).filter(Boolean)

      // Snapshot FLIP origins for both sides before any mutation
      const beforeBoth = {}
      ;[...state.left, ...state.right].forEach(t => {
        const el = getWrap(r2, t.side, t.cellIndex)
        if (el) beforeBoth[t.id] = el.getBoundingClientRect()
      })

      // Fade out both sides in parallel
      await Promise.all([
        gsap.to(
          [trigPreEl, trigSufEl, partSpans[0], partSpans[2]].filter(Boolean),
          { opacity: 0, scale: 0.6, duration: 0.28, ease: 'power2.in', stagger: 0.04 }
        ).then(),
        gsap.to(
          [numPreEl, numSufEl, ...numInners].filter(Boolean),
          { opacity: 0, scale: 0.7, duration: 0.3, ease: 'power2.in', stagger: 0.04 }
        ).then(),
      ])

      // Commit both mutations at once
      state.remove(trigPreId)
      state.remove(trigSufId)
      trigTerm.varParts      = null
      trigTerm.variable      = argText
      trigTerm.coefficient   = 1
      trigTerm.degree        = 1
      trigTerm.isFraction    = false
      trigTerm.symbolicLabel = undefined
      trigTerm.color         = argColor

      state.remove(numPreId)
      state.remove(numSufId)
      currentNumTerms.slice(1).forEach(t => state.remove(t.id))
      const pivot = currentNumTerms[0]
      if (pivot) {
        pivot.isFraction       = false
        pivot.numeratorTerms   = null
        pivot.denominatorTerms = null
        pivot.varParts         = null
        pivot.variable         = null
        pivot.degree           = 0
        pivot.sign             = angleDeg >= 0 ? '+' : '-'
        pivot.coefficient      = Math.abs(angleDeg)
        pivot.symbolicLabel    = undefined
        pivot.color            = argColor
      }
      flushSync(() => setState(state.snapshot()))
      await wait(0.08)

      // Pop in both results simultaneously
      const r3 = refs()
      const resolveAnims = []

      ;[...state.left, ...state.right].forEach(t => {
        if (t.id === trigTerm.id || t.id === pivot?.id) return
        const b  = beforeBoth[t.id]
        const el = getWrap(r3, t.side, t.cellIndex)
        if (!b || !el) return
        const nr = el.getBoundingClientRect()
        const dx = b.left - nr.left
        if (Math.abs(dx) < 1) return
        gsap.set(el, { x: dx })
        resolveAnims.push(gsap.to(el, { x: 0, duration: 0.35, ease: 'power3.out' }).then())
      })

      // Pop in θ
      const argWrap  = getWrap(r3, trigTerm.side, trigTerm.cellIndex)
      const argInner = getCellInner(argWrap)
      if (argInner) {
        argInner.style.animation = 'none'
        gsap.set(argInner, { opacity: 0, scale: 0.8 })
        resolveAnims.push(gsap.to(argInner, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)' }).then())
      }

      // Pop in numeric result
      const resWrap  = pivot ? getWrap(r3, numSide, 0) : null
      const resInner = getCellInner(resWrap)
      if (resInner) {
        resInner.style.animation = 'none'
        gsap.set(resInner, { opacity: 0, scale: 0.8 })
        resolveAnims.push(gsap.to(resInner, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)' }).then())
      }

      await Promise.all(resolveAnims)
      await wait(0.2)
      break
    }

    // ── Distribute parentheses ────────────────────────────────────────────────
    // Everything inside the bracket adds up to one number, so it does — the
    // same way terms combine anywhere else on this panel: the rightmost one
    // holds still and the others travel into it. Only then does the multiplier
    // outside have something to multiply.
    // ── The rule of three ─────────────────────────────────────────────────────
    // Not a symmetric cross but a CHAIN, because that is the order the work is
    // actually done in: from a/b = c/d with one unknown, two of the four
    // multiply, the third divides, and the answer lands on the fourth. So three
    // lines are drawn in that order — × then ÷ then = — and each one writes its
    // own piece of the working underneath in grey as it lands.
    //
    // Which is which comes from where the unknown sits. The four make two cross
    // pairs, {a,d} and {b,c}. The unknown is in one of them, and its partner
    // there is what multiplies it — so that partner is the DIVISOR. The other
    // pair is the product. Works from any of the four corners.
    //
    // NOTHING MOVES: the fractions stay where they were written, and every piece
    // of the working is placed at its final spot from the start, so a piece
    // arriving never nudges the ones already there. The equation is not touched.
    case 'cross-multiply': {
      if (!state) break
      const leftT  = state.left[0]
      const rightT = state.right[0]
      const isRatio = (t) => t?.expr?.t === 'bin' && t.expr.op === '/' &&
        ['num', 'label'].includes(t.expr.a.t) && ['num', 'label'].includes(t.expr.b.t)
      if (state.left.length !== 1 || state.right.length !== 1 || !isRatio(leftT) || !isRatio(rightT)) {
        console.warn('[cross-multiply] needs a proportion — one fraction each side, as in "2/3 = |x|/12"')
        break
      }

      const r0    = refs()
      const lWrap = getWrap(r0, 'left', 0)
      const rWrap = getWrap(r0, 'right', 0)
      const halvesOf = (w) => (w ? [...w.querySelectorAll('.expr-fraction-row .term-cell')].slice(0, 2) : [])
      const [aEl, bEl] = halvesOf(lWrap)
      const [cEl, dEl] = halvesOf(rWrap)
      if (!aEl || !bEl || !cEl || !dEl) break

      const comma = leftT.decimalComma || rightT.decimalComma
      const cell = {
        a: { node: leftT.expr.a,  el: aEl },
        b: { node: leftT.expr.b,  el: bEl },
        c: { node: rightT.expr.a, el: cEl },
        d: { node: rightT.expr.b, el: dEl },
      }
      const txt = (k) => cell[k].node.t === 'label'
        ? cell[k].node.name
        : (comma ? String(Number(cell[k].node.v.toFixed(6))).replace('.', ',')
          : String(Number(cell[k].node.v.toFixed(6))))

      const PARTNER = { a: 'd', d: 'a', b: 'c', c: 'b' }
      const U = ['a', 'b', 'c', 'd'].find(k => cell[k].node.t === 'label')
      if (!U) { console.warn('[cross-multiply] no unknown — write one of the four as |x|'); break }
      const X = PARTNER[U]                                   // the divisor
      const rest = ['a', 'b', 'c', 'd'].filter(k => k !== U && k !== X)
      // The chain starts on the LEFT fraction and crosses to the right, the way
      // it is read.
      const M1 = rest.find(k => k === 'a' || k === 'b') ?? rest[0]
      const M2 = rest.find(k => k !== M1)

      const NS  = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(NS, 'svg')
      svg.classList.add('_anim-overlay')
      svg.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100vw', 'height:100vh',
        'pointer-events:none', 'z-index:9999', 'overflow:visible',
      ].join(';')
      document.body.appendChild(svg)

      const mid = (e) => {
        const r = e.getBoundingClientRect()
        return [r.left + r.width / 2, r.top + r.height / 2]
      }
      const boxes = [lWrap, rWrap].map(w => w.getBoundingClientRect())
      const baseY = Math.max(...boxes.map(b => b.bottom)) + 58
      const midX  = (boxes[0].left + boxes[1].right) / 2
      // One colour per STEP, and the line, its sign and its piece of the answer
      // all wear it. The three signs sit close together in the middle of the
      // figure, so without that they read as one cluster of symbols and there is
      // no telling which × belongs to which line, or which half of the answer it
      // produced. The colour is the only thing that ties the three together.
      const STEP = ['#f97316', '#a855f7', '#60a5fa']   // × orange · ÷ purple · = blue

      // One link of the chain: a line from one value to the next, with the sign
      // it stands for beside it. The sign is pushed off the line perpendicular,
      // and consecutive links push to opposite sides so two of them crossing
      // never stack their signs in the same spot.
      const link = (from, to, mark, side, color) => {
        const [x1, y1] = mid(cell[from].el), [x2, y2] = mid(cell[to].el)
        const line = document.createElementNS(NS, 'line')
        line.setAttribute('x1', x1); line.setAttribute('y1', y1)
        line.setAttribute('x2', x2); line.setAttribute('y2', y2)
        line.setAttribute('stroke', color)
        line.setAttribute('stroke-width', '3')
        line.setAttribute('stroke-linecap', 'round')
        const len = Math.hypot(x2 - x1, y2 - y1) || 1
        line.style.strokeDasharray  = String(len)
        line.style.strokeDashoffset = String(len)
        svg.appendChild(line)
        const nx = -(y2 - y1) / len, ny = (x2 - x1) / len
        const s = document.createElementNS(NS, 'text')
        s.setAttribute('x', (x1 + x2) / 2 + nx * 34 * side)
        s.setAttribute('y', (y1 + y2) / 2 + ny * 34 * side)
        s.setAttribute('text-anchor', 'middle')
        s.setAttribute('dominant-baseline', 'central')
        s.setAttribute('fill', color)
        s.setAttribute('font-size', '28')
        s.setAttribute('font-weight', '700')
        s.style.opacity = '0'
        s.textContent = mark
        svg.appendChild(s)
        return [line, s]
      }

      // The working is positioned from the assembled line, not appended piece
      // after piece, so writing the second half never shifts the first.
      const CH = 17
      const parts = [`${txt(U)} =`, `${txt(M1)}·${txt(M2)}`, `÷ ${txt(X)}`]
      const widths = parts.map(s => s.length * CH)
      const total  = widths.reduce((s, w) => s + w, 0) + CH * (parts.length - 1)
      let cursor = midX - total / 2
      // parts are [answer, product, divisor] but they ARRIVE in the order the
      // steps happen — product, divisor, answer — so each one is coloured by the
      // step that writes it, not by its position in the line.
      const PIECE_STEP = [2, 0, 1]
      const pieces = parts.map((s, k) => {
        const t = document.createElementNS(NS, 'text')
        t.setAttribute('x', cursor + widths[k] / 2)
        t.setAttribute('y', baseY)
        t.setAttribute('text-anchor', 'middle')
        t.setAttribute('dominant-baseline', 'central')
        t.setAttribute('fill', STEP[PIECE_STEP[k]])
        t.setAttribute('font-size', '29')
        t.setAttribute('font-weight', '700')
        t.setAttribute('font-family', "'Fira Code','Cascadia Code',monospace")
        t.style.opacity = '0'
        t.textContent = s
        svg.appendChild(t)
        t.setAttribute('data-r3-piece', ['ans', 'prod', 'div'][k])
        cursor += widths[k] + CH
        return t
      })

      // The two answers are worked out now and carried on the overlay, because
      // the steps that reveal them are separate actions with no reference to
      // any of this.
      const numOf = (k) => Number(String(txt(k)).replace(',', '.'))
      const fmt = (v) => Number.isFinite(v)
        ? (comma ? String(Number(v.toFixed(6))).replace('.', ',') : String(Number(v.toFixed(6))))
        : '?'
      const product = numOf(M1) * numOf(M2)
      svg.setAttribute('data-r3', '1')
      svg.setAttribute('data-r3-product', fmt(product))
      svg.setAttribute('data-r3-final', fmt(product / numOf(X)))
      svg.setAttribute('data-r3-midx', String(midX))

      const beat = async (line, sign, piece, opacity) => {
        await gsap.to(line, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' }).then()
        await Promise.all([
          gsap.to(sign,  { opacity: 1, duration: 0.28, ease: 'power2.out' }).then(),
          gsap.to(piece, { opacity, duration: 0.34, ease: 'power2.out' }).then(),
        ])
        await wait(0.55)
      }

      // 1. the two that multiply
      const [l1, s1] = link(M1, M2, '×', 1, STEP[0])
      await beat(l1, s1, pieces[1], 0.8)
      // 2. on to the one that divides
      const [l2, s2] = link(M2, X, '÷', -1, STEP[1])
      await beat(l2, s2, pieces[2], 0.8)
      // 3. and it lands on the unknown
      const [l3, s3] = link(X, U, '=', 1, STEP[2])
      await beat(l3, s3, pieces[0], 0.9)

      // Full strength: it stopped being working and became the answer. Then it
      // stops — the overlay is cleared by cancelAllAnimations when the next step
      // runs, and the equation itself was never touched.
      await gsap.to(pieces, { opacity: 1, duration: 0.3, ease: 'power2.out' }).then()
      await wait(0.5)
      break
    }

    // The arithmetic, held back until the reader asks for it. Marked gated in
    // the step, so the page parks here and › runs it — the reader gets to look
    // at x = 2·12 ÷ 3 and work it out before being told.
    // The arithmetic, done ON THE LINE that was just written and one operation
    // at a time, the way any other equation is solved here: the product first,
    // then the division. A second line reading "x = 8" underneath would be an
    // answer appearing beside the working rather than the working becoming the
    // answer.
    //
    // Each piece is an SVG text anchored at its middle, so rewriting one
    // changes nothing but itself — the others do not shift to take up the
    // slack. The line is re-centred once at the very end, when there is
    // nothing left to change.
    case 'rule-of-three-solve': {
      const svg = document.querySelector('[data-r3]')
      if (!svg) break
      const piece = (k) => svg.querySelector(`[data-r3-piece="${k}"]`)
      const pop = (el) => gsap.to(el, {
        scale: 1.25, duration: 0.16, ease: 'back.out(2.5)', yoyo: true, repeat: 1,
        transformOrigin: 'center',
      }).then()

      if (action.phase === 1) {
        const prod = piece('prod')
        if (!prod) break
        prod.textContent = svg.getAttribute('data-r3-product')
        await pop(prod)
        await wait(0.4)
        break
      }

      // Phase 2: the division. The divisor leaves and the number it divided
      // becomes the answer, in the same beat — that IS the operation.
      const prod = piece('prod')
      const div  = piece('div')
      const ans  = piece('ans')
      if (!prod || !div) break
      await gsap.to(div, { opacity: 0, duration: 0.3, ease: 'power2.in' }).then()
      prod.textContent = svg.getAttribute('data-r3-final')
      await Promise.all([
        pop(prod),
        gsap.to(prod, { fill: '#60a5fa', duration: 0.3, ease: 'power2.out' }).then(),
      ])
      await wait(0.45)

      // Now, and only now, the line closes up — one deliberate move with
      // nothing left to disturb it.
      if (ans) {
        const CH = 17
        const wAns  = ans.textContent.length * CH
        const wProd = prod.textContent.length * CH
        const midX  = Number(svg.getAttribute('data-r3-midx')) || Number(ans.getAttribute('x'))
        const total = wAns + CH + wProd
        await Promise.all([
          gsap.to(ans,  { attr: { x: midX - total / 2 + wAns / 2 }, duration: 0.45, ease: 'power2.inOut' }).then(),
          gsap.to(prod, { attr: { x: midX + total / 2 - wProd / 2 }, duration: 0.45, ease: 'power2.inOut' }).then(),
        ])
      }
      await wait(0.4)
      break
    }

    case 'combineInParens': {
      if (!state) break
      const group = state.findById(action.id)
      if (!group) break
      const inner = group.innerTerms ?? []
      if (inner.length < 2) break

      const wrap  = getWrap(refs(), group.side, group.cellIndex)
      const parts = wrap ? [...wrap.querySelectorAll('.pg-inner-term')] : []
      // The outer bracket of a bracket-times-bracket uses .pg-outer-val, so
      // these are the inner ones and only the inner ones.
      const innerParts = parts.filter(p => p.querySelector('.pg-inner-val'))

      if (innerParts.length >= 2) {
        const anchor = innerParts[innerParts.length - 1]
        // The sign in front of the anchor belongs to the operation being
        // carried out, so it leaves with the term that is being folded in.
        const anchorOp = anchor.querySelector('.term-op')
        const ar = anchor.getBoundingClientRect()
        await Promise.all(innerParts.slice(0, -1).map(p => {
          const pr = p.getBoundingClientRect()
          p.style.overflow = 'hidden'
          return gsap.to(p, {
            x: ar.left + ar.width / 2 - (pr.left + pr.width / 2),
            opacity: 0, width: 0, marginLeft: 0, marginRight: 0,
            duration: 0.5, ease: 'power2.inOut',
          }).then()
        }).concat(anchorOp
          ? [gsap.to(anchorOp, { opacity: 0, width: 0, marginLeft: 0, marginRight: 0, duration: 0.5, ease: 'power2.inOut' }).then()]
          : []))

        // The answer is written into the surviving chip before React commits,
        // so the swap itself is never seen — the same trick the ordinary
        // combine uses.
        const cell = anchor.querySelector('.pg-inner-val')
        const v    = inner[0].variable ?? ''
        const deg  = inner[0].degree >= 2 ? String(inner[0].degree) : ''
        const abs  = Math.abs(action.value)
        if (cell) {
          cell.textContent = (abs === 1 && v ? '' : String(Number(abs.toFixed(6)))) + v + deg
          await gsap.to(cell, { scale: 1.18, duration: 0.15, ease: 'back.out(2.5)', yoyo: true, repeat: 1 }).then()
        }
      }

      group.innerTerms = [{
        id: crypto.randomUUID(),
        sign: action.value < 0 ? '-' : '+',
        coefficient: Math.abs(action.value),
        variable: inner[0].variable ?? null,
        degree: inner[0].degree,
      }]
      flushSync(() => setState(state.snapshot()))
      await wait(0.35)
      break
    }

    case 'distributeParentheses': {
      if (!state) break
      const { id, side, insertIdx, expandedTerms } = action
      const group = state.findById(id)
      if (!group) break

      const r0        = refs()
      const groupWrap = getWrap(r0, group.side, group.cellIndex)
      // Not getCellInner() here — the group is no longer one shared
      // .term-cell box; .pg-coeff and each .pg-inner-val are now their OWN
      // .term-cell chips, siblings inside .expr-group, so querySelector
      // would just match the first chip instead of scoping the whole group.
      const groupCell = groupWrap ? groupWrap.querySelector('.expr-group') : null

      // ── A bracket times a bracket ────────────────────────────────────────
      // The path below cannot serve this one: it turns each inner term into its
      // product IN PLACE, which works only while there are as many products as
      // slots. (3x+2)(2x-2) makes four products for two slots, so the group
      // would jump straight to the answer with nothing shown in between.
      //
      // Instead the products are written out underneath, in grey, one per
      // arrow — the reader sees where each one came from before the brackets
      // are given up.
      if (group.outerTerms && groupWrap && groupCell) {
        const outerEls = [...groupCell.querySelectorAll('.pg-outer-val')]
        const innerEls = [...groupCell.querySelectorAll('.pg-inner-val')]

        // The running calculation, centred under the group and low enough that
        // the arcs above it never reach down into it.
        const S = eqScale()
        const gRect = groupWrap.getBoundingClientRect()
        const line  = document.createElement('div')
        line.className = '_anim-overlay eq-distrib-line'
        line.style.cssText = [
          'position:fixed',
          `left:${gRect.left + gRect.width / 2}px`, `top:${gRect.bottom + 26 * S}px`,
          'transform:translateX(-50%)',
          'display:flex', 'align-items:baseline', 'gap:0.34em',
          `font-size:${1.5 * S}rem`, 'font-weight:500', 'color:#8892a4',
          'pointer-events:none', 'z-index:40', 'white-space:nowrap',
        ].join(';')
        document.body.appendChild(line)

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.classList.add('_anim-overlay')
        svg.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;overflow:visible'
        // Same arrowhead the ordinary distribute draws — these are the same
        // gesture and must not look like a different one.
        const defs   = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
        marker.setAttribute('id', 'xdist-arrowhead')
        marker.setAttribute('markerWidth', '8')
        marker.setAttribute('markerHeight', '8')
        marker.setAttribute('refX', '7')
        marker.setAttribute('refY', '3')
        marker.setAttribute('orient', 'auto')
        const tip = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        tip.setAttribute('d', 'M0,0 L0,6 L8,3 z')
        tip.setAttribute('fill', '#60a5fa')
        marker.appendChild(tip)
        defs.appendChild(marker)
        svg.appendChild(defs)
        document.body.appendChild(svg)

        let k = 0
        for (let i = 0; i < outerEls.length; i++) {
          for (let j = 0; j < innerEls.length; j++) {
            const from = outerEls[i], to = innerEls[j]
            const term = expandedTerms[k++]
            if (!from || !to || !term) continue

            // the pair this arrow joins, lit while it is drawn
            // eslint-disable-next-line no-await-in-loop
            await gsap.to([from, to], { color: '#60a5fa', duration: 0.25 }).then()

            // Arcs OVER the brackets, exactly like the ordinary distribute:
            // same anchor points, same lift, same colour and weight. Dipping
            // below made them read as a different operation, and put them on
            // top of the working line.
            const a = from.getBoundingClientRect(), b = to.getBoundingClientRect()
            const x1 = a.left + a.width / 2, y1 = a.top + a.height * 0.25
            const x2 = b.left + b.width / 2, y2 = b.top + b.height * 0.25
            const arcLift = Math.max(52 * S, a.height * 0.85)
            const arcY = Math.min(y1, y2) - arcLift
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            path.setAttribute('d', `M${x1},${y1} Q${(x1 + x2) / 2},${arcY} ${x2},${y2}`)
            path.setAttribute('stroke', '#60a5fa')
            path.setAttribute('stroke-width', '2.5')
            path.setAttribute('fill', 'none')
            path.setAttribute('marker-end', 'url(#xdist-arrowhead)')
            svg.appendChild(path)
            const len = Math.hypot(x2 - x1, y2 - y1) * 1.4 + 60
            path.style.strokeDasharray = String(len)
            path.style.strokeDashoffset = String(len)
            // eslint-disable-next-line no-await-in-loop
            await gsap.to(path, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }).then()

            // its product joins the grey line underneath
            const chip = document.createElement('span')
            chip.textContent = (k > 1 ? (term.sign === '-' ? '− ' : '+ ') : (term.sign === '-' ? '−' : '')) +
                               cellLabel(Math.abs(term.coefficient), term.variable, term.degree)
            chip.style.opacity = '0'
            line.appendChild(chip)
            // eslint-disable-next-line no-await-in-loop
            await gsap.to(chip, { opacity: 1, duration: 0.45, ease: 'power2.out' }).then()
            // eslint-disable-next-line no-await-in-loop
            await Promise.all([
              gsap.to([from, to], { color: '', duration: 0.3 }).then(),
              gsap.to(path, { opacity: 0.25, duration: 0.3 }).then(),
            ])
            // eslint-disable-next-line no-await-in-loop
            await wait(0.5)
          }
        }

        // Only now do the brackets go, replaced by what was written underneath.
        await gsap.to(svg, { opacity: 0, duration: 0.3 }).then()
        await gsap.to(groupCell, { opacity: 0, duration: 0.4, ease: 'power2.in' }).then()
        await gsap.to(line, { opacity: 0, duration: 0.35 }).then()
        svg.remove()
        line.remove()

        state.remove(id)
        expandedTerms.forEach((t, i) =>
          state.insertAt(new MathObject(t), side, (insertIdx ?? 0) + i)
        )
        setState(state.snapshot())
        await wait(0.35)
        break
      }

      if (groupWrap && groupCell) {
        // ── Phase 1: Pulse-outline the coefficient ──────────────────────────
        const coeffEl      = groupCell.querySelector('.pg-coeff')
        const innerTermEls = [...groupCell.querySelectorAll('.pg-inner-term')]
        const innerEls     = innerTermEls.map(el => el.querySelector('.pg-inner-val')).filter(Boolean)

        // coeffEl is a .term-cell now — kill its CSS mount animation
        // (termEnter) up front, same fix every other lifted/faded .term-cell
        // in this file needs, or it can fight the fade-to-0 below and make
        // it snap instead of smoothly fading.
        if (coeffEl) coeffEl.style.animation = 'none'

        if (coeffEl) {
          await gsap.to(coeffEl, {
            scale: 1.15, duration: 0.35, ease: 'power2.out',
          }).then()
        }
        await wait(0.25)

        // ── Phase 2: Draw curved SVG arrows coeff → each inner term ────────
        if (innerEls.length > 0 && coeffEl) {
          const coeffRect = coeffEl.getBoundingClientRect()
          const srcX = coeffRect.left + coeffRect.width / 2
          const srcY = coeffRect.top  + coeffRect.height * 0.25

          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.classList.add('_anim-overlay')
          svg.style.cssText = [
            'position:fixed', 'top:0', 'left:0',
            'width:100vw', 'height:100vh',
            'pointer-events:none', 'z-index:9999', 'overflow:visible',
          ].join(';')

          const defs   = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
          const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
          marker.setAttribute('id', 'dist-arrowhead')
          marker.setAttribute('markerWidth',  '8')
          marker.setAttribute('markerHeight', '8')
          marker.setAttribute('refX', '7')
          marker.setAttribute('refY', '3')
          marker.setAttribute('orient', 'auto')
          const arrowTip = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          arrowTip.setAttribute('d', 'M0,0 L0,6 L8,3 z')
          arrowTip.setAttribute('fill', '#60a5fa')
          marker.appendChild(arrowTip)
          defs.appendChild(marker)
          svg.appendChild(defs)
          document.body.appendChild(svg)

          // Build path elements (getTotalLength works once SVG is in DOM)
          const pathDatas = innerEls.map(innerEl => {
            const tRect  = innerEl.getBoundingClientRect()
            const tx     = tRect.left + tRect.width  / 2
            const ty     = tRect.top  + tRect.height * 0.25
            const midX   = (srcX + tx) / 2
            const arcLift = Math.max(52 * eqScale(), coeffRect.height * 0.85)
            const arcY   = Math.min(srcY, ty) - arcLift
            return `M${srcX},${srcY} Q${midX},${arcY} ${tx},${ty}`
          })

          const svgPaths = pathDatas.map(d => {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            p.setAttribute('d', d)
            p.setAttribute('stroke', '#60a5fa')
            p.setAttribute('stroke-width', '2.5')
            p.setAttribute('fill', 'none')
            p.setAttribute('marker-end', 'url(#dist-arrowhead)')
            svg.appendChild(p)
            // Approximate length from path data (more reliable than getTotalLength across browsers)
            const pts = d.match(/-?\d+(?:\.\d+)?/g).map(Number)
            const approxLen = Math.hypot(pts[4] - pts[0], pts[5] - pts[1]) * 1.35 + 50
            p.style.strokeDasharray  = String(approxLen)
            p.style.strokeDashoffset = String(approxLen)
            return p
          })

          // Highlight targets + draw arrows simultaneously
          innerEls.forEach(el => gsap.to(el, { color: '#60a5fa', duration: 0.2 }))
          await Promise.all(svgPaths.map(p =>
            gsap.to(p, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }).then()
          ))
          await wait(0.55)

          // ── Phase 3: everything happens in the SAME beat — inner terms pop
          // to their distributed value IN PLACE at the exact instant the
          // coefficient, the parens, and the arrows start fading away.
          // Only the coefficient and parens are "consumed" and disappear;
          // nothing else disappears and gets replaced by a new element.
          const beforePos = {}
          const curRefs   = refs()
          ;[...state.left, ...state.right].forEach(t => {
            if (t.id === id) return
            const el = getWrap(curRefs, t.side, t.cellIndex)
            if (el) beforePos[t.id] = el.getBoundingClientRect()
          })

          innerEls.forEach(el => { el.style.animation = 'none' })
          expandedTerms.forEach((t, i) => {
            const valEl = innerEls[i]
            if (!valEl) return
            // cellLabel includes the degree superscript (e.g. "2x²") — a
            // plain coefficient+variable concat here was missing it, so the
            // exponent only showed up later once the real commit re-rendered
            // the term properly, instead of at the same instant it pops.
            valEl.textContent = cellLabel(Math.abs(t.coefficient), t.variable, t.degree)
            const opEl = innerTermEls[i]?.querySelector('.term-op')
            if (opEl) opEl.textContent = t.sign === '-' ? '−' : '+'
          })

          const pgOpen  = groupCell.querySelector('.pg-open')
          const pgClose = groupCell.querySelector('.pg-close')
          await Promise.all([
            gsap.to(innerEls, { scale: 1.2, duration: 0.15, ease: 'back.out(2.5)', yoyo: true, repeat: 1 }).then(),
            gsap.to(svg, { opacity: 0, duration: 0.28 }).then(),
            gsap.to([coeffEl, pgOpen, pgClose].filter(Boolean), { opacity: 0, duration: 0.28, ease: 'power2.in' }).then(),
          ])
          await wait(0.2)
          svg.remove()

          state.remove(id)
          expandedTerms.forEach((t, i) =>
            state.insertAt(new MathObject(t), side, (insertIdx ?? 0) + i)
          )
          flushSync(() => setState(state.snapshot()))

          const fresh = refs()
          const anims = []
          ;[...state.left, ...state.right].forEach(t => {
            const el = getWrap(fresh, t.side, t.cellIndex)
            if (expandedTerms.some(e => e.id === t.id)) {
              // Already visually correct (popped in place above) — just
              // silence the mount animation, no fresh pop-in.
              const inner = getCellInner(el)
              if (inner) inner.style.animation = 'none'
              return
            }
            const b = beforePos[t.id]
            if (!b || !el) return
            const nr = el.getBoundingClientRect()
            const dx = b.left - nr.left
            if (Math.abs(dx) < 1) return
            gsap.set(el, { x: dx })
            anims.push(gsap.to(el, { x: 0, duration: 0.36, ease: 'power3.out' }).then())
          })
          await Promise.all(anims)
        } else {
          // No arrow targets — just commit
          state.remove(id)
          expandedTerms.forEach((t, i) =>
            state.insertAt(new MathObject(t), side, (insertIdx ?? 0) + i)
          )
          flushSync(() => setState(state.snapshot()))
        }
      } else {
        // No DOM elements — commit silently
        state.remove(id)
        expandedTerms.forEach((t, i) =>
          state.insertAt(new MathObject(t), side, (insertIdx ?? 0) + i)
        )
        flushSync(() => setState(state.snapshot()))
      }
      await wait(0.2)
      break
    }

    // ── Full-Solve on current equation ───────────────────────────────────────
    // Pure animated step-by-step solve (combine, send to other side, divide) —
    // never short-circuits to "the answer". Works on whatever equation is on screen.
    case 'full-solve-current': {
      if (!state) break

      // ── Generic expression-tree evaluation ────────────────────────────────
      // ONE walker resolves ANY term built as an expr tree (see exprTree.js)
      // — a trapezoid's (B+b)×h/2, a circle's π×r², a quadratic's
      // (-b+√Δ)/2a — always the same way: find the deepest-leftmost ready
      // operation (order of operations falls out of the tree structure
      // itself, no per-equation-shape script), reveal it, collapse it to a
      // number, repeat until one number remains, then fold that number into
      // an ordinary term so it feeds combine/send/divide like any other.
      // ── Phase 0a: fractions on a side are brought together ────────────────
      // "1/2 + 1/3" arrives as two separate TERMS, because the parser splits a
      // side on its top-level +/-. Two things have to happen, in this order.
      //
      // First the denominators are made equal, visibly: a "×3" and a "×2" beside
      // the two fractions, then the numbers change in place — the step the
      // lesson is actually about.
      //
      // Then the addition itself is handed to autoCombine, which already adds
      // same-denominator fractions the ordinary way: one term is the anchor, the
      // other FLIES into it and the two become one. Reproducing that here would
      // have been a second, slightly different version of the same motion.
      for (const side of ['left', 'right']) {
        const arr = side === 'left' ? state.left : state.right
        if (arr.length < 2) continue
        const isNumFrac = (t) => t.expr && isFrac(t.expr)
        const fracs = arr.filter(isNumFrac)
        if (fracs.length < 2 || fracs.length !== arr.length) continue

        const dens = fracs.map(t => t.expr.b.v)
        if (new Set(dens).size > 1) {
          const g = (x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) { [x, y] = [y, x % y] } return x || 1 }
          const L = dens.reduce((acc, d) => Math.abs(acc * d) / g(acc, d), 1)

          // eslint-disable-next-line no-await-in-loop
          await subStep()
          const marks = []
          for (const t of fracs) {
            const k = L / t.expr.b.v
            if (k === 1) continue
            const blk = getWrap(refs(), t.side, t.cellIndex)?.querySelector('.expr-fraction')
            for (const c of [...(blk?.querySelectorAll('.term-cell') ?? [])].slice(0, 2)) {
              const r  = c.getBoundingClientRect()
              const el = document.createElement('div')
              el.className = '_anim-overlay eq-times-mark'
              el.textContent = `×${k}`
              el.style.cssText = `position:fixed; left:${r.right + 6}px; top:${r.top + r.height / 2}px;`
                + 'transform:translateY(-50%); opacity:0;'
              document.body.appendChild(el)
              marks.push(el)
            }
          }
          if (marks.length) {
            // eslint-disable-next-line no-await-in-loop
            await gsap.to(marks, { opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.12 }).then()
            // eslint-disable-next-line no-await-in-loop
            await wait(1.1)
          }
          for (const t of fracs) {
            const k = L / t.expr.b.v
            t.expr.a.v *= k
            t.expr.b.v *= k
          }
          flushSync(() => setState(state.snapshot()))
          const cells = fracs.flatMap(t =>
            [...(getWrap(refs(), t.side, t.cellIndex)?.querySelectorAll('.expr-fraction .term-cell') ?? [])])
          cells.forEach(c => { c.style.animation = 'none' })
          // eslint-disable-next-line no-await-in-loop
          await Promise.all([
            cells.length
              ? gsap.fromTo(cells, { scale: 1 },
                  { scale: 1.18, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
              : Promise.resolve(),
            marks.length
              ? gsap.to(marks, { opacity: 0, filter: 'blur(6px)', duration: 0.32, ease: 'power2.in' }).then()
              : Promise.resolve(),
          ])
          marks.forEach(el => el.remove())
          // eslint-disable-next-line no-await-in-loop
          await wait(0.75)
        }

        // eslint-disable-next-line no-await-in-loop
        await subStep()
        // eslint-disable-next-line no-await-in-loop
        await runAction({ type: 'autoCombine' }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
      }

      // A side that MIXES a fraction with a plain number ("1/2 + 3") has no two
      // fractions to gather, so it is folded into one expression tree instead
      // and the generic walker adds it as a rational.
      for (const side of ['left', 'right']) {
        const arr = side === 'left' ? state.left : state.right
        if (arr.length < 2) continue
        const plain = (t) => !t.variable && !t.symbolicLabel && !t.varParts && !t.isFraction && (t.degree ?? 0) === 0
        if (!arr.every(plain)) continue
        if (!arr.some(t => t.expr && isFrac(t.expr))) continue

        let tree = null
        for (const t of arr) {
          const leaf = t.expr ?? num(Math.abs(t.coefficient ?? 0))
          tree = tree === null
            ? (t.sign === '-' ? negN(leaf) : leaf)
            : bin(t.sign === '-' ? '-' : '+', tree, leaf)
        }
        const keepColor = arr.find(t => t.color)?.color ?? null
        const newId = crypto.randomUUID()
        for (const t of [...arr]) state.remove(t.id)
        state.insertAt(new MathObject({
          id: newId, sign: '+', expr: tree,
          coefficient: 1, variable: null, degree: 0, color: keepColor,
        }), side, 0)
      }
      flushSync(() => setState(state.snapshot()))

      for (const term of [...state.left, ...state.right].filter(t => t.expr)) {
        // A factorial is unpacked BEFORE anything is evaluated. 5! is notation,
        // not a number the reader can see into, and a solve that answered 120
        // without ever writing 1·2·3·4·5 would be teaching nothing to the person
        // who needed the step. Once it is a product, the walker below reduces it
        // like any other.
        // eslint-disable-next-line no-await-in-loop
        await unpackFactorials(term)

        const wrap  = () => getWrap(refs(), term.side, term.cellIndex)
        const elFor = id => exprCellsFor(wrap(), id)

        // ── Unlike denominators are made alike FIRST, and visibly ───────────
        // 1/2 + 1/3 is not "5/6" in one move. The step being taught is the one
        // that rewrites both halves over 6 — so a "×3" and a "×2" appear beside
        // them and the numbers change in place, exactly the way the manual
        // amplify step does it. The addition only happens afterwards, and by
        // then it is the easy part: same denominator, add the numerators.
        const equalizeDenominators = async (node) => {
          const g = (x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) { [x, y] = [y, x % y] } return x || 1 }
          const L  = Math.abs(node.a.b.v * node.b.b.v) / g(node.a.b.v, node.b.b.v)
          const k1 = L / node.a.b.v, k2 = L / node.b.b.v
          await subStep()

          const blocks = [...(wrap()?.querySelectorAll('.expr-fraction') ?? [])].slice(0, 2)
          const marks  = []
          blocks.forEach((blk, i) => {
            const k = i === 0 ? k1 : k2
            if (k === 1) return
            for (const c of [...blk.querySelectorAll('.term-cell')].slice(0, 2)) {
              const r  = c.getBoundingClientRect()
              const el = document.createElement('div')
              el.className = '_anim-overlay eq-times-mark'
              el.textContent = `×${k}`
              el.style.cssText = `position:fixed; left:${r.right + 6}px; top:${r.top + r.height / 2}px;`
                + 'transform:translateY(-50%); opacity:0;'
              document.body.appendChild(el)
              marks.push(el)
            }
          })
          if (marks.length) {
            await gsap.to(marks, { opacity: 1, duration: 0.3, ease: 'power2.out', stagger: 0.08 }).then()
            await wait(0.6)
          }

          node.a.a.v *= k1; node.a.b.v *= k1
          node.b.a.v *= k2; node.b.b.v *= k2
          flushSync(() => setState(state.snapshot()))

          const parts = [...(wrap()?.querySelectorAll('.expr-fraction .term-cell') ?? [])]
          parts.forEach(c => { c.style.animation = 'none' })
          await Promise.all([
            parts.length
              ? gsap.fromTo(parts, { scale: 0.78 }, { scale: 1, duration: 0.4, ease: 'back.out(2.2)' }).then()
              : Promise.resolve(),
            marks.length
              ? gsap.to(marks, { opacity: 0, filter: 'blur(6px)', duration: 0.32, ease: 'power2.in' }).then()
              : Promise.resolve(),
          ])
          marks.forEach(el => el.remove())
          await wait(0.4)
        }

        // ── One × becomes two ───────────────────────────────────────────────
        // Multiplying fractions is TWO multiplications, and a single × sitting
        // between the two blocks says nothing about which numbers pair up. So
        // it splits: one × rises onto the numerator line, one drops onto the
        // denominator line, and 2/3 · 4/5 reads as "2·4 over 3·5" before it
        // becomes 8/15.
        const splitTimes = async () => {
          const blocks = [...(wrap()?.querySelectorAll('.expr-fraction') ?? [])]
          const opEl   = [...(wrap()?.querySelectorAll('.term-op') ?? [])]
            .find(o => o.textContent.trim() === '×')
          const rows = blocks[0] ? [...blocks[0].querySelectorAll('.expr-fraction-row')] : []
          if (blocks.length < 2 || !opEl || rows.length < 2) return

          await subStep()
          const opR = opEl.getBoundingClientRect()
          // The two × are the SAME × as the one that was there — same size, same
          // weight, same colour, and centred on the exact spot it occupied.
          // Borrowing .eq-times-mark's own look made them small and hanging off
          // to the left, which read as annotation rather than as the operator.
          const opCS = getComputedStyle(opEl)
          const marks = rows.slice(0, 2).map(row => {
            const r  = row.getBoundingClientRect()
            const el = document.createElement('div')
            el.className = '_anim-overlay eq-times-mark'
            el.textContent = '×'
            el.style.cssText = `position:fixed; left:${opR.left + opR.width / 2}px; top:${opR.top + opR.height / 2}px;`
              + 'transform:translate(-50%, -50%); opacity:0;'
              + `font-size:${opCS.fontSize}; font-weight:${opCS.fontWeight};`
              + `color:${opCS.color}; line-height:1;`
            document.body.appendChild(el)
            el._targetY = r.top + r.height / 2
            return el
          })
          await Promise.all([
            gsap.to(opEl, { opacity: 0, duration: 0.28, ease: 'power2.in' }).then(),
            ...marks.map(el => gsap.to(el, {
              opacity: 1,
              top: el._targetY,
              duration: 0.6,
              ease: 'power2.out',
            }).then()),
          ])
          await wait(1.5)
          // Removed here rather than restored: the resolve that follows fades
          // this whole group out anyway, so bringing the single × back would be
          // one flicker on the way to the answer.
          await gsap.to(marks, { opacity: 0, duration: 0.25, ease: 'power2.in' }).then()
          marks.forEach(el => el.remove())
        }

        // ── Dividing by a fraction is multiplying by its upside-down ────────
        // "3/4 ÷ 4/5" is not resolved straight to 15/16. The move being taught
        // is the flip: the second fraction turns over and the ÷ becomes a ×,
        // and only then is it an ordinary multiplication. So the two halves
        // physically trade places and the sign changes with them.
        const invertAndMultiply = async (node) => {
          await subStep()
          const secondBlock = () => [...(wrap()?.querySelectorAll('.expr-fraction') ?? [])][1]
          const halves = (blk) => (blk ? [...blk.querySelectorAll('.term-cell')].slice(0, 2) : [])

          // Where the two halves sit BEFORE the flip.
          const wasRects = halves(secondBlock()).map(c => c.getBoundingClientRect())

          // The swap is committed FIRST, then each half is put back where its
          // number used to be and allowed to travel to its new home — a FLIP.
          // Animating before the commit made the last frame a jump: the half
          // that had just slid down snapped back up to take its new place, so
          // the move ended exactly where it should have looked smoothest.
          // A ÷ written inline leaves before the × arrives, rather than being
          // swapped for it on the frame the flip is committed.
          const divOp = [...(wrap()?.querySelectorAll('.term-op') ?? [])]
            .find(o => o.textContent.trim() === '÷')
          if (divOp) await gsap.to(divOp, { opacity: 0, duration: 0.25, ease: 'power2.in' }).then()
          node.op = '*'
          delete node.divSign
          const t = node.b.a; node.b.a = node.b.b; node.b.b = t
          flushSync(() => setState(state.snapshot()))

          const cells = halves(secondBlock())
          const newOp = [...(wrap()?.querySelectorAll('.term-op') ?? [])]
            .find(o => o.textContent.trim() === '×')
          if (newOp) gsap.set(newOp, { opacity: 0, scale: 0.7 })

          if (cells.length === 2 && wasRects.length === 2) {
            cells.forEach((c, i) => {
              c.style.animation = 'none'
              // Each half comes from where the OTHER one was.
              const from = wasRects[1 - i]
              const now  = c.getBoundingClientRect()
              gsap.set(c, { x: from.left - now.left, y: from.top - now.top })
            })
            await Promise.all([
              ...cells.map(c => gsap.to(c, { x: 0, y: 0, duration: 0.9, ease: 'power2.inOut' }).then()),
              // The × arrives while they are still crossing, so the sign change
              // and the flip read as one move rather than two.
              newOp
                ? gsap.to(newOp, { opacity: 1, scale: 1, duration: 0.5, delay: 0.35, ease: 'back.out(2)' }).then()
                : Promise.resolve(),
            ])
          } else if (newOp) {
            await gsap.to(newOp, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }).then()
          }
          await wait(0.85)
        }

        let ready = findReady(term.expr)
        while (ready) {
          if (ready.t === 'bin' && ready.op === '/' && isFrac(ready.a) && isFrac(ready.b)) {
            // eslint-disable-next-line no-await-in-loop
            await invertAndMultiply(ready)
            ready = findReady(term.expr)
            continue
          }
          if (ready.t === 'bin' && (ready.op === '+' || ready.op === '-') &&
              isFrac(ready.a) && isFrac(ready.b) && ready.a.b.v !== ready.b.b.v) {
            // eslint-disable-next-line no-await-in-loop
            await equalizeDenominators(ready)
            ready = findReady(term.expr)
            continue
          }
          // eslint-disable-next-line no-await-in-loop
          await subStep()
          const id = ready.id
          // A standalone fraction (the WHOLE term is "2/3", not part of a
          // bigger expression) renders as a stacked num/bar/den block with
          // no per-node chip of its own — elFor(id) can't find it, so
          // combineReveal was silently falling back to a no-op "before"
          // (nothing highlighted, nothing faded) and the fraction just
          // vanished instead of transitioning. Target the fraction block
          // directly and give it the same plain fade → commit → pop as
          // every other single-value resolve (e.g. divideBothSides).
          if (ready.t === 'bin' && ready.op === '*' && isFrac(ready.a) && isFrac(ready.b)) {
            // No `continue` — the tree is untouched, this only SHOWS what the
            // multiplication about to happen is made of.
            // eslint-disable-next-line no-await-in-loop
            await splitTimes()
          }

          // Any operation with a fraction in it takes this path too, not just a
          // lone top-level one. combineReveal counts UP to the numeric value it
          // is given, and the numeric value of 5/6 is 0.833… — so merging two
          // fractions flashed a decimal on screen before React swapped in the
          // fraction. The decimal is exactly what this whole change exists to
          // keep off the board.
          const involvesFraction = ready.t === 'bin' && (isFrac(ready.a) || isFrac(ready.b))
          const isTopLevelFraction = involvesFraction ||
            (id === term.expr.id && ready.t === 'bin' && ready.op === '/')
          if (isTopLevelFraction) {
            // Custom (not the shared revealStep) so the numerator and
            // denominator chips tint blue too, not just the bar — .frac-bar
            // uses currentColor so it alone picked up the highlight before.
            // The result also needs to pop in ALREADY blue (not fade to
            // blue after appearing), then settle back to white.
            // EXCEPT a fraction with its own explicit color (term.color,
            // e.g. tied to a matching colored triangle edge) — that's never
            // overridden by this generic "about to change" cue, only by an
            // actual combine with another term.
            const hasOwnColor = !!term.color
            // Every fraction taking part goes together — an addition has two of
            // them, and fading only the first left the other sitting there.
            const fracBlocks = [...(wrap()?.querySelectorAll('.expr-fraction') ?? [])]
            // eslint-disable-next-line no-await-in-loop
            if (fracBlocks.length) {
              const numDenEls = fracBlocks.flatMap(b => [...b.querySelectorAll('.term-cell')])
              if (!hasOwnColor) {
                // eslint-disable-next-line no-await-in-loop
                await gsap.to([...fracBlocks, ...numDenEls], { color: '#60a5fa', duration: 0.35, ease: 'power2.out' }).then()
              }
              // eslint-disable-next-line no-await-in-loop
              await wait(0.75)

              // Two fractions combine the way "3 + 4" combines: the second one
              // TRAVELS into the first and the answer appears where the first
              // stood. Fading both out and popping a new one in said "these
              // were replaced" — which is not what happened, and on a reused
              // DOM node it read as one term shrinking and growing back.
              if (fracBlocks.length >= 2) {
                const [anchorBlk, flyerBlk] = fracBlocks
                const ra = anchorBlk.getBoundingClientRect()
                const rb = flyerBlk.getBoundingClientRect()
                flyerBlk.style.animation = 'none'
                // The anchor takes the hit as the other lands — the same 1.16
                // nudge combineTerms gives it. Fired and NOT awaited: a later
                // tween on the anchor's scale overwrites this one, and gsap
                // never settles the promise of a tween it killed, so awaiting
                // it hung the whole solve on the frame it was replaced.
                gsap.to(anchorBlk, {
                  scale: 1.16, duration: 0.11, delay: 0.5,
                  ease: 'back.out(2.5)', yoyo: true, repeat: 1,
                })
                // eslint-disable-next-line no-await-in-loop
                await gsap.to(flyerBlk, {
                  x: (ra.left - rb.left) + (ra.width - rb.width) / 2,
                  y: ra.top - rb.top,
                  opacity: 0,
                  duration: 0.62, ease: 'power2.inOut',
                }).then()
                // The anchor STAYS. Only its numbers change — it is the same
                // fraction, now holding the answer. Hiding it and fading a new
                // one in said "this one was removed", which is not what
                // happened: 2/3 did not go anywhere, it became 6/12.
              }
              // A lone fraction resolving on its own does NOT fade out either —
              // it is the same block, changing.
            }
            // The answer is written into the cells that are ALREADY on screen,
            // and React is only told afterwards.
            //
            // Committing first does not work however quietly it is done:
            // collapsing "2/3 · 3/4" into "6/12" moves the fraction from the
            // nested ExprNode path to ExprTerm's top-level one, so React
            // unmounts that block and mounts a different one. That is a delete
            // and a respawn, and no amount of killing termEnter changes it.
            //
            // So the result is worked out on a THROWAWAY copy of the node, the
            // two digits are written straight into the live cells, and they pop
            // right there. Only then is the real tree collapsed and the state
            // pushed — by which point React's render matches what is already on
            // screen, so its swap is invisible.
            const preview = deepClone(ready)
            applyReady(preview)
            const liveCells = [...(wrap()?.querySelector('.expr-fraction')
              ?.querySelectorAll('.term-cell') ?? [])].slice(0, 2)
            const inPlace = preview.t === 'bin' && preview.op === '/' && liveCells.length === 2
            if (inPlace) {
              liveCells[0].textContent = String(Math.abs(preview.a.v))
              liveCells[1].textContent = String(Math.abs(preview.b.v))
              liveCells.forEach(c => { c.style.animation = 'none' })
              // The new digits are on screen first, on their own, and the pop
              // comes after them — it emphasises a number the reader has
              // already seen change, instead of landing on the same frame.
              // eslint-disable-next-line no-await-in-loop
              await wait(0.18)
              // eslint-disable-next-line no-await-in-loop
              await gsap.fromTo(liveCells, { scale: 1 },
                { scale: 1.18, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
            }
            applyReady(ready)
            flushSync(() => setState(state.snapshot()))
            // Nothing React just mounted gets to play its termEnter pop.
            for (const c of document.querySelectorAll('.term-cell, .expr-fraction')) {
              c.style.animation = 'none'
            }
            // React reuses the same DOM node for the fraction block, so the
            // fade-out's inline opacity/scale ends up sitting on the RESULT and
            // the answer never comes back.
            //
            // Only the blocks that are NOT about to pop get cleared, though.
            // Snapping the popping one to full size first made the move read
            // backwards — shrink out, flash big, shrink again, grow — instead of
            // the answer simply arriving. It goes straight from the fade-out
            // into its own pop.
            const nowBlocks = [...(wrap()?.querySelectorAll('.expr-fraction') ?? [])]
            // The result of a fraction op can be a fraction again — (2/3)/(3/4)
            // is 8/9 — and a fraction has no per-node chip, so elFor(id) finds
            // nothing on its own.
            // Already done in place above — there is nothing left to animate.
            const after = inPlace ? null : (elFor(id) ?? nowBlocks[0])
            nowBlocks.filter(b => b !== after).forEach(b => gsap.set(b, { opacity: 1, scale: 1 }))
            // Belt and braces: the outgoing fade no longer touches scale, so
            // anything still carrying one came from an earlier step.
            if (after) gsap.set(after, { scale: 1 })
            if (after) {
              // Nothing to fade back in — the block never left. It is visible,
              // at full size, and its digits have just changed; all it does is
              // pop to say so.
              gsap.set(after, { opacity: 1, scale: 1 })
              if (hasOwnColor) {
                // eslint-disable-next-line no-await-in-loop
                await gsap.fromTo(after, { scale: 1 },
                  { scale: 1.18, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
              } else {
                // Color is never snapped with gsap.set — it fades in together
                // with the pop (both tweened, starting from whatever color is
                // already there) so it reads as "arriving already blue", not
                // "appears white then jumps blue".
                // eslint-disable-next-line no-await-in-loop
                await Promise.all([
                  gsap.fromTo(after, { scale: 1 },
                    { scale: 1.18, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 }).then(),
                  gsap.to(after, { color: '#60a5fa', duration: 0.4, ease: 'power2.out' }).then(),
                ])
                // eslint-disable-next-line no-await-in-loop
                await wait(0.3)
                // eslint-disable-next-line no-await-in-loop
                await gsap.to(after, { color: '', duration: 0.35, ease: 'power2.out' }).then()
              }
            }
            // eslint-disable-next-line no-await-in-loop
            await wait(0.75)
          } else if (ready.t === 'bin' && ready.op === '*') {
            // A binary op merges two chips into one — fly them together (× gets
            // its own repeated-addition count-up commit, +/−/÷ just pop). Any
            // other ready op (a lone leaf's pi-reveal, an exponent, a √, a
            // unary negation) only ever touches ONE chip — plain spotlight reveal.
            // eslint-disable-next-line no-await-in-loop
            await countUpReveal(() => elFor(id), ready, () => elFor(id))
          } else if (ready.t === 'bin') {
            // eslint-disable-next-line no-await-in-loop
            await combineReveal(() => elFor(id), ready, () => elFor(id))
          } else {
            // eslint-disable-next-line no-await-in-loop
            await revealStep(() => elFor(id), () => applyReady(ready), () => elFor(id))
          }
          ready = findReady(term.expr)
        }

        // ── Reducing is its OWN step ──────────────────────────────────────
        // 6/12 does not simply arrive as 1/2. Dividing both halves by the same
        // number is the whole of one lesson, so it is shown the way amplify
        // shows its ×k: a "÷g" beside each half, then the two numbers change in
        // place. Nothing above ever reduces silently, which is what keeps this
        // step worth watching.
        if (isFrac(term.expr)) {
          const g = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b] } return a || 1 }
          const d = g(term.expr.a.v, term.expr.b.v)
          if (d > 1) {
            // eslint-disable-next-line no-await-in-loop
            await subStep()
            const w0    = wrap()
            const block = w0?.querySelector('.expr-fraction')
            const cells = block ? [...block.querySelectorAll('.term-cell')].slice(0, 2) : []
            const marks = cells.map(c => {
              const r  = c.getBoundingClientRect()
              const el = document.createElement('div')
              el.className = '_anim-overlay eq-times-mark'
              el.textContent = `÷${d}`
              el.style.cssText = `position:fixed; left:${r.right + 8}px; top:${r.top + r.height / 2}px;`
                + 'transform:translateY(-50%); opacity:0;'
              document.body.appendChild(el)
              return el
            })
            if (marks.length) {
              // eslint-disable-next-line no-await-in-loop
              await gsap.to(marks, { opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.14 }).then()
              // eslint-disable-next-line no-await-in-loop
              await wait(1.1)
            }
            term.expr.a.v /= d
            term.expr.b.v /= d
            // A denominator of 1 is not a fraction any more — it is the number.
            if (term.expr.b.v === 1) {
              const v = term.expr.a.v
              for (const k of Object.keys(term.expr)) { if (k !== 'id') delete term.expr[k] }
              term.expr.t = 'num'
              term.expr.v = v
            }
            flushSync(() => setState(state.snapshot()))
            const parts = [...(wrap()?.querySelectorAll('.expr-fraction .term-cell') ?? [])].slice(0, 2)
            parts.forEach(c => { c.style.animation = 'none' })
            // eslint-disable-next-line no-await-in-loop
            await Promise.all([
              parts.length
                ? gsap.fromTo(parts, { scale: 1 },
                    { scale: 1.18, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
                : Promise.resolve(),
              marks.length
                ? gsap.to(marks, { opacity: 0, filter: 'blur(6px)', duration: 0.32, ease: 'power2.in' }).then()
                : Promise.resolve(),
            ])
            marks.forEach(el => el.remove())
            // eslint-disable-next-line no-await-in-loop
            await wait(0.8)
          }
        }

        // Still has an unresolved label, or the root is a ± branch point not
        // yet chosen — leave it exactly as revealed so far (e.g. √Δ already
        // shows its decimal value even though "−b ± 7" itself stays put).
        if (!isNum(term.expr)) continue

        const finalVal = term.expr.v
        const pos      = (term.side === 'left' ? state.left : state.right).indexOf(term)
        const newId    = crypto.randomUUID()

        // The value is already showing correctly from the reveal above —
        // this only swaps the term's internal representation (expr leaf →
        // plain algebra term, so combine/send/divide can use it). The
        // NUMBER itself never changes here, so no color tint / fade / pop
        // — that was a second, redundant transition on a value that never
        // actually moved. Silent commit; suppress the fresh element's CSS
        // mount animation so the swap is invisible, same trick used
        // everywhere else in this file.
        state.remove(term.id)
        state.insertAt(new MathObject({
          id: newId, sign: finalVal >= 0 ? '+' : '-', coefficient: Math.abs(finalVal),
          variable: null, degree: 0, color: term.color ?? null,
        }), term.side, pos)
        flushSync(() => setState(state.snapshot()))
        const foldedInner = getCellInner(findWrapById(refs(), state, newId))
        if (foldedInner) foldedInner.style.animation = 'none'
      }

      // ── Phase 0b1b: "2 · x" is the term 2x ────────────────────────────────
      // A term can arrive as a product of a number and a label — 2 · x — from an
      // expression tree the reveal loop cannot reduce, because the label has no
      // value to reduce it with. Everything downstream that isolates an unknown
      // works on a coefficient and a variable, so such a term stopped the solve
      // dead. They are the same term written two ways; folding it here lets the
      // division that follows do its ordinary job.
      for (const side of ['left', 'right']) {
        const arr = side === 'left' ? state.left : state.right
        for (const t of [...arr]) {
          const e = t.expr
          if (!e || e.t !== 'bin' || e.op !== '*') continue
          const pair = e.a.t === 'num' && e.b.t === 'label' ? [e.a, e.b]
            : e.a.t === 'label' && e.b.t === 'num' ? [e.b, e.a]
              : null
          if (!pair) continue
          const [n, lab] = pair
          const signed = (t.sign === '-' ? -1 : 1) * n.v
          const pos = arr.indexOf(t)
          const newId = crypto.randomUUID()
          state.remove(t.id)
          state.insertAt(new MathObject({
            id: newId, sign: signed < 0 ? '-' : '+', coefficient: Math.abs(signed),
            variable: lab.name, degree: 1, color: t.color ?? null, decimalComma: t.decimalComma,
          }), side, pos)
          flushSync(() => setState(state.snapshot()))
          // Same silent commit as the fold above it: the value on screen does not
          // change, only how the term is stored, so it must not pop.
          const inner = getCellInner(findWrapById(refs(), state, newId))
          if (inner) inner.style.animation = 'none'
        }
      }

      // ── Phase 0b2: an expr-tree term stuck as "label / number" ────────────
      // e.g. the Law of Sines' own b/sinB = a/sinA — after A and B get
      // replaced but b is deliberately left alone, the fraction can never
      // fully reduce (findReady never resolves past a bare label), so the
      // main loop above leaves it exactly as "b / 0.707". That's still just
      // as isolatable as any classic "coefficient·x" term: multiply both
      // sides by the divisor. Scoped narrowly (exactly one term per side) —
      // anything messier is left to whatever Phase 1 already does with it.
      {
        const exprTerms = [...state.left, ...state.right].filter(t => t.expr)
        const stuck = exprTerms.find(t =>
          t.expr.t === 'bin' && t.expr.op === '/' &&
          t.expr.a.t === 'label' && isNum(t.expr.b)
        )
        const stuckArr  = stuck && (stuck.side === 'left' ? state.left : state.right)
        const otherSide = stuck && (stuck.side === 'left' ? 'right' : 'left')
        const otherArr  = otherSide && (otherSide === 'left' ? state.left : state.right)
        const otherTerm = otherArr?.[0]
        if (stuck && stuckArr.length === 1 && otherArr.length === 1 &&
            otherTerm && !otherTerm.variable && !otherTerm.expr && !otherTerm.isFraction) {
          const divisor = stuck.expr.b.v
          await subStep()
          // eslint-disable-next-line no-await-in-loop
          await revealStep(
            () => [getCellInner(getWrap(refs(), stuck.side, stuck.cellIndex)),
                   getCellInner(getWrap(refs(), otherTerm.side, otherTerm.cellIndex))],
            () => {
              stuck.expr = { t: 'label', id: crypto.randomUUID(), name: stuck.expr.a.name }
              const nv = otherTerm.value * divisor
              otherTerm.sign = nv >= 0 ? '+' : '-'
              otherTerm.coefficient = Math.abs(parseFloat(nv.toFixed(4)))
            },
            () => [getCellInner(getWrap(refs(), stuck.side, stuck.cellIndex)),
                   getCellInner(getWrap(refs(), otherTerm.side, otherTerm.cellIndex))],
          )
        }
      }

      // ── Phase 0b3: one side is fn(sin/cos/tan, label) — the trig arg is a
      // bare unknown deliberately left unresolved (e.g. sin(θ) after only
      // the ratio side got replaced), the other side is a plain number —
      // apply the inverse trig function to both sides, same as a student
      // clearing sin(θ)=0.8 by taking arcsin of both sides. Scoped exactly
      // like 0b2 (one term per side); anything messier is left alone.
      {
        const exprTerms = [...state.left, ...state.right].filter(t => t.expr)
        const trigStuck = exprTerms.find(t =>
          t.expr.t === 'fn' && ['sin', 'cos', 'tan'].includes(t.expr.name) && t.expr.arg.t === 'label'
        )
        const trigArr   = trigStuck && (trigStuck.side === 'left' ? state.left : state.right)
        const otherSide2 = trigStuck && (trigStuck.side === 'left' ? 'right' : 'left')
        const otherArr2  = otherSide2 && (otherSide2 === 'left' ? state.left : state.right)
        const otherTerm2 = otherArr2?.[0]
        if (trigStuck && trigArr.length === 1 && otherArr2.length === 1 &&
            otherTerm2 && !otherTerm2.variable && !otherTerm2.expr && !otherTerm2.isFraction) {
          const trigName  = trigStuck.expr.name
          const angleRad  = Math[`a${trigName}`](otherTerm2.value)
          const angleDeg  = parseFloat((angleRad * 180 / Math.PI).toFixed(2))
          if (isFinite(angleDeg)) {
            const argLabel = trigStuck.expr.arg.name
            const argColor = trigStuck.expr.arg.color
            await subStep()

            // Show the OPERATION, not just its answer. A bare revealStep here
            // faded 0.8 out and 53.13 in, which tells the reader nothing about
            // where the angle came from — the sine simply turned into a number.
            // So play the same beat the standalone eq-apply-inverse-trig plays:
            // wrap BOTH sides in arcsin( … ), hold long enough to read it, and
            // only then let arcsin(sin(θ)) collapse to θ and arcsin(0.8) to the
            // angle. Same maths, same final state — the step is just visible now.
            const LABEL  = `arc${trigName}(`
            const opIds  = [crypto.randomUUID(), crypto.randomUUID(),
                            crypto.randomUUID(), crypto.randomUUID()]
            const mkOp   = (id, text) => new MathObject({
              id, isOperator: true, text, sign: '+', coefficient: 0, variable: null, degree: 0,
            })
            // Lengths BEFORE the inserts — both arrays are live, and the closing
            // paren has to land after the content, not after the opening one.
            const trigLen = trigArr.length, numLen = otherArr2.length
            state.insertAt(mkOp(opIds[0], LABEL), trigStuck.side,  0)
            state.insertAt(mkOp(opIds[1], ')'),   trigStuck.side,  trigLen + 1)
            state.insertAt(mkOp(opIds[2], LABEL), otherTerm2.side, 0)
            state.insertAt(mkOp(opIds[3], ')'),   otherTerm2.side, numLen + 1)
            flushSync(() => setState(state.snapshot()))

            const opEls = opIds
              .map(id => { const t = state.findById(id); return t ? getWrap(refs(), t.side, t.cellIndex) : null })
              .filter(Boolean)
            if (opEls.length) {
              gsap.set(opEls, { opacity: 0 })
              // eslint-disable-next-line no-await-in-loop
              await gsap.to(opEls, { opacity: 1, duration: 0.35, ease: 'back.out(1.5)', stagger: 0.06 }).then()
            }
            // eslint-disable-next-line no-await-in-loop
            await wait(0.9)

            // eslint-disable-next-line no-await-in-loop
            await revealStep(
              () => [...opEls,
                     getCellInner(getWrap(refs(), trigStuck.side, trigStuck.cellIndex)),
                     getCellInner(getWrap(refs(), otherTerm2.side, otherTerm2.cellIndex))],
              () => {
                opIds.forEach(id => state.remove(id))
                trigStuck.expr = { t: 'label', id: crypto.randomUUID(), name: argLabel, color: argColor }
                otherTerm2.sign = angleDeg >= 0 ? '+' : '-'
                otherTerm2.coefficient = Math.abs(angleDeg)
              },
              () => [getCellInner(getWrap(refs(), trigStuck.side, trigStuck.cellIndex)),
                     getCellInner(getWrap(refs(), otherTerm2.side, otherTerm2.cellIndex))],
            )
          }
        }
      }

      // ── Phase 0c: evaluate numeric power terms (e.g. 3² → 9 after variable substitution) ──
      {
        const powTerms = [...state.left, ...state.right].filter(
          t => !t.expr && !t.isFraction && !Array.isArray(t.factors) && t.variable == null &&
               t.symbolicLabel === undefined && t.degree > 1
        )
        for (const term of powTerms) {
          const val   = Math.round(Math.pow(term.coefficient, term.degree) * 10000) / 10000
          const pos   = (term.side === 'left' ? state.left : state.right).indexOf(term)
          const newId = crypto.randomUUID()

          // eslint-disable-next-line no-await-in-loop
          await subStep()
          // eslint-disable-next-line no-await-in-loop
          await revealStep(
            () => getCellInner(getWrap(refs(), term.side, term.cellIndex)),
            () => {
              state.remove(term.id)
              state.insertAt(new MathObject({
                id: newId, sign: term.sign, coefficient: val,
                variable: null, degree: 0, color: term.color ?? null,
              }), term.side, pos)
            },
            () => getCellInner(findWrapById(refs(), state, newId)),
          )
        }
      }

      // ── Phase 0d: treat a leftover symbolic label as THE unknown to isolate ──
      // After substitution the remaining label (e.g. b in "7 = 9 + b") is the
      // thing to solve for. The algebra solver works on real variables, so give it
      // a real variable name. Only do this when exactly ONE distinct label remains.
      {
        const symTerms = [...state.left, ...state.right]
          .filter(t => t.symbolicLabel !== undefined && !t.isFraction && !t.factors)
        const distinct = [...new Set(symTerms.map(t => t.symbolicLabel))]
        if (distinct.length === 1) {
          symTerms.forEach(t => {
            t.variable = t.symbolicLabel
            t.symbolicLabel = undefined
            if (t.degree === 0) t.degree = 1
          })
          flushSync(() => setState(state.snapshot()))
        }
      }

      // ── Phase 1: algebra (combine like terms, send to other side, divide) ──
      const subActions = generateScript(state.snapshot())
      for (const sub of subActions) {
        // 'renderEquation' is redundant here (state already reflects live).
        // 'showTitle' is generateScript's own "Solving: <eq>" debug caption —
        // outside this internal replay it's filtered by executeScript's
        // skipTitle option, but that option doesn't reach this direct
        // runAction call, so it was clobbering the PAGE's real title with
        // "Solving: undefined" (generateScript is called here with no
        // original-equation-text argument) every time eq-full-solve ran.
        if (sub.type === 'renderEquation' || sub.type === 'showTitle') continue
        // eslint-disable-next-line no-await-in-loop
        await subStep()
        // eslint-disable-next-line no-await-in-loop
        await runAction(sub, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
        // A beat between mini-steps. This loop used to run them back to back,
        // so the whole solve was paced only by whatever waits each action
        // happened to contain internally — several have almost none, and those
        // stretches went past far too fast to follow. One pause here paces the
        // entire solve, and it still obeys a hurry like every other wait.
        // eslint-disable-next-line no-await-in-loop
        await wait(0.45)
      }

      // ── Highlight + pop the final result, in the reserved color ──────────
      // Fires whenever this pass ended with a bare number alone on one side
      // (the answer) — true for an ordinary "x = 5", each quadratic branch's
      // "Δ = 1"/"x₁ = 3"/"x₂ = 2", etc. Silently no-ops otherwise (e.g. mid
      // formula states that still hold a fraction, not a plain number).
      // The box is a real overlay sized to the equation's own measured content
      // rect (equationRef.getCellRects, the same helper the "frame whole
      // equation" comment uses) — never the full-width grid container, which
      // would stretch edge-to-edge regardless of how short the equation is.
      // Corner radius matches .term-cell's own (13px), not a full pill/circle.
      {
        const resultTerm = [...state.left, ...state.right].find(t =>
          !t.variable && !t.isFraction && !t.factors && t.symbolicLabel === undefined &&
          (t.side === 'left' ? state.left : state.right).length === 1
        )
        // Every cell in the equation turns blue — not just the result side —
        // so "x = 5" ends with BOTH "x" and "5" tinted, not just the answer.
        const allInners = resultTerm && [...state.left, ...state.right]
          .map(t => getCellInner(getWrap(refs(), t.side, t.cellIndex)))
          .filter(Boolean)
        if (resultTerm && allInners.length) {
          await subStep()
          // Measured AFTER the gate, never before it. The gate parks until the
          // reader clicks, and the equation can change while it waits — in the
          // quadratic solve the label goes from "x" to "x₁" right there. A rect
          // taken before the wait described the previous equation, so the ring
          // was drawn to the old width and cut straight through the new label.
          const rect = equationRef?.current?.getCellRects?.({ side: 'both' })?.[0]
          if (!rect) break
          document.querySelectorAll('.final-result-highlight').forEach(el => el.remove())
          const box = document.createElement('div')
          box.className = 'final-result-highlight _anim-overlay'
          box.style.cssText = `
            position:fixed; left:${rect.left}px; top:${rect.top}px;
            width:${rect.width}px; height:${rect.height}px;
            border-radius:13px; pointer-events:none; z-index:5;
            box-shadow:0 0 0 3px #60a5fa, 0 0 24px #60a5fa66;
          `
          document.body.appendChild(box)
          gsap.set(box, { transformOrigin: 'center center' })
          await Promise.all([
            gsap.to(box,       { scale: 1.06, duration: 0.35, ease: 'back.out(2.2)' }).then(),
            gsap.to(allInners, { color: '#60a5fa', duration: 0.35 }).then(),
          ])
          await gsap.to(box, { scale: 1, duration: 0.35, ease: 'power2.out' }).then()
        }
      }
      break
    }

    // ── Arithmetic display ────────────────────────────────────────────────────

    case 'arith-init': {
      const { a, op, b } = action
      arithRef?.current?.init(a, op, b)
      await wait(0.8)
      break
    }

    case 'arith-col-highlight': {
      arithRef?.current?.patch({ highlightedCol: action.col ?? null })
      if (action.col != null) await wait(0.35)
      break
    }

    case 'arith-borrow': {
      if (!arithRef?.current) break
      const ar = arithRef.current
      const { fromCol, toCol, newFromDigit, newToDigit } = action
      // fromCol first: cross it out + show reduced digit above
      ar.patchCol(fromCol, { topCrossed: true, topSmall: newFromDigit })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const cellFrom = ar.getEl(`small_${fromCol}`)
      const spanFrom = cellFrom?.querySelector('.arith-small--borrow')
      if (spanFrom) {
        gsap.set(spanFrom, { opacity: 0, y: -10, scale: 0.5 })
        await gsap.to(spanFrom, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.8)' }).then()
      }
      await wait(0.3)
      // Then toCol: show the borrowed-extended digit above
      ar.patchCol(toCol, { topSmall: newToDigit })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const cellTo = ar.getEl(`small_${toCol}`)
      const spanTo = cellTo?.querySelector('.arith-small--borrow')
      if (spanTo) {
        gsap.set(spanTo, { opacity: 0, y: -10, scale: 0.5 })
        await gsap.to(spanTo, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.8)' }).then()
      }
      await wait(0.4)
      break
    }

    case 'arith-carry': {
      if (!arithRef?.current) break
      const { col, digit } = action
      arithRef.current.patchCol(col, { carryDigits: digit, carryVisible: true })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const cell = arithRef.current.getEl(`small_${col}`)
      const span = cell?.querySelector('.arith-small--carry')
      if (span) {
        gsap.set(span, { opacity: 0, scale: 0.4 })
        await gsap.to(span, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }).then()
      }
      await wait(0.3)
      break
    }

    // ── Side calc: set up invisible bubble structure ──────────────────────────
    case 'arith-side-calc-setup': {
      if (!arithRef?.current) break
      const { top, op, bot, result } = action
      arithRef.current.patch({ sideCalc: { top, op, bot, result }, sideCalcBubbleVisible: false })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      // Fade in the bubble background (parts still invisible)
      arithRef.current.patch({ sideCalcBubbleVisible: true })
      await wait(0.4)
      break
    }

    // ── Fly a digit ghost from main calc into the side calc bubble ────────────
    case 'arith-fly-digit': {
      if (!arithRef?.current) break
      const { col, part, text } = action  // part: 'top' | 'bot'
      const ar = arithRef.current
      // Source: prefer the borrow small span (if borrow just happened), else the main top digit
      let srcSpan
      if (part === 'top') {
        const smallCell = ar.getEl(`small_${col}`)
        const topCell   = ar.getEl(`top_${col}`)
        srcSpan = smallCell?.querySelector('.arith-small--borrow')
               ?? topCell?.querySelector('.arith-digit--top')
      } else {
        const botCell = ar.getEl(`bot_${col}`)
        srcSpan = botCell?.querySelector('.arith-digit--bot')
      }
      const dstSpan = ar.getEl(part === 'top' ? 'scTop' : 'scBot')
      if (!srcSpan || !dstSpan) break

      const srcR  = srcSpan.getBoundingClientRect()
      const dstR  = dstSpan.getBoundingClientRect()
      const ghost = document.createElement('div')
      ghost.className = '_anim-overlay'
      Object.assign(ghost.style, {
        position: 'fixed', zIndex: '9999', pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        left: srcR.left + 'px', top: srcR.top + 'px',
        width: srcR.width + 'px', height: srcR.height + 'px',
        fontSize: getComputedStyle(srcSpan).fontSize,
        fontWeight: '800',
        color: getComputedStyle(srcSpan).color,
      })
      ghost.textContent = text
      document.body.appendChild(ghost)

      const dx = (dstR.left + dstR.width / 2) - (srcR.left + srcR.width / 2)
      const dy = (dstR.top  + dstR.height / 2) - (srcR.top  + srcR.height / 2)
      await gsap.to(ghost, {
        x: dx, y: dy,
        fontSize: '1.9rem',
        color: '#78350f',
        duration: 0.6, ease: 'power2.inOut',
      }).then()
      ghost.remove()

      // Reveal the actual part in the bubble
      if (dstSpan) gsap.to(dstSpan, { opacity: 1, duration: 0.15 })
      // Reveal the operator sign after BOTH operands have landed
      if (part === 'bot') {
        const scOp = ar.getEl('scOp')
        if (scOp) gsap.to(scOp, { opacity: 1, duration: 0.25, delay: 0.1 })
      }
      await wait(0.2)
      break
    }

    // ── Show = result inside the side calc bubble ─────────────────────────────
    case 'arith-sc-show-eq': {
      if (!arithRef?.current) break
      const ar = arithRef.current
      const scEq  = ar.getEl('scEq')
      const scRes = ar.getEl('scRes')
      const els = [scEq, scRes].filter(Boolean)
      if (els.length) {
        gsap.set(els, { opacity: 0 })
        await gsap.to(els, { opacity: 1, duration: 0.35, stagger: 0.12 }).then()
      }
      await wait(0.3)
      break
    }

    // ── Fly result ghost from side calc back to main result cell ──────────────
    case 'arith-fly-result': {
      if (!arithRef?.current) break
      const { col, text } = action
      const ar = arithRef.current
      const srcSpan = ar.getEl('scRes')
      const dstCell = ar.getEl(`result_${col}`)
      if (!srcSpan || !dstCell) break

      const srcR  = srcSpan.getBoundingClientRect()
      const dstR  = dstCell.getBoundingClientRect()
      const ghost = document.createElement('div')
      ghost.className = '_anim-overlay'
      Object.assign(ghost.style, {
        position: 'fixed', zIndex: '9999', pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        left: srcR.left + 'px', top: srcR.top + 'px',
        width: srcR.width + 'px', height: srcR.height + 'px',
        fontSize: '1.9rem', fontWeight: '800', color: '#1d4ed8',
      })
      ghost.textContent = text
      document.body.appendChild(ghost)

      const dx = (dstR.left + dstR.width / 2) - (srcR.left + srcR.width / 2)
      const dy = (dstR.top  + dstR.height / 2) - (srcR.top  + srcR.height / 2)
      await gsap.to(ghost, {
        x: dx, y: dy,
        fontSize: '3.8rem',
        duration: 0.65, ease: 'power2.inOut',
      }).then()
      ghost.remove()

      // Now reveal the real result digit in the main calc
      arithRef.current.patchCol(col, { resultVisible: true })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const span = dstCell?.querySelector('.arith-digit--result')
      if (span) {
        gsap.set(span, { opacity: 0 })
        gsap.to(span, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' })
      }
      await wait(0.3)
      break
    }

    // ── Hide the side calc bubble ─────────────────────────────────────────────
    case 'arith-side-calc-hide': {
      if (!arithRef?.current) break
      arithRef.current.patch({ sideCalcBubbleVisible: false })
      await wait(0.45)
      arithRef.current.patch({ sideCalc: null })
      break
    }

    // ── Hint overlay (explains negative / carry) ──────────────────────────────
    case 'arith-hint': {
      if (!arithRef?.current) break
      arithRef.current.patch({ hint: action.text, hintVisible: false })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      arithRef.current.patch({ hintVisible: true })
      await wait(0.3)
      break
    }

    case 'arith-hint-hide': {
      if (!arithRef?.current) break
      arithRef.current.patch({ hintVisible: false })
      await wait(0.4)
      arithRef.current.patch({ hint: null })
      break
    }

    case 'arith-show-result': {
      // Used for simple cases (÷, leading zeros) where no ghost fly is needed
      if (!arithRef?.current) break
      const { col } = action
      arithRef.current.patchCol(col, { resultVisible: true })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const cell = arithRef.current.getEl(`result_${col}`)
      const span = cell?.querySelector('.arith-digit--result')
      if (span) {
        gsap.set(span, { opacity: 0, scale: 0.25, y: -18 })
        await gsap.to(span, { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(2)' }).then()
      }
      await wait(0.35)
      break
    }

    case 'arith-clear': {
      arithRef?.current?.clearAll()
      break
    }

    // ── Multiplication table ──────────────────────────────────────────────────

    case 'mult-init': {
      if (!multRef?.current) break
      const { maxN } = action
      multRef.current.init(maxN)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      // Stagger-in: headers first, then result cells row by row
      const N = maxN
      const headerEls = []
      for (let i = 0; i <= N; i++) headerEls.push(multRef.current.getEl(`cell_0_${i}`))
      for (let r = 1; r <= N; r++) headerEls.push(multRef.current.getEl(`cell_${r}_0`))

      const resultEls = []
      for (let r = 1; r <= N; r++)
        for (let c = 1; c <= N; c++)
          resultEls.push(multRef.current.getEl(`cell_${r}_${c}`))

      const all = [...headerEls, ...resultEls].filter(Boolean)
      gsap.set(all, { opacity: 0, scale: 0.4 })
      gsap.to(headerEls.filter(Boolean), {
        opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.6)',
        stagger: 0.04,
      })
      await gsap.to(resultEls.filter(Boolean), {
        opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.4)',
        stagger: { amount: 1.2, from: 'start' },
        delay: 0.3,
      }).then()
      await wait(0.4)
      break
    }

    case 'mult-highlight': {
      if (!multRef?.current) break
      const { row, col } = action
      multRef.current.highlight(row, col)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      // Pulse the row + col headers
      const rowHeader = multRef.current.getEl(`cell_${row}_0`)
      const colHeader = multRef.current.getEl(`cell_0_${col}`)
      const resultCell = multRef.current.getEl(`cell_${row}_${col}`)

      if (rowHeader) gsap.fromTo(rowHeader, { scale: 1 }, { scale: 1.18, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 })
      if (colHeader) gsap.fromTo(colHeader, { scale: 1 }, { scale: 1.18, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1, delay: 0.08 })
      if (resultCell) {
        await wait(0.3)
        await gsap.fromTo(resultCell, { scale: 1 }, { scale: 1.35, duration: 0.3, ease: 'back.out(2)', yoyo: true, repeat: 1 }).then()
      }
      await wait(0.3)
      break
    }

    case 'mult-clear-highlight': {
      multRef?.current?.clearHighlight()
      await wait(0.3)
      break
    }

    case 'mult-clear': {
      multRef?.current?.clearAll()
      break
    }

    // ── Clock ─────────────────────────────────────────────────────────────────

    case 'clock-show': {
      if (!clockRef?.current) break
      const { hour, minute } = action
      clockRef.current.init(hour, minute)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      // Entrance: scale-in the whole face group
      const svg  = clockRef.current.getEl('svg')
      const rim  = clockRef.current.getEl('rim')
      const face = clockRef.current.getEl('face')
      if (svg) {
        gsap.set(svg,  { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' })
        await gsap.to(svg, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.8)' }).then()
      }

      // Animate hands from 12:00 to the target time
      const hourAngle   = ((hour % 12) + minute / 60) * 30
      const minuteAngle = minute * 6
      const hEl = clockRef.current.getEl('hour-hand')
      const mEl = clockRef.current.getEl('minute-hand')
      if (hEl) gsap.set(hEl, { rotation: 0, svgOrigin: '200 200' })
      if (mEl) gsap.set(mEl, { rotation: 0, svgOrigin: '200 200' })
      await wait(0.3)
      await Promise.all([
        hEl ? gsap.to(hEl, { rotation: hourAngle,   svgOrigin: '200 200', duration: 1.0, ease: 'power2.inOut' }).then() : Promise.resolve(),
        mEl ? gsap.to(mEl, { rotation: minuteAngle, svgOrigin: '200 200', duration: 1.4, ease: 'power2.inOut' }).then() : Promise.resolve(),
      ])
      await wait(0.4)
      break
    }

    case 'clock-set-time': {
      if (!clockRef?.current) break
      const { hour, minute } = action
      clockRef.current.setTime(hour, minute)
      const hourAngle   = ((hour % 12) + minute / 60) * 30
      const minuteAngle = minute * 6
      const hEl = clockRef.current.getEl('hour-hand')
      const mEl = clockRef.current.getEl('minute-hand')
      await Promise.all([
        hEl ? gsap.to(hEl, { rotation: hourAngle,   svgOrigin: '200 200', duration: 1.4, ease: 'power2.inOut' }).then() : Promise.resolve(),
        mEl ? gsap.to(mEl, { rotation: minuteAngle, svgOrigin: '200 200', duration: 1.8, ease: 'power2.inOut' }).then() : Promise.resolve(),
      ])
      await wait(0.4)
      break
    }

    case 'clock-highlight-hand': {
      if (!clockRef?.current) break
      const { hand } = action
      clockRef.current.highlight(hand)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const el = clockRef.current.getEl(`${hand}-hand`)
      if (el) {
        await gsap.fromTo(el,
          { scale: 1, svgOrigin: '200 200' },
          { scale: 1.08, svgOrigin: '200 200', duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1 }
        ).then()
      }
      await wait(0.3)
      break
    }

    case 'clock-clear-highlight': {
      clockRef?.current?.clearHighlight()
      await wait(0.3)
      break
    }

    case 'clock-clear': {
      clockRef?.current?.clearAll()
      break
    }

    // ── Number grid (children) ───────────────────────────────────────────────

    case 'numbers-show': {
      if (!numbersRef?.current) break
      flushSync(() => numbersRef.current.show())
      const cards = Array.from({ length: 9 }, (_, i) => numbersRef.current.getEl(`card-${i + 1}`)).filter(Boolean)
      gsap.set(cards, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' })
      await gsap.to(cards, {
        opacity: 1, scale: 1,
        duration: 0.45, ease: 'back.out(1.8)',
        stagger: 0.05,
      }).then()
      break
    }

    case 'numbers-show-numeral': {
      if (!numbersRef?.current) break
      const { n } = action
      numbersRef.current.showNumeral(n)
      await new Promise(r => requestAnimationFrame(r))
      const card = numbersRef.current.getEl(`card-${n}`)
      if (card) {
        const numEl = card.querySelector('.num-card-numeral')
        if (numEl) {
          gsap.fromTo(numEl, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' })
        }
      }
      break
    }

    case 'numbers-clear-highlight': {
      numbersRef?.current?.clearHighlight()
      break
    }

    case 'numbers-clear': {
      numbersRef?.current?.clearAll()
      break
    }

    // ── MDAS / order of operations (children) ────────────────────────────────

    case 'mdas-set-expr': {
      if (!mdasRef?.current) break
      // flushSync: React commits DOM before browser paints — gsap.set hides tokens first
      flushSync(() => mdasRef.current.setExpr(action.tokens))
      const exprEl = mdasRef.current.getEl('expr')
      if (exprEl) {
        const tokenEls = exprEl.querySelectorAll('.mdas-token')
        gsap.set(tokenEls, { opacity: 0, y: 30 })
        await gsap.to(tokenEls, { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.5)', stagger: 0.07 }).then()
      }
      break
    }

    case 'mdas-highlight': {
      if (!mdasRef?.current) break
      const { from, to, color, label } = action
      flushSync(() => mdasRef.current.highlight(from, to, color, label))
      const hlGroup = mdasRef.current.getEl('hl-group')
      const labelEl = mdasRef.current.getEl('step-label')
      // Hide label immediately (before paint) then animate both in
      if (labelEl) gsap.set(labelEl, { opacity: 0, y: 8 })
      if (hlGroup) {
        await gsap.fromTo(hlGroup,
          { scale: 0.88, opacity: 0 },
          { scale: 1,    opacity: 1, duration: 0.35, ease: 'back.out(2)' }
        ).then()
      }
      if (labelEl) {
        await gsap.to(labelEl, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' }).then()
      }
      break
    }

    case 'mdas-collapse': {
      if (!mdasRef?.current) break
      const { from, to, result, color } = action
      const hlGroup = mdasRef.current.getEl('hl-group')
      if (hlGroup) {
        await gsap.to(hlGroup, { scale: 0.6, opacity: 0, duration: 0.28, ease: 'power2.in' }).then()
      }
      flushSync(() => mdasRef.current.collapse(from, to, result, color))
      const resultEl = mdasRef.current.getEl('result-token')
      if (resultEl) {
        gsap.set(resultEl, { scale: 0.4, opacity: 0 })
        await gsap.to(resultEl, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.5)' }).then()
      }
      break
    }

    case 'mdas-show-final': {
      if (!mdasRef?.current) break
      flushSync(() => mdasRef.current.showFinal(action.value))
      const finalEl = mdasRef.current.getEl('final')
      if (finalEl) {
        gsap.set(finalEl, { opacity: 0, scale: 0.5 })
        await gsap.to(finalEl, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(2)' }).then()
      }
      const exprElFin = mdasRef.current.getEl('expr')
      if (exprElFin) {
        const tokenEls = exprElFin.querySelectorAll('.mdas-token')
        await gsap.to(tokenEls, { scale: 1.15, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
      }
      break
    }

    case 'mdas-clear': {
      mdasRef?.current?.clearAll()
      break
    }

    // ── Pizza Fractions ────────────────────────────────────────────────────
    case 'pizza-show': {
      const { slices, shaded, showLabel = true } = action
      pizzaRef?.current?.show(slices, shaded, showLabel)
      await wait(0.15 / speed)
      break
    }
    case 'pizza-shade': {
      pizzaRef?.current?.shade(action.shaded)
      await wait(0.4 / speed)
      break
    }
    case 'pizza-compare': {
      pizzaRef?.current?.compare(action.slices2, action.shaded2, action.showLabel2 ?? true)
      await wait(0.15 / speed)
      break
    }
    case 'pizza-clear': {
      pizzaRef?.current?.clearAll()
      break
    }

    // ── Object Counter ─────────────────────────────────────────────────────
    case 'counter-show': {
      counterRef?.current?.show(action.count, action.emoji)
      await wait(0.5 / speed)
      break
    }
    case 'counter-add': {
      counterRef?.current?.add(action.count, action.emoji)
      await wait(0.6 / speed)
      break
    }
    case 'counter-group': {
      counterRef?.current?.group(action.groupSize, action.color)
      await wait(0.3 / speed)
      break
    }
    case 'counter-remove': {
      counterRef?.current?.remove(action.count)
      await wait(0.5 / speed)
      break
    }
    case 'counter-clear': {
      counterRef?.current?.clearAll()
      break
    }

    // ── Number Line ────────────────────────────────────────────────────────
    case 'numberline-show': {
      numberlineRef?.current?.show(action.from, action.to)
      await wait(0.7 / speed)
      break
    }
    case 'numberline-mark': {
      numberlineRef?.current?.mark(action.value, action.label, action.color)
      await wait(0.5 / speed)
      break
    }
    case 'numberline-jump': {
      numberlineRef?.current?.jump(action.from, action.steps, action.size, action.color, action.label)
      await wait(0.8 / speed)
      break
    }
    case 'numberline-shade': {
      numberlineRef?.current?.shade(action.from, action.to, action.color)
      await wait(0.3 / speed)
      break
    }
    case 'numberline-clear': {
      numberlineRef?.current?.clearAll()
      break
    }

    // ── Celebrate ─────────────────────────────────────────────────────────
    case 'celebrate': {
      triggerCelebration()
      await wait(1.5 / speed)
      break
    }

    default:
      console.warn('[ActionExecutor] Unknown action:', action.type)
  }

  // After any graph mutation, pan/zoom so everything explicitly placed
  // (points, segment endpoints, function labels) is actually visible —
  // e.g. a second point added far from the first has no reason to already
  // be in frame. Skipped for the viewport actions themselves (would fight
  // a deliberate setViewport/adjustView) and ggb-clear (nothing left to fit).
  if (action.type?.startsWith('ggb-') &&
      action.type !== 'ggb-adjust-view' &&
      action.type !== 'ggb-set-viewport' &&
      action.type !== 'ggb-clear') {
    const calc = graphApi()
    if (calc) await graphEngine.ensureVisible(calc)
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

/** Every .term-wrap of a side, straight from the DOM.
 *
 * EquationDisplay empties its ref arrays during render and refills them when
 * React re-attaches the ref callbacks. A render that starts and is thrown away
 * leaves them empty, and then EVERY animation that looks a cell up here got
 * null and quietly did nothing: replaceVariable collected no elements so the
 * values swapped at full opacity with no fade out, applyInverseTrig had no
 * positions to measure so its FLIP never moved anything, and revealStep read
 * .style off a null and threw. The cells are in the DOM either way — the ref
 * arrays are bookkeeping, not the truth — so read them from it when the
 * bookkeeping is empty. Index order is the render order, the same order the
 * ref callbacks fill. */
function wrapsFromDom(side) {
  const sideEl = document.querySelector(`.equation-side[data-side="${side}"]`)
  return sideEl ? [...sideEl.querySelectorAll(':scope > .term-wrap')] : []
}

// Every id a removal step was given. A step written with one id still has
// exactly one here, so nothing that predates this reads any differently.
const idsOf = (action) => (Array.isArray(action.ids) && action.ids.length ? action.ids : [action.id])

/** .term-wrap at [side][index] — the GSAP-animated flex item. */
function getWrap(cellRefs, side, index) {
  return cellRefs[side]?.[index] ?? wrapsFromDom(side)[index] ?? null
}

/** .term-cell inside the wrapper — the visual box. A term whose WHOLE
 * value is a top-level fraction (e.g. a standalone "2/3") renders as
 * .expr-fraction (stacked num/bar/den) with no box of its own — its
 * numerator leaf is just the first .term-cell inside it. Without checking
 * for .expr-fraction first, callers that want "the whole term's box" would
 * silently grab that numerator leaf instead and mutate/fade only IT,
 * leaving the denominator and bar behind — a garbled half-updated fraction. */
function getCellInner(wrapEl) {
  return wrapEl?.querySelector?.('.expr-fraction, .term-cell') ?? null
}

function getDegreeInners(state, cellRefs, degree, side) {
  return state.findByDegree(degree, side ?? null)
    .map(t => getCellInner(getWrap(cellRefs, t.side, t.cellIndex)))
    .filter(Boolean)
}

function allWraps(cellRefs) {
  const fromRefs = [...(cellRefs.left ?? []), ...(cellRefs.right ?? [])].filter(Boolean)
  return fromRefs.length ? fromRefs : [...wrapsFromDom('left'), ...wrapsFromDom('right')]
}

function allInners(cellRefs) {
  return allWraps(cellRefs).map(getCellInner).filter(Boolean)
}

function findWrapById(cellRefs, state, id) {
  const t = state.findById(id)
  return t ? getWrap(cellRefs, t.side, t.cellIndex) : null
}

function wait(s)  { return new Promise(r => setTimeout(r, s * 1000)) }
function frame()  { return new Promise(r => requestAnimationFrame(r)) }

function triggerCelebration() {
  const colors = ['#f59e0b','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899','#fbbf24']
  const count  = 60
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div')
      el.style.cssText = `
        position:fixed; pointer-events:none; z-index:9999;
        width:8px; height:8px; border-radius:2px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        left:${20 + Math.random() * 60}vw;
        top:${-10 + Math.random() * 20}vh;
      `
      document.body.appendChild(el)
      gsap.to(el, {
        y: `${60 + Math.random() * 40}vh`,
        x: `${(Math.random() - 0.5) * 200}px`,
        rotation: Math.random() * 720 - 360,
        opacity: 0,
        duration: 1.2 + Math.random() * 0.8,
        ease: 'power1.in',
        onComplete: () => el.remove(),
      })
    }, i * 18)
  }
}

// Evaluate the numeric value of a side's terms (for inverse-trig computation).
// Handles plain coefficient terms AND fraction terms (numerator / denominator).
function evaluateSideValue(terms) {
  let total = 0
  for (const t of terms) {
    if (t.isFraction) {
      const numVal = (t.numeratorTerms   ?? []).reduce((s, sub) => s + (sub.sign === '-' ? -1 : 1) * sub.coefficient, 0)
      const denVal = (t.denominatorTerms ?? []).reduce((s, sub) => s + (sub.sign === '-' ? -1 : 1) * sub.coefficient, 0)
      if (denVal !== 0) total += (t.sign === '-' ? -1 : 1) * (numVal / denVal)
    } else {
      total += t.value   // MathObject.value already accounts for sign
    }
  }
  return total
}
