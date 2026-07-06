import { flushSync } from 'react-dom'
import { gsap } from 'gsap'
import { EquationState } from './EquationState.js'
import { MathObject } from './MathObject.js'
import * as geoEngine   from './geometryEngine.js'
import * as graphEngine  from './desmosEngine.js'
import * as tableEngine  from './tableEngine.js'
import * as textEngine   from './textEngine.js'
import * as threeEngine  from './threeEngine.js'
import { resolveColor }  from './palette.js'
import { generateScript } from './solveScript.js'

const LANE_H = 72

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
function _ghostStyles() {
  if (document.querySelector('.lesson-layout--single-equation')) {
    return {
      cell: { fontSize: '3.2rem', padding: '18px 28px', borderRadius: '18px', borderWidth: '2px' },
      op:   { fontSize: '2.4rem', padding: '0 10px' },
    }
  }
  return null
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
  if (!variable) return String(parseFloat(absValue.toFixed(4))) + deg
  if (absValue === 1) return variable + deg
  return String(parseFloat(absValue.toFixed(4))) + variable + deg
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
  document.body.appendChild(wrap)
  return wrap
}

// Pick the right ghost constructor for any term.
function makeGhostForTerm(sign, term) {
  if (term.isFraction) return makeTermGhostFraction(sign, term.numeratorTerms, term.denominatorTerms)
  return makeTermGhost(sign, cellLabel(Math.abs(term.coefficient), term.variable, term.degree))
}

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
  gsap.globalTimeline.timeScale(ANIM_SCALE)
  // Remove all body-overlay elements (ghosts, dividers, sqrt symbols, arrows)
  document.querySelectorAll('._anim-overlay, ._lifted-to-body').forEach(el => el.remove())
  // Clear any GSAP inline styles left on equation cells (outlines, scale, opacity, transforms)
  document.querySelectorAll('.term-cell, .term-wrap, .term-op').forEach(el => {
    gsap.set(el, { clearProps: 'boxShadow,scale,opacity,x,y,transform' })
  })
}

