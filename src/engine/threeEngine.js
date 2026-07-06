/**
 * Three.js Engine — drives ThreeDisplay (WebGL canvas).
 * Handles both 3D volumetric shapes and 2D flat shapes.
 */

import * as THREE from 'three'

const registry = new Map()  // id → { type, isFlat, vertices, a, b, c, opts }

// ── Color helpers ─────────────────────────────────────────────────────────────

const COLOR_NAMES = {
  blue:   0x6495ed, red:    0xf87171, green:  0x4ade80,
  yellow: 0xfbbf24, purple: 0xa855f7, orange: 0xfb923c,
  cyan:   0x22d3ee, pink:   0xf472b6, white:  0xe2e8f0,
  teal:   0x2dd4bf, lime:   0xa3e635, rose:   0xfb7185,
  black:  0x1e1e2e, gray:   0x94a3b8,
}

function resolveHex(color) {
  if (!color) return 0x6495ed
  if (typeof color === 'number') return color
  const s = String(color).trim().toLowerCase()
  if (COLOR_NAMES[s] !== undefined) return COLOR_NAMES[s]
  if (s.startsWith('#')) return parseInt(s.slice(1), 16)
  return 0x6495ed
}

// ── Flat (2D) shape vertex calculation ────────────────────────────────────────

const FLAT_TYPES = new Set([
  'circle', 'triangle', 'right-triangle', 'rectangle', 'square',
  'parallelogram', 'trapeze', 'pentagon', 'hexagon', 'octagon', 'regular-polygon', 'line',
])

const r4 = n => Math.round(n * 10000) / 10000

