// A term rebuilt from a snapshot must not share the snapshot's nested objects.
// The expression tree is the one that bites: a solve step rewrites its nodes IN
// PLACE (a "3,56 − 1,2" node becomes a "2,36" node), and while the tree was
// shared, that rewrote the saved "before" state too — so stepping back landed
// on the answer instead of the question, and the original equation could not be
// reached at all. The plain sub-term arrays are copied for the same reason.
const deepCopy = (v) =>
  Array.isArray(v) ? v.map(deepCopy)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepCopy(x)]))
      : v

export class MathObject {
  constructor({ id, sign = '+', coefficient = 1, variable = null, degree = 0,
                cellIndex = 0, side = 'left',
                symbolicLabel = undefined, showDegree = false,
                isFraction = false, numeratorTerms = null, denominatorTerms = null,
                color = null, varParts = null, decimalComma = false, mixedJoin = false, listJoin = false,
                isOperator = false, text = null,
                isParenGroup = false, parenCoeff = 1, parenCoeffVariable = null, parenCoeffDegree = 1, innerTerms = null, outerTerms = null,
                parensDropped = false,
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
    this.numeratorTerms   = deepCopy(numeratorTerms)   // array of plain sub-term objects
    this.denominatorTerms = deepCopy(denominatorTerms)
    this.color            = color
    this.varParts         = deepCopy(varParts)         // [{text, color}] for segmented display (e.g. sin(θ) with colored arg)
    // Which decimal separator the author wrote. A term rebuilt from a snapshot
    // has to keep it, or the number is redrawn with a point the first time the
    // panel re-renders — which is every step after the first.
    this.decimalComma     = decimalComma
    // True on the fraction of a mixed number: its "+" is hidden when the
    // equation first appears and revealed a beat later.
    this.mixedJoin        = mixedJoin
    // True on the first term of each item of a list ("3 ; 7 ; 11"): the items
    // sit side by side, so no + is drawn in front of it.
    this.listJoin         = listJoin
    this.isOperator       = isOperator       // true = pure display token (e.g. "arcsin(" or ")"), no math value
    this.text             = text             // display string for operator tokens
    // Paren-group fields — only used when isParenGroup = true (degree = -1 as sentinel)
    this.isParenGroup     = isParenGroup     // e.g. 2(x+3) waiting for distribution
    this.parenCoeff       = parenCoeff       // the multiplier's numeric magnitude (always positive; sign captures ±)
    this.parenCoeffVariable = parenCoeffVariable // e.g. "x" in 2x(x+4) — null for a plain numeric coefficient
    this.parenCoeffDegree   = parenCoeffDegree   // degree of parenCoeffVariable (1 for "x", 2 for "x²", …)
    this.innerTerms       = deepCopy(innerTerms)       // [{sign, coefficient, variable, degree}] — terms inside the parens
    // A bracket multiplying a bracket, (3x+2)(2x-2): the multiplier is these
    // terms rather than parenCoeff. Distribution crosses the two lists.
    this.outerTerms       = deepCopy(outerTerms)
    // The bracket has been worked out down to one number: it is drawn without
    // its brackets, "2 × 8" rather than "2(8)", until the multiplication runs.
    this.parensDropped    = parensDropped
    // Product fields — a term that is a product of factors, e.g. |m||x| = m·x.
    // Each factor is replaceable on its own. value = coefficient × ∏ factor values.
    this.factors          = deepCopy(factors)          // [{symbolicLabel?, coefficient, variable?, degree}] or null
    this.negBase          = negBase          // true → render coefficient wrapped as (−n) before the exponent
    // Generic expression tree (see exprTree.js) — a term that IS an arithmetic
    // sub-expression, e.g. (B+b)*h/2 or pi*r^2. Every number is its own leaf;
    // operators/parens are pure tree structure, never folded into one term.
    // Resolved by ONE generic order-of-operations walker, not a per-shape script.
    this.expr             = deepCopy(expr)
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
