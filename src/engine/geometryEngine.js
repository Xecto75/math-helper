/**
 * Geometry Engine — drives GeometryDisplay (SVG canvas).
 * All functions receive geoRef (a React ref to GeometryDisplay) as first arg.
 * Module-level registry tracks shape data for move / label operations.
 */

import gsap from 'gsap'
import { resolveColor } from './palette.js'
import * as threeGeo from './threeEngine.js'

const registry = new Map()
const r4 = n => Math.round(n * 10000) / 10000

function rgbToHex([r, g, b]) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function centerVertices(verts) {
  const cx = verts.reduce((s, v) => s + v[0], 0) / verts.length
  const cy = verts.reduce((s, v) => s + v[1], 0) / verts.length
  return verts.map(([x, y]) => [r4(x - cx), r4(y - cy)])
}

function calcVertices(type, values) {
  switch (type) {
    case 'triangle': {
      const [a, b, c] = values
      const cosA = (a * a + c * c - b * b) / (2 * a * c)
      if (cosA < -1 || cosA > 1) throw new Error(`Triangle invalide : côtés ${a}, ${b}, ${c}`)
      return [[0, 0], [a, 0], [c * cosA, c * Math.sqrt(1 - cosA * cosA)]]
    }
    case 'right-triangle': {
      const [a, b] = values  // right angle at bottom-right
      return [[0, 0], [a, 0], [a, b]]
    }
    case 'rectangle': {
      const [w, h] = values
      return [[0, 0], [w, 0], [w, h], [0, h]]
    }
    case 'square': {
      const s = values[0]
      return [[0, 0], [s, 0], [s, s], [0, s]]
    }
    case 'parallelogram': {
      const [w, h, dx = w * 0.25] = values
      return [[0, 0], [w, 0], [w + dx, h], [dx, h]]
    }
    case 'trapeze': {
      const [a, b, h] = values
      const offset = (b - a) / 2
      return [[0, 0], [b, 0], [b - offset, h], [offset, h]]
    }
    case 'pentagon':
    case 'hexagon':
    case 'octagon':
    case 'regular-polygon': {
      const n = type === 'regular-polygon' ? Math.round(values[0])
              : type === 'pentagon'        ? 5
              : type === 'hexagon'         ? 6 : 8
      const s = type === 'regular-polygon' ? values[1] : values[0]
      const R = s / (2 * Math.sin(Math.PI / n))
      return Array.from({ length: n }, (_, i) => {
        const a = (2 * Math.PI * i / n) - Math.PI / 2
        return [R * Math.cos(a), R * Math.sin(a)]
      })
    }
    default:
      throw new Error(`Type inconnu : "${type}"`)
  }
}

function autoFitViewport(display, verts, padding = 2) {
  let xMin = Math.min(...verts.map(v => v[0])) - padding
  let xMax = Math.max(...verts.map(v => v[0])) + padding
  let yMin = Math.min(...verts.map(v => v[1])) - padding
  let yMax = Math.max(...verts.map(v => v[1])) + padding
  const w = xMax - xMin, h = yMax - yMin
  if (w / h < 4 / 3) { const e = (4 / 3) * h - w; xMin -= e / 2; xMax += e / 2 }
  else               { const e = (3 / 4) * w - h; yMin -= e / 2; yMax += e / 2 }
  display.setViewport(r4(xMin), r4(xMax), r4(yMin), r4(yMax))
}

// Fit viewport to ALL shapes currently in the registry
function autoFitAll(display, padding = 1.5) {
  const all = []
  for (const e of registry.values()) {
    if (e.bboxVerts) all.push(...e.bboxVerts)
  }
  if (all.length > 0) autoFitViewport(display, all, padding)
}

// ── Exported functions ────────────────────────────────────────────────────────

export function getShapeIds() {
  return [...registry.keys()]
}

