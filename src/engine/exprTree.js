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
// A radical, with an optional index: sqrtN(a) is √a, sqrtN(a, num(3)) is ∛a.
// Left out, the index means 2 — so every existing caller keeps meaning what
// it meant (solveScript's quadratic √Δ among them).
export const sqrtN   = (arg, index = null) => ({ t: 'sqrt',   id: nextId(), arg, index })
export const negN    = (arg)       => ({ t: 'neg',    id: nextId(), arg })
// n! — a node of its own rather than a function call, because the lesson that
// needs it is the one that takes it APART: 5! becomes 4!·5 becomes 3!·4·5. A
// node that already knew its own value would have nothing left to show.
export const factN   = (arg)       => ({ t: 'fact',   id: nextId(), arg })
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

// A power's exponent is a plain integer — the ² of r² — or, since the rule of a
// geometric sequence needs one, an expression of its own: the n of 2ⁿ, the
// n − 1 of rⁿ⁻¹. Every walker below that knows about the base now also looks
// up into the exponent when it is a node.
function isExpNode(e) { return !!e && typeof e === 'object' }

// ── Rationals ────────────────────────────────────────────────────────────────
// Operating on fractions answers with a fraction. "2/3 - 4/5" is -2/15, not
// -0.133…: the decimal is a different object, it loses exactness, and it is not
// what the topic is about. So p/q of whole numbers is a VALUE here — something
// an operation can consume — rather than a division still waiting to happen.
//
// The one exception is a division that comes out even: 6/3 is 2, and there is
// no fraction left to write down.
//
// Nothing is reduced automatically. 2/3 · 3/4 gives 6/12 and stops there,
// because reducing it is a step a reader is meant to SEE, not something the
// answer arrives already wearing.
export function isFrac(node) {
  return node?.t === 'bin' && node.op === '/' &&
         isNum(node.a) && isNum(node.b) &&
         Number.isInteger(node.a.v) && Number.isInteger(node.b.v) && node.b.v !== 0
}

// True while p/q is still a fraction — i.e. the division does NOT come out even.
function isPendingFrac(node) {
  return isFrac(node) && node.a.v % node.b.v !== 0
}

// A number leaf, or a fraction: the two things an operation can act on.
function isValueNode(node) { return isSettled(node) || isPendingFrac(node) }

function asRat(node) {
  if (isSettled(node)) return { p: node.v, q: 1 }
  if (isFrac(node))    return { p: node.a.v, q: node.b.v }
  return null
}
// The decimal a fraction stands for — used only where a fraction cannot go, in
// √, powers and trig, so those keep working exactly as they did.
function ratValue(node) { const r = asRat(node); return r ? r.p / r.q : NaN }

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b] } return a || 1 }
function lcm(a, b) { return Math.abs(a * b) / gcd(a, b) }

// p/q → the node it should become: a plain number when it divides out, a
// fraction otherwise. Never reduced (see above).
function ratResult({ p, q }) {
  if (q < 0) { p = -p; q = -q }
  if (q === 1 || p % q === 0) return { num: p / q }
  return { rat: { p, q } }
}