function centerVertices(verts) {
  const xs = verts.map(v => v[0])
  const ys = verts.map(v => v[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  return verts.map(([x, y]) => [r4(x - cx), r4(y - cy)])
}

function calcFlatVertices(type, values) {
  switch (type) {
    case 'triangle': {
      let [a, b, c] = values
      // Fill in missing sides — default to equilateral if only one side given
      if (!b && !c) { b = a; c = a }
      else if (!c)  { c = a }
      const cosA = (a*a + c*c - b*b) / (2*a*c)
      if (cosA < -1 || cosA > 1) throw new Error(`Invalid triangle sides ${a},${b},${c}`)
      return [[0,0],[a,0],[c*cosA, c*Math.sqrt(1 - cosA*cosA)]]
    }
    case 'right-triangle': {
      const [a, b = a * 0.75] = values
      return [[0,0],[a,0],[a,b]]
    }
    case 'rectangle': {
      const [w, h = w * 0.6] = values
      return [[0,0],[w,0],[w,h],[0,h]]
    }
    case 'square': {
      const s = values[0]
      return [[0,0],[s,0],[s,s],[0,s]]
    }
    case 'parallelogram': {
      const [w, h = w * 0.7, dx = w * 0.25] = values
      return [[0,0],[w,0],[w+dx,h],[dx,h]]
    }
    case 'trapeze': {
      const [a, b = a * 1.5, h = a * 0.7] = values
      const offset = (b - a) / 2
      return [[0,0],[b,0],[b-offset,h],[offset,h]]
    }
    case 'pentagon':
    case 'hexagon':
    case 'octagon':
    case 'regular-polygon': {
      const n = type === 'regular-polygon' ? Math.round(values[0])
              : type === 'pentagon' ? 5
              : type === 'hexagon'  ? 6 : 8
      const s = type === 'regular-polygon' ? values[1] : values[0]
      const R = s / (2 * Math.sin(Math.PI / n))
      return Array.from({ length: n }, (_, i) => {
        const a = (2 * Math.PI * i / n) - Math.PI / 2
        return [R * Math.cos(a), R * Math.sin(a)]
      })
    }
    case 'line': {
      const len = values[0] ?? 4
      return [[0, 0], [len, 0]]
    }
    default:
      throw new Error(`Unknown flat shape: "${type}"`)
  }
}

// ── 3D volumetric geometry ────────────────────────────────────────────────────

function buildVolumetricGeometry(type, a, b, c) {
  switch (type) {
    case 'cube':
      return new THREE.BoxGeometry(a ?? 2, a ?? 2, a ?? 2)
    case 'prism':
    case 'box':
    case 'rectangular-prism':
      return new THREE.BoxGeometry(a ?? 3, b ?? 2, c ?? 1.5)
    case 'sphere':
      return new THREE.SphereGeometry(a ?? 1.5, 40, 30)
    case 'cone':
      return new THREE.ConeGeometry(a ?? 1.2, b ?? 2.5, 40)
    case 'cylinder':
      return new THREE.CylinderGeometry(a ?? 1, a ?? 1, b ?? 2.5, 40)
    case 'pyramid':
    case 'square-pyramid':
      return new THREE.ConeGeometry((a ?? 2) * Math.SQRT2 / 2, b ?? 2.5, 4)
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(a ?? 1.8)
    case 'octahedron':
      return new THREE.OctahedronGeometry(a ?? 1.6)
    case 'torus':
      return new THREE.TorusGeometry(a ?? 1.5, b ?? 0.4, 20, 80)
    default:
      throw new Error(`Unknown 3D shape: "${type}"`)
  }
}

function buildVolumetricGroup(geometry, hexColor, opacity = 0.82) {
  const group = new THREE.Group()
  const mat = new THREE.MeshPhongMaterial({
    color:       hexColor,
    emissive:    new THREE.Color(hexColor).multiplyScalar(0.08),
    shininess:   55,
    transparent: true,
    opacity,
    side:        THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, mat)
  mesh.castShadow    = true
  mesh.receiveShadow = true
  group.add(mesh)
  const edgesGeo = new THREE.EdgesGeometry(geometry, 12)
  const edgesMat = new THREE.LineBasicMaterial({
    color:       new THREE.Color(hexColor).lerp(new THREE.Color(0xffffff), 0.6),
    transparent: true,
    opacity:     0.7,
  })
  group.add(new THREE.LineSegments(edgesGeo, edgesMat))
  return group
}

// ── Flat (2D) shape builder ───────────────────────────────────────────────────

function buildFlatGroup(type, values, hexColor, opts = {}) {
  const fillOpacity = opts.fillOpacity ?? 0.3
  const group = new THREE.Group()

  if (type === 'circle') {
    const r = values[0] ?? 2
    const fillGeo = new THREE.CircleGeometry(r, 64)
    const fillMat = new THREE.MeshBasicMaterial({
      color: hexColor, opacity: fillOpacity, transparent: true, side: THREE.DoubleSide,
    })
    group.add(new THREE.Mesh(fillGeo, fillMat))
    const pts = Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2
      return new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0.01)
    })
    const outlineColor = new THREE.Color(hexColor).lerp(new THREE.Color(0xffffff), 0.55)
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: outlineColor }),
    ))
    group.userData = { isFlat: true, type, values, isCircle: true, radius: r }
    return group
  }

  if (type === 'line') {
    const verts = centerVertices(calcFlatVertices(type, values))
    const [x1, y1] = verts[0], [x2, y2] = verts[1]
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx*dx + dy*dy) || 1
    const ang = Math.atan2(dy, dx)
    const halfT = 0.05

    const quadGeo = new THREE.BufferGeometry()
    quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0,   halfT, 0.01,
      0,  -halfT, 0.01,
      len, halfT, 0.01,
      len,-halfT, 0.01,
    ], 3))
    quadGeo.setIndex([0, 1, 2, 1, 3, 2])
    const lineGroup = new THREE.Group()
    lineGroup.position.set(x1, y1, 0)
    lineGroup.rotation.z = ang
    lineGroup.add(new THREE.Mesh(quadGeo, new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide })))
    group.add(lineGroup)

    // Small endpoint dots for clarity
    const dotGeo = new THREE.CircleGeometry(0.08, 16)
    const dotMat = new THREE.MeshBasicMaterial({ color: hexColor })
    for (const [ex, ey] of verts) {
      const dot = new THREE.Mesh(dotGeo.clone(), dotMat.clone())
      dot.position.set(ex, ey, 0.01)
      group.add(dot)
    }

    group.userData = { isFlat: true, type, values, vertices: verts }
    return group
  }

  const verts = centerVertices(calcFlatVertices(type, values))
  const shape  = new THREE.Shape()
  shape.moveTo(verts[0][0], verts[0][1])
  for (let i = 1; i < verts.length; i++) shape.lineTo(verts[i][0], verts[i][1])
  shape.closePath()

  const fillGeo = new THREE.ShapeGeometry(shape)
  const fillMat = new THREE.MeshBasicMaterial({
    color: hexColor, opacity: fillOpacity, transparent: true, side: THREE.DoubleSide,
  })
  group.add(new THREE.Mesh(fillGeo, fillMat))

  const outlinePts = [...verts, verts[0]].map(([x, y]) => new THREE.Vector3(x, y, 0.01))
  const outlineColor = new THREE.Color(hexColor).lerp(new THREE.Color(0xffffff), 0.55)
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(outlinePts),
    new THREE.LineBasicMaterial({ color: outlineColor }),
  ))

  group.userData = { isFlat: true, type, values, vertices: verts }
  return group
}

