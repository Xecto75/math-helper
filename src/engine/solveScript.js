import { MathObject } from './MathObject.js'
import { EquationState } from './EquationState.js'
import { bin, pm, sqrtN, num, label, negN, pw } from './exprTree.js'

export function generateScript(initialSnapshot, originalInput) {
  const script = []
  const state  = EquationState.fromSnapshot(initialSnapshot)

  script.push({ type: 'showTitle',    text: `Solving: ${originalInput}` })
  script.push({ type: 'renderEquation' })

  // ── 0. Distribute parentheses ──────────────────────────────────────────────
  distributeAllParens(state, script)

  // ── 1-2. Combine like terms on both sides ──────────────────────────────────
  // Always one step at a time, in order — never bundle with anything else.
  combineOnSide(state, 1, 'left').forEach(a => script.push(a))   // x-terms
  combineOnSide(state, 0, 'left').forEach(a => script.push(a))   // constants
  combineOnSide(state, 1, 'right').forEach(a => script.push(a))
  combineOnSide(state, 0, 'right').forEach(a => script.push(a))

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
    script.push({
      type: 'sendToOtherSide',
      id:            term.id,
      resultId,
      combineWithIds,
      combinedVal,
      variable:      term.variable,
      degree:        term.degree,
    })

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
    script.push({
      type: 'sendToOtherSide',
      id:            b.id,
      resultId,
      combineWithIds,
      combinedVal,
      variable:      null,
      degree:        0,
    })

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

  // ── 5. Divide / multiply to isolate the variable ───────────────────────────
  // "x/2 = 4" is more naturally cleared by multiplying both sides by 2 than
  // by dividing both sides by 0.5 — same result, but "multiply by 2" is how
  // this is actually taught, and it's the operation a unit-fraction
  // coefficient (1/n) came from in the first place. Only fires when the
  // reciprocal is itself a clean whole number; every other coefficient
  // (whole numbers, non-unit fractions) still divides exactly as before.
  const xTerm = state.findByDegree(1, varSide)[0]
  // SIGNED — `coefficient` is a magnitude, the sign lives beside it. Reading
  // the magnitude alone divided -9x = 3 by 9 and stopped at "-x = 0.333", and
  // skipped -x = 4 entirely (magnitude 1, "nothing to do"). Isolating x means
  // ending on +1x, so the divisor is the coefficient WITH its sign.
  const coeff = (xTerm?.sign === '-' ? -1 : 1) * (xTerm?.coefficient ?? 1)
  if (xTerm && Math.abs(coeff - 1) > 1e-9) {
    const reciprocal    = 1 / coeff
    const roundedRecip  = Math.round(reciprocal)
    const isUnitFraction = coeff < 1 && Math.abs(reciprocal - roundedRecip) < 1e-6 && roundedRecip > 1
    if (isUnitFraction) {
      script.push({ type: 'showNarration', text: `Multiply both sides by ${roundedRecip}.` })
      script.push({ type: 'multiplyBothSides', multiplier: roundedRecip })
    } else {
      script.push({ type: 'showNarration', text: `Divide both sides by ${coeff}.` })
      script.push({ type: 'divideBothSides', divisor: coeff })
    }
  }

  // ── 5b. Square root — if a degree-2 term remains isolated, take √ both sides ──
  const sq = [...state.left, ...state.right].find(t => t.degree === 2 && t.variable)
  if (sq) {
    script.push({ type: 'showNarration', text: 'Take the square root of both sides.' })
    script.push({ type: 'racineDesBords' })
  }

  // ── 6. Done — full-solve-current's own highlight box fires right after this
  // script finishes, so there's no need to hold here too (used to, back before
  // that highlight existed — this pause was just adding dead air in front of it).

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
      const outerVar = group.parenCoeffVariable ?? null
      const outerDeg = group.parenCoeffDegree ?? 1
      const expandedTerms = (group.innerTerms ?? []).map(inner => {
        const innerVal    = inner.sign === '-' ? -inner.coefficient : inner.coefficient
        const expandedVal = outerVal * innerVal

        // Polynomial multiplication: same variable on both sides → degrees
        // add (x·x=x²); only one side has a variable → it carries straight
        // through (2x·4=8x, 2·x=2x); genuinely different variables (rare,
        // e.g. 2x(y+4)) has no clean single-variable representation here —
        // fall back to treating it as a plain product label.
        let variable = inner.variable ?? outerVar
        let degree   = 0
        if (outerVar && inner.variable && outerVar === inner.variable) {
          degree = outerDeg + inner.degree
        } else if (outerVar && !inner.variable) {
          degree = outerDeg
        } else if (!outerVar && inner.variable) {
          degree = inner.degree
        } else if (outerVar && inner.variable) {
          variable = `${outerVar}${inner.variable}`
          degree   = 1
        }

        return {
          id:          crypto.randomUUID(),
          sign:        expandedVal >= 0 ? '+' : '-',
          coefficient: Math.abs(expandedVal),
          variable,
          degree,
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
  const pgVar = group.parenCoeffVariable ?? ''
  const coeff = (group.parenCoeff === 1 && pgVar) ? '' : String(parseFloat(group.parenCoeff.toFixed(3)))
  const sign  = group.sign === '-' ? '−' : ''
  const inner = (group.innerTerms ?? []).map((t, i) => {
    const sep = i > 0 ? (t.sign === '-' ? ' − ' : ' + ') : (t.sign === '-' ? '−' : '')
    const c   = t.coefficient === 1 && t.variable ? '' : String(parseFloat(Math.abs(t.coefficient).toFixed(3)))
    return `${sep}${c}${t.variable ?? ''}`
  }).join('')
  return `${sign}${coeff}${pgVar}(${inner})`
}

// ── combineOnSide ─────────────────────────────────────────────────────────────

// Returns the list of actions for this combine (empty if there's nothing to
// combine) instead of pushing directly — the caller decides whether to push
// them standalone or bundle them with an adjacent step (see generateScript).
function combineOnSide(state, degree, side) {
  const terms = state.findByDegree(degree, side)
  if (terms.length < 2) return []

  const arr = side === 'left' ? state.left : state.right
  const actions = []

  // Reorder so like terms are adjacent before combining
  const positions   = terms.map(t => arr.indexOf(t))
  const notAdjacent = positions.some((p, i) => i > 0 && p !== positions[i - 1] + 1)

  if (notAdjacent) {
    const others    = arr.filter(t => t.degree !== degree)
    const reordered = degree > 0 ? [...terms, ...others] : [...others, ...terms]
    actions.push({ type: 'reorderEquation', [side]: reordered.map(t => t.id) })
    if (side === 'left') state.left  = reordered
    else                 state.right = reordered
    state.reflow()
  }

  const combinedVal = terms.reduce((sum, t) => sum + t.value, 0)
  const label       = degree === 0 ? 'constants' : `${terms[0].variable} terms`
  const color       = '#60a5fa'
  const newId       = crypto.randomUUID()
  const firstPos    = (side === 'left' ? state.left : state.right).indexOf(terms[0])

  actions.push({ type: 'showNarration',  text: `Combine the ${label} on the ${side}.` })
  actions.push({ type: 'outlineDegree',  degree, side, color })
  actions.push({
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
  actions.push({ type: 'clearOutlines' })

  // Simulate
  terms.forEach(t => state.remove(t.id))
  state.insertAt(new MathObject({
    id: newId,
    sign:        combinedVal >= 0 ? '+' : '-',
    coefficient: Math.abs(combinedVal),
    variable:    degree > 0 ? terms[0].variable : null,
    degree,
  }), side, firstPos)

  return actions
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
  const coeff = (term.coefficient === 1 && term.variable) ? '' : String(parseFloat(term.coefficient.toFixed(3)))
  return `${sign}${coeff}${term.variable ?? ''}${deg}`
}

// ── Quadratic formula approach ────────────────────────────────────────────────
export function generateQuadraticScript(state, script) {
  const fmt  = n => Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(6)).toString()
  // Wrap negatives in parens for LaTeX multiplication/power contexts
  const fmtL = n => n < 0 ? `(${fmt(n)})` : fmt(n)

  // 1. Move all right-side terms to left → standard form ax² + bx + c = 0
  // A bare "= 0" is already standard form — nothing to move, so a literal
  // zero term contributes nothing and shouldn't spend an animation step
  // "sending" it across (a no-op −0 on both sides).
  const rightCopy = [...state.right].filter(t => t.value !== 0)
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
    title: 'Quadratic Formula',
    items: [
      `$${v} = \\dfrac{-b \\pm \\sqrt{b^2-4ac}}{2a}$`,
      'where $\\Delta = b^2-4ac$ is the **discriminant**: its sign indicates the number of solutions (2, 1, or 0).',
    ],
    isList: false,
  })
  script.push({ type: 'pause', seconds: 2.5 })

  // ── 5. Solve it for real, in the equation panel ───────────────────────────
  // Every step below follows the SAME formula-then-substitute-then-solve
  // pattern as any other equation in this app: show the formula with its real
  // letters (a, b, c, Δ) first, THEN replace those letters with the actual
  // numbers, THEN let the generic expression-tree evaluator reduce it — never
  // jumping straight to pre-computed numbers.
  const vTerm = (name, extra = {}) => ({ sign: '+', coefficient: 1, variable: name, degree: 1, ...extra })
  // A term that IS an arithmetic sub-expression (see exprTree.js) — same
  // representation the parser builds for (B+b)*h/2, π*r² etc., so the
  // quadratic's formula is resolved by the exact same generic walker.
  const exprTerm = root => ({ sign: '+', expr: root, coefficient: 1, variable: null, degree: 0 })
  const subst = (...pairs) => ({ type: 'replaceVariable', replacements: pairs.map(([lbl, value]) => ({ label: lbl, value })) })

  const negB = -b   // only used for the final ANSWER banner text below

  // Δ = b² − 4ac — the formula first (real letters), then substitute a, b, c.
  script.push({
    type: 'replaceEquation',
    left:  [vTerm('Δ')],
    right: [exprTerm(bin('-', pw(label('b'), 2), bin('*', bin('*', num(4), label('a')), label('c'))))],
  })
  script.push({ type: 'pause', seconds: 0.5 })
  script.push(subst(['a', a], ['b', b], ['c', c]))
  script.push({ type: 'pause', seconds: 0.5 })
  script.push({ type: 'full-solve-current' })
  script.push({ type: 'pause', seconds: 0.8 })

  if (disc > 1e-9) {
    const x1 = (negB + sqrtDisc) / (2 * a)
    const x2 = (negB - sqrtDisc) / (2 * a)

    // x = (−b ± √Δ) / 2a — formula first (b, Δ, a as real letters), then
    // substitute. The generic evaluator reveals √Δ in place but never
    // resolves the ± itself — choosing a side is exactly what x₁/x₂ do next.
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(v)],
      right: [exprTerm(bin('/', pm(negN(label('b')), sqrtN(label('Δ'))), bin('*', num(2), label('a'))))],
    })
    script.push({ type: 'pause', seconds: 0.5 })
    script.push(subst(['a', a], ['b', b], ['Δ', disc]))
    script.push({ type: 'pause', seconds: 0.5 })
    script.push({ type: 'full-solve-current' })
    script.push({ type: 'pause', seconds: 0.9 })

    // ── Branch 1: x₁ — pick '+', continuing from EXACTLY where the general
    // formula left off (e.g. "(5 ± 1) / 2") instead of re-deriving it ──
    script.push({ type: 'chooseQuadraticBranch', newLabel: `${v}₁`, sign: '+' })
    script.push({ type: 'pause', seconds: 0.5 })
    script.push({ type: 'full-solve-current' })
    script.push({ type: 'pause', seconds: 0.9 })

    // ── Branch 2: x₂ — rewind to that same shared point, then pick '-' ──
    script.push({ type: 'restoreQuadraticBranch', newLabel: `${v}₂` })
    script.push({ type: 'pause', seconds: 0.4 })
    script.push({ type: 'chooseQuadraticBranch', sign: '-' })
    script.push({ type: 'pause', seconds: 0.5 })
    script.push({ type: 'full-solve-current' })
    script.push({ type: 'pause', seconds: 0.6 })

    script.push({ type: 'showAnswer', text: `${v}₁ = ${fmt(x1)}     ${v}₂ = ${fmt(x2)}` })
  } else if (disc >= -1e-9) {
    const x = negB / (2 * a)
    script.push({
      type: 'replaceEquation',
      left:  [vTerm(v)],
      right: [exprTerm(bin('/', negN(label('b')), bin('*', num(2), label('a'))))],
    })
    script.push({ type: 'pause', seconds: 0.5 })
    script.push(subst(['a', a], ['b', b]))
    script.push({ type: 'pause', seconds: 0.5 })
    script.push({ type: 'full-solve-current' })
    script.push({ type: 'pause', seconds: 0.8 })
    script.push({ type: 'text-add-item', id: 'quad-formula', text: '$\\Delta = 0$ → one solution' })
    script.push({ type: 'showAnswer', text: `${v} = ${fmt(x)}` })
  } else {
    script.push({ type: 'text-add-item', id: 'quad-formula', text: '$\\Delta < 0$ → no real solution' })
  }

  script.push({ type: 'pause', seconds: 2.0 })
}

