import { useState, useImperativeHandle, forwardRef, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// The school long-division tableau. It lives in the EQUATION slot, so a page
// shows either an equation or a division, never both — one replaces the other
// and the panel glides between the two layouts.
//
// A step is not one reveal but three, half a second apart: first WHERE the line
// comes from (the quotient term times the divisor, distributed), then the line
// itself, then what is left. Showing the subtraction without its origin is the
// part of long division students never follow.
//
// Weight carries meaning here. What is being taken away is pale — it is
// scaffolding. What survives, the running remainders, is bright. The quotient
// being assembled is the one accented thing on screen.

// The engine speaks plain math ("8x^3 - 8x^2"); KaTeX wants braces around any
// multi-character exponent.
const toLatex = (s) => String(s ?? '').replace(/\^(-?\d+)/g, '^{$1}')

function tex(math, colour) {
  const body = colour ? `\\textcolor{${colour}}{${toLatex(math)}}` : toLatex(math)
  try {
    return katex.renderToString(body, { throwOnError: false, output: 'html' })
  } catch {
    return `<span>${math}</span>`
  }
}

function Tex({ math, colour, className = '' }) {
  return (
    <span
      className={`div-tex ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: tex(math, colour) }}
    />
  )
}

// Every row fades in rather than appearing — slowly, so the eye can follow which
// line just arrived.
function Row({ children, indent = 0, rule = false, tone = '' }) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setInView(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div
      className={`div-row${inView ? ' div-row--in' : ''}${rule ? ' div-row--ruled' : ''}${tone ? ` div-row--${tone}` : ''}`}
      style={{ marginLeft: `${indent * 1.1}em` }}
    >
      {children}
    </div>
  )
}

// Colours are fixed rather than themed: they encode importance, and the tableau
// has to read the same way on any page background.
const C = {
  quotient:  '#fbbf24',   // what is being built — the only accented thing
  divisor:   '#5eead4',   // the constant of the whole operation
  taken:     '#6b7280',   // pale: the products being subtracted away
  remainder: '#eef2ff',   // bright: what actually survives each round
}

const DivisionDisplay = forwardRef(function DivisionDisplay(_, ref) {
  const [work, setWork] = useState(null)
  // How far through the tableau we are. step = which round, part = 0 shows only
  // where the line comes from, 1 adds the subtraction, 2 adds what is left.
  const [at, setAt] = useState({ step: -1, part: -1 })
  const [done, setDone] = useState(false)

  useImperativeHandle(ref, () => ({
    create(next) { setWork(next); setAt({ step: -1, part: -1 }); setDone(false) },
    reveal(step, part) { setAt({ step, part }) },
    revealQuotient() { setDone(true) },
    clearAll() { setWork(null); setAt({ step: -1, part: -1 }); setDone(false) },
  }))

  if (!work) return null
  const { dividend, divisor, quotient, steps = [], remainder, exact } = work

  const shownRows = (i) =>
    i < at.step ? 2 : i === at.step ? at.part : -1   // -1 = nothing of this round yet

  const current = at.step >= 0 && at.step < steps.length ? steps[at.step] : null

  return (
    <div className="div-tableau">
      {/* Where the next line comes from — the quotient term times the divisor,
          distributed. Sits above the tableau and cross-fades each round. */}
      <div className={`div-working${current ? ' div-working--on' : ''}`}>
        {current && (
          <span key={at.step} className="div-working-line">
            <Tex math={current.term} colour={C.quotient} />
            <span className="div-paren">(</span>
            <Tex math={divisor} colour={C.divisor} />
            <span className="div-paren">)</span>
            <span className="div-eq">=</span>
            <Tex math={current.subtract} colour={C.taken} />
          </span>
        )}
      </div>

      <div className="div-body">
        <div className="div-left">
          <Row><Tex math={dividend} colour={C.remainder} /></Row>

          {steps.map((s, i) => (
            <div className="div-stage" key={i}>
              {shownRows(i) >= 1 && (
                <Row indent={i} rule tone="taken">
                  <span className="div-minus">−(</span>
                  <Tex math={s.subtract} colour={C.taken} />
                  <span className="div-minus">)</span>
                </Row>
              )}
              {shownRows(i) >= 2 && (
                <Row indent={i + 1}><Tex math={s.remainder} colour={C.remainder} /></Row>
              )}
            </div>
          ))}

          {done && (
            <Row indent={steps.length}>
              <span className={`div-remainder${exact ? ' div-remainder--exact' : ''}`}>
                {exact ? 'remainder 0' : <>remainder <Tex math={remainder} /></>}
              </span>
            </Row>
          )}
        </div>

        <div className="div-right">
          <Row><Tex math={divisor} colour={C.divisor} /></Row>
          <div className="div-quotient-rule" />
          {/* The quotient is written a term at a time, each one appearing in the
              round that finds it — not assembled off-screen and dropped in at
              the end. That is the order it is written by hand. */}
          <div className="div-quotient">
            {/* An invisible copy of the finished quotient holds the column at its
                final width from the first frame. Without it the column grew with
                every term, and a centred tableau slid sideways each time. */}
            <span className="div-quotient-sizer" aria-hidden="true">
              <Tex math={quotient} />
            </span>
            <span className="div-quotient-terms">
              {steps.map((s, i) => at.step >= i && (
                <span className="div-quotient-term" key={i}>
                  {i > 0 && <span className="div-sign">{s.term.trim().startsWith('-') ? '−' : '+'}</span>}
                  <Tex math={i > 0 ? s.term.replace(/^\s*-/, '') : s.term} colour={C.quotient} />
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default DivisionDisplay
