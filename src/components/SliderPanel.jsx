import { useEffect, useState } from 'react'
import * as graphEngine from '../engine/desmosEngine.js'

function fmt(value) {
  const r = Math.round(value * 100) / 100
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export default function SliderPanel({ graphRef }) {
  const [vars, setVars] = useState(() => graphEngine.getSliderVars())

  useEffect(() => {
    graphEngine.onSliderChange(setVars)
    return () => graphEngine.offSliderChange(setVars)
  }, [])

  if (!vars.length) return null

  return (
    <div className="slider-panel">
      {vars.map(v => {
        const pct = ((v.value - v.min) / (v.max - v.min)) * 100
        return (
          <div className="var-slider" key={v.name}
               style={{ '--sc': v.color || '#60a5fa', '--pct': `${pct}%` }}>
            <div className="var-slider-track">
              {/* The rail and the part of it that is filled are plain elements:
                  the browser's own track (::-webkit-slider-runnable-track) is
                  painted by the browser, and on a vertical range it kept the
                  one flat colour whatever the value was. */}
              <span className="var-slider-rail" aria-hidden="true">
                <span className="var-slider-fill" />
              </span>
              <span className="var-slider-name">{v.name}</span>
              <input
                type="range"
                className="var-slider-input"
                min={v.min}
                max={v.max}
                step={v.step}
                value={v.value}
                onChange={e => {
                  const calc = graphRef.current?.calculator
                  if (calc) graphEngine.setSliderValue(calc, v.name, parseFloat(e.target.value))
                }}
              />
            </div>
            <span className="var-slider-value">{fmt(v.value)}</span>
          </div>
        )
      })}
    </div>
  )
}
