import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const ORTHO_HALF = 6  // half-height in world units for 2D ortho view

const ThreeDisplay = forwardRef(function ThreeDisplay(_, ref) {
  const containerRef = useRef(null)
  const sceneRef     = useRef(null)
  const rendererRef  = useRef(null)
  const cameraRef    = useRef(null)   // active camera (switches by mode)
  const perspCamRef  = useRef(null)
  const orthoCamRef  = useRef(null)
  const controlsRef  = useRef(null)
  const is2DRef      = useRef(false)
  const orthoHalfRef = useRef(ORTHO_HALF)
  const orthoOffXRef = useRef(0)
  const orthoOffYRef = useRef(0)
  const axesGroupRef = useRef(null)
  const grid3DRef    = useRef(null)
  const grid2DRef    = useRef(null)
  const objectsRef   = useRef({})
  const labelsRef    = useRef(new Map())
  const overlayRef   = useRef(null)

  useImperativeHandle(ref, () => ({
    isReady: () => !!sceneRef.current,

    // ── Mode switch ───────────────────────────────────────────────────────────

    setDisplayMode(mode) {
      const want2D = mode === '2d'
      is2DRef.current = want2D
      const controls = controlsRef.current
      const axes     = axesGroupRef.current
      const g3d      = grid3DRef.current
      const g2d      = grid2DRef.current

      if (want2D) {
        // Reset ortho view to defaults on each mode switch
        orthoHalfRef.current = ORTHO_HALF
        orthoOffXRef.current = 0
        orthoOffYRef.current = 0
        cameraRef.current      = orthoCamRef.current
        if (controls) controls.enabled = false
        if (axes)     axes.visible     = false
        if (g3d)      g3d.visible      = false
        if (g2d)      g2d.visible      = true
      } else {
        cameraRef.current      = perspCamRef.current
        if (controls) controls.enabled = true
        if (axes)     axes.visible     = true
        if (g3d)      g3d.visible      = true
        if (g2d)      g2d.visible      = false
      }
    },

    // ── Objects ──────────────────────────────────────────────────────────────

    addObject(id, obj) {
      if (!sceneRef.current) return
      const prev = objectsRef.current[id]
      if (prev) {
        sceneRef.current.remove(prev)
        prev.traverse(c => {
          c.geometry?.dispose()
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
          else c.material?.dispose()
        })
      }
      sceneRef.current.add(obj)
      objectsRef.current[id] = obj
    },

    getObject(id) {
      return objectsRef.current[id] ?? null
    },

    removeObject(id) {
      const obj = objectsRef.current[id]
      if (!obj || !sceneRef.current) return
      sceneRef.current.remove(obj)
      obj.traverse(c => {
        c.geometry?.dispose()
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
        else c.material?.dispose()
      })
      delete objectsRef.current[id]
    },

    clearObjects() {
      for (const id of Object.keys(objectsRef.current)) {
        const obj = objectsRef.current[id]
        sceneRef.current?.remove(obj)
        obj.traverse(c => {
          c.geometry?.dispose()
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
          else c.material?.dispose()
        })
      }
      objectsRef.current = {}
    },

    // ── Labels (projected HTML overlay) ──────────────────────────────────────

    addLabel3D(id, x, y, z, text, style = {}) {
      const existing = labelsRef.current.get(id)
      if (existing) { existing.el.remove(); labelsRef.current.delete(id) }

      const color = style.color ?? '#a855f7'
      const el = document.createElement('div')
      el.textContent = text
      Object.assign(el.style, {
        position:      'absolute',
        top:           '0',
        left:          '0',
        color,
        opacity:       style.fadeIn ? '0' : '1',
        fontSize:      style.fontSize ? `${style.fontSize}px` : '13px',
        fontFamily:    "'Fira Code','Cascadia Code',monospace",
        fontWeight:    style.bold     ? '700' : '600',
        pointerEvents: 'none',
        whiteSpace:    'nowrap',
        userSelect:    'none',
        zIndex:        '4',
        textShadow:    '0 1px 3px rgba(0,0,0,0.8)',
        transition:    'color 0.25s',
      })
      overlayRef.current?.appendChild(el)
      labelsRef.current.set(id, {
        el,
        defaultColor: color,
        worldPos:  new THREE.Vector3(x, y, z),
        fadeStart: style.fadeIn ? performance.now() : null,
        fadeDur:   style.fadeIn ?? 0,
      })
    },

    getLabel3D(id) {
      return labelsRef.current.get(id) ?? null
    },

    removeLabel3D(id) {
      const lbl = labelsRef.current.get(id)
      if (!lbl) return
      lbl.el.remove()
      labelsRef.current.delete(id)
    },

    // Start a smooth JS-driven fade-out for a label (durationMs). Does not remove it.
    fadeOutLabel3D(id, durationMs = 200) {
      const lbl = labelsRef.current.get(id)
      if (!lbl) return
      lbl.fadeOutStart = performance.now()
      lbl.fadeOutDur   = durationMs
    },

    clearLabels3D() {
      for (const [, lbl] of labelsRef.current) lbl.el.remove()
      labelsRef.current.clear()
    },

    // Shift worldPos of every label whose id starts with `prefix` by (dx, dy)
    offsetLabels(prefix, dx, dy) {
      for (const [id, lbl] of labelsRef.current) {
        if (id.startsWith(prefix)) {
          lbl.worldPos.x += dx
          lbl.worldPos.y += dy
        }
      }
    },

    getPixelsPerUnit() {
      const el = containerRef.current
      const h  = el?.clientHeight || 600
      return h / (2 * orthoHalfRef.current)
    },

    getContainerRect() {
      return containerRef.current?.getBoundingClientRect() ?? null
    },

    setLabelColor(id, color) {
      const lbl = labelsRef.current.get(id)
      if (!lbl) return
      lbl.el.style.color = color
    },

    resetLabelColor(id) {
      const lbl = labelsRef.current.get(id)
      if (!lbl) return
      lbl.el.style.color = lbl.defaultColor
    },

    adjustView3D({ zoom = null, panX = 0, panY = 0, distance = null, duration = 0.3 } = {}) {
      const el   = containerRef.current
      const asp  = el ? el.clientWidth / (el.clientHeight || 1) : 1.33
      const ease = t => t < 0.5 ? 2*t*t : -1 + (4-2*t)*t
      const dur  = duration * 1000

      if (is2DRef.current) {
        const ortho = orthoCamRef.current
        if (!ortho) return
        // Read from the actual camera frustum (not the ref) so that if setDisplayMode
        // reset the ref without updating the frustum, we start from the true visual state.
        const fromH = (ortho.top - ortho.bottom) / 2 || orthoHalfRef.current
        const fromX = (ortho.right + ortho.left) / 2
        const fromY = (ortho.top + ortho.bottom) / 2
        const toH   = zoom != null ? ORTHO_HALF / zoom : fromH
        const toX   = fromX + (panX ?? 0)
        const toY   = fromY + (panY ?? 0)
        const t0    = performance.now()
        const tick  = () => {
          const p = ease(Math.min((performance.now() - t0) / dur, 1))
          const h = fromH + (toH - fromH) * p
          const x = fromX + (toX - fromX) * p
          const y = fromY + (toY - fromY) * p
          orthoHalfRef.current = h
          orthoOffXRef.current = x
          orthoOffYRef.current = y
          ortho.left   = x - h * asp;  ortho.right  = x + h * asp
          ortho.top    = y + h;         ortho.bottom = y - h
          ortho.updateProjectionMatrix()
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      } else {
        const persp = perspCamRef.current
        if (!persp) return
        const pos      = persp.position
        const fromDist = pos.length() || 1
        const toDist   = distance ?? (zoom != null ? fromDist / zoom : fromDist)
        const dir      = pos.clone().normalize()
        const t0       = performance.now()
        const tick     = () => {
          const p = ease(Math.min((performance.now() - t0) / dur, 1))
          const d = fromDist + (toDist - fromDist) * p
          pos.copy(dir.clone().multiplyScalar(d))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    },

    // Convert a world-space (wx, wy) coordinate to page (viewport) pixel coordinates
    getWorldToScreen(wx, wy) {
      const cam = cameraRef.current
      const el  = containerRef.current
      if (!cam || !el) return null
      cam.updateMatrixWorld()
      const v = new THREE.Vector3(wx, wy, 0).project(cam)
      const W = el.clientWidth  || 800
      const H = el.clientHeight || 600
      const rect = el.getBoundingClientRect()
      return {
        x: rect.left + (v.x + 1) / 2 * W,
        y: rect.top  + (-v.y + 1) / 2 * H,
      }
    },
  }))

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f0f1a)
    sceneRef.current = scene

    const w = el.clientWidth  || 800
    const h = el.clientHeight || 600
    const aspect = w / h

    // ── Perspective camera (3D mode) ─────────────────────────────────────────
    const perspCam = new THREE.PerspectiveCamera(45, aspect, 0.1, 200)
    perspCam.position.set(5, 4, 6)
    perspCamRef.current = perspCam
    cameraRef.current   = perspCam  // default is 3D

    // ── Orthographic camera (2D mode) — front view of XY plane ──────────────
    const orthoCam = new THREE.OrthographicCamera(
      -ORTHO_HALF * aspect, ORTHO_HALF * aspect,
       ORTHO_HALF,         -ORTHO_HALF,
      0.1, 200,
    )
    orthoCam.position.set(0, 0, 10)
    orthoCam.lookAt(0, 0, 0)
    orthoCamRef.current = orthoCam

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    // false = don't let Three.js write canvas style.width/height (prevents layout reflows)
    renderer.setSize(w, h, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    // Canvas fills container via CSS only — never via inline style
    Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' })
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const sun = new THREE.DirectionalLight(0xffffff, 0.9)
    sun.position.set(6, 10, 6)
    sun.castShadow = true
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x6688cc, 0.35)
    fill.position.set(-5, 2, -4)
    scene.add(fill)

    // ── 3D grid (XZ plane) — 200×200 so it always fills the frustum ────────
    const grid3D = new THREE.GridHelper(200, 200, 0x2a2a4a, 0x1e1e36)
    grid3D.position.y = -0.01
    scene.add(grid3D)
    grid3DRef.current = grid3D

    // ── 2D grid (XY plane) — 200×200 so it always fills the ortho frustum ──
    const grid2D = new THREE.GridHelper(200, 200, 0x2a2a4a, 0x1e1e36)
    grid2D.rotation.x = Math.PI / 2   // lay flat → now stands in XY plane
    grid2D.position.z = -0.1          // slightly behind shapes
    grid2D.visible = false
    scene.add(grid2D)
    grid2DRef.current = grid2D

    // ── Axes (3D mode only) ───────────────────────────────────────────────────
    const axesGroup = new THREE.Group()
    const axMat = (c) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.45 })
    const axLine = (from, to, mat) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...from), new THREE.Vector3(...to),
      ])
      axesGroup.add(new THREE.Line(geo, mat))
    }
    axLine([0,0,0],[3,0,0], axMat(0xff4444))
    axLine([0,0,0],[0,3,0], axMat(0x44ff44))
    axLine([0,0,0],[0,0,3], axMat(0x4488ff))
    scene.add(axesGroup)
    axesGroupRef.current = axesGroup

    // ── OrbitControls (3D mode only) ─────────────────────────────────────────
    const controls = new OrbitControls(perspCam, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = 0.06
    controls.autoRotate      = true
    controls.autoRotateSpeed = 0.8
    controls.enableZoom      = false
    controls.enablePan       = false
    controlsRef.current = controls

    renderer.domElement.addEventListener('pointerdown', () => {
      controls.autoRotate = false
    }, { once: true })

    // ── Animation loop ───────────────────────────────────────────────────────
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      if (!is2DRef.current) controls.update()
      const cam = cameraRef.current
      renderer.render(scene, cam)

      // Project labels onto screen
      const W = el.clientWidth  || 800
      const H = el.clientHeight || 600
      const nowMs = performance.now()
      for (const [, lbl] of labelsRef.current) {
        const v = lbl.worldPos.clone().project(cam)
        const x = (v.x + 1) / 2 * W
        const y = (-v.y + 1) / 2 * H
        lbl.el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
        let opacity = v.z > 1 ? 0 : 1
        if (lbl.fadeOutStart !== undefined) {
          opacity *= Math.max(0, 1 - (nowMs - lbl.fadeOutStart) / lbl.fadeOutDur)
        } else if (lbl.fadeStart && lbl.fadeDur) {
          opacity *= Math.min((nowMs - lbl.fadeStart) / lbl.fadeDur, 1)
        }
        lbl.el.style.opacity = opacity
      }
    }
    animate()

    // ── Resize handler ───────────────────────────────────────────────────────
    const resize = () => {
      const nw = el.clientWidth, nh = el.clientHeight
      if (!nw || !nh) return
      const asp = nw / nh

      perspCam.aspect = asp
      perspCam.updateProjectionMatrix()

      const h = orthoHalfRef.current
      const ox = orthoOffXRef.current, oy = orthoOffYRef.current
      orthoCam.left   = ox - h * asp;  orthoCam.right  = ox + h * asp
      orthoCam.top    = oy + h;         orthoCam.bottom = oy - h
      orthoCam.updateProjectionMatrix()

      renderer.setSize(nw, nh, false)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
      sceneRef.current    = null
      rendererRef.current = null
      cameraRef.current   = null
      perspCamRef.current = null
      orthoCamRef.current = null
      controlsRef.current = null
      objectsRef.current  = {}
      for (const [, lbl] of labelsRef.current) lbl.el.remove()
      labelsRef.current.clear()
    }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0f0f1a' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div ref={overlayRef} style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none', overflow: 'hidden',
      }} />
    </div>
  )
})

export default ThreeDisplay
