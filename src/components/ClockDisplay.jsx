import { useState, useImperativeHandle, forwardRef, useRef } from 'react'
import { t } from '../i18n/translations.js'

const CX = 200, CY = 200

const NUM_COLORS = [
  '#f87171','#fb923c','#facc15','#4ade80','#34d399','#22d3ee',
  '#60a5fa','#a78bfa','#f472b6','#fb7185','#2dd4bf','#818cf8',
]
const HAND_COLOR = { hour: '#f97316', minute: '#22d3ee' }

function toRad(d) { return d * Math.PI / 180 }

// Returns the SVG coordinate of the midpoint of a hand, plus which side it's on
function handMid(hand, hour, minute) {
  const deg = hand === 'hour'
    ? (((hour % 12) + minute / 60) * 30)
    : minute * 6
  const r = toRad(deg)
  // Hour hand: line y+18 → y-92, midpoint at dist=37 from center toward tip
  // Minute hand: line y+18 → y-135, midpoint at dist=58.5
  const dist = hand === 'hour' ? 37 : 58.5
  return {
    x: CX + dist * Math.sin(r),
    y: CY - dist * Math.cos(r),
    right: Math.sin(r) >= 0,
  }
}

const ClockDisplay = forwardRef(function ClockDisplay({ lang = 'en' }, ref) {
  const [s, setS] = useState(null)
  const elRefs    = useRef({})
  const setRef    = k => el => { elRefs.current[k] = el }

  useImperativeHandle(ref, () => ({
    init(hour, minute)    { setS({ hour, minute, highlightedHand: null }) },
    setTime(hour, minute) { setS(prev => ({ ...(prev ?? {}), hour, minute })) },
    highlight(hand)       { setS(prev => prev ? { ...prev, highlightedHand: hand } : prev) },
    clearHighlight()      { setS(prev => prev ? { ...prev, highlightedHand: null } : prev) },
    getEl(k)              { return elRefs.current[k] ?? null },
    clearAll()            { setS(null) },
  }))

  if (!s) return <div className="clock-display clock-display--empty" />

  // Hour tick marks + numbers
  // a = angle in standard math coords (0° = right, CCW positive), starting from 12 o'clock (-90°)
  const hourMarks = Array.from({ length: 12 }, (_, i) => {
    const a = toRad(i * 30 - 90)
    const c = Math.cos(a), s = Math.sin(a)
    return {
      x1: CX + 165 * c, y1: CY + 165 * s,
      x2: CX + 145 * c, y2: CY + 145 * s,
      nx: CX + 128 * c, ny: CY + 128 * s,
      num: i === 0 ? 12 : i,
      color: NUM_COLORS[i],
    }
  })

  // Minute ticks (skip hour positions)
  const minMarks = Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) return null
    const a = toRad(i * 6 - 90)
    return {
      x1: CX + 165 * Math.cos(a), y1: CY + 165 * Math.sin(a),
      x2: CX + 158 * Math.cos(a), y2: CY + 158 * Math.sin(a),
    }
  }).filter(Boolean)

  // Annotation label + line for highlighted hand
  let annotation = null
  if (s.highlightedHand) {
    const hand   = s.highlightedHand
    const color  = HAND_COLOR[hand]
    const label  = t(`clock.${hand}s`, lang)
    const { x: mx, y: my, right: isRight } = handMid(hand, s.hour, s.minute)

    // Label box geometry
    const LW = 140, LH = 52, LR = 13
    const lcx = isRight ? CX + 272 : CX - 272
    const lcy = Math.max(75, Math.min(325, my))

    // Line connects from inner edge of label to dot on hand
    const lineX1 = isRight ? lcx - LW / 2 : lcx + LW / 2

    annotation = (
      <g className="clock-annotation">
        {/* Connecting line */}
        <line
          x1={lineX1} y1={lcy} x2={mx} y2={my}
          stroke={color} strokeWidth={2.5} strokeLinecap="round"
          strokeDasharray="5 4" opacity={0.75}
        />
        {/* Dot on hand midpoint */}
        <circle cx={mx} cy={my} r={6} fill={color} />
        {/* Label background */}
        <rect
          x={lcx - LW / 2} y={lcy - LH / 2}
          width={LW} height={LH} rx={LR}
          fill={color}
        />
        {/* Label text */}
        <text
          x={lcx} y={lcy + 1}
          textAnchor="middle" dominantBaseline="central"
          fill="white" fontSize="22" fontWeight="900" fontFamily="inherit"
        >
          {label}
        </text>
      </g>
    )
  }

  const hlH = s.highlightedHand === 'hour'
  const hlM = s.highlightedHand === 'minute'

  return (
    <div className="clock-display">
      <div className="clock-inner">
        <svg viewBox="0 0 400 400" className="clock-svg" ref={setRef('svg')}>

          {/* Drop shadow */}
          <circle cx={CX + 4} cy={CY + 7} r={182} fill="rgba(0,0,0,0.18)" />

          {/* Rim */}
          <circle cx={CX} cy={CY} r={182} className="clock-rim" ref={setRef('rim')} />

          {/* Face */}
          <circle cx={CX} cy={CY} r={172} className="clock-face" ref={setRef('face')} />

          {/* Minute ticks */}
          {minMarks.map((m, i) => (
            <line key={i} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} className="clock-tick-min" />
          ))}

          {/* Hour ticks + colored rings + numbers */}
          {hourMarks.map((m, i) => (
            <g key={i} ref={setRef(`num-${m.num}`)}>
              <line
                x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2}
                stroke={m.color} strokeWidth={4} strokeLinecap="round"
              />
              <circle cx={m.nx} cy={m.ny} r={18} fill={m.color} opacity={0.18} />
              <text
                x={m.nx} y={m.ny} className="clock-num"
                textAnchor="middle" dominantBaseline="central" fill={m.color}
              >
                {m.num}
              </text>
            </g>
          ))}

          {/* Minute hand */}
          <g ref={setRef('minute-hand')}>
            <line
              x1={CX} y1={CY + 18} x2={CX} y2={CY - 135}
              className={`clock-hand clock-hand--minute${hlM ? ' clock-hand--hl' : ''}`}
              strokeLinecap="round"
            />
          </g>

          {/* Hour hand */}
          <g ref={setRef('hour-hand')}>
            <line
              x1={CX} y1={CY + 18} x2={CX} y2={CY - 92}
              className={`clock-hand clock-hand--hour${hlH ? ' clock-hand--hl' : ''}`}
              strokeLinecap="round"
            />
          </g>

          {/* Center hub */}
          <circle cx={CX} cy={CY} r={11} className="clock-center-outer" />
          <circle cx={CX} cy={CY} r={5}  className="clock-center-inner"  ref={setRef('center')} />

          {/* Annotation: label + line outside the clock */}
          {annotation}
        </svg>

        {/* Numeric time label */}
        <div className="clock-time-display">
          <span className="clock-time-hours">{s.hour}</span>
          <span className="clock-time-sep">h</span>
          <span className="clock-time-minutes">{String(s.minute).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  )
})

export default ClockDisplay
