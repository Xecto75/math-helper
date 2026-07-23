import { useImperativeHandle, forwardRef, useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'

// ── Module-level helpers ────────────────────────────────────────────────────

function mkColor(c) {
  if (!c) return new THREE.Color(0x6495ed)
  try { return new THREE.Color(c) } catch { return new THREE.Color(0x6495ed) }
}

function disposeMesh(obj) {
  obj.traverse(child => {
    child.geometry?.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
      else child.material.dispose()
    }
  })
}

function buildPolygonGroup(vertices, style) {
  const shape = new THREE.Shape()
  shape.moveTo(vertices[0][0], vertices[0][1])
  for (let i = 1; i < vertices.length; i++) shape.lineTo(vertices[i][0], vertices[i][1])
  shape.closePath()

  const fillGeo = new THREE.ShapeGeometry(shape)
  const fillMat = new THREE.MeshBasicMaterial({
    color:       mkColor(style.fill),
    opacity:     style.fillOpacity ?? 0.2,
    transparent: true,
    side:        THREE.DoubleSide,
  })
  const fillMesh = new THREE.Mesh(fillGeo, fillMat)
  fillMesh.position.z = 0

  const outlinePts = [...vertices, vertices[0]].map(([x, y]) => new THREE.Vector3(x, y, 0.01))
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts)
  const outlineMat = new THREE.LineBasicMaterial({ color: mkColor(style.stroke) })
  const outline    = new THREE.Line(outlineGeo, outlineMat)

  const group = new THREE.Group()
  group.add(fillMesh)
  group.add(outline)
  group.userData = { kind: 'polygon', style: { ...style }, vertices: vertices.map(v => [...v]) }
  return group
}

function buildSectorShape(cx, cy, r, startAngle, diff) {
  const shape = new THREE.Shape()
  shape.moveTo(cx, cy)
  const steps = Math.max(3, Math.round(Math.abs(diff) / Math.PI * 32))
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + diff * (i / steps)
    shape.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  shape.closePath()
  return shape
}

// ── Component ───────────────────────────────────────────────────────────────

