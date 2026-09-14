/**
 * Three.js Engine — drives ThreeDisplay (WebGL canvas).
 * Handles both 3D volumetric shapes and 2D flat shapes.
 */

import * as THREE from 'three'
// Every tween in here runs its own rAF loop, so none of them were reachable
// from the gsap timeline the fast-forward drives. They read the multiplier
// directly instead.
import { animMs } from './animSpeed.js'

const registry = new Map()  // id → { type, isFlat, vertices, a, b, c, opts }

// ── Color helpers ─────────────────────────────────────────────────────────────
// 'blue' == 0x60a5fa is THE reserved app-wide color (matches palette.js's
// SYS.blue) — always use it for measurement lines/highlights, never a
// one-off like orange, so annotations read consistently everywhere.
const COLOR_NAMES = {
  blue:   0x60a5fa, red:    0xf87171, green:  0x4ade80,
  yellow: 0xfbbf24, purple: 0xa855f7, orange: 0xfb923c,
  cyan:   0x22d3ee, pink:   0xf472b6, white:  0xe2e8f0,
  teal:   0x2dd4bf, lime:   0xa3e635, rose:   0xfb7185,
  black:  0x1e1e2e, gray:   0x94a3b8,
}

function resolveHex(color) {
  if (!color) return 0x60a5fa
  if (typeof color === 'number') return color
  const s = String(color).trim().toLowerCase()
  if (COLOR_NAMES[s] !== undefined) return COLOR_NAMES[s]
  if (s.startsWith('#')) return parseInt(s.slice(1), 16)
  return 0x60a5fa
}

// ── Flat (2D) shape vertex calculation ────────────────────────────────────────

// Trim float noise so a snapped corner reads as the number the author typed
// rather than 7.199999999999999.
const r4 = n => Math.round(n * 10000) / 10000

const FLAT_TYPES = new Set([
  'circle', 'triangle', 'right-triangle', 'rectangle', 'square',
  'parallelogram', 'trapeze', 'trapeze-right', 'rhombus',
  'pentagon', 'hexagon', 'octagon', 'regular-polygon', 'line',
])

// 6 decimals, not 4 — a "clean" triangle built from a precise law-of-sines
// side (so its OWN live angles read back as an exact 45°/60° for an equation
// to reference) was still drifting to 45.0005°/59.9995° after this rounded
// its vertices, since 4 decimals of coordinate error is enough to perturb
// the 4th decimal of an angle computed from them.
const r6 = n => Math.round(n * 1000000) / 1000000

// The centre of GRAVITY of a flat shape — the point it would balance on — and
// not the middle of its bounding box. For a right triangle or a slanted figure
// the two are visibly apart, and a figure set on its box's middle sits off to
// one side of where the eye puts its centre. A polygon's area centroid; the
// plain average of its points when it has no area (a segment).
function centroidOf(verts) {
  let a2 = 0, cx = 0, cy = 0
  for (let i = 0; i < verts.length; i++) {
    const [x1, y1] = verts[i], [x2, y2] = verts[(i + 1) % verts.length]
    const cross = x1 * y2 - x2 * y1
    a2 += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  if (Math.abs(a2) < 1e-9) {
    return [
      verts.reduce((s, v) => s + v[0], 0) / verts.length,
      verts.reduce((s, v) => s + v[1], 0) / verts.length,
    ]
  }
  return [cx / (3 * a2), cy / (3 * a2)]
}

function centerVertices(verts) {
  const [cx, cy] = centroidOf(verts)
  return verts.map(([x, y]) => [r6(x - cx), r6(y - cy)])
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
    case 'trapeze-right': {
      // The isosceles trapeze above leans in on both sides. This one stands on
      // a vertical left edge, so it has two right angles — the shape almost
      // every area exercise actually draws.
      const [a, b = a * 1.5, h = a * 0.7] = values
      return [[0,0],[b,0],[a,h],[0,h]]
    }
    case 'rhombus': {
      // Given by its DIAGONALS, because that is what the area formula uses and
      // what a problem hands you: A = D x d / 2. The four equal sides fall out
      // of them, and the engine measures them back for a label.
      const [d1, d2 = d1 * 0.6] = values
      return [[0, -d2 / 2], [d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0]]
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
    // A second value turns the disc into a SECTOR: 90 gives a quarter, 180 a
    // half, 270 three quarters. Anything at or past a full turn is the whole
    // circle, which is also what an omitted value means — so every circle that
    // was ever drawn keeps drawing exactly as it did.
    const sweepDeg = Math.max(1, Math.min(Number(values[1]) || 360, 360))
    const sweep    = (sweepDeg * Math.PI) / 180
    const whole    = sweepDeg >= 360
    const SEG      = Math.max(8, Math.round(64 * sweepDeg / 360))

    const fillGeo = new THREE.CircleGeometry(r, SEG, 0, sweep)
    const fillMat = new THREE.MeshBasicMaterial({
      color: hexColor, opacity: fillOpacity, transparent: true, side: THREE.DoubleSide,
    })
    group.add(new THREE.Mesh(fillGeo, fillMat))

    // The outline of a sector is two radii and an arc, not just the arc — an
    // arc on its own reads as a curve floating in space, not as a slice.
    const arc = Array.from({ length: SEG + 1 }, (_, i) => {
      const a = (i / SEG) * sweep
      return new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0.01)
    })
    const pts = whole ? arc : [new THREE.Vector3(0, 0, 0.01), ...arc, new THREE.Vector3(0, 0, 0.01)]
    const outlineColor = new THREE.Color(hexColor).lerp(new THREE.Color(0xffffff), 0.55)
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: outlineColor }),
    ))
    group.userData = { isFlat: true, type, values, isCircle: true, radius: r, sweepDeg }
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