export async function executeScript(actions, snapshot, equationRef, setState, setUI, geoRef = null, graphRef = null, tableRef = null, setComments = null, textRef = null, speed = 1, opts = {}, calcRef = null, arithRef = null, signal = null, multRef = null, clockRef = null, numbersRef = null, mdasRef = null, kidRefs = {}) {
  const state = snapshot ? EquationState.fromSnapshot(snapshot) : null
  for (const action of actions) {
    if (signal?.cancelled) return
    if (opts.skipTitle && action.type === 'showTitle') continue
    await runAction(action, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
    if (signal?.cancelled) return
    await frame()
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function runAction(action, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed = 1, calcRef = null, arithRef = null, multRef = null, clockRef = null, numbersRef = null, mdasRef = null, kidRefs = {}) {
  const { pizzaRef, counterRef, numberlineRef, threeRef } = kidRefs
  const refs    = () => equationRef.current?.cellRefs ?? { left: [], right: [] }
  const graphApi = () => graphRef?.current?.calculator ?? null
  // eslint-disable-next-line no-shadow
  const wait = (s) => waitMs((s / speed) * 1000 / ANIM_SCALE)

  switch (action.type) {

    // ── Geometry actions (SVG canvas) ─────────────────────────────────────────

    case 'ggb-clear': {
      geoEngine.clearAll(geoRef)
      await wait(0.2)
      break
    }

    case 'ggb-create-polygon': {
      const { id, shapeType, values, opts } = action
      geoEngine.createPolygon(geoRef, id, shapeType, values, opts ?? {})
      await wait(0.5)
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
      await geoEngine.showAreaMeasures(geoRef, action.id, action.opts ?? {})
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
      threeEngine.createShape3D(threeRef, action.id, action.shape, action.a, action.b, action.c, action.opts ?? {})
      break
    }

    case 'ggb-3d-remove': {
      threeEngine.removeShape3D(threeRef, action.id)
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
      await threeEngine.showAngles3D(threeRef, action.id, action.color)
      break
    }

    case 'ggb-3d-highlight-angle': {
      await threeEngine.highlightAngle3D(threeRef, action.id, action.angleIndex, action.color)
      break
    }

    case 'ggb-3d-highlight-edge': {
      await threeEngine.highlightEdge3D(threeRef, action.id, action.edgeIndex, action.color)
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
      graphEngine.nameFunc(calc, action.id, action.funcId, action.label ?? action.funcId, action.x ?? 0, action.y, action.opts ?? {})
      await wait(0.3)
      break
    }

    case 'ggb-tangent': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.tangent(calc, action.id, action.funcId, action.x ?? 0, action.y, action.opts ?? {})
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

    case 'ggb-show-projection': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.showAxisProjection(calc, action.id, action.pointId, action.opts ?? {})
      break
    }

    case 'ggb-plot-derivative': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.plotDerivative(calc, action.id, action.funcId, action.opts ?? {})
      break
    }

    case 'ggb-riemann-sum': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.riemannSum(calc, action.id, action.funcId, action.a, action.b, action.n ?? 5, action.method ?? 'midpoint', action.opts ?? {})
      break
    }

    case 'ggb-draw-vector': {
      const calc = graphApi(); if (!calc) break
      await graphEngine.drawVector(calc, action.id, action.x1, action.y1, action.x2, action.y2, action.opts ?? {})
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

    case 'renderEquation': {
      if (!state) break
      setState(state.snapshot())
      await wait(0.35)
      break
    }

    // ── Replace the whole equation with a new one (whole-panel cross-fade) ──────
    // Used when an equation needs to morph into a structurally different one
    // (e.g. ax²+bx+c=0 → the quadratic formula → its resolved value) rather than
    // a term-level transform. Every value in action.left/right must already be
    // fully resolved — this action does not evaluate anything itself.
    case 'replaceEquation': {
      if (!state) break
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
    case 'showTitle': {
      setUI(u => ({ ...u, title: action.text, answer: null }))
      await wait(0.08)
      break
    }
    case 'showNarration': {
      // No-op: narration is only set by the explicit 'set-narration' action
      break
    }
    case 'set-narration': {
      setUI(u => ({ ...u, narration: action.text }))
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

    case 'outlineDegree': {
      if (!state) break
      const { degree, side, color = '#a855f7' } = action
      getDegreeInners(state, refs(), degree, side).forEach(el => {
        gsap.to(el, { boxShadow: `0 0 0 3px ${color}, 0 0 22px ${color}88`, scale: 1.08, duration: 0.4, ease: 'power2.out' })
      })
      await wait(0.7)
      break
    }

    case 'clearOutlines': {
      allInners(refs()).forEach(el => {
        gsap.to(el, { boxShadow: '0 0 0 0px transparent', scale: 1, duration: 0.35 })
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

        // Now hide the empty wrapper — layout footprint unchanged
        gsap.set(secWrap, { opacity: 0 })

        // Fly inner cell to anchor via GPU transform
        const tx = anchorRect.left - secRect.left
        const ty = anchorRect.top  - secRect.top
        await gsap.to(secInner, {
          x: tx, y: ty, opacity: 0,
          duration: 0.50, ease: 'power3.in',
        }).then()
        secInner.remove()

        // Update anchor running total in-place (use .term-coeff span with new sub-span structure)
        runningValue += sec.value
        const coeffEl = anchorInner?.querySelector('.term-coeff')
        if (coeffEl) coeffEl.textContent = String(parseFloat(Math.abs(runningValue).toFixed(4)))
        const opEl = anchorWrap?.querySelector('.term-op')
        if (opEl) opEl.textContent = runningValue < 0 ? '−' : '+'

        if (anchorInner) {
          await gsap.to(anchorInner, {
            scale: 1.18, duration: 0.10, ease: 'power2.out', yoyo: true, repeat: 1,
          }).then()
        }
        await wait(0.05)
      }

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
      for (const side of ['left', 'right']) {
        for (const degree of [1, 0]) {
          // Exclude fraction terms — they can't be naively combined with plain constants
          let terms = state.findByDegree(degree, side).filter(t => !t.isFraction && !t.symbolicLabel)
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
            terms = state.findByDegree(degree, side).filter(t => !t.isFraction && !t.symbolicLabel)
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
        const sideEl = document.querySelector(`.equation-side[data-side="${toSide}"]`)
        anchorR = sideEl?.getBoundingClientRect() ?? srcWrapR
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

      // Highlight destination terms with system blue
      const anchorHighlightEls = combineTermObjs
        .map(t => getCellInner(getWrap(r, t.side, t.cellIndex)))
        .filter(Boolean)
      if (anchorHighlightEls.length) {
        gsap.to(anchorHighlightEls, { boxShadow: '0 0 0 3px #60a5fa, 0 0 22px #60a5fa88', scale: 1.08, duration: 0.4, ease: 'power2.out' })
      }

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

      // ── Phase 3: rise into the equation row ──────────────────────────────
      const srcRowTop    = srcWrapR.top
      const anchorRowTop = lastAnchorWrap ? anchorR.top : srcRowTop
      await Promise.all([
        gsap.to(ghostA, { top: srcRowTop,    duration: 0.38, ease: 'power2.in' }).then(),
        gsap.to(ghostB, { top: anchorRowTop, duration: 0.38, ease: 'power2.in' }).then(),
      ])

      // ── Phase 4: cancel + combine + commit ───────────────────────────────
      // Snapshot BOTH sides for FLIP (both will have gaps after commit)
      const beforePos = {}
      const preRefs   = refs()
      ;[...state.left, ...state.right].forEach(t => {
        const el = getWrap(preRefs, t.side, t.cellIndex)
        if (el) beforePos[t.id] = el.getBoundingClientRect()
      })

      // Collect elements to fade out:
      // source inner + ghostA (cancel on source side)
      // anchor inners + ghostB (merge on target side)
      const anchorInners = combineTermObjs
        .map(t => getCellInner(getWrap(preRefs, t.side, t.cellIndex)))
        .filter(Boolean)

      await Promise.all([
        gsap.to([srcInner, ghostA, ...anchorInners], { opacity: 0, duration: 0.22 }).then(),
        gsap.to(ghostB,                               { opacity: 0,             duration: 0.22 }).then(),
      ])
      ghostA.remove()
      ghostB.remove()

      // Commit: remove source + absorbed terms, insert combined result
      state.remove(id)
      combineWithIds.forEach(cid => state.remove(cid))

      if (term.isFraction) {
        state.insertAt(new MathObject({
          id:              resultId,
          sign:            flippedSign,
          isFraction:      true,
          numeratorTerms:  term.numeratorTerms,
          denominatorTerms: term.denominatorTerms,
          coefficient: 1, variable: null, degree: term.degree,
        }), toSide, resultInsertIdx)
      } else {
        const cv = combinedVal ?? (-term.value)
        if (Math.abs(cv) > 1e-9) {
          state.insertAt(new MathObject({
            id:          resultId,
            sign:        cv >= 0 ? '+' : '-',
            coefficient: Math.abs(cv),
            variable:    action.variable  ?? term.variable,
            degree:      action.degree    ?? term.degree,
          }), toSide, resultInsertIdx)
        }
      }

      flushSync(() => setState(state.snapshot()))

      const fresh    = refs()
      const newWrap  = findWrapById(fresh, state, resultId)
      const newInner = getCellInner(newWrap)
      const anims    = []

      if (newInner) {
        newInner.style.animation = 'none'
        gsap.set(newInner, { opacity: 0 })
      }

      // FLIP all remaining terms on BOTH sides from their before-positions
      ;[...state.left, ...state.right].forEach(t => {
        if (t.id === resultId) return   // result pops in separately
        const b  = beforePos[t.id]
        const el = getWrap(fresh, t.side, t.cellIndex)
        if (!b || !el) return
        const nr = el.getBoundingClientRect()
        const dx = b.left - nr.left
        if (Math.abs(dx) < 1) return
        gsap.set(el, { x: dx })
        anims.push(gsap.to(el, { x: 0, duration: 0.38, ease: 'power3.out' }).then())
      })

      // Result fades in
      if (newInner) {
        anims.push(gsap.to(newInner, { opacity: 1, duration: 0.22 }).then())
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
      await runAction({ type: 'outlineDegree', degree: term.degree, side: fromSide, color: '#60a5fa' }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
      await runAction({ type: 'sendToOtherSide', id: term.id, resultId, combineWithIds, combinedVal, variable: term.variable, degree: term.degree }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
      await runAction({ type: 'clearOutlines' }, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
      break
    }

    // ── Divide both sides ─────────────────────────────────────────────────────
    case 'divideBothSides': {
      if (!state) break
      const { divisor } = action
      const wraps = allWraps(refs())

      const overlays = wraps.map(wrapEl => {
        const r  = wrapEl.getBoundingClientRect()
        const fs = Math.max(Math.round(r.height * 0.52), 14)

        const line = document.createElement('div')
        line.className = '_anim-overlay'
        line.style.cssText = `
          position:fixed;left:${r.left-3}px;top:${r.bottom+6}px;
          width:${r.width+6}px;height:2.5px;
          background:#a855f7;
          border-radius:2px;transform-origin:center;transform:scaleX(0);
        `
        document.body.appendChild(line)

        const lbl = document.createElement('div')
        lbl.className = '_anim-overlay'
        lbl.textContent = String(divisor)
        lbl.style.cssText = `
          position:fixed;
          left:${r.left + r.width / 2}px;top:${r.bottom + 14}px;
          transform:translateX(-50%) translateY(10px);
          font-family:'Fira Code','Cascadia Code',ui-monospace,monospace;
          font-size:${fs}px;font-weight:600;color:#a855f7;
          opacity:0;white-space:nowrap;
        `
        document.body.appendChild(lbl)
        return { line, lbl }
      })

      await gsap.to(overlays.map(o => o.line), { scaleX: 1, duration: 0.55, ease: 'power2.out' }).then()
      await gsap.to(overlays.map(o => o.lbl),  { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' }).then()
      await wait(0.75)

      await gsap.to(allInners(refs()), { scale: 1.1, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 }).then()
      await gsap.to(
        [...overlays.map(o => o.line), ...overlays.map(o => o.lbl)],
        { opacity: 0, duration: 0.3 }
      ).then()
      overlays.forEach(o => { o.line.remove(); o.lbl.remove() })

      ;[...state.left, ...state.right].forEach(t => {
        const nv = t.value / divisor
        t.sign = nv >= 0 ? '+' : '-'
        t.coefficient = Math.abs(nv)
      })
      setState(state.snapshot())
      await wait(0.35)
      break
    }

    // ── Replace Variable ──────────────────────────────────────────────────────
    // All replacements animate AT ONCE: collect every element, fade them out
    // together, update state in one commit, then pop the new values in together.
    case 'replaceVariable': {
      if (!state) break

      const selFor = (info) => info.numPos >= 0
        ? `.frac-num .frac-sub-coeff[data-pos="${info.numPos}"]`
        : `.frac-den .frac-sub-coeff[data-pos="${info.denPos}"]`

      // A fraction sub-term can itself be a PRODUCT, e.g. (B + b) × h (area-of-
      // trapezoid style) — find replaceable pieces inside those: either a plain
      // factor (fi only) or a member of a parenthesized SUM group (fi + ti).
      const nestedSelFor = (info) => {
        const side = info.key === 'numeratorTerms' ? 'num' : 'den'
        const pos  = info.ti !== undefined ? `${info.si}_${info.fi}_${info.ti}` : `${info.si}_${info.fi}`
        return `.frac-${side} .frac-sub-coeff[data-pos="${pos}"]`
      }
      const findNested = (t, label) => {
        const hits = []
        for (const key of ['numeratorTerms', 'denominatorTerms']) {
          ;(t[key] ?? []).forEach((sub, si) => {
            if (!Array.isArray(sub.factors)) return
            sub.factors.forEach((f, fi) => {
              if (f.symbolicLabel === label) hits.push({ key, si, fi })
              else if (Array.isArray(f.terms)) {
                const ti = f.terms.findIndex(x => x.symbolicLabel === label)
                if (ti >= 0) hits.push({ key, si, fi, ti })
              }
            })
          })
        }
        return hits
      }

      // Resolve each replacement against the current state
      const plans = (action.replacements ?? []).map(({ label, value }) => {
        const all   = [...state.left, ...state.right]
        const terms = all.filter(t => !t.isFraction && !t.factors && t.symbolicLabel === label)
        const fracInfo = all
          .filter(t => t.isFraction)
          .map(t => {
            const numPos = (t.numeratorTerms   ?? []).findIndex(s => s.symbolicLabel === label)
            const denPos = (t.denominatorTerms ?? []).findIndex(s => s.symbolicLabel === label)
            return (numPos >= 0 || denPos >= 0) ? { t, numPos, denPos } : null
          })
          .filter(Boolean)
        const factorInfo = all
          .filter(t => Array.isArray(t.factors))
          .map(t => {
            const pos = t.factors.findIndex(f => f.symbolicLabel === label)
            return pos >= 0 ? { t, pos } : null
          })
          .filter(Boolean)
        const nestedInfo = all
          .filter(t => t.isFraction)
          .flatMap(t => findNested(t, label).map(h => ({ t, ...h })))
        return { label, value, terms, fracInfo, factorInfo, nestedInfo }
      }).filter(p => p.terms.length || p.fracInfo.length || p.factorInfo.length || p.nestedInfo.length)

      if (!plans.length) break

      const collect = (cellRefs) => {
        const els = []
        for (const p of plans) {
          for (const t of p.terms) {
            const el = getWrap(cellRefs, t.side, t.cellIndex)?.querySelector('.term-coeff')
            if (el) els.push(el)
          }
          for (const info of p.fracInfo) {
            const el = getWrap(cellRefs, info.t.side, info.t.cellIndex)?.querySelector(selFor(info))
            if (el) els.push(el)
          }
          for (const info of p.factorInfo) {
            const el = getWrap(cellRefs, info.t.side, info.t.cellIndex)?.querySelector(`.term-factor[data-pos="${info.pos}"]`)
            if (el) els.push(el)
          }
          for (const info of p.nestedInfo) {
            const el = getWrap(cellRefs, info.t.side, info.t.cellIndex)?.querySelector(nestedSelFor(info))
            if (el) els.push(el)
          }
        }
        return els
      }

      // Fade out every targeted element together
      const outEls = collect(refs())
      if (outEls.length)
        await gsap.to(outEls, { opacity: 0, scale: 0.7, duration: 0.3, ease: 'power2.in' }).then()

      // Commit every replacement in a single state update.
      // The existing sign is the OPERATOR (e.g. the "−" in "y₂ − y₁") — keep it,
      // only flipping when the substituted value itself is negative.
      for (const p of plans) {
        const absV = Math.abs(p.value)
        const flip = p.value < 0
        const combine = origSign => ((origSign === '-') !== flip) ? '-' : '+'
        p.terms.forEach(t => { t.sign = combine(t.sign); t.coefficient = absV; t.symbolicLabel = undefined })
        p.factorInfo.forEach(({ t, pos }) => {
          t.factors = t.factors.map((f, i) => i === pos
            ? { ...f, coefficient: absV, sign: p.value < 0 ? '-' : '+', symbolicLabel: undefined }
            : f)
        })
        p.fracInfo.forEach(({ t, numPos, denPos }) => {
          const replace = s => s.symbolicLabel === p.label
            ? { ...s, coefficient: absV, sign: combine(s.sign), symbolicLabel: undefined }
            : s
          if (numPos >= 0) t.numeratorTerms   = (t.numeratorTerms   ?? []).map(replace)
          if (denPos >= 0) t.denominatorTerms = (t.denominatorTerms ?? []).map(replace)
        })
        p.nestedInfo.forEach(({ t, key, si, fi, ti }) => {
          const arr = t[key] ?? []
          const sub = arr[si]
          if (!sub) return
          const newFactors = sub.factors.map((f, i) => {
            if (i !== fi) return f
            if (ti === undefined) {
              return { ...f, coefficient: absV, sign: p.value < 0 ? '-' : '+', symbolicLabel: undefined }
            }
            return {
              ...f,
              terms: f.terms.map((s, j) => j === ti
                ? { ...s, coefficient: absV, sign: combine(s.sign), symbolicLabel: undefined }
                : s),
            }
          })
          arr[si] = { ...sub, factors: newFactors }
          t[key] = arr
        })
      }
      flushSync(() => setState(state.snapshot()))
      await wait(0.08)

      // Pop the new values in together
      const inEls = collect(refs())
      if (inEls.length) {
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
      rhsConst.coefficient = parseFloat(rootVal.toFixed(4))

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
          // y = f(x) for the named function
          const y = graphEngine.evalFunction(target.funcId, target.x)
          if (y !== null) target = { ...target, y }
        } else if (target.mode === 'area') {
          // y = 40% of f(x) — places dot inside the shaded region
          const fy = graphEngine.evalFunction(target.funcId, target.x)
          if (fy !== null) target = { ...target, y: fy * 0.4 }
        }
      }
      setComments(prev => {
        const without = prev.filter(c => c.id !== id)
        return [...without, { id, text, title, color: resolveColor(color) ?? '#a855f7', target }]
      })
      await wait(0.15)
      break
    }

    case 'remove-comment': {
      if (!setComments) break
      setComments(prev => prev.filter(c => c.id !== action.id))
      await wait(0.1)
      break
    }

    case 'update-comment': {
      if (!setComments) break
      let resolvedText  = action.text  ?? null
      let resolvedColor = action.color ?? null

      // Resolve [eq-result] from current equation state
      if (resolvedText?.includes('[eq-result]') && state) {
        const all = [...state.left, ...state.right]
        const numericTerm = all.find(t =>
          !t.variable && !t.symbolicLabel && !t.varParts && !t.isFraction
        )
        if (numericTerm) {
          const val = numericTerm.sign === '-' ? -numericTerm.coefficient : numericTerm.coefficient
          resolvedText  = resolvedText.replace(/\[eq-result\]/g, String(val))
          if (!resolvedColor) resolvedColor = numericTerm.color ?? null
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

    case 'clear-comments': {
      if (!setComments) break
      setComments([])
      await wait(0.1)
      break
    }

    case 'set-layout': {
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
        color:  action.color  ?? '#a855f7',
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

    case 'text-remove': {
      textEngine.removeBox(textRef, action.id)
      await wait(0.15)
      break
    }

    case 'text-clear': {
      textEngine.clearAll(textRef)
      await wait(0.15)
      break
    }

    case 'text-fade-content': {
      const { id: boxId, content = '[eq-result]' } = action

      // Resolve [eq-result]: find the pure numeric term (no variable, no symbolic label)
      let resolved = content
      let resultColor = null
      if (content.includes('[eq-result]') && state) {
        const all = [...state.left, ...state.right]
        const numericTerm = all.find(t =>
          !t.variable && !t.symbolicLabel && !t.varParts && !t.isFraction
        )
        if (numericTerm) {
          const val = numericTerm.sign === '-' ? -numericTerm.coefficient : numericTerm.coefficient
          resolved    = content.replace(/\[eq-result\]/g, String(val))
          resultColor = numericTerm.color ?? null
        }
      }

      // Find the content container inside the box card
      const boxEl     = textRef?.current?.getBoxEl(boxId)
      const contentEl = boxEl?.querySelector('.tb-body, .tb-list') ?? null

      // Fade out existing content
      if (contentEl) {
        await gsap.to(contentEl, { opacity: 0, y: -10, duration: 0.22, ease: 'power2.in' }).then()
      }

      // Swap content + color synchronously so React doesn't flicker between
      flushSync(() => {
        textEngine.replaceItems(textRef, boxId, [resolved])
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
    case 'distributeParentheses': {
      if (!state) break
      const { id, side, insertIdx, expandedTerms } = action
      const group = state.findById(id)
      if (!group) break

      const r0        = refs()
      const groupWrap = getWrap(r0, group.side, group.cellIndex)
      const groupCell = groupWrap ? getCellInner(groupWrap) : null

      if (groupWrap && groupCell) {
        // ── Phase 1: Pulse-outline the coefficient ──────────────────────────
        const coeffEl  = groupCell.querySelector('.pg-coeff')
        const innerEls = [...groupCell.querySelectorAll('.pg-inner-val')]

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
            const arcLift = Math.max(52, coeffRect.height * 0.85)
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

          // ── Phase 3: Commit + FLIP ──────────────────────────────────────
          const beforePos = {}
          const curRefs   = refs()
          ;[...state.left, ...state.right].forEach(t => {
            if (t.id === id) return
            const el = getWrap(curRefs, t.side, t.cellIndex)
            if (el) beforePos[t.id] = el.getBoundingClientRect()
          })

          await Promise.all([
            gsap.to(svg,       { opacity: 0, duration: 0.28 }).then(),
            gsap.to(groupWrap, { opacity: 0, scale: 0.8, duration: 0.28, ease: 'power2.in' }).then(),
          ])
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
              const inner = getCellInner(el)
              if (inner) {
                inner.style.animation = 'none'
                gsap.set(inner, { opacity: 0, scale: 0.7, y: -8 })
                anims.push(gsap.to(inner, { opacity: 1, scale: 1, y: 0, duration: 0.36, ease: 'back.out(1.5)' }).then())
              }
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

      // ── Phase 0: simplify any purely-numeric fraction (combine num, combine den, divide) ──
      const isNumericSub = s => !s.variable && s.symbolicLabel === undefined
      const subVal       = s => (s.sign === '-' ? -s.coefficient : s.coefficient)

      for (const frac of [...state.left, ...state.right].filter(t => t.isFraction)) {
        const num = frac.numeratorTerms   ?? []
        const den = frac.denominatorTerms ?? []
        if (!num.length || !den.length) continue
        if (!num.every(isNumericSub) || !den.every(isNumericSub)) continue   // has variables → leave for algebra

        // Combine one side's sub-terms into a single value, animating the merge.
        const combineSide = async (sideClass, subs) => {
          const total = subs.reduce((acc, s) => acc + subVal(s), 0)
          if (subs.length > 1) {
            const wrap = getWrap(refs(), frac.side, frac.cellIndex)
            const els  = wrap
              ? [...wrap.querySelectorAll(`.${sideClass} .frac-sub-coeff`), ...wrap.querySelectorAll(`.${sideClass} .frac-op`)]
              : []
            if (els.length) await gsap.to(els, { opacity: 0, scale: 0.6, duration: 0.25, ease: 'power2.in' }).then()
          }
          return total
        }

        // eslint-disable-next-line no-await-in-loop
        const numVal = await combineSide('frac-num', num)
        // eslint-disable-next-line no-await-in-loop
        const denVal = await combineSide('frac-den', den)

        frac.numeratorTerms   = [{ sign: numVal >= 0 ? '+' : '-', coefficient: Math.abs(numVal), variable: null, degree: 0 }]
        frac.denominatorTerms = [{ sign: denVal >= 0 ? '+' : '-', coefficient: Math.abs(denVal), variable: null, degree: 0 }]
        flushSync(() => setState(state.snapshot()))

        // pop the combined single num/den in
        {
          const wrap = getWrap(refs(), frac.side, frac.cellIndex)
          const els  = wrap ? wrap.querySelectorAll('.frac-sub-coeff') : []
          if (els.length) {
            gsap.set(els, { opacity: 0, scale: 0.5 })
            // eslint-disable-next-line no-await-in-loop
            await gsap.to(els, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)' }).then()
          }
        }
        // eslint-disable-next-line no-await-in-loop
        await wait(0.25)

        // ── divide: collapse the fraction into a single number ──
        if (denVal !== 0) {
          const result  = Math.round((numVal / denVal) * 10000) / 10000
          const fracPos = (frac.side === 'left' ? state.left : state.right).indexOf(frac)
          const newId   = crypto.randomUUID()

          const inner = getCellInner(getWrap(refs(), frac.side, frac.cellIndex))
          // eslint-disable-next-line no-await-in-loop
          if (inner) await gsap.to(inner, { scale: 0.6, opacity: 0, duration: 0.28, ease: 'power2.in' }).then()

          state.remove(frac.id)
          state.insertAt(new MathObject({
            id: newId, sign: result >= 0 ? '+' : '-', coefficient: Math.abs(result),
            variable: frac.variable ?? null, degree: 0, color: frac.color ?? null,
          }), frac.side, fracPos)
          flushSync(() => setState(state.snapshot()))

          const newInner = getCellInner(findWrapById(refs(), state, newId))
          if (newInner) {
            gsap.set(newInner, { scale: 0.3, opacity: 0 })
            // eslint-disable-next-line no-await-in-loop
            await gsap.to(newInner, { scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(2)' }).then()
          }
          // eslint-disable-next-line no-await-in-loop
          await wait(0.3)
        }
      }

      // ── Phase 0b: collapse numeric product terms (m·x with values → one number) ──
      for (const prod of [...state.left, ...state.right].filter(t => Array.isArray(t.factors))) {
        const fs = prod.factors
        if (!fs.every(f => f.symbolicLabel === undefined)) continue   // still has unresolved labels
        const val     = fs.reduce((acc, f) => acc * (f.sign === '-' ? -f.coefficient : f.coefficient), 1)
        const rounded = Math.round(val * 10000) / 10000
        const neg     = (prod.sign === '-') !== (rounded < 0)
        const pos     = (prod.side === 'left' ? state.left : state.right).indexOf(prod)
        const newId   = crypto.randomUUID()

        const inner = getCellInner(getWrap(refs(), prod.side, prod.cellIndex))
        // eslint-disable-next-line no-await-in-loop
        if (inner) await gsap.to(inner, { scale: 0.6, opacity: 0, duration: 0.28, ease: 'power2.in' }).then()

        state.remove(prod.id)
        state.insertAt(new MathObject({
          id: newId, sign: neg ? '-' : '+', coefficient: Math.abs(rounded),
          variable: null, degree: 0, color: prod.color ?? null,
        }), prod.side, pos)
        flushSync(() => setState(state.snapshot()))

        const newInner = getCellInner(findWrapById(refs(), state, newId))
        if (newInner) {
          gsap.set(newInner, { scale: 0.3, opacity: 0 })
          // eslint-disable-next-line no-await-in-loop
          await gsap.to(newInner, { scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(2)' }).then()
        }
        // eslint-disable-next-line no-await-in-loop
        await wait(0.3)
      }

      // ── Phase 0c: evaluate numeric power terms (e.g. 3² → 9 after variable substitution) ──
      {
        const powTerms = [...state.left, ...state.right].filter(
          t => !t.isFraction && !Array.isArray(t.factors) && t.variable == null &&
               t.symbolicLabel === undefined && t.degree > 1
        )
        for (const term of powTerms) {
          const val    = Math.round(Math.pow(term.coefficient, term.degree) * 10000) / 10000
          const pos    = (term.side === 'left' ? state.left : state.right).indexOf(term)
          const newId  = crypto.randomUUID()

          const inner = getCellInner(getWrap(refs(), term.side, term.cellIndex))
          // eslint-disable-next-line no-await-in-loop
          if (inner) await gsap.to(inner, { scale: 0.6, opacity: 0, duration: 0.28, ease: 'power2.in' }).then()

          state.remove(term.id)
          state.insertAt(new MathObject({
            id: newId, sign: term.sign, coefficient: val,
            variable: null, degree: 0, color: term.color ?? null,
          }), term.side, pos)
          flushSync(() => setState(state.snapshot()))

          const newInner = getCellInner(findWrapById(refs(), state, newId))
          if (newInner) {
            gsap.set(newInner, { scale: 0.3, opacity: 0 })
            // eslint-disable-next-line no-await-in-loop
            await gsap.to(newInner, { scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(2)' }).then()
          }
          // eslint-disable-next-line no-await-in-loop
          await wait(0.3)
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
        if (sub.type === 'renderEquation') continue
        // eslint-disable-next-line no-await-in-loop
        await runAction(sub, state, equationRef, setState, setUI, geoRef, graphRef, tableRef, setComments, textRef, speed, calcRef, arithRef, multRef, clockRef, numbersRef, mdasRef, kidRefs)
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
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

/** .term-wrap at [side][index] — the GSAP-animated flex item. */
function getWrap(cellRefs, side, index) {
  return cellRefs[side]?.[index] ?? null
}

/** .term-cell inside the wrapper — the visual box. */
function getCellInner(wrapEl) {
  return wrapEl?.querySelector?.('.term-cell') ?? null
}

function getDegreeInners(state, cellRefs, degree, side) {
  return state.findByDegree(degree, side ?? null)
    .map(t => getCellInner(getWrap(cellRefs, t.side, t.cellIndex)))
    .filter(Boolean)
}

function allWraps(cellRefs) {
  return [...(cellRefs.left ?? []), ...(cellRefs.right ?? [])].filter(Boolean)
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
