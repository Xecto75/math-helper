import { useImperativeHandle, forwardRef, useState, useRef, memo } from 'react'

// Auto-size text to fill the cell — scales down for long strings, wraps to 2 lines if needed.
function fitText(value, cellW, cellH) {
  const text = String(value ?? '').trim()
  if (!text) return { lines: [''], fontSize: 16 }

  const maxFS    = Math.min(Math.floor(cellH * 0.40), 32)
  const maxW     = cellW * 0.86
  const CW_RATIO = 0.60  // monospace char width ≈ 60% of font size

  const fits = (fs, txt) => txt.length * fs * CW_RATIO <= maxW

  // Single line at max size
  if (fits(maxFS, text)) return { lines: [text], fontSize: maxFS }

  // Scale down for single line
  const scaledFS = Math.max(9, Math.floor(maxW / (text.length * CW_RATIO)))
  if (scaledFS >= 11) return { lines: [text], fontSize: scaledFS }

  // Two lines
  const twoFS = Math.min(Math.floor(cellH * 0.28), 22)
  const maxCharsPerLine = Math.floor(maxW / (twoFS * CW_RATIO))
  let line1, line2
  const spaceAt = text.lastIndexOf(' ', maxCharsPerLine)
  if (spaceAt > 0) { line1 = text.slice(0, spaceAt); line2 = text.slice(spaceAt + 1) }
  else              { line1 = text.slice(0, maxCharsPerLine); line2 = text.slice(maxCharsPerLine) }

  const finalFS = Math.max(8, Math.min(twoFS,
    Math.floor(maxW / (Math.max(line1.length, line2.length || 1) * CW_RATIO))
  ))
  return { lines: [line1, line2], fontSize: finalFS }
}

const SVG_W = 800
const SVG_H = 600
const easeIO = t => t < 0.5 ? 2*t*t : -1 + (4-2*t)*t

