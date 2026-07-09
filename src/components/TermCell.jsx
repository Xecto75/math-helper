import { forwardRef } from 'react'

const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
function supStr(n) {
  return String(n).split('').map(c => SUP[c] ?? c).join('')
}

// A coefficient that's (numerically) exactly Math.PI came from typing "pi" in
// an eq-create string (see parseEquation.js's substitutePi) — show the glyph
// instead of the raw decimal everywhere a coefficient is formatted for display.
function fmtNum(n) {
  return Math.abs(n - Math.PI) < 1e-9 ? 'π' : String(parseFloat(n.toFixed(4)))
}

function FracSubTerm({ sub, pos }) {
  if (!sub) return null
  const text = sub.symbolicLabel
    ?? (sub.variable
        ? (sub.coefficient !== 1 ? fmtNum(sub.coefficient) : '') + sub.variable
        : fmtNum(Math.abs(sub.coefficient)))
  return (
    <span
      className="frac-sub-coeff"
      data-label={sub.symbolicLabel ?? undefined}
      data-pos={pos}
      style={sub.color ? { color: sub.color } : undefined}
    >
      {sub.isSqrt ? '√' : ''}{text}
    </span>
  )
}

// A numerator/denominator sub-term that is itself a PRODUCT, e.g. (B + b) × h
// (area-of-trapezoid style). Each factor is either a plain replaceable value
// (rendered via FracSubTerm) or a parenthesized SUM group (rendered as its own
// list of FracSubTerms). pos-strings stay unique so replaceVariable can target
// each replaceable piece individually: "{subIndex}_{factorIndex}[_{groupIndex}]".
function FactorProduct({ factors, subIndex }) {
  return (
    <span className="frac-sub-coeff" data-subfactors={subIndex}>
      {factors.map((f, fi) => (
        <span key={fi} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {fi > 0 && <span className="term-op term-op--mul">×</span>}
          {f.terms ? (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span className="pg-open">(</span>
              {f.terms.map((s, si) => (
                <span key={si} className="frac-sub-wrap">
                  {si > 0 ? <span className="frac-op">{s.sign === '-' ? ' − ' : ' + '}</span>
                          : (s.sign === '-' && <span className="frac-op">−</span>)}
                  <FracSubTerm sub={s} pos={`${subIndex}_${fi}_${si}`} />
                </span>
              ))}
              <span className="pg-close">)</span>
            </span>
          ) : (
            <FracSubTerm sub={f} pos={`${subIndex}_${fi}`} />
          )}
        </span>
      ))}
    </span>
  )
}

// ── Generic expression-tree rendering (exprTree.js) ──────────────────────────
// Every number/label is its OWN bordered chip (a plain .term-cell, same as an
// algebra term) — never glued together inside one shared box. +, -, *, / and
// ( ) render as plain, unboxed connectors between chips (.term-op / .pg-open
// /.pg-close), exactly like the neutral separators between algebra terms.
// Same recursive renderer for a trapezoid's (B+b)×h/2, a circle's π×r², a
// quadratic's (-b+√Δ)/2a — no per-equation-shape branch.
function ExprLeaf({ node, color }) {
  return (
    <div className="term-cell" data-expr-id={node.id} style={color ? { color } : undefined}>
      {node.t === 'label' ? node.name : fmtNum(node.v)}
    </div>
  )
}

