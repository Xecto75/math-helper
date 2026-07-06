import { MathObject } from './MathObject.js'
import { EquationState } from './EquationState.js'

export function generateScript(initialSnapshot, originalInput) {
  const script = []
  const state  = EquationState.fromSnapshot(initialSnapshot)

  script.push({ type: 'showTitle',    text: `Solving: ${originalInput}` })
  script.push({ type: 'renderEquation' })

  // ── 0. Distribute parentheses ──────────────────────────────────────────────
  distributeAllParens(state, script)

  // ── 1. Combine like terms on the left ──────────────────────────────────────
  combineOnSide(state, script, 1, 'left')   // x-terms
  combineOnSide(state, script, 0, 'left')   // constants

  // ── 2. Combine like terms on the right (pre-existing) ─────────────────────
  combineOnSide(state, script, 1, 'right')
  combineOnSide(state, script, 0, 'right')

  // ── Quadratic branch — intercept before linear steps ──────────────────────
  const hasQuadVar  = [...state.left, ...state.right].some(t => t.degree === 2 && t.variable)
  const hasLinearVar = [...state.left, ...state.right].some(t => t.degree === 1 && t.variable)
  const isQuadratic = hasQuadVar && hasLinearVar
  if (isQuadratic) {
    generateQuadraticScript(state, script)
    return script
  }

  // Isolate the variable on whichever side it already sits (prefer left if both).
  // This avoids needlessly dragging "b" across in "7 = 6 + b" — we just move the 6.
  const varSide   = state.findByDegree(1, 'left').length  > 0 ? 'left'
                  : state.findByDegree(1, 'right').length > 0 ? 'right' : 'left'
  const otherSide = varSide === 'left' ? 'right' : 'left'

  // ── 3. Move x-terms from the other side onto the variable's side ──────────
  // sendToOtherSide absorbs the subsequent combine step.
  for (const term of [...state.findByDegree(1, otherSide)]) {
    const resultId   = crypto.randomUUID()
    const targetSame = state.findByDegree(1, varSide)
    const combineWithIds = targetSame.map(t => t.id)
    const flippedVal = -term.value
    const combinedVal = targetSame.reduce((s, t) => s + t.value, 0) + flippedVal

    const firstPos = targetSame.length > 0
      ? state[varSide].indexOf(targetSame[0])
      : state[varSide].length

    script.push({ type: 'showNarration', text: `Move ${fmtTerm(term)} to the other side.` })
    script.push({ type: 'outlineDegree', degree: 1, side: otherSide, color: '#60a5fa' })
    script.push({
      type: 'sendToOtherSide',
      id:            term.id,
      resultId,
      combineWithIds,
      combinedVal,
      variable:      term.variable,
      degree:        term.degree,
    })
    script.push({ type: 'clearOutlines' })

    state.remove(term.id)
    combineWithIds.forEach(cid => state.remove(cid))
    if (Math.abs(combinedVal) > 1e-9) {
      state.insertAt(new MathObject({
        id: resultId,
        sign:        combinedVal >= 0 ? '+' : '-',
        coefficient: Math.abs(combinedVal),
        variable:    term.variable,
        degree:      1,
      }), varSide, firstPos)
    }
  }

  // ── 4. Move the constant off the variable's side ──────────────────────────
  // Skip if there is no variable term to isolate (e.g. pure numeric equation like 25 = 25)
  const hasVar = state.findByDegree(1, 'left').length > 0 || state.findByDegree(1, 'right').length > 0
  const constOnVarSide = hasVar ? state.findByDegree(0, varSide) : []
  if (constOnVarSide.length > 0) {
    const b          = constOnVarSide[0]
    const resultId   = crypto.randomUUID()
    const targetSame = state.findByDegree(0, otherSide)
    const combineWithIds = targetSame.map(t => t.id)
    const flippedVal = -b.value
    const combinedVal = targetSame.reduce((s, t) => s + t.value, 0) + flippedVal

    const firstPos = targetSame.length > 0
      ? state[otherSide].indexOf(targetSame[0])
      : state[otherSide].length

    const narration = b.value > 0
      ? `Subtract ${b.label} from both sides.`
      : `Add ${Math.abs(b.value)} to both sides.`
    script.push({ type: 'showNarration',  text: narration })
    script.push({ type: 'outlineDegree',  degree: 0, side: varSide, color: '#60a5fa' })
    script.push({
      type: 'sendToOtherSide',
      id:            b.id,
      resultId,
      combineWithIds,
      combinedVal,
      variable:      null,
      degree:        0,
    })
    script.push({ type: 'clearOutlines' })

    state.remove(b.id)
    combineWithIds.forEach(cid => state.remove(cid))
    if (Math.abs(combinedVal) > 1e-9) {
      state.insertAt(new MathObject({
        id: resultId,
        sign:        combinedVal >= 0 ? '+' : '-',
        coefficient: Math.abs(combinedVal),
        variable:    null,
        degree:      0,
      }), otherSide, firstPos)
    }
  }

  // ── 4b. Move degree-2 constants away from the squared variable ───────────
  // Handles equations like a² + b² = c² where all terms are degree-2.
  // Evaluates constant^degree (e.g. 5²→25, 13²→169) when combining.
  const sq2var = [...state.left, ...state.right].find(t => t.degree === 2 && t.variable)
  if (sq2var && !hasLinearVar) {
    const sq2Side   = sq2var.side
    const sq2Other  = sq2Side === 'left' ? 'right' : 'left'
    const constTerms = (sq2Side === 'left' ? state.left : state.right).filter(t => !t.variable)

    for (const constTerm of [...constTerms]) {
      const resultId       = crypto.randomUUID()
      const otherConsts    = (sq2Other === 'left' ? state.left : state.right).filter(t => !t.variable)
      const combineWithIds = otherConsts.map(t => t.id)

      const evalV = t => (t.sign === '-' ? -1 : 1) *
        (!t.variable && t.degree > 1 ? t.coefficient ** t.degree : t.coefficient)

      const flippedVal  = -evalV(constTerm)
      const combinedVal = otherConsts.reduce((s, t) => s + evalV(t), 0) + flippedVal

      const firstPos = otherConsts.length > 0
        ? (sq2Other === 'left' ? state.left : state.right).indexOf(otherConsts[0])
        : (sq2Other === 'left' ? state.left : state.right).length

      script.push({ type: 'showNarration', text: `Move ${fmtTermFull(constTerm)} to the other side.` })
      script.push({
        type: 'sendToOtherSide',
        id:            constTerm.id,
        resultId,
        combineWithIds,
        combinedVal,
        variable:      null,
        degree:        0,
      })

      state.remove(constTerm.id)
      combineWithIds.forEach(cid => state.remove(cid))
      if (Math.abs(combinedVal) > 1e-9) {
        state.insertAt(new MathObject({
          id:          resultId,
          sign:        combinedVal >= 0 ? '+' : '-',
          coefficient: Math.abs(combinedVal),
          variable:    null,
          degree:      0,
        }), sq2Other, firstPos)
      }
    }
  }

  // ── 5. Divide ──────────────────────────────────────────────────────────────
  const xTerm   = state.findByDegree(1, varSide)[0]
  const divisor = xTerm?.coefficient ?? 1
  if (xTerm && divisor !== 1) {
    script.push({ type: 'showNarration', text: `Divide both sides by ${divisor}.` })
    script.push({ type: 'divideBothSides', divisor })
  }

  // ── 5b. Square root — if a degree-2 term remains isolated, take √ both sides ──
  const sq = [...state.left, ...state.right].find(t => t.degree === 2 && t.variable)
  if (sq) {
    script.push({ type: 'showNarration', text: 'Take the square root of both sides.' })
    script.push({ type: 'racineDesBords' })
  }

  // ── 6. Done — no answer box; just hold on the solved equation for a beat ─────
  script.push({ type: 'pause', seconds: 1.5 })

  return script
}

