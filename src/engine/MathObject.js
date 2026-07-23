export class MathObject {
  constructor({ id, sign = '+', coefficient = 1, variable = null, degree = 0,
                cellIndex = 0, side = 'left',
                symbolicLabel = undefined, showDegree = false,
                isFraction = false, numeratorTerms = null, denominatorTerms = null,
                color = null, varParts = null,
                isOperator = false, text = null,
                isParenGroup = false, parenCoeff = 1, parenCoeffVariable = null, parenCoeffDegree = 1, innerTerms = null,
                factors = null, negBase = false, expr = null } = {}) {
    this.id = id ?? crypto.randomUUID()
    this.sign = sign
    this.coefficient = coefficient
    this.variable = variable
    this.degree = degree
    this.cellIndex = cellIndex
    this.side = side
    this.symbolicLabel = symbolicLabel
    this.showDegree    = showDegree
    // Fraction fields — only used when isFraction = true
    this.isFraction       = isFraction
    this.numeratorTerms   = numeratorTerms   // array of plain sub-term objects
    this.denominatorTerms = denominatorTerms
    this.color            = color
    this.varParts         = varParts         // [{text, color}] for segmented display (e.g. sin(θ) with colored arg)
    this.isOperator       = isOperator       // true = pure display token (e.g. "arcsin(" or ")"), no math value
    this.text             = text             // display string for operator tokens
    // Paren-group fields — only used when isParenGroup = true (degree = -1 as sentinel)
    this.isParenGroup     = isParenGroup     // e.g. 2(x+3) waiting for distribution
    this.parenCoeff       = parenCoeff       // the multiplier's numeric magnitude (always positive; sign captures ±)
    this.parenCoeffVariable = parenCoeffVariable // e.g. "x" in 2x(x+4) — null for a plain numeric coefficient
    this.parenCoeffDegree   = parenCoeffDegree   // degree of parenCoeffVariable (1 for "x", 2 for "x²", …)
    this.innerTerms       = innerTerms       // [{sign, coefficient, variable, degree}] — terms inside the parens
    // Product fields — a term that is a product of factors, e.g. |m||x| = m·x.
    // Each factor is replaceable on its own. value = coefficient × ∏ factor values.
    this.factors          = factors          // [{symbolicLabel?, coefficient, variable?, degree}] or null
    this.negBase          = negBase          // true → render coefficient wrapped as (−n) before the exponent
    // Generic expression tree (see exprTree.js) — a term that IS an arithmetic
    // sub-expression, e.g. (B+b)*h/2 or pi*r^2. Every number is its own leaf;
    // operators/parens are pure tree structure, never folded into one term.
    // Resolved by ONE generic order-of-operations walker, not a per-shape script.
    this.expr             = expr
  }

  get value() {
    return this.sign === '-' ? -this.coefficient : this.coefficient
  }

  // Human-readable label for rendering, e.g. "3x²", "-5", "x"
  get label() {
    const coeff = this.coefficient
    const absCoeff = Math.abs(coeff)
    const varPart = this.variable ?? ''
    const degPart = this.degree >= 2 ? superscript(this.degree) : ''

    if (!varPart) return String(coeff)
    if (absCoeff === 1) return varPart + degPart
    return String(absCoeff) + varPart + degPart
  }

  clone(overrides = {}) {
    return new MathObject({ ...this, id: undefined, ...overrides })
  }
}

function superscript(n) {
  const map = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
  return map[n] ?? `^${n}`
}
