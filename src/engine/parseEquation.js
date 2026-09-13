import { parse } from 'mathjs'
import { MathObject } from './MathObject.js'
import { EquationState } from './EquationState.js'
import { resolveColor, PALETTE } from './palette.js'
import { needsExprTree, parseTermExpr } from './exprTree.js'

// ── Symbolic equation parser ─────────────────────────────────────────────────
// Handles terms like: ax², bx, c (single-letter symbolic coefficients)
// and numeric terms: 3x², 2x, 5.  Example: "ax^2 + bx + c = 5"

// "pi" (or the literal π glyph) in a raw equation string is swapped for this
// exact numeric literal BEFORE either parser below ever sees it — so it flows
// through as an ordinary number (multiplication, powers, combining…) with no
// special-casing anywhere else. TermCell.jsx detects a coefficient equal to
// Math.PI and renders the π glyph instead of the raw decimal on the way back out.
const PI_LITERAL = String(Math.PI)
function substitutePi(str) {
  return String(str).replace(/\bpi\b/gi, PI_LITERAL).replace(/π/g, PI_LITERAL)
}

const SUP_TO_DIGIT = { '⁻': '-', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' }

function convertSuperscripts(str) {
  // Replace runs of unicode superscripts with ^n
  return str.replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m =>
    '^' + [...m].map(c => SUP_TO_DIGIT[c] ?? c).join('')
  )
}

function extractSymbolicTerms(expr) {
  let e = convertSuperscripts(expr.replace(/\s+/g, ''))

  // Protect exponent signs: replace ^-n with placeholder so split doesn't eat the minus
  e = e.replace(/\^(-\d+)/g, (_, n) => `__E${n.replace('-', 'N')}__`)
  e = e.replace(/\^(\d+)/g, (_, n) => `__E${n}__`)

  // Ensure leading sign
  if (e[0] !== '+' && e[0] !== '-') e = '+' + e

  // Split on signs that are NOT inside an exponent placeholder
  const parts = e.match(/[+-][^+-]*/g) ?? []

  return parts.map(part => {
    const sign = part[0] === '-' ? '-' : '+'
    const content = part.slice(1).replace(/__E(N?)(\d+)__/g, (_, neg, n) => `^${neg ? '-' : ''}${n}`)

    // Parse: (symLetter?)(numCoeff?)(variable?)(^exp?)
    const m = content.match(/^([a-z]?)(\d*\.?\d*)([a-z]?)(?:\^(-?\d+))?$/)
    if (!m) return null

    const [, l1, numStr, l2, expStr] = m

    let symbolicLabel, coefficient = 1, variable = null, degree = 0

    if (expStr) degree = parseInt(expStr)

    if (l1 && l2) {
      // 'ax', 'bx' — symbolic letter + variable
      symbolicLabel = l1; variable = l2
      if (!expStr) degree = 1
    } else if (l1 && !l2 && !numStr) {
      // Standalone symbolic letter 'a', 'b', 'c'
      symbolicLabel = l1; variable = null; degree = 0
    } else if (!l1 && numStr && l2) {
      // '3x', '2y' — numeric coefficient + variable
      coefficient = parseFloat(numStr) || 1; variable = l2
      if (!expStr) degree = 1
    } else if (!l1 && numStr && !l2) {
      // '5', '3.14' — constant
      coefficient = parseFloat(numStr); variable = null; degree = 0
    } else if (!l1 && !numStr && l2) {
      // 'x' — implicit coefficient 1
      coefficient = 1; variable = l2
      if (!expStr) degree = 1
    } else {
      return null
    }

    if (!(coefficient || symbolicLabel)) return null
    return { sign, coefficient, symbolicLabel, variable, degree }
  }).filter(Boolean)
}

// ── Rich equation parser ──────────────────────────────────────────────────────
// Supports:
//   |Label|  → symbolic variable (replaceable with replace-variable)
//   a / b    → fraction rendered with a visible bar
//   3x, x^2, constants, variables — same as polynomial parser
//
// Example: "|Opposite| / |Hypotenuse| = sin(θ)"
//          "|x| + 3/4 = y"

export function extractRichLabels(rawInput) {
  return [...new Set([...rawInput.matchAll(/\|([^|]+)\|/g)].map(m => m[1].trim()))]
}