function ExprNode({ node, parentPrec = 0, isRightChild = false, color }) {
  if (!node) return null

  if (node.t === 'num' || node.t === 'label')
    return <ExprLeaf node={node} color={color} />

  if (node.t === 'neg') {
    // Parenthesize a negative/compound argument — "−(-5)" reads unambiguously,
    // "−-5" (glued minus signs) does not.
    const needsParens = node.arg.t === 'bin' || (node.arg.t === 'num' && node.arg.v < 0)
    return (
      <span className="expr-group" data-expr-id={node.id}>
        <span className="term-op">−</span>
        {needsParens && <span className="pg-open">(</span>}
        <ExprNode node={node.arg} parentPrec={needsParens ? 0 : 3} color={color} />
        {needsParens && <span className="pg-close">)</span>}
      </span>
    )
  }

  if (node.t === 'sqrt')
    return (
      <span className="expr-group" data-expr-id={node.id}>
        <span className="term-op">√</span>
        <ExprNode node={node.arg} parentPrec={3} color={color} />
      </span>
    )

  if (node.t === 'pow') {
    const baseNeedsParens = node.base.t === 'bin' || node.base.t === 'neg'
    return (
      <span className="expr-group" data-expr-id={node.id} style={{ alignItems: 'flex-start' }}>
        {baseNeedsParens && <span className="pg-open">(</span>}
        <ExprNode node={node.base} parentPrec={0} color={color} />
        {baseNeedsParens && <span className="pg-close">)</span>}
        <span className="term-exp">{supStr(node.exp)}</span>
      </span>
    )
  }

  if (node.t === 'pm') {
    const needsParens = 1 < parentPrec || (1 === parentPrec && isRightChild)
    return (
      <span className="expr-group" data-expr-id={node.id}>
        {needsParens && <span className="pg-open">(</span>}
        <ExprNode node={node.a} parentPrec={1} isRightChild={false} color={color} />
        <span className="term-op">±</span>
        <ExprNode node={node.b} parentPrec={1} isRightChild={true} color={color} />
        {needsParens && <span className="pg-close">)</span>}
      </span>
    )
  }

  if (node.t === 'bin') {
    const prec = (node.op === '+' || node.op === '-') ? 1 : 2
    const needsParens = prec < parentPrec || (prec === parentPrec && isRightChild)
    const opSym = node.op === '*' ? '×' : node.op
    return (
      <span className="expr-group" data-expr-id={node.id}>
        {needsParens && <span className="pg-open">(</span>}
        <ExprNode node={node.a} parentPrec={prec} isRightChild={false} color={color} />
        <span className={`term-op${node.op === '*' ? ' term-op--mul' : ''}`}>{opSym}</span>
        <ExprNode node={node.b} parentPrec={prec} isRightChild={true} color={color} />
        {needsParens && <span className="pg-close">)</span>}
      </span>
    )
  }

  return null
}

// A term whose value is a full arithmetic sub-expression. The outermost `/`
// (if any) renders as a stacked fraction (numerator row / bar / denominator
// row) with NO bordered box around the whole thing — only the individual
// number chips inside are boxed. Everything else renders as a plain inline
// row of chips + connectors.
function ExprTerm({ term, showOp, innerRef }) {
  const root = term.expr
  const isTopFraction = root.t === 'bin' && root.op === '/'
  if (isTopFraction) {
    return (
      <div className="term-wrap" ref={innerRef} data-id={term.id}>
        {showOp && <span className="term-op">{term.sign === '-' ? '−' : '+'}</span>}
        <div className="expr-fraction">
          <div className="expr-fraction-row"><ExprNode node={root.a} color={term.color} /></div>
          <div className="frac-bar" />
          <div className="expr-fraction-row"><ExprNode node={root.b} color={term.color} /></div>
        </div>
      </div>
    )
  }
  return (
    <div className="term-wrap" ref={innerRef} data-id={term.id}>
      {showOp && <span className="term-op">{term.sign === '-' ? '−' : '+'}</span>}
      <ExprNode node={root} color={term.color} />
    </div>
  )
}

