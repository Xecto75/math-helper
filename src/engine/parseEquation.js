import { parse } from 'mathjs'
import { MathObject } from './MathObject.js'
import { EquationState } from './EquationState.js'
import { resolveColor, PALETTE } from './palette.js'

// ── Symbolic equation parser ─────────────────────────────────────────────────
// Handles terms like: ax², bx, c (single-letter symbolic coefficients)
// and numeric terms: 3x², 2x, 5.  Example: "ax^2 + bx + c = 5"

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

export function parseRichEquation(rawInput) {
  // Syntax: ** = exponent (→ internal ^), * = multiplication. Convert ** first so
  // the single * is left untouched for products.
  rawInput = rawInput.replace(/\*\*/g, '^')
  const input  = rawInput.includes('=') ? rawInput : `${rawInput}=0`
  const eqIdx  = input.indexOf('=')
  const leftTerms  = parseRichSide(input.slice(0, eqIdx).trim())
    .map((t, i) => new MathObject({ ...t, side: 'left',  cellIndex: i }))
  const rightTerms = parseRichSide(input.slice(eqIdx + 1).trim())
    .map((t, i) => new MathObject({ ...t, side: 'right', cellIndex: i }))
  return new EquationState(leftTerms, rightTerms)
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

    // Only split on / that is not inside parentheses
    const slashIdx = findOuterSlash(content)
    if (slashIdx >= 0) {
      const rawNum = content.slice(0, slashIdx).trim()
      const rawDen = content.slice(slashIdx + 1).trim()

      const numTerms = parseFracSide(rawNum, labels, colors)
      const denTerms = parseFracSide(rawDen, labels, colors)
      // degree follows the numerator — x/2 is degree-1, not degree-0
      const fracDegree = numTerms.some(t => t.degree > 0) ? 1 : 0
      terms.push({
        sign,
        isFraction:       true,
        numeratorTerms:   numTerms,
        denominatorTerms: denTerms,
        coefficient: 1, variable: null, degree: fracDegree, color: null,
      })
    } else {
      // Only depth-0 color applies to the term; inner (paren-scoped) colors go to parseRichAtom
      const termColor = pickColorDepth0(content, colors)
      const outerStripped = stripColorsDepth0(content)   // inner __Cn__ still present
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

// Find the ) matching the ( at openIdx; -1 if none.
function findMatchingParen(s, openIdx) {
  let depth = 0
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') { depth--; if (depth === 0) return i }
  }
  return -1
}

// Split an expression on top-level + / − into signed pieces (parens respected).
function splitTopLevelAddSub(s) {
  const out = []
  let depth = 0, cur = '', sign = '+'
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '(') { depth++; cur += ch; continue }
    if (ch === ')') { depth--; cur += ch; continue }
    if (depth === 0 && (ch === '+' || ch === '-')) {
      if (cur.trim() === '') { sign = ch === '-' ? '-' : '+'; continue }  // leading sign
      out.push({ sign, text: cur.trim() })
      sign = ch === '-' ? '-' : '+'
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim() !== '') out.push({ sign, text: cur.trim() })
  return out
}

// Parse one side of a fraction into an array of signed sub-terms, so each labelled
// piece (e.g. y₂, y₁ in "(|y₂| - |y₁|)") stays individually replaceable.
function parseFracSide(rawSide, labels, colors) {
  let s = rawSide.trim()
  // Strip one layer of outer parens that wrap the whole side
  if (s.startsWith('(') && findMatchingParen(s, 0) === s.length - 1) s = s.slice(1, -1).trim()
  const subs = []
  for (const { sign, text } of splitTopLevelAddSub(s)) {
    const color = pickColorDepth0(text, colors)
    const atom  = parseRichAtom(stripColorsDepth0(text), labels, colors)
    if (atom) {
      atom.sign = sign
      if (color) atom.color = color
      subs.push(atom)
    }
  }
  return subs
}

function findOuterSlash(s) {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') depth--
    else if (s[i] === '/' && depth === 0) return i
  }
  return -1
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

  // Product of symbolic labels  e.g. |m||x|, |m|*|x|, |m| × |x|  → m·x (each replaceable)
  const labelTokens = [...content.matchAll(/__S(\d+)__(?:\^(-?\d+))?/g)]
  if (labelTokens.length >= 2) {
    const rest = content.replace(/__S\d+__(?:\^-?\d+)?/g, '').replace(/[*×·\s]/g, '')
    if (rest === '') {
      const factors = labelTokens.map(mt => ({
        sign: '+', coefficient: 1, symbolicLabel: labels[+mt[1]], variable: null,
        degree: mt[2] ? parseInt(mt[2]) : 0,
      }))
      return { sign: '+', coefficient: 1, variable: null, degree: 1, isFraction: false, factors }
    }
  }

  // (sum of labels) × label, either order — e.g. (|B|+|b|)*|h| → area-formula
  // style product where the parenthesized part stays a replaceable SUM group.
  const groupTimesLabel = content.match(/^\(([^()]+)\)\s*[*×·]\s*__S(\d+)__(?:\^(-?\d+))?$/)
  const labelTimesGroup = content.match(/^__S(\d+)__(?:\^(-?\d+))?\s*[*×·]\s*\(([^()]+)\)$/)
  if (groupTimesLabel || labelTimesGroup) {
    const [innerRaw, labelIdx, expRaw] = groupTimesLabel
      ? [groupTimesLabel[1], groupTimesLabel[2], groupTimesLabel[3]]
      : [labelTimesGroup[3], labelTimesGroup[1], labelTimesGroup[2]]
    const groupTerms = parseFracSide(innerRaw, labels, colors)
    if (groupTerms.length) {
      const labelFactor = {
        sign: '+', coefficient: 1, symbolicLabel: labels[+labelIdx], variable: null,
        degree: expRaw ? parseInt(expRaw) : 0,
      }
      const factors = groupTimesLabel ? [{ terms: groupTerms }, labelFactor] : [labelFactor, { terms: groupTerms }]
      return { sign: '+', coefficient: 1, variable: null, degree: 1, isFraction: false, factors }
    }
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
  // Allow expressions without "=" — treat them as "expr = 0"
  const input = rawInput.includes('=') ? rawInput : `${rawInput}=0`
  const eqIdx = input.indexOf('=')

  const leftStr = input.slice(0, eqIdx).trim()
  const rightStr = input.slice(eqIdx + 1).trim()

  const leftTerms = extractTerms(leftStr).map((t, i) =>
    new MathObject({ ...t, side: 'left', cellIndex: i })
  )
  const rightTerms = extractTerms(rightStr).map((t, i) =>
    new MathObject({ ...t, side: 'right', cellIndex: i })
  )

  return new EquationState(leftTerms, rightTerms)
}

function extractTerms(expr) {
  const node = parse(expr)
  const raw = []
  collectTerms(node, true, raw)
  return raw
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
      // constant * (expression)  →  parenGroup e.g. 2(x+3), 3*(2x-1)
      {
        let coeffVal = null, parenContent = null
        if (a.type === 'ConstantNode' && b.type === 'ParenthesisNode') {
          coeffVal = a.value; parenContent = b.content
        } else if (b.type === 'ConstantNode' && a.type === 'ParenthesisNode') {
          coeffVal = b.value; parenContent = a.content
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
    }
    if (node.op === '^') {
      // x^n  (coefficient = 1)
      const [base, exp] = node.args
      if (base.type === 'SymbolNode' && exp.type === 'ConstantNode') {
        out.push({ sign, coefficient: 1, variable: base.name, degree: exp.value })
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
}