// ── Lists and subscripts ─────────────────────────────────────────────────────
// "3 ; 7 ; 11 ; 15" is a LIST: the terms of a sequence side by side, with
// nothing between them to add. Each item is parsed on its own and its first
// term is marked, so the panel draws a gap there instead of a +. The separator
// is the semicolon because the comma is taken: here it is the decimal point.
// "…" (or "...") standing alone as an item is the "and so on" of a sequence —
// written on the line, and still a cell an arrow can reach.
function splitTopLevel(str, sep) {
  const out = []
  let cur = '', depth = 0
  for (const c of str) {
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    if (c === sep && depth === 0) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out
}

function parseRichList(str) {
  const items = splitTopLevel(str, ';')
  if (items.length < 2) return parseRichSide(str)
  const terms = []
  for (const item of items) {
    const s = item.trim()
    if (!s) continue
    const first = terms.length
    if (s === '…' || s === '...') {
      terms.push({ isOperator: true, text: '…', sign: '+', coefficient: 0, variable: null, degree: 0 })
    } else {
      terms.push(...parseRichSide(s))
    }
    if (terms.length > first) terms[first].listJoin = true
  }
  return terms
}

// u_0, u_n, u_{n+1}: the index of a term, typed the only way a keyboard can and
// drawn as the subscript it is. Left exactly as typed when any character of it
// has no subscript form, rather than half converted.
const SUBSCRIPT = {
  0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ',
  p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
}
export function toSubscripts(str) {
  return str.replace(/([A-Za-zα-ω])_(?:\{([^{}]*)\}|(\d+|[a-z]))/g, (m, base, braced, bare) => {
    const chars = [...(braced ?? bare).replace(/\s+/g, '')]
    return chars.length && chars.every(c => SUBSCRIPT[c]) ? base + chars.map(c => SUBSCRIPT[c]).join('') : m
  })
}

export function parseRichEquation(rawInput) {
  // "6 2/3" is an integer written against a fraction with nothing between
  // them, and it used to parse as 6 with the fraction dropped in silence. It
  // IS a sum — 6 + 2/3 — so it becomes one here, and the term that follows is
  // marked so the panel can hold that "+" back for a moment. Showing the
  // notation first and the operator second is the whole point: the reader sees
  // the two forms are the same thing.
  const mixedAt = []
  rawInput = String(rawInput ?? "").replace(
    /(^|[^0-9.,])(\d+)\s+(\d+\s*\/\s*\d+)/g,
    (m, lead, whole, frac) => { mixedAt.push(whole); return lead + whole + " + " + frac },
  )
  // u_0 → u₀ (see toSubscripts). Only outside |labels|: other steps (Replace
  // Variable) find a label by exactly what was typed.
  rawInput = rawInput.split('|').map((seg, k) => (k % 2 ? seg : toSubscripts(seg))).join('|')
  // "35,234" is how a decimal is written in half the world, and it used to
  // parse as 35 with ",234" quietly dropped. The comma only ever means a
  // decimal point inside an equation string — nothing else in this grammar
  // separates with one — so it becomes a point here, and the term remembers
  // which one was typed so it is drawn back the way it was written.
  const decimalComma = /\d,\d/.test(rawInput)
  rawInput = rawInput.replace(/(\d),(\d)/g, '$1.$2')
  // Syntax: ** = exponent (→ internal ^), * = multiplication. Convert ** first so
  // the single * is left untouched for products.
  rawInput = rawInput.replace(/\*\*/g, '^')
  // A times sign written the way it is on paper. "24,56 x 10^2" used to parse
  // the x as a VARIABLE and then fail on the rest of the line, which is not a
  // syntax anyone would guess was wrong. × and · are unambiguous anywhere; a
  // bare x only counts when it stands alone between two numbers — "2x" and
  // "x^2" are still the variable they always were.
  rawInput = rawInput.replace(/([\d)])\s*[×·]\s*/g, '$1*')
  // The spaces are optional, because nobody types them: "24,25x10^2" is what
  // gets written. A bare x only counts as a times sign when it has a DIGIT on
  // both sides — "2x" and "x^2" are still the variable they always were, and
  // "2x + 3" is untouched because the x there is followed by a space and a +.
  rawInput = rawInput.replace(/(\d)\s*x\s*(?=[\d(])/gi, '$1*')
  rawInput = substitutePi(rawInput)
  // An input with no "=" is a thing being SHOWN — "6 1/2", "a^2 + b^2", one
  // number to point an annotation at — not a problem with a hidden right-hand
  // side. Appending "=0" to it put a phantom "= 0" on screen next to every
  // such expression. It stays one-sided until a solving step needs the other
  // half, and ActionExecutor adds it there.
  const twoSided = rawInput.includes('=')
  const twoSidedIdx = rawInput.indexOf('=')
  const eqIdx = twoSided ? twoSidedIdx : rawInput.length
  const leftTerms  = parseRichList(rawInput.slice(0, eqIdx).trim())
    .map((t, i) => new MathObject({ ...t, side: 'left',  cellIndex: i }))
  const rightTerms = parseRichList(rawInput.slice(eqIdx + 1).trim())
    .map((t, i) => new MathObject({ ...t, side: 'right', cellIndex: i }))
  const state = new EquationState(leftTerms, twoSided ? rightTerms : [])
  state.oneSided = !twoSided
  if (mixedAt.length) {
    // Only the fraction half of a mixed pair carries the flag: it is the term
    // whose leading operator is the one being held back.
    const all = [...state.left, ...state.right]
    for (let k = 1; k < all.length; k++) {
      const prev = all[k - 1]
      if (prev.side !== all[k].side) continue
      if (mixedAt.includes(String(prev.coefficient))) all[k].mixedJoin = true
    }
  }
  if (decimalComma) [...state.left, ...state.right].forEach(t => { t.decimalComma = true })
  return state
}

// Paren-aware sign splitter: treats +/- at depth>0 as part of the token
function splitBySigns(s) {
  const parts = []
  let cur = '', depth = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    if ((c === '+' || c === '-') && depth === 0) {
      if (cur.trim()) parts.push(cur)
      cur = c; continue
    }
    cur += c
  }
  if (cur.trim()) parts.push(cur)
  return parts
}

