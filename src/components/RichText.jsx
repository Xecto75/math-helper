import katex from 'katex'
import 'katex/dist/katex.min.css'
import { evaluate } from 'mathjs'
import { resolveLatexColors, resolveColor } from '../engine/palette.js'
import { getSideLengths, getShapeHeight, getShapeRadius, getVertexAngle } from '../engine/geometryEngine.js'

// Replace geo references with live values from the shape:
//   [shapeId]N  → side N's length         (e.g. "[trap]0" → "10")
//   [shapeId]h  → the shape height        (e.g. "[para]h" → "4")
//   [shapeId]r  → circle radius           (e.g. "[circ]r" → "3")
//   [shapeId]aN → interior angle at vtx N (e.g. "[tri]a1" → "90")
// Leaves the token untouched if the shape isn't found (usually means it hasn't
// been created yet — create the geo before the text/narration).
function resolveGeoRefs(str) {
  return str.replace(/\[([^\]]+)\](a\d+|\d+|h|r)/g, (m, id, n) => {
    const sid = id.trim()
    const v   = n === 'h'      ? getShapeHeight(sid)
              : n === 'r'      ? getShapeRadius(sid)
              : n[0] === 'a'   ? getVertexAngle(sid, parseInt(n.slice(1)))
              : getSideLengths(sid)[parseInt(n)]
    return v === undefined ? m : String(parseFloat(v.toFixed(2)))
  })
}

// Evaluate {{ expression }} blocks so results are always computed, never hand-typed.
// Runs AFTER resolveGeoRefs, so geo refs inside work too:
//   {{ 1/2 * ([trap]0 + [trap]2) * 4 }} → 28
//   {{ [trap]0 + [trap]1 + [trap]2 + [trap]3 }} → 24
function evalExprs(str) {
  return str.replace(/\{\{([^{}]+)\}\}/g, (m, expr) => {
    try {
      const v = evaluate(expr)
      return String(parseFloat(Number(v).toFixed(2)))
    } catch {
      return m
    }
  })
}

// Parse a string into text / math / bold / sup / color parts.
// Color syntax (no LaTeX needed):  {green: Area}  or  {#f97316: **Area**}
function parseMath(str) {
  const parts = []
  const re = /\$\$([^$]+)\$\$|\$([^$]+)\$|\{([a-zA-Z#0-9]+):([^{}]*)\}|\*\*([^*]+)\*\*|\^(-?[a-zA-Z0-9]+)/g
  let last = 0, m
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push({ t: 'text', s: str.slice(last, m.index) })
    if      (m[1] !== undefined) parts.push({ t: 'math', s: m[1], block: true })
    else if (m[2] !== undefined) parts.push({ t: 'math', s: m[2], block: false })
    else if (m[3] !== undefined) parts.push({ t: 'color', color: m[3], s: m[4] })
    else if (m[5] !== undefined) parts.push({ t: 'bold', s: m[5] })
    else if (m[6] !== undefined) parts.push({ t: 'sup',  s: m[6] })
    last = m.index + m[0].length
  }
  if (last < str.length) parts.push({ t: 'text', s: str.slice(last) })
  return parts
}

function renderParts(parts) {
  return parts.map((p, i) => {
    if (p.t === 'text')  return <span key={i}>{p.s}</span>
    if (p.t === 'bold')  return <strong key={i} style={{ whiteSpace: 'nowrap' }}><MathText text={p.s} /></strong>
    if (p.t === 'color') return <span key={i} style={{ color: resolveColor(p.color) }}><MathText text={p.s} /></span>
    if (p.t === 'sup')   return <sup key={i} style={{ fontSize: '0.7em' }}>{p.s}</sup>
    try {
      const html = katex.renderToString(resolveLatexColors(p.s), {
        throwOnError: false, displayMode: p.block, output: 'html', trust: true,
      })
      // $$…$$ (display math) sits on its own line AND renders larger; $…$ stays inline.
      return <span key={i} style={p.block ? { display: 'block', fontSize: '1.45em' } : undefined}
                   dangerouslySetInnerHTML={{ __html: html }} />
    } catch {
      return <span key={i} className="tb-math-err">{p.s}</span>
    }
  })
}

// Renders text with geo refs, computed {{ }} blocks, {color: …}, **bold**, ^sup,
// $LaTeX$, and line breaks (\n or a real newline). Shared by text boxes, comments,
// and narration.
export default function MathText({ text, className }) {
  const resolved = evalExprs(resolveGeoRefs(text ?? ''))
  const lines    = resolved.split(/\\n|\n/)   // literal "\n" or a real newline
  // Single line → render inline (keeps bold/color recursion inline). Multiple
  // lines → one block per line so they stack.
  if (lines.length === 1) {
    return <span className={className}>{renderParts(parseMath(lines[0]))}</span>
  }
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <span key={li} style={{ display: 'block' }}>{renderParts(parseMath(line))}</span>
      ))}
    </span>
  )
}