function ratArith(op, x, y) {
  if (op === '*') return ratResult({ p: x.p * y.p, q: x.q * y.q })
  if (op === '/') return y.p === 0 ? { num: NaN } : ratResult({ p: x.p * y.q, q: x.q * y.p })
  // + and -: a COMMON denominator, not the product of the two. 1/4 + 1/6 is
  // 3/12 + 2/12 = 5/12, the way it is done on paper — q1·q2 would answer
  // 10/24, which is the same number wearing the wrong denominator.
  const L = lcm(x.q, y.q)
  const px = x.p * (L / x.q)
  const py = y.p * (L / y.q)
  return ratResult({ p: op === '+' ? px + py : px - py, q: L })
}



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
  // A factorial is NEVER ready. Letting the generic evaluator collapse 5! to
  // 120 in one move is exactly the thing the notation needs explaining for: a
  // reader who does not know what ! means learns nothing from the answer
  // appearing. It is unpacked into its product first — see unpackFactorials in
  // ActionExecutor — and only the product is evaluated here.
  if (node.t === 'fact') return findReady(node.arg)
  if (node.t === 'bin') {
    if (!isValueNode(node.a)) { const r = findReady(node.a); if (r) return r }
    if (!isValueNode(node.b)) { const r = findReady(node.b); if (r) return r }
    if (!isValueNode(node.a) || !isValueNode(node.b)) return null
    // p/q of whole numbers that does not come out even is already an ANSWER.
    // Calling it ready here is what used to turn 1/2 into 0.5.
    if (isPendingFrac(node)) return null
    return node
  }
  if (node.t === 'pow') {
    if (!isValueNode(node.base)) { const r = findReady(node.base); if (r) return r }
    // What is up in the exponent is worked out before the power, the way it is
    // on paper: 2⁵⁻¹ becomes 2⁴ first, and only then 16.
    if (isExpNode(node.exp) && !isValueNode(node.exp)) { const r = findReady(node.exp); if (r) return r }
    if (!isValueNode(node.base) || (isExpNode(node.exp) && !isValueNode(node.exp))) return null
    return node
  }
  if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn' || node.t === 'fact') return isValueNode(node.arg) ? node : findReady(node.arg)
  if (node.t === 'pm') {
    // Never "ready" itself — resolving ± is a branch choice made by building
    // a fresh tree per branch (x₁/x₂), not a generic operation. Still dig
    // into both sides so e.g. √Δ can reveal its value while ± stays put.
    if (!isValueNode(node.a)) { const r = findReady(node.a); if (r) return r }
    if (!isValueNode(node.b)) { const r = findReady(node.b); if (r) return r }
    return null
  }
  return null
}

// Returns { num } for a plain number, or { rat: {p, q} } for a fraction.
function evalOne(node) {
  if (node.t === 'bin') {
    const x = asRat(node.a), y = asRat(node.b)
    // Decimals are not rationals here on purpose: "3.5/2" has never been a
    // fraction in this app and stays the division it always was.
    if (x && y && Number.isInteger(x.p) && Number.isInteger(x.q) &&
        Number.isInteger(y.p) && Number.isInteger(y.q)) {
      return ratArith(node.op, x, y)
    }
    const a = ratValue(node.a), b = ratValue(node.b)
    switch (node.op) {
      case '+': return { num: a + b }
      case '-': return { num: a - b }
      case '*': return { num: a * b }
      case '/': return { num: b !== 0 ? a / b : NaN }
      default:  return { num: NaN }
    }
  }
  if (node.t === 'pow')  return { num: Math.pow(ratValue(node.base), isExpNode(node.exp) ? ratValue(node.exp) : node.exp) }
  if (node.t === 'sqrt') {
    const n = node.index?.v ?? 2
    const v = ratValue(node.arg)
    // An ODD root of a negative number is real — ∛(-8) is -2 — but
    // Math.pow(-8, 1/3) is NaN, so that case is done on the magnitude.
    return { num: v < 0 && Math.abs(n % 2) === 1 ? -Math.pow(-v, 1 / n) : Math.pow(v, 1 / n) }
  }
  // A negated fraction stays a fraction — the sign rides on the numerator.
  if (node.t === 'neg') {
    const r = asRat(node.arg)
    return r && Number.isInteger(r.p) && Number.isInteger(r.q)
      ? ratResult({ p: -r.p, q: r.q })
      : { num: -ratValue(node.arg) }
  }
  if (node.t === 'fact') { let r = 1; for (let k = 2; k <= node.arg.v; k++) r *= k; return { num: r } }
  if (node.t === 'fn') {
    const rad = ratValue(node.arg) * Math.PI / 180
    switch (node.name) {
      case 'sin': return { num: Math.sin(rad) }
      case 'cos': return { num: Math.cos(rad) }
      case 'tan': return { num: Math.tan(rad) }
      default:    return { num: NaN }
    }
  }
  return { num: NaN }
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
  const out = evalOne(node)
  for (const k of Object.keys(node)) { if (k !== 'id') delete node[k] }
  if (out.rat) {
    // Same id, so the element on screen is the same one changing — it becomes
    // a stacked numerator/bar/denominator rather than a single chip.
    node.t  = 'bin'
    node.op = '/'
    node.a  = num(out.rat.p)
    node.b  = num(out.rat.q)
    return out.rat.p / out.rat.q
  }
  const result = round(out.num)
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
  else if (node.t === 'pow') {
    substituteLabel(node.base, name, value)
    if (isExpNode(node.exp)) substituteLabel(node.exp, name, value)
  }
  else if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn' || node.t === 'fact') substituteLabel(node.arg, name, value)
}