// Fade every material in a group between hidden and the opacity it was built
// with. Each one keeps its OWN target: a flat shape is a translucent fill under
// a solid outline, and fading both to one shared number would flatten that
// relationship for the length of the animation.
function fadeGroup(group, dir, ms) {
  const mats = []
  group.traverse(o => {
    const m = o.material
    if (!m) return
    for (const mat of Array.isArray(m) ? m : [m]) {
      if (mats.some(e => e.mat === mat)) continue
      mat.transparent = true
      mats.push({ mat, target: mat.opacity })
    }
  })
  if (!mats.length) return Promise.resolve()
  const dur = Math.max(1, animMs(ms))
  // Set the far end before the first frame is painted, or the shape flashes at
  // full opacity for one frame before the fade starts.
  for (const { mat, target } of mats) mat.opacity = dir === 'in' ? 0 : target
  return new Promise(resolve => {
    const t0 = performance.now()
    const tick = () => {
      const p = Math.min((performance.now() - t0) / dur, 1)
      const e = dir === 'in' ? p : 1 - p
      for (const { mat, target } of mats) mat.opacity = target * e
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

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

  if (FLAT_TYPES.has(type) && !group.userData.isCircle && opts.autoTicks !== false) {
    autoTickEqualSides(threeRef, id, group.userData.vertices)
  }

  // A shape built from big numbers is wider than the fixed 2D frustum and used
  // to hang off the edge of the canvas. Widen the view until it fits.
  if (FLAT_TYPES.has(type)) display.fitView2D?.()

  // Nothing on this canvas appears at full strength in one frame. The 3D
  // solids keep their old instant entrance — this was asked for the flat ones.
  if (FLAT_TYPES.has(type)) return fadeGroup(group, 'in', 260)
}

// Auto-detect congruent (equal-length) sides right after a flat shape is
// created, tick-marking each group with a distinct dash count (1, 2, 3) —
// same visual convention as showEqualTick3D — so students immediately see
// which sides are equal without a separate manual step. No-op for shapes
// with no repeated side length (e.g. scalene triangles), and silently caps
// at 3 distinct groups since that's the max the tick notation supports.
// Pass { autoTicks: false } in opts to createShape3D to opt out.
// How big the figure a mark belongs to is: the average side of the shape at the
// root of what it is snapped to. Marks sized from it keep the same proportion
// to the figure however far the view has zoomed in or out to frame it — a tick
// set in world units turned into a fat bar on a small figure the view blew up.
// A snapped piece is measured by the whole figure, not by itself: a short
// segment inside a big square gets the square's ticks.
function figureScale(id) {
  let entry = registry.get(id)
  for (let hops = 0; entry?.snappedTo && registry.get(entry.snappedTo) && hops < 8; hops++) {
    entry = registry.get(entry.snappedTo)
  }
  const verts = entry?.vertices
  if (!verts?.length) return 5
  const n = verts.length
  let sum = 0
  for (let i = 0; i < n; i++) {
    const [x1, y1] = verts[i], [x2, y2] = verts[(i + 1) % n]
    sum += Math.hypot(x2 - x1, y2 - y1)
  }
  return (n === 2 ? sum / 2 : sum / n) || 5
}

function autoTickEqualSides(threeRef, id, verts) {
  const n = verts?.length ?? 0
  if (n < 3) return
  const groups = new Map()
  for (let i = 0; i < n; i++) {
    const len = sideLength3D(verts, i)
    if (!groups.has(len)) groups.set(len, [])
    groups.get(len).push(i)
  }
  let ticks = 1
  for (const indices of groups.values()) {
    if (indices.length < 2) continue
    if (ticks > 3) break
    for (const edgeIndex of indices) showEqualTick3D(threeRef, id, edgeIndex, ticks, 'orange')
    ticks++
  }
}

export function removeShape3D(threeRef, id) {
  // Child objects (highlights, angle arcs) are parented to the shape group
  // and are disposed automatically when the parent group is removed.
  // A flat shape leaves the way it arrived. The labels hanging off it are DOM
  // elements with their own fade, so they are started at the same moment and
  // everything goes together instead of the words outliving the shape.
  const entry = registry.get(id)
  const group = threeRef?.current?.getObject?.(id)
  if (entry?.isFlat && group) {
    const d = threeRef.current
    for (let i = 0; i < 20; i++) d.fadeOutLabel3D?.(`sl_${id}_${i}`, animMs(240))
    for (let i = 0; i < 20; i++) d.fadeOutLabel3D?.(`cmt_${id}_${i}`, animMs(240))
    d.fadeOutLabel3D?.(`tx_${id}`, animMs(240))
    for (const m of entry.angleMarks ?? []) d.fadeOutLabel3D?.(`mangl_${id}_${m}`, animMs(240))
    return fadeGroup(group, 'out', 240).then(() => finishRemoveShape3D(threeRef, id))
  }
  return finishRemoveShape3D(threeRef, id)
}

function finishRemoveShape3D(threeRef, id) {
  threeRef?.current?.removeObject(id)
  // Labels are tracked separately — remove them explicitly
  const display = threeRef?.current
  if (display) {
    for (let i = 0; i < 20; i++) display.removeLabel3D(`sl_${id}_${i}`)
    for (let i = 0; i < 20; i++) display.removeLabel3D(`cmt_${id}_${i}`)
    display.removeLabel3D(`tx_${id}`)
    for (const m of registry.get(id)?.angleMarks ?? []) display.removeLabel3D(`mangl_${id}_${m}`)
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
      const t = Math.min((performance.now() - t0) / animMs(duration * 1000), 1)
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
      // A move can carry the shape past the edge of the frame just as easily as
      // an oversized shape can, so re-fit once it lands.
      else { display.fitView2D?.(); resolve() }
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
    const dur = animMs(320)
    function tick() {
      const t = Math.min((performance.now() - t0) / dur, 1)
      const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
      // squish through 0 then expand on the other side
      group.scale.x = origScaleX * (1 - 2 * e)
      if (t < 1) { requestAnimationFrame(tick); return }

      // Bake: negate X in vertices and rebuild so all subsequent ops use correct coords
      const entry = registry.get(id)
      if (entry?.vertices) {
        entry.vertices = entry.vertices.map(([x, y]) => [r6(-x), y])
        const hexColor = resolveHex(entry.opts?.color ?? 'blue')
        const savedPos = group.position.clone()
        const newGroup = buildFlatGroupFromVerts(entry.vertices, hexColor, entry.opts)
        newGroup.position.copy(savedPos)
        display.addObject(id, newGroup)
      } else {
        group.scale.x = -origScaleX
      }
      display.fitView2D?.()
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
    const dur = animMs(380)
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
          r6(x * cos - y * sin),
          r6(x * sin + y * cos),
        ])
        const hexColor = resolveHex(entry.opts?.color ?? 'blue')
        const savedPos = group.position.clone()
        const newGroup = buildFlatGroupFromVerts(entry.vertices, hexColor, entry.opts)
        newGroup.position.copy(savedPos)
        display.addObject(id, newGroup)
      }
      // A rotated shape has a different bounding box — what fitted lying flat
      // can stick out once it stands up.
      display.fitView2D?.()
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
    const dur = animMs(550)
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
  const fadeOutDur = animMs(180)
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

    const custom = newCustoms[i]
    const len    = parseFloat(Math.sqrt((x2-x1)**2 + (y2-y1)**2).toFixed(2))
    const text   = custom === ''
      ? String(len)
      : custom.endsWith('=')
        ? `${custom.slice(0, -1).trim()} = ${len}`
        : custom

    const edgeColor = entry.edgeColors?.[i] ?? '#a5b4fc'
    const fontSize  = Math.round(Math.max(14, Math.min(36, avgEdge * ppu * 0.16)))
    // addLabel3D centers the label ON this point (translate(-50%,-50%)) and the
    // label itself is always axis-aligned text, never rotated to match the
    // edge — so "half the font size" alone (a plain perpendicular half-height)
    // only clears a near-horizontal edge. A near-vertical/diagonal edge (e.g.
    // "b=7" against a steep side) needs the label's HALF-WIDTH pushed out too,
    // or a wide label's corner still crosses the line while its center looks
    // clear. Project the label's own (approximate) half-width/half-height onto
    // the edge's normal — the standard axis-aligned-box-vs-line clearance
    // formula — then add a flat ~6px gap on top of that true hitbox edge.
    const charW  = fontSize * 0.62
    const halfW  = (text.length * charW) / 2
    const halfH  = fontSize / 2
    const offsetPx = halfW * Math.abs(nx) + halfH * Math.abs(ny) + 6
    const offset   = offsetPx / ppu

    display.addLabel3D(
      `sl_${id}_${i}`,
      lx + gx + sign * nx * offset,
      ly + gy + sign * ny * offset,
      0.05,
      text,
      { color: edgeColor, fontSize, fadeIn: animMs(400) },
    )

    if (!entry.storedLabels) entry.storedLabels = []
    entry.storedLabels[i] = custom
  }
  // No explicit re-fit here: adding a label schedules one for the next frame,
  // which covers every path that puts a label on screen, not just this one.
  return new Promise(resolve => setTimeout(resolve, 440))
}

// ── Show Area Measures (2D flat shapes) ───────────────────────────────────────
// Same idea as geometryEngine.js's showAreaMeasures, but for shapes created via
// geo3d-create-2d (the Three.js flat-shape system, a separate registry/canvas).

function sideLength3D(verts, i) {
  const [x1, y1] = verts[i], [x2, y2] = verts[(i + 1) % verts.length]
  return parseFloat(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2).toFixed(2))
}

function shapeHeight3D(verts) {
  const ys = verts.map(v => v[1])
  return parseFloat((Math.max(...ys) - Math.min(...ys)).toFixed(2))
}