const TermCell = forwardRef(function TermCell({ term, prevTerm = null }, ref) {
  // Suppress the '+' sign when sitting directly after an operator token like "arcsin("
  const afterOp = prevTerm?.isOperator === true
  const isFirst = term.cellIndex === 0
  const showOp  = (!isFirst && !afterOp) || term.sign === '-'

  // ── Generic expression tree (see exprTree.js) — takes priority over every
  // other branch below: a term with .expr never also carries the legacy
  // isFraction/factors fields (the parser emits one or the other).
  if (term.expr) {
    return <ExprTerm term={term} showOp={showOp} innerRef={ref} />
  }

  // ── Fraction cell ──────────────────────────────────────────────────────────
  if (term.isFraction) {
    return (
      <div className="term-wrap" ref={ref}>
        {showOp && (
          <span className="term-op">{term.sign === '-' ? '−' : '+'}</span>
        )}
        <div className="term-cell term-cell--fraction" data-id={term.id}>
          <div className="frac-num">
            {(term.numeratorTerms ?? []).map((s, i) => (
              <span key={i} className="frac-sub-wrap">
                {i > 0 ? <span className="frac-op">{s.pmOperator ? ' ± ' : (s.sign === '-' ? ' − ' : ' + ')}</span>
                       : (s.sign === '-' && <span className="frac-op">−</span>)}
                {s.factors ? <FactorProduct factors={s.factors} subIndex={i} /> : <FracSubTerm sub={s} pos={i} />}
              </span>
            ))}
          </div>
          <div className="frac-bar" />
          <div className="frac-den">
            {(term.denominatorTerms ?? []).map((s, i) => (
              <span key={i} className="frac-sub-wrap">
                {i > 0 ? <span className="frac-op">{s.pmOperator ? ' ± ' : (s.sign === '-' ? ' − ' : ' + ')}</span>
                       : (s.sign === '-' && <span className="frac-op">−</span>)}
                {s.factors ? <FactorProduct factors={s.factors} subIndex={i} /> : <FracSubTerm sub={s} pos={i} />}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Operator token (e.g. "arcsin(" or ")") ────────────────────────────────
  // Pure display element — no cell box, no op sign, just styled text in the flex row.
  if (term.isOperator) {
    return (
      <div className="term-wrap" ref={ref}>
        <span className="eq-fn-text">{term.text}</span>
      </div>
    )
  }

  // ── Segmented display (e.g. sin(θ) with colored argument) ─────────────────
  if (term.varParts) {
    return (
      <div className="term-wrap" ref={ref}>
        {showOp && <span className="term-op">{term.sign === '-' ? '−' : '+'}</span>}
        <div className="term-cell" data-id={term.id} style={term.color ? { color: term.color } : undefined}>
          {term.varParts.map((p, i) => (
            <span key={i} style={p.color ? { color: p.color } : undefined}>{p.text}</span>
          ))}
        </div>
      </div>
    )
  }

  // ── Paren-group cell e.g. 2(x+3) ─────────────────────────────────────────
  if (term.isParenGroup) {
    const coeffStr = term.parenCoeff === 1 ? '' : fmtNum(term.parenCoeff)
    return (
      <div className="term-wrap" ref={ref}>
        {showOp && <span className="term-op">{term.sign === '-' ? '−' : '+'}</span>}
        <div className="term-cell term-cell--paren-group" data-id={term.id}>
          <span className="pg-coeff">{coeffStr || '​'}</span>
          <span className="pg-open">(</span>
          {(term.innerTerms ?? []).map((inner, i) => {
            const isNeg = inner.sign === '-'
            const absC  = Math.abs(inner.coefficient)
            const c     = absC === 1 && inner.variable ? '' : fmtNum(absC)
            const v     = inner.variable ?? ''
            const deg   = inner.degree >= 2 ? supStr(inner.degree) : ''
            return (
              <span key={i} className="pg-inner-term">
                {i > 0 && <span className="pg-sep">{isNeg ? ' − ' : ' + '}</span>}
                {i === 0 && isNeg && <span className="pg-sep">−</span>}
                <span className="pg-inner-val">{c}{v}{deg}</span>
              </span>
            )
          })}
          <span className="pg-close">)</span>
        </div>
      </div>
    )
  }

  // ── Product e.g. m × x — each factor is its OWN cell, separated by × ──────────
  if (term.factors) {
    return (
      <div className="term-wrap" ref={ref}>
        {showOp && <span className="term-op">{term.sign === '-' ? '−' : '+'}</span>}
        {term.factors.map((f, i) => {
          const text = f.symbolicLabel
            ?? ((f.sign === '-' ? '−' : '') + fmtNum(Math.abs(f.coefficient)))
          const deg = f.degree >= 2 ? supStr(f.degree) : ''
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {i > 0 && <span className="term-op term-op--mul">×</span>}
              <div className="term-cell term-factor" data-id={i === 0 ? term.id : undefined}
                   data-label={f.symbolicLabel ?? undefined} data-pos={i}
                   style={term.color ? { color: term.color } : undefined}>
                {text}{deg}
              </div>
            </span>
          )
        })}
      </div>
    )
  }

  // ── Regular polynomial cell ────────────────────────────────────────────────
  const hasSymbolic = term.symbolicLabel !== undefined
  const isConst     = !term.variable
  const showCoeff   = hasSymbolic || isConst || term.coefficient !== 1
  const coeffText   = hasSymbolic
    ? term.symbolicLabel
    : fmtNum(Math.abs(term.coefficient))

  const showExp = !!(term.degree >= 2 || ((term.variable || term.symbolicLabel !== undefined) && (term.degree < 0 || term.showDegree)))
  const expText = showExp ? supStr(term.degree) : ''

  return (
    <div className="term-wrap" ref={ref}>
      {showOp && (
        <span className="term-op">{term.sign === '-' ? '−' : '+'}</span>
      )}
      <div className="term-cell" data-id={term.id} data-degree={term.degree} style={term.color ? { color: term.color } : undefined}>
        {term.negBase && <span className="term-coeff">(−</span>}
        {showCoeff && <span className="term-coeff">{coeffText}</span>}
        {term.variable && <span className="term-var">{term.variable}</span>}
        {term.negBase && <span className="term-coeff">)</span>}
        {showExp && <span className="term-exp" style={term.color ? { color: 'var(--text-h)' } : undefined}>{expText}</span>}
      </div>
    </div>
  )
})

export default TermCell
