import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { getViewport, onTrigOverlay, offTrigOverlay } from '../engine/desmosEngine.js'

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
    })
    return () => {
      alive = false
      if (calcRef.current) { calcRef.current.destroy(); calcRef.current = null }
    }
  }, [])

  return (
    <div className="math-display-wrap">
      {status === 'loading' && (
        <div className="math-status">
          <span className="math-spinner" />
          Chargement…
        </div>
      )}
      {status === 'error' && (
        <div className="math-status math-status--error">
          Desmos non disponible (vérifier la connexion)
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
      <div style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'default' }} />
    </div>
  )
})

export default DesmosDisplay