// Returns the computed Euclidean length of each side, in order. Falls back to
// the Three.js flat-shape registry (geo3d-create-2d) if the id isn't one of
// this engine's own (legacy geo-create-polygon) shapes.
export function getSideLengths(id) {
  const entry = registry.get(id)
  if (!entry?.vertices) return threeGeo.getSideLengths3D(id)
  const verts = entry.vertices
  return verts.map((v, i) => {
    const next = verts[(i + 1) % verts.length]
    return r4(Math.sqrt((next[0] - v[0]) ** 2 + (next[1] - v[1]) ** 2))
  })
}

// Vertical extent of a shape (top to bottom) = its height. Diameter for circles.
export function getShapeHeight(id) {
  const entry = registry.get(id)
  if (!entry) return threeGeo.getShapeHeight3D(id)
  if (entry.type === 'circle') return r4(entry.r * 2)
  if (!entry.vertices?.length) return undefined
  const ys = entry.vertices.map(v => v[1])
  return r4(Math.max(...ys) - Math.min(...ys))
}

// Circle radius (undefined for non-circles).
export function getShapeRadius(id) {
  const entry = registry.get(id)
  if (!entry) return threeGeo.getShapeRadius3D(id)
  return entry.type === 'circle' ? r4(entry.r) : undefined
}

// Interior angle (degrees) at vertex i of a polygon — the real measured angle,
// so labels never have to guess acute/right/obtuse.
export function getVertexAngle(id, i) {
  const entry = registry.get(id)
  if (!entry?.vertices?.length) return threeGeo.getVertexAngle3D(id, i)
  const vs = entry.vertices, n = vs.length
  const idx  = ((i % n) + n) % n
  const curr = vs[idx], prev = vs[(idx + n - 1) % n], next = vs[(idx + 1) % n]
  const a = [prev[0] - curr[0], prev[1] - curr[1]]
  const b = [next[0] - curr[0], next[1] - curr[1]]
  const ma = Math.hypot(a[0], a[1]), mb = Math.hypot(b[0], b[1])
  if (!ma || !mb) return undefined
  let c = (a[0] * b[0] + a[1] * b[1]) / (ma * mb)
  c = Math.max(-1, Math.min(1, c))
  return r4(Math.acos(c) * 180 / Math.PI)
}

export function serializeRegistry() {
  const out = {}
  for (const [id, entry] of registry) {
    out[id] = { ...entry, bboxVerts: entry.bboxVerts.map(v => [...v]) }
  }
  return out
}

export function restoreRegistryOnly(data) {
  registry.clear()
  for (const [id, entry] of Object.entries(data)) {
    registry.set(id, { ...entry })
  }
}

export function restoreAndRedraw(geoRef, data) {
  registry.clear()
  const display = geoRef?.current
  if (!display) return
  for (const [id, entry] of Object.entries(data)) {
    registry.set(id, { ...entry })
    if (entry.type === 'circle') {
      display.drawCircle(id, 0, 0, entry.r, entry.style)
    } else {
      display.drawPolygon(id, entry.vertices, entry.style)
    }
  }
  autoFitAll(display)
}

export function createPolygon(geoRef, id, type, values, opts = {}) {
  const display = geoRef?.current
  if (!display?.isReady()) return

  const hexColor = rgbToHex(opts.color ?? [100, 149, 237])
  // Optional separate fill (inside) and border (perimeter) colors.
  // Accept color names or hex; fall back to the base color for either.
  const fillHex   = opts.fillColor   ? resolveColor(opts.fillColor)   : hexColor
  const strokeHex = opts.borderColor ? resolveColor(opts.borderColor) : hexColor
  const style = {
    fill:        fillHex,
    fillOpacity: opts.fillOpacity ?? 0.15,
    stroke:      strokeHex,
    strokeWidth: opts.thickness ?? 2,
  }

  if (type === 'circle') {
    const r = values[0]
    display.drawCircle(id, 0, 0, r, style)
    const bboxVerts = [[-r, -r], [r, -r], [r, r], [-r, r]]
    registry.set(id, { type: 'circle', r, style, bboxVerts })
    if (opts.autoFit !== false) autoFitAll(display)
    return
  }

  let vertices = centerVertices(calcVertices(type, values))
  if (opts.flipX) vertices = vertices.map(([x, y]) => [r4(-x), y])
  if (opts.flipY) vertices = vertices.map(([x, y]) => [x, r4(-y)])
  display.drawPolygon(id, vertices, style)
  registry.set(id, { type, vertices, style, bboxVerts: vertices })
  if (opts.autoFit !== false) autoFitAll(display)
}

