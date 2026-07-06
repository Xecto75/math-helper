import { forwardRef } from 'react'

const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
function supStr(n) {
  return String(n).split('').map(c => SUP[c] ?? c).join('')
}

function FracSubTerm({ sub, pos }) {
  if (!sub) return null
  const text = sub.symbolicLabel
    ?? (sub.variable
        ? (sub.coefficient !== 1 ? String(sub.coefficient) : '') + sub.variable
        : String(parseFloat(Math.abs(sub.coefficient).toFixed(4))))
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

const TermCell = forwardRef(function TermCell({ term, prevTerm = null }, ref) {
  // Suppress the '+' sign when sitting directly after an operator token like "arcsin("
  const afterOp = prevTerm?.isOperator === true
  const isFirst = term.cellIndex === 0
  const showOp  = (!isFirst && !afterOp) || term.sign === '-'

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
    const coeffStr = term.parenCoeff === 1 ? '' : String(parseFloat(term.parenCoeff.toFixed(4)))
    return (
      <div className="term-wrap" ref={ref}>
        {showOp && <span className="term-op">{term.sign === '-' ? '−' : '+'}</span>}
        <div className="term-cell term-cell--paren-group" data-id={term.id}>
          <span className="pg-coeff">{coeffStr || '​'}</span>
          <span className="pg-open">(</span>
          {(term.innerTerms ?? []).map((inner, i) => {
            const isNeg = inner.sign === '-'
            const absC  = Math.abs(inner.coefficient)
            const c     = absC === 1 && inner.variable ? '' : String(parseFloat(absC.toFixed(4)))
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
            ?? ((f.sign === '-' ? '−' : '') + String(parseFloat(Math.abs(f.coefficient).toFixed(4))))
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
    : String(parseFloat(Math.abs(term.coefficient).toFixed(4)))

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