// Reuses the plain (mathjs-backed) parser's own paren-group detection —
// the same logic that already turns "2(x+4)" into a proper isParenGroup
// term for the classic path — so a rich-syntax term gets the identical
// treatment instead of falling into the generic arithmetic tree, which has
// no notion of "distribute across an unresolved variable".
// Returns null (never throws) for anything that isn't cleanly exactly one
// such term — content carrying rich-only syntax (|label| placeholders,
// trig calls) is deliberately excluded and left on the exprTree path.
function tryClassicParenGroup(content) {
  if (/__S\d+__/.test(content)) return null
  // Radicals belong to the generic tree for the same reason the trig names do:
  // mathjs reads sqrt(16) as a name applied to a paren group, and the term
  // then renders as the WORD sqrt instead of a radical sign.
  if (/\b(sin|cos|tan|cot|sec|csc|sqrt|cbrt|root)\s*\(/.test(content)) return null
  // So does a letter exponent: mathjs has no notion of rⁿ⁻¹ as a term, and would
  // hand back a bracket with the wrong things inside it.
  if (/\^\s*(?!-?\d+(?![.\d]))/.test(content)) return null
  try {
    const raw = extractTerms(content)
    if (raw.length === 1 && raw[0].isParenGroup) return raw[0]
  } catch {
    // Not mathjs-parseable (stray placeholders, unusual characters) —
    // caller falls back to the generic tree parser.
  }
  return null
}

// "x/2", "2x/3", "x^2/5" — a variable term with a fractional coefficient.
// Needs to become an ORDINARY algebra term (its own degree, coefficient
// 1/2 etc.) so it combines/moves/divides like any other x term — routing
// it into the generic tree instead (as needsExprTree's "/" check would)
// loses the variable entirely: the term becomes a placeholder
// {variable:null, degree:0} the classic engine reads as a bare constant,
// so it silently gets combined with unrelated constants (e.g. "x/2 + 3"
// collapsing into "4"). Deliberately a strict, narrow regex — NOT the
// mathjs fallback tryClassicParenGroup uses — so it can never misfire on
// a real arithmetic sub-expression (pi*r^2, (B+b)*h/2, sqrt(disc)/2a…)
// that's SUPPOSED to stay on the generic-tree path.
function tryFractionMonomial(content) {
  const m = content.match(/^(\d+\.?\d*)?([a-zA-Zα-ω])(?:\^(\d+))?\/(\d+\.?\d*)$/)
  if (!m) return null
  const [, coeffStr, varName, degStr, denStr] = m
  const den = parseFloat(denStr)
  if (den === 0) return null
  const coeff = coeffStr ? parseFloat(coeffStr) : 1
  return {
    sign: '+', coefficient: coeff / den, variable: varName,
    degree: degStr ? parseInt(degStr, 10) : 1,
  }
}

function parseRichSide(str) {
  // Protect |label| groups from sign-splitting
  const labels = []
  let s = str.replace(/\|([^|]+)\|/g, (_, lbl) => {
    labels.push(lbl.trim())
    return `__S${labels.length - 1}__`
  })

  // Extract {#rrggbb} or {name} color tags — resolve palette names to hex
  const _paletteNames = Object.keys(PALETTE).join('|')
  const _colorRe = new RegExp(`\\{(#[0-9a-fA-F]{3,8}|${_paletteNames})\\}`, 'g')
  const colors = []
  s = s.replace(_colorRe, (_, raw) => {
    colors.push(resolveColor(raw))
    return `__C${colors.length - 1}__`
  })

  // Ensure leading sign so every chunk starts with + or -
  s = s.trim()
  if (s[0] !== '+' && s[0] !== '-') s = '+' + s

  const parts = splitBySigns(s)
  const terms = []

  for (const part of parts) {
    const sign    = part[0] === '-' ? '-' : '+'
    const content = part.slice(1).trim()
    if (!content) continue

    // Only depth-0 color applies to the term; inner (paren-scoped) colors go to parseRichAtom
    const termColor = pickColorDepth0(content, colors)
    const outerStripped = stripColorsDepth0(content)   // inner __Cn__ still present

    if (needsExprTree(outerStripped)) {
      // "2(x+4)", "-3(2x-1)" — a coefficient distributed over a sum that
      // still has a free variable in it isn't arithmetic the generic tree
      // can ever finish (findReady only resolves operations where BOTH
      // sides are plain numbers; "x" never becomes one). This is algebra —
      // distribute first, same as the classic (non-rich) parser already
      // does correctly — not a number to reduce.
      const classic = tryClassicParenGroup(outerStripped)
      if (classic) {
        const finalSign = (sign === '-') !== (classic.sign === '-') ? '-' : '+'
        terms.push({ ...classic, sign: finalSign, color: termColor })
        continue
      }
      const fracMono = tryFractionMonomial(outerStripped)
      if (fracMono) {
        const finalSign = (sign === '-') !== (fracMono.sign === '-') ? '-' : '+'
        terms.push({ ...fracMono, sign: finalSign, color: termColor })
        continue
      }
      // A real arithmetic sub-expression — (B+b)*h/2, pi*r^2, (-b+sqrtDisc)/2a…
      // ONE generic tree, resolved later one operation at a time by the
      // order-of-operations walker in exprTree.js. Every number is its own
      // leaf; *, /, ( ) are pure structure — never folded into "one term".
      // Pass `content` (colors still inline as __Cn__), not `outerStripped`
      // (which stripped them) — so "|Opposite|{orange}/|Hypotenuse|{purple}"
      // can give its numerator and denominator their OWN colors instead of
      // both silently taking whichever one termColor happened to pick first.
      terms.push({ sign, expr: parseTermExpr(content, labels, colors), coefficient: 1, variable: null, degree: 0, color: termColor })
    } else {
      const atom = parseRichAtom(outerStripped, labels, colors)
      if (atom) terms.push({ ...atom, sign, color: termColor })
    }
  }
  return terms
}

// Find the first __Cn__ at paren depth 0
function pickColorDepth0(s, colors) {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') { depth++; continue }
    if (s[i] === ')') { depth--; continue }
    if (depth === 0) {
      const m = s.slice(i).match(/^__C(\d+)__/)
      if (m) return colors[+m[1]]
    }
  }
  return null
}

