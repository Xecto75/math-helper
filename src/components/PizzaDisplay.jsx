import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { flushSync } from 'react-dom'

const R = 110          // pizza radius
const CX = 130         // SVG centre x (single)
const CY = 130         // SVG centre y
const SZ = 260         // viewBox size (single)

const CRUST  = '#78350f'
const CHEESE = '#fbbf24'
const SAUCE  = '#dc2626'

function slicePath(cx, cy, r, i, total) {
  if (total === 1) {
    // Full circle can't be done with a single arc command
    return `M${cx},${cy - r} A${r},${r},0,1,1,${cx - 0.01},${cy - r} Z`
  }
  const a0 = (2 * Math.PI * i / total) - Math.PI / 2
  const a1 = (2 * Math.PI * (i + 1) / total) - Math.PI / 2
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
  const large = (1 / total) > 0.5 ? 1 : 0
  return `M${cx},${cy} L${x0},${y0} A${r},${r},0,${large},1,${x1},${y1} Z`
}

function PizzaSVG({ slices, shaded, showLabel, svgRef, cx = CX, cy = CY, r = R, sz = SZ }) {
  if (!slices) return null
  return (
    <svg ref={svgRef} viewBox={`0 0 ${sz} ${sz}`} width={sz} height={sz} style={{ overflow: 'visible' }}>
      {/* Crust ring */}
      <circle cx={cx} cy={cy} r={r + 8} fill={CRUST} />
      {/* Sauce base */}
      <circle cx={cx} cy={cy} r={r} fill={SAUCE} />
      {/* Slices */}
      {Array.from({ length: slices }, (_, i) => (
        <path
          key={i}
          data-slice={i}
          d={slicePath(cx, cy, r, i, slices)}
          fill={i < shaded ? CHEESE : SAUCE}
          stroke={CRUST}
          strokeWidth={1.5}
          opacity={1}
        />
      ))}
      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={3} fill={CRUST} />
      {/* Fraction label */}
      {showLabel && slices > 0 && (
        <g>
          <text x={cx} y={cy + r + 30} textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor">
            {shaded}/{slices}
          </text>
        </g>
      )}
    </svg>
  )
}

const PizzaDisplay = forwardRef(function PizzaDisplay(_props, ref) {
  const [state,  setState]  = useState(null)   // { slices, shaded, showLabel }
  const [state2, setState2] = useState(null)   // second pizza for compare
  const svg1Ref = useRef(null)
  const svg2Ref = useRef(null)

  function animateIn(svgEl, slices, shaded) {
    if (!svgEl) return
    const sliceEls = Array.from(svgEl.querySelectorAll('[data-slice]'))
    gsap.from(sliceEls, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', stagger: 0.06, duration: 0.35, ease: 'back.out(1.4)' })
    // Colour transition for shaded vs unshaded
    sliceEls.forEach((el, i) => {
      gsap.to(el, { fill: i < shaded ? CHEESE : SAUCE, duration: 0.25, delay: i * 0.06 + 0.15 })
    })
  }

  function animateShade(svgEl, shaded) {
    if (!svgEl) return
    const sliceEls = Array.from(svgEl.querySelectorAll('[data-slice]'))
    sliceEls.forEach((el, i) => {
      gsap.to(el, { fill: i < shaded ? CHEESE : SAUCE, duration: 0.3, delay: i * 0.04, ease: 'power2.out' })
    })
  }

  useImperativeHandle(ref, () => ({
    clearAll() { setState(null); setState2(null) },

    show(slices, shaded, showLabel = true) {
      const s = Number(slices) || 4
      const h = Math.min(Number(shaded) || 0, s)
      flushSync(() => { setState({ slices: s, shaded: h, showLabel }); setState2(null) })
      requestAnimationFrame(() => animateIn(svg1Ref.current, s, h))
    },

    shade(shaded) {
      const h = Math.min(Number(shaded) || 0, state?.slices ?? 4)
      setState(prev => prev ? { ...prev, shaded: h } : prev)
      requestAnimationFrame(() => animateShade(svg1Ref.current, h))
    },

    showLabel(show) {
      setState(prev => prev ? { ...prev, showLabel: show === true || show === 'true' } : prev)
    },

    compare(slices2, shaded2, showLabel2 = true) {
      const s2 = Number(slices2) || 8
      const h2 = Math.min(Number(shaded2) || 0, s2)
      flushSync(() => setState2({ slices: s2, shaded: h2, showLabel: showLabel2 }))
      requestAnimationFrame(() => animateIn(svg2Ref.current, s2, h2))
    },
  }))

  if (!state) return <div className="pizza-display pizza-display--empty" />

  const compareMode = !!state2

  return (
    <div className={`pizza-display${compareMode ? ' pizza-display--compare' : ''}`}>
      <div className="pizza-slot">
        <PizzaSVG {...state} svgRef={svg1Ref} />
      </div>
      {compareMode && (
        <>
          <span className="pizza-vs">vs</span>
          <div className="pizza-slot">
            <PizzaSVG {...state2} svgRef={svg2Ref} />
          </div>
        </>
      )}
    </div>
  )
})

export default PizzaDisplay
