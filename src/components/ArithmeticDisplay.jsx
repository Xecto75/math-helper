import { useState, useImperativeHandle, forwardRef, useRef } from 'react'

// ── helpers ───────────────────────────────────────────────────────────────────

function numDigits(n) {
  return n === 0 ? 1 : Math.floor(Math.log10(Math.abs(n))) + 1
}

// Returns array of digits, index 0 = units (rightmost), padded to `cols`
function digitsOf(n, cols) {
  const abs = Math.abs(Math.round(n))
  return Array.from({ length: cols }, (_, i) => Math.floor(abs / Math.pow(10, i)) % 10)
}

const OP_SYM = { '+': '+', '-': '−', '×': '×', '÷': '÷' }

// ── component ─────────────────────────────────────────────────────────────────

const ArithmeticDisplay = forwardRef(function ArithmeticDisplay(_, ref) {
  const [s, setS] = useState(null)
  const elRefs    = useRef({})

  const setRef = key => el => { elRefs.current[key] = el }

  useImperativeHandle(ref, () => ({
    init(a, op, b) {
      const result = (() => {
        switch (op) {
          case '+': return a + b
          case '-': return a - b
          case '×': return a * b
          case '÷': return b !== 0 ? Math.floor(a / b) : 0
          default:  return 0
        }
      })()
      const nc = Math.max(numDigits(a), numDigits(b), numDigits(Math.abs(result)))
      setS({
        a, b, op, result,
        aLen:  numDigits(a),
        bLen:  numDigits(b),
        numCols: nc,
        topDigits:     digitsOf(a, nc),
        botDigits:     digitsOf(b, nc),
        resultDigits:  digitsOf(Math.abs(result), nc + 1),
        // animation state (indexed by col, 0 = units)
        topCrossed:    Array(nc + 1).fill(false),
        topSmall:      Array(nc + 1).fill(null),
        carryDigits:   Array(nc + 1).fill(null),
        carryVisible:  Array(nc + 1).fill(false),
        resultVisible: Array(nc + 1).fill(false),
        sideCalc:      null,      // { top, op, bot, result }
        sideCalcBubbleVisible: false,
        hint:          null,
        hintVisible:   false,
        highlightedCol: null,
      })
    },

    patch(changes) {
      setS(prev => prev ? { ...prev, ...changes } : prev)
    },

    // Update a single index inside an array field: patchCol(0, { topCrossed: true, topSmall: 5 })
    patchCol(col, fields) {
      setS(prev => {
        if (!prev) return prev
        const next = { ...prev }
        for (const [key, val] of Object.entries(fields)) {
          const arr = [...(prev[key] ?? [])]
          arr[col] = val
          next[key] = arr
        }
        return next
      })
    },

    getEl(key) { return elRefs.current[key] ?? null },

    clearAll() { setS(null) },
  }))

  if (!s) return <div className="arith-display arith-display--empty" />

  // Visual columns: left to right = highest place → units
  // So visual index vi maps to calc index ci = numCols - 1 - vi
  const maxCols = s.numCols + (s.resultDigits[s.numCols] > 0 ? 1 : 0)
  const visuals  = Array.from({ length: maxCols }, (_, vi) => maxCols - 1 - vi)

  return (
    <div className="arith-display">
      <div className="arith-inner">

        {/* ── Borrow / carry row ── */}
        <div className="arith-row arith-row--small">
          <div className="arith-op-placeholder" />
          {visuals.map(ci => (
            <div key={ci} className="arith-cell arith-cell--small" ref={setRef(`small_${ci}`)}>
              {s.topSmall[ci] !== null && (
                <span className="arith-small arith-small--borrow">{s.topSmall[ci]}</span>
              )}
              {s.carryVisible[ci] && s.carryDigits[ci] !== null && (
                <span className="arith-small arith-small--carry">{s.carryDigits[ci]}</span>
              )}
            </div>
          ))}
        </div>

        {/* ── Top number ── */}
        <div className="arith-row arith-row--top">
          <div className="arith-op-placeholder" />
          {visuals.map(ci => {
            const d       = s.topDigits[ci]
            const crossed = s.topCrossed[ci]
            const isEmpty = ci >= s.aLen
            return (
              <div
                key={ci}
                className={`arith-cell arith-cell--top${s.highlightedCol === ci ? ' arith-cell--hl' : ''}`}
                ref={setRef(`top_${ci}`)}
              >
                {!isEmpty && (
                  <span className={`arith-digit arith-digit--top${crossed ? ' arith-digit--crossed' : ''}`}>
                    {d}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Operator + bottom number ── */}
        <div className="arith-row arith-row--bot">
          <span className="arith-op-sym">{OP_SYM[s.op] ?? s.op}</span>
          {visuals.map(ci => {
            const d       = s.botDigits[ci]
            const isEmpty = ci >= s.bLen
            return (
              <div
                key={ci}
                className={`arith-cell arith-cell--bot${s.highlightedCol === ci ? ' arith-cell--hl' : ''}`}
                ref={setRef(`bot_${ci}`)}
              >
                {!isEmpty && (
                  <span className="arith-digit arith-digit--bot">{d}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Horizontal line ── */}
        <div className="arith-row arith-row--line">
          <div className="arith-op-placeholder" />
          <div className="arith-line" style={{ width: maxCols * 64 + 'px' }} />
        </div>

        {/* ── Result ── */}
        <div className="arith-row arith-row--result">
          <div className="arith-op-placeholder" />
          {visuals.map(ci => (
            <div
              key={ci}
              className={`arith-cell arith-cell--result${s.highlightedCol === ci ? ' arith-cell--hl' : ''}`}
              ref={setRef(`result_${ci}`)}
            >
              {s.resultVisible[ci] && (
                <span className="arith-digit arith-digit--result">{s.resultDigits[ci]}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Side calc bubble — structured so GSAP can fly each part ── */}
      {s.sideCalc && (
        <div
          className={`arith-side-calc${s.sideCalcBubbleVisible ? ' arith-side-calc--in' : ''}`}
          ref={setRef('sideCalc')}
        >
          <span className="arith-sc-num" ref={setRef('scTop')}>{s.sideCalc.top}</span>
          <span className="arith-sc-op"  ref={setRef('scOp')} >{s.sideCalc.op}</span>
          <span className="arith-sc-num" ref={setRef('scBot')}>{s.sideCalc.bot}</span>
          <span className="arith-sc-eq"  ref={setRef('scEq')} >=</span>
          <span className="arith-sc-num arith-sc-res" ref={setRef('scRes')}>{s.sideCalc.result}</span>
        </div>
      )}

      {/* ── Hint overlay ── */}
      {s.hint && (
        <div className={`arith-hint${s.hintVisible ? ' arith-hint--in' : ''}`} ref={setRef('hint')}>
          {s.hint}
        </div>
      )}
    </div>
  )
})

export default ArithmeticDisplay