export function collectLabels(node, out = new Set()) {
  if (!node) return out
  if (node.t === 'label') out.add(node.name)
  else if (node.t === 'bin' || node.t === 'pm') { collectLabels(node.a, out); collectLabels(node.b, out) }
  else if (node.t === 'pow') {
    collectLabels(node.base, out)
    if (isExpNode(node.exp)) collectLabels(node.exp, out)
  }
  else if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn' || node.t === 'fact') collectLabels(node.arg, out)
  return out
}

// All leaf node ids currently holding this label (a label can appear more
// than once in one tree, e.g. "2*|r| + |r|^2") — used to fade/highlight
// every occurrence when it gets replaced by a real value.
export function collectLabelNodeIds(node, name, out = []) {
  if (!node) return out
  if (node.t === 'label' && node.name === name) out.push(node.id)
  else if (node.t === 'bin' || node.t === 'pm') { collectLabelNodeIds(node.a, name, out); collectLabelNodeIds(node.b, name, out) }
  else if (node.t === 'pow') {
    collectLabelNodeIds(node.base, name, out)
    if (isExpNode(node.exp)) collectLabelNodeIds(node.exp, name, out)
  }
  else if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn' || node.t === 'fact') collectLabelNodeIds(node.arg, name, out)
  return out
}

// Find the "±" node in a tree (at most one — it only ever appears once, in
// the quadratic formula's numerator).
export function findPm(node) {
  if (!node) return null
  if (node.t === 'pm') return node
  if (node.t === 'bin') return findPm(node.a) || findPm(node.b)
  if (node.t === 'pow') return findPm(node.base) || (isExpNode(node.exp) ? findPm(node.exp) : null)
  if (node.t === 'sqrt' || node.t === 'neg' || node.t === 'fn' || node.t === 'fact') return findPm(node.arg)
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
  if (isExpNode(copy.exp)) copy.exp = deepClone(copy.exp)
  if (copy.arg) copy.arg = deepClone(copy.arg)
  return copy
}

// True if this content needs the tree parser at all — i.e. has real internal
// structure (grouping, an explicit operator) beyond "number, optional single
// variable, optional exponent". Plain atoms (kept on the fast path used by
// ordinary linear-algebra terms, untouched by any of this) never match.
export function needsExprTree(content) {
  // An exponent that is not a plain integer — 2^n, r^(n-1) — is structure too.
  return /[()/!]|[*×·÷]|\^\s*(?!-?\d+(?![.\d]))/.test(content)
}