// Label one edge with arbitrary text — same placement math as labelSides3D,
// for a single side instead of all of them.
function labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, edgeIndex, text, color, labelId) {
  const verts = entry.vertices
  const n     = verts.length
  const [x1, y1] = verts[edgeIndex], [x2, y2] = verts[(edgeIndex + 1) % n]
  const lx = (x1 + x2) / 2, ly = (y1 + y2) / 2
  const edgeDx = x2 - x1, edgeDy = y2 - y1
  const eLen   = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1
  const nx = -edgeDy / eLen, ny = edgeDx / eLen
  const [ox, oy] = verts[(edgeIndex + 2) % n]
  const cross  = edgeDx * (oy - ly) - edgeDy * (ox - lx)
  const sign   = cross > 0 ? -1 : 1
  const offset = avgEdge * 0.14
  const fontSize = Math.round(Math.max(14, Math.min(36, avgEdge * ppu * 0.16)))
  display.addLabel3D(labelId, lx + gx + sign * nx * offset, ly + gy + sign * ny * offset, 0.05, text, { color, fontSize, fadeIn: animMs(400) })

  // A measurement is meaningless without seeing what it's measuring — always
  // highlight the actual edge alongside its label, not just a floating number.
  // Dashed, like every other measure line — never a solid edge overlay.
  const lineGroup = makeDashedLineGroup3D([x1, y1, 0.06], [x2, y2, 0.06], resolveHex(color), 0.03)
  addChildToGroup(display, id, `${labelId}_ln`, lineGroup)
}

// Dashed vertical line from the top vertex down to the base, parented to the
// shape's own group (so it inherits the group's position automatically).
// Pick the x for a vertical height line so it always stays INSIDE the shape.
// For a trapeze/parallelogram (two vertices at both the top and the base),
// dropping from the WIDER edge can land outside the narrower one — instead,
// drop from the SHORTER of the two parallel edges (both are centered on the
// same axis by construction, so this is always safely inside). Triangles only
// have a single apex, so there's no ambiguity there.
function pickHeightLineX3D(verts) {
  const topY  = Math.max(...verts.map(v => v[1]))
  const baseY = Math.min(...verts.map(v => v[1]))
  const topVerts  = verts.filter(v => Math.abs(v[1] - topY)  < 1e-6)
  const baseVerts = verts.filter(v => Math.abs(v[1] - baseY) < 1e-6)
  if (topVerts.length === 2 && baseVerts.length === 2) {
    const topLen  = Math.abs(topVerts[1][0]  - topVerts[0][0])
    const baseLen = Math.abs(baseVerts[1][0] - baseVerts[0][0])
    const shortSet = topLen <= baseLen ? topVerts : baseVerts
    return { x: shortSet.reduce((a, b) => (b[0] < a[0] ? b : a))[0], topY, baseY }
  }
  const top = topVerts.reduce((a, b) => (b[0] < a[0] ? b : a))
  return { x: top[0], topY, baseY }
}

function drawDashedHeightLine3D(display, id, verts, color) {
  const { x, topY, baseY } = pickHeightLineX3D(verts)

  const dashN   = 6
  const totalLen = topY - baseY
  const segLen  = totalLen / (dashN * 2 - 1)
  const halfT   = 0.04
  const hex     = resolveHex(color)
  const group   = new THREE.Group()

  for (let i = 0; i < dashN; i++) {
    const y0 = baseY + i * segLen * 2
    const quadGeo = new THREE.BufferGeometry()
    quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      x - halfT, y0,          0.06,
      x + halfT, y0,          0.06,
      x - halfT, y0 + segLen, 0.06,
      x + halfT, y0 + segLen, 0.06,
    ], 3))
    quadGeo.setIndex([0, 1, 2, 1, 3, 2])
    const mat = new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide })
    group.add(new THREE.Mesh(quadGeo, mat))
  }
  addChildToGroup(display, id, `amh_${id}`, group)
  return { x, midY: (topY + baseY) / 2 }
}

export async function showAreaMeasures3D(threeRef, id, opts = {}) {
  const display = threeRef?.current
  if (!display) return
  const entry = registry.get(id)
  if (!entry) return

  // Reserved light blue (#60a5fa) — the app-wide convention for measurement/
  // highlight overlays (see palette.js SYS.blue). Never orange or anything
  // else here, so every measurement reads consistently.
  const hex   = opts.color ? resolveHex(opts.color) : 0x60a5fa
  const color = `#${hex.toString(16).padStart(6, '0')}`

  if (entry.isCircle) {
    const r = entry.radius ?? 0
    const group = display.getObject(id)
    const gx = group?.position.x ?? 0, gy = group?.position.y ?? 0
    const angle = (opts.angle ?? 35) * Math.PI / 180
    const ex = r * Math.cos(angle), ey = r * Math.sin(angle)
    const lineGroup = makeDashedLineGroup3D([0, 0, 0.06], [ex, ey, 0.06], hex, 0.03)
    addChildToGroup(display, id, `amr_${id}`, lineGroup)
    display.addLabel3D(`amlbl_${id}`, gx + ex / 2, gy + ey / 2, 0.05, `r = ${parseFloat(r.toFixed(2))}`, { color, fontSize: 24, fadeIn: animMs(400) })
    return
  }

  const verts = entry.vertices
  if (!verts?.length) return
  const n = verts.length

  let avgEdge = 0
  for (let i = 0; i < n; i++) avgEdge += sideLength3D(verts, i)
  avgEdge /= n
  const ppu   = display.getPixelsPerUnit?.() ?? 50
  const group = display.getObject(id)
  const gx    = group?.position.x ?? 0, gy = group?.position.y ?? 0

  const h = shapeHeight3D(verts)
  const fontSize = Math.round(Math.max(14, Math.min(36, avgEdge * ppu * 0.16)))
  const withHeightLine = () => {
    const { x, midY } = drawDashedHeightLine3D(display, id, verts, color)
    display.addLabel3D(`amhlbl_${id}`, x + gx + avgEdge * 0.06, midY + gy, 0.05, `h = ${h}`, { color, fontSize, align: 'left', fadeIn: animMs(400) })
  }

  switch (entry.type) {
    case 'square':
      labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, 0, `s = ${sideLength3D(verts, 0)}`, color, `am_${id}_0`)
      break
    case 'rectangle':
      labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, 0, `l = ${sideLength3D(verts, 0)}`, color, `am_${id}_0`)
      labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, 1, `h = ${sideLength3D(verts, 1)}`, color, `am_${id}_1`)
      break
    case 'parallelogram':
      labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, 0, `b = ${sideLength3D(verts, 0)}`, color, `am_${id}_0`)
      withHeightLine()
      break
    case 'trapeze':
      labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, 0, `B = ${sideLength3D(verts, 0)}`, color, `am_${id}_0`)
      labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, 2, `b = ${sideLength3D(verts, 2)}`, color, `am_${id}_2`)
      withHeightLine()
      break
    case 'triangle':
    case 'right-triangle':
      labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, 0, `b = ${sideLength3D(verts, 0)}`, color, `am_${id}_0`)
      withHeightLine()
      break
    default:
      labelEdge3D(display, id, entry, gx, gy, avgEdge, ppu, 0, `s = ${sideLength3D(verts, 0)}`, color, `am_${id}_0`)
  }
}

// Perimeter needs EVERY side (unlike area's minimal per-shape-type subset) —
// highlight each edge in turn, then label all of them with their computed
// lengths via labelSides3D (auto-fills every slot when given no custom
// text). A circle has no discrete edges — after the same radius line +
// "r = value" showAreaMeasures3D draws, trace a highlight ring starting from
// that same point all the way around back to it, since "the perimeter" for
// a circle IS that trip around, not just r itself.
export async function showPerimeterMeasures3D(threeRef, id, opts = {}) {
  const display = threeRef?.current
  if (!display) return
  const entry = registry.get(id)
  if (!entry) return

  if (entry.isCircle) {
    await showAreaMeasures3D(threeRef, id, opts)
    const hex = opts.color ? resolveHex(opts.color) : 0x60a5fa
    const angle = (opts.angle ?? 35) * Math.PI / 180
    await animateCirclePerimeterTrace3D(display, id, entry.radius ?? 0, angle, hex)
    return
  }
  const verts = entry.vertices
  if (!verts?.length) return

  const color = opts.color ?? '#60a5fa'
  const n = verts.length
  for (let i = 0; i < n; i++) {
    // eslint-disable-next-line no-await-in-loop
    await highlightEdge3D(threeRef, id, i, color)
  }
  await labelSides3D(threeRef, id)
}

