import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import {
  getViewport, setViewport, resquareViewport, onTrigOverlay, offTrigOverlay,
  onLiveEquationsChange, offLiveEquationsChange, onSliderChange, offSliderChange, getLiveEquationText,
  onGraphClear, offGraphClear, setGraphInteractive,
} from '../engine/desmosEngine.js'
import MathText from './RichText.jsx'

const SCRIPT_SRC = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=b4745411202b41739a8da3535562ca5b'

let _ready = false
const _queue = []

function loadScript(cb) {
  if (_ready) { cb(); return }
  _queue.push(cb)
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return
  const s = document.createElement('script')
  s.src = SCRIPT_SRC
  s.onload = () => { _ready = true; _queue.splice(0).forEach(fn => fn()) }
  s.onerror = () => console.error('[Desmos] script load failed')
  document.head.appendChild(s)
}

const DesmosDisplay = forwardRef(function DesmosDisplay(_, ref) {
  const containerRef = useRef(null)
  const calcRef      = useRef(null)
  const [status, setStatus]           = useState('loading')
  const [overlayItems, setOverlayItems] = useState([])
  const [liveEqs, setLiveEqs]         = useState([])
  const [, bumpLiveEqs]               = useState(0)
  const [interactive, setInteractive] = useState(false)
  const savedViewportRef = useRef(null)

  // Pan/zoom toggle — saves the viewport on the way in, restores it exactly
  // on the way out. Desmos's own lockViewport is what actually gates mouse
  // drag/scroll; the full-panel click-blocker below also has to step aside
  // (pointerEvents:none) or nothing would reach the canvas either way.
  const toggleInteractive = () => {
    const calc = calcRef.current
    if (!calc) return
    if (!interactive) {
      savedViewportRef.current = getViewport()
      calc.updateSettings({ lockViewport: false })
      setInteractive(true)
      setGraphInteractive(true)
    } else {
      calc.updateSettings({ lockViewport: true })
      const saved = savedViewportRef.current
      if (saved) setViewport(calc, saved.left, saved.right, saved.bottom, saved.top)
      setInteractive(false)
      setGraphInteractive(false)
    }
  }

  useImperativeHandle(ref, () => ({
    get calculator() { return calcRef.current },
    isReady()        { return calcRef.current !== null },

    getPageCoords(target) {
      if (!containerRef.current) return null
      const rect = containerRef.current.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      // Use engine's authoritative viewport (always in sync) rather than
      // Desmos' graphpaperBounds which can lag after animations/resizes.
      const vp = getViewport()
      const px = (target.x - vp.left)   / (vp.right  - vp.left)   * rect.width
      const py = (target.y - vp.top)    / (vp.bottom - vp.top)    * rect.height
      return { x: rect.left + px, y: rect.top + py }
    },
  }))

  useEffect(() => {
    onLiveEquationsChange(setLiveEqs)
    return () => offLiveEquationsChange(setLiveEqs)
  }, [])

  useEffect(() => {
    const onClear = () => {
      savedViewportRef.current = null
      setInteractive(false)
      setGraphInteractive(false)
      try { calcRef.current?.updateSettings({ lockViewport: true }) } catch {}
    }
    onGraphClear(onClear)
    return () => offGraphClear(onClear)
  }, [])

  // Slider drags don't touch React state anywhere else — this is what makes
  // the live-equation text actually redraw as the value changes underneath.
  useEffect(() => {
    const bump = () => bumpLiveEqs(t => t + 1)
    onSliderChange(bump)
    return () => offSliderChange(bump)
  }, [])

  useEffect(() => {
    onTrigOverlay(setOverlayItems)
    return () => offTrigOverlay(setOverlayItems)
  }, [])

  useEffect(() => {
    let alive = true
    loadScript(() => {
      if (!alive || !window.Desmos) {
        if (alive) setStatus('error')
        return
      }
      const el = containerRef.current
      if (!el) return

      if (calcRef.current) { calcRef.current.destroy(); calcRef.current = null }

      calcRef.current = window.Desmos.GraphingCalculator(el, {
        keypad:        false,
        expressions:   false,
        settingsMenu:  false,
        zoomButtons:   false,
        trace:         false,
        border:        false,
        lockViewport:  true,
      })
      setStatus('ready')
      resquareViewport(calcRef.current)
    })
    return () => {
      alive = false
      if (calcRef.current) { calcRef.current.destroy(); calcRef.current = null }
    }
  }, [])

  // The panel changes shape on layout switches and window resizes, and Desmos
  // keeps the same math bounds — so the units stop being square and circles
  // render as ovals. Re-square on every size change, on the next frame so the
  // measurement is of the settled box.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let pending = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(pending)
      pending = requestAnimationFrame(() => resquareViewport(calcRef.current))
    })
    ro.observe(el)
    return () => { cancelAnimationFrame(pending); ro.disconnect() }
  }, [])

  return (
    <div className="math-display-wrap">
      {status === 'loading' && (
        <div className="math-status">
          <span className="math-spinner" />
          Loading…
        </div>
      )}
      {status === 'error' && (
        <div className="math-status math-status--error">
          Desmos unavailable (check your connection)
        </div>
      )}
      <div
        ref={containerRef}
        className="desmos-container"
        style={{ opacity: status === 'ready' ? 1 : 0 }}
      />
      {overlayItems.map(item => {
        const vp = getViewport()
        const px = (item.mathX - vp.left) / (vp.right - vp.left) * 100
        const py = (vp.top - item.mathY) / (vp.top - vp.bottom) * 100
        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: `${px}%`,
              top: `${py}%`,
              transform: 'translate(-50%, -50%)',
              color: item.type === 'angle' ? '#f87171' : '#fca5a5',
              fontSize: item.type === 'angle' ? '10px' : '10px',
              fontFamily: 'monospace',
              fontWeight: item.type === 'angle' ? 'bold' : 'normal',
              pointerEvents: 'none',
              zIndex: 4,
              whiteSpace: 'nowrap',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            {item.text}
          </div>
        )
      })}
      {liveEqs.map(({ id, funcId }) => {
        const info = getLiveEquationText(funcId)
        if (!info) return null
        return (
          <div
            key={id}
            style={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              color: info.color, background: 'rgba(10,10,20,0.72)',
              padding: '4px 12px', borderRadius: 8,
              fontWeight: 700, fontSize: 16,
              pointerEvents: 'none', zIndex: 6, whiteSpace: 'nowrap',
            }}
          >
            <MathText text={info.text} />
          </div>
        )
      })}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'default', pointerEvents: interactive ? 'none' : 'auto' }} />
      {status === 'ready' && (
        <button
          onClick={toggleInteractive}
          title={interactive ? 'Lock view (back to where it was)' : 'Explore this graph (drag to pan, scroll to zoom)'}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            width: 30, height: 30, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${interactive ? '#60a5fa' : 'rgba(255,255,255,0.18)'}`,
            background: interactive ? 'rgba(96,165,250,0.25)' : 'rgba(10,10,20,0.72)',
            color: interactive ? '#60a5fa' : 'rgba(255,255,255,0.75)',
            fontSize: 15, cursor: 'pointer', lineHeight: 1,
          }}
        >
          {interactive ? '🔒' : '✋'}
        </button>
      )}
    </div>
  )
})

export default DesmosDisplay
