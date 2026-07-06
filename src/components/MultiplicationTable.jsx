import { useState, useImperativeHandle, forwardRef, useRef } from 'react'

// One vibrant color per row (index 0 unused)
const ROW_COLORS = [
  null,
  '#f87171', // 1  red
  '#fb923c', // 2  orange
  '#facc15', // 3  yellow
  '#4ade80', // 4  green
  '#34d399', // 5  emerald
  '#22d3ee', // 6  cyan
  '#60a5fa', // 7  blue
  '#a78bfa', // 8  violet
  '#f472b6', // 9  pink
  '#fb7185', // 10 rose
  '#2dd4bf', // 11 teal
  '#818cf8', // 12 indigo
]

// "Useful" half: row >= col (diagonal + lower-left triangle)
function isUseful(row, col) { return row >= col }

const MultiplicationTable = forwardRef(function MultiplicationTable(_, ref) {
  const [s, setS]  = useState(null)
  const elRefs     = useRef({})
  const setRef     = key => el => { elRefs.current[key] = el }

  useImperativeHandle(ref, () => ({
    init(maxN) {
      setS({ maxN, highlightedRow: null, highlightedCol: null })
    },
    highlight(row, col) {
      setS(prev => prev ? { ...prev, highlightedRow: row, highlightedCol: col } : prev)
    },
    clearHighlight() {
      setS(prev => prev ? { ...prev, highlightedRow: null, highlightedCol: null } : prev)
    },
    getEl(key) { return elRefs.current[key] ?? null },
    clearAll() { setS(null) },
  }))

  if (!s) return <div className="mult-table mult-table--empty" />

  const N = s.maxN

  return (
    <div className="mult-table">
      <div
        className="mult-grid"
        style={{ gridTemplateColumns: `repeat(${N + 1}, var(--mult-cell, 40px))` }}
      >
        {/* Corner */}
        <div className="mult-cell mult-cell--corner" ref={setRef('cell_0_0')}>×</div>

        {/* Column headers */}
        {Array.from({ length: N }, (_, i) => i + 1).map(col => (
          <div
            key={`hc-${col}`}
            className={`mult-cell mult-cell--header${s.highlightedCol === col ? ' mult-cell--hl-axis' : ''}`}
            ref={setRef(`cell_0_${col}`)}
          >
            {col}
          </div>
        ))}

        {/* Data rows */}
        {Array.from({ length: N }, (_, i) => i + 1).map(row => {
          const rowColor = ROW_COLORS[row] ?? '#888'
          return (
            <div key={`row-${row}`} style={{ display: 'contents' }}>
              {/* Row header — always colored */}
              <div
                className={`mult-cell mult-cell--header mult-cell--row-header${s.highlightedRow === row ? ' mult-cell--hl-axis' : ''}`}
                style={{ background: rowColor + '33', color: rowColor, borderColor: rowColor + '55' }}
                ref={setRef(`cell_${row}_0`)}
              >
                {row}
              </div>

              {/* Result cells */}
              {Array.from({ length: N }, (_, j) => j + 1).map(col => {
                const isHL     = s.highlightedRow === row && s.highlightedCol === col
                const isOnAxis = !isHL && (s.highlightedRow === row || s.highlightedCol === col)
                const useful   = isUseful(row, col)

                let style = {}
                if (isHL) {
                  style = { background: '#fbbf24', color: '#1a1000', boxShadow: '0 4px 20px rgba(251,191,36,.55)' }
                } else if (isOnAxis) {
                  style = { background: '#fbbf2428', color: '#fbbf24' }
                } else if (useful) {
                  style = {
                    background: rowColor + '22',
                    color:      rowColor,
                    fontWeight: 800,
                  }
                }

                return (
                  <div
                    key={`cell-${row}-${col}`}
                    className={`mult-cell mult-cell--result${useful ? ' mult-cell--useful' : ' mult-cell--dim'}${isHL ? ' mult-cell--hl' : ''}`}
                    style={style}
                    ref={setRef(`cell_${row}_${col}`)}
                  >
                    {row * col}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default MultiplicationTable