// ── distributeAllParens ───────────────────────────────────────────────────────

export function generateDistributeScript(initialSnapshot) {
  const script = []
  const state  = EquationState.fromSnapshot(initialSnapshot)
  script.push({ type: 'renderEquation' })
  distributeAllParens(state, script)
  return script
}

function distributeAllParens(state, script) {
  for (const side of ['left', 'right']) {
    const arr    = side === 'left' ? state.left : state.right
    const groups = arr.filter(t => t.isParenGroup)
    for (const group of [...groups]) {
      const outerVal = group.sign === '-' ? -group.parenCoeff : group.parenCoeff
      const expandedTerms = (group.innerTerms ?? []).map(inner => {
        const innerVal   = inner.sign === '-' ? -inner.coefficient : inner.coefficient
        const expandedVal = outerVal * innerVal
        return {
          id:          crypto.randomUUID(),
          sign:        expandedVal >= 0 ? '+' : '-',
          coefficient: Math.abs(expandedVal),
          variable:    inner.variable,
          degree:      inner.degree,
        }
      })

      const insertIdx = (side === 'left' ? state.left : state.right).indexOf(group)

      script.push({ type: 'showNarration', text: `Distribute ${fmtParenGroup(group)}.` })
      script.push({
        type: 'distributeParentheses',
        id:   group.id,
        side,
        insertIdx,
        expandedTerms,
      })

      // Simulate state update for subsequent steps
      state.remove(group.id)
      expandedTerms.forEach((t, i) => {
        state.insertAt(new MathObject(t), side, insertIdx + i)
      })
    }
  }
}

