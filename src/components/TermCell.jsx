import { forwardRef, useRef, useLayoutEffect } from 'react'

// A decimal is three things a lesson may want to point at separately: the
// whole part, the separator, and the decimal part. Drawn as one text node
// there was nothing to point AT — an annotation could only cover the number
// entire. They stay inside .term-coeff, so anything that already selected
// the coefficient still gets the whole number.
function splitNumber(text, comma) {
  const s = String(text)
  const dot = s.indexOf('.')
  if (dot < 0) return s
  return [
    <span key="i" className="term-int">{s.slice(0, dot)}</span>,
    <span key="s" className="term-sep">{comma ? ',' : '.'}</span>
,
    <span key="d" className="term-dec">{s.slice(dot + 1)}</span>,
  ]
}

const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
function supStr(n) {
  return String(n).split('').map(c => SUP[c] ?? c).join('')
}

// A coefficient that's (numerically) exactly Math.PI came from typing "pi" in
// an eq-create string (see parseEquation.js's substitutePi) — show the glyph
// instead of the raw decimal everywhere a coefficient is formatted for display.
function fmtNum(n) {
  return Math.abs(n - Math.PI) < 1e-9 ? 'π' : String(parseFloat(n.toFixed(3)))
}

// The ONE place an exponent's markup/color/font is decided — a plain sibling
// span sitting just outside its base's own .term-cell, same as the generic
// expr-tree's pow node always rendered it (e.g. "r²" in "π×r²×h"). A plain
// polynomial term's power (e.g. "a³") now renders through this exact same
// path instead of a second, separately-styled box-internal span — see the
// "Regular polynomial cell" case below, which now wraps its .term-cell in an
// .expr-group exactly like ExprNode's 'pow' case does.
function Exponent({ value, color }) {
  return (
    <span className="term-exp" style={color ? { color } : undefined}>
      {value}
    </span>
  )
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
function ExprLeaf({ node, color, comma, exact }) {
  // A leaf's OWN color (see exprTree.js's parseTermExpr consumeOwnColor)
  // wins over whatever uniform color the enclosing term/group was passed —
  // otherwise "|Opposite|{orange}/|Hypotenuse|{purple}" could never show
  // two different colors, only whichever one the whole term inherited.
  const c = node.color ?? color
  return (
    <div className="term-cell" data-expr-id={node.id} style={c ? { color: c } : undefined}>
      {node.t === 'label' ? node.name : splitNumber(exact ? String(node.v) : fmtNum(node.v), comma)}
    </div>
  )
}

// ── Radical ──────────────────────────────────────────────────────────────────
// Drawn, not typed. A √ glyph is a letter of one fixed size: it cannot grow with
// what is under it, so the bar had to be a separate border that never met it,
// and the index a third letter floating wherever the font left room — three
// pieces that did not read as one sign. Here the tick, the hook, the rising
// stroke and the bar are one drawing over the whole radical, made in its own
// pixels from its measured size. The hook keeps the proportions of a printed √
// at any height; over a tall radicand (a fraction under the root) only the long
// stroke gets steeper, the way a stretchy radical does in print.
//
// Measured and written straight onto the DOM rather than through state. The
// steps rewrite digits inside the chips by hand and never tell React, so a
// ResizeObserver on the radicand is the only thing that sees it change width —
// and it redraws within that same frame, before anything is painted.
const RAD = {
  width:    0.55,          // the sign's width, against the height of a one-chip radical
  tick:     [0.085, 0.40], // where the tick starts: [share of width, share of height up from the bottom]
  knee:     [0.24, 0.47],  // where it turns down
  foot:     0.47,          // where the hook bottoms out, as a share of the width
  idxRight: 0.62,          // the index's right edge, same measure
  idxBase:  0.56,          // the index's baseline, as a share of height up from the bottom
  idxSize:  0.45,          // the index against the digits in the chips
  bar:      3,             // px, the bar and the long rising stroke
}

function Radical({ node, color, comma, held }) {
  const argRef = useRef(null)
  const idxRef = useRef(null)
  const svgRef = useRef(null)
  const idxText = node.index ? String(node.index.v) : ''

  useLayoutEffect(() => {
    const arg = argRef.current, svg = svgRef.current
    if (!arg || !svg) return
    const draw = () => {
      const H = arg.offsetHeight, aw = arg.offsetWidth
      if (!H || !aw) return
      const top0 = arg.offsetTop
      const padT = parseFloat(getComputedStyle(arg).paddingTop) || 0
      const cell = arg.querySelector('.term-cell')
      // The height this radical would have over ONE chip. The hook is sized
      // from it, so it is the same hook over 27 as over a whole fraction.
      const h0 = Math.min(H, cell ? cell.offsetHeight + padT : H)
      const L = h0 * RAD.width
      const bar = RAD.bar
      const heavy = Math.min(5, Math.max(3.4, h0 * 0.036))

      let padL = 0
      const idx = idxRef.current
      if (idx) {
        const digits = cell ? parseFloat(getComputedStyle(cell).fontSize) : h0 * 0.4
        const fs = digits * RAD.idxSize
        idx.style.fontSize = `${fs}px`
        const iw = idx.offsetWidth
        // An index too wide for the notch ("10") would reach past the left
        // edge into whatever comes before the radical — the sign moves over.
        padL = Math.max(0, iw - RAD.idxRight * L)
        idx.style.left = `${padL + RAD.idxRight * L - iw}px`
        idx.style.top  = `${top0 + H - RAD.idxBase * h0 - 0.85 * fs}px`
      }
      arg.style.marginLeft = `${padL + L}px`

      const W = padL + L + aw
      svg.style.width  = `${W}px`
      svg.style.height = `${top0 + H}px`
      const x = (f) => (padL + f * L).toFixed(2)
      const y = (up) => (top0 + H - up).toFixed(2)
      const foot = y(heavy / 2)
      const top  = (top0 + bar / 2).toFixed(2)
      const [tick, hook, rise] = svg.children
      tick.setAttribute('d', `M${x(RAD.tick[0])} ${y(RAD.tick[1] * h0)} L${x(RAD.knee[0])} ${y(RAD.knee[1] * h0)}`)
      tick.setAttribute('stroke-width', ((bar + heavy) / 2).toFixed(2))
      hook.setAttribute('d', `M${x(RAD.knee[0])} ${y(RAD.knee[1] * h0)} L${x(RAD.foot)} ${foot}`)
      hook.setAttribute('stroke-width', heavy.toFixed(2))
      rise.setAttribute('d', `M${x(RAD.foot)} ${foot} L${x(1)} ${top} L${W.toFixed(2)} ${top}`)
      rise.setAttribute('stroke-width', String(bar))
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(arg)
    return () => ro.disconnect()
  }, [idxText])

  return (
    <span className="expr-group expr-radical" data-expr-id={node.id}>
      <svg className={`radical-sign${held ? ' radical-sign--held' : ''}`} ref={svgRef} aria-hidden="true">
        <path strokeLinecap="round" />
        <path strokeLinecap="round" />
        <path strokeLinecap="round" strokeLinejoin="miter" />
      </svg>
      {node.index
        ? <span className={`radical-index${held ? ' radical-sign--held' : ''}`} ref={idxRef}>{idxText}</span>
        : null}
      <span className="radical-arg" ref={argRef}>
        {/* No brackets: the bar already shows what is under the root, and
            (9 + 16) beneath it said the same thing twice. */}
        <ExprNode node={node.arg} parentPrec={0} color={color} comma={comma} held={held} />
      </span>
    </span>
  )
}

// An exponent that is an expression — the n of 2ⁿ, the n − 1 of rⁿ⁻¹. Set as
// small raised TEXT, not superscript glyphs: a step inside it (n replaced by 5,
// then 5 − 1 worked out) rewrites the digits of its leaves by hand, and a plain
// "4" written there has to come out raised like the rest. Every number and
// letter keeps its node id, so those steps find it like any other leaf.
//
// A leaf is a div and a group a span, the same split ExprLeaf and ExprNode make.
// When a step collapses 5 - 1 into 4, React has to REPLACE the group: the number
// that flew into the other one and its minus are already off the page, and
// patching the old group's children would try to remove them a second time.
function ExpNode({ node, parentPrec = 0, isRightChild = false }) {
  if (!node) return null
  if (node.t === 'num')   return <div className="exp-leaf" data-expr-id={node.id}>{fmtNum(node.v)}</div>
  if (node.t === 'label') return <div className="exp-leaf" data-expr-id={node.id}>{node.name}</div>
  if (node.t === 'neg') {
    return (
      <span className="exp-group" data-expr-id={node.id}>
        <span className="exp-op">−</span>
        <ExpNode node={node.arg} parentPrec={3} />
      </span>
    )
  }
  if (node.t === 'bin') {
    const prec = (node.op === '+' || node.op === '-') ? 1 : 2
    const par  = prec < parentPrec || (prec === parentPrec && isRightChild)
    const sym  = node.op === '*' ? '·' : node.op === '-' ? '−' : node.op
    return (
      <span className="exp-group" data-expr-id={node.id}>
        {par && <span className="exp-op">(</span>}
        <ExpNode node={node.a} parentPrec={prec} />
        <span className="exp-op">{sym}</span>
        <ExpNode node={node.b} parentPrec={prec} isRightChild />
        {par && <span className="exp-op">)</span>}
      </span>
    )
  }
  if (node.t === 'pow') {
    return (
      <span className="exp-group" data-expr-id={node.id}>
        <ExpNode node={node.base} parentPrec={3} />
        <span className="exp-op">^</span>
        {typeof node.exp === 'object' ? <ExpNode node={node.exp} parentPrec={3} /> : <div className="exp-leaf">{node.exp}</div>}
      </span>
    )
  }
  return null
}

function ExprNode({ node, parentPrec = 0, isRightChild = false, color, comma, held, exact }) {
  if (!node) return null

  if (node.t === 'num' || node.t === 'label')
    return <ExprLeaf node={node} color={color} comma={comma} exact={exact} />

  if (node.t === 'neg') {
    // Parenthesize a negative/compound argument — "−(-5)" reads unambiguously,
    // "−-5" (glued minus signs) does not.
    const needsParens = node.arg.t === 'bin' || (node.arg.t === 'num' && node.arg.v < 0)
    return (
      <span className="expr-group" data-expr-id={node.id}>
        <span className={`term-op${held ? ' term-op--held' : ''}`}>−</span>
        {needsParens && <span className="pg-open">(</span>}
        <ExprNode node={node.arg} parentPrec={needsParens ? 0 : 3} color={color} comma={comma} held={held} />
        {needsParens && <span className="pg-close">)</span>}
      </span>
    )
  }

  // n! — the ! sits right against its number, no gap, because it belongs to it
  // rather than operating between two things the way + and × do.
  if (node.t === 'fact')
    return (
      <span className="expr-group" data-expr-id={node.id} style={{ gap: 0 }}>
        <ExprNode node={node.arg} parentPrec={3} color={color} comma={comma} held={held} exact={exact} />
        <span className="term-op term-op--fact">!</span>
      </span>
    )

  // One drawn sign over its radicand, index in the notch — see Radical above.
  if (node.t === 'sqrt')
    return <Radical node={node} color={color} comma={comma} held={held} />

  if (node.t === 'fn')
    return (
      <span className="expr-group" data-expr-id={node.id}>
        <span className="fn-name">{node.name}</span>
        <span className="pg-open">(</span>
        <ExprNode node={node.arg} parentPrec={0} color={color} comma={comma} held={held} />
        <span className="pg-close">)</span>
      </span>
    )

  if (node.t === 'pow') {
    const baseNeedsParens = node.base.t === 'bin' || node.base.t === 'neg'
    return (
      <span className="expr-group" data-expr-id={node.id} style={{ alignItems: 'flex-start' }}>
        {baseNeedsParens && <span className="pg-open">(</span>}
        <ExprNode node={node.base} parentPrec={0} color={color} comma={comma} held={held} />
        {baseNeedsParens && <span className="pg-close">)</span>}
        {node.exp && typeof node.exp === 'object'
          ? <span className="term-exp term-exp--expr" style={color ? { color } : undefined}><ExpNode node={node.exp} /></span>
          : <Exponent value={supStr(node.exp)} color={color} />}
      </span>
    )
  }

  if (node.t === 'pm') {
    const needsParens = 1 < parentPrec || (1 === parentPrec && isRightChild)
    return (
      <span className="expr-group" data-expr-id={node.id}>
        {needsParens && <span className="pg-open">(</span>}
        <ExprNode node={node.a} parentPrec={1} isRightChild={false} color={color} comma={comma} held={held} />
        <span className={`term-op${held ? ' term-op--held' : ''}`}>±</span>
        <ExprNode node={node.b} parentPrec={1} isRightChild={true} color={color} comma={comma} held={held} />
        {needsParens && <span className="pg-close">)</span>}
      </span>
    )
  }

  if (node.t === 'bin') {
    // A fraction is a fraction wherever it sits. Only the OUTERMOST one used to
    // stack; one nested inside a sum printed "3 / 6 + 2 / 6", which is not the
    // notation anyone writes. Same markup as the top-level one — .expr-fraction
    // is already an inline-flex column, so it nests without any new CSS, and
    // every query that hunts for fraction blocks keeps finding these too.
    // A division typed with ÷ stays on the line with its sign ("3/4 ÷ 2/5");
    // only a plain / stacks.
    if (node.op === '/' && !node.divSign) {
      return (
        <span className="expr-fraction" data-expr-id={node.id}>
          <span className="expr-fraction-row">
            <ExprNode node={node.a} parentPrec={0} color={color} comma={comma} held={held} exact={exact} />
          </span>
          <span className="frac-bar" />
          <span className="expr-fraction-row">
            <ExprNode node={node.b} parentPrec={0} color={color} comma={comma} held={held} exact={exact} />
          </span>
        </span>
      )
    }
    // The mantissa of a scientific notation is written in FULL. Everywhere else
    // a long decimal is rounded to three places to keep a line readable, but
    // here the digits past the third are the point: 24,2435 × 10² is 2424,35,
    // and a reader shown 24,244 cannot follow the comma to that answer.
    const sci = node.op === '*' && node.b?.t === 'pow' &&
      node.b.base?.t === 'num' && node.b.base.v === 10
    const prec = (node.op === '+' || node.op === '-') ? 1 : 2
    const needsParens = prec < parentPrec || (prec === parentPrec && isRightChild)
    const opSym = node.op === '*' ? '×' : node.op === '/' ? '÷' : node.op
    return (
      <span className="expr-group" data-expr-id={node.id}>
        {needsParens && <span className="pg-open">(</span>}
        <ExprNode node={node.a} parentPrec={prec} isRightChild={false} color={color} comma={comma} held={held} exact={sci || exact} />
        <span className={`term-op${node.op === '*' ? ' term-op--mul' : ''}`}>{opSym}</span>
        <ExprNode node={node.b} parentPrec={prec} isRightChild={true} color={color} comma={comma} held={held} exact={exact} />
        {needsParens && <span className="pg-close">)</span>}
      </span>
    )
  }

  return null
}

// A term that opens an item of a list ("3 ; 7 ; 11") is set BESIDE the one
// before it, not added to it. Its wrap carries the gap where a + would have
// been, and its minus, when the item is negative, sits against the number —
// alone in that gap it would read as a subtraction.
const wrapClass = (term) => `term-wrap${term.listJoin ? ' term-wrap--list' : ''}`
const opClass   = (term) => `term-op${term.mixedJoin ? ' term-op--held' : ''}${term.listJoin ? ' term-op--sign' : ''}`

// A term whose value is a full arithmetic sub-expression. The outermost `/`
// (if any) renders as a stacked fraction (numerator row / bar / denominator
// row) with NO bordered box around the whole thing — only the individual
// number chips inside are boxed. Everything else renders as a plain inline
// row of chips + connectors.
function ExprTerm({ term, showOp, innerRef }) {
  const root = term.expr
  const isTopFraction = root.t === 'bin' && root.op === '/' && !root.divSign
  if (isTopFraction) {
    return (
      <div className={wrapClass(term)} ref={innerRef} data-id={term.id}>
        {showOp && <span className={opClass(term)}>{term.sign === '-' ? '−' : '+'}</span>}
        {/* Same element types and same data-expr-id as the nested fraction in
            ExprNode, on purpose. When "2/3 · 3/4" collapses to "6/12" the node
            keeps its id but moves from the nested path to this one — and with a
            <div> here against a <span> there, React could only tear the old one
            down and mount a new one. A fresh .term-cell replays its termEnter
            mount pop, so the answer read as a different fraction spawning in
            rather than this one changing. Matching tags lets it be reused. */}
        <span className="expr-fraction" data-expr-id={root.id}>
          <span className="expr-fraction-row"><ExprNode node={root.a} color={term.color} comma={term.decimalComma} held={term.mixedJoin} /></span>
          <span className="frac-bar" />
          <span className="expr-fraction-row"><ExprNode node={root.b} color={term.color} comma={term.decimalComma} held={term.mixedJoin} /></span>
        </span>
      </div>
    )
  }
  return (
    <div className={wrapClass(term)} ref={innerRef} data-id={term.id}>
      {showOp && <span className={opClass(term)}>{term.sign === '-' ? '−' : '+'}</span>}
      <ExprNode node={root} color={term.color} comma={term.decimalComma} held={term.mixedJoin} />
    </div>
  )
}

const TermCell = forwardRef(function TermCell({ term, prevTerm = null }, ref) {
  // Suppress the '+' sign when sitting directly after an operator token like "arcsin("
  const afterOp = prevTerm?.isOperator === true
  const isFirst = term.cellIndex === 0
  // A list item is set beside the one before it: no + in front of it. A
  // negative one wears its minus INSIDE its own box — "-1" is one value of the
  // sequence, and a minus standing in the gap between two boxes reads as a
  // subtraction. Only a plain number or letter has a box to put it in; any
  // other item keeps the minus in front, pulled in against it.
  const signInCell = !!term.listJoin && term.sign === '-' && !term.expr && !term.isFraction &&
    !term.isOperator && !term.varParts && !term.isParenGroup && !term.factors
  const showOp  = term.listJoin ? (term.sign === '-' && !signInCell) : ((!isFirst && !afterOp) || term.sign === '-')
  const wrapCls = wrapClass(term)

  // ── Generic expression tree (see exprTree.js) — takes priority over every
  // other branch below: a term with .expr never also carries the legacy
  // isFraction/factors fields (the parser emits one or the other).
  if (term.expr) {
    return <ExprTerm term={term} showOp={showOp} innerRef={ref} />
  }

  // ── Fraction cell ──────────────────────────────────────────────────────────
  if (term.isFraction) {
    // A minus on the term AND a minus on a lone numerator are the same minus
    // written twice: −(−3)/2 came out as "− −3". Fold them into one effective
    // sign — two negatives make a positive, and a positive term over a negative
    // numerator reads as one negative fraction. Only for a SINGLE-term
    // numerator; with several, the leading sign belongs to the expression.
    const numer     = term.numeratorTerms ?? []
    const loneNeg   = numer.length === 1 && numer[0]?.sign === '-'
    const negative  = loneNeg ? term.sign !== '-' : term.sign === '-'
    return (
      <div className={wrapCls} ref={ref}>
        {showOp && (
          <span className={opClass(term)}>{negative ? '−' : '+'}</span>
        )}
        <div className="term-cell term-cell--fraction" data-id={term.id}>
          <div className="frac-num">
            {numer.map((s, i) => (
              <span key={i} className="frac-sub-wrap">
                {i > 0 ? <span className="frac-op">{s.pmOperator ? ' ± ' : (s.sign === '-' ? ' − ' : ' + ')}</span>
                       : (numer.length === 1
                           // The fold moved this minus up to the operator slot;
                           // with no operator shown it has to stay here.
                           ? (!showOp && negative && <span className="frac-op">−</span>)
                           : (s.sign === '-' && <span className="frac-op">−</span>))}
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
      <div className={wrapCls} ref={ref}>
        <span className={`eq-fn-text${term.text === '…' ? ' eq-fn-text--ellipsis' : ''}`}>{term.text}</span>
      </div>
    )
  }

  // ── Segmented display (e.g. sin(θ) with colored argument) ─────────────────
  if (term.varParts) {
    return (
      <div className={wrapCls} ref={ref}>
        {showOp && <span className={opClass(term)}>{term.sign === '-' ? '−' : '+'}</span>}
        <div className="term-cell" data-id={term.id} style={term.color ? { color: term.color } : undefined}>
          {term.varParts.map((p, i) => (
            <span key={i} style={p.color ? { color: p.color } : undefined}>{p.text}</span>
          ))}
        </div>
      </div>
    )
  }

  // ── Paren-group cell e.g. 2(x+3) — same convention as the generic
  // expression tree: every number is its own bordered .term-cell chip,
  // parens/operators are plain unboxed text, never one shared box around
  // the whole group. Class names (.pg-coeff / .pg-inner-val) are kept as
  // additional markers so distributeParentheses's animation can still find
  // these exact elements — only how they're boxed changes.
  if (term.isParenGroup) {
    // The multiplier itself can carry a variable (2x(x+4)) — same monomial
    // convention as an ordinary term: coefficient omitted only when it's
    // exactly 1 AND there's a variable to stand on its own ("x", not "1x").
    const pgVar    = term.parenCoeffVariable ?? ''
    const pgDeg    = (term.parenCoeffDegree ?? 1) >= 2 ? supStr(term.parenCoeffDegree) : ''
    // A multiplier of exactly 1 is never written, with or without a variable:
    // "x(x+4)" and "(x+4)", not "1x(x+4)" or "1(x+4)". Substituting an
    // expression into a term whose coefficient was 1 produces exactly this.
    const coeffStr = term.parenCoeff === 1 ? '' : fmtNum(term.parenCoeff)
    return (
      <div className={wrapCls} ref={ref}>
        {showOp && <span className={opClass(term)}>{term.sign === '-' ? '−' : '+'}</span>}
        <span className="expr-group" data-id={term.id}>
          {/* The multiplier is either a monomial (2x in "2x(x+4)") or a bracket
              of its own ("(3x+2)(2x-2)") — same slot, drawn either way. */}
          {term.outerTerms ? (
            <>
              <span className="pg-open">(</span>
              {term.outerTerms.map((outer, i) => {
                const isNeg = outer.sign === '-'
                const absC  = Math.abs(outer.coefficient)
                const c     = absC === 1 && outer.variable ? '' : fmtNum(absC)
                const v     = outer.variable ?? ''
                const deg   = outer.degree >= 2 ? supStr(outer.degree) : ''
                return (
                  <span key={i} className="pg-inner-term">
                    {i > 0 && <span className={`term-op${term.mixedJoin ? ' term-op--held' : ''}`}>{isNeg ? '−' : '+'}</span>}
                    {i === 0 && isNeg && <span className={`term-op${term.mixedJoin ? ' term-op--held' : ''}`}>−</span>}
                    <div className="term-cell pg-outer-val">{c}{v}{deg}</div>
                  </span>
                )
              })}
              <span className="pg-close">)</span>
            </>
          ) : (
            <div className="term-cell pg-coeff">{(coeffStr || pgVar) ? <>{coeffStr}{pgVar}{pgDeg}</> : '​'}</div>
          )}
          {/* Worked out down to one number, the bracket is drawn without its
              brackets — and a multiplier then needs its × back, or 2(8) reads 28. */}
          {term.parensDropped
            ? ((coeffStr || pgVar) && !term.outerTerms && <span className="term-op term-op--mul pg-times">×</span>)
            : <span className="pg-open">(</span>}
          {(term.innerTerms ?? []).map((inner, i) => {
            const isNeg = inner.sign === '-'
            const absC  = Math.abs(inner.coefficient)
            const c     = absC === 1 && inner.variable ? '' : fmtNum(absC)
            const v     = inner.variable ?? ''
            const deg   = inner.degree >= 2 ? supStr(inner.degree) : ''
            return (
              <span key={i} className="pg-inner-term">
                {i > 0 && <span className={`term-op${term.mixedJoin ? ' term-op--held' : ''}`}>{isNeg ? '−' : '+'}</span>}
                {i === 0 && isNeg && <span className={`term-op${term.mixedJoin ? ' term-op--held' : ''}`}>−</span>}
                <div className="term-cell pg-inner-val">{c}{v}{deg}</div>
              </span>
            )
          })}
          {!term.parensDropped && <span className="pg-close">)</span>}
        </span>
      </div>
    )
  }

  // ── Product e.g. m × x — each factor is its OWN cell, separated by × ──────────
  if (term.factors) {
    return (
      <div className={wrapCls} ref={ref}>
        {showOp && <span className={opClass(term)}>{term.sign === '-' ? '−' : '+'}</span>}
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

  // Exponent sits OUTSIDE the bordered box — same .expr-group wrapper
  // ExprNode's 'pow' case uses for e.g. "r²", so a plain power like "a³"
  // reads identically instead of boxing its exponent in with the base.
  const cell = (
    <div className="term-cell" data-id={term.id} data-degree={term.degree} style={term.color ? { color: term.color } : undefined}>
      {signInCell && <span className="term-sign">−</span>}
      {term.negBase && <span className="term-coeff">(−</span>}
      {showCoeff && <span className="term-coeff">{splitNumber(coeffText, term.decimalComma)}</span>}
      {term.variable && <span className="term-var">{term.variable}</span>}
      {term.negBase && <span className="term-coeff">)</span>}
    </div>
  )

  return (
    <div className={wrapCls} ref={ref}>
      {showOp && (
        <span className={opClass(term)}>{term.sign === '-' ? '−' : '+'}</span>
      )}
      {showExp ? (
        <span className="expr-group" style={{ alignItems: 'flex-start' }}>
          {cell}
          <Exponent value={expText} color={term.color} />
        </span>
      ) : cell}
    </div>
  )
})

export default TermCell