export function eraseShape(geoRef, id) {
  const display = geoRef?.current
  if (!display) return
  display.removeShape(id)
  display.removeShape(`radius__${id}`)
  for (let i = 1; i <= 30; i++) display.removeLabel(`sl${id}_${i}`)
  display.removeLabel(`tx${id}`)
  display.removeLabel(`radlbl__${id}`)
  registry.delete(id)
  autoFitAll(display)
}

export function moveShape(geoRef, id, dx, dy) {
  const entry = registry.get(id)
  if (!entry?.vertices) return Promise.resolve()
  const display = geoRef?.current
  if (!display) return Promise.resolve()
  const startVerts = entry.vertices
  const endVerts   = entry.vertices.map(([x, y]) => [r4(x + dx), r4(y + dy)])
  entry.vertices  = endVerts
  entry.bboxVerts = endVerts
  return display.animatePolygon(id, startVerts, endVerts, 0.5)
}

// Pulse stroke + fill opacity without changing color — avoids dark fade artifact.
export function highlightShape(geoRef, id) {
  const display = geoRef?.current
  if (!display) return Promise.resolve()
  const entry = registry.get(id)
  const origOpacity = entry?.style?.fillOpacity ?? 0.15
  const origStroke  = entry?.style?.strokeWidth  ?? 2

  // Pop: thicker border + boosted fill opacity (same color, no hue change)
  display.setShapeStyle(id, { fillOpacity: Math.min(origOpacity + 0.3, 0.5), strokeWidth: 8 })

  return new Promise(resolve => {
    // Settle back to original — CSS transitions (0.9s fill-opacity, 0.3s stroke-width) handle smoothing.
    // Resolve while the fade-back is still in flight so the next step starts seamlessly
    // instead of leaving the shape sitting "done" for an extra beat.
    setTimeout(() => display.setShapeStyle(id, { fillOpacity: origOpacity, strokeWidth: origStroke }), 300)
    setTimeout(resolve, 800)
  })
}

// Fade the shape back to its original style.
export function unhighlightShape(geoRef, id) {
  const entry = registry.get(id)
  const display = geoRef?.current
  if (!display) return Promise.resolve()
  const original = entry?.style ?? { fill: '#60a5fa', stroke: '#60a5fa', fillOpacity: 0.15, strokeWidth: 2 }
  display.setShapeStyle(id, original)
  return new Promise(resolve => setTimeout(resolve, 1100))
}

