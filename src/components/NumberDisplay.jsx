import { useState, useImperativeHandle, forwardRef, useRef } from 'react'

// Each array entry = number of dots in that row, rows centered
const PATTERNS = {
  1: [1],
  2: [2],
  3: [2, 1],
  4: [2, 2],
  5: [3, 2],
  6: [3, 2, 1],
  7: [2, 3, 2],
  8: [3, 2, 3],
  9: [3, 3, 3],
}

const NumberDisplay = forwardRef(function NumberDisplay(_, ref) {
  const [s, setS]  = useState(null)
  const elRefs     = useRef({})

  useImperativeHandle(ref, () => ({
    show()         { setS({ highlighted: null, numerals: new Set() }) },
    highlight(n)   { setS(prev => prev ? { ...prev, highlighted: Number(n) } : prev) },
    clearHighlight(){ setS(prev => prev ? { ...prev, highlighted: null } : prev) },
    showNumeral(n) {
      setS(prev => {
        if (!prev) return prev
        const numerals = new Set(prev.numerals)
        numerals.add(Number(n))
        return { ...prev, numerals }
      })
    },
    clearNumerals(){ setS(prev => prev ? { ...prev, numerals: new Set() } : prev) },
    getEl(k)       { return elRefs.current[k] ?? null },
    clearAll()     { setS(null) },
  }))

  if (!s) return <div className="num-display num-display--empty" />

  return (
    <div className="num-display">
      <div className="num-grid">
        {[1,2,3,4,5,6,7,8,9].map(n => {
          const isHL  = s.highlighted === n
          const isDim = s.highlighted !== null && !isHL

          return (
            <div
              key={n}
              ref={el => { elRefs.current[`card-${n}`] = el }}
              className={`num-card${isHL ? ' num-card--hl' : isDim ? ' num-card--dim' : ''}`}
            >
              <div className="num-dot-rows">
                {PATTERNS[n].map((count, ri) => (
                  <div key={ri} className="num-dot-row">
                    {Array.from({ length: count }, (_, i) => (
                      <div key={i} className="num-dot" />
                    ))}
                  </div>
                ))}
              </div>
              {s.numerals.has(n) && <span className="num-card-numeral">{n}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default NumberDisplay
