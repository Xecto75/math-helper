// ── Generic arithmetic expression tree ──────────────────────────────────────
// Every number is its own leaf. Operators (+ - * /), parentheses and
// exponents are pure tree structure — never stored as, or folded into, "one
// term". ONE generic order-of-operations walker (findReady/applyReady) below
// resolves ANY tree — a trapezoid's (B+b)*h/2, a circle's pi*r^2, a
// quadratic's (-b+sqrtDisc)/2a — the same way, one operation at a time.
// There is no per-equation-shape script: the walker just always finds the
// deepest, leftmost operation whose operands are both plain numbers.

let _uid = 0
const nextId = () => `e${++_uid}`

export const num    = (v)          => ({ t: 'num',   id: nextId(), v })
export const label   = (name)      => ({ t: 'label',  id: nextId(), name })
export const bin     = (op, a, b)  => ({ t: 'bin',    id: nextId(), op, a, b })
export const pw      = (base, exp) => ({ t: 'pow',    id: nextId(), base, exp })
export const sqrtN   = (arg)       => ({ t: 'sqrt',   id: nextId(), arg })
export const negN    = (arg)       => ({ t: 'neg',    id: nextId(), arg })
// The quadratic formula's "±" — a branch CHOICE, not an operation: it never
// becomes "ready" itself (see findReady), even once both sides are plain
// numbers. Choosing + or − happens by building a fresh, unambiguous tree for
// each branch (x₁/x₂) — this node only ever appears in the general, not-yet-
// branched "x = (-b ± √Δ) / 2a" display.
export const pm      = (a, b)      => ({ t: 'pm',     id: nextId(), a, b })
// sin/cos/tan of a numeric argument — same convention as every other angle
// value in the app (showAngles arcs, [id]aN refs): the argument is DEGREES,
// not radians, so "sin(45)" means 45°.
export const trigFn  = (name, arg) => ({ t: 'fn',     id: nextId(), name, arg })

export function isNum(node) { return node?.t === 'num' }

// A number leaf holding the exact "pi" literal (see parseEquation.js's
// substitutePi) hasn't had its first solving step yet: known constants
// reveal their decimal value BEFORE anything else touches them. Once
// revealed (rounded like every other value), it's no longer bit-equal to
// Math.PI, so this only ever fires once per leaf.
function isUnrevealedPi(node) {
  return node?.t === 'num' && Math.abs(node.v - Math.PI) < 1e-9
}
// A leaf that's ready to be USED by a parent operation — a plain number that
// isn't still waiting on its own pi-reveal step.
function isSettled(node) { return isNum(node) && !isUnrevealedPi(node) }

// Deepest-leftmost ready operation. This one traversal IS order of
// operations: parens are just tree nesting so they resolve first (they're
// deeper); */ before +- falls out because recursive-descent parsing already
// nests lower-precedence ops around higher-precedence ones; left-to-right
// for same-precedence ops falls out of left-associative parsing. A leaf
// still waiting on its pi-reveal blocks its parent exactly like an
// unresolved label would, so π always reveals before it's used in anything.
export function findReady(node) {
  if (!node) return null
  if (isUnrevealedPi(node)) return node
  if (node.t === 'bin') {
    if (!isSettled(node.a)) { const r = findReady(node.a); if (r) return r }
    if (!isSettled(node.b)) { const r = findReady(node.b); if (r) return r }
    return (isSettled(node.a) && isSettled(node.b)) ? node : null
  }
  if (node.t === 'pow')  return isSettled(node.base) ? node : findReady(node.base)
  if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn') return isSettled(node.arg) ? node : findReady(node.arg)
  if (node.t === 'pm') {
    // Never "ready" itself — resolving ± is a branch choice made by building
    // a fresh tree per branch (x₁/x₂), not a generic operation. Still dig
    // into both sides so e.g. √Δ can reveal its value while ± stays put.
    if (!isSettled(node.a)) { const r = findReady(node.a); if (r) return r }
    if (!isSettled(node.b)) { const r = findReady(node.b); if (r) return r }
    return null
  }
  return null
}

