import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { flushSync } from 'react-dom'

const W = 760, H = 260
const LINE_Y = 150
const TICK_H  = 18
const ZERO_Y  = LINE_Y

function lerp(from, to, t) { return from + (to - from) * t }

const NumberLineDisplay = forwardRef(function NumberLineDisplay(_props, ref) {
  const [lineState, setLineState] = useState(null)   // { from, to }
  const [marks,     setMarks]     = useState([])     // [{ value, label, color, id }]
  const [jumps,     setJumps]     = useState([])     // [{ from, steps, size, color, label, id }]
  const [shades,    setShades]    = useState([])     // [{ from, to, color, id }]
  const svgRef  = useRef(null)
  const nextId  = useRef(0)
  const mkId    = () => `nl-${nextId.current++}`

  function valueToX(v, from, to) {
    const padding = 60
    return lerp(padding, W - padding, (v - from) / (to - from))
  }

  useImperativeHandle(ref, () => ({
    clearAll() { setLineState(null); setMarks([]); setJumps([]); setShades([]) },

    show(from, to) {
      const f = Number(from) ?? 0
      const t = Number(to)   ?? 10
      flushSync(() => { setLineState({ from: f, to: t }); setMarks([]); setJumps([]); setShades([]) })
      requestAnimationFrame(() => {
        const line = svgRef.current?.querySelector('.nl-axis')
        if (line) gsap.from(line, { scaleX: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'power3.out' })
      })
    },

    mark(value, label, color = '#ef4444') {
      const id = mkId()
      const v  = Number(value)
      setMarks(prev => [...prev, { value: v, label: label || String(v), color, id }])
      requestAnimationFrame(() => {
        const el = svgRef.current?.querySelector(`[data-mark="${id}"]`)
        if (el) gsap.from(el, { scale: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'back.out(2)' })
      })
    },

    jump(from, steps, size = 1, color = '#4ade80', label = '') {
      const id = mkId()
      setJumps(prev => [...prev, { from: Number(from), steps: Number(steps), size: Number(size) || 1, color, label, id }])
      requestAnimationFrame(() => {
        const arcs = svgRef.current?.querySelectorAll(`[data-jump="${id}"]`) ?? []
        gsap.from(arcs, { opacity: 0, y: 20, stagger: 0.15, duration: 0.4, ease: 'power2.out' })
      })
    },

    shade(from, to, color = '#818cf840') {
      const id = mkId()
      setShades(prev => [...prev, { from: Number(from), to: Number(to), color, id }])
    },
  }))

  if (!lineState) return <div className="numberline-display numberline-display--empty" />

  const { from, to } = lineState
  const vToX = v => valueToX(v, from, to)

  // Generate ticks
  const range   = to - from
  const step    = range <= 10 ? 1 : range <= 20 ? 2 : range <= 50 ? 5 : 10
  const ticks   = []
  for (let v = Math.ceil(from / step) * step; v <= to; v += step) {
    ticks.push(v)
  }

  // Build jump arcs
  const jumpArcs = []
  for (const j of jumps) {
    for (let i = 0; i < j.steps; i++) {
      const x0 = vToX(j.from + i * j.size)
      const x1 = vToX(j.from + (i + 1) * j.size)
      const mx  = (x0 + x1) / 2
      const cy2 = LINE_Y - 50 - Math.abs(x1 - x0) * 0.15
      jumpArcs.push({ x0, x1, mx, cy2, color: j.color, id: j.id, i, label: j.label, size: j.size })
    }
  }

  return (
    <div className="numberline-display">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">

        {/* Shade regions */}
        {shades.map(s => (
          <rect
            key={s.id}
            x={vToX(s.from)} y={LINE_Y - TICK_H - 2}
            width={Math.abs(vToX(s.to) - vToX(s.from))}
            height={TICK_H * 2 + 4}
            fill={s.color}
            rx={4}
          />
        ))}

        {/* Main axis */}
        <line className="nl-axis"
          x1={vToX(from) - 20} y1={LINE_Y}
          x2={vToX(to) + 20}   y2={LINE_Y}
          stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        />

        {/* Arrowheads */}
        <polygon points={`${vToX(to)+20},${LINE_Y} ${vToX(to)+10},${LINE_Y-5} ${vToX(to)+10},${LINE_Y+5}`} fill="currentColor" />
        {from < 0 && (
          <polygon points={`${vToX(from)-20},${LINE_Y} ${vToX(from)-10},${LINE_Y-5} ${vToX(from)-10},${LINE_Y+5}`} fill="currentColor" />
        )}

        {/* Ticks + labels */}
        {ticks.map(v => {
          const x = vToX(v)
          const isZero = v === 0
          return (
            <g key={v}>
              <line x1={x} y1={LINE_Y - TICK_H} x2={x} y2={LINE_Y + TICK_H}
                stroke="currentColor" strokeWidth={isZero ? 2.5 : 1.5} strokeLinecap="round"
              />
              <text x={x} y={LINE_Y + TICK_H + 18}
                textAnchor="middle" fontSize={isZero ? 15 : 13}
                fontWeight={isZero ? 700 : 400} fill="currentColor"
              >{v}</text>
            </g>
          )
        })}

        {/* Jump arcs */}
        {jumpArcs.map((arc, idx) => (
          <g key={`${arc.id}-${arc.i}`} data-jump={arc.id}>
            <path
              d={`M${arc.x0},${LINE_Y} Q${arc.mx},${arc.cy2} ${arc.x1},${LINE_Y}`}
              fill="none" stroke={arc.color} strokeWidth="2.5" strokeLinecap="round"
            />
            {/* Arrowhead at landing */}
            <polygon
              points={`${arc.x1},${LINE_Y-5} ${arc.x1+5},${LINE_Y-13} ${arc.x1-5},${LINE_Y-13}`}
              fill={arc.color}
            />
            {/* Step label on arc */}
            <text x={arc.mx} y={arc.cy2 - 8}
              textAnchor="middle" fontSize="12" fontWeight="700" fill={arc.color}
            >{arc.label || (arc.size >= 0 ? `+${arc.size}` : arc.size)}</text>
          </g>
        ))}

        {/* Mark points */}
        {marks.map(m => {
          const x = vToX(m.value)
          return (
            <g key={m.id} data-mark={m.id}>
              <circle cx={x} cy={LINE_Y} r={8} fill={m.color} />
              <text x={x} y={LINE_Y - 18}
                textAnchor="middle" fontSize="13" fontWeight="700" fill={m.color}
              >{m.label}</text>
            </g>
          )
        })}

      </svg>
    </div>
  )
})

export default NumberLineDisplay
