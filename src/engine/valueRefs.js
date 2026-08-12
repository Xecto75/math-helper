/**
 * Value References — a single place that resolves `[id]token` into the live
 * numeric (or, for a function's expr, string) value actually stored on a
 * created object, so lesson content never has to re-type a number that's
 * already shown on screen (geometry side/height/radius/angle, a 3D solid's
 * dimensions, a graph point/segment/slider/plotted function, or a table
 * cell). A plotted function is addressable two ways: [funcId]N is the Nth
 * number written in its expression, left to right — works whether that
 * number is a hardcoded literal ("2x+4" → [funcId]0=2, [funcId]1=4) or a
 * |slider| var's current value ("|a|x+|b|" → [funcId]0=a, [funcId]1=b).
 * [sliderName]v instead addresses a slider directly by its own name,
 * regardless of which function(s) use it.
 *
 * Used by both `eq-replace-variable` (demoScripts.js) and rich text
 * (RichText.jsx: text boxes, comments) — previously these two
 * consumers each had their own copy of the geometry-only lookup, which is
 * exactly the kind of drift this module exists to prevent.
 */
import { getSideLengths, getShapeHeight, getShapeRadius, getVertexAngle } from './geometryEngine.js'
import { get3DShapeValue } from './threeEngine.js'
import { getPointCoords, getSegmentValue, getFunctionExpr, getFunctionParam, getSliderValue } from './desmosEngine.js'
import { getCellValue } from './tableEngine.js'

// Named scalars saved from a solved equation via eq-save-result (see
// ActionExecutor.js's 'save-value' action) — addressed the same way as a
// slider, [name]v, so a lesson author has one mental model for "a value I
// can look up by name" regardless of whether it came from dragging a
// slider or solving an equation (e.g. compute m from two points, save it,
// then reuse [m]v to solve for b, save that too, then show the final
// equation with both). Checked before the slider registry since a
// deliberate save is more likely intentional than an incidental
// slider-name collision.
const savedValues = new Map()
export function saveValue(name, value) { savedValues.set(name, value) }
export function clearSavedValues() { savedValues.clear() }

// Ordered so more specific alternatives are tried before a shorter one that
// would otherwise partially match (e.g. "x1" before bare "x", "len" before
// bare "l", "r\d+c\d+" before bare "r") — this matters for the unanchored
// global regex used in RichText.jsx; harmless for the anchored one in
// demoScripts.js. Do not reorder without keeping that in mind.
export const VALUE_TOKEN_PATTERN =
  'r\\d+c\\d+|a\\d+|x1|y1|x2|y2|len|expr|h|r|l|d|R|a|v|x|y|\\d+'

// Matches a token against each source in turn (geometry/flat-2D shape →
// volumetric 3D solid → graph point → graph segment → graph function →
// table cell) and returns the first hit. Returns undefined if `id` isn't a
// known object, or the token doesn't apply to whatever `id` actually is.
export function resolveValueRef(rawId, token) {
  const id = rawId.trim()

  // Geometry / flat-2D shape (geo-create-polygon or geo3d-create-2d) —
  // side index, height, radius, vertex angle. getShapeHeight/getShapeRadius/
  // getVertexAngle/getSideLengths already fall back from geometryEngine's
  // own registry to threeEngine's flat-shape registry internally.
  const angleM = token.match(/^a(\d+)$/)
  if (angleM) {
    const v = getVertexAngle(id, parseInt(angleM[1], 10))
    if (v !== undefined) return v
  } else if (token === 'h') {
    const v = getShapeHeight(id)
    if (v !== undefined) return v
  } else if (token === 'r') {
    const v = getShapeRadius(id)
    if (v !== undefined) return v
  } else if (/^\d+$/.test(token)) {
    const idx = parseInt(token, 10)
    const sides = getSideLengths(id)
    if (sides?.[idx] !== undefined) return sides[idx]
    // Not a shape (or no side at that index) — try it as a plotted
    // function's Nth written parameter (see getFunctionParam below).
    const param = getFunctionParam(id, idx)
    if (param !== undefined) return param
  }

  // Volumetric 3D solid (geo3d-create) — a/r/h/l/d/R depending on shape
  // type, matching exactly the letters shown by geo3d-show-volume-measures.
  const shapeVal = get3DShapeValue(id, token)
  if (shapeVal !== undefined) return shapeVal

  // Named value: a saved equation result first (eq-save-result), else a
  // slider's current dragged value — both addressed directly by name.
  if (token === 'v') {
    if (savedValues.has(id)) return savedValues.get(id)
    const v = getSliderValue(id)
    if (v !== undefined) return v
  }

  // Graph point (graph-add-point) — x / y.
  if (token === 'x' || token === 'y') {
    const p = getPointCoords(id)
    if (p) return token === 'x' ? p.x : p.y
  }

  // Graph segment (graph-add-segment) — endpoints or length.
  if (token === 'x1' || token === 'y1' || token === 'x2' || token === 'y2' || token === 'len') {
    const v = getSegmentValue(id, token)
    if (v !== undefined) return v
  }

  // Plotted function (graph-plot-function) — its expression as text, for
  // reuse inside a text box / comment (e.g. "f(x) = [f1]expr"). Not usable
  // as a numeric replacement value, but resolveValueRef doesn't need to
  // know who's asking — callers that need a number simply won't get one.
  if (token === 'expr') {
    const v = getFunctionExpr(id)
    if (v !== undefined) return v
  }

  // Table cell (table-create / table-change-value) — [gridId]r<row>c<col>,
  // both 0-indexed to match the authored `data` matrix directly.
  const cellM = token.match(/^r(\d+)c(\d+)$/)
  if (cellM) {
    const v = getCellValue(id, parseInt(cellM[1], 10), parseInt(cellM[2], 10))
    if (v !== undefined) return v
  }

  return undefined
}