// ── Parser ───────────────────────────────────────────────────────────────────
// Parses a term's inner content (top-level +/- across an equation SIDE is
// already split by the caller — this only ever sees one +/- separated piece,
// though + and - can still appear here inside parens). Standard recursive-
// descent: addSub > mulDiv > pow > atom — precedence climbs through the
// grammar itself, so "(...)" nesting and */  before +- both fall out for
// free, matching findReady's traversal above exactly.
export function parseTermExpr(content, labels, colors) {
  const s = content.trim()
  let i = 0

  function skipWs() { while (s[i] === ' ') i++ }

  // A leaf immediately followed by its own "__Cn__" color marker (e.g.
  // "|Opposite|{orange}") gets that as its OWN color, not just whatever
  // uniform color the whole term happens to carry — lets a fraction's
  // numerator and denominator (see TermCell.jsx's ExprLeaf: node.color
  // takes priority over the inherited one) show two different colors,
  // the way |a|{green} and |b|{orange} already can as separate terms.
  function consumeOwnColor(node) {
    if (!colors) return node
    const m = s.slice(i).match(/^__C(\d+)__/)
    if (m) { i += m[0].length; node.color = colors[+m[1]] }
    return node
  }

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
    if (labelM) { i += labelM[0].length; return consumeOwnColor(label(labels[+labelM[1]])) }
    // sin/cos/tan — must be checked before the single-letter variable match
    // below, or "sin(45)" would parse as just the label "s" and silently
    // drop everything from "in(45)" onward.
    // A radical is NOTATION, not a function name — it has to come out as √
    // with a bar over its argument, so it gets its own node rather than the
    // generic fn node that writes "sin(...)" out as a word. Checked before the
    // single-letter label branch below, or "sqrt(16)" would parse as the label
    // "s" and quietly drop the rest.
    const rootM = rest.match(/^(sqrt|cbrt|root)\(/)
    if (rootM) {
      i += rootM[0].length
      let index = rootM[1] === 'cbrt' ? num(3) : null
      let arg   = parseAddSub()
      skipWs()
      // root(n, x) reads the way it is said out loud: the index first.
      if (rootM[1] === 'root' && s[i] === ',') {
        i++
        index = arg
        arg   = parseAddSub()
        skipWs()
      }
      if (s[i] === ')') i++
      return sqrtN(arg, index)
    }
    const fnM = rest.match(/^(sin|cos|tan)\(/)
    if (fnM) {
      i += fnM[0].length
      const arg = parseAddSub()
      skipWs()
      if (s[i] === ')') i++
      return trigFn(fnM[1], arg)
    }
    const numM = rest.match(/^\d+\.?\d*/)
    if (numM) {
      i += numM[0].length
      const a = consumeOwnColor(num(parseFloat(numM[0])))
      // A whole-number fraction binds TIGHTER than the × beside it. Written out,
      // "2/3 * 3/4" is two fractions multiplied; left-to-right it parsed as
      // ((2/3)·3)/4 — the same number, but the × ended up drawn inside the
      // numerator, which is not what anyone writes on a board.
      const den = s.slice(i).match(/^\s*\/\s*(\d+)(?!\.)/)
      if (den && Number.isInteger(parseFloat(numM[0]))) {
        i += den[0].length
        return bin('/', a, consumeOwnColor(num(parseFloat(den[1]))))
      }
      return a
    }
    // A letter with its subscript, when it has one — a₁, uₙ — is one name.
    const varM = rest.match(/^[a-zA-Zα-ω][\u2080-\u209C\u1D62-\u1D65\u2C7C]*/)
    if (varM) { i += varM[0].length; return consumeOwnColor(label(varM[0])) }
    throw new Error(`parseTermExpr: unexpected character at ${i} in "${s}"`)
  }

  function parsePow() {
    let node = parseAtom()
    // Postfix, and it binds tighter than anything: 5!^2 is (5!)², and 2·5! is
    // 2·(5!). Reading it here rather than in parseAtom lets "(n+1)!" work too.
    skipWs()
    while (s[i] === '!') { i++; node = factN(node); skipWs() }
    skipWs()
    if (s[i] === '^') {
      i++
      skipWs()
      const expM = s.slice(i).match(/^-?\d+(?![.\d])/)
      if (expM) { i += expM[0].length; node = pw(node, parseInt(expM[0], 10)) }
      // Anything else up there — a letter, a |label|, a bracket — is an
      // expression of its own: 2^n, 2^|n|, r^(n-1). The bracket only groups what
      // has to be typed on one line; raised, the exponent needs none.
      else if (/^[-(_a-zA-Zα-ω\d]/.test(s.slice(i))) node = pw(node, parseAtom())
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
      // "3/4 ÷ 2/5" is the same division, written inline with its own sign the
      // way it is on paper, rather than stacked into a fraction of fractions.
      else if (c === '÷')                      { i++; node = { ...bin('/', node, parsePow()), divSign: true } }
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
