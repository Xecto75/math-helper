import { useEffect, useRef, useState } from 'react'

const REGIONS = [
  { id: 'exercices', file: '/assets/ui/exercices.png', section: 'exercises'           },
  { id: 'tools',     file: '/assets/ui/tools.png',     section: 'tools'               },
  { id: 'custom',    file: '/assets/ui/custom.png',    section: 'custom'              },
  { id: 'geo',       file: '/assets/ui/geo.png',       section: 'tree', filter: 'geo' },
  { id: 'math',      file: '/assets/ui/math.png',      section: 'tree', filter: 'math'},
]

export default function VillageScene({ onNavigate }) {
  const containerRef  = useRef(null)
  const canvasData    = useRef({})   // { [id]: { ctx, w, h } }
  const naturalSize   = useRef(null) // { w, h } of the base image (= all hover PNGs)
  const [hoverRegion, setHoverRegion] = useState(null)
  const [ready,       setReady]       = useState(false)

  useEffect(() => {
    let done = 0
    const total = REGIONS.length

    REGIONS.forEach(r => {
      const img = new Image()
      img.onload = () => {
        // All PNGs share the same dimensions as village.webp
        if (!naturalSize.current) {
          naturalSize.current = { w: img.naturalWidth, h: img.naturalHeight }
        }
        const canvas  = document.createElement('canvas')
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0)
        canvasData.current[r.id] = { ctx, w: img.naturalWidth, h: img.naturalHeight }
        if (++done === total) setReady(true)
      }
      img.crossOrigin = 'anonymous'
      img.src = r.file
    })
  }, [])

  // Compute the rendered image bounds inside the container (object-fit: contain)
  function getImageBounds(rect) {
    const ns = naturalSize.current
    if (!ns) return null
    const containerAR = rect.width  / rect.height
    const imageAR     = ns.w / ns.h
    let drawW, drawH, ox, oy
    if (containerAR > imageAR) {
      drawH = rect.height
      drawW = ns.w * (rect.height / ns.h)
      ox    = (rect.width - drawW) / 2
      oy    = 0
    } else {
      drawW = rect.width
      drawH = ns.h * (rect.width / ns.w)
      ox    = 0
      oy    = (rect.height - drawH) / 2
    }
    return { drawW, drawH, ox, oy }
  }

  const handleMouseMove = (e) => {
    if (!ready) return
    const rect   = containerRef.current.getBoundingClientRect()
    const bounds = getImageBounds(rect)
    if (!bounds) return

    const ax = e.clientX - rect.left - bounds.ox
    const ay = e.clientY - rect.top  - bounds.oy

    if (ax < 0 || ay < 0 || ax > bounds.drawW || ay > bounds.drawH) {
      setHoverRegion(null)
      return
    }

    const nx = ax / bounds.drawW
    const ny = ay / bounds.drawH

    let active = null
    for (const r of REGIONS) {
      const d = canvasData.current[r.id]
      if (!d) continue
      const px = Math.floor(nx * d.w)
      const py = Math.floor(ny * d.h)
      if (px < 0 || py < 0 || px >= d.w || py >= d.h) continue
      const alpha = d.ctx.getImageData(px, py, 1, 1).data[3]
      if (alpha > 10) { active = r.id; break }
    }
    setHoverRegion(active)
  }

  const handleClick = () => {
    if (!hoverRegion) return
    const r = REGIONS.find(r => r.id === hoverRegion)
    if (r) onNavigate(r.section, r.filter)
  }

  return (
    <div
      ref={containerRef}
      className="village-scene"
      style={{ cursor: hoverRegion ? 'pointer' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverRegion(null)}
      onClick={handleClick}
    >
      <img
        className="village-img"
        src="/assets/backgrounds/village.webp"
        alt=""
        draggable={false}
      />
      {REGIONS.map(r => (
        <img
          key={r.id}
          className="village-img village-img--hover"
          src={r.file}
          alt=""
          draggable={false}
          style={{ opacity: hoverRegion === r.id ? 1 : 0 }}
        />
      ))}
    </div>
  )
}