function evalOne(node) {
  if (node.t === 'bin') {
    const a = node.a.v, b = node.b.v
    switch (node.op) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b !== 0 ? a / b : NaN
      default:  return NaN
    }
  }
  if (node.t === 'pow')  return Math.pow(node.base.v, node.exp)
  if (node.t === 'sqrt') return Math.sqrt(node.arg.v)
  if (node.t === 'neg')  return -node.arg.v
  if (node.t === 'fn') {
    const rad = node.arg.v * Math.PI / 180
    switch (node.name) {
      case 'sin': return Math.sin(rad)
      case 'cos': return Math.cos(rad)
      case 'tan': return Math.tan(rad)
      default:    return NaN
    }
  }
  return NaN
}

// Avoids float noise (0.1+0.2 …) while keeping real precision.
const round = v => Math.round(v * 1e6) / 1e6

// Collapse a ready node IN PLACE — same id, so its DOM element persists
// across the change (one element animates from "6 + 4" to "10", or "π" to
// "3.1416" for a pi-reveal, which is just a number leaf revealing itself).
export function applyReady(node) {
  if (isUnrevealedPi(node)) {
    node.v = round(node.v)
    return node.v
  }
  const result = round(evalOne(node))
  for (const k of Object.keys(node)) { if (k !== 'id') delete node[k] }
  node.t = 'num'
  node.v = result
  return result
}

// Substitute every leaf with this label name → a number leaf (same id, so
// its DOM element persists across the swap).
export function substituteLabel(node, name, value) {
  if (!node) return
  if (node.t === 'label' && node.name === name) {
    delete node.name
    node.t = 'num'
    node.v = value
    return
  }
  if (node.t === 'bin' || node.t === 'pm') { substituteLabel(node.a, name, value); substituteLabel(node.b, name, value) }
  else if (node.t === 'pow') substituteLabel(node.base, name, value)
  else if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn') substituteLabel(node.arg, name, value)
}

export function collectLabels(node, out = new Set()) {
  if (!node) return out
  if (node.t === 'label') out.add(node.name)
  else if (node.t === 'bin' || node.t === 'pm') { collectLabels(node.a, out); collectLabels(node.b, out) }
  else if (node.t === 'pow') collectLabels(node.base, out)
  else if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn') collectLabels(node.arg, out)
  return out
}

// All leaf node ids currently holding this label (a label can appear more
// than once in one tree, e.g. "2*|r| + |r|^2") — used to fade/highlight
// every occurrence when it gets replaced by a real value.
export function collectLabelNodeIds(node, name, out = []) {
  if (!node) return out
  if (node.t === 'label' && node.name === name) out.push(node.id)
  else if (node.t === 'bin' || node.t === 'pm') { collectLabelNodeIds(node.a, name, out); collectLabelNodeIds(node.b, name, out) }
  else if (node.t === 'pow') collectLabelNodeIds(node.base, name, out)
  else if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn') collectLabelNodeIds(node.arg, name, out)
  return out
}

// Find the "±" node in a tree (at most one — it only ever appears once, in
// the quadratic formula's numerator).
export function findPm(node) {
  if (!node) return null
  if (node.t === 'pm') return node
  if (node.t === 'bin') return findPm(node.a) || findPm(node.b)
  if (node.t === 'pow') return findPm(node.base)
  if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn') return findPm(node.arg)
  return null
}

// Resolve "±" to a definite "+"/"−", IN PLACE (same id) — the "±" glyph's own
// DOM element morphs into the chosen operator, continuing the SAME
// computation exactly where it left off, rather than rebuilding from scratch.
export function choosePmBranch(pmNode, sign) {
  const { a, b } = pmNode
  for (const k of Object.keys(pmNode)) { if (k !== 'id') delete pmNode[k] }
  pmNode.t = 'bin'
  pmNode.op = sign
  pmNode.a = a
  pmNode.b = b
}