// Strip __Cn__ only at paren depth 0; depth > 0 placeholders are preserved
function stripColorsDepth0(s) {
  let result = '', depth = 0, i = 0
  while (i < s.length) {
    if (s[i] === '(') { result += s[i++]; depth++; continue }
    if (s[i] === ')') { result += s[i++]; depth--; continue }
    if (depth === 0) {
      const m = s.slice(i).match(/^__C\d+__/)
      if (m) { i += m[0].length; continue }
    }
    result += s[i++]
  }
  return result.trim()
}

function stripColors(s) {
  return s.replace(/__C\d+__/g, '').trim()
}

function restoreLabels(s, labels) {
  return s.replace(/__S(\d+)__/g, (_, n) => labels[+n] ?? '')
}

function parseRichAtom(content, labels, colors = []) {
  content = content.trim()
  if (!content) return null

  // Symbolic placeholder __Sn__ with optional ^exp  e.g. |a|^2
  const symM = content.match(/^__S(\d+)__(?:\^(-?\d+))?$/)
  if (symM) {
    const degree = symM[2] ? parseInt(symM[2]) : 0
    return { sign: '+', coefficient: 1, symbolicLabel: labels[+symM[1]], variable: null, degree, isFraction: false }
  }

  // Symbolic coefficient × variable  e.g. |m|x → m·x (m is replaceable, x is the variable)
  const svM = content.match(/^__S(\d+)__([a-zA-Zα-ω])(?:\^(-?\d+))?$/)
  if (svM) {
    const degree = svM[3] ? parseInt(svM[3]) : 1
    return { sign: '+', coefficient: 1, symbolicLabel: labels[+svM[1]], variable: svM[2], degree, isFraction: false }
  }

  // Pure number
  const numM = content.match(/^(\d+\.?\d*)$/)
  if (numM) return { sign: '+', coefficient: +numM[1], variable: null, degree: 0, isFraction: false }

  // number^exponent — e.g. "5^2" → { coefficient: 5, degree: 2 } (displays as 5²)
  const numExpM = content.match(/^(\d+\.?\d*)\^(\d+)$/)
  if (numExpM) {
    return { sign: '+', coefficient: +numExpM[1], variable: null, degree: +numExpM[2], isFraction: false }
  }

  // number × variable  e.g. "3x", "2θ"
  const nvM = content.match(/^(\d+\.?\d*)([^\d].*)$/)
  if (nvM) {
    return { sign: '+', coefficient: +nvM[1], variable: restoreLabels(nvM[2], labels), degree: 1, isFraction: false }
  }

  // Trig function — check for colored argument: sin(__S0____C0__) → varParts
  const trigM = content.match(/^(sin|cos|tan|cot|sec|csc)\((.+)\)$/)
  if (trigM) {
    const fnName = trigM[1]
    const argRaw = trigM[2]
    const argColor = pickColorDepth0(argRaw, colors)
    const argText  = restoreLabels(stripColors(argRaw), labels)
    if (argColor) {
      return {
        sign: '+', coefficient: 1, variable: null, degree: 1, isFraction: false,
        varParts: [
          { text: fnName + '(', color: null },
          { text: argText,      color: argColor },
          { text: ')',          color: null },
        ],
      }
    }
    return { sign: '+', coefficient: 1, variable: fnName + '(' + argText + ')', degree: 1, isFraction: false }
  }

  // Anything else: display-only token — restore any embedded placeholders (e.g. sin(|θ|) → sin(θ))
  return { sign: '+', coefficient: 1, variable: restoreLabels(stripColors(content), labels), degree: 1, isFraction: false }
}