function fmtParenGroup(group) {
  const coeff = group.parenCoeff === 1 ? '' : String(parseFloat(group.parenCoeff.toFixed(4)))
  const sign  = group.sign === '-' ? '−' : ''
  const inner = (group.innerTerms ?? []).map((t, i) => {
    const sep = i > 0 ? (t.sign === '-' ? ' − ' : ' + ') : (t.sign === '-' ? '−' : '')
    const c   = t.coefficient === 1 && t.variable ? '' : String(parseFloat(Math.abs(t.coefficient).toFixed(4)))
    return `${sep}${c}${t.variable ?? ''}`
  }).join('')
  return `${sign}${coeff}(${inner})`
}

// ── combineOnSide ─────────────────────────────────────────────────────────────

function combineOnSide(state, script, degree, side) {
  const terms = state.findByDegree(degree, side)
  if (terms.length < 2) return

  const arr = side === 'left' ? state.left : state.right

  // Reorder so like terms are adjacent before combining
  const positions   = terms.map(t => arr.indexOf(t))
  const notAdjacent = positions.some((p, i) => i > 0 && p !== positions[i - 1] + 1)

  if (notAdjacent) {
    const others    = arr.filter(t => t.degree !== degree)
    const reordered = degree > 0 ? [...terms, ...others] : [...others, ...terms]
    script.push({ type: 'reorderEquation', [side]: reordered.map(t => t.id) })
    if (side === 'left') state.left  = reordered
    else                 state.right = reordered
    state.reflow()
  }

  const combinedVal = terms.reduce((sum, t) => sum + t.value, 0)
  const label       = degree === 0 ? 'constants' : `${terms[0].variable} terms`
  const color       = '#60a5fa'
  const newId       = crypto.randomUUID()
  const firstPos    = (side === 'left' ? state.left : state.right).indexOf(terms[0])

  script.push({ type: 'showNarration',  text: `Combine the ${label} on the ${side}.` })
  script.push({ type: 'outlineDegree',  degree, side, color })
  script.push({
    type: 'combineTerms',
    ids:      terms.map(t => t.id),
    firstPos,
    result: {
      id: newId,
      sign:        combinedVal >= 0 ? '+' : '-',
      coefficient: Math.abs(combinedVal),
      variable:    degree > 0 ? terms[0].variable : null,
      degree,
      side,
    },
  })
  script.push({ type: 'clearOutlines' })

  // Simulate
  terms.forEach(t => state.remove(t.id))
  state.insertAt(new MathObject({
    id: newId,
    sign:        combinedVal >= 0 ? '+' : '-',
    coefficient: Math.abs(combinedVal),
    variable:    degree > 0 ? terms[0].variable : null,
    degree,
  }), side, firstPos)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTerm(term) {
  const sign  = term.sign === '-' ? '−' : ''
  const coeff = term.coefficient === 1 ? '' : String(term.coefficient)
  return `${sign}${coeff}${term.variable ?? ''}`
}

function fmtTermFull(term) {
  const sup  = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
  const deg  = term.degree >= 2 ? (sup[term.degree] ?? `^${term.degree}`) : ''
  const sign = term.sign === '-' ? '−' : ''
  const coeff = (term.coefficient === 1 && term.variable) ? '' : String(parseFloat(term.coefficient.toFixed(4)))
  return `${sign}${coeff}${term.variable ?? ''}${deg}`
}

// ── Quadratic formula approach ────────────────────────────────────────────────
export function generateQuadraticScript(state, script) {
  const fmt  = n => Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(6)).toString()
  // Wrap negatives in parens for LaTeX multiplication/power contexts
  const fmtL = n => n < 0 ? `(${fmt(n)})` : fmt(n)

  // 1. Move all right-side terms to left → standard form ax² + bx + c = 0
  const rightCopy = [...state.right]
  if (rightCopy.length > 0) {
    script.push({ type: 'showNarration', text: 'Mise en forme standard : ax² + bx + c = 0' })
  }
  for (const rTerm of rightCopy) {
    const resultId       = crypto.randomUUID()
    const matchLeft      = state.left.filter(t => t.degree === rTerm.degree && !!t.variable === !!rTerm.variable)
    const combineWithIds = matchLeft.map(t => t.id)
    const flippedVal     = -rTerm.value
    const combinedVal    = matchLeft.reduce((s, t) => s + t.value, 0) + flippedVal
    const firstPos       = matchLeft.length > 0
      ? state.left.indexOf(matchLeft[0])
      : state.left.length

    script.push({
      type: 'sendToOtherSide',
      id: rTerm.id, resultId, combineWithIds, combinedVal,
      variable: rTerm.variable, degree: rTerm.degree,
    })

    state.remove(rTerm.id)
    combineWithIds.forEach(cid => state.remove(cid))
    if (Math.abs(combinedVal) > 1e-9) {
      state.insertAt(new MathObject({
        id: resultId,
        sign: combinedVal >= 0 ? '+' : '-',
        coefficient: Math.abs(combinedVal),
        variable: rTerm.variable, degree: rTerm.degree,
      }), 'left', firstPos)
    }
  }

  // 2. Extract a, b, c from left side (right is now empty = 0)
  const aTerm = state.left.find(t => t.degree === 2 && t.variable)
  const bTerm = state.left.find(t => t.degree === 1 && t.variable)
  const cTerm = state.left.find(t => !t.variable && t.degree === 0)
  const a = aTerm?.value ?? 0
  const b = bTerm?.value ?? 0
  const c = cTerm?.value ?? 0
  const v = aTerm?.variable ?? 'x'

  const disc     = b * b - 4 * a * c
  const sqrtDisc = disc >= 0 ? Math.sqrt(disc) : null

  // 3. Sequential highlight + identify each coefficient — shown as a free
  // comment (no connector line, just floats on the side), not a text box.
  // — highlight a (degree-2 term, purple)
  script.push({ type: 'outlineDegree', degree: 2, side: 'left', color: '#818cf8' })
  script.push({
    type: 'add-comment', id: 'quad-abc',
    title: 'Coefficients', text: `$a = ${fmt(a)}$`, color: 'purple',
    target: { type: 'free', side: 'right' },
  })
  script.push({ type: 'pause', seconds: 0.7 })

  // — highlight b (degree-1 term, orange)
  script.push({ type: 'clearOutlines' })
  script.push({ type: 'outlineDegree', degree: 1, side: 'left', color: '#fb923c' })
  script.push({ type: 'update-comment', id: 'quad-abc', text: `$a = ${fmt(a)}$\n$b = ${fmt(b)}$` })
  script.push({ type: 'pause', seconds: 0.7 })

  // — highlight c (degree-0 constant, green)
  script.push({ type: 'clearOutlines' })
  script.push({ type: 'outlineDegree', degree: 0, side: 'left', color: '#4ade80' })
  script.push({ type: 'update-comment', id: 'quad-abc', text: `$a = ${fmt(a)}$\n$b = ${fmt(b)}$\n$c = ${fmt(c)}$` })
  script.push({ type: 'pause', seconds: 0.7 })
  script.push({ type: 'clearOutlines' })

  // 4. Show the quadratic formula once, as a plain reference (not substituted —
  // the substitution happens live in the equation panel below).
  script.push({
    type: 'text-create', id: 'quad-formula',
    title: 'Formule quadratique',
    items: [
      `$${v} = \\dfrac{-b \\pm \\sqrt{b^2-4ac}}{2a}$`,
      'où $\\Delta = b^2-4ac$ est le **discriminant** : son signe indique le nombre de solutions (2, 1 ou 0).',
    ],
    isList: false, color: 'amber',
  })
  script.push({ type: 'pause', seconds: 2.5 })

  // ── 5. Solve it for real, in the equation panel ───────────────────────────
  // Every value below is already known (a, b, c are plain numbers by now), so
  // each step is just a fully-resolved snapshot — no runtime evaluation needed.
  const cst  = (val, extra = {}) => ({ sign: val >= 0 ? '+' : '-', coefficient: Math.abs(val), variable: null, degree: 0, ...extra })
  const vTerm = (name, extra = {}) => ({ sign: '+', coefficient: 1, variable: name, degree: 1, ...extra })
  const frac = (sign, numeratorTerms, denominatorTerms) =>
    ({ sign, isFraction: true, numeratorTerms, denominatorTerms, coefficient: 1, variable: null, degree: 1 })

  const negB      = -b
  const fourAC    = 4 * a * c
  const bSquared  = b * b

  // Δ = b² − 4ac  (shown with the actual substituted numbers — base, not yet squared)
  script.push({
    type: 'replaceEquation',
    left:  [vTerm('Δ')],
    right: [
      cst(Math.abs(b), { degree: 2, negBase: b < 0 }),
      cst(-fourAC),
    ],
  })
  script.push({ type: 'pause', seconds: 0.7 })

  // Δ = <b²> − <4ac>  (both sides evaluated, still two terms)
  script.push({
    type: 'replaceEquation',
    left:  [vTerm('Δ')],
    right: [cst(bSquared), cst(-fourAC)],
  })
  script.push({ type: 'pause', seconds: 0.6 })

  // Δ = <disc>  (combined)
  script.push({
    type: 'replaceEquation',
    left:  [vTerm('Δ')],
    right: [cst(disc)],
  })
  script.push({ type: 'pause', seconds: 0.8 })

  if (disc > 1e-9) {
    const x1 = (negB + sqrtDisc) / (2 * a)
    const x2 = (negB - sqrtDisc) / (2 * a)

    // x = (−b ± √Δ) / 2a  — with √Δ still showing the radical
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(v)],
      right: [frac('+',
        [cst(negB), { sign: '+', coefficient: disc, variable: null, degree: 0, isSqrt: true, pmOperator: true }],
        [cst(2 * a)],
      )],
    })
    script.push({ type: 'pause', seconds: 0.8 })

    // x = (−b ± √Δ) / 2a  — radical resolved
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(v)],
      right: [frac('+',
        [cst(negB), { sign: '+', coefficient: sqrtDisc, variable: null, degree: 0, pmOperator: true }],
        [cst(2 * a)],
      )],
    })
    script.push({ type: 'pause', seconds: 0.9 })

    // ── Branch 1: x₁ ──
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(`${v}₁`)],
      right: [frac('+', [cst(negB), cst(sqrtDisc)], [cst(2 * a)])],
    })
    script.push({ type: 'pause', seconds: 0.6 })
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(`${v}₁`)],
      right: [frac('+', [cst(negB + sqrtDisc)], [cst(2 * a)])],
    })
    script.push({ type: 'pause', seconds: 0.5 })
    script.push({ type: 'replaceEquation', left: [vTerm(`${v}₁`)], right: [cst(x1)] })
    script.push({ type: 'pause', seconds: 0.9 })

    // ── Branch 2: x₂ ──
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(`${v}₂`)],
      right: [frac('+', [cst(negB), cst(-sqrtDisc)], [cst(2 * a)])],
    })
    script.push({ type: 'pause', seconds: 0.6 })
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(`${v}₂`)],
      right: [frac('+', [cst(negB - sqrtDisc)], [cst(2 * a)])],
    })
    script.push({ type: 'pause', seconds: 0.5 })
    script.push({ type: 'replaceEquation', left: [vTerm(`${v}₂`)], right: [cst(x2)] })
    script.push({ type: 'pause', seconds: 0.6 })

    script.push({ type: 'showAnswer', text: `${v}₁ = ${fmt(x1)}     ${v}₂ = ${fmt(x2)}` })
  } else if (disc >= -1e-9) {
    const x = negB / (2 * a)
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(v)],
      right: [frac('+', [cst(negB)], [cst(2 * a)])],
    })
    script.push({ type: 'pause', seconds: 0.7 })
    script.push({ type: 'replaceEquation', left: [vTerm(v)], right: [cst(x)] })
    script.push({ type: 'pause', seconds: 0.8 })
    script.push({ type: 'text-add-item', id: 'quad-formula', text: '$\\Delta = 0$ → une seule solution' })
    script.push({ type: 'showAnswer', text: `${v} = ${fmt(x)}` })
  } else {
    script.push({ type: 'text-add-item', id: 'quad-formula', text: '$\\Delta < 0$ → pas de solution réelle' })
  }

  script.push({ type: 'pause', seconds: 2.0 })
}