// Build a flat group directly from pre-computed vertices (used after baking transforms)
function buildFlatGroupFromVerts(verts, hexColor, opts = {}) {
  const fillOpacity = opts.fillOpacity ?? 0.3
  const group = new THREE.Group()

  const shape = new THREE.Shape()
  shape.moveTo(verts[0][0], verts[0][1])
  for (let i = 1; i < verts.length; i++) shape.lineTo(verts[i][0], verts[i][1])
  shape.closePath()

  group.add(new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color: hexColor, opacity: fillOpacity, transparent: true, side: THREE.DoubleSide }),
  ))

  const outlineColor = new THREE.Color(hexColor).lerp(new THREE.Color(0xffffff), 0.55)
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([...verts, verts[0]].map(([x, y]) => new THREE.Vector3(x, y, 0.01))),
    new THREE.LineBasicMaterial({ color: outlineColor }),
  ))

  group.userData = { isFlat: true, vertices: verts }
  return group
}

// ── Child-object helpers (objects parented to a shape group) ──────────────────

function addChildToGroup(display, parentId, childId, childObj) {
  const parent = display.getObject(parentId)
  if (!parent) return
  if (!parent.userData.children) parent.userData.children = {}
  const prev = parent.userData.children[childId]
  if (prev) {
    prev.traverse(c => {
      c.geometry?.dispose()
      if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
      else c.material?.dispose()
    })
    parent.remove(prev)
  }
  parent.add(childObj)
  parent.userData.children[childId] = childObj
}