export function deepClone(node) {
  if (!node) return node
  const copy = { ...node, id: nextId() }
  if (copy.a) copy.a = deepClone(copy.a)
  if (copy.b) copy.b = deepClone(copy.b)
  if (copy.base) copy.base = deepClone(copy.base)
  if (copy.arg) copy.arg = deepClone(copy.arg)
  return copy
}

// True if this content needs the tree parser at all — i.e. has real internal
// structure (grouping, an explicit operator) beyond "number, optional single
// variable, optional exponent". Plain atoms (kept on the fast path used by
// ordinary linear-algebra terms, untouched by any of this) never match.
export function needsExprTree(content) {
  return /[()/]|[*×·]/.test(content)
}

// ── Parser ───────────────────────────────────────────────────────────────────
// Parses a term's inner content (top-level +/- across an equation SIDE is
// already split by the caller — this only ever sees one +/- separated piece,
// though + and - can still appear here inside parens). Standard recursive-
// descent: addSub > mulDiv > pow > atom — precedence climbs through the
// grammar itself, so "(...)" nesting and */  before +- both fall out for
// free, matching findReady's traversal above exactly.
export function parseTermExpr(content, labels) {
  const s = content.trim()
  let i = 0

  function skipWs() { while (s[i] === ' ') i++ }

  function parseAtom() {
    skipWs()
    if (s[i] === '(') {
      i++
      const node = parseAddSub()
      skipWs()
      if (s[i] === ')') i++
      return node
    }
    if (s[i] === '-') { i++; return negN(parseAtom()) }
    const rest = s.slice(i)
    const labelM = rest.match(/^__S(\d+)__/)
    if (labelM) { i += labelM[0].length; return label(labels[+labelM[1]]) }
    // sin/cos/tan — must be checked before the single-letter variable match
    // below, or "sin(45)" would parse as just the label "s" and silently
    // drop everything from "in(45)" onward.
    const fnM = rest.match(/^(sin|cos|tan)\(/)
    if (fnM) {
      i += fnM[0].length
      const arg = parseAddSub()
      skipWs()
      if (s[i] === ')') i++
      return trigFn(fnM[1], arg)
    }
    const numM = rest.match(/^\d+\.?\d*/)
    if (numM) { i += numM[0].length; return num(parseFloat(numM[0])) }
    const varM = rest.match(/^[a-zA-Zα-ω]/)
    if (varM) { i += 1; return label(varM[0]) }
    throw new Error(`parseTermExpr: unexpected character at ${i} in "${s}"`)
  }

  function parsePow() {
    let node = parseAtom()
    skipWs()
    if (s[i] === '^') {
      i++
      skipWs()
      const expM = s.slice(i).match(/^-?\d+/)
      if (expM) { i += expM[0].length; node = pw(node, parseInt(expM[0], 10)) }
    }
    return node
  }

  function parseMulDiv() {
    let node = parsePow()
    for (;;) {
      skipWs()
      const c = s[i]
      if (c === '*' || c === '×' || c === '·') { i++; node = bin('*', node, parsePow()) }
      else if (c === '/')                      { i++; node = bin('/', node, parsePow()) }
      // Implicit multiplication: "2(x+4)", "(x+1)(x+2)" — no explicit
      // operator between a finished factor and the next '(' means '*'.
      // Without this the parser just stopped here and silently dropped
      // everything from the '(' onward.
      else if (c === '(')                      { node = bin('*', node, parsePow()) }
      else break
    }
    return node
  }

  function parseAddSub() {
    let node = parseMulDiv()
    for (;;) {
      skipWs()
      const c = s[i]
      if (c === '+')      { i++; node = bin('+', node, parseMulDiv()) }
      else if (c === '-') { i++; node = bin('-', node, parseMulDiv()) }
      else break
    }
    return node
  }

  return parseAddSub()
}
