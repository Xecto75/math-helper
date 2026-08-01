import katex from 'katex'
import 'katex/dist/katex.min.css'
import { evaluate } from 'mathjs'
import { useLayoutEffect, useRef } from 'react'
import { resolveLatexColors, resolveColor } from '../engine/palette.js'
import { resolveValueRef, VALUE_TOKEN_PATTERN } from '../engine/valueRefs.js'

// Replace live value references with the actual stored value from the
// object that created them — see valueRefs.js for the full token list:
//   [id]N    → side N's length (geometry)        [id]h    → height
//   [id]r    → radius (circle / cylinder / cone)  [id]aN   → vertex angle N
//   [id]l/d/R→ 3D-solid length/depth/outer-radius [id]x/y  → graph point
//   [id]x1/y1/x2/y2/len → graph segment           [id]expr → plotted f(x)
//   [id]r<row>c<col>    → table cell
// Leaves the token untouched if the object isn't found (usually means it
// hasn't been created yet — create it before the text/narration/comment).
const GEO_REF_RE = new RegExp(`\\[([^\\]]+)\\](${VALUE_TOKEN_PATTERN})`, 'g')
function resolveGeoRefs(str) {
  return str.replace(GEO_REF_RE, (m, id, tok) => {
    const v = resolveValueRef(id, tok)
    if (v === undefined) return m
    return typeof v === 'number' ? String(parseFloat(v.toFixed(2))) : v
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

// A rendered KaTeX formula never wraps — a chained equality like
// "a/sinA = b/sinB = c/sinC" can be wider than its box. Rather than let it
// spill out (forcing an overflow-x scrollbar) or clip it, shrink the whole
// formula down with `zoom` until it fits the nearest block-level ancestor
// (walking past the inline wrapper spans MathText itself renders).
function FitKatex({ html, block }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const blockAncestor = () => {
      let cur = el.parentElement
      while (cur && getComputedStyle(cur).display === 'inline') cur = cur.parentElement
      return cur
    }
    const fit = () => {
      el.style.zoom = 1
      const container = blockAncestor()
      if (!container) return
      const cs = getComputedStyle(container)
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      const available = container.clientWidth - padX
      const natural = el.scrollWidth
      if (available > 0 && natural > available) el.style.zoom = Math.max(0.4, available / natural)
    }
    fit()
    const container = blockAncestor()
    if (!container) return
    const ro = new ResizeObserver(fit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [html])
  return (
    <span
      ref={ref}
      style={block ? { display: 'block', fontSize: '1.45em' } : { display: 'inline-block', maxWidth: '100%', verticalAlign: 'middle' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// Split on the "|" line separator, but NOT on a pipe inside $…$ — there it is
// an absolute value ($|x|$) or a set-builder bar, not a line break. Callers
// that render multi-line content (text boxes, comments) use this so both
// meanings can live in the same string.
export function splitLines(text) {
  const s = String(text ?? '')
  const out = []
  let buf = '', inMath = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '$') { inMath = !inMath; buf += c; continue }
    if (c === '|' && !inMath) { out.push(buf); buf = ''; continue }
    buf += c
  }
  out.push(buf)
  return out.map(l => l.trim()).filter(Boolean)
}

// A line/item whose ENTIRE content is one $...$ or $$...$$ block, with no
// surrounding words — e.g. a text-box item that's nothing but the formula
// itself. Callers use this to center that line instead of left-aligning it
// like ordinary sentences.
export function isPureMathLine(text) {
  const resolved = evalExprs(resolveGeoRefs(text ?? '')).trim()
  const parts = parseMath(resolved)
  return parts.length === 1 && parts[0].t === 'math'
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
      return <FitKatex key={i} html={html} block={p.block} />
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
