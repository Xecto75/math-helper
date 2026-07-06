import { useImperativeHandle, forwardRef, useState, useRef } from 'react'

const SVG_W = 800
const SVG_H = 600
const DEFAULT_VP = { xMin: -8, xMax: 8, yMin: -6, yMax: 6 }

function w2s(x, y, vp) {
  return [
    (x - vp.xMin) / (vp.xMax - vp.xMin) * SVG_W,
    SVG_H - (y - vp.yMin) / (vp.yMax - vp.yMin) * SVG_H,
  ]
}

const GeometryDisplay = forwardRef(function GeometryDisplay(_, ref) {
  const [shapes, setShapes] = useState({})
  const [vp, setVp]         = useState(DEFAULT_VP)
  const vpRef               = useRef(DEFAULT_VP)
  const shapesRef           = useRef({})
  const svgRef              = useRef(null)
  shapesRef.current         = shapes

  useImperativeHandle(ref, () => ({
    isReady: () => true,

    drawPolygon(id, vertices, style) {
      setShapes(prev => ({ ...prev, [id]: { kind: 'polygon', vertices, style } }))
    },

    drawCircle(id, cx, cy, r, style) {
      setShapes(prev => ({ ...prev, [id]: { kind: 'circle', cx, cy, r, style } }))
    },

    updatePolygon(id, vertices) {
      setShapes(prev => {
        const s = prev[id]
        return s ? { ...prev, [id]: { ...s, vertices } } : prev
      })
    },

    animatePolygon(id, startVerts, endVerts, duration = 0.5) {
      return new Promise(resolve => {
        const startTime = performance.now()
        const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t   // ease-in-out quad
        function tick() {
          const t = Math.min((performance.now() - startTime) / (duration * 1000), 1)
          const e = ease(t)
          const interp = startVerts.map(([x1, y1], i) => {
            const [x2, y2] = endVerts[i]
            return [x1 + (x2 - x1) * e, y1 + (y2 - y1) * e]
          })
          setShapes(prev => {
            const s = prev[id]
            return s ? { ...prev, [id]: { ...s, vertices: interp } } : prev
          })
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    setShapeStyle(id, style) {
      setShapes(prev => {
        const s = prev[id]
        return s ? { ...prev, [id]: { ...s, style: { ...s.style, ...style } } } : prev
      })
    },

    removeShape(id) {
      setShapes(prev => { const n = { ...prev }; delete n[id]; return n })
    },

    addAngleArc(id, cx, cy, r, startAngle, diff, style) {
      setShapes(prev => ({ ...prev, [id]: { kind: 'angle-arc', cx, cy, r, startAngle, diff, progress: 0, style } }))
    },

    animateAngleArc(id, duration = 0.6) {
      return new Promise(resolve => {
        const startTime = performance.now()
        function tick() {
          const t = Math.min((performance.now() - startTime) / (duration * 1000), 1)
          setShapes(prev => {
            const s = prev[id]
            return s ? { ...prev, [id]: { ...s, progress: t } } : prev
          })
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    addEdgeHighlight(id, x1, y1, x2, y2, style) {
      setShapes(prev => ({ ...prev, [id]: { kind: 'edge-highlight', x1, y1, x2, y2, progress: 0, style } }))
    },

    animateEdgeHighlight(id, duration = 0.4) {
      return new Promise(resolve => {
        const startTime = performance.now()
        const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
        function tick() {
          const t = Math.min((performance.now() - startTime) / (duration * 1000), 1)
          setShapes(prev => {
            const s = prev[id]
            return s ? { ...prev, [id]: { ...s, progress: ease(t) } } : prev
          })
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    addArrow(id, x1, y1, x2, y2, style) {
      setShapes(prev => ({ ...prev, [id]: { kind: 'arrow', x1, y1, x2, y2, progress: 0, style } }))
    },

    animateArrow(id, duration = 0.55) {
      return new Promise(resolve => {
        const startTime = performance.now()
        const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
        function tick() {
          const t = Math.min((performance.now() - startTime) / (duration * 1000), 1)
          setShapes(prev => {
            const s = prev[id]
            return s ? { ...prev, [id]: { ...s, progress: ease(t) } } : prev
          })
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    // Reverse-animate progress 1→0 (un-draws the arrow tip-to-tail), then remove the shape.
    shrinkRemoveShape(id, duration = 0.4) {
      return new Promise(resolve => {
        const startTime = performance.now()
        const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
        function tick() {
          const t = Math.min((performance.now() - startTime) / (duration * 1000), 1)
          setShapes(prev => {
            const s = prev[id]
            if (!s) { resolve(); return prev }
            if (t >= 1) {
              const n = { ...prev }; delete n[id]; resolve(); return n
            }
            return { ...prev, [id]: { ...s, progress: 1 - ease(t) } }
          })
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    },

    addLabel(id, x, y, text, style) {
      setShapes(prev => ({ ...prev, [`lbl__${id}`]: { kind: 'label', x, y, text, style } }))
    },

    removeLabel(id) {
      setShapes(prev => { const n = { ...prev }; delete n[`lbl__${id}`]; return n })
    },

    setLabelColor(id, color) {
      setShapes(prev => {
        const key = `lbl__${id}`
        const s   = prev[key]
        return s ? { ...prev, [key]: { ...s, style: { ...(s.style ?? {}), color } } } : prev
      })
    },

    getSvg()          { return svgRef.current },
    getShapesState()  { return { ...shapesRef.current } },
    getViewportState() { return { ...vpRef.current } },
    restoreShapesState(savedShapes, savedVp) {
      setShapes(savedShapes)
      if (savedVp) { vpRef.current = savedVp; setVp(savedVp) }
    },

    clearAll() {
      setShapes({})
      vpRef.current = DEFAULT_VP
      setVp(DEFAULT_VP)
    },

    setViewport(xMin, xMax, yMin, yMax) {
      const nv = { xMin, xMax, yMin, yMax }
      vpRef.current = nv
      setVp(nv)
    },

    getViewport() { return vpRef.current },

    // Returns all polygon edges as [{x1,y1,x2,y2}] in page (client) coordinates.
    getEdgeSegments() {
      const svgEl = svgRef.current
      if (!svgEl) return []
      const rect  = svgEl.getBoundingClientRect()
      const scale = Math.min(rect.width / SVG_W, rect.height / SVG_H)
      const xOff  = (rect.width  - SVG_W * scale) / 2
      const yOff  = (rect.height - SVG_H * scale) / 2
      const toPage = (wx, wy) => {
        const [sx, sy] = w2s(wx, wy, vpRef.current)
        return { x: rect.left + xOff + sx * scale, y: rect.top + yOff + sy * scale }
      }
      const segs = []
      for (const shape of Object.values(shapesRef.current)) {
        if (shape.kind !== 'polygon') continue
        const vs = shape.vertices
        for (let i = 0; i < vs.length; i++) {
          const a = toPage(vs[i][0], vs[i][1])
          const b = toPage(vs[(i + 1) % vs.length][0], vs[(i + 1) % vs.length][1])
          segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
        }
      }
      return segs
    },

    getPageCoords(target) {
      const svgEl = svgRef.current
      if (!svgEl) return null
      const rect  = svgEl.getBoundingClientRect()
      const scale = Math.min(rect.width / SVG_W, rect.height / SVG_H)
      const xOff  = (rect.width  - SVG_W * scale) / 2
      const yOff  = (rect.height - SVG_H * scale) / 2
      let svgX, svgY
      if (target.type === 'geo-vertex') {
        const shape = shapesRef.current[target.shapeId]
        if (!shape || shape.kind !== 'polygon') return null
        const v = shape.vertices?.[target.vertexIndex]
        if (!v) return null
        ;[svgX, svgY] = w2s(v[0], v[1], vpRef.current)
      } else if (target.type === 'geo-edge') {
        const shape = shapesRef.current[target.shapeId]
        if (!shape || shape.kind !== 'polygon') return null
        const vs = shape.vertices
        const i  = target.edgeIndex % vs.length
        const v1 = vs[i], v2 = vs[(i + 1) % vs.length]
        ;[svgX, svgY] = w2s((v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2, vpRef.current)
      } else {
        return null
      }
      return { x: rect.left + xOff + svgX * scale, y: rect.top + yOff + svgY * scale }
    },
  }))

  return (
    <div className="math-display-wrap">
      <svg
        ref={svgRef}
        className="geo-svg"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Dark background */}
        <rect width={SVG_W} height={SVG_H} fill="var(--bg-2)" rx="6" />

        {/* Axis lines through origin */}
        {(() => {
          const [ax, ay] = w2s(0, 0, vp)
          return (
            <>
              <line x1={ax} y1={0} x2={ax} y2={SVG_H}
                stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              <line x1={0} y1={ay} x2={SVG_W} y2={ay}
                stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
            </>
          )
        })()}

        {/* Viewport boundary */}
        <rect x={1} y={1} width={SVG_W - 2} height={SVG_H - 2}
          fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} rx="5" />

        {Object.entries(shapes).map(([id, shape]) => {
          if (shape.kind === 'polygon') {
            const pts = shape.vertices
              .map(([x, y]) => w2s(x, y, vp).join(','))
              .join(' ')
            return (
              <polygon
                key={id}
                points={pts}
                strokeLinejoin="round"
                style={{
                  fill:        shape.style.fill,
                  fillOpacity: shape.style.fillOpacity ?? 0.2,
                  stroke:      shape.style.stroke,
                  strokeWidth: shape.style.strokeWidth ?? 2,
                  transition:  'fill 0.9s ease, stroke 0.9s ease, fill-opacity 0.9s ease, stroke-width 0.3s ease',
                }}
              />
            )
          }

          if (shape.kind === 'circle') {
            const [cx, cy] = w2s(shape.cx, shape.cy, vp)
            const scale    = SVG_W / (vp.xMax - vp.xMin)
            return (
              <circle
                key={id}
                cx={cx} cy={cy} r={shape.r * scale}
                style={{
                  fill:        shape.style.fill,
                  fillOpacity: shape.style.fillOpacity ?? 0.2,
                  stroke:      shape.style.stroke,
                  strokeWidth: shape.style.strokeWidth ?? 2,
                  transition:  'fill 0.9s ease, stroke 0.9s ease, fill-opacity 0.9s ease, stroke-width 0.3s ease',
                }}
              />
            )
          }

          if (shape.kind === 'label') {
            const [x, y] = w2s(shape.x, shape.y, vp)
            return (
              <text
                key={id}
                id={id}
                x={x} y={y}
                fontSize={shape.style?.fontSize ?? 26}
                textAnchor={shape.style?.anchor ?? 'middle'}
                dominantBaseline="middle"
                fontFamily="'Fira Code','Cascadia Code',monospace"
                fontWeight="600"
                style={{
                  fill: shape.style?.color ?? '#a855f7',
                  transition: 'fill 0.4s ease',
                  animation: 'geoLabelIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                }}
              >
                {shape.text}
              </text>
            )
          }

          if (shape.kind === 'angle-arc') {
            const [pcx, pcy] = w2s(shape.cx, shape.cy, vp)
            const svgScale = SVG_W / (vp.xMax - vp.xMin)
            const prog     = Math.min(Math.max(shape.progress ?? 0, 0), 1)
            // Radius grows from 0 → full size: shape is always fully formed, just scales up
            const r_px  = shape.r * svgScale * prog
            const color = shape.style?.color ?? '#6495ed'
            const isRight = Math.abs(Math.abs(shape.diff) - Math.PI / 2) < 0.02

            if (prog < 0.001) return null

            if (isRight) {
              const endAngle = shape.startAngle + shape.diff
              const sx  = pcx + r_px * Math.cos(shape.startAngle)
              const sy  = pcy - r_px * Math.sin(shape.startAngle)
              const ex  = pcx + r_px * Math.cos(endAngle)
              const ey  = pcy - r_px * Math.sin(endAngle)
              const p1x = sx + (ex - pcx)
              const p1y = sy + (ey - pcy)
              return (
                <g key={id}>
                  <path
                    d={`M ${pcx} ${pcy} L ${sx} ${sy} L ${p1x} ${p1y} L ${ex} ${ey} Z`}
                    fill={color} fillOpacity={0.28}
                  />
                  <path
                    d={`M ${sx} ${sy} L ${p1x} ${p1y} L ${ex} ${ey}`}
                    fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="miter"
                  />
                </g>
              )
            }

            const endAngle = shape.startAngle + shape.diff
            const sx = pcx + r_px * Math.cos(shape.startAngle)
            const sy = pcy - r_px * Math.sin(shape.startAngle)
            const ex = pcx + r_px * Math.cos(endAngle)
            const ey = pcy - r_px * Math.sin(endAngle)
            const sweepFlag = shape.diff < 0 ? 1 : 0
            const largeArc  = Math.abs(shape.diff) > Math.PI ? 1 : 0
            return (
              <path
                key={id}
                d={`M ${pcx} ${pcy} L ${sx} ${sy} A ${r_px} ${r_px} 0 ${largeArc} ${sweepFlag} ${ex} ${ey} Z`}
                fill={color} fillOpacity={0.28}
                stroke={color} strokeWidth={1.5} strokeLinejoin="round"
              />
            )
          }

          if (shape.kind === 'edge-highlight') {
            const [ex1, ey1] = w2s(shape.x1, shape.y1, vp)
            const [ex2, ey2] = w2s(shape.x2, shape.y2, vp)
            const prog  = Math.min(Math.max(shape.progress ?? 1, 0), 1)
            const color = shape.style?.color ?? '#fbbf24'
            const sw    = shape.style?.strokeWidth ?? 5
            const dx = ex2 - ex1, dy = ey2 - ey1
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            return (
              <line key={id}
                x1={ex1} y1={ey1} x2={ex2} y2={ey2}
                stroke={color} strokeWidth={sw} strokeLinecap="round"
                strokeDasharray={len} strokeDashoffset={len * (1 - prog)}
                opacity={0.9}
              />
            )
          }

          if (shape.kind === 'arrow') {
            const [ax1, ay1] = w2s(shape.x1, shape.y1, vp)
            const [ax2, ay2] = w2s(shape.x2, shape.y2, vp)
            const prog  = Math.min(Math.max(shape.progress ?? 1, 0), 1)
            const color = shape.style?.color ?? '#fbbf24'
            // Current tip grows from tail to final tip
            const cx = ax1 + (ax2 - ax1) * prog
            const cy = ay1 + (ay2 - ay1) * prog
            const dx = ax2 - ax1, dy = ay2 - ay1
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const ux = dx / len, uy = dy / len
            const aLen = 14 * prog, aW = 5 * prog
            const p1x = cx - ux * aLen + uy * aW
            const p1y = cy - uy * aLen - ux * aW
            const p2x = cx - ux * aLen - uy * aW
            const p2y = cy - uy * aLen + ux * aW
            return (
              <g key={id}>
                <line x1={ax1} y1={ay1} x2={cx} y2={cy}
                  stroke={color} strokeWidth={2.5} strokeLinecap="round" />
                {prog > 0.05 && (
                  <polygon points={`${cx},${cy} ${p1x},${p1y} ${p2x},${p2y}`} fill={color} />
                )}
              </g>
            )
          }

          return null
        })}
      </svg>
    </div>
  )
})

export default GeometryDisplay