export function parseSymbolicEquation(rawInput) {
  const input  = rawInput.includes('=') ? rawInput : `${rawInput}=0`
  const eqIdx  = input.indexOf('=')
  const leftTerms  = extractSymbolicTerms(input.slice(0, eqIdx).trim())
    .map((t, i) => new MathObject({ ...t, side: 'left',  cellIndex: i }))
  const rightTerms = extractSymbolicTerms(input.slice(eqIdx + 1).trim())
    .map((t, i) => new MathObject({ ...t, side: 'right', cellIndex: i }))
  return new EquationState(leftTerms, rightTerms)
}

/**
 * Parses "3x + 7 + 2x - 1 = 67" into an EquationState.
 * Handles: integer/decimal constants, linear terms (nx, x),
 * quadratic terms (nx^2, x^2), addition and subtraction.
 */
export function parseEquation(rawInput) {
  // Same decimal comma as the rich parser — this path takes every equation with
  // no fraction, label or trig call in it, which is most plain numbers.
  const decimalComma = /\d,\d/.test(rawInput)
  rawInput = rawInput.replace(/(\d),(\d)/g, '$1.$2')
  rawInput = substitutePi(rawInput)
  // No "=" means an expression on display, not "expr = 0" — see the rich
  // parser above for why the phantom right-hand side had to go.
  const twoSided = rawInput.includes('=')
  const eqIdx = twoSided ? rawInput.indexOf('=') : rawInput.length

  const leftStr = rawInput.slice(0, eqIdx).trim()
  const rightStr = rawInput.slice(eqIdx + 1).trim()

  const leftTerms = extractTerms(leftStr).map((t, i) =>
    new MathObject({ ...t, side: 'left', cellIndex: i })
  )
  const rightTerms = extractTerms(rightStr).map((t, i) =>
    new MathObject({ ...t, side: 'right', cellIndex: i })
  )

  const state = new EquationState(leftTerms, twoSided ? rightTerms : [])
  state.oneSided = !twoSided
  if (decimalComma) [...state.left, ...state.right].forEach(t => { t.decimalComma = true })
  return state
}