export async function labelSides(geoRef, id, customLabels = []) {
  const entry = registry.get(id)
  if (!entry?.vertices) return
  const display = geoRef?.current
  if (!display) return

  const verts  = entry.vertices
  const vp     = display.getViewport() ?? { xMin: -8, xMax: 8 }
  const offset = (vp.xMax - vp.xMin) * 0.04

  // Build label data first. A blank entry falls back to the computed side length,
  // rounded to 1 decimal so legs like √13 show as "3.6" instead of "3.6056".
  const labels = verts.map((v, i) => {
    const custom    = customLabels[i] !== undefined ? String(customLabels[i]).trim() : ''
    const next      = verts[(i + 1) % verts.length]
    const mx        = (v[0] + next[0]) / 2
    const my        = (v[1] + next[1]) / 2
    const len       = parseFloat(Math.sqrt((next[0] - v[0]) ** 2 + (next[1] - v[1]) ** 2).toFixed(1))
    // "b =" (ending in =) auto-fills the computed length → "b = 10".
    // Blank → just the value. Otherwise the literal custom text.
    const labelText = custom === ''
      ? String(len)
      : custom.endsWith('=')
        ? `${custom.slice(0, -1).trim()} = ${len}`
        : custom
    const edgeDx    = next[0] - v[0], edgeDy = next[1] - v[1]
    const eLen      = Math.sqrt(edgeDx ** 2 + edgeDy ** 2) || 1
    const nx = -edgeDy / eLen, ny = edgeDx / eLen
    const sign = (mx * nx + my * ny) >= 0 ? 1 : -1
    // Outward normal direction; anchor the text AWAY from the shape so wide
    // labels on slanted/vertical sides grow outward instead of over the edge.
    const ox = sign * nx
    const anchor = ox > 0.35 ? 'start' : ox < -0.35 ? 'end' : 'middle'
    return {
      labelId:   `sl${id}_${i + 1}`,
      x:         r4(mx + sign * nx * offset),
      y:         r4(my + sign * ny * offset),
      text:      labelText,
      style:     { color: entry.edgeColors?.[i] ?? entry.style?.stroke ?? '#60a5fa', anchor },
    }
  })

  // Check if any of these labels already exist in the SVG DOM
  const existingEls = labels
    .map(l => document.getElementById(`lbl__${l.labelId}`))
    .filter(Boolean)

  if (existingEls.length > 0) {
    // Fade out existing labels, remove, re-add (triggers geoLabelIn animation)
    await new Promise(resolve => {
      gsap.to(existingEls, { opacity: 0, duration: 0.2, onComplete: resolve })
    })
    labels.forEach(l => display.removeLabel(l.labelId))
    // Tiny yield so React flushes the removals before re-adding
    await new Promise(resolve => setTimeout(resolve, 16))
  }

  labels.forEach(l => display.addLabel(l.labelId, l.x, l.y, l.text, l.style))
}

export function unlabelSides(geoRef, id) {
  const display = geoRef?.current
  if (!display) return
  for (let i = 1; i <= 30; i++) display.removeLabel(`sl${id}_${i}`)
}

// Resolve a measure label: blank → "<prefix> = <value>", "h =" → "h = <value>",
// otherwise the literal text.
function measureLabel(raw, value, prefix) {
  const c = raw !== undefined ? String(raw).trim() : ''
  if (c === '')          return `${prefix} = ${value}`
  if (c.endsWith('='))   return `${c.slice(0, -1).trim()} = ${value}`
  return c
}

// Draw a measurement line with a value label.
//   • circle  → radius line from centre to edge (opts.angle sets direction, default 35°)
//   • polygon → height line dropped vertically from the top vertex to the base
//   opts.color — line + label color (name or hex; defaults to base light blue)
//   opts.label — override text ("h =" auto-fills the value; blank uses "r/h = value")
export function showMeasure(geoRef, id, opts = {}) {
  const entry   = registry.get(id)
  const display = geoRef?.current
  if (!entry || !display) return Promise.resolve()

  const color  = opts.color ? resolveColor(opts.color) : '#60a5fa'
  const lineId = `radius__${id}`

  // ── Circle: radius ────────────────────────────────────────────────────────
  if (entry.type === 'circle') {
    const r     = entry.r
    const angle = (opts.angle ?? 35) * Math.PI / 180
    const ex    = r4(r * Math.cos(angle))
    const ey    = r4(r * Math.sin(angle))
    display.addEdgeHighlight(lineId, 0, 0, ex, ey, { color, strokeWidth: opts.thickness ?? 3 })

    const vp     = display.getViewport() ?? { xMin: -8, xMax: 8 }
    const offset = (vp.xMax - vp.xMin) * 0.03
    const nx = -Math.sin(angle), ny = Math.cos(angle)
    const mx = r4(ex / 2 + nx * offset)
    const my = r4(ey / 2 + ny * offset)
    display.addLabel(`radlbl__${id}`, mx, my, measureLabel(opts.label, r4(r), 'r'), { color })
    return display.animateEdgeHighlight(lineId, 0.5)
  }

  // ── Polygon: height (vertical drop between the two parallel sides) ────────
  const verts = entry.vertices
  if (!verts?.length) return Promise.resolve()
  const { x: rawX, topY, baseY } = pickHeightLineX(verts)
  const x     = r4(rawX)
  display.addEdgeHighlight(lineId, x, r4(topY), x, r4(baseY), { color, strokeWidth: opts.thickness ?? 3, dashed: true })

  const h      = parseFloat((topY - baseY).toFixed(1))
  const vp     = display.getViewport() ?? { xMin: -8, xMax: 8 }
  const offset = (vp.xMax - vp.xMin) * 0.02
  const mx     = r4(x - offset)   // sit just left of the line
  const my     = r4((topY + baseY) / 2)
  display.addLabel(`radlbl__${id}`, mx, my, measureLabel(opts.label, h, 'h'), { color, anchor: 'end' })
  return display.animateEdgeHighlight(lineId, 0.5)
}