const TableDisplay = forwardRef(function TableDisplay(_, ref) {
  const [state, setState] = useState({ lines: {}, cells: {}, grid: null })
  const stateRef = useRef(state)
  const svgRef   = useRef(null)
  stateRef.current = state

  useImperativeHandle(ref, () => {
    // ── Core line animation (no `this`) ──────────────────────────────────────
    function animateLine(id, ms = 300) {
      return new Promise(resolve => {
        const t0 = performance.now()
        ;(function tick() {
          const p = Math.min((performance.now() - t0) / ms, 1)
          setState(prev => {
            const l = prev.lines[id]
            if (!l) { resolve(); return prev }
            return { ...prev, lines: { ...prev.lines, [id]: { ...l, progress: easeIO(p) } } }
          })
          if (p < 1) requestAnimationFrame(tick)
          else resolve()
        })()
      })
    }

    function fadeInCells(ids, ms = 380) {
      if (!ids.length) return Promise.resolve()
      return new Promise(resolve => {
        const t0 = performance.now()
        ;(function tick() {
          const p = Math.min((performance.now() - t0) / ms, 1)
          const e = easeIO(p)
          setState(prev => {
            const nc = { ...prev.cells }
            ids.forEach(id => { if (nc[id]) nc[id] = { ...nc[id], opacity: e } })
            return { ...prev, cells: nc }
          })
          if (p < 1) requestAnimationFrame(tick)
          else resolve()
        })()
      })
    }

    function fadeOutCells(ids, ms = 280) {
      if (!ids.length) return Promise.resolve()
      const startOps = {}
      const cur = stateRef.current.cells
      ids.forEach(id => { startOps[id] = cur[id]?.opacity ?? 1 })
      return new Promise(resolve => {
        const t0 = performance.now()
        ;(function tick() {
          const p = Math.min((performance.now() - t0) / ms, 1)
          const e = easeIO(p)
          setState(prev => {
            const nc = { ...prev.cells }
            ids.forEach(id => { if (nc[id]) nc[id] = { ...nc[id], opacity: startOps[id] * (1 - e) } })
            return { ...prev, cells: nc }
          })
          if (p < 1) requestAnimationFrame(tick)
          else {
            setState(prev => {
              const nc = { ...prev.cells }
              ids.forEach(id => delete nc[id])
              return { ...prev, cells: nc }
            })
            resolve()
          }
        })()
      })
    }

    function fadeOutLines(ids, ms = 280) {
      if (!ids.length) return Promise.resolve()
      return new Promise(resolve => {
        const t0 = performance.now()
        ;(function tick() {
          const p = Math.min((performance.now() - t0) / ms, 1)
          const e = easeIO(p)
          setState(prev => {
            const nl = { ...prev.lines }
            ids.forEach(id => { if (nl[id]) nl[id] = { ...nl[id], opacity: 1 - e } })
            return { ...prev, lines: nl }
          })
          if (p < 1) requestAnimationFrame(tick)
          else {
            setState(prev => {
              const nl = { ...prev.lines }
              ids.forEach(id => delete nl[id])
              return { ...prev, lines: nl }
            })
            resolve()
          }
        })()
      })
    }

    return {
      isReady: () => true,

      setGrid(grid) { setState(prev => ({ ...prev, grid })) },
      getGrid() { return stateRef.current.grid },
      getLines() { return stateRef.current.lines },
      getCells() { return stateRef.current.cells },
      instantRestore(savedState) { setState(savedState) },

      addLines(lineMap) {
        setState(prev => ({ ...prev, lines: { ...prev.lines, ...lineMap } }))
      },

      updateLines(lineMap) {
        setState(prev => {
          const nl = { ...prev.lines }
          Object.entries(lineMap).forEach(([id, data]) => {
            if (nl[id]) nl[id] = { ...nl[id], ...data }
            else nl[id] = data
          })
          return { ...prev, lines: nl }
        })
      },

      // Animate numeric props (x1, y1, x2, y2 …) on multiple lines at once
      animateManyLineProps(moves, ms = 260) {
        const froms = {}
        const cur = stateRef.current.lines
        Object.entries(moves).forEach(([id, to]) => {
          froms[id] = {}
          Object.keys(to).forEach(k => { froms[id][k] = cur[id]?.[k] ?? 0 })
        })
        return new Promise(resolve => {
          const t0 = performance.now()
          ;(function tick() {
            const p = Math.min((performance.now() - t0) / ms, 1)
            const ev = easeIO(p)
            setState(prev => {
              const nl = { ...prev.lines }
              Object.entries(moves).forEach(([id, to]) => {
                if (!nl[id]) return
                const upd = {}
                Object.entries(to).forEach(([k, v]) => { upd[k] = froms[id][k] + (v - froms[id][k]) * ev })
                nl[id] = { ...nl[id], ...upd }
              })
              return { ...prev, lines: nl }
            })
            if (p < 1) requestAnimationFrame(tick)
            else resolve()
          })()
        })
      },

      // Animate cx / cy of multiple cells at once (for column / row shift)
      animateCellPositions(moves, ms = 260) {
        const froms = {}
        const cur = stateRef.current.cells
        Object.entries(moves).forEach(([id, to]) => {
          froms[id] = {}
          Object.keys(to).forEach(k => { froms[id][k] = cur[id]?.[k] ?? 0 })
        })
        return new Promise(resolve => {
          const t0 = performance.now()
          ;(function tick() {
            const p = Math.min((performance.now() - t0) / ms, 1)
            const ev = easeIO(p)
            setState(prev => {
              const nc = { ...prev.cells }
              Object.entries(moves).forEach(([id, to]) => {
                if (!nc[id]) return
                const upd = {}
                Object.entries(to).forEach(([k, v]) => { upd[k] = froms[id][k] + (v - froms[id][k]) * ev })
                nc[id] = { ...nc[id], ...upd }
              })
              return { ...prev, cells: nc }
            })
            if (p < 1) requestAnimationFrame(tick)
            else resolve()
          })()
        })
      },

      // Instantly rename cell IDs (called after position shift so IDs stay consistent)
      renameCells(renames) {
        setState(prev => {
          const nc = { ...prev.cells }
          Object.entries(renames).forEach(([oldId, newId]) => {
            if (nc[oldId]) { nc[newId] = nc[oldId]; delete nc[oldId] }
          })
          return { ...prev, cells: nc }
        })
      },

      // Instantly rename line IDs
      renameLines(renames) {
        setState(prev => {
          const nl = { ...prev.lines }
          Object.entries(renames).forEach(([oldId, newId]) => {
            if (nl[oldId]) { nl[newId] = nl[oldId]; delete nl[oldId] }
          })
          return { ...prev, lines: nl }
        })
      },

      animateLine,

      animateLinesStaggered(ids, lineDuration = 280, stagger = 55) {
        const promises = ids.map((id, i) =>
          new Promise(resolve =>
            setTimeout(() => animateLine(id, lineDuration).then(resolve), i * stagger)
          )
        )
        return Promise.all(promises)
      },

      addCells(cellMap) {
        setState(prev => ({ ...prev, cells: { ...prev.cells, ...cellMap } }))
      },

      fadeInCells,
      fadeOutCells,
      fadeOutLines,

      // Fade out old value, update, fade in new value
      updateCell(id, value, ms = 260) {
        const half = ms / 2
        return new Promise(resolve => {
          const startOp = stateRef.current.cells[id]?.opacity ?? 1
          const t0 = performance.now()
          ;(function out() {
            const p = Math.min((performance.now() - t0) / half, 1)
            const e = easeIO(p)
            setState(prev => {
              const c = prev.cells[id]
              if (!c) { resolve(); return prev }
              return { ...prev, cells: { ...prev.cells, [id]: { ...c, opacity: startOp * (1 - e) } } }
            })
            if (p < 1) requestAnimationFrame(out)
            else {
              setState(prev => {
                const c = prev.cells[id]
                if (!c) return prev
                return { ...prev, cells: { ...prev.cells, [id]: { ...c, value, opacity: 0 } } }
              })
              const t1 = performance.now()
              ;(function inn() {
                const p2 = Math.min((performance.now() - t1) / half, 1)
                const e2 = easeIO(p2)
                setState(prev => {
                  const c = prev.cells[id]
                  if (!c) { resolve(); return prev }
                  return { ...prev, cells: { ...prev.cells, [id]: { ...c, opacity: e2 } } }
                })
                if (p2 < 1) requestAnimationFrame(inn)
                else resolve()
              })()
            }
          })()
        })
      },

      clearAll() {
        setState({ lines: {}, cells: {}, grid: null })
      },

      getPageCoords(target) {
        const svgEl = svgRef.current
        if (!svgEl) return null
        const rect  = svgEl.getBoundingClientRect()
        const scale = Math.min(rect.width / SVG_W, rect.height / SVG_H)
        const xOff  = (rect.width  - SVG_W * scale) / 2
        const yOff  = (rect.height - SVG_H * scale) / 2
        const id    = `${target.gridId}_c${target.col}_${target.row}`
        const cell  = stateRef.current.cells[id]
        if (!cell) return null
        return { x: rect.left + xOff + cell.cx * scale, y: rect.top + yOff + cell.cy * scale }
      },
    }
  })

  const { lines, cells, grid } = state

  return (
    <div className="math-display-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        <rect width={SVG_W} height={SVG_H} fill="var(--bg-2)" rx="6" />

        {/* Viewport border */}
        <rect x={1} y={1} width={SVG_W-2} height={SVG_H-2}
          fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} rx="5" />

        {Object.entries(lines).map(([id, l]) => {
          const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1) || 1
          const prog = l.progress ?? 0
          return (
            <line key={id}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.color ?? 'rgba(255,255,255,0.38)'}
              strokeWidth={l.strokeWidth ?? 1.5}
              strokeDasharray={`${len} ${len}`}
              strokeDashoffset={len * (1 - prog)}
              opacity={l.opacity ?? 1}
              strokeLinecap="round"
            />
          )
        })}

        {Object.entries(cells).map(([id, cell]) => {
          if (!grid) return null
          // cx / cy are stored directly on cells (set by tableEngine when created/moved)
          const cx = cell.cx ?? (grid.x0 + cell.col * grid.cellW + grid.cellW / 2)
          const cy = cell.cy ?? (grid.y0 + cell.row * grid.cellH + grid.cellH / 2)
          const { lines, fontSize } = fitText(cell.value, grid.cellW, grid.cellH)
          const lineH = fontSize * 1.25
          const textY = lines.length > 1 ? cy - lineH / 2 : cy
          return (
            <text key={id}
              x={cx} y={textY}
              fill={cell.isHeader ? 'rgba(168,85,247,0.95)' : 'rgba(255,255,255,0.88)'}
              fontSize={fontSize}
              fontWeight={cell.isHeader ? '600' : '400'}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="'Fira Code','Cascadia Code',monospace"
              opacity={cell.opacity ?? 0}
            >
              {lines.map((line, i) => (
                <tspan key={i} x={cx} dy={i === 0 ? 0 : lineH}>{line}</tspan>
              ))}
            </text>
          )
        })}
      </svg>
    </div>
  )
})

export default TableDisplay