// ── Equal-side tick marks ──────────────────────────────────────────────────────
// Classic congruent-side notation: one or more short perpendicular dashes
// crossing the middle of an edge. Use a different "ticks" count (1, 2, 3…) to
// mark a DIFFERENT pair of equal sides than an existing tick group.
export function showEqualTick3D(threeRef, id, edgeIndexRaw, ticksRaw, colorRaw) {
  const display = threeRef?.current
  if (!display) return
  const entry = registry.get(id)
  if (!entry?.vertices?.length) return
  const verts = entry.vertices
  const n     = verts.length
  const i     = ((Number(edgeIndexRaw) || 0) % n + n) % n
  const [x1, y1] = verts[i], [x2, y2] = verts[(i + 1) % n]
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const edgeDx = x2 - x1, edgeDy = y2 - y1
  const eLen   = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1
  const ux = edgeDx / eLen, uy = edgeDy / eLen   // unit vector along the edge
  const nx = -uy, ny = ux                        // unit vector perpendicular

  const ticks   = Math.max(1, Math.min(3, Math.round(ticksRaw ?? 1)))
  // Marks are notation, not drawing: they have to read as a pair at a glance
  // without competing with the figure. Short, thin, and set close enough that a
  // double reads as ONE symbol — at the old spacing (90% of their own length)
  // two ticks looked like two separate single marks on different sides.
  // Proportional to the figure (see figureScale): the same look as the old
  // 0.26 / 0.022 on a figure with sides around 5.
  const scale   = figureScale(id)
  const tickLen = Math.min(eLen * 0.18, scale * 0.052)
  const spacing = tickLen * 0.42
  const halfT   = scale * 0.0045
  const hex     = resolveHex(colorRaw)
  const group   = new THREE.Group()

  for (let k = 0; k < ticks; k++) {
    const off = (k - (ticks - 1) / 2) * spacing
    const cx = mx + ux * off, cy = my + uy * off
    const ax = cx - nx * tickLen / 2, ay = cy - ny * tickLen / 2
    const bx = cx + nx * tickLen / 2, by = cy + ny * tickLen / 2
    const dx = bx - ax, dy = by - ay
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ang = Math.atan2(dy, dx)

    const quadGeo = new THREE.BufferGeometry()
    quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0,   halfT, 0.07,
      0,  -halfT, 0.07,
      len, halfT, 0.07,
      len,-halfT, 0.07,
    ], 3))
    quadGeo.setIndex([0, 1, 2, 1, 3, 2])
    const mat = new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide })
    const tickGroup = new THREE.Group()
    tickGroup.position.set(ax, ay, 0)
    tickGroup.rotation.z = ang
    tickGroup.add(new THREE.Mesh(quadGeo, mat))
    group.add(tickGroup)
  }
  addChildToGroup(display, id, `tick_${id}_${i}`, group)
}

export function removeEqualTick3D(threeRef, id, edgeIndexRaw) {
  const display = threeRef?.current
  if (!display) return
  const entry = registry.get(id)
  const n = entry?.vertices?.length ?? 1
  const i = ((Number(edgeIndexRaw) || 0) % n + n) % n
  removeChildFromGroup(display, id, `tick_${id}_${i}`)
}

export function showAngles3D(threeRef, id, colorRaw, showValues = false) {
  const display = threeRef?.current
  if (!display?.isReady()) return Promise.resolve()

  const entry = registry.get(id)
  if (!entry?.vertices?.length) return Promise.resolve()

  const verts = entry.vertices
  const n     = verts.length
  const color = resolveHex(colorRaw ?? 'blue')
  const colorCss = `#${color.toString(16).padStart(6, '0')}`

  // Degree-value labels are removed/redrawn every call, same as the arcs
  // themselves just above, so re-calling this with a different color/shape
  // never leaves a stale label from a previous pass.
  for (let i = 0; i < 20; i++) display.removeLabel3D?.(`angval_${id}_${i}`)

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

  const growDur = animMs(300)   // ms: arc sweeps open
  const stagger = animMs(60)    // ms: delay between each vertex arc
  const group = display.getObject(id)
  const gx = group?.position.x ?? 0, gy = group?.position.y ?? 0

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

    if (showValues) {
      const degrees  = parseFloat((Math.abs(diff) * 180 / Math.PI).toFixed(2))
      const midAngle = angle1 + diff / 2
      // Inside the wedge itself (between the vertex and the arc), not
      // floating outside it — same spot the arc's own bisector points to.
      const lr = arcR * 0.6
      display.addLabel3D(
        `angval_${id}_${i}`,
        gx + cx + lr * Math.cos(midAngle), gy + cy + lr * Math.sin(midAngle), 0.05,
        `${degrees}°`, { color: colorCss, fontSize: 15, fadeIn: growDur + i * stagger },
      )
    }

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

/**
 * ONE angle marked anywhere on a flat figure — not only between a shape's own
 * consecutive sides, which is all showAngles3D and highlightAngle3D can see.
 * Its three points are given the way snapping gives them (vN, eN@t, eN:d on
 * the shape `id`), so the angle DEC of a square with E on BC is marked from the
 * square's own corner and edge: it stays on the figure, and no coordinate is
 * typed. A filled wedge with its rim, and a label just outside it — the
 * measure, the author's own text, or nothing at all ("-").
 */
export function markAngle3D(threeRef, id, markId, fromRef, vertexRef, toRef, opts = {}) {
  const display = threeRef?.current
  const entry = registry.get(id)
  if (!display || !entry?.vertices?.length) return Promise.resolve()
  const P = resolveShapePoint(id, fromRef)
  const V = resolveShapePoint(id, vertexRef)
  const Q = resolveShapePoint(id, toRef)
  if (!P || !V || !Q) throw new Error('markAngle : ancrage invalide — attendu vN, eN@fraction ou eN:distance')

  // Same arc size as the shape's own corner arcs, so a marked angle and a
  // shown one read as the same kind of mark.
  const verts = entry.vertices
  const n = verts.length
  let avgEdge = 0
  for (let k = 0; k < n; k++) {
    const [ax, ay] = verts[k], [bx, by] = verts[(k + 1) % n]
    avgEdge += Math.hypot(bx - ax, by - ay)
  }
  avgEdge /= n
  // Size scales it: an angle drawn inside another at the same vertex (40° inside
  // 100°) only reads as an angle of its own when its arc is the smaller one.
  const size = Math.min(3, Math.max(0.2, Number(opts.size) || 1))
  const arcR = Math.max(avgEdge * 0.17, 0.15) * size

  const a1 = Math.atan2(P[1] - V[1], P[0] - V[0])
  const a2 = Math.atan2(Q[1] - V[1], Q[0] - V[0])
  let diff = a2 - a1
  while (diff > Math.PI)   diff -= 2 * Math.PI
  while (diff <= -Math.PI) diff += 2 * Math.PI
  const deg  = Math.abs(diff) * 180 / Math.PI
  const is90 = Math.abs(deg - 90) < 3

  const color    = resolveHex(opts.color)
  const colorCss = `#${color.toString(16).padStart(6, '0')}`
  const childId  = `mang_${id}_${markId}`
  const labelId  = `mangl_${id}_${markId}`
  removeChildFromGroup(display, id, childId)
  display.removeLabel3D?.(labelId)

  const rim = []
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  if (is90) {
    // A right angle is a small square in the corner, not an arc.
    const s  = arcR * 0.8
    const u1 = [Math.cos(a1), Math.sin(a1)], u2 = [Math.cos(a2), Math.sin(a2)]
    for (const [x, y] of [[s * u1[0], s * u1[1]], [s * (u1[0] + u2[0]), s * (u1[1] + u2[1])], [s * u2[0], s * u2[1]]]) {
      shape.lineTo(x, y)
      rim.push(new THREE.Vector3(x, y, 0.01))
    }
  } else {
    const steps = Math.max(6, Math.round(Math.abs(diff) / Math.PI * 32))
    for (let k = 0; k <= steps; k++) {
      const a = a1 + diff * (k / steps)
      const x = arcR * Math.cos(a), y = arcR * Math.sin(a)
      shape.lineTo(x, y)
      rim.push(new THREE.Vector3(x, y, 0.01))
    }
  }
  shape.closePath()
  const fillMat = new THREE.MeshBasicMaterial({ color, opacity: 0, transparent: true, side: THREE.DoubleSide })
  const rimMat  = new THREE.LineBasicMaterial({ color, opacity: 0, transparent: true })
  const group = new THREE.Group()
  group.position.set(V[0], V[1], 0.02)
  group.scale.set(0, 0, 1)
  group.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), fillMat))
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rim), rimMat))
  addChildToGroup(display, id, childId, group)
  // Remembered on the shape, so clearing its highlights or removing it takes
  // these marks and their labels along.
  entry.angleMarks = entry.angleMarks ?? new Set()
  entry.angleMarks.add(markId)

  const growDur = animMs(360)
  const raw  = String(opts.label ?? '').trim()
  const text = raw === '-' ? '' : (raw || `${+deg.toFixed(1)}°`)
  if (text) {
    const shapeGroup = display.getObject(id)
    const gx = shapeGroup?.position.x ?? 0, gy = shapeGroup?.position.y ?? 0
    const mid = a1 + diff / 2
    const lr  = arcR * (is90 ? 1.9 : 1.6)
    display.addLabel3D(labelId, gx + V[0] + lr * Math.cos(mid), gy + V[1] + lr * Math.sin(mid), 0.05,
      text, { color: colorCss, fontSize: 17, fadeIn: growDur })
  }

  return new Promise(resolve => {
    const t0 = performance.now()
    const ease = x => x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x
    ;(function tick() {
      if (!group.parent) { resolve(); return }
      const p = Math.min((performance.now() - t0) / growDur, 1)
      const e = ease(p)
      group.scale.set(e, e, 1)
      fillMat.opacity = 0.35 * e
      rimMat.opacity  = 0.95 * e
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })
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
    const dur = animMs(520)
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

// ── Box dimensions/corners/edges/faces — shared by face + edge highlighting
// on VOLUMETRIC (non-flat) shapes. Only box-shaped solids (cube, rectangular
// prism) have well-defined flat faces and straight edges this way; curved
// solids (sphere, cone, cylinder, torus) and other polyhedra aren't supported.
const BOX_VOL_TYPES = new Set(['cube', 'prism', 'box', 'rectangular-prism'])

function getBoxDims(entry) {
  if (entry.type === 'cube') { const s = entry.a ?? 2; return [s, s, s] }
  return [entry.a ?? 3, entry.b ?? 2, entry.c ?? 1.5]
}

function boxCorners(hw, hh, hd) {
  return [
    [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd], // back  (z=-hd): 0,1,2,3
    [-hw, -hh,  hd], [hw, -hh,  hd], [hw, hh,  hd], [-hw, hh,  hd], // front (z=+hd): 4,5,6,7
  ]
}

const BOX_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],   // back face
  [4, 5], [5, 6], [6, 7], [7, 4],   // front face
  [0, 4], [1, 5], [2, 6], [3, 7],   // connecting edges
]

