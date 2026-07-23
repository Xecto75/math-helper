/**
 * Demo script builders — one per animation function.
 * Each returns { snapshot, script } ready to pass to executeScript().
 * The script plays ONLY the animation for that function, nothing else.
 */

import { parseValues as parseTableValues, parseRow } from './tableEngine.js'
import { parseEquation, parseSymbolicEquation, parseRichEquation } from './parseEquation.js'
import { EquationState }  from './EquationState.js'
import { MathObject }     from './MathObject.js'
import { generateScript, generateDistributeScript } from './solveScript.js'
import { nextFuncId, getFunctionIds } from './desmosEngine.js'
import { resolveValueRef, VALUE_TOKEN_PATTERN } from './valueRefs.js'
import { resolveColor }   from './palette.js'
import { t }              from '../i18n/translations.js'
import { evaluate }       from 'mathjs'

// Resolves every [id]token inside an eq-create string to its live numeric
// value, then evaluates any {{ mathjs expression }} block — BEFORE the
// equation ever reaches the parser. E.g. "m = {{ ([pB]y - [pA]y) / ([pB]x
// - [pA]x) }}" becomes "m = (8 - 2) / (3 - 0)" then "m = 2". This matters
// because the classic/rich equation parsers only understand a coefficient
// (a plain number) times ONE symbol per term: a division whose denominator
// isn't a single literal number, or a product of two symbols (e.g. literal
// "m*x"), silently fails to parse (empty/bogus side, no error) — wrapping
// the arithmetic in {{ }} sidesteps that entirely, since mathjs evaluates
// it to one plain number before the equation parser ever sees the string,
// exactly as if it had been typed by hand — just without the risk of
// retyping the wrong number.
const VALUE_REF_RE_G = new RegExp(`\\[([^\\]]+)\\](${VALUE_TOKEN_PATTERN})`, 'g')
function substituteValueRefs(str) {
  const withRefs = str.replace(VALUE_REF_RE_G, (m, id, tok) => {
    const v = resolveValueRef(id, tok)
    if (v === undefined) return m
    return typeof v === 'number' ? String(parseFloat(v.toFixed(4))) : String(v)
  })
  return withRefs.replace(/\{\{([^{}]+)\}\}/g, (m, expr) => {
    try { return String(parseFloat(Number(evaluate(expr)).toFixed(4))) } catch { return m }
  })
}

// ── eq-combine ────────────────────────────────────────────────────────────────
export function demoEquationCombine() {
  return { snapshot: null, script: [{ type: 'autoCombine' }] }
}

// ── eq-send-other-side ────────────────────────────────────────────────────────
export function demoEquationSendOtherSide(termIndex) {
  const idx = termIndex !== '' && termIndex != null ? Number(termIndex) : null
  return { snapshot: null, script: [{ type: 'autoSendToOtherSide', termIndex: idx }] }
}

// ── eq-reorder ────────────────────────────────────────────────────────────────
export function demoEquationReorder() {
  return { snapshot: null, script: [{ type: 'autoReorder' }] }
}

// ── eq-divide ─────────────────────────────────────────────────────────────────
export function demoEquationDivide(divisor) {
  if (!divisor || divisor === 0) throw new Error('Divisor must be non-zero.')
  return { snapshot: null, script: [{ type: 'divideBothSides', divisor }] }
}

// ── eq-multiply ───────────────────────────────────────────────────────────────
export function demoEquationMultiply(multiplier) {
  if (!multiplier || multiplier === 0) throw new Error('Multiplier must be non-zero.')
  return { snapshot: null, script: [{ type: 'multiplyBothSides', multiplier }] }
}

// ── helper (equation) ─────────────────────────────────────────────────────────
function fmtTerm(term) {
  const sign  = term.sign === '-' ? '−' : ''
  const coeff = term.coefficient === 1 && term.variable ? '' : String(term.coefficient)
  return `${sign}${coeff}${term.variable ?? ''}`
}

// ── eq-replace-variable ───────────────────────────────────────────────────────
const VALUE_REF_RE = new RegExp(`^\\[([^\\]]+)\\](${VALUE_TOKEN_PATTERN})$`)

export function demoReplaceVariable(eqText, replacementsRaw) {
  // Parse "a=2,b=-3,c=1" or a live value reference instead of a hardcoded
  // number — same [id]token syntax used in text boxes/comments (see
  // valueRefs.js for the full list: geometry side/height/radius/angle, a
  // 3D solid's dimensions, a graph point/segment/function, a table cell) —
  // so a lesson never needs the same number typed twice (once at creation,
  // once here, with the risk of the two silently drifting apart).
  const replacements = String(replacementsRaw || 'a=2,b=-3,c=1')
    .split(',')
    .map(s => {
      const eq  = s.trim().indexOf('=')
      if (eq < 0) return null
      const lbl = s.slice(0, eq).trim()
      const rhs = s.slice(eq + 1).trim()
      const refM = rhs.match(VALUE_REF_RE)
      const val = refM ? (resolveValueRef(refM[1], refM[2]) ?? NaN) : Number(rhs)
      return { label: lbl, value: val }
    })
    .filter(r => r?.label && isFinite(r.value))

  if (!replacements.length) throw new Error('Enter replacements like "a=2,b=-3,c=1"')

  // When called from a lesson page the equation is already live — no snapshot needed.
  // When called standalone with an explicit eq string, set up the state first.
  if (!eqText) {
    return {
      snapshot: null,
      script: [{ type: 'replaceVariable', replacements }],
    }
  }

  const eq = eqText.trim()
  const snapshot = parseSymbolicEquation(eq).snapshot()
  return {
    snapshot,
    script: [
      { type: 'renderEquation' },
      { type: 'replaceVariable', replacements },
    ],
  }
}

// ── eq-save-result ────────────────────────────────────────────────────────────
// Silently stashes the current equation's solved numeric result under a name
// (no visual change — the equation itself already showed the value when it
// solved). Read it back anywhere else via [name]v: another eq-create/
// eq-replace-variable, a text box, or a comment.
export function demoSaveResult(name) {
  const n = (name || '').trim()
  if (!n) throw new Error('Enter a name to save the result as, e.g. "m"')
  return { snapshot: null, script: [{ type: 'save-value', name: n }] }
}

// ── eq-racine-des-bords ───────────────────────────────────────────────────────
export function demoRacineDesBords(eqText) {
  const eq = (eqText || 'x^2 = 4').trim()
  const snapshot = parseEquation(eq).snapshot()
  const script = [
    { type: 'renderEquation' },
    { type: 'showNarration', text: 'Apply square root to both sides.' },
    { type: 'racineDesBords' },
  ]
  return { snapshot, script }
}

// ── eq-disparition-exposant ───────────────────────────────────────────────────
export function demoDisparitionExposant(eqText, newDegreeRaw) {
  const eq = (eqText || '3x^2 = 9').trim()
  const snapshot = parseEquation(eq).snapshot()
  const state    = EquationState.fromSnapshot(snapshot)
  const newDegree = Number(newDegreeRaw)
  if (!isFinite(newDegree)) throw new Error('Enter a valid new degree (number).')

  const term = [...state.left, ...state.right].find(t => t.variable)
  if (!term) throw new Error('No variable term found. Try "3x^2 = 9".')

  const script = [
    { type: 'renderEquation' },
    { type: 'showNarration', text: `Change exponent to ${newDegree}.` },
    { type: 'disparitionExposant', termId: term.id, newDegree },
  ]
  return { snapshot, script }
}