const GeometryDisplay = forwardRef(function GeometryDisplay(_, ref) {
  const mountRef   = useRef(null)
  const engineRef  = useRef({
    renderer:  null,
    scene:     null,
    camera:    null,
    objects:   new Map(),   // id → THREE.Group/Line
    rafId:     null,
    vp:        { xMin: -8, xMax: 8, yMin: -6, yMax: 6 },
    actualVp:  { left: -8, right: 8, bottom: -6, top: 6 },
    ready:     false,
  })
  const [labelMap, setLabelMap] = useState({}) // id → { x, y, text, style }

  // ── Camera sync ──────────────────────────────────────────────────────────

  const syncCamera = useCallback(() => {
    const e  = engineRef.current
    const el = mountRef.current
    if (!el || !e.camera) return
    const w = el.clientWidth  || 800
    const h = el.clientHeight || 600
    const { xMin, xMax, yMin, yMax } = e.vp
    const vpW = xMax - xMin, vpH = yMax - yMin
    const elAsp = w / h, vpAsp = vpW / vpH

    let L = xMin, R = xMax, B = yMin, T = yMax
    if (elAsp > vpAsp) {
      const newW = vpH * elAsp, cx = (xMin + xMax) / 2
      L = cx - newW / 2; R = cx + newW / 2
    } else {
      const newH = vpW / elAsp, cy = (yMin + yMax) / 2
      B = cy - newH / 2; T = cy + newH / 2
    }
    e.camera.left = L; e.camera.right = R
    e.camera.bottom = B; e.camera.top = T
    e.camera.updateProjectionMatrix()
    e.actualVp = { left: L, right: R, bottom: B, top: T }
    e.renderer?.setSize(w, h)
  }, [])

  // ── Init Three.js ────────────────────────────────────────────────────────

  useEffect(() => {
    const e  = engineRef.current
    const el = mountRef.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth || 800, el.clientHeight || 600)
    Object.assign(renderer.domElement.style, {
      display: 'block', position: 'absolute', inset: '0',
    })
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f0f1a)

    const { xMin, xMax, yMin, yMax } = e.vp
    const camera = new THREE.OrthographicCamera(xMin, xMax, yMax, yMin, -100, 100)
    camera.position.z = 10

    // Subtle axis lines
    const axisMat = new THREE.LineBasicMaterial({ color: 0x1e1e3a })
    for (const pts of [
      [new THREE.Vector3(-1000, 0, -1), new THREE.Vector3(1000, 0, -1)],
      [new THREE.Vector3(0, -1000, -1), new THREE.Vector3(0, 1000, -1)],
    ]) {
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), axisMat))
    }

    e.renderer = renderer
    e.scene    = scene
    e.camera   = camera
    e.ready    = true

    syncCamera()

    function loop() {
      e.rafId = requestAnimationFrame(loop)
      renderer.render(scene, camera)
    }
    loop()

    const ro = new ResizeObserver(syncCamera)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(e.rafId)
      ro.disconnect()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
      e.ready = false
    }
  }, [syncCamera])

  // ── Helpers ──────────────────────────────────────────────────────────────

  function removeObj(id) {
    const e   = engineRef.current
    const obj = e.objects.get(id)
    if (!obj) return
    e.scene?.remove(obj)
    disposeMesh(obj)
    e.objects.delete(id)
  }

  function toPage(wx, wy) {
    const e  = engineRef.current
    const el = mountRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    const { left, right, bottom, top } = e.actualVp
    return {
      x: rect.left + (wx - left)   / (right - left)   * rect.width,
      y: rect.top  + (1 - (wy - bottom) / (top - bottom)) * rect.height,
    }
  }

  // Math coords → CSS % string for label overlay
  function mathToCSS(mx, my) {
    const { left, right, bottom, top } = engineRef.current.actualVp
    return {
      left: `${(mx - left)   / (right - left)   * 100}%`,
      top:  `${(1 - (my - bottom) / (top - bottom)) * 100}%`,
    }
  }

  // ── Imperative API ───────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    isReady: () => engineRef.current.ready,

    // ── Viewport ────────────────────────────────────────────────────────────

    setViewport(xMin, xMax, yMin, yMax) {
      engineRef.current.vp = { xMin, xMax, yMin, yMax }
      syncCamera()
    },

    getViewport()      { return { ...engineRef.current.vp } },
    getViewportState() { return { ...engineRef.current.vp } },

    // ── Polygon ─────────────────────────────────────────────────────────────

    drawPolygon(id, vertices, style) {
      const e = engineRef.current
      if (!e.scene) return
      removeObj(id)
      const group = buildPolygonGroup(vertices, style)
      e.scene.add(group)
      e.objects.set(id, group)
    },

    updatePolygon(id, vertices) {
      const e = engineRef.current
      const g = e.objects.get(id)
      if (!g || g.userData.kind !== 'polygon') return
      const style    = g.userData.style
      const newGroup = buildPolygonGroup(vertices, style)
      e.scene.remove(g); disposeMesh(g)
      e.scene.add(newGroup)
      e.objects.set(id, newGroup)
    },

    animatePolygon(id, startVerts, endVerts, duration = 0.5) {
      return new Promise(resolve => {
        const e = engineRef.current
        const g = e.objects.get(id)
        if (!g) { resolve(); return }
        const style = g.userData.style
        const t0    = performance.now()
        const ease  = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t

        function tick() {
          const t = Math.min((performance.now() - t0) / (duration * 1000), 1)
          const p = ease(t)
          const v = startVerts.map(([x1, y1], i) => [
            x1 + (endVerts[i][0] - x1) * p,
            y1 + (endVerts[i][1] - y1) * p,
          ])
          const newG = buildPolygonGroup(v, style)
          e.scene.remove(g); disposeMesh(g)
          e.scene.add(newG)
          e.objects.set(id, newG)
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    setShapeStyle(id, stylePatch) {
      const e = engineRef.current
      const g = e.objects.get(id)
      if (!g) return
      const merged = { ...g.userData.style, ...stylePatch }
      const verts  = g.userData.vertices
      if (verts) {
        const newG = buildPolygonGroup(verts, merged)
        e.scene.remove(g); disposeMesh(g)
        e.scene.add(newG)
        e.objects.set(id, newG)
      }
    },

    removeShape(id) { removeObj(id) },

    // ── Circle ──────────────────────────────────────────────────────────────

    drawCircle(id, cx, cy, r, style) {
      const e = engineRef.current
      if (!e.scene) return
      removeObj(id)

      const fillGeo  = new THREE.CircleGeometry(r, 64)
      const fillMat  = new THREE.MeshBasicMaterial({
        color: mkColor(style.fill), opacity: style.fillOpacity ?? 0.2,
        transparent: true, side: THREE.DoubleSide,
      })
      const fill = new THREE.Mesh(fillGeo, fillMat)
      fill.position.set(cx, cy, 0)

      const outlinePts = Array.from({ length: 65 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2
        return new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), 0.01)
      })
      const outline = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(outlinePts),
        new THREE.LineBasicMaterial({ color: mkColor(style.stroke) }),
      )

      const group = new THREE.Group()
      group.add(fill); group.add(outline)
      group.userData = { kind: 'circle', style: { ...style }, cx, cy, r }
      e.scene.add(group)
      e.objects.set(id, group)
    },

    // ── Angle arc ───────────────────────────────────────────────────────────

    addAngleArc(id, cx, cy, r, startAngle, diff, style) {
      const e = engineRef.current
      if (!e.scene) return
      removeObj(id)

      const color = mkColor(style?.color ?? '#60a5fa')
      const geo   = new THREE.ShapeGeometry(buildSectorShape(cx, cy, 0.0001, startAngle, diff))
      const mat   = new THREE.MeshBasicMaterial({ color, opacity: 0.28, transparent: true, side: THREE.DoubleSide })
      const mesh  = new THREE.Mesh(geo, mat)

      const group = new THREE.Group()
      group.add(mesh)
      group.userData = { kind: 'arc', cx, cy, r, startAngle, diff, style }
      e.scene.add(group)
      e.objects.set(id, group)
    },

    animateAngleArc(id, duration = 0.35) {
      return new Promise(resolve => {
        const e = engineRef.current
        const g = e.objects.get(id)
        if (!g) { resolve(); return }
        const { cx, cy, r, startAngle, diff } = g.userData
        const mesh = g.children[0]
        const t0   = performance.now()

        function tick() {
          const t = Math.min((performance.now() - t0) / (duration * 1000), 1)
          const curR    = r * t
          const curDiff = diff * t
          mesh.geometry.dispose()
          mesh.geometry = new THREE.ShapeGeometry(buildSectorShape(cx, cy, curR, startAngle, curDiff))
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    // ── Circle perimeter trace ───────────────────────────────────────────────
    // A growing arc outline (not a filled sector, unlike addAngleArc) — used
    // to show "the perimeter" of a circle as an actual trip around it,
    // starting from wherever the radius line touches (same angle) and
    // sweeping the full 2π back to that point.

    addArcTrace(id, cx, cy, r, startAngle, style) {
      const e = engineRef.current
      if (!e.scene) return
      removeObj(id)

      const color = mkColor(style?.color ?? '#60a5fa')
      const pt    = new THREE.Vector3(cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle), 0.03)
      const geo   = new THREE.BufferGeometry().setFromPoints([pt, pt])
      const line  = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }))

      const group = new THREE.Group()
      group.add(line)
      group.userData = { kind: 'arc-trace', cx, cy, r, startAngle }
      e.scene.add(group)
      e.objects.set(id, group)
    },

    animateArcTrace(id, duration = 1.2) {
      return new Promise(resolve => {
        const e = engineRef.current
        const g = e.objects.get(id)
        if (!g) { resolve(); return }
        const { cx, cy, r, startAngle } = g.userData
        const line = g.children[0]
        const t0   = performance.now()
        const SEGS = 96

        function tick() {
          const t = Math.min((performance.now() - t0) / (duration * 1000), 1)
          const n = Math.max(1, Math.round(SEGS * t))
          const pts = []
          for (let i = 0; i <= n; i++) {
            const a = startAngle + (i / SEGS) * Math.PI * 2
            pts.push(new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), 0.03))
          }
          line.geometry.setFromPoints(pts)
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    // ── Edge highlight ───────────────────────────────────────────────────────

    addEdgeHighlight(id, x1, y1, x2, y2, style) {
      const e = engineRef.current
      if (!e.scene) return
      removeObj(id)

      const color  = mkColor(style?.color ?? '#60a5fa')
      const pts    = [new THREE.Vector3(x1, y1, 0.02), new THREE.Vector3(x1, y1, 0.02)]
      const geo    = new THREE.BufferGeometry().setFromPoints(pts)
      const dashed = !!style?.dashed
      const mat    = dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: style?.dashSize ?? 0.18, gapSize: style?.gapSize ?? 0.12 })
        : new THREE.LineBasicMaterial({ color })
      const line = new THREE.Line(geo, mat)
      if (dashed) line.computeLineDistances()

      const group = new THREE.Group()
      group.add(line)
      group.userData = { kind: 'edge-hl', x1, y1, x2, y2, style, dashed }
      e.scene.add(group)
      e.objects.set(id, group)
    },

    animateEdgeHighlight(id, duration = 0.4) {
      return new Promise(resolve => {
        const e = engineRef.current
        const g = e.objects.get(id)
        if (!g) { resolve(); return }
        const { x1, y1, x2, y2, dashed } = g.userData
        const line = g.children[0]
        const t0   = performance.now()
        const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t

        function tick() {
          const t  = Math.min((performance.now() - t0) / (duration * 1000), 1)
          const p  = ease(t)
          const cx = x1 + (x2 - x1) * p
          const cy = y1 + (y2 - y1) * p
          line.geometry.setFromPoints([
            new THREE.Vector3(x1, y1, 0.02),
            new THREE.Vector3(cx, cy, 0.02),
          ])
          if (dashed) line.computeLineDistances()   // recompute dash pattern as the line grows
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    // ── Arrow ────────────────────────────────────────────────────────────────

    addArrow(id, x1, y1, x2, y2, style) {
      const e = engineRef.current
      if (!e.scene) return
      removeObj(id)

      const color = mkColor(style?.color ?? '#60a5fa')
      const geo   = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, y1, 0.02), new THREE.Vector3(x1, y1, 0.02),
      ])
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }))

      const group = new THREE.Group()
      group.add(line)
      group.userData = { kind: 'arrow', x1, y1, x2, y2, style, color }
      e.scene.add(group)
      e.objects.set(id, group)
    },

    animateArrow(id, duration = 0.55) {
      return new Promise(resolve => {
        const e = engineRef.current
        const g = e.objects.get(id)
        if (!g) { resolve(); return }
        const { x1, y1, x2, y2 } = g.userData
        const line = g.children[0]
        const t0   = performance.now()
        const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t

        function tick() {
          const t  = Math.min((performance.now() - t0) / (duration * 1000), 1)
          const p  = ease(t)
          const cx = x1 + (x2 - x1) * p
          const cy = y1 + (y2 - y1) * p
          line.geometry.setFromPoints([
            new THREE.Vector3(x1, y1, 0.02),
            new THREE.Vector3(cx, cy, 0.02),
          ])
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    },

    shrinkRemoveShape(id, duration = 0.4) {
      return new Promise(resolve => {
        const e = engineRef.current
        const g = e.objects.get(id)
        if (!g) { resolve(); return }
        const { x1, y1, x2, y2 } = g.userData
        const line = g.children[0]
        const t0   = performance.now()
        const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t

        function tick() {
          const t  = Math.min((performance.now() - t0) / (duration * 1000), 1)
          const p  = ease(t)
          if (line && x1 !== undefined) {
            const cx = x2 + (x1 - x2) * p
            const cy = y2 + (y1 - y2) * p
            line.geometry.setFromPoints([
              new THREE.Vector3(cx, cy, 0.02),
              new THREE.Vector3(x2, y2, 0.02),
            ])
          }
          if (t >= 1) { removeObj(id); resolve() }
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    },

    // ── Labels (HTML overlay) ────────────────────────────────────────────────

    addLabel(id, x, y, text, style) {
      setLabelMap(prev => ({ ...prev, [id]: { x, y, text, style } }))
    },

    removeLabel(id) {
      setLabelMap(prev => { const n = { ...prev }; delete n[id]; return n })
    },

    setLabelColor(id, color) {
      setLabelMap(prev => {
        const lbl = prev[id]
        if (!lbl) return prev
        return { ...prev, [id]: { ...lbl, style: { ...(lbl.style ?? {}), color } } }
      })
    },

    // ── Scene ────────────────────────────────────────────────────────────────

    clearAll() {
      const e = engineRef.current
      for (const id of [...e.objects.keys()]) removeObj(id)
      setLabelMap({})
      e.vp = { xMin: -8, xMax: 8, yMin: -6, yMax: 6 }
      syncCamera()
    },

    // ── State save / restore ─────────────────────────────────────────────────

    getSvg() { return null },

    getShapesState() {
      const out = {}
      for (const [id, g] of engineRef.current.objects) out[id] = { ...g.userData }
      return out
    },

    restoreShapesState(savedShapes, savedVp) {
      const e = engineRef.current
      if (!e.scene) return
      for (const id of [...e.objects.keys()]) removeObj(id)
      if (savedVp) {
        e.vp = { xMin: savedVp.xMin, xMax: savedVp.xMax, yMin: savedVp.yMin, yMax: savedVp.yMax }
        syncCamera()
      }
      for (const [id, data] of Object.entries(savedShapes)) {
        if (data.kind === 'polygon' && data.vertices) {
          const g = buildPolygonGroup(data.vertices, data.style ?? {})
          e.scene.add(g); e.objects.set(id, g)
        } else if (data.kind === 'circle' && data.r !== undefined) {
          // Delegate to drawCircle via this ref — not easily accessible here;
          // just rebuild manually:
          const { cx, cy, r, style } = data
          const fillGeo = new THREE.CircleGeometry(r, 64)
          const fillMat = new THREE.MeshBasicMaterial({
            color: mkColor(style?.fill), opacity: style?.fillOpacity ?? 0.2,
            transparent: true, side: THREE.DoubleSide,
          })
          const fill  = new THREE.Mesh(fillGeo, fillMat)
          fill.position.set(cx ?? 0, cy ?? 0, 0)
          const g2 = new THREE.Group()
          g2.add(fill)
          g2.userData = { kind: 'circle', style, cx, cy, r }
          e.scene.add(g2); e.objects.set(id, g2)
        }
      }
    },

    // ── Page coords ──────────────────────────────────────────────────────────

    getEdgeSegments() {
      const segs = []
      for (const [, g] of engineRef.current.objects) {
        const verts = g.userData?.vertices
        if (!verts?.length) continue
        for (let i = 0; i < verts.length; i++) {
          const a = toPage(verts[i][0], verts[i][1])
          const b = toPage(verts[(i + 1) % verts.length][0], verts[(i + 1) % verts.length][1])
          segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
        }
      }
      return segs
    },

    getPageCoords(target) {
      const e = engineRef.current
      if (target.type === 'geo-vertex') {
        const g     = e.objects.get(target.shapeId)
        const verts = g?.userData?.vertices
        const v     = verts?.[target.vertexIndex]
        if (!v) return null
        return toPage(v[0], v[1])
      }
      if (target.type === 'geo-edge') {
        const g     = e.objects.get(target.shapeId)
        const verts = g?.userData?.vertices
        if (!verts) return null
        const i  = target.edgeIndex % verts.length
        const v1 = verts[i], v2 = verts[(i + 1) % verts.length]
        return toPage((v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2)
      }
      return null
    },
  }))

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div ref={mountRef} className="math-display-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
      {Object.entries(labelMap).map(([id, lbl]) => {
        const pos = mathToCSS(lbl.x, lbl.y)
        return (
          <div
            key={id}
            id={id}
            style={{
              position:    'absolute',
              left:        pos.left,
              top:         pos.top,
              transform:   'translate(-50%, -50%)',
              color:       lbl.style?.color ?? '#60a5fa',
              fontSize:    lbl.style?.fontSize ? `${lbl.style.fontSize}px` : '14px',
              fontFamily:  "'Fira Code','Cascadia Code',monospace",
              fontWeight:  '600',
              pointerEvents: 'none',
              zIndex:      4,
              whiteSpace:  'nowrap',
              userSelect:  'none',
              animation:   'geoLabelIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            {lbl.text}
          </div>
        )
      })}
    </div>
  )
})

export default GeometryDisplay