// ── Shared helpers for showAreaMeasures ────────────────────────────────────────

// Label one specific edge (by index) with arbitrary text — same placement math
// as labelSides, but for a single side instead of all of them.
function labelEdge(display, entry, id, edgeIndex, text, color) {
  const verts = entry.vertices
  const v = verts[edgeIndex], next = verts[(edgeIndex + 1) % verts.length]
  const vp     = display.getViewport() ?? { xMin: -8, xMax: 8 }
  const offset = (vp.xMax - vp.xMin) * 0.04
  const mx = (v[0] + next[0]) / 2, my = (v[1] + next[1]) / 2
  const edgeDx = next[0] - v[0], edgeDy = next[1] - v[1]
  const eLen   = Math.sqrt(edgeDx ** 2 + edgeDy ** 2) || 1
  const nx = -edgeDy / eLen, ny = edgeDx / eLen
  const sign   = (mx * nx + my * ny) >= 0 ? 1 : -1
  const ox     = sign * nx
  const anchor = ox > 0.35 ? 'start' : ox < -0.35 ? 'end' : 'middle'
  display.addLabel(`am${id}_${edgeIndex}`, r4(mx + sign * nx * offset), r4(my + sign * ny * offset), text, { color, anchor })
}

// Pick the x for a vertical height line so it always stays INSIDE the shape.
// For a trapeze/parallelogram (two vertices at both the top and the base),
// dropping from the WIDER edge can land outside the narrower one — instead,
// drop from the SHORTER of the two parallel edges (both are centered on the
// same axis by construction, so this is always safely inside). Triangles only
// have a single apex, so there's no ambiguity there.
function pickHeightLineX(verts) {
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

// Dashed vertical line from the top vertex to the base, with a label — the
// same visual as showMeasure's polygon branch, factored out for reuse.
function drawHeightLine(display, entry, id, color, thickness, labelText) {
  const verts = entry.vertices
  const { x: rawX, topY, baseY } = pickHeightLineX(verts)
  const x      = r4(rawX)
  const lineId = `amh__${id}`
  display.addEdgeHighlight(lineId, x, r4(topY), x, r4(baseY), { color, strokeWidth: thickness, dashed: true })

  const vp     = display.getViewport() ?? { xMin: -8, xMax: 8 }
  const offset = (vp.xMax - vp.xMin) * 0.02
  display.addLabel(`amhlbl__${id}`, r4(x - offset), r4((topY + baseY) / 2), labelText, { color, anchor: 'end' })
  return display.animateEdgeHighlight(lineId, 0.5)
}

const fmt1 = n => parseFloat(n.toFixed(1))

// Show every measurement needed to compute a shape's AREA — different per
// shape type (side labels reuse labelSides' placement math; heights that
// aren't a literal edge — triangle, trapeze, parallelogram — get a dashed
// line dropped from the top vertex, same style as showMeasure).
//   • circle        → radius (delegates to showMeasure)
//   • square        → one side (s)
//   • rectangle     → length (l) + height (h), the two distinct side lengths
//   • parallelogram → base (b) + height (h, dashed line — the slanted side isn't it)
//   • trapeze       → both parallel sides (B = bottom, b = top) + height (h)
//   • triangle(s)   → base (b) + height (h, dashed line)
//   • other polygons → one side (s) as a fallback
export async function showAreaMeasures(geoRef, id, opts = {}) {
  const entry   = registry.get(id)
  const display = geoRef?.current
  if (!entry || !display) return

  const color     = opts.color ? resolveColor(opts.color) : '#60a5fa'
  const thickness = opts.thickness ?? 3

  if (entry.type === 'circle') {
    await showMeasure(geoRef, id, { color: opts.color, thickness })
    return
  }
  if (!entry.vertices?.length) return

  const sides = getSideLengths(id)
  const h     = fmt1(getShapeHeight(id) ?? 0)
  const anims = []

  switch (entry.type) {
    case 'square':
      labelEdge(display, entry, id, 0, `s = ${fmt1(sides[0])}`, color)
      break
    case 'rectangle':
      labelEdge(display, entry, id, 0, `l = ${fmt1(sides[0])}`, color)
      labelEdge(display, entry, id, 1, `h = ${fmt1(sides[1])}`, color)
      break
    case 'parallelogram':
      labelEdge(display, entry, id, 0, `b = ${fmt1(sides[0])}`, color)
      anims.push(drawHeightLine(display, entry, id, color, thickness, `h = ${h}`))
      break
    case 'trapeze':
      labelEdge(display, entry, id, 0, `B = ${fmt1(sides[0])}`, color)
      labelEdge(display, entry, id, 2, `b = ${fmt1(sides[2])}`, color)
      anims.push(drawHeightLine(display, entry, id, color, thickness, `h = ${h}`))
      break
    case 'triangle':
    case 'right-triangle':
      labelEdge(display, entry, id, 0, `b = ${fmt1(sides[0])}`, color)
      anims.push(drawHeightLine(display, entry, id, color, thickness, `h = ${h}`))
      break
    default:
      // Regular polygons etc. — side length is the readily-available measure.
      labelEdge(display, entry, id, 0, `s = ${fmt1(sides[0])}`, color)
  }

  await Promise.all(anims)
}

export function addText(geoRef, id, content, x, y, opts = {}) {
  const display = geoRef?.current
  if (!display) return
  const color = opts.color ? rgbToHex(opts.color) : '#a855f7'
  display.addLabel(`tx${id}`, x, y, content, { color })
}

export function removeText(geoRef, id) {
  geoRef?.current?.removeLabel(`tx${id}`)
}

// Parse "corner:N" or "edge:N" to [x, y] world coordinates on a shape
function parsePosition(spec, entry) {
  const verts = entry.vertices
  if (!verts?.length) return [0, 0]
  const n = verts.length
  const m = String(spec).match(/^(corner|edge):(\d+)$/i)
  if (!m) return [0, 0]
  const idx = parseInt(m[2], 10)
  if (m[1].toLowerCase() === 'corner') {
    return verts[idx % n]
  }
  // edge N = midpoint of edge from vertex N to vertex (N+1)
  const v1 = verts[idx % n], v2 = verts[(idx + 1) % n]
  return [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2]
}

export async function showAngles(geoRef, id, colorRaw) {
  const entry = registry.get(id)
  if (!entry?.vertices) return
  const display = geoRef?.current
  if (!display) return

  const verts = entry.vertices
  const n     = verts.length
  // Angle arcs are independent of the side/border color: base light blue
  // unless the caller explicitly passes one.
  const color = colorRaw ? resolveColor(colorRaw) : '#60a5fa'

  // Arc radius: 25% of average edge length, clamped
  const avgEdge = verts.reduce((sum, v, i) => {
    const nx = verts[(i + 1) % n]
    return sum + Math.sqrt((nx[0] - v[0]) ** 2 + (nx[1] - v[1]) ** 2)
  }, 0) / n
  const arcR = Math.max(avgEdge * 0.17, 0.2)

  const promises = []
  for (let i = 0; i < n; i++) {
    const prev = verts[(i + n - 1) % n]
    const curr = verts[i]
    const next = verts[(i + 1) % n]

    const angle1 = Math.atan2(prev[1] - curr[1], prev[0] - curr[0])
    const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0])

    // Normalize diff to (-π, π] to get the smaller (interior) arc
    let diff = angle2 - angle1
    while (diff > Math.PI)  diff -= 2 * Math.PI
    while (diff <= -Math.PI) diff += 2 * Math.PI

    const arcId = `arc__${id}_${i}`
    display.addAngleArc(arcId, curr[0], curr[1], arcR, angle1, diff, { color })
    promises.push(display.animateAngleArc(arcId, 0.35 + i * 0.05))
  }

  await Promise.all(promises)
}