function extractTerms(expr) {
  const node = parse(expr)
  const raw = []
  collectTerms(node, true, raw)
  return raw
}

// Evaluate a node down to a plain number IF it's built entirely out of
// constants (no variables) — used to fold chained numeric products like the
// "2*pi" in "2*pi*r" (which parses as (2*pi)*r, a nested OperatorNode on the
// left, not a bare ConstantNode) before re-checking for a coefficient*variable
// shape. Returns null if the subtree contains anything non-constant.
function tryConstEval(node) {
  if (node.type === 'ConstantNode') return node.value
  if (node.type === 'ParenthesisNode') return tryConstEval(node.content)
  if (node.type === 'OperatorNode') {
    if (node.args.length === 2) {
      const l = tryConstEval(node.args[0]), r = tryConstEval(node.args[1])
      if (l === null || r === null) return null
      switch (node.op) {
        case '+': return l + r
        case '-': return l - r
        case '*': return l * r
        case '/': return r !== 0 ? l / r : null
        case '^': return Math.pow(l, r)
        default: return null
      }
    }
    if (node.op === '-' && node.args.length === 1) {
      const v = tryConstEval(node.args[0])
      return v === null ? null : -v
    }
  }
  return null
}

function collectTerms(node, positive, out) {
  const sign = positive ? '+' : '-'

  if (node.type === 'OperatorNode') {
    if (node.op === '+' && node.args.length === 2) {
      collectTerms(node.args[0], positive, out)
      collectTerms(node.args[1], positive, out)
      return
    }
    if (node.op === '-' && node.args.length === 2) {
      collectTerms(node.args[0], positive, out)
      collectTerms(node.args[1], !positive, out)
      return
    }
    if (node.op === '-' && node.args.length === 1) {
      // unary minus: -x or -3
      collectTerms(node.args[0], !positive, out)
      return
    }
    if (node.op === '*') {
      const [a, b] = node.args
      // constant * constant  e.g. 3.45 * 1000 — plain numeric product, no variable
      if (a.type === 'ConstantNode' && b.type === 'ConstantNode') {
        out.push({ sign, coefficient: a.value * b.value, variable: null, degree: 0 })
        return
      }
      // coefficient * variable  e.g. 3x, 3*x
      if (a.type === 'ConstantNode' && b.type === 'SymbolNode') {
        out.push({ sign, coefficient: a.value, variable: b.name, degree: 1 })
        return
      }
      // variable * coefficient  e.g. x*3
      if (a.type === 'SymbolNode' && b.type === 'ConstantNode') {
        out.push({ sign, coefficient: b.value, variable: a.name, degree: 1 })
        return
      }
      // coefficient * x^n  e.g. 3x^2
      if (a.type === 'ConstantNode' && b.type === 'OperatorNode' && b.op === '^') {
        const [base, exp] = b.args
        if (base.type === 'SymbolNode' && exp.type === 'ConstantNode') {
          out.push({ sign, coefficient: a.value, variable: base.name, degree: exp.value })
          return
        }
      }
      // coefficient(-with-optional-variable) * (expression) → parenGroup
      // e.g. 2(x+3), 3*(2x-1), 2x(x+4), x(x+4), -3x²(x-1)
      {
        // Reads a node as "a coefficient, optionally times a variable" —
        // the same shapes already recognized above as a plain term, just
        // captured here instead of pushed, since it's actually the
        // multiplier in front of a parenthesis, not a term of its own.
        const asCoeffNode = (node) => {
          if (node.type === 'ConstantNode') return { val: node.value, v: null, d: 1 }
          if (node.type === 'SymbolNode') return { val: 1, v: node.name, d: 1 }
          if (node.type === 'OperatorNode' && node.op === '*' && node.args.length === 2) {
            const [x, y] = node.args
            if (x.type === 'ConstantNode' && y.type === 'SymbolNode') return { val: x.value, v: y.name, d: 1 }
            if (y.type === 'ConstantNode' && x.type === 'SymbolNode') return { val: y.value, v: x.name, d: 1 }
          }
          if (node.type === 'OperatorNode' && node.op === '^') {
            const [base, exp] = node.args
            if (base.type === 'SymbolNode' && exp.type === 'ConstantNode') return { val: 1, v: base.name, d: exp.value }
          }
          return null
        }

        // mathjs's grammar is ambiguous between implicit multiplication and
        // a function call for "identifier(...)" — it always resolves "x(...)"
        // as calling a function named "x", never as x * (...). So "2x(x+4)"
        // arrives as 2 * FunctionNode{fn: x, args: [x+4]}, not 2 * Parenthesis.
        // Recognize that shape too: the "function name" IS the variable
        // multiplying the parens.
        const asParenSide = (node) => {
          if (node.type === 'ParenthesisNode') return { content: node.content, extraVar: null }
          if (node.type === 'FunctionNode' && node.fn.type === 'SymbolNode' && node.args.length === 1) {
            return { content: node.args[0], extraVar: node.fn.name }
          }
          return null
        }

        // (A)(B) — a bracket multiplying a bracket. The term model already
        // carries a group as "multiplier × (innerTerms)"; here the multiplier is
        // itself a bracket, so it rides along as outerTerms. Distribution then
        // has two lists to cross instead of a monomial and a list, and the
        // renderer draws a second pair of brackets where the coefficient goes.
        // Without this the whole product was silently dropped from the equation.
        {
          const gA = asParenSide(a)
          const gB = asParenSide(b)
          if (gA && gB && !gA.extraVar && !gB.extraVar) {
            const outerRaw = [], innerRaw = []
            collectTerms(gA.content, true, outerRaw)
            collectTerms(gB.content, true, innerRaw)
            if (outerRaw.length && innerRaw.length) {
              const plain = t => ({ sign: t.sign, coefficient: t.coefficient, variable: t.variable, degree: t.degree })
              out.push({
                sign:         positive ? '+' : '-',
                coefficient:  1,
                variable:     null,
                degree:       -1,
                isParenGroup: true,
                parenCoeff:   1,
                parenCoeffVariable: null,
                parenCoeffDegree:   1,
                outerTerms:   outerRaw.map(plain),
                innerTerms:   innerRaw.map(plain),
              })
              return
            }
          }
        }

        let coeffVal = null, coeffVar = null, coeffDeg = 1, parenContent = null
        const pB = asParenSide(b)
        const pA = !pB ? asParenSide(a) : null
        if (pB) {
          const c = asCoeffNode(a)
          if (c) {
            coeffVal = c.val; coeffDeg = c.d
            coeffVar = c.v ?? pB.extraVar
            parenContent = pB.content
          }
        } else if (pA) {
          const c = asCoeffNode(b)
          if (c) {
            coeffVal = c.val; coeffDeg = c.d
            coeffVar = c.v ?? pA.extraVar
            parenContent = pA.content
          }
        }
        if (coeffVal !== null && parenContent !== null) {
          const rawInner = []
          collectTerms(parenContent, true, rawInner)
          if (rawInner.length > 0) {
            const rawVal = (positive ? 1 : -1) * coeffVal
            out.push({
              sign:         rawVal >= 0 ? '+' : '-',
              coefficient:  1,
              variable:     null,
              degree:       -1,
              isParenGroup: true,
              parenCoeff:   Math.abs(rawVal),
              parenCoeffVariable: coeffVar,
              parenCoeffDegree:   coeffDeg,
              innerTerms:   rawInner.map(t => ({
                sign:        t.sign,
                coefficient: t.coefficient,
                variable:    t.variable,
                degree:      t.degree,
              })),
            })
            return
          }
        }
      }
      // Fallback: fold either side down to a plain number first, e.g.
      // "2*pi*r" parses as (2*pi)*r — the left side is a nested OperatorNode,
      // not a bare ConstantNode, so none of the specific patterns above match
      // it directly. Try evaluating each side as a pure-constant subtree and
      // re-run the same coefficient*variable / coefficient*x^n logic on
      // whichever side turns out to be a plain number.
      {
        const aVal = tryConstEval(a), bVal = tryConstEval(b)
        if (aVal !== null && bVal !== null) {
          out.push({ sign, coefficient: aVal * bVal, variable: null, degree: 0 })
          return
        }
        const [cVal, other] = aVal !== null ? [aVal, b] : bVal !== null ? [bVal, a] : [null, null]
        if (cVal !== null) {
          if (other.type === 'SymbolNode') {
            out.push({ sign, coefficient: cVal, variable: other.name, degree: 1 })
            return
          }
          if (other.type === 'OperatorNode' && other.op === '^') {
            const [base, exp] = other.args
            if (base.type === 'SymbolNode' && exp.type === 'ConstantNode') {
              out.push({ sign, coefficient: cVal, variable: base.name, degree: exp.value })
              return
            }
          }
        }
      }
    }
    if (node.op === '^') {
      // x^n  (coefficient = 1)
      const [base, exp] = node.args
      if (base.type === 'SymbolNode' && exp.type === 'ConstantNode') {
        out.push({ sign, coefficient: 1, variable: base.name, degree: exp.value })
        return
      }
      // A number raised to a number — "10^3" — is a constant term. Only a
      // variable base was recognised above, so this fell through every branch
      // and "2x + 10^3" came out as "2x" with the 1000 dropped in silence.
      const val = tryConstEval(node)
      if (val !== null && Number.isFinite(val)) {
        out.push({ sign, coefficient: val, variable: null, degree: 0 })
        return
      }
    }
    // a / b  →  fraction coefficient  e.g. x/2, 3/4, 3x/4, x^2/3
    if (node.op === '/' && node.args.length === 2) {
      const [num, den] = node.args
      if (den.type === 'ConstantNode' && den.value !== 0) {
        const dv = den.value
        // constant / constant  e.g. 3/4
        if (num.type === 'ConstantNode') {
          out.push({ sign, coefficient: num.value / dv, variable: null, degree: 0 })
          return
        }
        // variable / constant  e.g. x/2
        if (num.type === 'SymbolNode') {
          out.push({ sign, coefficient: 1 / dv, variable: num.name, degree: 1 })
          return
        }
        // (coeff * var) / constant  e.g. 3x/4
        if (num.type === 'OperatorNode' && num.op === '*') {
          const [ma, mb] = num.args
          if (ma.type === 'ConstantNode' && mb.type === 'SymbolNode') {
            out.push({ sign, coefficient: ma.value / dv, variable: mb.name, degree: 1 })
            return
          }
          if (mb.type === 'ConstantNode' && ma.type === 'SymbolNode') {
            out.push({ sign, coefficient: mb.value / dv, variable: ma.name, degree: 1 })
            return
          }
        }
        // var^exp / constant  e.g. x^2/3
        if (num.type === 'OperatorNode' && num.op === '^') {
          const [base, exp] = num.args
          if (base.type === 'SymbolNode' && exp.type === 'ConstantNode') {
            out.push({ sign, coefficient: 1 / dv, variable: base.name, degree: exp.value })
            return
          }
        }
        // (coeff * var^exp) / constant  e.g. 3x^2/4
        if (num.type === 'OperatorNode' && num.op === '*') {
          const [ma, mb] = num.args
          if (ma.type === 'ConstantNode' && mb.type === 'OperatorNode' && mb.op === '^') {
            const [base, exp] = mb.args
            if (base.type === 'SymbolNode' && exp.type === 'ConstantNode') {
              out.push({ sign, coefficient: ma.value / dv, variable: base.name, degree: exp.value })
              return
            }
          }
        }
      }
    }
  }

  if (node.type === 'ConstantNode') {
    out.push({ sign, coefficient: node.value, variable: null, degree: 0 })
    return
  }

  if (node.type === 'SymbolNode') {
    out.push({ sign, coefficient: 1, variable: node.name, degree: 1 })
    return
  }

  if (node.type === 'ParenthesisNode') {
    collectTerms(node.content, positive, out)
  }

  // Bare "x(x+4)" with no leading coefficient at all — mathjs parses this
  // as calling a function named "x", not x * (...). Same paren-group as
  // the coefficient*(...) case above, just with an implicit magnitude 1.
  if (node.type === 'FunctionNode' && node.fn.type === 'SymbolNode' && node.args.length === 1) {
    const rawInner = []
    collectTerms(node.args[0], true, rawInner)
    if (rawInner.length > 0) {
      out.push({
        sign, coefficient: 1, variable: null, degree: -1,
        isParenGroup: true,
        parenCoeff: 1,
        parenCoeffVariable: node.fn.name,
        parenCoeffDegree: 1,
        innerTerms: rawInner.map(t => ({
          sign: t.sign, coefficient: t.coefficient, variable: t.variable, degree: t.degree,
        })),
      })
    }
  }
}