function removeChildFromGroup(display, parentId, childId) {
  const parent = display.getObject(parentId)
  if (!parent?.userData.children) return
  const child = parent.userData.children[childId]
  if (!child) return
  child.traverse(c => {
    c.geometry?.dispose()
    if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
    else c.material?.dispose()
  })
  parent.remove(child)
  delete parent.userData.children[childId]
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createShape3D(threeRef, id, type, a, b, c, opts = {}) {
  const display = threeRef?.current
  if (!display?.isReady()) return

  const hexColor = resolveHex(opts.color ?? 'blue')
  const values   = [a, b, c].filter(v => v != null && v !== '')

  let group
  if (FLAT_TYPES.has(type)) {
    display.setDisplayMode('2d')
    group = buildFlatGroup(type, values, hexColor, opts)
    registry.set(id, {
      type, isFlat: true,
      vertices: group.userData.vertices ?? null,
      isCircle: !!group.userData.isCircle,
      radius:   group.userData.radius ?? null,
      values, opts,
      edgeColors: {},
    })
  } else {
    display.setDisplayMode('3d')
    const geo = buildVolumetricGeometry(type, a, b, c)
    group = buildVolumetricGroup(geo, hexColor, opts.opacity ?? 0.82)
    registry.set(id, { type, isFlat: false, a, b, c, opts })
  }

  display.addObject(id, group)
}

export function removeShape3D(threeRef, id) {
  // Child objects (highlights, angle arcs) are parented to the shape group
  // and are disposed automatically when the parent group is removed.
  threeRef?.current?.removeObject(id)
  // Labels are tracked separately — remove them explicitly
  const display = threeRef?.current
  if (display) {
    for (let i = 0; i < 20; i++) display.removeLabel3D(`sl_${id}_${i}`)
    for (let i = 0; i < 20; i++) display.removeLabel3D(`cmt_${id}_${i}`)
    display.removeLabel3D(`tx_${id}`)
  }
  registry.delete(id)
}

export function clearAll3D(threeRef) {
  const display = threeRef?.current
  display?.clearObjects()
  display?.clearLabels3D()
  registry.clear()
  // Mode is NOT reset here — caller presets it before the render gap
}

export function getShape3DIDs() {
  return [...registry.keys()]
}

// ── Operations ────────────────────────────────────────────────────────────────

export function moveShape3D(threeRef, id, dx, dy, dz = 0, duration = 0.5) {
  const display = threeRef?.current
  const group   = display?.getObject(id)
  if (!group) return Promise.resolve()

  const startX = group.position.x, startY = group.position.y, startZ = group.position.z
  const endX   = startX + (dx ?? 0)
  const endY   = startY + (dy ?? 0)
  const endZ   = startZ + (dz ?? 0)

  const sideLabelPrefix = `sl_${id}_`
  const cmtLabelPrefix  = `cmt_${id}_`

  return new Promise(resolve => {
    const t0   = performance.now()
    const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
    let prevP  = 0
    function tick() {
      const t = Math.min((performance.now() - t0) / (duration * 1000), 1)
      const p = ease(t)
      group.position.set(
        startX + (endX - startX) * p,
        startY + (endY - startY) * p,
        startZ + (endZ - startZ) * p,
      )
      // Shift HTML side-labels and comment labels by the same incremental delta
      const frameDx = (p - prevP) * (endX - startX)
      const frameDy = (p - prevP) * (endY - startY)
      display.offsetLabels(sideLabelPrefix, frameDx, frameDy)
      display.offsetLabels(cmtLabelPrefix, frameDx, frameDy)
      prevP = p
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

export function flipShape2D(threeRef, id) {
  const display = threeRef?.current
  const group   = display?.getObject(id)
  if (!group) return Promise.resolve()

  const origScaleX = group.scale.x

  return new Promise(resolve => {
    const t0  = performance.now()
    const dur = 320
    function tick() {
      const t = Math.min((performance.now() - t0) / dur, 1)
      const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
      // squish through 0 then expand on the other side
      group.scale.x = origScaleX * (1 - 2 * e)
      if (t < 1) { requestAnimationFrame(tick); return }

      // Bake: negate X in vertices and rebuild so all subsequent ops use correct coords
      const entry = registry.get(id)
      if (entry?.vertices) {
        entry.vertices = entry.vertices.map(([x, y]) => [r4(-x), y])
        const hexColor = resolveHex(entry.opts?.color ?? 'blue')
        const savedPos = group.position.clone()
        const newGroup = buildFlatGroupFromVerts(entry.vertices, hexColor, entry.opts)
        newGroup.position.copy(savedPos)
        display.addObject(id, newGroup)
      } else {
        group.scale.x = -origScaleX
      }
      resolve()
    }
    requestAnimationFrame(tick)
  })
}

export function rotateShape2D(threeRef, id, degrees = 90) {
  const display = threeRef?.current
  const group   = display?.getObject(id)
  if (!group) return Promise.resolve()

  const startRot = group.rotation.z
  const rad      = (degrees * Math.PI) / 180
  const targetRot = startRot + rad

  return new Promise(resolve => {
    const t0  = performance.now()
    const dur = 380
    function tick() {
      const t = Math.min((performance.now() - t0) / dur, 1)
      const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
      group.rotation.z = startRot + rad * e
      if (t < 1) { requestAnimationFrame(tick); return }

      group.rotation.z = targetRot
      // Bake: rotate vertices so labelSides / highlightEdge use correct positions
      const entry = registry.get(id)
      if (entry?.vertices) {
        const cos = Math.cos(rad), sin = Math.sin(rad)
        entry.vertices = entry.vertices.map(([x, y]) => [
          r4(x * cos - y * sin),
          r4(x * sin + y * cos),
        ])
        const hexColor = resolveHex(entry.opts?.color ?? 'blue')
        const savedPos = group.position.clone()
        const newGroup = buildFlatGroupFromVerts(entry.vertices, hexColor, entry.opts)
        newGroup.position.copy(savedPos)
        display.addObject(id, newGroup)
      }
      resolve()
    }
    requestAnimationFrame(tick)
  })
}

export function highlightShape3D(threeRef, id) {
  const display = threeRef?.current
  const group   = display?.getObject(id)
  if (!group) return Promise.resolve()

  const mesh = group.children.find(c => c instanceof THREE.Mesh)
  if (!mesh) return Promise.resolve()

  const origOpacity = mesh.material.opacity ?? 0.3
  const origScaleX  = group.scale.x
  const origScaleY  = group.scale.y

  return new Promise(resolve => {
    const t0 = performance.now()
    const dur = 550
    function tick() {
      const t = Math.min((performance.now() - t0) / dur, 1)
      // sin arc: peaks at t=0.4, back to 1 by t=1
      const s = Math.sin(t * Math.PI)
      const scale = 1 + 0.18 * s
      group.scale.set(origScaleX * scale, origScaleY * scale, 1)
      mesh.material.opacity = origOpacity + (0.72 - origOpacity) * s
      if (t < 1) requestAnimationFrame(tick)
      else {
        group.scale.set(origScaleX, origScaleY, 1)
        mesh.material.opacity = origOpacity
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })
}

export async function labelSides3D(threeRef, id, customLabels = []) {
  const display = threeRef?.current
  if (!display) return

  const entry = registry.get(id)
  if (!entry?.vertices?.length) return

  const verts = entry.vertices
  const n     = verts.length

  // Resolve new custom label for each slot (sparse merge: empty incoming → keep stored)
  const newCustoms = []
  for (let i = 0; i < n; i++) {
    const incoming = customLabels[i] !== undefined ? String(customLabels[i]).trim() : ''
    const stored   = entry.storedLabels?.[i] ?? ''
    newCustoms.push(incoming !== '' ? incoming : stored)
  }

  // Which slots need updating: no existing label, or custom text changed
  const needsUpdate = newCustoms.map((nc, i) => {
    const hasLabel = !!display.getLabel3D?.(`sl_${id}_${i}`)
    return !hasLabel || nc !== (entry.storedLabels?.[i] ?? '')
  })

  if (!needsUpdate.some(Boolean)) return

  // Fade out only the changing slots that already have a label
  const fadeOutDur = 180
  let anyFaded = false
  for (let i = 0; i < n; i++) {
    if (needsUpdate[i] && display.getLabel3D?.(`sl_${id}_${i}`)) {
      display.fadeOutLabel3D?.(`sl_${id}_${i}`, fadeOutDur)
      anyFaded = true
    }
  }
  if (anyFaded) await new Promise(r => setTimeout(r, fadeOutDur + 20))
  for (let i = 0; i < n; i++) {
    if (needsUpdate[i]) display.removeLabel3D(`sl_${id}_${i}`)
  }

  // Average edge length — drives font size and offset so labels always look proportional
  let avgEdge = 0
  for (let i = 0; i < n; i++) {
    const [ax, ay] = verts[i], [bx, by] = verts[(i+1)%n]
    avgEdge += Math.sqrt((bx-ax)**2 + (by-ay)**2)
  }
  avgEdge /= n

  const ppu   = display.getPixelsPerUnit?.() ?? 50
  const group = display.getObject(id)
  const gx    = group?.position.x ?? 0
  const gy    = group?.position.y ?? 0

  for (let i = 0; i < n; i++) {
    if (!needsUpdate[i]) continue   // leave unchanged labels untouched

    const [x1, y1] = verts[i]
    const [x2, y2] = verts[(i + 1) % n]

    const lx = (x1 + x2) / 2
    const ly = (y1 + y2) / 2

    const edgeDx = x2 - x1, edgeDy = y2 - y1
    const eLen   = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1
    const nx = -edgeDy / eLen
    const ny =  edgeDx / eLen

    const [ox, oy] = verts[(i + 2) % n]
    const cross = edgeDx * (oy - ly) - edgeDy * (ox - lx)
    const sign   = cross > 0 ? -1 : 1
    const offset = avgEdge * 0.14

    const custom = newCustoms[i]
    const len    = parseFloat(Math.sqrt((x2-x1)**2 + (y2-y1)**2).toFixed(2))
    const text   = custom === ''
      ? String(len)
      : custom.endsWith('=')
        ? `${custom.slice(0, -1).trim()} = ${len}`
        : custom

    const edgeColor = entry.edgeColors?.[i] ?? '#a5b4fc'
    const fontSize  = Math.round(Math.max(14, Math.min(36, avgEdge * ppu * 0.16)))

    display.addLabel3D(
      `sl_${id}_${i}`,
      lx + gx + sign * nx * offset,
      ly + gy + sign * ny * offset,
      0.05,
      text,
      { color: edgeColor, fontSize, fadeIn: 400 },
    )

    if (!entry.storedLabels) entry.storedLabels = []
    entry.storedLabels[i] = custom
  }
  return new Promise(resolve => setTimeout(resolve, 440))
}

export function showAngles3D(threeRef, id, colorRaw) {
  const display = threeRef?.current
  if (!display?.isReady()) return Promise.resolve()

  const entry = registry.get(id)
  if (!entry?.vertices?.length) return Promise.resolve()

  const verts = entry.vertices
  const n     = verts.length
  const color = resolveHex(colorRaw ?? 'blue')

  // Average edge length → arc radius
  let avgEdge = 0
  for (let i = 0; i < n; i++) {
    const [x1,y1] = verts[i], [x2,y2] = verts[(i+1)%n]
    avgEdge += Math.sqrt((x2-x1)**2+(y2-y1)**2)
  }
  avgEdge /= n
  const arcR = Math.max(avgEdge * 0.17, 0.15)

  // Remove existing angle arcs (parented to shape group)
  for (let i = 0; i < 20; i++) removeChildFromGroup(display, id, `ang_${id}_${i}`)

  const growDur = 300   // ms: arc sweeps open
  const stagger = 60    // ms: delay between each vertex arc

  return new Promise(resolve => {
  let doneCount = 0

  for (let i = 0; i < n; i++) {
    const [px, py] = verts[(i + n - 1) % n]
    const [cx, cy] = verts[i]
    const [nx2, ny2] = verts[(i + 1) % n]

    const angle1 = Math.atan2(py - cy, px - cx)
    const angle2 = Math.atan2(ny2 - cy, nx2 - cx)
    let diff = angle2 - angle1
    while (diff > Math.PI)  diff -= 2 * Math.PI
    while (diff <= -Math.PI) diff += 2 * Math.PI

    const is90 = Math.abs(Math.abs(diff) - Math.PI / 2) < 0.052

    let arcGeo
    if (is90) {
      // Right-angle marker: small square in the corner
      const u1x = Math.cos(angle1), u1y = Math.sin(angle1)
      const u2x = Math.cos(angle2), u2y = Math.sin(angle2)
      const sq = new THREE.Shape()
      sq.moveTo(0, 0)
      sq.lineTo(arcR * u1x, arcR * u1y)
      sq.lineTo(arcR * u1x + arcR * u2x, arcR * u1y + arcR * u2y)
      sq.lineTo(arcR * u2x, arcR * u2y)
      sq.closePath()
      arcGeo = new THREE.ShapeGeometry(sq)
    } else {
      const steps = Math.max(3, Math.round(Math.abs(diff) / Math.PI * 24))
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      for (let s = 0; s <= steps; s++) {
        const a = angle1 + diff * (s / steps)
        shape.lineTo(arcR * Math.cos(a), arcR * Math.sin(a))
      }
      shape.closePath()
      arcGeo = new THREE.ShapeGeometry(shape)
    }
    const arcMat = new THREE.MeshBasicMaterial({
      color, opacity: 0, transparent: true, side: THREE.DoubleSide,
    })
    const arcGroup = new THREE.Group()
    arcGroup.position.set(cx, cy, 0.02)
    arcGroup.scale.set(0, 0, 1)
    arcGroup.add(new THREE.Mesh(arcGeo, arcMat))
    addChildToGroup(display, id, `ang_${id}_${i}`, arcGroup)

    const startAt = performance.now() + i * stagger
    const ease    = t => t < 0.5 ? 2*t*t : -1 + (4-2*t)*t

    ;(function tick() {
      if (!arcGroup.parent) { if (++doneCount === n) resolve(); return }
      const elapsed = performance.now() - startAt
      if (elapsed < 0) { requestAnimationFrame(tick); return }
      if (elapsed < growDur) {
        const e = ease(elapsed / growDur)
        arcGroup.scale.set(e, e, 1)
        arcMat.opacity = 0.35 * e
        requestAnimationFrame(tick)
      } else {
        arcGroup.scale.set(1, 1, 1)
        arcMat.opacity = 0.35
        if (++doneCount === n) resolve()
      }
    })()
  }
  }) // end Promise
}

export function highlightAngle3D(threeRef, id, angleIndex, colorRaw = 'cyan') {
  const display = threeRef?.current
  if (!display) return Promise.resolve()

  const shapeGroup = display.getObject(id)
  if (!shapeGroup) return Promise.resolve()

  const entry = registry.get(id)
  const i = Number(angleIndex)
  const newColor   = new THREE.Color(resolveHex(colorRaw))
  const flashColor = new THREE.Color(0xffffff)

  let arcGroup = shapeGroup.userData.children?.[`ang_${id}_${i}`]
  let mat

  if (!arcGroup && entry?.vertices?.length) {
    // Arc doesn't exist yet — build it on the fly with the highlight color
    const verts = entry.vertices
    const n     = verts.length
    let avgEdge = 0
    for (let k = 0; k < n; k++) {
      const [ax,ay] = verts[k], [bx,by] = verts[(k+1)%n]
      avgEdge += Math.sqrt((bx-ax)**2+(by-ay)**2)
    }
    avgEdge /= n
    const arcR = Math.max(avgEdge * 0.17, 0.15)

    const [px, py] = verts[(i + n - 1) % n]
    const [cx, cy] = verts[i]
    const [nx2,ny2] = verts[(i + 1) % n]

    const angle1 = Math.atan2(py - cy, px - cx)
    const angle2 = Math.atan2(ny2 - cy, nx2 - cx)
    let diff = angle2 - angle1
    while (diff > Math.PI)  diff -= 2 * Math.PI
    while (diff <= -Math.PI) diff += 2 * Math.PI

    const is90 = Math.abs(Math.abs(diff) - Math.PI / 2) < 0.052
    let arcGeo
    if (is90) {
      const u1x = Math.cos(angle1), u1y = Math.sin(angle1)
      const u2x = Math.cos(angle2), u2y = Math.sin(angle2)
      const sq = new THREE.Shape()
      sq.moveTo(0, 0)
      sq.lineTo(arcR * u1x, arcR * u1y)
      sq.lineTo(arcR * u1x + arcR * u2x, arcR * u1y + arcR * u2y)
      sq.lineTo(arcR * u2x, arcR * u2y)
      sq.closePath()
      arcGeo = new THREE.ShapeGeometry(sq)
    } else {
      const steps = Math.max(3, Math.round(Math.abs(diff) / Math.PI * 24))
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      for (let s = 0; s <= steps; s++) {
        const a = angle1 + diff * (s / steps)
        shape.lineTo(arcR * Math.cos(a), arcR * Math.sin(a))
      }
      shape.closePath()
      arcGeo = new THREE.ShapeGeometry(shape)
    }

    mat = new THREE.MeshBasicMaterial({
      color: newColor, opacity: 0, transparent: true, side: THREE.DoubleSide,
    })
    arcGroup = new THREE.Group()
    arcGroup.position.set(cx, cy, 0.02)
    arcGroup.scale.set(0, 0, 1)
    arcGroup.add(new THREE.Mesh(arcGeo, mat))
    addChildToGroup(display, id, `ang_${id}_${i}`, arcGroup)
  } else {
    const mesh = arcGroup?.children.find(c => c.isMesh)
    if (!mesh) return Promise.resolve()
    mat = mesh.material
    mat.color.copy(newColor)
  }

  // Animate: if arc was just created, grow from 0; otherwise pulse from current scale
  const fromScale = arcGroup.scale.x
  return new Promise(resolve => {
    const t0  = performance.now()
    const dur = 520
    function tick() {
      const t  = Math.min((performance.now() - t0) / dur, 1)
      const s  = Math.sin(t * Math.PI)
      // Scale: if freshly created, go 0→1.3→1 (spring in). If existing, pulse 1→1.38→1.
      const targetScale = fromScale < 0.1
        ? (t < 0.65 ? t / 0.65 * 1.3 : 1.3 - (t - 0.65) / 0.35 * 0.3)
        : 1 + 0.38 * s
      arcGroup.scale.set(targetScale, targetScale, 1)
      mat.color.copy(newColor).lerp(flashColor, s * 0.7)
      mat.opacity = 0.35 + 0.45 * s
      if (t < 1) requestAnimationFrame(tick)
      else {
        arcGroup.scale.set(1, 1, 1)
        mat.color.copy(newColor)
        mat.opacity = 0.55
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })
}

export function highlightEdge3D(threeRef, id, edgeIndex, colorRaw = 'orange') {
  const display = threeRef?.current
  if (!display) return Promise.resolve()

  const entry = registry.get(id)
  if (!entry?.vertices?.length) return Promise.resolve()

  const verts = entry.vertices
  const i     = Number(edgeIndex) % verts.length
  const [x1, y1] = verts[i]
  const [x2, y2] = verts[(i + 1) % verts.length]
  const color = resolveHex(colorRaw)
  const hlId  = `eh_${id}_${i}`

  // Remove any previous highlight on this edge (parented to shape group)
  removeChildFromGroup(display, id, hlId)

  // Thin quad strip in the shape group's LOCAL space.
  // hlGroup sits at (x1,y1) and is rotated to align with the edge,
  // so the quad geometry only needs to go from (0,0) to (edgeLen,0) — the
  // parent group's transform handles world placement. scale.x draws it in;
  // scale.y thickens it during the pop without moving the endpoints.
  const edgeDx = x2 - x1, edgeDy = y2 - y1
  const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1
  const edgeAngle = Math.atan2(edgeDy, edgeDx)
  const halfT = 0.04  // half-thickness at rest

  const quadGeo = new THREE.BufferGeometry()
  quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0,       halfT,  0.06,
    0,      -halfT,  0.06,
    edgeLen, halfT,  0.06,
    edgeLen,-halfT,  0.06,
  ], 3))
  quadGeo.setIndex([0, 1, 2,  1, 3, 2])

  const mat  = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
  const quad = new THREE.Mesh(quadGeo, mat)
  quad.scale.x = 0  // start invisible for draw-in

  const hlGroup = new THREE.Group()
  hlGroup.position.set(x1, y1, 0)
  hlGroup.rotation.z = edgeAngle
  hlGroup.add(quad)
  addChildToGroup(display, id, hlId, hlGroup)

  // Update the matching side label to the edge highlight color and persist it
  const colorCss = `#${color.toString(16).padStart(6, '0')}`
  const entryForColor = registry.get(id)
  if (entryForColor) {
    if (!entryForColor.edgeColors) entryForColor.edgeColors = {}
    entryForColor.edgeColors[i] = colorCss
  }
  display.setLabelColor?.(`sl_${id}_${i}`, colorCss)

  const baseColor = new THREE.Color(color)
  mat.color.copy(baseColor)

  return new Promise(resolve => {
    const t0  = performance.now()
    const dur = 420
    const ease = t => t < 0.5 ? 2*t*t : -1 + (4-2*t)*t
    function tick() {
      const now = performance.now() - t0
      if (now < dur) {
        quad.scale.x = ease(now / dur)
        requestAnimationFrame(tick)
      } else {
        quad.scale.x = 1
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })
}

export function addText3D(threeRef, id, text, x, y, opts = {}) {
  const display = threeRef?.current
  if (!display) return
  display.addLabel3D(`tx_${id}`, x ?? 0, y ?? 0, 0.1, text, {
    color: opts.color ? `#${resolveHex(opts.color).toString(16).padStart(6,'0')}` : '#c084fc',
    fontSize: opts.fontSize ?? 14,
  })
}

export function removeText3D(threeRef, id) {
  threeRef?.current?.removeLabel3D(`tx_${id}`)
}

// ── Arrow helpers ─────────────────────────────────────────────────────────────

export function getShapePoint3D(id, anchorType, index) {
  const ref = anchorType === 'vertex' ? `v${index}` : `e${index}`
  return resolveShapePoint(id, ref)
}

function resolveShapePoint(id, ref) {
  const entry = registry.get(id)
  if (!entry?.vertices) return null
  const verts = entry.vertices
  const n     = verts.length
  const s     = String(ref).trim().toLowerCase()
  if (s.startsWith('v')) {
    const idx = parseInt(s.slice(1))
    return isNaN(idx) ? null : verts[idx % n] ?? null
  }
  if (s.startsWith('e')) {
    const idx = parseInt(s.slice(1))
    if (isNaN(idx)) return null
    const [x1, y1] = verts[idx % n]
    const [x2, y2] = verts[(idx + 1) % n]
    return [(x1 + x2) / 2, (y1 + y2) / 2]
  }
  return null
}

/**
 * Draw an animated arrow inside a flat 2D shape, from one anchor to another.
 *
 * fromRef / toRef — "v0","v1",… for vertices OR "e0","e1",… for edge midpoints.
 * The shaft grows from start → end; the arrowhead pops in at the end.
 * The arrow object is parented to the shape group so it moves with the shape.
 *
 * Returns a Promise that resolves when the animation completes.
 */
export function showArrow3D(threeRef, id, arrowId, fromRef, toRef, colorRaw = 'yellow') {
  const display = threeRef?.current
  if (!display) return Promise.resolve()

  const fromPt = resolveShapePoint(id, fromRef)
  const toPt   = resolveShapePoint(id, toRef)
  if (!fromPt || !toPt) return Promise.resolve()

  const color = resolveHex(colorRaw)
  const childId = `arr_${id}_${arrowId}`
  removeChildFromGroup(display, id, childId)

  const [fx, fy] = fromPt
  const [tx, ty] = toPt
  const dx     = tx - fx
  const dy     = ty - fy
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  const angle  = Math.atan2(dy, dx)

  const halfT   = 0.028               // shaft half-thickness
  const headLen = Math.min(0.26, length * 0.20)
  const shaftL  = length - headLen    // shaft goes 0 → shaftL
  const headHW  = headLen * 0.55      // arrowhead half-width

  // Shaft quad (local x: 0 → shaftL). scale.x animated 0→1 grows it from the start point.
  const shaftGeo = new THREE.BufferGeometry()
  shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0,      halfT, 0.06,
    0,     -halfT, 0.06,
    shaftL, halfT, 0.06,
    shaftL,-halfT, 0.06,
  ], 3))
  shaftGeo.setIndex([0, 1, 2,  1, 3, 2])

  // Arrowhead triangle (local x: shaftL → length)
  const headGeo = new THREE.BufferGeometry()
  headGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    shaftL,  headHW, 0.07,
    shaftL, -headHW, 0.07,
    length,  0,      0.07,
  ], 3))
  headGeo.setIndex([0, 1, 2])

  const mat   = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 1 })
  const shaft = new THREE.Mesh(shaftGeo, mat)
  const head  = new THREE.Mesh(headGeo, mat.clone())
  shaft.scale.x = 0
  head.visible  = false

  const arrowGroup = new THREE.Group()
  arrowGroup.position.set(fx, fy, 0)
  arrowGroup.rotation.z = angle
  arrowGroup.add(shaft)
  arrowGroup.add(head)
  addChildToGroup(display, id, childId, arrowGroup)

  return new Promise(resolve => {
    const t0   = performance.now()
    const dur  = 460
    const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
    function tick() {
      if (!arrowGroup.parent) { resolve(); return }
      const t = Math.min((performance.now() - t0) / dur, 1)
      shaft.scale.x = ease(t)
      if (t >= 0.88) head.visible = true
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

export function removeArrow3D(threeRef, id, arrowId) {
  const display = threeRef?.current
  if (!display) return Promise.resolve()

  const shapeGroup = display.getObject(id)
  const childId    = `arr_${id}_${arrowId}`
  const arrowGroup = shapeGroup?.userData?.children?.[childId]
  if (!arrowGroup) return Promise.resolve()

  // Collect all mesh materials in the group
  const mats = []
  arrowGroup.traverse(c => { if (c.isMesh && c.material) mats.push(c.material) })

  return new Promise(resolve => {
    const t0  = performance.now()
    const dur = 260
    function tick() {
      const t = Math.min((performance.now() - t0) / dur, 1)
      const opacity = 1 - t * t   // ease-in fade
      mats.forEach(m => { m.opacity = opacity })
      if (t < 1) requestAnimationFrame(tick)
      else {
        removeChildFromGroup(display, id, childId)
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })
}

export function clearHighlights3D(threeRef, id) {
  const display = threeRef?.current
  if (!display) return
  const entry = registry.get(id)
  if (entry) entry.edgeColors = {}
  for (let i = 0; i < 20; i++) {
    removeChildFromGroup(display, id, `ang_${id}_${i}`)
    removeChildFromGroup(display, id, `eh_${id}_${i}`)
    display.resetLabelColor?.(`sl_${id}_${i}`)
  }
}

export function setView3D(threeRef, opts = {}) {
  threeRef?.current?.adjustView3D(opts)
  const dur = (opts.duration ?? 0.8) * 1000
  return new Promise(r => setTimeout(r, dur))
}