export function removeAngles(geoRef, id) {
  const entry = registry.get(id)
  if (!entry?.vertices) return
  const display = geoRef?.current
  if (!display) return
  const n = entry.vertices.length
  for (let i = 0; i < n; i++) display.removeShape(`arc__${id}_${i}`)
}

export async function highlightEdge(geoRef, shapeId, edgeIndex, color = '#fbbf24', opts = {}) {
  const entry = registry.get(shapeId)
  if (!entry?.vertices) return
  const display = geoRef?.current
  if (!display) return
  const vs = entry.vertices
  const i  = Number(edgeIndex) % vs.length
  const v1 = vs[i], v2 = vs[(i + 1) % vs.length]
  const id = `edge_hl__${shapeId}_${i}`
  // Store so labelSides called afterwards picks up the right color
  if (!entry.edgeColors) entry.edgeColors = {}
  entry.edgeColors[i] = color
  display.addEdgeHighlight(id, v1[0], v1[1], v2[0], v2[1], { color, strokeWidth: opts.thickness ?? 5 })
  // Recolor the side label for this edge if it already exists
  display.setLabelColor?.(`sl${shapeId}_${i + 1}`, color)
  return display.animateEdgeHighlight(id, 0.4)
}

export async function highlightAngle(geoRef, shapeId, vertexIndex, hlColor = '#fbbf24') {
  const entry = registry.get(shapeId)
  if (!entry?.vertices) return
  const display = geoRef?.current
  if (!display) return

  const verts = entry.vertices
  const n     = verts.length
  const i     = Number(vertexIndex) % n

  const avgEdge = verts.reduce((sum, v, j) => {
    const nx = verts[(j + 1) % n]
    return sum + Math.sqrt((nx[0] - v[0]) ** 2 + (nx[1] - v[1]) ** 2)
  }, 0) / n
  const arcR = Math.max(avgEdge * 0.17, 0.2)  // same formula as showAngles

  const prev   = verts[(i + n - 1) % n]
  const curr   = verts[i]
  const next   = verts[(i + 1) % n]
  const angle1 = Math.atan2(prev[1] - curr[1], prev[0] - curr[0])
  const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0])
  let diff = angle2 - angle1
  while (diff > Math.PI)  diff -= 2 * Math.PI
  while (diff <= -Math.PI) diff += 2 * Math.PI

  const arcId = `arc__hl_${shapeId}_${vertexIndex}`
  display.addAngleArc(arcId, curr[0], curr[1], arcR, angle1, diff, { color: hlColor })
  await display.animateAngleArc(arcId, 0.4)
}

export function showArrow(geoRef, shapeId, arrowId, from, to, opts = {}) {
  const entry = registry.get(shapeId)
  if (!entry?.vertices) return Promise.resolve()
  const display = geoRef?.current
  if (!display) return Promise.resolve()

  const [x1, y1] = parsePosition(from, entry)
  const [x2, y2] = parsePosition(to,   entry)
  const color = opts.color ?? '#fbbf24'

  const aid = arrowId ?? `arrow__${shapeId}`
  display.addArrow(aid, x1, y1, x2, y2, { color, ...opts })
  return display.animateArrow(aid, 0.55)
}

export function removeArrow(geoRef, arrowId) {
  const display = geoRef?.current
  if (!display) return Promise.resolve()
  return display.shrinkRemoveShape(arrowId)
}

export function clearAll(geoRef) {
  registry.clear()
  geoRef?.current?.clearAll()
}
