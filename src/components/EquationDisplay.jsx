import { useRef, useState, useEffect, useLayoutEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import TermCell from './TermCell.jsx'
import MathText from './RichText.jsx'
import { PALETTE, SYS, ANNOT_ROTATION } from '../engine/palette.js'

// A bracket, not a straight rule. A flat bar under a span reads as an underline
// of whatever character it happens to end on; two ticks turned down at the ends
// close the span off and say "all of this, together", and point the eye at the
// note underneath. Drawn in real pixels off the measured width so the corners
// keep their radius however wide the span is — a stretched viewBox would pull
// them into ellipses.
const BRACE_H = 6
function bracketPath(w) {
  const r = Math.max(1.5, Math.min(3, w / 4, BRACE_H))
  return `M 0 0 v ${BRACE_H - r} a ${r} ${r} 0 0 0 ${r} ${r} h ${w - 2 * r}`
       + ` a ${r} ${r} 0 0 0 ${r} ${-r} v ${-(BRACE_H - r)}`
}

// One annotation is the app pointing at the equation, so it wears the app's own
// accent. A second has to be told apart from the first at a glance, so from
// there on each takes a lesson colour none of the others is already wearing.
// A note that has to break breaks at a HYPHEN, in the middle of the word —
// never between two letters. CSS hyphens:auto needs a hyphenation dictionary
// for the note's language and silently does nothing without one, leaving
// overflow-wrap to chop wherever it landed: "separateures" came out as
// "separateure" and then a lone "s". A soft hyphen is unconditional and
// invisible until the browser actually breaks there, so one in the middle of
// a long word costs nothing when the word fits and reads "separa-/teures"
// when it does not.
const SHY = String.fromCharCode(0x00AD)
function softenLongWords(text) {
  return String(text ?? '').replace(/\S{9,}/gu, (w) => {
    const half = Math.ceil(w.length / 2)
    return w.slice(0, half) + SHY + w.slice(half)
  })
}

function pickAnnotColor(taken) {
  if (!taken.length) return SYS.annot
  const used = new Set(taken)
  const all  = ANNOT_ROTATION.map(n => PALETTE[n])
  const free = all.filter(hex => !used.has(hex))
  const pool = free.length ? free : all
  return pool[Math.floor(Math.random() * pool.length)]
}

// How much of the panel the equation is allowed to occupy. The rest is headroom:
// the next step usually makes the equation LONGER (one group becomes four terms),
// and an equation sized to exactly fit would have to shrink again immediately.
// Leaving a fifth of the width spare means most steps need no resize at all.
const FILL = 0.8
// Below this the terms stop being readable; past it the panel simply overflows,
// which is still better than an equation nobody can read.
const MIN_SCALE = 0.45
// Ignore differences this small — re-scaling for a few pixels reads as jitter.
const DEADBAND = 0.04

// What a comment's indices count on one side: every letter, number and
// exponent, left to right. The + − × ÷ and the brackets between them do not
// count — "t₁ + (n − 1) × d" is t₁ 0, n 1, 1 2, d 3. A chip holding a
// coefficient AND a letter ("3x") is two of them; any other chip is one,
// framed as the chip it is.
const ATOM_SELECTOR = '.term-cell, .term-exp, .radical-index, .term-zero'
const isBracket = el => /^[()−-]+$/.test(el.textContent.trim())

// The ² of a power is a superscript glyph set in a large font, so its box runs
// the whole height of the line with the digit up in one corner: a frame drawn
// from it was a tall empty slot. Top and bottom come from the ink instead,
// measured on a canvas in the element's own font. null when there is no ink.
let inkCtx = null
function exponentInk(el, r) {
  inkCtx ??= document.createElement('canvas').getContext('2d')
  const cs = getComputedStyle(el)
  inkCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  const m = inkCtx.measureText(el.textContent)
  // Canvas metrics are layout pixels; the rect is what is on screen, scaled
  // by the equation's fit and anything above it.
  const s      = r.height / (el.offsetHeight || r.height)
  const lead   = (r.height / s - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2
  const base   = lead + m.fontBoundingBoxAscent
  const top    = r.top + (base - m.actualBoundingBoxAscent) * s
  const bottom = r.top + (base + m.actualBoundingBoxDescent) * s
  return bottom > top ? { top, bottom } : null
}

function atomsOf(sideEl) {
  if (!sideEl) return []
  const atoms = []
  for (const el of sideEl.querySelectorAll(ATOM_SELECTOR)) {
    if (!el.getClientRects().length) continue   // display: none — out of the layout
    if (el.classList.contains('term-cell--fraction')) {
      const parts = el.querySelectorAll('.frac-sub-coeff:not([data-subfactors])')
      atoms.push(...(parts.length ? parts : [el]))
    } else if (el.classList.contains('term-cell')) {
      const coeff = [...el.querySelectorAll(':scope > .term-coeff')].filter(s => !isBracket(s))
      const vars  = el.querySelector(':scope > .term-var')
      atoms.push(...(coeff.length && vars ? [...coeff, vars] : [el]))
    } else {
      atoms.push(el)
    }
  }
  return atoms
}

/**
 * Renders  left[] = right[]  as cells.
 * Exposes { cellRefs: { left: HTMLElement[], right: HTMLElement[] } } via ref.
 */
// ── The trace of a solve ─────────────────────────────────────────────────────
// An animation is gone once it has played: at the end of a solve the reader sees
// the answer and nothing of the road to it. So every distinct state the equation
// passes through is kept, and the panel shows where it STARTED, in small, above
// where it is now. Hovering that line opens the whole list.
//
// The past steps are written as plain LaTeX, not as chips: the boxes are there
// to be animated, and nothing in the history ever moves. Being text also keeps
// them out of reach of every DOM query the animations make for .term-cell and
// friends — there is nothing in here for them to find.

// Two states that WRITE the same are the same step. The solver commits a lot of
// silent swaps between steps — a fraction rebuilt as a tree, a term given a new
// id, a colour set — and comparing the raw terms let each one through as a line
// identical to the one above it. The history is read, so it is compared as it
// reads.
function stepSignature(snap) {
  return snapshotTex(snap)
}

// A new Create Equation on the same page brings entirely new terms. A step of a
// solve always keeps at least one of them (the x = side, at the very least).
function sharesTerms(a, b) {
  const ids = new Set([...a.left, ...a.right].map(t => t.id))
  return [...b.left, ...b.right].some(t => ids.has(t.id))
}

// ── Snapshot → LaTeX ─────────────────────────────────────────────────────────
// Mirrors TermCell branch for branch, so a step reads the same written out as
// it did on screen: numbers rounded to three places, π as the glyph, the decimal
// separator the author typed, a fraction stacked wherever it sits, a root with
// its bar. Colours are left out on purpose — this is the record, not the lesson.
function texNum(v, comma, exact) {
  if (Math.abs(v - Math.PI) < 1e-9) return '\\pi'
  const s = exact ? String(v) : String(parseFloat(Number(v).toFixed(3)))
  // {,} rather than a bare comma, which KaTeX would space like a list separator.
  return comma ? s.replace('.', '{,}') : s
}

// A one-letter name is a variable; "Opposite" is a word, and set as math it
// would come out as eight italic letters multiplied together.
function texLabel(name) {
  const s = String(name ?? '')
  const sub = texSubscript(s)
  if (sub) return sub
  return s.length > 1 ? `\\text{${s}}` : s
}

// a₁, uₙ — a letter with its subscript, written back as the LaTeX it stands for.
const SUB_BACK = Object.fromEntries([...'₀₁₂₃₄₅₆₇₈₉'].map((c, i) => [c, String(i)])
  .concat([['₊', '+'], ['₋', '-'], ['₌', '='], ['₍', '('], ['₎', ')'], ['ₐ', 'a'], ['ₑ', 'e'], ['ₕ', 'h'],
    ['ᵢ', 'i'], ['ⱼ', 'j'], ['ₖ', 'k'], ['ₗ', 'l'], ['ₘ', 'm'], ['ₙ', 'n'], ['ₒ', 'o'], ['ₚ', 'p'],
    ['ᵣ', 'r'], ['ₛ', 's'], ['ₜ', 't'], ['ᵤ', 'u'], ['ᵥ', 'v'], ['ₓ', 'x']]))
function texSubscript(s) {
  const m = String(s ?? '').match(/^([A-Za-zα-ω])([\u2080-\u209C\u1D62-\u1D65\u2C7C]+)$/)
  return m ? `${m[1]}_{${[...m[2]].map(c => SUB_BACK[c] ?? c).join('')}}` : null
}

function nodeTex(n, parentPrec = 0, isRight = false, comma = false, exact = false) {
  if (!n) return ''
  switch (n.t) {
    case 'num':   return texNum(n.v, comma, exact)
    case 'label': return texLabel(n.name)
    case 'neg': {
      const par   = n.arg.t === 'bin' || (n.arg.t === 'num' && n.arg.v < 0)
      const inner = nodeTex(n.arg, par ? 0 : 3, false, comma)
      return '-' + (par ? `\\left(${inner}\\right)` : inner)
    }
    case 'fact': return nodeTex(n.arg, 3, false, comma, exact) + '!'
    case 'sqrt': {
      const idx = n.index ? `[${nodeTex(n.index, 0, false, comma)}]` : ''
      return `\\sqrt${idx}{${nodeTex(n.arg, 0, false, comma)}}`
    }
    case 'fn':  return `\\${n.name}\\left(${nodeTex(n.arg, 0, false, comma)}\\right)`
    case 'pow': {
      const par  = n.base.t === 'bin' || n.base.t === 'neg'
      const base = nodeTex(n.base, 0, false, comma)
      const exp  = n.exp && typeof n.exp === 'object' ? nodeTex(n.exp, 0, false, comma) : n.exp
      return (par ? `\\left(${base}\\right)` : `{${base}}`) + `^{${exp}}`
    }
    case 'pm': {
      const par = 1 < parentPrec || (1 === parentPrec && isRight)
      const s   = `${nodeTex(n.a, 1, false, comma)} \\pm ${nodeTex(n.b, 1, true, comma)}`
      return par ? `\\left(${s}\\right)` : s
    }
    case 'bin': {
      if (n.op === '/' && !n.divSign) {
        return `\\frac{${nodeTex(n.a, 0, false, comma, exact)}}{${nodeTex(n.b, 0, false, comma, exact)}}`
      }
      const sci  = n.op === '*' && n.b?.t === 'pow' && n.b.base?.t === 'num' && n.b.base.v === 10
      const prec = (n.op === '+' || n.op === '-') ? 1 : 2
      const par  = prec < parentPrec || (prec === parentPrec && isRight)
      const sym  = n.op === '*' ? ' \\times ' : n.op === '/' ? ' \\div ' : ` ${n.op} `
      const s    = nodeTex(n.a, prec, false, comma, sci || exact) + sym + nodeTex(n.b, prec, true, comma, exact)
      return par ? `\\left(${s}\\right)` : s
    }
    default: return ''
  }
}

// A numerator/denominator piece of a legacy fraction (TermCell's FracSubTerm).
function subTex(s) {
  if (!s) return ''
  const body = s.symbolicLabel != null ? texLabel(s.symbolicLabel)
    : s.variable ? (s.coefficient !== 1 ? texNum(s.coefficient) : '') + s.variable
    : texNum(Math.abs(s.coefficient))
  return s.isSqrt ? `\\sqrt{${body}}` : body
}

// A piece that is itself a product, e.g. (B + b) × h (TermCell's FactorProduct).
function factorsTex(factors) {
  return factors.map(f => (f.terms
    ? `\\left(${f.terms.map((s, i) => (i > 0 ? (s.sign === '-' ? ' - ' : ' + ') : (s.sign === '-' ? '-' : '')) + subTex(s)).join('')}\\right)`
    : subTex(f))).join(' \\times ')
}

// One side of a legacy fraction. A lone negative numerator's minus has already
// been folded up into the term's own sign (see sideTex), so it is not repeated.
function fracPartTex(list, foldLoneSign) {
  return (list ?? []).map((s, i) => {
    const op = i > 0
      ? (s.pmOperator ? ' \\pm ' : (s.sign === '-' ? ' - ' : ' + '))
      : (s.sign === '-' && !(foldLoneSign && list.length === 1) ? '-' : '')
    return op + (s.factors ? factorsTex(s.factors) : subTex(s))
  }).join('')
}

// An inner/outer term of a paren group: "2x", "x²", "3".
function monoTex(o) {
  const absC = Math.abs(o.coefficient)
  const c    = absC === 1 && o.variable ? '' : texNum(absC)
  const deg  = o.degree >= 2 ? `^{${o.degree}}` : ''
  return c + (o.variable ?? '') + deg
}
function monoListTex(list) {
  return list.map((o, i) => (i > 0 ? (o.sign === '-' ? ' - ' : ' + ') : (o.sign === '-' ? '-' : '')) + monoTex(o)).join('')
}

// A term without its leading operator.
function termBodyTex(t) {
  if (t.expr) return nodeTex(t.expr, 0, false, t.decimalComma)
  if (t.isFraction) {
    return `\\frac{${fracPartTex(t.numeratorTerms, true)}}{${fracPartTex(t.denominatorTerms, false)}}`
  }
  if (t.isOperator) return `\\text{${t.text ?? ''}}`
  if (t.varParts)   return `\\text{${t.varParts.map(p => p.text).join('')}}`
  if (t.isParenGroup) {
    const pgVar = t.parenCoeffVariable ?? ''
    const pgDeg = (t.parenCoeffDegree ?? 1) >= 2 ? `^{${t.parenCoeffDegree}}` : ''
    const coeff = t.parenCoeff === 1 ? '' : texNum(t.parenCoeff)
    const mult  = t.outerTerms ? `\\left(${monoListTex(t.outerTerms)}\\right)` : `${coeff}${pgVar}${pgDeg}`
    if (t.parensDropped) return `${mult}${mult ? ' \\times ' : ''}${monoListTex(t.innerTerms ?? [])}`
    return `${mult}\\left(${monoListTex(t.innerTerms ?? [])}\\right)`
  }
  if (t.factors) {
    return t.factors.map(f =>
      (f.symbolicLabel != null ? texLabel(f.symbolicLabel) : (f.sign === '-' ? '-' : '') + texNum(Math.abs(f.coefficient)))
      + (f.degree >= 2 ? `^{${f.degree}}` : '')).join(' \\times ')
  }
  const hasSym    = t.symbolicLabel != null
  const showCoeff = hasSym || !t.variable || t.coefficient !== 1
  let body = (showCoeff ? (hasSym ? texLabel(t.symbolicLabel) : texNum(Math.abs(t.coefficient), t.decimalComma)) : '')
    + (texSubscript(t.variable) ?? (t.variable ?? ''))
  if (t.negBase) body = `\\left(-${body}\\right)`
  const showExp = t.degree >= 2 || ((t.variable || hasSym) && (t.degree < 0 || t.showDegree))
  return showExp ? `{${body}}^{${t.degree}}` : body
}

// A whole side, with the same "which operators are shown" rule as TermCell.
function sideTex(terms) {
  if (!terms.length) return '0'
  return terms.map((t, i) => {
    const gap = t.listJoin && i > 0 ? ' \\quad ' : ''
    if (t.isOperator) return gap + termBodyTex(t)
    const prev = terms[i - 1]
    let negative = t.sign === '-'
    if (t.isFraction) {
      const numer = t.numeratorTerms ?? []
      negative = numer.length === 1 && numer[0]?.sign === '-' ? t.sign !== '-' : t.sign === '-'
    }
    if (t.listJoin) return gap + (negative ? '-' : '') + termBodyTex(t)
    const showOp = (i > 0 && !prev?.isOperator) || t.sign === '-'
    const lead = !showOp ? '' : i === 0 ? (negative ? '-' : '') : (negative ? ' - ' : ' + ')
    return lead + termBodyTex(t)
  }).join('')
}

function snapshotTex(snap) {
  const left = sideTex(snap.left)
  return snap.oneSided ? left : `${left} = ${sideTex(snap.right)}`
}

function TraceEquation({ snap }) {
  return <MathText className="eq-trace-tex" text={`$${snapshotTex(snap)}$`} />
}

// A term's own ink: everything in its wrap except the operator in front of it.
// An arrow leaving from the + would point at the wrong thing, and the wrap's
// padding is only spacing.
function inkRect(wrap) {
  const parts = [...wrap.children].filter(c => !c.classList.contains('term-op'))
  const rects = (parts.length ? parts : [wrap]).map(el => el.getBoundingClientRect())
  return {
    left:   Math.min(...rects.map(r => r.left)),
    right:  Math.max(...rects.map(r => r.right)),
    top:    Math.min(...rects.map(r => r.top)),
    bottom: Math.max(...rects.map(r => r.bottom)),
  }
}

const EquationDisplay = forwardRef(function EquationDisplay({ snapshot }, ref) {
  const leftRefs = useRef([])
  const rightRefs = useRef([])
  const equalsRef = useRef(null)
  const oneSidedRef = useRef(false)
  const boxRef    = useRef(null)   // the panel the equation has to fit inside
  const innerRef  = useRef(null)   // the equation at its natural size
  const leftSideRef  = useRef(null)
  const rightSideRef = useRef(null)
  const [scale, setScale] = useState(1)

  // Every distinct state of this equation, oldest first.
  const [trace, setTrace] = useState([])
  useEffect(() => {
    if (!snapshot) { setTrace([]); return }
    setTrace(prev => {
      const sig = stepSignature(snapshot)
      if (!prev.length) return [{ sig, snap: snapshot }]
      if (prev[prev.length - 1].sig === sig) return prev
      // Stepping back with ‹ lands on a state already on the path: the path is
      // cut back to it rather than growing a second copy of the same step.
      const at = prev.findIndex(h => h.sig === sig)
      if (at >= 0) return prev.slice(0, at + 1)
      if (!sharesTerms(prev[prev.length - 1].snap, snapshot)) return [{ sig, snap: snapshot }]
      return [...prev, { sig, snap: snapshot }]
    })
  }, [snapshot])
  // The handle below is created once, so it cannot close over `scale` — it reads
  // the current value through this ref instead.
  const scaleRef = useRef(1)
  scaleRef.current = scale

  // ── Annotations ─────────────────────────────────────────────────────────
  // Underlines with a note, drawn beneath part of the equation. They exist for
  // the OTHER kind of equation page: a formula nobody is solving, where the
  // teaching is what each piece of it means. Nothing here touches the solving
  // path — an equation with no annotations renders exactly as it always did.
  const [annots, setAnnots] = useState([])   // [{id, side, from, to, part, text, color, bar, txt}]
  const [geoms,  setGeoms]  = useState({})   // id → {x, w, y, lane} in panel pixels
  const annotsRef = useRef([])
  annotsRef.current = annots

  // ── Arrows ──────────────────────────────────────────────────────────────
  // A curved arrow from one term to another with a note at its middle: how a
  // sequence is read — 3 → 7 → 11, each hop marked "+4", one long arrow under
  // the row for "+ n × 4". Built like the annotations: measured from the live
  // cells after layout, drawn on the unscaled layer, and nothing on the solving
  // path ever reads any of it.
  const [arrows, setArrows] = useState([])           // [{id, side, from, to, text, place, color, draw, txt}]
  const [arrowGeoms, setArrowGeoms] = useState({})   // id → {d, head, sw, lx, ly} in panel pixels
  const arrowsRef = useRef([])
  arrowsRef.current = arrows

  // Fit the equation to the panel.
  //
  // The width to measure is NOT the display's own — pinning the = to the centre
  // made the grid exactly as wide as the panel, always, with the sides spilling
  // out of their halves. Measuring that box said "it fits" no matter how long
  // the equation got. What actually has to fit is each side inside its own half,
  // so the requirement is twice the longer side, plus the = and its gaps.
  //
  // A side's width is the sum of its terms, not its own box: the box is clamped
  // to half the panel by the grid, and scrollWidth does not report overflow
  // while overflow is visible — both read the same number however long the
  // equation gets. offsetWidth is layout width, unaffected by the transform, so
  // the natural size reads the same at any current scale and cannot compound.
  const sideWidth = (el) =>
    [...el.children].reduce((w, child) => w + child.offsetWidth, 0)

  const fit = useCallback(() => {
    const box = boxRef.current
    const l = leftSideRef.current, r = rightSideRef.current, eq = equalsRef.current
    if (!box || !l || !r) return
    const avail = box.clientWidth
    if (avail < 40) return

    // A one-sided equation is ONE thing across the whole panel, not two halves
    // either side of an "=". Sizing it as if the other half and the sign were
    // still there made it shrink to fit a width it does not use.
    const single  = oneSidedRef.current
    const widest  = single ? sideWidth(l) : Math.max(sideWidth(l), sideWidth(r))
    const eqW     = eq ? eq.offsetWidth : 0
    const gaps    = single ? 0 : 40          // the grid's 20px gap on each side
    const natural = single ? widest : widest * 2 + eqW + gaps
    if (natural < 1) return

    setScale(prev => {
      const wanted = Math.min(1, Math.max(MIN_SCALE, (avail * FILL) / natural))
      return Math.abs(wanted - prev) < DEADBAND ? prev : wanted
    })
  }, [])

  // Re-fit whenever the equation changes or the panel resizes — the panel
  // changes shape on every layout switch, not just on a window resize.
  useLayoutEffect(() => { fit() })
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [fit])

  // Rebuild ref arrays on every render so they stay in sync with the DOM
  leftRefs.current = []
  rightRefs.current = []

  // Same rAF-driven value animation the rest of the app uses. `out` runs both
  // fields backwards at once so a removed annotation leaves the way it came.
  const animateAnnot = useCallback((id, ms, field) => new Promise(resolve => {
    const t0 = performance.now()
    const tick = () => {
      const p = Math.min((performance.now() - t0) / ms, 1)
      const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
      setAnnots(prev => prev.map(a => {
        if (a.id !== id) return a
        if (field === 'out') return { ...a, bar: 1 - e, txt: 1 - e }
        return { ...a, [field]: e }
      }))
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    }
    tick()
  }), [])

  // The elements one annotation covers. A part of "ax" is a real DOM node —
  // TermCell renders the coefficient and the variable as their own spans — so
  // "the a in ax" is addressable without inventing a syntax for it. Falls back
  // to the whole cell whenever the part asked for is not there (a constant has
  // no variable), which is better than annotating nothing.
  const annotEls = useCallback((a) => {
    const refs = a.side === 'left' ? leftRefs.current : rightRefs.current
    const from = Math.max(0, a.from ?? 0)
    const to   = Math.max(from, a.to ?? from)
    const cells = []
    for (let i = from; i <= to && i < refs.length; i++) if (refs[i]) cells.push(refs[i])
    // "whole" is the term; the rest name a piece inside it. int/sep/dec only
    // exist on a decimal — asking for one of them on a plain integer finds
    // nothing, and the annotation falls back to covering the whole cell
    // rather than covering nothing at all.
    const SUB = { coeff: '.term-coeff', var: '.term-var',
                  int: '.term-int', sep: '.term-sep', dec: '.term-dec' }
    const sel = SUB[a.part]
    if (sel) {
      const subs = cells.map(c => c.querySelector(sel)).filter(Boolean)
      if (subs.length) return subs
    }
    return cells
  }, [])

  // Measured after layout, in the OUTER box's pixels. The equation itself is
  // transform-scaled, so its rects are already in scaled pixels and land in the
  // same space as the unscaled layer the underlines are drawn on.
  const measureAnnots = useCallback(() => {
    const box = boxRef.current
    if (!box) { return }
    // An equation with no annotations must cost nothing: this runs on every
    // render, and the solving path re-renders the panel on every step of every
    // solve. Reading layout there for a feature that is not in use would tax a
    // path that never asked for it.
    if (!annotsRef.current.length) { return }
    // Measure against whatever an absolutely-positioned child of this box would
    // actually resolve against — the box itself when it is positioned, its
    // offsetParent when it is not. The outer box is `static` today, so the
    // underlines land on the slot around it; reading the box's own rect instead
    // put every one of them off by the gap between the two. Deriving it costs
    // nothing and stays correct if that CSS ever changes.
    const base = getComputedStyle(box).position !== 'static' ? box : (box.offsetParent ?? box)
    const bb = base.getBoundingClientRect()
    const next = {}
    const placed = []
    let tallestNote = 0
    for (const a of annotsRef.current) {
      const els = annotEls(a)
      if (!els.length) continue
      const rects  = els.map(el => el.getBoundingClientRect())
      const left   = Math.min(...rects.map(r => r.left))
      const right  = Math.max(...rects.map(r => r.right))
      const bottom = Math.max(...rects.map(r => r.bottom))

      // The BRACKET never moves. A bracket that drops to a lower line stops
      // reading as "this piece of that" and starts looking like a second row of
      // maths under the first. What moves is the NOTE, and only when it would
      // print over a neighbour's note — a leader line then carries the eye down
      // from the bracket to wherever the words ended up.
      const noteEl = box.querySelector(`[data-annot-id="${CSS.escape(a.id)}"] .eq-annot-text`)
      // The WIDEST LINE of the note, not the width of its box. Once the text
      // wraps, the box is exactly the max-width whatever the words inside do,
      // so every long note measured the same and any two of them "overlapped"
      // — which is how a note with clear space beside it was still pushed down
      // a line. A Range gives one rect per line box; the longest is the ink.
      let noteW = 0
      if (noteEl) {
        const range = document.createRange()
        range.selectNodeContents(noteEl)
        const lineRects = [...range.getClientRects()]
        noteW = lineRects.length
          ? Math.max(...lineRects.map(r => r.width))
          : noteEl.getBoundingClientRect().width
      }
      const noteH  = noteEl ? noteEl.getBoundingClientRect().height : 0
      tallestNote  = Math.max(tallestNote, noteH)
      const mid    = (left + right) / 2
      // Only the NOTE decides the lane. Two brackets side by side never collide
      // — they cover different characters — but their notes are far wider than
      // what they point at and routinely do.
      const half   = Math.max(noteW, 8) / 2 + 8
      const spanL  = mid - half
      const spanR  = mid + half

      // The first line this note fits on without touching one already there.
      // Notes are checked left to right, so a note only ever has to clear what
      // is already placed to its left — there is nothing to iterate over and
      // nothing that can push it back up.
      let lane = 0
      for (const q of placed) if (spanL < q.right && q.left < spanR) lane = Math.max(lane, q.lane + 1)
      placed.push({ id: a.id, mid, left: spanL, right: spanR, lane, noteH })
      // Brackets that meet edge to edge read as one long bracket with a kink in
      // it. Pulled in a couple of pixels each side, the gap says they are two.
      const INSET = 2.5
      next[a.id] = {
        x: left - bb.left + INSET,
        w: Math.max(6, right - left - INSET * 2),
        y: bottom - bb.top,
        lane,
      }
    }
    // One line for every bracket. Targets end at different heights — the a of
    // "ax" sits higher than the whole term beside it — and letting each hang
    // from its own bottom left the row ragged.
    // Each LINE is as tall as the tallest note on it, and a note drops by the
    // sum of the lines above it. One global step — the tallest note anywhere —
    // sent a one-line note down as far as a two-line one, and its leader came
    // out visibly longer than it needed to be.
    const GAP = 7
    const laneH = []
    for (const q of placed) laneH[q.lane] = Math.max(laneH[q.lane] ?? 0, q.noteH)
    const offset = []
    let acc = 0
    for (let L = 0; L < laneH.length; L++) {
      offset[L] = acc
      acc += Math.ceil(laneH[L] ?? 0) + GAP
    }
    for (const q of placed) next[q.id].drop = offset[q.lane]
    const barBottom = Math.max(...Object.values(next).map(g => g.y))
    for (const g of Object.values(next)) g.y = barBottom

    setGeoms(prev => {
      const same = Object.keys(next).length === Object.keys(prev).length &&
        Object.entries(next).every(([k, v]) => prev[k] &&
          Math.abs(prev[k].x - v.x) < 0.5 && Math.abs(prev[k].w - v.w) < 0.5 &&
          Math.abs(prev[k].y - v.y) < 0.5 && prev[k].lane === v.lane &&
          Math.abs((prev[k].drop ?? 0) - (v.drop ?? 0)) < 0.5)
      return same ? prev : next
    })
  }, [annotEls])

  // Re-measure on every render: the equation re-fits when the panel changes
  // shape, and an underline measured against the old scale would sit adrift.
  useLayoutEffect(() => { measureAnnots() })

  const animateArrow = useCallback((id, ms, field) => new Promise(resolve => {
    const t0 = performance.now()
    const tick = () => {
      const p = Math.min((performance.now() - t0) / ms, 1)
      const k = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
      setArrows(prev => prev.map(a => {
        if (a.id !== id) return a
        // Leaves the way it came: the line draws back as the note fades.
        if (field === 'out') return { ...a, draw: 1 - k, txt: 1 - k }
        return { ...a, [field]: k }
      }))
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    }
    tick()
  }), [])

  const measureArrows = useCallback(() => {
    const box = boxRef.current
    // No arrows, no layout reads — the same rule as the annotations.
    if (!box || !arrowsRef.current.length) return
    const base = getComputedStyle(box).position !== 'static' ? box : (box.offsetParent ?? box)
    const bb = base.getBoundingClientRect()
    const s  = scaleRef.current || 1
    const f  = (v) => Math.round(v * 10) / 10
    const next = {}
    for (const a of arrowsRef.current) {
      const refs = a.side === 'left' ? leftRefs.current : rightRefs.current
      const A = refs[a.from], B = refs[a.to]
      if (!A || !B || a.from === a.to) continue
      const ra = inkRect(A), rb = inkRect(B)
      const below = a.place === 'below'
      const dir = (rb.left + rb.right) >= (ra.left + ra.right) ? 1 : -1
      // Leaves from the far half of the first term and lands on the near half
      // of the second, the way the hop is drawn by hand. Centre to centre, the
      // arrow arriving at a term and the one leaving it would touch.
      const x0 = ra.left + (ra.right - ra.left) * (dir > 0 ? 0.62 : 0.38) - bb.left
      const x1 = rb.left + (rb.right - rb.left) * (dir > 0 ? 0.38 : 0.62) - bb.left
      // Both ends at one height — over the taller of the two terms, or under the
      // deeper — so a fraction in the row does not tilt the arc.
      const gap = 4 + 6 * s
      const y = below ? Math.max(ra.bottom, rb.bottom) - bb.top + gap
                      : Math.min(ra.top, rb.top) - bb.top - gap
      // Deeper with distance, but less than in proportion: a hop to the next
      // term is a low arc, and one across the whole row does not tower over it.
      const dx = Math.abs(x1 - x0)
      const h  = Math.max(12 + 8 * s, 1.45 * Math.pow(dx, 0.6))
      // A cubic's middle reaches three quarters of the way to its handles.
      const c  = (4 / 3) * h * (below ? 1 : -1)
      const q  = 0.25 * (x1 - x0)
      const p2x = x1 - q, p2y = y + c
      // The head points along the curve's last direction, and the line stops
      // inside it, so the line's round end never shows past the point.
      const tl = Math.hypot(x1 - p2x, y - p2y) || 1
      const ux = (x1 - p2x) / tl, uy = (y - p2y) / tl
      const L  = 7 + 6 * s, W = L * 0.5
      const tipX = x1 + ux * 1.5, tipY = y + uy * 1.5
      const bx = tipX - ux * L, by = tipY - uy * L
      const ex = tipX - ux * L * 0.75, ey = tipY - uy * L * 0.75
      next[a.id] = {
        d:    `M ${f(x0)} ${f(y)} C ${f(x0 + q)} ${f(y + c)}, ${f(p2x)} ${f(p2y)}, ${f(ex)} ${f(ey)}`,
        head: `M ${f(tipX)} ${f(tipY)} L ${f(bx - uy * W)} ${f(by + ux * W)} L ${f(bx + uy * W)} ${f(by - ux * W)} Z`,
        sw:   f(1.3 + 1.3 * s),
        lx:   f((x0 + x1) / 2),
        ly:   f(y + 0.75 * c + (below ? 3 : -3)),
      }
    }
    setArrowGeoms(prev => {
      const ks = Object.keys(next)
      const same = ks.length === Object.keys(prev).length && ks.every(k => prev[k] &&
        prev[k].d === next[k].d && prev[k].head === next[k].head && prev[k].sw === next[k].sw &&
        prev[k].lx === next[k].lx && prev[k].ly === next[k].ly)
      return same ? prev : next
    })
  }, [])

  useLayoutEffect(() => { measureArrows() })
  // The equation eases into a new scale over most of a second and nothing
  // re-renders while it does, so an arrow drawn in that window would stay where
  // the terms were. The end of the ease is the moment to measure again.
  const hasSnapshot = !!snapshot
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    el.addEventListener('transitionend', measureArrows)
    return () => el.removeEventListener('transitionend', measureArrows)
  }, [measureArrows, hasSnapshot])

  useImperativeHandle(ref, () => ({
    get cellRefs() {
      return { left: leftRefs.current, right: rightRefs.current }
    },

    // Collect the target cells. side 'both' = whole equation; otherwise one side.
    // Empty indices select every cell of the side; explicit indices select
    // letters, numbers and exponents, counted the way atomsOf counts them.
    getTargetEls(target) {
      if (target.side === 'both') {
        return [...leftRefs.current, ...rightRefs.current].filter(Boolean)
      }
      const hasIndices = Array.isArray(target.indices) && target.indices.length > 0
      if (!hasIndices) return (target.side === 'left' ? leftRefs.current : rightRefs.current).filter(Boolean)
      const atoms = atomsOf(target.side === 'left' ? leftSideRef.current : rightSideRef.current)
      return target.indices.map(i => atoms[i]).filter(Boolean)
    },

    // A "whole" selection (whole equation, or a whole side with no indices) draws
    // ONE merged box; explicit indices draw one box per cell.
    isWholeSelection(target) {
      return target.side === 'both' || !(Array.isArray(target.indices) && target.indices.length > 0)
    },

    // Visual rect of a term-wrap, ignoring its trailing padding-right (which is just
    // spacing between terms and would otherwise create a phantom gap on the right).
    // getBoundingClientRect is in scaled viewport pixels; getComputedStyle is in
    // unscaled layout pixels. Subtracting one from the other took too much off
    // whenever the equation had been shrunk to fit, so every box drawn from
    // these rects sat slightly wrong — the ring around a result cut through the
    // term on its edge.
    // A letter, number or exponent (atomsOf) has no such trailing gap: its
    // padding is the inside of its own chip, and belongs in the frame.
    _visualRect(el) {
      const r    = el.getBoundingClientRect()
      if (!el.classList.contains('term-wrap')) {
        const ink    = el.matches('.term-exp:not(.term-exp--expr)') ? exponentInk(el, r) : null
        const top    = ink?.top ?? r.top
        const bottom = ink?.bottom ?? r.bottom
        return { left: r.left, top, right: r.right, bottom, width: r.width, height: bottom - top }
      }
      const s    = scaleRef.current || 1
      const padR = (parseFloat(getComputedStyle(el).paddingRight) || 0) * s
      return { left: r.left, top: r.top, right: r.right - padR, bottom: r.bottom, width: r.width - padR, height: r.height }
    },

    getPageCoords(target) {
      const els = this.getTargetEls(target)
      if (!els.length) return null
      const rects  = els.map(el => this._visualRect(el))
      const left   = Math.min(...rects.map(r => r.left))
      const right  = Math.max(...rects.map(r => r.right))
      const top    = Math.min(...rects.map(r => r.top))
      // Whole-equation comment: anchor x on the "=" sign. Otherwise center of the cells.
      let x = (left + right) / 2
      if (target.side === 'both' && equalsRef.current) {
        const er = equalsRef.current.getBoundingClientRect()
        x = (er.left + er.right) / 2
      }
      return { x, y: top }
    },

    // ── Annotations ───────────────────────────────────────────────────────
    annotate(spec) {
      const a = {
        id:    spec.id,
        // "right" is the default side, and it is meaningless on a one-sided
        // equation: everything the parser read went to the left, so an
        // annotation aimed right found no cells and drew nothing at all —
        // silently, which is the worst way to fail. There is only one side to
        // point at, so point at it.
        side:  oneSidedRef.current ? 'left' : (spec.side === 'left' ? 'left' : 'right'),
        from:  spec.from ?? 0,
        to:    spec.to ?? spec.from ?? 0,
        part:  spec.part ?? 'whole',
        text:  spec.text ?? '',
        color: spec.color || pickAnnotColor(
          annotsRef.current.filter(x => x.id !== spec.id).map(x => x.color)),
        bar: 0, txt: 0,
      }
      setAnnots(prev => [...prev.filter(x => x.id !== a.id), a])
      annotsRef.current = [...annotsRef.current.filter(x => x.id !== a.id), a]
      // The rule stretches out from under the span first, then the note
      // arrives — one movement, so the eye follows it to the words.
      return animateAnnot(a.id, 420, 'bar').then(() => animateAnnot(a.id, 260, 'txt'))
    },

    removeAnnotation(id) {
      if (!annotsRef.current.some(a => a.id === id)) return Promise.resolve()
      return animateAnnot(id, 260, 'out').then(() => {
        setAnnots(prev => prev.filter(a => a.id !== id))
        annotsRef.current = annotsRef.current.filter(a => a.id !== id)
      })
    },

    clearAnnotations() {
      setAnnots([])
      annotsRef.current = []
      setGeoms({})
    },

    // ── Arrows ────────────────────────────────────────────────────────────
    addArrow(spec) {
      const a = {
        id:    spec.id,
        // One-sided, everything the parser read is on the left — the same rule
        // as the annotations, or an arrow aimed right would find no cells.
        side:  oneSidedRef.current ? 'left' : (spec.side === 'right' ? 'right' : 'left'),
        from:  Math.max(0, Math.round(Number(spec.from) || 0)),
        to:    Math.max(0, Math.round(Number(spec.to ?? 1) || 0)),
        text:  spec.text ?? '',
        place: spec.place === 'below' ? 'below' : 'above',
        // The reserved blue, unless the lesson gives the arrow a colour.
        color: spec.color || SYS.blue,
        draw: 0, txt: 0,
      }
      setArrows(prev => [...prev.filter(x => x.id !== a.id), a])
      arrowsRef.current = [...arrowsRef.current.filter(x => x.id !== a.id), a]
      // The line travels from one term to the other with its head arriving at
      // the end, and only then the note — the eye follows the hop to its label.
      return animateArrow(a.id, 520, 'draw').then(() => animateArrow(a.id, 260, 'txt'))
    },

    removeArrow(id) {
      if (!arrowsRef.current.some(a => a.id === id)) return Promise.resolve()
      return animateArrow(id, 300, 'out').then(() => {
        setArrows(prev => prev.filter(a => a.id !== id))
        arrowsRef.current = arrowsRef.current.filter(a => a.id !== id)
      })
    },

    // A step asking for it fades them all out together. A new equation drops
    // them at once — it replaces the one they were drawn on without a fade too.
    clearArrows({ fade = false } = {}) {
      const drop = () => {
        setArrows([])
        arrowsRef.current = []
        setArrowGeoms({})
      }
      if (!fade || !arrowsRef.current.length) { drop(); return Promise.resolve() }
      return Promise.all(arrowsRef.current.map(a => animateArrow(a.id, 300, 'out'))).then(drop)
    },

    getCellRects(target) {
      const els = this.getTargetEls(target)
      if (!els.length) return []
      if (!this.isWholeSelection(target)) {
        // per-cell outlines (tight to each cell, padding removed)
        return els.map(el => this._visualRect(el))
      }
      // One merged bounding box that adapts to the equation/side size, with a
      // uniform padding on ALL four sides.
      const rects  = els.map(el => this._visualRect(el))
      const PAD    = 7
      const left   = Math.min(...rects.map(r => r.left))   - PAD
      const right  = Math.max(...rects.map(r => r.right))  + PAD
      const top    = Math.min(...rects.map(r => r.top))    - PAD
      const bottom = Math.max(...rects.map(r => r.bottom)) + PAD
      return [{ left, top, right, bottom, x: left, y: top, width: right - left, height: bottom - top }]
    },
  }))

  if (!snapshot) return null

  const { left, right, oneSided } = snapshot
  oneSidedRef.current = !!oneSided

  return (
    // The outer box is the space available; the inner one holds the equation at
    // its natural size and is scaled to fit. --eq-scale is published on it so
    // the animations can size their own pixel constants — an arrow arc or a
    // working line measured in raw px would not shrink with the equation.
    <div className="equation-fit" ref={boxRef} style={{ '--eq-scale': scale }}>
    {/* Only once there IS a road behind: before the first step the initial
        equation is the one on screen, and a copy of it above would be noise.
        Absolutely placed, so it appearing never moves the equation or its =. */}
    {trace.length >= 2 && (
      <div className="eq-trace" tabIndex={0} aria-label="Étapes précédentes">
        <div className="eq-trace-initial"><TraceEquation snap={trace[0].snap} /></div>
        <div className="eq-trace-panel" role="list">
          {trace.map((h, i) => (
            <div className="eq-trace-step" role="listitem" key={i}>
              <span className="eq-trace-num">{i + 1}</span>
              <TraceEquation snap={h.snap} />
            </div>
          ))}
        </div>
      </div>
    )}
    <div className={`equation-display${oneSided ? ' equation-display--one-sided' : ''}`} ref={innerRef} style={{ transform: `scale(${scale})` }}>
      <div className="equation-side" data-side="left" ref={leftSideRef}>
        {left.length === 0
          ? <span className="term-zero">0</span>
          : left.map((term, i) => (
              <TermCell
                key={term.id}
                term={term}
                prevTerm={left[i - 1] ?? null}
                ref={el => { leftRefs.current[i] = el }}
              />
            ))
        }
      </div>

      {/* A one-sided equation is an expression on display, not a problem: it has
          no right-hand side to show and no equals sign to show it after. The
          ref still has to exist — measureAnnots reads it — so the span stays and
          only its content goes. */}
      <span className="equals-sign" ref={equalsRef}>{oneSided ? '' : '='}</span>

      <div className="equation-side" data-side="right" ref={rightSideRef}>
        {right.length === 0
          ? (oneSided ? null : <span className="term-zero">0</span>)
          : right.map((term, i) => (
              <TermCell
                key={term.id}
                term={term}
                prevTerm={right[i - 1] ?? null}
                ref={el => { rightRefs.current[i] = el }}
              />
            ))
        }
      </div>
    </div>

    {annots.map(a => {
      const g = geoms[a.id]
      if (!g) return null
      // How far a note drops per lane. It has to clear a line of note text
      // plus the gap under the bracket, or the leader ends inside the words
      // above it.
      const drop = g.drop ?? 0
      return (
        <div key={a.id} className="eq-annot" data-annot-id={a.id}
          style={{ left: g.x, top: g.y + 6, width: g.w, color: a.color }}>
          <div className="eq-annot-bar" style={{ transform: `scaleX(${a.bar ?? 0})` }}>
            <svg width={g.w} height={BRACE_H} viewBox={`0 0 ${g.w} ${BRACE_H}`} aria-hidden="true">
              <path d={bracketPath(g.w)} fill="none" stroke={a.color} strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          {/* Only drawn when the note had to move: at lane 0 the words sit
              directly under their bracket and a leader would be a line to
              nowhere. It fades in with the note it belongs to. */}
          {drop > 0 && (
            <div className="eq-annot-leader"
              style={{ top: BRACE_H, height: drop, opacity: a.txt ?? 0 }} />
          )}
          {a.text ? (
            <div className="eq-annot-text" style={{ opacity: a.txt ?? 0, marginTop: drop }}>{softenLongWords(a.text)}</div>
          ) : null}
        </div>
      )
    })}

    {arrows.map(a => {
      const g = arrowGeoms[a.id]
      if (!g) return null
      const draw = a.draw ?? 0
      // The head arrives over the last stretch of the line — never seen
      // pointing before there is a line behind it.
      const head = Math.max(0, Math.min(1, (draw - 0.82) / 0.18))
      return (
        <div key={a.id} className="eq-arrow" data-arrow-id={a.id} style={{ color: a.color }}>
          <svg className="eq-arrow-svg" width="1" height="1" aria-hidden="true">
            <path d={g.d} pathLength="1" fill="none" stroke="currentColor" strokeWidth={g.sw}
              strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - draw}
              style={{ opacity: draw > 0 ? 1 : 0 }} />
            <path d={g.head} fill="currentColor" style={{ opacity: head }} />
          </svg>
          {a.text ? (
            <div className={`eq-arrow-text${a.place === 'below' ? ' eq-arrow-text--below' : ''}`}
              style={{ left: g.lx, top: g.ly, opacity: a.txt ?? 0 }}>
              <MathText text={a.text} />
            </div>
          ) : null}
        </div>
      )
    })}
    </div>
  )
})

export default EquationDisplay