// 6 faces, corner indices wound so the normal points outward
const BOX_FACES = [
  { corners: [1, 2, 6, 5], normal: [1, 0, 0] },   // +X right
  { corners: [0, 4, 7, 3], normal: [-1, 0, 0] },  // -X left
  { corners: [3, 7, 6, 2], normal: [0, 1, 0] },   // +Y top
  { corners: [0, 1, 5, 4], normal: [0, -1, 0] },  // -Y bottom
  { corners: [4, 5, 6, 7], normal: [0, 0, 1] },   // +Z front
  { corners: [0, 3, 2, 1], normal: [0, 0, -1] },  // -Z back
]

function highlightEdgeVolumetric(display, id, entry, edgeIndex, colorRaw) {
  const [w, h, d] = getBoxDims(entry)
  const pts = boxCorners(w / 2, h / 2, d / 2)
  const i   = ((Number(edgeIndex) || 0) % 12 + 12) % 12
  const [ai, bi] = BOX_EDGES[i]
  const [x1, y1, z1] = pts[ai], [x2, y2, z2] = pts[bi]
  const color = resolveHex(colorRaw)
  const hlId  = `eh3_${id}_${i}`
  removeChildFromGroup(display, id, hlId)

  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
  const dir = new THREE.Vector3(dx, dy, dz).normalize()
  const mid = new THREE.Vector3((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2)

  const radius = 0.035
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 10),
    new THREE.MeshBasicMaterial({ color }),
  )
  mesh.position.copy(mid)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  mesh.scale.set(0.001, 0, 0.001)
  addChildToGroup(display, id, hlId, mesh)

  return new Promise(resolve => {
    const t0 = performance.now(), dur = animMs(380)
    const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    function tick() {
      const t = Math.min((performance.now() - t0) / dur, 1)
      const s = ease(t)
      mesh.scale.set(1, s, 1)
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

export function removeEdgeHighlight3D(threeRef, id, edgeIndex) {
  const display = threeRef?.current
  if (!display) return
  const entry = registry.get(id)
  if (entry && !entry.isFlat) {
    const i = ((Number(edgeIndex) || 0) % 12 + 12) % 12
    removeChildFromGroup(display, id, `eh3_${id}_${i}`)
    return
  }
  const n = entry?.vertices?.length ?? 1
  const i = ((Number(edgeIndex) || 0) % n + n) % n
  removeChildFromGroup(display, id, `eh_${id}_${i}`)
}

// Highlight one flat FACE of a box-shaped volumetric solid (cube / rectangular
// prism) — a translucent colored panel laid exactly on that face.
export function highlightFace3D(threeRef, id, faceIndexRaw, colorRaw = 'orange') {
  const display = threeRef?.current
  if (!display) return Promise.resolve()
  const entry = registry.get(id)
  if (!entry || entry.isFlat || !BOX_VOL_TYPES.has(entry.type)) {
    console.warn(`[highlightFace3D] Face highlighting only supports cube/prism shapes (got "${entry?.type}")`)
    return Promise.resolve()
  }
  const [w, h, d] = getBoxDims(entry)
  const pts  = boxCorners(w / 2, h / 2, d / 2)
  const i    = ((Number(faceIndexRaw) || 0) % 6 + 6) % 6
  const face = BOX_FACES[i]
  const color = resolveHex(colorRaw)
  const hlId  = `fh_${id}_${i}`
  removeChildFromGroup(display, id, hlId)

  const offset = 0.015
  const [nx, ny, nz] = face.normal
  const offsetPt = ([x, y, z]) => [x + nx * offset, y + ny * offset, z + nz * offset]
  const [p0, p1, p2, p3] = face.corners.map(ci => offsetPt(pts[ci]))

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    ...p0, ...p1, ...p2,
    ...p0, ...p2, ...p3,
  ], 3))
  const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geo, mat)
  addChildToGroup(display, id, hlId, mesh)

  return new Promise(resolve => {
    const t0 = performance.now(), dur = animMs(380)
    function tick() {
      const t = Math.min((performance.now() - t0) / dur, 1)
      mat.opacity = 0.55 * t
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

export function removeFaceHighlight3D(threeRef, id, faceIndexRaw) {
  const display = threeRef?.current
  if (!display) return
  const i = ((Number(faceIndexRaw) || 0) % 6 + 6) % 6
  removeChildFromGroup(display, id, `fh_${id}_${i}`)
}

export function highlightEdge3D(threeRef, id, edgeIndex, colorRaw = 'orange') {
  const display = threeRef?.current
  if (!display) return Promise.resolve()

  const entry = registry.get(id)
  if (!entry) return Promise.resolve()
  if (!entry.isFlat) return highlightEdgeVolumetric(display, id, entry, edgeIndex, colorRaw)
  if (!entry.vertices?.length) return Promise.resolve()

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
    const dur = animMs(420)
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

/**
 * A polygon given its corners outright.
 *
 * S2c builds from a TYPE and side lengths, which covers the shapes a lesson
 * names ("a trapezoid", "a right triangle"). It cannot express the figure a
 * textbook problem draws — two triangles sharing a vertex, a quadrilateral
 * that is nobody's named shape. Those are given by their corners, so this
 * takes corners: "x,y;x,y;…", in order, not closed (the last joins the first).
 *
 * Two points make a segment, three or more a polygon. The result is an
 * ordinary registry entry — S2l, S2a, S2n, S2s, S2tk and [id]N all work on it.
 */
export function createPolygonFromPoints3D(threeRef, id, pointsRaw, opts = {}) {
  const display = threeRef?.current
  if (!display?.isReady()) return

  const vertices = (Array.isArray(pointsRaw) ? pointsRaw : String(pointsRaw).split(";"))
    .map(s => String(s).trim()).filter(Boolean)
    .map(pair => {
      const [x, y] = pair.split(",").map(v => Number(String(v).trim()))
      if (!isFinite(x) || !isFinite(y)) throw new Error(`Point invalide : "${pair}" — attendu "x,y"`)
      return [r4(x), r4(y)]
    })
  if (vertices.length < 2) throw new Error("polygon : au moins 2 points (2 = segment, 3+ = polygone)")
  // Centred on its centre of gravity, like every shape Create 2D Shape builds.
  // Coordinates get copied from the problem as it is written — 0,0 at a corner
  // — and the figure still has to land in the middle of the canvas. Only the
  // position moves: the shape and its proportions are exactly as typed.
  const centred = centerVertices(vertices)
  for (let i = 0; i < vertices.length; i++) vertices[i] = centred[i]

  const hexColor = resolveHex(opts.color ?? 'blue')
  display.setDisplayMode("2d")
  const group = buildFlatGroupFromVerts(vertices, hexColor, {
    fillOpacity: vertices.length === 2 ? 0 : (opts.fillOpacity ?? 0.3),
  })
  display.addObject(id, group)
  registry.set(id, {
    type: vertices.length === 2 ? 'segment' : 'polygon',
    isFlat: true, vertices, isCircle: false, radius: null,
    values: [], opts, edgeColors: {},
  })
  display.fitView2D?.()
}

/**
 * A shape whose corners are pinned to a shape that already exists.
 *
 * createShape3D builds from side lengths and centres the result on itself,
 * which is exactly wrong for a figure whose parts have to touch: a triangle cut
 * by a line parallel to one side, a median, a segment along part of an edge.
 * Two centred shapes can never meet. A snapped shape takes its corners from the
 * parent instead, so it lands exactly where the problem's numbers put it.
 *
 * Each anchor is one of:
 *   vN     — corner N of the parent
 *   eN@t   — fraction t (0..1) along parent edge N, from corner N toward N+1
 *   eN:d   — d units along parent edge N, measured from corner N
 * Two anchors give a segment, three or more a polygon; either way the result is
 * an ordinary registry entry, so every other function works on it after.
 */
export function snapShape3D(threeRef, id, parentId, anchors, opts = {}) {
  const display = threeRef?.current
  if (!display?.isReady()) return
  const parent = registry.get(parentId)
  if (!parent?.vertices?.length) throw new Error(`snapShape : forme "${parentId}" introuvable`)

  const list = (Array.isArray(anchors) ? anchors : String(anchors).split(","))
    .map(a => String(a).trim()).filter(Boolean)
  if (list.length < 2) throw new Error("snapShape : au moins 2 ancrages (2 = segment, 3+ = polygone)")

  const vertices = list.map(a => {
    const pt = resolveShapePoint(parentId, a)
    if (!pt) throw new Error(`Ancrage invalide : "${a}" — attendu vN, eN@fraction ou eN:distance`)
    return [r4(pt[0]), r4(pt[1])]
  })

  const hexColor = resolveHex(opts.color ?? 'blue')
  display.setDisplayMode("2d")
  // A segment has no inside; filling two points draws nothing anyway, but a
  // fill opacity left on would tint a 3+ point shape by surprise.
  const group = buildFlatGroupFromVerts(vertices, hexColor, {
    fillOpacity: vertices.length === 2 ? 0 : (opts.fillOpacity ?? 0.3),
  })
  display.addObject(id, group)
  registry.set(id, {
    type: vertices.length === 2 ? 'segment' : 'polygon',
    isFlat: true, vertices, isCircle: false, radius: null,
    values: [], opts, edgeColors: {}, snappedTo: parentId,
  })
  display.fitView2D?.()
}

/**
 * Letters on the CORNERS (A, B, C…), the way a textbook figure names them — as
 * opposed to labelSides3D, which names the edges between them. A blank or "-"
 * entry skips that corner, which is what you want wherever two shapes meet: the
 * shared corner is named once instead of twice on top of itself.
 */
export function nameVertices3D(threeRef, id, names = [], opts = {}) {
  const display = threeRef?.current
  const entry = registry.get(id)
  if (!display || !entry?.vertices?.length) return

  const verts = entry.vertices
  // A SNAPPED shape has every corner sitting on its parent's outline, so "away
  // from this shape" points straight back INTO the parent — the letters end up
  // under the figure instead of beside the points they name. Push away from the
  // parent in that case; a shape standing on its own pushes away from itself.
  const outFrom = registry.get(entry.snappedTo)?.vertices?.length
    ? registry.get(entry.snappedTo).vertices
    : verts
  const cx = outFrom.reduce((s, v) => s + v[0], 0) / outFrom.length
  const cy = outFrom.reduce((s, v) => s + v[1], 0) / outFrom.length
  const color = opts.color
    ? `#${resolveHex(opts.color).toString(16).padStart(6, '0')}`
    : '#e8e8e8'

  // Pinned to the corner itself and pushed outward in SCREEN pixels, so a name
  // stays beside its point whatever the size of the figure and the zoom.
  const OFF_PX = 17
  verts.forEach((v, i) => {
    const raw = names[i] !== undefined ? String(names[i]).trim() : ''
    if (!raw || raw === '-') { display.removeLabel3D(`vn_${id}_${i}`); return }
    let dx = v[0] - cx, dy = v[1] - cy
    const m = Math.hypot(dx, dy) || 1
    display.addLabel3D(`vn_${id}_${i}`, r4(v[0]), r4(v[1]), 0.1,
      raw, { color, fontSize: opts.fontSize ?? 17, offsetPx: [(dx / m) * OFF_PX, (dy / m) * OFF_PX] })
  })
}

export function unnameVertices3D(threeRef, id) {
  const display = threeRef?.current
  if (!display) return
  for (let i = 0; i < 30; i++) display.removeLabel3D(`vn_${id}_${i}`)
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

// ── Show Volume Measures (volumetric 3D shapes) ───────────────────────────────
// Draws one small solid/dashed 3D line per dimension actually needed for that
// shape's VOLUME formula, with a label at its midpoint — same idea as
// showAreaMeasures3D/gM for flat shapes (solid line = a straight measurable
// side, dashed line = a height, matching the 2D convention), but for the
// rotatable solids created via geo3d-create. Lines are parented to the shape's
// own group in LOCAL coordinates (so they inherit its position automatically,
// same pattern as highlightEdgeVolumetric); labels use world coordinates
// (group position + local offset), same pattern as labelEdge3D.
function makeLineMesh3D(p1, p2, hex, radius = 0.035) {
  const [x1, y1, z1] = p1, [x2, y2, z2] = p2
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
  const dir = new THREE.Vector3(dx, dy, dz).normalize()
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 10),
    // depthTest off + high renderOrder: these lines often run THROUGH the
    // shape's interior (e.g. a cylinder/cone's height along its central
    // axis), which would otherwise get hidden behind the shape's own
    // (nominally translucent, but depth-writing) surface.
    new THREE.MeshBasicMaterial({ color: hex, depthTest: false }),
  )
  mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  mesh.renderOrder = 999
  return mesh
}

// Perimeter trace for a flat circle — sweeps a solid highlight ring starting
// from the SAME point the radius line touches (opts.angle, matching
// showAreaMeasures3D/showPerimeterMeasures3D) all the way around back to
// itself, so "here's r" is immediately followed by "and here's what going
// all the way around looks like" — the actual perimeter, not just its formula
// ingredient. Rebuilds the shown arc from scratch each frame (cheap — a
// one-off reveal, not a persistent per-frame cost) the same way animateAngleArc
// already does for its own growing sector.
function animateCirclePerimeterTrace3D(display, parentId, r, startAngle, hex, duration = 1.2) {
  return new Promise(resolve => {
    const childId = `pTrace_${parentId}`
    const segN = 72
    const t0 = performance.now()

    function tick() {
      const t = Math.min((performance.now() - t0) / animMs(duration * 1000), 1)
      const shown = Math.max(1, Math.round(segN * t))
      const group = new THREE.Group()
      for (let i = 0; i < shown; i++) {
        const a1 = startAngle + (i / segN) * Math.PI * 2
        const a2 = startAngle + ((i + 1) / segN) * Math.PI * 2
        const p1 = [r * Math.cos(a1), r * Math.sin(a1), 0.07]
        const p2 = [r * Math.cos(a2), r * Math.sin(a2), 0.07]
        group.add(makeLineMesh3D(p1, p2, hex, 0.03))
      }
      addChildToGroup(display, parentId, childId, group)
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

function makeDashedLineGroup3D(p1, p2, hex, radius = 0.03, dashN = 6) {
  const [x1, y1, z1] = p1, [x2, y2, z2] = p2
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
  const dir = new THREE.Vector3(dx, dy, dz).normalize()
  const segLen = len / (dashN * 2 - 1)
  const group = new THREE.Group()
  const start = new THREE.Vector3(x1, y1, z1)
  for (let i = 0; i < dashN; i++) {
    const t0 = i * segLen * 2
    const sp = start.clone().addScaledVector(dir, t0)
    const ep = start.clone().addScaledVector(dir, t0 + segLen)
    group.add(makeLineMesh3D([sp.x, sp.y, sp.z], [ep.x, ep.y, ep.z], hex, radius))
  }
  return group
}

export function showVolumeMeasures3D(threeRef, id, opts = {}) {
  const display = threeRef?.current
  if (!display) return
  const entry = registry.get(id)
  if (!entry || entry.isFlat) return

  const { type, a, b, c } = entry
  // Reserved light blue (#60a5fa) — the app-wide convention for measurement/
  // highlight overlays (see palette.js SYS.blue). Never orange or anything
  // else here, so every measurement reads consistently.
  const hex   = opts.color ? resolveHex(opts.color) : 0x60a5fa
  const color = `#${hex.toString(16).padStart(6, '0')}`
  const fmt   = v => parseFloat((v ?? 0).toFixed(2))

  const holder = new THREE.Group()
  const labels = []  // { pos: [x,y,z] (local), text }
  const mid = (p1, p2, off = [0, 0, 0]) => [
    (p1[0] + p2[0]) / 2 + off[0], (p1[1] + p2[1]) / 2 + off[1], (p1[2] + p2[2]) / 2 + off[2],
  ]
  // Every measure line is dashed — never a solid overlay, consistently across
  // every dimension (edge, radius, height, depth). Thicker than the default
  // 0.03 radius (bumped after it read as barely visible against the shape).
  const addSolid  = (p1, p2) => holder.add(makeDashedLineGroup3D(p1, p2, hex, 0.05))
  const addDashed = (p1, p2) => holder.add(makeDashedLineGroup3D(p1, p2, hex, 0.05))

  switch (type) {
    case 'cube': {
      const s = a ?? 2, h2 = s / 2
      const p1 = [-h2, -h2, h2], p2 = [h2, -h2, h2]
      addSolid(p1, p2)
      labels.push({ pos: mid(p1, p2, [0, -0.32, 0]), text: `a = ${fmt(s)}` })
      break
    }
    case 'sphere': {
      const r = a ?? 1.5
      const p1 = [0, 0, 0], p2 = [r, 0, 0]
      addSolid(p1, p2)
      labels.push({ pos: mid(p1, p2, [0, 0.3, 0]), text: `r = ${fmt(r)}` })
      break
    }
    case 'cone':
    case 'cylinder': {
      const r = a ?? (type === 'cone' ? 1.2 : 1), h = b ?? 2.5
      const baseY = -h / 2, topY = h / 2
      const rp1 = [0, baseY, 0], rp2 = [r, baseY, 0]
      addSolid(rp1, rp2)
      labels.push({ pos: mid(rp1, rp2, [0, -0.32, 0]), text: `r = ${fmt(r)}` })
      // Height runs straight up the central axis (matches how h is drawn in
      // a textbook cross-section) rather than offset along the visible edge.
      const hp1 = [0, baseY, 0], hp2 = [0, topY, 0]
      addDashed(hp1, hp2)
      labels.push({ pos: mid(hp1, hp2, [0.35, 0, 0]), text: `h = ${fmt(h)}` })
      break
    }
    case 'prism': case 'box': case 'rectangular-prism': {
      // BoxGeometry(width, height, depth) → a = X (width/length), b = Y
      // (height), c = Z (depth) — matches the true Three.js axis convention.
      const w = a ?? 3, hgt = b ?? 2, d = c ?? 1.5
      const hw = w / 2, hh = hgt / 2, hd = d / 2
      const l1 = [-hw, -hh, hd], l2 = [hw, -hh, hd]
      addSolid(l1, l2)
      labels.push({ pos: mid(l1, l2, [0, -0.32, 0]), text: `l = ${fmt(w)}` })
      const hp1 = [hw, -hh, hd], hp2 = [hw, hh, hd]
      addDashed(hp1, hp2)
      labels.push({ pos: mid(hp1, hp2, [0.38, 0, 0]), text: `h = ${fmt(hgt)}` })
      const d1 = [hw, -hh, hd], d2 = [hw, -hh, -hd]
      addSolid(d1, d2)
      labels.push({ pos: mid(d1, d2, [0.38, -0.2, 0]), text: `d = ${fmt(d)}` })
      break
    }
    case 'pyramid': case 'square-pyramid': {
      const side = a ?? 2, h = b ?? 2.5
      const baseY = -h / 2, topY = h / 2
      // Built via ConeGeometry(radius=side*sqrt2/2, height, radialSegments=4)
      // — its 4 base vertices sit at angles 0/90/180/270°, i.e. (0,±R) and
      // (±R,0), NOT (±side/2,0)&(0,±side/2). A true edge runs between two
      // ADJACENT ones, e.g. (0,R) → (R,0); that edge's length is exactly
      // "side" — the old (-side/2,0)→(side/2,0) line was a chord through
      // the interior, not a real edge (hence the "diagonal" look).
      const R = side * Math.SQRT2 / 2
      const bp1 = [0, baseY, R], bp2 = [R, baseY, 0]
      addSolid(bp1, bp2)
      labels.push({ pos: mid(bp1, bp2, [0, -0.32, 0.15]), text: `a = ${fmt(side)}` })
      // Height runs from the base center straight up to the apex (which sits
      // exactly here), matching the textbook convention — not offset to a side.
      const hp1 = [0, baseY, 0], hp2 = [0, topY, 0]
      addDashed(hp1, hp2)
      labels.push({ pos: mid(hp1, hp2, [0.35, 0, 0]), text: `h = ${fmt(h)}` })
      break
    }
    case 'tetrahedron': {
      // TetrahedronGeometry(radius) vertices (before scaling) sit at
      // (±1,±1,±1) with even sign-parity, each normalized then scaled by
      // radius — i.e. real vertex = radius/√3 · (raw). Any two of the 4 are
      // a genuine edge (a tetrahedron's vertices are pairwise connected).
      const R = a ?? 1.8
      const k = R / Math.sqrt(3)
      const p1 = [k, k, k], p2 = [-k, -k, k]
      addSolid(p1, p2)
      const edge = Math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2 + (p1[2]-p2[2])**2)
      labels.push({ pos: mid(p1, p2, [0, 0.3, 0]), text: `a = ${fmt(edge)}` })
      break
    }
    case 'octahedron': {
      // OctahedronGeometry(radius) vertices sit exactly at (±radius,0,0),
      // (0,±radius,0), (0,0,±radius) — any two non-opposite ones (e.g.
      // (radius,0,0) & (0,radius,0)) are a genuine edge.
      const R = a ?? 1.6
      const p1 = [R, 0, 0], p2 = [0, R, 0]
      addSolid(p1, p2)
      const edge = Math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2 + (p1[2]-p2[2])**2)
      labels.push({ pos: mid(p1, p2, [0, 0.3, 0.15]), text: `a = ${fmt(edge)}` })
      break
    }
    case 'torus': {
      const R = a ?? 1.5, r = b ?? 0.4
      const p1 = [0, 0, 0], p2 = [R, 0, 0]
      addSolid(p1, p2)
      labels.push({ pos: mid(p1, p2, [0, 0.3, 0]), text: `R = ${fmt(R)}` })
      const p3 = [R, 0, 0], p4 = [R + r, 0, 0]
      addSolid(p3, p4)
      labels.push({ pos: mid(p3, p4, [0, -0.3, 0]), text: `r = ${fmt(r)}` })
      break
    }
    default:
      console.warn(`[showVolumeMeasures3D] Unknown volumetric shape type: "${type}"`)
      return
  }

  addChildToGroup(display, id, `vm_${id}`, holder)

  const group = display.getObject(id)
  const gx = group?.position.x ?? 0, gy = group?.position.y ?? 0, gz = group?.position.z ?? 0
  labels.forEach((l, i) => {
    display.addLabel3D(`vm_${id}_${i}`, gx + l.pos[0], gy + l.pos[1], gz + l.pos[2], l.text, { color, fontSize: 15, bold: true })
  })
}

export function removeVolumeMeasures3D(threeRef, id) {
  const display = threeRef?.current
  if (!display) return
  removeChildFromGroup(display, id, `vm_${id}`)
  for (let i = 0; i < 5; i++) display.removeLabel3D(`vm_${id}_${i}`)
}

// ── Live shape-value getters ──────────────────────────────────────────────────
// Mirror geometryEngine.js's getSideLengths/getShapeHeight/getShapeRadius/
// getVertexAngle, but reading THIS (Three.js flat-shape) registry — so a
// comment/text box's [shapeId]N / [shapeId]h / [shapeId]r / [shapeId]aN geo-ref
// resolves correctly for shapes made with geo3d-create-2d too, not just the
// legacy geo-create-polygon ones.

export function getSideLengths3D(id) {
  const entry = registry.get(id)
  if (!entry?.vertices) return []
  return entry.vertices.map((_, i) => sideLength3D(entry.vertices, i))
}

export function getShapeHeight3D(id) {
  const entry = registry.get(id)
  if (!entry) return undefined
  if (entry.isCircle) return parseFloat(((entry.radius ?? 0) * 2).toFixed(4))
  if (!entry.vertices?.length) return undefined
  return shapeHeight3D(entry.vertices)
}

export function getShapeRadius3D(id) {
  const entry = registry.get(id)
  return entry?.isCircle ? parseFloat((entry.radius ?? 0).toFixed(4)) : undefined
}

export function getVertexAngle3D(id, i) {
  const entry = registry.get(id)
  if (!entry?.vertices?.length) return undefined
  const vs = entry.vertices, n = vs.length
  const idx  = ((i % n) + n) % n
  const curr = vs[idx], prev = vs[(idx + n - 1) % n], next = vs[(idx + 1) % n]
  const a = [prev[0] - curr[0], prev[1] - curr[1]]
  const b = [next[0] - curr[0], next[1] - curr[1]]
  const ma = Math.hypot(a[0], a[1]), mb = Math.hypot(b[0], b[1])
  if (!ma || !mb) return undefined
  let c = (a[0] * b[0] + a[1] * b[1]) / (ma * mb)
  c = Math.max(-1, Math.min(1, c))
  return parseFloat((Math.acos(c) * 180 / Math.PI).toFixed(4))
}

// Live value getter for a VOLUMETRIC 3D solid (geo3d-create, entry.isFlat
// false) — token names match exactly the letters showVolumeMeasures3D labels
// on screen for that shape type, so `[shapeId]token` always agrees with what
// the student actually sees. Tetrahedron/octahedron derive the shown edge
// length from the raw radius parameter the same way showVolumeMeasures3D
// does (see the case there) — duplicated here rather than shared because
// the derivation is a one-line formula, not worth threading through a
// render-only helper.
export function get3DShapeValue(id, token) {
  const entry = registry.get(id)
  if (!entry || entry.isFlat) return undefined
  const { type, a, b, c } = entry
  switch (type) {
    case 'cube':
      return token === 'a' ? (a ?? 2) : undefined
    case 'sphere':
      return token === 'r' ? (a ?? 1.5) : undefined
    case 'cone':
      return token === 'r' ? (a ?? 1.2) : token === 'h' ? (b ?? 2.5) : undefined
    case 'cylinder':
      return token === 'r' ? (a ?? 1) : token === 'h' ? (b ?? 2.5) : undefined
    case 'prism': case 'box': case 'rectangular-prism':
      return token === 'l' ? (a ?? 3) : token === 'h' ? (b ?? 2) : token === 'd' ? (c ?? 1.5) : undefined
    case 'pyramid': case 'square-pyramid':
      return token === 'a' ? (a ?? 2) : token === 'h' ? (b ?? 2.5) : undefined
    case 'tetrahedron':
      return token === 'a' ? (a ?? 1.8) * 2 * Math.sqrt(2 / 3) : undefined
    case 'octahedron':
      return token === 'a' ? (a ?? 1.6) * Math.SQRT2 : undefined
    case 'torus':
      return token === 'R' ? (a ?? 1.5) : token === 'r' ? (b ?? 0.4) : undefined
    default:
      return undefined
  }
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
    // "e1" is the midpoint, as it always was. "e1@0.4" is 40% along the edge
    // and "e1:7.2" is 7.2 units along it — the two forms snapping needs, so a
    // shape can be pinned where the problem actually puts the point.
    const m = /^e(\d+)(?:([@:])(-?\d*\.?\d+))?$/.exec(s)
    if (!m) return null
    const idx = Number(m[1])
    const [x1, y1] = verts[idx % n]
    const [x2, y2] = verts[(idx + 1) % n]
    if (!m[2]) return [(x1 + x2) / 2, (y1 + y2) / 2]
    const dx = x2 - x1, dy = y2 - y1
    // ':' is a distance, so it has to be divided by the edge's real length to
    // become the fraction '@' states outright. A zero-length edge would make
    // that a division by zero — fall back to the start of the edge.
    const len = Math.hypot(dx, dy)
    const t = m[2] === '@' ? Number(m[3]) : (len ? Number(m[3]) / len : 0)
    return [x1 + dx * t, y1 + dy * t]
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

  // Thickness and head from the figure's size (see figureScale), for the same
  // reason as the ticks: in world units they grew fat when the view zoomed in.
  const scale   = figureScale(id)
  const halfT   = scale * 0.0056      // shaft half-thickness
  const headLen = Math.min(scale * 0.052, length * 0.20)
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
    const dur = animMs(260)
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
    removeChildFromGroup(display, id, `eh3_${id}_${i}`)
    display.resetLabelColor?.(`sl_${id}_${i}`)
    display.removeLabel3D?.(`angval_${id}_${i}`)
  }
  for (const m of entry?.angleMarks ?? []) {
    removeChildFromGroup(display, id, `mang_${id}_${m}`)
    display.removeLabel3D?.(`mangl_${id}_${m}`)
  }
  if (entry) entry.angleMarks = new Set()
  for (let i = 0; i < 6; i++) removeChildFromGroup(display, id, `fh_${id}_${i}`)
}

export function setView3D(threeRef, opts = {}) {
  threeRef?.current?.adjustView3D(opts)
  const dur = animMs((opts.duration ?? 0.8) * 1000)
  return new Promise(r => setTimeout(r, dur))
}