// ── eq-apply-inverse-trig ─────────────────────────────────────────────────────
// arcsin/arccos/arctan: the "undo" of a trig function.
//   sin(θ) = 4/5  →  apply arcsin to both sides  →  θ = arcsin(4/5) ≈ 53.13°
// ActionExecutor handles the full animation — no snapshot needed here.
export function demoApplyInverseTrig(trigRaw) {
  const trig = String(trigRaw || 'sin').trim()
  if (!['sin', 'cos', 'tan'].includes(trig)) throw new Error('trig must be sin, cos, or tan')
  return {
    snapshot: null,
    script: [{ type: 'applyInverseTrig', trig }],
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GÉOMÉTRIE — individual engine function demos
// Each demo exercises ONE specific function, self-contained.
// ════════════════════════════════════════════════════════════════════════════════

// Helper: parse comma-separated numbers, e.g. "3, 4, 5" → [3, 4, 5]
function parseValues(str) {
  return String(str).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
}

// ── geo-create-polygon ────────────────────────────────────────────────────────
export function demoGeoCreatePolygon(idRaw, typeRaw, valuesRaw, flipXRaw, flipYRaw, fillColorRaw, borderColorRaw) {
  const id     = (idRaw   || 'shape1').trim()
  const type   = (typeRaw || 'hexagon').trim()
  const values = parseValues(valuesRaw || '4')
  const flipX  = flipXRaw === 'true'
  const flipY  = flipYRaw === 'true'
  const fillColor   = (fillColorRaw   || '').trim()
  const borderColor = (borderColorRaw || '').trim()
  if (!values.length) throw new Error('Invalid values — enter numbers separated by commas.')

  const opts = { color: [100, 149, 237], fillOpacity: 0.2, flipX, flipY }
  if (fillColor)   opts.fillColor   = fillColor
  if (borderColor) opts.borderColor = borderColor

  const script = [
    { type: 'showTitle', text: `createPolygon("${id}", "${type}", [${values.join(', ')}]${flipX ? ', flipX' : ''}${flipY ? ', flipY' : ''})` },
    { type: 'ggb-create-polygon', id, shapeType: type, values, opts },
  ]
  return { snapshot: null, script }
}

// ── geo-show-measure ──────────────────────────────────────────────────────────
// Circle → radius line. Polygon → height line (top vertex down to base).
export function demoGeoShowMeasure(shapeIdRaw, colorRaw, angleRaw, labelRaw) {
  const id    = (shapeIdRaw || 'shape1').trim()
  const color = (colorRaw || '').trim()
  const opts  = {}
  if (color) opts.color = color
  if (angleRaw !== '' && angleRaw !== undefined && isFinite(Number(angleRaw))) opts.angle = Number(angleRaw)
  if (labelRaw !== undefined && String(labelRaw).trim() !== '') opts.label = String(labelRaw).trim()

  const script = [
    { type: 'showTitle', text: `showMeasure("${id}")` },
    { type: 'ggb-show-measure', id, opts },
  ]
  return { snapshot: null, script }
}

// ── geo-show-area-measures ────────────────────────────────────────────────────
// All the measurements needed to compute area, tailored per shape type:
// square → side; rectangle → length+height; parallelogram → base+height;
// trapeze → both parallel sides+height; triangle → base+height; circle → radius.
export function demoGeoShowAreaMeasures(shapeIdRaw, colorRaw) {
  const id    = (shapeIdRaw || 'shape1').trim()
  const color = (colorRaw || '').trim()
  const opts  = {}
  if (color) opts.color = color

  const script = [
    { type: 'showTitle', text: `showAreaMeasures("${id}")` },
    { type: 'ggb-show-area-measures', id, opts },
  ]
  return { snapshot: null, script }
}

// ── geo-show-perimeter-measures ────────────────────────────────────────────────
// Every side labeled with its length (circle → radius line instead, same as
// showAreaMeasures) — unlike area, perimeter always needs every side, not a
// per-shape-type subset.
export function demoGeoShowPerimeterMeasures(shapeIdRaw, colorRaw) {
  const id    = (shapeIdRaw || 'shape1').trim()
  const color = (colorRaw || '').trim()
  const opts  = {}
  if (color) opts.color = color

  const script = [
    { type: 'showTitle', text: `showPerimeterMeasures("${id}")` },
    { type: 'ggb-show-perimeter-measures', id, opts },
  ]
  return { snapshot: null, script }
}

// ── geo-erase-shape ───────────────────────────────────────────────────────────
export function demoGeoEraseShape(shapeIdRaw) {
  const id = (shapeIdRaw || '').trim()

  const script = [
    { type: 'showTitle', text: `eraseShape("${id || 'shape1'}")` },
    { type: 'ggb-erase-shape', id: id || 'shape1' },
  ]
  return { snapshot: null, script }
}

// ── geo-move-shape ────────────────────────────────────────────────────────────
export function demoGeoMoveShape(shapeIdRaw, dxRaw, dyRaw) {
  const id = (shapeIdRaw || '').trim()
  const dx = Number(dxRaw) || 3
  const dy = Number(dyRaw) || 2

  const script = [
    { type: 'showTitle', text: `moveShape("${id || 'shape1'}", dx=${dx}, dy=${dy})` },
    { type: 'ggb-move-shape', id: id || 'shape1', dx, dy },
  ]
  return { snapshot: null, script }
}

// ── geo-highlight-shape ───────────────────────────────────────────────────────
export function demoGeoHighlightShape(shapeIdRaw) {
  const id = (shapeIdRaw || '').trim()

  const script = [
    { type: 'showTitle', text: `highlightShape("${id || 'shape1'}")` },
    { type: 'ggb-highlight-shape', id: id || 'shape1' },
    { type: 'ggb-unhighlight-shape', id: id || 'shape1' },
  ]
  return { snapshot: null, script }
}

// ── geo-label-sides ───────────────────────────────────────────────────────────
export function demoGeoLabelSides(shapeIdRaw, labelsRaw) {
  const id = (shapeIdRaw || '').trim()
  // Parse comma-separated labels: "a, b, c" → ['a','b','c'], blank entries kept as ''
  const customLabels = labelsRaw
    ? String(labelsRaw).split(',').map(s => s.trim())
    : []
  const hasCustom = customLabels.some(l => l !== '')

  const script = [
    { type: 'showTitle', text: `labelSides("${id || 'shape1'}"${hasCustom ? `, [${customLabels.join(', ')}]` : ''})` },
    { type: 'ggb-label-sides', id: id || 'shape1', customLabels },
  ]
  return { snapshot: null, script }
}

// ── geo-add-text ──────────────────────────────────────────────────────────────
export function demoGeoAddText(labelIdRaw, textRaw, xRaw, yRaw) {
  const id  = (labelIdRaw || 'lbl1').trim()
  const txt = (textRaw || 'A = π · r²').trim()
  const x   = xRaw !== '' && xRaw !== undefined ? Number(xRaw) : 0
  const y   = yRaw !== '' && yRaw !== undefined ? Number(yRaw) : -4

  const script = [
    { type: 'showTitle', text: `addText("${id}", "${txt}", ${x}, ${y})` },
    { type: 'ggb-add-text', id, text: txt, x, y, opts: { color: [96, 165, 250] } },
  ]
  return { snapshot: null, script }
}

// ── geo-show-angles ───────────────────────────────────────────────────────────
export function demoShowAngles(shapeIdRaw, colorRaw) {
  const id    = (shapeIdRaw || '').trim()
  const color = (colorRaw || '').trim()
  const script = [
    { type: 'showTitle', text: `showAngles("${id || 'shape1'}")` },
    { type: 'ggb-show-angles', id: id || 'shape1', color: color || null },
  ]
  return { snapshot: null, script }
}

// ── geo-show-arrow ────────────────────────────────────────────────────────────
export function demoRemoveArrow(arrowIdRaw) {
  const arrowId = String(arrowIdRaw || '').trim()
  if (!arrowId) throw new Error('Enter the arrow ID to remove.')
  return {
    snapshot: null,
    script: [{ type: 'ggb-remove-arrow', arrowId }],
  }
}

export function demoShowArrow(shapeIdRaw, arrowIdRaw, fromRaw, toRaw, colorRaw) {
  const shapeId = (shapeIdRaw || '').trim()
  const arrowId = (arrowIdRaw || '').trim() || `arr__${shapeId || 'shape1'}`
  const from    = (fromRaw || 'corner:0').trim()
  const to      = (toRaw   || 'corner:2').trim()
  const color   = (colorRaw || '#fbbf24').trim()
  const script = [
    { type: 'showTitle', text: `showArrow("${shapeId || 'shape1'}", "${from}" → "${to}")` },
    { type: 'ggb-show-arrow', shapeId: shapeId || 'shape1', arrowId, from, to, opts: { color } },
  ]
  return { snapshot: null, script }
}

// ── geo-highlight-angle ───────────────────────────────────────────────────────
// edgeIndexRaw accepts a comma-separated list (e.g. "0,1,2") to highlight
// several edges one after another instead of calling this function repeatedly.
export function demoGeoHighlightEdge(shapeIdRaw, edgeIndexRaw, colorRaw) {
  const shapeId = (shapeIdRaw || '').trim() || 'shape1'
  const color   = (colorRaw || '#fbbf24').trim()
  const indices = String(edgeIndexRaw ?? 0).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
  const script  = []
  ;(indices.length ? indices : [0]).forEach((edgeIndex, i) => {
    if (i > 0) script.push({ type: 'pause', seconds: 0.2 })
    script.push({ type: 'ggb-highlight-edge', shapeId, edgeIndex, color })
  })
  return { snapshot: null, script }
}

export function demoHighlightAngle(shapeIdRaw, vertexIndexRaw, colorRaw) {
  const shapeId     = (shapeIdRaw || '').trim()
  const vertexIndex = Number(vertexIndexRaw) || 0
  const color       = (colorRaw || '#fbbf24').trim()
  const script = [
    { type: 'showTitle', text: `highlightAngle("${shapeId || 'shape1'}", vertex ${vertexIndex})` },
    { type: 'ggb-highlight-angle', shapeId: shapeId || 'shape1', vertexIndex, color },
  ]
  return { snapshot: null, script }
}

// ── geo-clear ─────────────────────────────────────────────────────────────────
export function demoGeoClear() {
  const script = [
    { type: 'showTitle',     text: 'clearAll()' },
    { type: 'ggb-clear' },
    // Create a few things first
    { type: 'showNarration', text: 'Quelques formes créées au préalable…' },
    { type: 'ggb-create-polygon', id: 's1', shapeType: 'hexagon',  values: [2.5],
      opts: { autoFit: false, color: [100, 149, 237], fillOpacity: 0.2 } },
    { type: 'ggb-move-shape', id: 's1', dx: -3, dy: 0 },
    { type: 'ggb-create-polygon', id: 's2', shapeType: 'circle', values: [2],
      opts: { autoFit: false, color: [168, 85, 247], fillOpacity: 0.2 } },
    { type: 'ggb-move-shape', id: 's2', dx: 3, dy: 0 },
    { type: 'showNarration', text: 'clearAll() — tout efface d\'un coup' },
    { type: 'ggb-clear' },
    { type: 'showNarration', text: 'Canvas réinitialisé.' },
  ]
  return { snapshot: null, script }
}

// ════════════════════════════════════════════════════════════════════════════════
// GRAPHIQUES — individual engine function demos
// No ggb-clear at the start: graph state persists across functions.
// Reset restores the pre-run Desmos snapshot (handled in App.jsx).
// ════════════════════════════════════════════════════════════════════════════════

// ── graph-plot-function ───────────────────────────────────────────────────────
// Auto-labels the curve as "f(x) = <expr>" (or g/h/… — whichever letter isn't
// already taken) unless hideLabel is "1". If expr already spells out its own
// left-hand side (e.g. "y = x+3"), that would double up into a nonsensical
// "f(x) = y = x+3" — use the expr as-is instead, it's already a full equation.
export function demoGraphPlotFunction(exprRaw, idRaw, hideLabelRaw) {
  const expr        = (exprRaw || 'x^2 - 2*x - 1').trim()
  const existingCount = getFunctionIds().length
  const id          = (idRaw || '').trim() || nextFuncId()
  const hideLabel   = String(hideLabelRaw ?? '').trim() === '1'
  const script = [
    { type: 'showTitle',     text: `plotFunction("${id}", "${expr}")` },
    { type: 'showNarration', text: `Trace "${id}" : f(x) = ${expr}` },
    { type: 'ggb-plot-function', id, expr, opts: { thickness: 3 } },
  ]
  if (!hideLabel) {
    const label = expr.includes('=') ? expr : `${id}(x) = ${expr}`
    script.push({ type: 'ggb-name-func', id, funcId: id, label, x: 3 + existingCount * 1.5 })
  }
  script.push({ type: 'showNarration', text: `Courbe "${id}" tracée.` })
  return { snapshot: null, script }
}

// ── graph-remove-function ─────────────────────────────────────────────────────
export function demoGraphRemoveFunction(funcIdRaw) {
  const funcId = (funcIdRaw || 'f').trim()
  const script = [
    { type: 'showTitle',     text: `removeFunction("${funcId}")` },
    { type: 'showNarration', text: `Suppression de la courbe "${funcId}" (+ ses étiquettes et tangentes)` },
    { type: 'ggb-remove-function', id: funcId },
    { type: 'showNarration', text: `Courbe "${funcId}" supprimée.` },
  ]
  return { snapshot: null, script }
}

// ── graph-best-fit-line ───────────────────────────────────────────────────────
export function demoGraphBestFitLine(pointIdsRaw, idRaw, colorRaw) {
  const id    = (idRaw || '').trim() || nextFuncId()
  const color = colorRaw ? resolveColor(colorRaw) : undefined
  return { snapshot: null, script: [{ type: 'ggb-best-fit-line', id, pointIds: pointIdsRaw ?? '', opts: { color } }] }
}

// ── graph-shade-area ──────────────────────────────────────────────────────────
export function demoGraphShadeArea(funcIdRaw, aRaw, bRaw) {
  const funcId = (funcIdRaw || 'f').trim()
  const a      = Number(aRaw) || 0
  const b      = Number(bRaw) || 3
  const script = [
    { type: 'showTitle',     text: `shadeUnderCurve("${funcId}", ${a}, ${b})` },
    { type: 'showNarration', text: `Ombrage de la courbe "${funcId}" entre x = ${a} et x = ${b}` },
    { type: 'ggb-shade-area', id: 'area', funcId, a, b },
    { type: 'showNarration', text: `Aire ombrée entre x = ${a} et x = ${b}.` },
  ]
  return { snapshot: null, script }
}

// ── graph-find-intersections ──────────────────────────────────────────────────
export function demoGraphFindIntersections(f1IdRaw, f2IdRaw, colorRaw, hideLabelRaw) {
  const f1Id = (f1IdRaw || 'f').trim()
  const f2Id = (f2IdRaw || 'g').trim()
  const color = colorRaw ? resolveColor(colorRaw) : undefined
  const hideLabel = String(hideLabelRaw ?? '').trim() === '1'
  const script = [
    { type: 'showTitle',     text: `findIntersections("${f1Id}", "${f2Id}")` },
    { type: 'showNarration', text: `Recherche des intersections entre "${f1Id}" et "${f2Id}"` },
    { type: 'ggb-find-intersections', id: 'pts', f1Id, f2Id, opts: { color, hideLabel } },
    { type: 'showNarration', text: 'Points d\'intersection marqués.' },
  ]
  return { snapshot: null, script }
}

// ── graph-add-point ───────────────────────────────────────────────────────────
export function demoGraphAddPoint(xRaw, yRaw, idRaw, funcIdRaw, labelRaw, showCoordsRaw) {
  // x and y are kept as strings — desmosEngine.addPoint handles evalMathExpr('sqrt(3)/2') etc.
  const x  = (xRaw != null && String(xRaw).trim() !== '') ? String(xRaw).trim() : '2'
  const y  = (yRaw != null && String(yRaw).trim() !== '') ? String(yRaw).trim() : '3'
  const id = (idRaw || '').trim() || `p_${Date.now()}`
  const funcId     = (funcIdRaw || '').trim()
  const label      = (labelRaw !== undefined && String(labelRaw).trim() !== '') ? String(labelRaw).trim() : `(${x}, ${y})`
  const showCoords = showCoordsRaw === true || String(showCoordsRaw).trim() === 'true'
  const opts = { size: 6, label, showCoords }
  if (funcId) opts.funcId = funcId
  else        opts.color  = [96, 165, 250]
  const script = [
    { type: 'showTitle', text: `addPoint("${id}", ${x}, ${y})` },
    { type: 'ggb-add-point', id, x, y, opts },
  ]
  return { snapshot: null, script }
}

// ── graph-remove-point ────────────────────────────────────────────────────────
export function demoGraphRemovePoint(idRaw) {
  const id = (idRaw || '').trim()
  if (!id) throw new Error('Enter the point ID to remove.')
  const script = [
    { type: 'showTitle', text: `removePoint("${id}")` },
    { type: 'ggb-remove-point', id },
  ]
  return { snapshot: null, script }
}

// ── graph-scatter-plot ────────────────────────────────────────────────────────
// A "nuage de points" scattered around y = slope·x + intercept — coeff
// controls how spread out the points are (0 = perfectly on the line).
export function demoGraphScatterPlot(slopeRaw, interceptRaw, coeffRaw, countRaw, xMinRaw, xMaxRaw, colorRaw, idRaw) {
  const slope     = Number(slopeRaw) || 1
  const intercept = Number(interceptRaw) || 0
  const coeff     = Math.max(0, Number(coeffRaw) ?? 1)
  const count     = Math.max(2, Math.round(Number(countRaw) || 20))
  const xMin      = Number(xMinRaw) || -5
  const xMax      = Number(xMaxRaw) || 5
  const color     = (colorRaw || '').trim()
  const id        = (idRaw || 'cloud1').trim()
  const opts = {}
  if (color) opts.color = color
  const script = [
    { type: 'showTitle', text: `scatterPlot("${id}", y=${slope}x+${intercept}, coeff=${coeff})` },
    { type: 'ggb-scatter-plot', id, params: { slope, intercept, coeff, xMin, xMax, count }, opts },
  ]
  return { snapshot: null, script }
}

// ── graph-remove-scatter-plot ─────────────────────────────────────────────────
export function demoGraphRemoveScatterPlot(idRaw) {
  const id = (idRaw || 'cloud1').trim()
  return {
    snapshot: null,
    script: [{ type: 'ggb-remove-scatter-plot', id }],
  }
}

// ── graph-add-segment ─────────────────────────────────────────────────────────
// A genuine finite line segment between two points — NOT an infinite line
// like y=mx+b or the fh/fV horizontal/vertical lines.
export function demoGraphAddSegment(x1Raw, y1Raw, x2Raw, y2Raw, colorRaw, idRaw) {
  const x1 = Number(x1Raw) || 0
  const y1 = Number(y1Raw) || 0
  const x2 = Number(x2Raw) || 4
  const y2 = Number(y2Raw) || 0
  const color = colorRaw ? resolveColor(colorRaw) : ''
  const id = (idRaw || 'seg1').trim()
  const opts = {}
  if (color) opts.color = color
  return {
    snapshot: null,
    script: [
      { type: 'showTitle', text: `addSegment("${id}", (${x1},${y1})→(${x2},${y2}))` },
      { type: 'ggb-add-segment', id, x1, y1, x2, y2, opts },
    ],
  }
}

export function demoGraphRemoveSegment(idRaw) {
  const id = (idRaw || 'seg1').trim()
  return { snapshot: null, script: [{ type: 'ggb-remove-segment', id }] }
}

// ── graph-segment-tick ────────────────────────────────────────────────────────
// Congruent-side tick mark(s) at a segment's midpoint (1-3 — use a different
// count to mark a different pair of equal segments).
export function demoGraphSegmentTick(idRaw, ticksRaw, colorRaw) {
  const id = (idRaw || 'seg1').trim()
  return {
    snapshot: null,
    script: [{ type: 'ggb-segment-tick', id, ticks: Number(ticksRaw) || 1, color: colorRaw || 'blue' }],
  }
}

export function demoGraphRemoveSegmentTick(idRaw) {
  const id = (idRaw || 'seg1').trim()
  return { snapshot: null, script: [{ type: 'ggb-remove-segment-tick', id }] }
}

// ── graph-divide-segment ──────────────────────────────────────────────────────
// Marks the (parts-1) points de partage that split a segment into equal parts.
export function demoGraphDivideSegment(idRaw, partsRaw, colorRaw, showLabelsRaw) {
  const id = (idRaw || 'seg1').trim()
  return {
    snapshot: null,
    script: [{
      type: 'ggb-divide-segment-graph', id,
      parts: Number(partsRaw) || 2, color: colorRaw || 'purple',
      showLabels: String(showLabelsRaw) === 'true',
    }],
  }
}

export function demoGraphRemoveDivideSegment(idRaw) {
  const id = (idRaw || 'seg1').trim()
  return { snapshot: null, script: [{ type: 'ggb-remove-divide-segment-graph', id }] }
}

// ── graph-adjust-view ─────────────────────────────────────────────────────────
export function demoGraphAdjustView(cxRaw, cyRaw, rangeRaw) {
  const cx    = Number(cxRaw)  || 0
  const cy    = Number(cyRaw)  || 0
  const range = Math.max(Number(rangeRaw) || 10, 0.1)
  const script = [
    { type: 'showTitle',     text: `adjustView(cx=${cx}, cy=${cy}, range=${range})` },
    { type: 'showNarration', text: `Centre (${cx}, ${cy})  —  plage visible : [${cx - range/2}, ${cx + range/2}]` },
    { type: 'ggb-adjust-view', cx, cy, range },
  ]
  return { snapshot: null, script }
}

// ── graph-set-viewport ────────────────────────────────────────────────────────
// `Number(raw) || fallback` silently discards an intentional 0 (0 is falsy),
// which is exactly the value a viewport bound legitimately needs — use this
// instead so only a genuinely missing/non-numeric input falls back.
function numOr(raw, fallback) {
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function demoGraphSetViewport(xMinR, xMaxR, yMinR, yMaxR) {
  const xMin = numOr(xMinR, -5)
  const xMax = numOr(xMaxR,  5)
  const yMin = numOr(yMinR, -4)
  const yMax = numOr(yMaxR,  4)
  const script = [
    { type: 'showTitle',     text: `setViewport(${xMin}, ${xMax}, ${yMin}, ${yMax})` },
    { type: 'showNarration', text: `setViewport(${xMin}, ${xMax}, ${yMin}, ${yMax})` },
    { type: 'ggb-set-viewport', xMin, xMax, yMin, yMax },
    { type: 'showNarration', text: `Viewport → x:[${xMin}, ${xMax}]  y:[${yMin}, ${yMax}]` },
  ]
  return { snapshot: null, script }
}

// ── graph-name-func ───────────────────────────────────────────────────────────
export function demoGraphNameFunc(funcIdRaw, labelRaw, x0Raw, _y0Raw) {
  const funcId = (funcIdRaw || 'f').trim()
  const label  = (labelRaw  || 'f(x)').trim()
  const x0     = Number(x0Raw) || 3

  // Never trust AI-supplied y0 — always auto-compute from the expression at x0
  const action = { type: 'ggb-name-func', id: funcId, funcId, label, x: x0 }
  const script = [
    { type: 'showTitle',     text: `nameFunc("${funcId}", "${label}")` },
    { type: 'showNarration', text: `Étiquette "${label}" sur la courbe "${funcId}" en x₀ = ${x0}` },
    action,
  ]
  return { snapshot: null, script }
}

// ── graph-horizontal-line ─────────────────────────────────────────────────────
export function demoGraphAddHorizontalLine(yRaw) {
  const y = isFinite(Number(yRaw)) ? Number(yRaw) : 1
  const script = [
    { type: 'showTitle',     text: `addHorizontalLine(y = ${y})` },
    { type: 'showNarration', text: `Trace la droite horizontale y = ${y}` },
    { type: 'ggb-horizontal-line', id: `hl_${Date.now()}`, y, opts: { color: [96, 165, 250], thickness: 2 } },
    { type: 'showNarration', text: `Droite y = ${y} tracée.` },
  ]
  return { snapshot: null, script }
}

// ── graph-mark-roots ──────────────────────────────────────────────────────────
export function demoGraphMarkRoots(funcIdRaw) {
  const funcId = (funcIdRaw || 'f').trim()
  const script = [
    { type: 'showTitle',     text: `markRoots("${funcId}")` },
    { type: 'showNarration', text: `Recherche des racines de "${funcId}" (f(x) = 0)` },
    { type: 'ggb-mark-roots', id: `roots_${funcId}`, funcId },
    { type: 'showNarration', text: 'Racines marquées en jaune (x où f(x) = 0).' },
  ]
  return { snapshot: null, script }
}

// ── graph-trig-circle ────────────────────────────────────────────────────────
export function demoGraphTrigCircle() {
  return {
    snapshot: null,
    script: [{ type: 'ggb-trig-circle' }],
  }
}

// ── graph-batch-add-points ────────────────────────────────────────────────────
// points = "id:x:y:label|id:x:y:label|..."  (label is optional)
export function demoGraphBatchAddPoints(pointsRaw, showCoordsRaw, colorRaw) {
  const showCoords = showCoordsRaw === true || String(showCoordsRaw).trim() === 'true'
  const color = colorRaw ? resolveColor(colorRaw) : [96, 165, 250]
  const entries = String(pointsRaw || '').split('|').map(s => s.trim()).filter(Boolean)
  const actions = entries.map(entry => {
    const [id, x, y, ...labelParts] = entry.split(':')
    const label = labelParts.join(':').trim()
    const opts = { size: 6, label: label || '', showCoords, color }
    return { type: 'ggb-add-point', id: id.trim(), x: x.trim(), y: y.trim(), opts }
  })
  return { snapshot: null, script: [{ type: 'ggb-parallel', actions }] }
}

// ── graph-batch-show-projections ──────────────────────────────────────────────
// pointIds = "p0|p30|p45|..."
export function demoGraphBatchShowProjections(pointIdsRaw) {
  const ids = String(pointIdsRaw || '').split('|').map(s => s.trim()).filter(Boolean)
  const actions = ids.map((pointId, i) => ({
    type: 'ggb-show-projection',
    id: `proj_${pointId}_${i}`,
    pointId,
    opts: { showValues: false },
  }))
  return { snapshot: null, script: [{ type: 'ggb-parallel', actions }] }
}

// ── graph-show-projection ─────────────────────────────────────────────────────
export function demoGraphShowProjection(pointIdRaw, showValuesRaw) {
  const pointId   = (pointIdRaw || '').trim()
  const showValues = showValuesRaw !== false && String(showValuesRaw).trim() !== 'false'
  const script = [
    { type: 'showTitle',     text: `showProjection("${pointId}")` },
    { type: 'showNarration', text: `Projection du point "${pointId}" sur les axes` },
    { type: 'ggb-show-projection', id: `proj_${pointId}_${Date.now()}`, pointId, opts: { showValues } },
  ]
  return { snapshot: null, script }
}

// ── graph-plot-derivative ─────────────────────────────────────────────────────
export function demoGraphPlotDerivative(funcIdRaw) {
  const funcId = (funcIdRaw || 'f').trim()
  const script = [
    { type: 'showTitle',     text: `plotDerivative("${funcId}")` },
    { type: 'showNarration', text: `Trace la dérivée f'(x) de "${funcId}"` },
    { type: 'ggb-plot-derivative', id: `d_${funcId}`, funcId, opts: { thickness: 2 } },
    { type: 'showNarration', text: `Dérivée de "${funcId}" tracée en cyan (pointillé).` },
  ]
  return { snapshot: null, script }
}

// ── graph-riemann-sum ─────────────────────────────────────────────────────────
export function demoGraphRiemannSum(funcIdRaw, aRaw, bRaw, nRaw, methodRaw) {
  const funcId = (funcIdRaw || 'f').trim()
  const a      = Number(aRaw) || -2
  const b      = Number(bRaw) ||  2
  const n      = Math.max(1, Math.min(Number(nRaw) || 5, 50))
  const method = ['left','right','midpoint'].includes(methodRaw) ? methodRaw : 'midpoint'
  const script = [
    { type: 'showTitle',     text: `riemannSum("${funcId}", ${a}, ${b}, n=${n}, ${method})` },
    { type: 'showNarration', text: `Somme de Riemann (${method}) sur [${a}, ${b}] avec ${n} rectangle${n > 1 ? 's' : ''}` },
    { type: 'ggb-riemann-sum', id: `rs_${funcId}`, funcId, a, b, n, method, opts: { fillOpacity: 0.5 } },
    { type: 'showNarration', text: `${n} rectangle${n > 1 ? 's' : ''} tracé${n > 1 ? 's' : ''} (méthode ${method}).` },
  ]
  return { snapshot: null, script }
}

// ── graph-draw-vector ─────────────────────────────────────────────────────────
export function demoGraphDrawVector(x1Raw, y1Raw, x2Raw, y2Raw) {
  const x1 = Number(x1Raw) || 0
  const y1 = Number(y1Raw) || 0
  const x2 = Number(x2Raw) || 2
  const y2 = Number(y2Raw) || 3
  const script = [
    { type: 'showTitle',     text: `drawVector((${x1},${y1}) → (${x2},${y2}))` },
    { type: 'showNarration', text: `Trace un vecteur de (${x1}, ${y1}) vers (${x2}, ${y2})` },
    { type: 'ggb-draw-vector', id: `vec_${Date.now()}`, x1, y1, x2, y2, opts: { color: [96, 165, 250], thickness: 2 } },
    { type: 'showNarration', text: `Vecteur tracé de (${x1}, ${y1}) vers (${x2}, ${y2}).` },
  ]
  return { snapshot: null, script }
}

// ── graph-draw-angle ──────────────────────────────────────────────────────────
// Mark angle ABC (vertex B) with an arc + measured degrees. Auto right-angle square.
export function demoGraphDrawAngle(axR, ayR, bxR, byR, cxR, cyR, colorRaw, idRaw) {
  const ax = Number(axR), ay = Number(ayR)
  const bx = Number(bxR), by = Number(byR)
  const cx = Number(cxR), cy = Number(cyR)
  if (![ax, ay, bx, by, cx, cy].every(Number.isFinite))
    throw new Error('Enter the 6 coordinates: A(x,y), vertex B(x,y), C(x,y).')
  const color = (colorRaw || '').trim()
  const id    = (idRaw || '').trim() || `ang_${Date.now()}`
  const opts  = { radius: 1 }
  if (color) opts.color = resolveColor(color)
  const script = [
    { type: 'showTitle',     text: `drawAngle(A(${ax},${ay}), B(${bx},${by}), C(${cx},${cy}))` },
    { type: 'ggb-draw-angle', id, ax, ay, bx, by, cx, cy, opts },
  ]
  return { snapshot: null, script }
}

// ── graph-transform-function ──────────────────────────────────────────────────
export function demoGraphTransformFunction(funcIdRaw, typeRaw, valueRaw) {
  const funcId = (funcIdRaw || 'f').trim()
  const type   = typeRaw || 'translateX'
  const value  = Number(valueRaw) || 0
  const labels = {
    translateX: `f(x-${value})  (décalage horizontal → ${value})`,
    translateY: `f(x)+${value}  (décalage vertical ↑ ${value})`,
    scaleY:     `${value}·f(x)  (étirement vertical ×${value})`,
    scaleX:     `f(x/${value})  (étirement horizontal ×${value})`,
    reflectX:   '-f(x)  (réflexion axe x)',
    reflectY:   'f(-x)  (réflexion axe y)',
  }
  const desc = labels[type] ?? type
  const script = [
    { type: 'showTitle',     text: `transformFunction("${funcId}", "${type}", ${value})` },
    { type: 'showNarration', text: `Transformation de "${funcId}" : ${desc}` },
    { type: 'ggb-transform-function', id: `tf_${funcId}_${type}`, funcId, transformType: type, value, opts: {} },
    { type: 'showNarration', text: `Courbe "${funcId}" déplacée.` },
  ]
  return { snapshot: null, script }
}

// ── graph-tangent ─────────────────────────────────────────────────────────────
export function demoGraphTangent(funcIdRaw, x0Raw, y0Raw) {
  const funcId = (funcIdRaw || 'f').trim()
  const x0     = Number(x0Raw) || 1
  const y0Num  = parseFloat(y0Raw)
  const hasY0  = y0Raw !== '' && y0Raw !== undefined && y0Raw !== null && isFinite(y0Num)

  const action = { type: 'ggb-tangent', id: 'tan1', funcId, x: x0 }
  if (hasY0) action.y = y0Num

  const coordStr = hasY0 ? `(${x0}, ${y0Num})` : `x₀ = ${x0} (y calculé depuis la courbe)`
  const script = [
    { type: 'showTitle',     text: `tangent("${funcId}", x₀=${x0})` },
    { type: 'showNarration', text: `Tangente sur "${funcId}" en ${coordStr}` },
    action,
    { type: 'showNarration', text: 'Tangent line drawn. Hit Reset to go back.' },
  ]
  return { snapshot: null, script }
}

// ════════════════════════════════════════════════════════════════════════════════
// TABLES — animated grid engine demos
// ════════════════════════════════════════════════════════════════════════════════

// ── table-create ───────────────────────────────────────────────────────────────
// Simpler entry point than tab-create-grid: give one 2D array literal, e.g.
// [[2,2,3],[5,5,6],[4,4,4]], and the grid size (rows × cols) is auto-detected —
// no need to specify cols/rows separately (or keep them in sync with the data).
export function demoTableCreate(dataRaw, headerRowRaw, gridIdRaw, colorRaw) {
  const gid = (gridIdRaw ?? '').trim() || 'table1'

  let data
  try { data = JSON.parse(dataRaw ?? '') } catch { data = null }
  if (!Array.isArray(data) || !data.length || !Array.isArray(data[0])) {
    throw new Error('Enter a 2D array like [[2,2,3],[5,5,6],[4,4,4]]')
  }
  const rows = data.length
  const cols = data[0].length
  if (!data.every(row => Array.isArray(row) && row.length === cols)) {
    throw new Error('Every row must have the same number of columns.')
  }
  const values    = data.map(row => row.map(v => String(v)))
  const headerRow = headerRowRaw === 'true'
  const color     = (colorRaw || '').trim()
  const opts      = { headerRow }
  if (color) opts.color = resolveColor(color)

  const script = [
    { type: 'showTitle',     text: `createTable("${gid}", ${cols}×${rows})` },
    { type: 'showNarration', text: `Creating a ${cols}×${rows} table` },
    { type: 'table-create-grid', id: gid, cols, rows, values, opts },
    { type: 'showNarration', text: `Table "${gid}" ready — ${cols} columns, ${rows} rows.` },
  ]
  return { snapshot: null, script }
}

// ── tab-create-grid ───────────────────────────────────────────────────────────
export function demoTableCreateGrid(colsRaw, rowsRaw, valuesRaw, headerRowRaw, gridIdRaw) {
  const gid       = (gridIdRaw ?? '').trim() || 'grid1'
  const cols      = Math.max(1, Math.min(Number(colsRaw) || 3, 12))
  const rows      = Math.max(1, Math.min(Number(rowsRaw) || 4, 20))
  const values    = parseTableValues(valuesRaw || 'Name,Age,Score|Alice,25,95|Bob,30,87|Carol,22,91')
  const headerRow = headerRowRaw !== 'false'

  const script = [
    { type: 'showTitle',     text: `createGrid("${gid}", ${cols}, ${rows})` },
    { type: 'showNarration', text: `Creating a ${cols}×${rows} grid` },
    { type: 'table-create-grid', id: gid, cols, rows, values, opts: { headerRow } },
    { type: 'showNarration', text: `Grid "${gid}" ready — ${cols} columns, ${rows} rows.` },
  ]
  return { snapshot: null, script }
}

// ── tab-erase-grid ────────────────────────────────────────────────────────────
export function demoTableEraseGrid(gridIdRaw) {
  const gid = (gridIdRaw ?? '').trim() || 'grid1'
  const script = [
    { type: 'showTitle',     text: `eraseGrid("${gid}")` },
    { type: 'showNarration', text: `Fading out grid "${gid}"…` },
    { type: 'table-erase-grid', id: gid },
    { type: 'showNarration', text: 'Grid erased.' },
  ]
  return { snapshot: null, script }
}

// ── tab-add-column ────────────────────────────────────────────────────────────
export function demoTableAddColumn(valuesRaw, gridIdRaw) {
  const gid    = (gridIdRaw ?? '').trim() || 'grid1'
  const values = parseRow(valuesRaw || 'Grade,A,B+,A-')
  const script = [
    { type: 'showTitle',     text: `addColumn("${gid}", values)` },
    { type: 'showNarration', text: `Adding column [${values.join(', ')}] to "${gid}"` },
    { type: 'table-add-column', id: gid, values },
    { type: 'showNarration', text: 'Column added.' },
  ]
  return { snapshot: null, script }
}

// ── tab-remove-column ─────────────────────────────────────────────────────────
export function demoTableRemoveColumn(colIndexRaw, gridIdRaw) {
  const gid      = (gridIdRaw ?? '').trim() || 'grid1'
  const colIndex = Number(colIndexRaw ?? -1)
  const label    = colIndex < 0 ? 'last' : `index ${colIndex}`
  const script = [
    { type: 'showTitle',     text: `removeColumn("${gid}", ${colIndex})` },
    { type: 'showNarration', text: `Removing the ${label} column from "${gid}"…` },
    { type: 'table-remove-column', id: gid, colIndex },
    { type: 'showNarration', text: 'Column removed.' },
  ]
  return { snapshot: null, script }
}

// ── tab-add-row ───────────────────────────────────────────────────────────────
export function demoTableAddRow(valuesRaw, gridIdRaw) {
  const gid    = (gridIdRaw ?? '').trim() || 'grid1'
  const values = parseRow(valuesRaw || 'Dave,28,88')
  const script = [
    { type: 'showTitle',     text: `addRow("${gid}", values)` },
    { type: 'showNarration', text: `Adding row [${values.join(', ')}] to "${gid}"` },
    { type: 'table-add-row', id: gid, values },
    { type: 'showNarration', text: 'Row added.' },
  ]
  return { snapshot: null, script }
}

// ── tab-remove-row ────────────────────────────────────────────────────────────
export function demoTableRemoveRow(rowIndexRaw, gridIdRaw) {
  const gid      = (gridIdRaw ?? '').trim() || 'grid1'
  const rowIndex = Number(rowIndexRaw ?? -1)
  const label    = rowIndex < 0 ? 'last' : `index ${rowIndex}`
  const script = [
    { type: 'showTitle',     text: `removeRow("${gid}", ${rowIndex})` },
    { type: 'showNarration', text: `Removing the ${label} row from "${gid}"…` },
    { type: 'table-remove-row', id: gid, rowIndex },
    { type: 'showNarration', text: 'Row removed.' },
  ]
  return { snapshot: null, script }
}

// ── tab-change-value ──────────────────────────────────────────────────────────
export function demoTableChangeValue(colRaw, rowRaw, valueRaw, gridIdRaw) {
  const gid   = (gridIdRaw ?? '').trim() || 'grid1'
  const col   = Number(colRaw) || 0
  const row   = Number(rowRaw) || 0
  const value = valueRaw ?? ''
  const script = [
    { type: 'showTitle',     text: `changeValue("${gid}", col=${col}, row=${row})` },
    { type: 'showNarration', text: `Setting [${col}, ${row}] to "${value}" in "${gid}"` },
    { type: 'table-change-value', id: gid, col, row, value },
    { type: 'showNarration', text: `Cell updated to "${value}".` },
  ]
  return { snapshot: null, script }
}

// ── tab-change-values ─────────────────────────────────────────────────────────
export function demoTableChangeValues(changesRaw, gridIdRaw) {
  const gid = (gridIdRaw ?? '').trim() || 'grid1'
  // changesRaw: "col,row,value|col,row,value"
  const changes = (changesRaw || '2,1,100|2,2,95|2,3,98')
    .split('|')
    .map(s => {
      const [col, row, value] = s.split(',').map(v => v.trim())
      return { col: Number(col), row: Number(row), value: value ?? '' }
    })
    .filter(c => isFinite(c.col) && isFinite(c.row))

  const script = [
    { type: 'showTitle',     text: `changeValues("${gid}", ${changes.length} cells)` },
    { type: 'showNarration', text: `Updating ${changes.length} cells in "${gid}"…` },
    { type: 'table-change-values', id: gid, changes },
    { type: 'showNarration', text: 'Values updated.' },
  ]
  return { snapshot: null, script }
}

// ── tab-highlight-row ──────────────────────────────────────────────────────────
// Silent, like eq-save-result/set-layout — no title/narration, since this is
// an accent step meant to sit alongside other steps rather than announce itself.
export function demoTableHighlightRow(gridIdRaw, rowIndexRaw, colorRaw) {
  const gid      = (gridIdRaw ?? '').trim() || 'grid1'
  const rowIndex = Math.max(0, Math.round(Number(rowIndexRaw) || 0))
  const color    = colorRaw ? resolveColor(colorRaw) : undefined
  return { snapshot: null, script: [{ type: 'table-highlight-row', id: gid, rowIndex, color }] }
}

// ── tab-clear-row-highlight ────────────────────────────────────────────────────
export function demoTableClearRowHighlight(gridIdRaw) {
  const gid = (gridIdRaw ?? '').trim() || 'grid1'
  return { snapshot: null, script: [{ type: 'table-clear-row-highlight', id: gid }] }
}

// ── Comments ──────────────────────────────────────────────────────────────────

// Exact point — user provides (x, y) directly
export function demoAddCommentGraph(textRaw, xRaw, yRaw, colorRaw, cmtIdRaw) {
  const text  = (textRaw  || 'f(0) = 1').trim()
  const x     = Number(xRaw) || 0
  const y     = Number(yRaw) || 0
  const color = (colorRaw || '#60a5fa').trim()
  const id    = (cmtIdRaw || '').trim() || crypto.randomUUID()
  return {
    snapshot: null,
    script: [{ type: 'add-comment', id, text, color, target: { type: 'graph', mode: 'point', x, y } }],
  }
}

// On-curve — y is auto-computed as f(x) at runtime
export function demoAddCommentGraphFunc(textRaw, funcIdRaw, xRaw, colorRaw, cmtIdRaw) {
  const text   = (textRaw   || 'f(x)').trim()
  const funcId = (funcIdRaw || 'f').trim()
  const x      = Number(xRaw) || 0
  const color  = (colorRaw  || '#60a5fa').trim()
  const id     = (cmtIdRaw || '').trim() || crypto.randomUUID()
  return {
    snapshot: null,
    script: [{ type: 'add-comment', id, text, color, target: { type: 'graph', mode: 'func', funcId, x, y: 0 } }],
  }
}

// Inside shaded area — dot placed at 40% of f(x), inside the region
export function demoAddCommentGraphArea(textRaw, funcIdRaw, xRaw, colorRaw, cmtIdRaw) {
  const text   = (textRaw   || 'area').trim()
  const funcId = (funcIdRaw || 'f').trim()
  const x      = Number(xRaw) || 0
  const color  = (colorRaw  || '#60a5fa').trim()
  const id     = (cmtIdRaw || '').trim() || crypto.randomUUID()
  return {
    snapshot: null,
    script: [{ type: 'add-comment', id, text, color, target: { type: 'graph', mode: 'area', funcId, x, y: 0 } }],
  }
}

export function demoAddCommentGrid(textRaw, gridIdRaw, colRaw, rowRaw, colorRaw, cmtIdRaw) {
  const text   = (textRaw   || 'Header').trim()
  const gridId = (gridIdRaw || 'grid1').trim()
  const col    = Number(colRaw) || 0
  const row    = Number(rowRaw) || 0
  const color  = (colorRaw || '#60a5fa').trim()
  const id     = (cmtIdRaw || '').trim() || crypto.randomUUID()
  return {
    snapshot: null,
    script: [{ type: 'add-comment', id, text, color, target: { type: 'grid', gridId, col, row } }],
  }
}

export function demoAddCommentGeo(textRaw, shapeIdRaw, vertexIndexRaw, colorRaw, cmtIdRaw) {
  const text        = (textRaw   || 'Vertex A').trim()
  const shapeId     = (shapeIdRaw || 'triangle').trim()
  const vertexIndex = Number(vertexIndexRaw) || 0
  const color       = (colorRaw || '#60a5fa').trim()
  const id          = (cmtIdRaw || '').trim() || crypto.randomUUID()
  return {
    snapshot: null,
    script: [{ type: 'add-comment', id, text, color, target: { type: 'geo-vertex', shapeId, vertexIndex } }],
  }
}

export function demoAddCommentGeoEdge(textRaw, shapeIdRaw, edgeIndexRaw, colorRaw, cmtIdRaw) {
  const text      = (textRaw     || 'Hypotenuse').trim()
  const shapeId   = (shapeIdRaw  || 'triangle').trim()
  const edgeIndex = Number(edgeIndexRaw) || 0
  const color     = (colorRaw    || '#f59e0b').trim()
  const id        = (cmtIdRaw || '').trim() || crypto.randomUUID()
  return {
    snapshot: null,
    script: [{ type: 'add-comment', id, text, color, target: { type: 'geo-edge', shapeId, edgeIndex } }],
  }
}

export function demoAddCommentEquation(textRaw, sideRaw, indicesRaw, colorRaw, cmtIdRaw) {
  const text    = (textRaw    || 'This term').trim()
  const side    = (sideRaw    || 'both').trim()   // 'both' = whole equation | 'left' | 'right'
  // Empty indices = whole scope (one merged frame); explicit list = specific cells.
  const indices = (indicesRaw || '').split(',').map(s => Number(s.trim())).filter(isFinite)
  const color   = (colorRaw  || '#60a5fa').trim()
  const id      = (cmtIdRaw || '').trim() || crypto.randomUUID()
  return {
    snapshot: null,
    script: [{ type: 'add-comment', id, text, color, target: { type: 'equation', side, indices } }],
  }
}

// Free-floating comment — no connector line, no anchor target. Just sits on
// the requested side of the content area, stacked with any other comments.
export function demoAddCommentFree(textRaw, sideRaw, colorRaw, cmtIdRaw, titleRaw) {
  const text  = (textRaw || 'Note').trim()
  const side  = (sideRaw || 'right').trim()   // 'left' | 'right'
  const color = (colorRaw || '#60a5fa').trim()
  const id    = (cmtIdRaw || '').trim() || crypto.randomUUID()
  const title = (titleRaw || '').trim() || null
  return {
    snapshot: null,
    script: [{ type: 'add-comment', id, title, text, color, target: { type: 'free', side } }],
  }
}

export function demoClearComments() {
  return { snapshot: null, script: [{ type: 'clear-comments' }] }
}

export function demoUpdateComment(cmtIdRaw, textRaw, colorRaw) {
  const id    = (cmtIdRaw || '').trim()
  if (!id) throw new Error('Comment ID is required for cmt-update.')
  const text  = (textRaw  || '').trim() || null
  const color = (colorRaw || '').trim() || null
  return { snapshot: null, script: [{ type: 'update-comment', id, text, color }] }
}

// ── narrate ───────────────────────────────────────────────────────────────────
export function demoNarrate(textRaw) {
  const text = (textRaw || '').trim()
  if (!text) return { snapshot: null, script: [] }
  return { snapshot: null, script: [{ type: 'set-narration', text }] }
}

// ── set-layout ────────────────────────────────────────────────────────────────
// Switches the page's layout mid-script (e.g. text-equation → single-equation
// → graph-equation as a derivation progresses). App.jsx's display slots are
// always mounted, so this doesn't remount anything — CSS transitions on
// .display-slot turn it into a smooth resize/reposition (shared slots) or
// fade (slots appearing/disappearing) instead of an instant pop.
export function demoSetLayout(modeRaw) {
  const mode = (modeRaw || '').trim()
  if (!mode) throw new Error('Choose a layout for set-layout.')
  return { snapshot: null, script: [{ type: 'set-layout', mode }] }
}

// ── eq-full-solve ─────────────────────────────────────────────────────────────
// Animated step-by-step solve of the equation currently on the page. No answer-jump.
export function demoEquationFullSolve() {
  return { snapshot: null, script: [{ type: 'full-solve-current' }] }
}

// ── quadratic-solve ───────────────────────────────────────────────────────────
// Named funcId for lesson builders. Routes through full-solve-current which
// auto-detects quadratics and uses the formula highlight + LaTeX branch.
export function demoQuadraticSolve() {
  return { snapshot: null, script: [{ type: 'full-solve-current' }] }
}

// ── eq-distribute ─────────────────────────────────────────────────────────────
// currentSnapshot: the live equation snapshot (preferred); eqText fallback for
// standalone/demo use where no current equation exists yet.
export function demoEquationDistribute(eqText, currentSnapshot) {
  let snapshot, ownedSnapshot
  if (currentSnapshot) {
    snapshot = currentSnapshot
    ownedSnapshot = false        // don't replace the equation — operate in place
  } else {
    const eq = (eqText || '2(x + 3) = 10').trim()
    snapshot = parseEquation(eq).snapshot()
    ownedSnapshot = true
  }
  const script = generateDistributeScript(snapshot)
  if (script.length <= 1) throw new Error('No parentheses found to distribute.')
  return { snapshot: ownedSnapshot ? snapshot : null, script }
}

// ── eq-create ─────────────────────────────────────────────────────────────────
export function demoEquationCreate(eqText) {
  const eq = substituteValueRefs((eqText || '3x + 5 = 14').trim())
  const isRich = /\|[^|]+\|/.test(eq) || /\//.test(eq) || /\b(sin|cos|tan|cot|sec|csc)\s*\(/.test(eq)
  const snapshot = (isRich ? parseRichEquation(eq) : parseEquation(eq)).snapshot()
  const script = [{ type: 'renderEquation' }]
  // "pi" in the raw string → the equation itself already renders the π glyph
  // (see parseEquation.js's substitutePi); also float a small one-time note
  // explaining what it numerically is, the first time it shows up.
  if (/\bpi\b/i.test(eq) || /π/.test(eq)) {
    script.push({
      type: 'add-comment', id: 'pi-explainer', title: null,
      text: `π ≈ ${Math.PI.toFixed(5)}`,
      target: { type: 'free', side: 'right' },
    })
  }
  return { snapshot, script }
}

// ── Text boxes ────────────────────────────────────────────────────────────────

export function demoTextCreate(boxId, title, content, isList, color) {
  const id     = (boxId  || 'box1').trim()
  const titleV = (title  || '').trim()
  const items  = (content || 'This is the first line.|Second line with $x^2 + y^2 = r^2$.')
    .split('|').map(s => s.trim()).filter(Boolean)
  // 'steps' stays a string (numbered list); anything else collapses to the
  // existing bullet/paragraph boolean so old 'true'/'false' content is unaffected.
  const isListRaw = String(isList)
  const isListV   = isListRaw === 'steps' ? 'steps' : isListRaw === 'true'
  const colorV  = (color || '').trim()
  return {
    snapshot: null,
    script: [{ type: 'text-create', id, title: titleV || null, items, isList: isListV, color: colorV }],
  }
}

export function demoTextAddItem(boxId, item) {
  const id   = (boxId || 'box1').trim()
  const text = (item  || 'New item').trim()
  return { snapshot: null, script: [{ type: 'text-add-item', id, text }] }
}

export function demoTextRemoveItem(boxId, index) {
  const id  = (boxId || 'box1').trim()
  const idx = Number(index ?? -1)
  return { snapshot: null, script: [{ type: 'text-remove-item', id, index: idx }] }
}

export function demoTextUpdateTitle(boxId, title) {
  const id     = (boxId  || 'box1').trim()
  const titleV = (title  || 'Updated Title').trim()
  return { snapshot: null, script: [{ type: 'text-update-title', id, title: titleV }] }
}

export function demoTextRemove(boxId) {
  const id = (boxId || 'box1').trim()
  return { snapshot: null, script: [{ type: 'text-remove', id }] }
}

export function demoTextFadeContent(boxIdRaw, contentRaw) {
  const id      = (boxIdRaw  || 'box1').trim()
  const content = (contentRaw || '[eq-result]').trim()
  return { snapshot: null, script: [{ type: 'text-fade-content', id, content }] }
}

// ── calc-step / calc-clear ───────────────────────────────────────────────────

export function demoCalcStep(latexRaw) {
  const latex = (latexRaw || '').trim()
  const id    = `cs_${Date.now()}`
  return { snapshot: null, script: [{ type: 'calc-step', id, latex }] }
}

export function demoCalcClear() {
  return { snapshot: null, script: [{ type: 'calc-clear' }] }
}

// ── clock (children) ─────────────────────────────────────────────────────────

export function demoClockShow(hourRaw, minuteRaw) {
  const hour   = Math.max(0, Math.min(12, Number(hourRaw)   || 0))
  const minute = Math.max(0, Math.min(59, Number(minuteRaw) || 0))
  return {
    snapshot: null,
    script: [
      { type: 'clock-show', hour, minute },
    ],
  }
}

export function demoClockSetTime(hourRaw, minuteRaw) {
  const hour   = Math.max(0, Math.min(12, Number(hourRaw)   || 0))
  const minute = Math.max(0, Math.min(59, Number(minuteRaw) || 0))
  return {
    snapshot: null,
    script: [
      { type: 'clock-set-time', hour, minute },
    ],
  }
}

export function demoClockHighlightHand(handRaw) {
  const hand = handRaw === 'minute' ? 'minute' : 'hour'
  return {
    snapshot: null,
    script: [
      { type: 'clock-highlight-hand', hand },
      { type: 'pause', seconds: 2.5 },
      { type: 'clock-clear-highlight' },
    ],
  }
}

// ── MDAS / order of operations (children) ────────────────────────────────────

function tokenizeMdas(str) {
  // Normalize operators
  const s = str.trim()
    .replace(/\*/g, '×').replace(/÷|\//g, '÷')
    .replace(/−/g, '-')
  const tokens = []
  let i = 0
  while (i < s.length) {
    if (s[i] === ' ') { i++; continue }
    if (/\d/.test(s[i])) {
      let num = ''
      while (i < s.length && /\d/.test(s[i])) num += s[i++]
      tokens.push({ kind: 'num', text: num, value: parseInt(num, 10) })
    } else {
      const ch = s[i++]
      tokens.push({ kind: 'op', text: ch === '-' ? '−' : ch })
    }
  }
  return tokens
}

export const MDAS_PRESETS = [
  '3 × 2 + 4',
  '10 - 2 × 3 + 1',
  '4 + 8 ÷ 2 - 1 × 3',
]

export function demoMdasExample(exprRaw, lang = 'en') {
  const raw = (exprRaw || MDAS_PRESETS[0]).trim()
  const parsed = tokenizeMdas(raw)

  if (parsed.length < 3 || parsed.length % 2 === 0) {
    throw new Error('Expression must alternate numbers and operators: num op num [op num ...]')
  }

  let cur = parsed.map((tok, i) => ({ ...tok, id: `t${i}` }))
  const script = []

  // Rules text box on the left panel
  script.push({
    type: 'text-create', id: 'mdas-rules',
    title: t('mdas.rules.title', lang),
    items: [
      t('mdas.rules.M', lang),
      t('mdas.rules.D', lang),
      '─────────────',
      t('mdas.rules.A', lang),
      t('mdas.rules.S', lang),
      t('mdas.rules.ltr', lang),
    ],
    isList: true, color: '#f97316',
  })

  // Show the full expression
  script.push({ type: 'mdas-set-expr', tokens: cur.map(tok => ({ id: tok.id, kind: tok.kind, text: tok.text })) })
  script.push({ type: 'pause', seconds: 0.8 })

  let stepN = 1

  // ── Pass 1: × and ÷ left to right ───────────────────────────────────────
  let changed = true
  while (changed) {
    changed = false
    for (let j = 1; j < cur.length; j += 2) {
      const op = cur[j]
      if (op.text === '×' || op.text === '÷') {
        const left   = cur[j - 1].value
        const right  = cur[j + 1].value
        const result = op.text === '×' ? left * right : Math.floor(left / right)
        const key    = op.text === '×' ? 'mdas.step.mult' : 'mdas.step.div'
        const color  = '#f97316'
        script.push({ type: 'mdas-highlight', from: j - 1, to: j + 1, color, label: t(key, lang, { left, right: right, result }) })
        script.push({ type: 'pause', seconds: 1.5 })
        script.push({ type: 'mdas-collapse', from: j - 1, to: j + 1, result: String(result), color })
        script.push({ type: 'pause', seconds: 0.7 })
        const rid = `r${stepN++}`
        cur = [...cur.slice(0, j - 1), { kind: 'num', id: rid, text: String(result), value: result }, ...cur.slice(j + 2)]
        changed = true
        break
      }
    }
  }

  // ── Pass 2: + and − left to right ───────────────────────────────────────
  while (cur.length > 1) {
    for (let j = 1; j < cur.length; j += 2) {
      const op     = cur[j]
      const left   = cur[j - 1].value
      const right  = cur[j + 1].value
      const result = op.text === '+' ? left + right : left - right
      const key    = op.text === '+' ? 'mdas.step.add' : 'mdas.step.sub'
      const color  = op.text === '+' ? '#22c55e' : '#22d3ee'
      script.push({ type: 'mdas-highlight', from: j - 1, to: j + 1, color, label: t(key, lang, { left, right: right, result }) })
      script.push({ type: 'pause', seconds: 1.5 })
      script.push({ type: 'mdas-collapse', from: j - 1, to: j + 1, result: String(result), color })
      script.push({ type: 'pause', seconds: 0.7 })
      const rid = `r${stepN++}`
      cur = [...cur.slice(0, j - 1), { kind: 'num', id: rid, text: String(result), value: result }, ...cur.slice(j + 2)]
      break
    }
  }

  return { snapshot: null, script }
}

// ── chiffres (digit grid for children) ───────────────────────────────────────

export function demoNumbersShow() {
  return {
    snapshot: null,
    script: [
      { type: 'numbers-show' },
    ],
  }
}

export function demoNumbersShowNumeral(nRaw) {
  const n = Math.max(1, Math.min(9, Number(nRaw) || 1))
  return {
    snapshot: null,
    script: [
      { type: 'numbers-show-numeral', n },
    ],
  }
}

// ── arith-solve (vertical arithmetic for children) ───────────────────────────

function _arithDigits(n, cols) {
  const abs = Math.abs(Math.round(n))
  return Array.from({ length: cols }, (_, i) => Math.floor(abs / Math.pow(10, i)) % 10)
}
function _arithLen(n) { return n === 0 ? 1 : Math.floor(Math.log10(Math.abs(n))) + 1 }
function _normalizeOp(op) {
  const s = String(op).trim()
  if (s === 'x' || s === '*') return '×'
  if (s === '/')              return '÷'
  return s
}

export function demoSimpleCalc(aRaw, opRaw, bRaw) {
  const a  = Number(aRaw)
  const b  = Number(bRaw)
  const op = _normalizeOp(opRaw)
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Invalid numbers for arithmetic')

  let result
  switch (op) {
    case '+': result = a + b; break
    case '-': result = a - b; break
    case '×': result = a * b; break
    case '÷': {
      if (b === 0) throw new Error('Division by zero')
      result = Math.floor(a / b)
      break
    }
    default: throw new Error(`Unknown operator: ${op}`)
  }

  const aLen = _arithLen(a)
  const bLen = _arithLen(b)
  const nc   = Math.max(aLen, bLen, _arithLen(Math.abs(result)))
  const tops = _arithDigits(a, nc)
  const bots = _arithDigits(b, nc)

  const script = [
    { type: 'arith-init', a, op, b },
    { type: 'pause', seconds: 1.0 },
  ]

  if (op === '+') {
    const carries = Array(nc + 2).fill(0)
    for (let col = 0; col < nc; col++) {
      const t   = tops[col] ?? 0
      const bb  = bots[col] ?? 0
      const c   = carries[col]
      const sum = t + bb + c
      const carry = Math.floor(sum / 10)
      carries[col + 1] = carry
      const digit = sum % 10

      script.push({ type: 'arith-col-highlight', col })

      script.push({ type: 'arith-side-calc-setup', top: String(t), op: '+', bot: String(bb), result: String(sum) })
      script.push({ type: 'arith-fly-digit', col, part: 'top', text: String(t) })
      script.push({ type: 'arith-fly-digit', col, part: 'bot', text: String(bb) })
      script.push({ type: 'arith-sc-show-eq' })
      script.push({ type: 'pause', seconds: 0.8 })
      if (carry > 0) script.push({ type: 'arith-carry', col: col + 1, digit: carry })
      script.push({ type: 'arith-fly-result', col, text: String(digit) })
      script.push({ type: 'arith-side-calc-hide' })
      script.push({ type: 'arith-col-highlight', col: null })
      if (col < nc - 1) script.push({ type: 'pause', seconds: 0.5 })
    }
    if (carries[nc] > 0) {
      script.push({ type: 'arith-col-highlight', col: nc })
      script.push({ type: 'arith-show-result', col: nc })
      script.push({ type: 'arith-col-highlight', col: null })
    }

  } else if (op === '-') {
    const modTops = [...tops]
    for (let col = 0; col < nc; col++) {
      const t  = modTops[col] ?? 0
      const bb = bots[col] ?? 0

      script.push({ type: 'arith-col-highlight', col })

      if (t < bb) {
        // Explain that t - bb is negative before borrowing
        script.push({ type: 'arith-hint', text: `${t} − ${bb} est négatif → on emprunte une dizaine !` })
        script.push({ type: 'pause', seconds: 1.4 })
        script.push({ type: 'arith-hint-hide' })

        // Borrow from next column
        let fromCol = col + 1
        while (fromCol < nc && (modTops[fromCol] ?? 0) === 0) {
          modTops[fromCol] = 9
          fromCol++
        }
        modTops[fromCol] = (modTops[fromCol] ?? 0) - 1
        modTops[col] = t + 10
        script.push({ type: 'arith-borrow', fromCol, toCol: col, newFromDigit: modTops[fromCol], newToDigit: modTops[col] })

        const diff = modTops[col] - bb
        script.push({ type: 'arith-side-calc-setup', top: String(modTops[col]), op: '−', bot: String(bb), result: String(diff) })
        // Top comes from the small borrow digit above, bot from the bot cell
        script.push({ type: 'arith-fly-digit', col, part: 'top', text: String(modTops[col]) })
        script.push({ type: 'arith-fly-digit', col, part: 'bot', text: String(bb) })
        script.push({ type: 'arith-sc-show-eq' })
        script.push({ type: 'pause', seconds: 0.8 })
        script.push({ type: 'arith-fly-result', col, text: String(diff) })
        script.push({ type: 'arith-side-calc-hide' })
      } else {
        if (bb > 0 || col === 0) {
          script.push({ type: 'arith-side-calc-setup', top: String(t), op: '−', bot: String(bb), result: String(t - bb) })
          script.push({ type: 'arith-fly-digit', col, part: 'top', text: String(t) })
          script.push({ type: 'arith-fly-digit', col, part: 'bot', text: String(bb) })
          script.push({ type: 'arith-sc-show-eq' })
          script.push({ type: 'pause', seconds: 0.8 })
          script.push({ type: 'arith-fly-result', col, text: String(t - bb) })
          script.push({ type: 'arith-side-calc-hide' })
        } else {
          script.push({ type: 'arith-show-result', col })
        }
      }

      script.push({ type: 'arith-col-highlight', col: null })
      if (col < nc - 1) script.push({ type: 'pause', seconds: 0.5 })
    }

  } else if (op === '×') {
    // Single-digit multiplier column-by-column; fall back to result-only for multi×multi
    const singleDigit = Math.min(aLen, bLen) === 1
    if (singleDigit) {
      const [topDigs, botDig] = aLen <= bLen ? [bots, a] : [tops, b]
      const tLen = aLen <= bLen ? bLen : aLen
      const carries = Array(nc + 2).fill(0)
      for (let col = 0; col < tLen; col++) {
        const t    = topDigs[col] ?? 0
        const c    = carries[col]
        const prod = t * botDig + c
        const carry = Math.floor(prod / 10)
        carries[col + 1] = carry

        script.push({ type: 'arith-col-highlight', col })
        const carryPart = c > 0 ? ` + ${c}` : ''
        script.push({ type: 'arith-side-calc', text: `${t} × ${botDig}${carryPart} = ${prod}`, show: true })
        script.push({ type: 'pause', seconds: 1.0 })
        if (carry > 0) script.push({ type: 'arith-carry', col: col + 1, digit: carry })
        script.push({ type: 'arith-show-result', col })
        script.push({ type: 'arith-side-calc', show: false })
        script.push({ type: 'arith-col-highlight', col: null })
        if (col < tLen - 1) script.push({ type: 'pause', seconds: 0.5 })
      }
      if (carries[tLen] > 0) {
        script.push({ type: 'arith-show-result', col: tLen })
      }
    } else {
      // Multi-digit × multi-digit: reveal digits right to left without intermediate calcs
      for (let col = nc - 1; col >= 0; col--) {
        script.push({ type: 'arith-show-result', col })
        script.push({ type: 'pause', seconds: 0.5 })
      }
    }

  } else if (op === '÷') {
    // Reveal result digits left to right (most significant first)
    for (let col = nc - 1; col >= 0; col--) {
      script.push({ type: 'arith-show-result', col })
      script.push({ type: 'pause', seconds: 0.3 })
    }
  }

  return { snapshot: null, script }
}

// ── mult-table-show ───────────────────────────────────────────────────────────

export function demoMultTableShow(maxNRaw) {
  const maxN = Math.max(2, Math.min(15, Number(maxNRaw) || 10))
  return {
    snapshot: null,
    script: [
      { type: 'mult-init', maxN },
    ],
  }
}

// ── mult-table-highlight ──────────────────────────────────────────────────────

export function demoMultHighlight(rowRaw, colRaw) {
  // Always land in the colorful half (row >= col) — swap if needed
  const a = Number(rowRaw), b = Number(colRaw)
  const row = Math.max(a, b)
  const col = Math.min(a, b)
  return {
    snapshot: null,
    script: [
      { type: 'mult-highlight', row, col },
      { type: 'pause', seconds: 2.0 },
      { type: 'mult-clear-highlight' },
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PIZZA FRACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function demoPizzaShow(slices, shaded, showLabel = 'true') {
  return {
    snapshot: null,
    script: [
      { type: 'pizza-show', slices: Number(slices) || 4, shaded: Number(shaded) || 1, showLabel: showLabel !== 'false' },
      { type: 'pause', seconds: 0.4 },
    ],
  }
}

export function demoPizzaShade(shaded) {
  return {
    snapshot: null,
    script: [
      { type: 'pizza-shade', shaded: Number(shaded) || 0 },
      { type: 'pause', seconds: 0.5 },
    ],
  }
}

export function demoPizzaCompare(slices2, shaded2, showLabel2 = 'true') {
  return {
    snapshot: null,
    script: [
      { type: 'pizza-compare', slices2: Number(slices2) || 8, shaded2: Number(shaded2) || 3, showLabel2: showLabel2 !== 'false' },
      { type: 'pause', seconds: 0.4 },
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OBJECT COUNTER
// ─────────────────────────────────────────────────────────────────────────────

export function demoCounterShow(count, type = '🍎') {
  return {
    snapshot: null,
    script: [
      { type: 'counter-show', count: Number(count) || 5, emoji: type || '🍎' },
      { type: 'pause', seconds: 0.5 },
    ],
  }
}

export function demoCounterAdd(count, type = '') {
  return {
    snapshot: null,
    script: [
      { type: 'counter-add', count: Number(count) || 3, emoji: type || '' },
      { type: 'pause', seconds: 0.6 },
    ],
  }
}

export function demoCounterGroup(groupSize, color = '#818cf8') {
  return {
    snapshot: null,
    script: [
      { type: 'counter-group', groupSize: Number(groupSize) || 2, color },
      { type: 'pause', seconds: 0.3 },
    ],
  }
}

export function demoCounterRemove(count) {
  return {
    snapshot: null,
    script: [
      { type: 'counter-remove', count: Number(count) || 2 },
      { type: 'pause', seconds: 0.6 },
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NUMBER LINE
// ─────────────────────────────────────────────────────────────────────────────

export function demoNumberlineShow(from, to) {
  return {
    snapshot: null,
    script: [
      { type: 'numberline-show', from: Number(from) ?? 0, to: Number(to) ?? 10 },
      { type: 'pause', seconds: 0.5 },
    ],
  }
}

export function demoNumberlineMark(value, label = '', color = '#ef4444') {
  return {
    snapshot: null,
    script: [
      { type: 'numberline-mark', value: Number(value) || 0, label: label || String(value), color },
      { type: 'pause', seconds: 0.5 },
    ],
  }
}

export function demoNumberlineJump(from, steps, size = 1, color = '#4ade80', label = '') {
  return {
    snapshot: null,
    script: [
      { type: 'numberline-jump', from: Number(from) || 0, steps: Number(steps) || 3, size: Number(size) || 1, color, label },
      { type: 'pause', seconds: 0.8 },
    ],
  }
}

export function demoNumberlineShade(from, to, color = '#818cf840') {
  return {
    snapshot: null,
    script: [
      { type: 'numberline-shade', from: Number(from) || 0, to: Number(to) || 5, color },
      { type: 'pause', seconds: 0.3 },
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CELEBRATE (confetti burst via CSS animation on body)
// ─────────────────────────────────────────────────────────────────────────────

export function demoCelebrate() {
  return {
    snapshot: null,
    script: [
      { type: 'celebrate' },
      { type: 'pause', seconds: 1.5 },
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEO 3D
// ─────────────────────────────────────────────────────────────────────────────

export function demoGeo3dCreate(idRaw, typeRaw, aRaw, bRaw, cRaw, colorRaw) {
  const id    = (idRaw || 'shape1').trim()
  const type  = (typeRaw || 'cube').trim().toLowerCase()
  const a     = aRaw !== '' && aRaw != null ? Number(aRaw) : undefined
  const b     = bRaw !== '' && bRaw != null ? Number(bRaw) : undefined
  const c     = cRaw !== '' && cRaw != null ? Number(cRaw) : undefined
  const color = (colorRaw || 'blue').trim()
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-create', id, shape: type, a, b, c, opts: { color } }],
  }
}

export function demoGeo3dRemove(idRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-remove', id: (idRaw || 'shape1').trim() }],
  }
}

export function demoGeo3dMove(idRaw, dxRaw, dyRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-move', id: (idRaw || 'shape1').trim(), dx: Number(dxRaw ?? 2), dy: Number(dyRaw ?? 0) }],
  }
}

export function demoGeo2dFlip(idRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-2d-flip', id: (idRaw || 'shape1').trim() }],
  }
}

export function demoGeo2dRotate(idRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-2d-rotate', id: (idRaw || 'shape1').trim(), degrees: 90 }],
  }
}

export function demoGeo3dHighlight(idRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-highlight', id: (idRaw || 'shape1').trim() }],
  }
}

export function demoGeo3dLabelSides(idRaw, labelsRaw) {
  const id     = (idRaw || 'shape1').trim()
  // Preserve empty entries so ",,5" means "skip first two, set third to 5"
  const labels = labelsRaw
    ? String(labelsRaw).split(',').map(s => s.trim())
    : []
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-label-sides', id, labels }],
  }
}

export function demoGeo3dShowAngles(idRaw, colorRaw, showValuesRaw) {
  return {
    snapshot: null,
    script: [{
      type: 'ggb-3d-show-angles', id: (idRaw || 'shape1').trim(), color: colorRaw || 'blue',
      showValues: showValuesRaw === true || showValuesRaw === 'true',
    }],
  }
}

export function demoGeo3dHighlightAngle(idRaw, angleIndexRaw, colorRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-highlight-angle', id: (idRaw || 'shape1').trim(), angleIndex: Number(angleIndexRaw ?? 0), color: colorRaw || 'cyan' }],
  }
}

export function demoGeo3dShowArrow(idRaw, arrowIdRaw, fromRaw, toRaw, colorRaw) {
  return {
    snapshot: null,
    script: [{
      type:    'ggb-3d-show-arrow',
      id:      (idRaw      || 'shape1').trim(),
      arrowId: (arrowIdRaw || 'arr1'  ).trim(),
      from:    (fromRaw    || 'v0'    ).trim(),
      to:      (toRaw      || 'v1'    ).trim(),
      color:   colorRaw || 'yellow',
    }],
  }
}

export function demoGeo3dRemoveArrow(idRaw, arrowIdRaw) {
  return {
    snapshot: null,
    script: [{
      type:    'ggb-3d-remove-arrow',
      id:      (idRaw      || 'shape1').trim(),
      arrowId: (arrowIdRaw || 'arr1'  ).trim(),
    }],
  }
}

export function demoGeo3dClearHighlights(idRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-clear-highlights', id: (idRaw || 'shape1').trim() }],
  }
}

export function demoGeo3dSetView(zoomRaw, panXRaw, panYRaw, distanceRaw, durationRaw, presetRaw) {
  const zoom     = parseFloat(zoomRaw)     || 1
  const panX     = parseFloat(panXRaw)     || 0
  const panY     = parseFloat(panYRaw)     || 0
  const distance = parseFloat(distanceRaw) || null
  const duration = parseFloat(durationRaw) || 0.3
  const preset   = (presetRaw || '').trim() || null
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-set-view', zoom, panX, panY, distance, duration, preset }],
  }
}

// edgeIndexRaw accepts a comma-separated list (e.g. "0,1,2") to highlight
// several edges one after another instead of calling this function repeatedly.
export function demoGeo3dHighlightEdge(idRaw, edgeIndexRaw, colorRaw) {
  const id      = (idRaw || 'shape1').trim()
  const color   = colorRaw || 'orange'
  const indices = String(edgeIndexRaw ?? 0).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
  const script  = []
  ;(indices.length ? indices : [0]).forEach((edgeIndex, i) => {
    if (i > 0) script.push({ type: 'pause', seconds: 0.2 })
    script.push({ type: 'ggb-3d-highlight-edge', id, edgeIndex, color })
  })
  return { snapshot: null, script }
}

export function demoGeo3dRemoveEdgeHighlight(idRaw, edgeIndexRaw) {
  const id      = (idRaw || 'shape1').trim()
  const indices = String(edgeIndexRaw ?? 0).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
  return {
    snapshot: null,
    script: (indices.length ? indices : [0]).map(edgeIndex => ({ type: 'ggb-3d-remove-edge-highlight', id, edgeIndex })),
  }
}

// ── geo3d-highlight-face ──────────────────────────────────────────────────────
// Cube / rectangular-prism only — 6 faces, indices: 0=+X 1=-X 2=+Y(top) 3=-Y(bottom) 4=+Z 5=-Z
export function demoGeo3dHighlightFace(idRaw, faceIndexRaw, colorRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-highlight-face', id: (idRaw || 'shape1').trim(), faceIndex: Number(faceIndexRaw ?? 0), color: colorRaw || 'orange' }],
  }
}

export function demoGeo3dRemoveFaceHighlight(idRaw, faceIndexRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-remove-face-highlight', id: (idRaw || 'shape1').trim(), faceIndex: Number(faceIndexRaw ?? 0) }],
  }
}

// ── geo3d-show-tick ────────────────────────────────────────────────────────────
// Congruent-side tick marks — 1, 2 or 3 dashes crossing an edge's midpoint.
// edgeIndexRaw accepts a comma-separated list (e.g. "0,1") to mark several
// sides with the same tick count in one call instead of calling this repeatedly.
export function demoGeo3dShowTick(idRaw, edgeIndexRaw, ticksRaw, colorRaw) {
  const id      = (idRaw || 'shape1').trim()
  const ticks   = Number(ticksRaw) || 1
  const color   = colorRaw || 'blue'
  const indices = String(edgeIndexRaw ?? 0).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
  return {
    snapshot: null,
    script: (indices.length ? indices : [0]).map(edgeIndex => ({ type: 'ggb-3d-show-tick', id, edgeIndex, ticks, color })),
  }
}

export function demoGeo3dRemoveTick(idRaw, edgeIndexRaw) {
  const id      = (idRaw || 'shape1').trim()
  const indices = String(edgeIndexRaw ?? 0).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
  return {
    snapshot: null,
    script: (indices.length ? indices : [0]).map(edgeIndex => ({ type: 'ggb-3d-remove-tick', id, edgeIndex })),
  }
}

export function demoGeo3dAddText(labelIdRaw, textRaw, xRaw, yRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-add-text', id: (labelIdRaw || 'lbl1').trim(), text: textRaw || '', x: Number(xRaw ?? 0), y: Number(yRaw ?? -4) }],
  }
}

export function demoGeo3dClear() {
  return { snapshot: null, script: [{ type: 'ggb-3d-clear' }] }
}

// ── geo3d-show-volume-measures ────────────────────────────────────────────────
// Labels exactly the dimensions needed for THAT shape's volume formula —
// cube→a, sphere→r, cone/cylinder→r,h, prism→l,w,h, pyramid→a,h,
// tetrahedron/octahedron→a, torus→R,r.
export function demoGeo3dShowVolumeMeasures(idRaw, colorRaw) {
  const id = (idRaw || 'shape1').trim()
  const color = (colorRaw || '').trim()
  const opts = {}
  if (color) opts.color = color
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-show-volume-measures', id, opts }],
  }
}

export function demoGeo3dRemoveVolumeMeasures(idRaw) {
  return {
    snapshot: null,
    script: [{ type: 'ggb-3d-remove-volume-measures', id: (idRaw || 'shape1').trim() }],
  }
}
