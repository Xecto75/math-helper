import { MathObject } from './MathObject.js'

export class EquationState {
  constructor(left = [], right = []) {
    // Deep-clone so mutations don't share references
    this.left = left.map(t => t instanceof MathObject ? t : new MathObject(t))
    this.right = right.map(t => t instanceof MathObject ? t : new MathObject(t))
    this._reindex()
  }

  _reindex() {
    this.left.forEach((t, i) => { t.side = 'left'; t.cellIndex = i })
    this.right.forEach((t, i) => { t.side = 'right'; t.cellIndex = i })
  }

  findByDegree(degree, side = null) {
    const pool = side === 'left' ? this.left : side === 'right' ? this.right : [...this.left, ...this.right]
    return pool.filter(t => t.degree === degree)
  }

  findById(id) {
    return [...this.left, ...this.right].find(t => t.id === id) ?? null
  }

  add(term, side) {
    const arr = side === 'left' ? this.left : this.right
    const obj = term instanceof MathObject ? term : new MathObject(term)
    arr.push(obj)
    this._reindex()
    return this
  }

  /** Insert at a specific array index (not cellIndex). Safe: clamps to array length. */
  insertAt(term, side, index) {
    const arr = side === 'left' ? this.left : this.right
    const obj = term instanceof MathObject ? term : new MathObject(term)
    arr.splice(Math.min(index, arr.length), 0, obj)
    this._reindex()
    return this
  }

  remove(id) {
    this.left = this.left.filter(t => t.id !== id)
    this.right = this.right.filter(t => t.id !== id)
    this._reindex()
    return this
  }

  reflow() {
    this._reindex()
    return this
  }

  // Return a plain-object snapshot (safe to store in React state)
  snapshot() {
    return {
      left: this.left.map(termToPlain),
      right: this.right.map(termToPlain),
    }
  }

  static fromSnapshot(snap) {
    return new EquationState(snap.left, snap.right)
  }
}

// exprTree nodes are plain data ({t,id,op,a,b,v,name,color}), and full-solve
// resolves them by MUTATING them in place. Handing the same object out with
// every snapshot therefore made all snapshots alias one live tree: any stored
// snapshot silently showed the CURRENT state, so rewinding to one changed
// nothing on screen. A snapshot has to own its tree.
function cloneExpr(n) {
  if (n === null || typeof n !== 'object') return n
  if (Array.isArray(n)) return n.map(cloneExpr)
  const out = {}
  for (const k in n) out[k] = cloneExpr(n[k])
  return out
}

function termToPlain(t) {
  return {
    id:               t.id,
    sign:             t.sign,
    coefficient:      t.coefficient,
    variable:         t.variable,
    degree:           t.degree,
    cellIndex:        t.cellIndex,
    side:             t.side,
    symbolicLabel:    t.symbolicLabel,
    showDegree:       t.showDegree,
    isFraction:       t.isFraction       ?? false,
    numeratorTerms:   t.numeratorTerms   ?? null,
    denominatorTerms: t.denominatorTerms ?? null,
    color:            t.color            ?? null,
    varParts:         t.varParts         ?? null,
    isOperator:       t.isOperator       ?? false,
    text:             t.text             ?? null,
    isParenGroup:     t.isParenGroup     ?? false,
    parenCoeff:       t.parenCoeff       ?? 1,
    parenCoeffVariable: t.parenCoeffVariable ?? null,
    parenCoeffDegree:   t.parenCoeffDegree   ?? 1,
    innerTerms:       t.innerTerms       ?? null,
    factors:          t.factors          ?? null,
    negBase:          t.negBase          ?? false,
    expr:             t.expr ? cloneExpr(t.expr) : null,
  }
}
