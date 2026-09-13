// Polynomial long division — the school tableau, as data.
//
// Feeds the division display: every line the student would write by hand is one
// entry in `steps`, in the order it gets written. Nothing here renders; keeping
// the arithmetic separate from the drawing means the hard part can be tested on
// its own, which is how the worked example in the docstring below was checked.
//
//   divide('8x^3 - 4x^2 + 8x - 12', 'x - 1')
//     quotient  8x^2 + 4x + 12
//     remainder 0
//     steps     bring 8x^2 → subtract 8x^3 - 8x^2 → leaves 4x^2 + 8x - 12
//               bring 4x   → subtract 4x^2 - 4x   → leaves 12x - 12
//               bring 12   → subtract 12x - 12    → leaves 0

// ── Parsing ─────────────────────────────────────────────────────────────────
// Univariate only, which is what long division is taught on. Returns
// coefficients highest power first: '8x^3 - 4x^2 + 8x - 12' → [8, -4, 8, -12].
export function parsePolynomial(input) {
  const src = String(input ?? '').replace(/\s+/g, '')
  if (!src) throw new Error('Empty polynomial.')

  // The variable is whichever letter appears; x when there is none (a constant).
  const letters = [...new Set(src.match(/[a-zA-Z]/g) ?? [])]
  if (letters.length > 1) {
    throw new Error(`Long division needs one variable, found ${letters.join(' and ')}.`)
  }
  const v = letters[0] ?? 'x'

  // Split into signed terms without losing the sign of the first one.
  const terms = src.replace(/-/g, '+-').split('+').filter(Boolean)

  const byPower = new Map()
  for (const term of terms) {
    const m = term.match(new RegExp(`^([+-]?[\\d.]*)(?:\\*?${v}(?:\\^(-?\\d+))?)?$`))
    if (!m) throw new Error(`Cannot read the term "${term}".`)
    const [, rawCoef, rawPow] = m
    const hasVar = term.includes(v)
    const power  = hasVar ? (rawPow === undefined ? 1 : Number(rawPow)) : 0
    if (power < 0) throw new Error('Negative exponents are not polynomials.')
    // '-x' and 'x' carry an implicit ±1
    const coef = rawCoef === '' || rawCoef === '+' ? 1 : rawCoef === '-' ? -1 : Number(rawCoef)
    if (!Number.isFinite(coef)) throw new Error(`Cannot read the coefficient in "${term}".`)
    byPower.set(power, (byPower.get(power) ?? 0) + coef)
  }

  const degree = Math.max(...byPower.keys())
  const coeffs = []
  for (let p = degree; p >= 0; p--) coeffs.push(byPower.get(p) ?? 0)
  return { coeffs, variable: v }
}

// Drop leading zeros so the degree is honest: [0, 0, 3, 1] is degree 1, not 3.
const trim = (c) => {
  let i = 0
  while (i < c.length - 1 && Math.abs(c[i]) < 1e-12) i++
  return c.slice(i)
}

const isZero = (c) => c.every(n => Math.abs(n) < 1e-12)

// ── Rendering a coefficient list back to math ───────────────────────────────
// Signs read the way they are written by hand: leading minus stays attached,
// later terms become " - " rather than " + -".
export function polyToString(coeffs, v = 'x') {
  const c = trim(coeffs)
  if (isZero(c)) return '0'
  const degree = c.length - 1
  let out = ''
  c.forEach((coef, i) => {
    if (Math.abs(coef) < 1e-12) return
    const power = degree - i
    const abs   = Math.abs(coef)
    const num   = Number(abs.toFixed(6))
    // 1x is written x, except as a bare constant
    const shown = (num === 1 && power > 0) ? '' : String(num)
    const part  = power === 0 ? shown : power === 1 ? `${shown}${v}` : `${shown}${v}^${power}`
    out += out === '' ? (coef < 0 ? `-${part}` : part)
                      : (coef < 0 ? ` - ${part}` : ` + ${part}`)
  })
  return out
}

// ── The division itself ─────────────────────────────────────────────────────
export function dividePolynomials(dividendInput, divisorInput) {
  const a = parsePolynomial(dividendInput)
  const b = parsePolynomial(divisorInput)
  if (a.variable !== b.variable && trim(b.coeffs).length > 1) {
    throw new Error(`The polynomial is in ${a.variable} but the divisor is in ${b.variable}.`)
  }
  const v = a.variable

  const divisor = trim(b.coeffs)
  if (isZero(divisor)) throw new Error('Cannot divide by zero.')

  let working = trim(a.coeffs)
  const dDeg = divisor.length - 1
  const quotient = []
  const steps = []

  // Each pass kills the current leading term, exactly as done on paper.
  while (!isZero(working) && working.length - 1 >= dDeg) {
    const qCoef  = working[0] / divisor[0]
    const qPower = (working.length - 1) - dDeg
    quotient.push({ coef: qCoef, power: qPower })

    // product = (this quotient term) × divisor, lined up under the working row
    const product = new Array(working.length).fill(0)
    divisor.forEach((d, i) => { product[i] = d * qCoef })

    const next = trim(working.map((w, i) => w - product[i]).slice(1))

    steps.push({
      // the term just added to the quotient, on its own
      term:      polyToString([qCoef, ...new Array(qPower).fill(0)], v),
      // The line written underneath and subtracted. The whole product array is
      // rendered, not the divisor-length slice of it: the product sits at the
      // TOP of the working row, so its degree is the row's degree. Slicing it
      // free of that context turned 8x³ − 8x² into 8x − 8.
      subtract:  polyToString(product, v),
      // what is left to carry down
      remainder: polyToString(next, v),
    })

    working = next
  }

  const qCoeffs = []
  if (quotient.length) {
    const top = quotient[0].power
    for (let p = top; p >= 0; p--) {
      qCoeffs.push(quotient.find(q => q.power === p)?.coef ?? 0)
    }
  } else {
    qCoeffs.push(0)
  }

  return {
    variable:  v,
    dividend:  polyToString(a.coeffs, v),
    divisor:   polyToString(divisor, v),
    quotient:  polyToString(qCoeffs, v),
    remainder: polyToString(working, v),
    exact:     isZero(working),
    steps,
  }
}
