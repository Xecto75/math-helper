let _u = 0
const u = () => `bl${++_u}`

export const LESSON_GRADES = [
  /* ── Algebra ──────────────────────────────────────────────────────────────── */
  {
    id: 'algebra',
    label: 'Algebra',
    sublabel: 'Equations & expressions',
    color: '#60a5fa',
    lessons: [
      {
        id: 'linear-equations',
        emoji: '⚖️', title: 'Solving Linear Equations',
        color: '#60a5fa', bg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
        desc: 'Isolate x step by step — send terms across, divide both sides',
        pages: [
          {
            id: u(), title: 'Solve: 3x + 5 = 14', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',          inputs: { eq: '3x + 5 = 14' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Send +5 to the other side as −5.' } },
              { id: u(), funcId: 'eq-send-other-side', inputs: { term: '+5' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Divide both sides by 3.' } },
              { id: u(), funcId: 'eq-divide',           inputs: { divisor: '3' } },
            ],
          },
          {
            id: u(), title: 'Solve: 2x − 7 = x + 4', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',          inputs: { eq: '2x - 7 = x + 4' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Send −7 across, then send x across.' } },
              { id: u(), funcId: 'eq-send-other-side', inputs: { term: '-7' } },
              { id: u(), funcId: 'eq-send-other-side', inputs: { term: 'x' } },
              { id: u(), funcId: 'eq-combine',         inputs: {} },
            ],
          },
          {
            id: u(), title: 'Solve: 4(x + 2) = 24', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',          inputs: { eq: '4(x + 2) = 24' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Distribute 4 into the bracket.' } },
              { id: u(), funcId: 'eq-distribute',      inputs: { eq: '4(x + 2)' } },
              { id: u(), funcId: 'eq-send-other-side', inputs: { term: '+8' } },
              { id: u(), funcId: 'eq-divide',          inputs: { divisor: '4' } },
            ],
          },
        ],
      },
      {
        id: 'quadratic-equations',
        emoji: '🔬', title: 'Quadratic Equations',
        color: '#a78bfa', bg: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 100%)',
        desc: 'Discriminant Δ, real roots, factored form — ax² + bx + c = 0',
        pages: [
          /* Page 1 — concept + formula */
          {
            id: u(), title: 'The quadratic formula', layout: 'text-equation',
            steps: [
              { id: u(), funcId: 'text-create', inputs: {
                boxId: 'intro', title: 'Quadratic Equation',
                content: 'Standard form: $ax^2 + bx + c = 0$|We look for the values of $x$ that make the equation equal zero — the **roots**.',
                isList: 'false', color: 'purple',
              }},
              { id: u(), funcId: 'text-create', inputs: {
                boxId: 'formula', title: 'Quadratic Formula',
                content: '$x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$',
                isList: 'false', color: 'amber',
              }},
              { id: u(), funcId: 'text-create', inputs: {
                boxId: 'cases', title: 'Discriminant $\\Delta = b^2 - 4ac$',
                content: '$\\Delta > 0$ → two real roots|$\\Delta = 0$ → one root (double)|$\\Delta < 0$ → no real root',
                isList: 'true', color: 'green',
              }},
            ],
          },
          /* Page 2 — solve x² − 5x + 6 = 0 */
          {
            id: u(), title: 'Solve: x² − 5x + 6 = 0', layout: 'text-equation',
            steps: [
              { id: u(), funcId: 'eq-create',       inputs: { eq: 'x^2 - 5x + 6 = 0' } },
              { id: u(), funcId: 'quadratic-solve', inputs: {} },
            ],
          },
          /* Page 3 — solve 2x² + 3x − 2 = 0 */
          {
            id: u(), title: 'Solve: 2x² + 3x − 2 = 0', layout: 'text-equation',
            steps: [
              { id: u(), funcId: 'eq-create',       inputs: { eq: '2x^2 + 3x - 2 = 0' } },
              { id: u(), funcId: 'quadratic-solve', inputs: {} },
            ],
          },
        ],
      },
      {
        id: 'factoring',
        emoji: '🔣', title: 'Expanding & Factoring',
        color: '#e879f9', bg: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)',
        desc: 'Distributivity, notable identities, and factoring expressions',
        pages: [
          {
            id: u(), title: 'Expand: (x + 3)(x − 2)', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',    inputs: { eq: '(x + 3)(x - 2)' } },
              { id: u(), funcId: 'narrate',       inputs: { text: 'Apply FOIL: First, Outside, Inside, Last.' } },
              { id: u(), funcId: 'eq-distribute', inputs: { eq: '(x + 3)(x - 2)' } },
              { id: u(), funcId: 'eq-combine',    inputs: {} },
            ],
          },
          {
            id: u(), title: 'Notable identity: (a + b)²', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',    inputs: { eq: '(x + 5)^2' } },
              { id: u(), funcId: 'narrate',       inputs: { text: '(a + b)² = a² + 2ab + b².' } },
              { id: u(), funcId: 'eq-distribute', inputs: { eq: '(x + 5)^2' } },
              { id: u(), funcId: 'eq-combine',    inputs: {} },
            ],
          },
        ],
      },
      {
        id: 'systems-equations',
        emoji: '🔀', title: 'Systems of Equations',
        color: '#f472b6', bg: 'linear-gradient(135deg, #831843 0%, #9d174d 100%)',
        desc: 'Solve 2×2 linear systems — substitution and elimination',
        pages: [
          {
            id: u(), title: 'x + y = 10,  x − y = 4', layout: 'graph-equation',
            steps: [
              { id: u(), funcId: 'eq-create',              inputs: { eq: 'x + y = 10' } },
              { id: u(), funcId: 'graph-plot-function',    inputs: { expr: '10 - x', id: 'f1' } },
              { id: u(), funcId: 'graph-plot-function',    inputs: { expr: 'x - 4',  id: 'f2' } },
              { id: u(), funcId: 'narrate',                inputs: { text: 'The intersection is the solution.' } },
              { id: u(), funcId: 'graph-find-intersections', inputs: { f1: 'f1', f2: 'f2' } },
            ],
          },
        ],
      },
    ],
  },

  /* ── Trigonometry ─────────────────────────────────────────────────────────── */
  {
    id: 'trigonometry',
    label: 'Trigonometry',
    sublabel: 'Angles, ratios & the unit circle',
    color: '#f87171',
    lessons: [
      {
        id: 'trig-ratios',
        emoji: '📐', title: 'Trig Ratios — SOH CAH TOA',
        color: '#f87171', bg: 'linear-gradient(135deg, #450a0a 0%, #991b1b 100%)',
        desc: 'sin, cos, tan in a right triangle with labeled sides',
        pages: [
          {
            id: u(), title: 'Right triangle — labeling sides', layout: 'single-geo',
            steps: [
              { id: u(), funcId: 'geo-create-polygon', inputs: { shapeId: 'tri', 'shape-type': 'right-triangle', values: '5,3,4', fillColor: '#1e3a5f', borderColor: '#60a5fa' } },
              { id: u(), funcId: 'narrate',            inputs: { text: 'In a right triangle: opposite, adjacent, hypotenuse.' } },
              { id: u(), funcId: 'geo-label-sides',    inputs: { shapeId: 'tri', labels: 'adj=3,opp=4,hyp=5' } },
              { id: u(), funcId: 'geo-show-angles',    inputs: { shapeId: 'tri', color: '#fbbf24' } },
            ],
          },
          {
            id: u(), title: 'SOH — sin θ = opp / hyp', layout: 'geo-equation',
            steps: [
              { id: u(), funcId: 'geo-create-polygon', inputs: { shapeId: 'tri', 'shape-type': 'right-triangle', values: '5,3,4', fillColor: '#1e3a5f', borderColor: '#60a5fa' } },
              { id: u(), funcId: 'geo-label-sides',    inputs: { shapeId: 'tri', labels: 'adj=3,opp=4,hyp=5' } },
              { id: u(), funcId: 'eq-create',          inputs: { eq: '\\sin\\theta = \\frac{\\text{opp}}{\\text{hyp}} = \\frac{4}{5} = 0.8' } },
              { id: u(), funcId: 'narrate',            inputs: { text: 'sin θ = opposite ÷ hypotenuse = 4/5 = 0.8.' } },
            ],
          },
          {
            id: u(), title: 'Finding the angle — inverse trig', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',             inputs: { eq: '\\sin\\theta = 0.8' } },
              { id: u(), funcId: 'narrate',               inputs: { text: 'Apply sin⁻¹ to both sides.' } },
              { id: u(), funcId: 'eq-apply-inverse-trig', inputs: { trig: 'sin' } },
            ],
          },
        ],
      },
      {
        id: 'trig-graphs',
        emoji: '〰️', title: 'Graphs of sin, cos, tan',
        color: '#fb923c', bg: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
        desc: 'Plot and compare the three trig functions on the same axes',
        pages: [
          {
            id: u(), title: 'Graph of sin(x)', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-2', yMax: '2' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(x)', id: 'sinf' } },
              { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'sinf', label: 'sin(x)', x0: '1.5', y0: '1.2' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Period = 2π, amplitude = 1. Zeros at multiples of π.' } },
              { id: u(), funcId: 'graph-mark-roots',    inputs: { funcId: 'sinf' } },
            ],
          },
          {
            id: u(), title: 'sin(x) vs cos(x)', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-2', yMax: '2' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(x)', id: 'sinf' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'cos(x)', id: 'cosf' } },
              { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'sinf', label: 'sin(x)', x0: '1.5', y0: '1.2' } },
              { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'cosf', label: 'cos(x)', x0: '0.3', y0: '1.2' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'cos(x) is sin(x) shifted left by π/2.' } },
            ],
          },
          {
            id: u(), title: 'Amplitude & period — A·sin(Bx)', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-3', yMax: '3' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(x)',   id: 'base' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*sin(x)', id: 'amp2' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(2*x)', id: 'per2' } },
              { id: u(), funcId: 'narrate',             inputs: { text: '2·sin(x) doubles the amplitude. sin(2x) halves the period.' } },
            ],
          },
        ],
      },
      {
        id: 'unit-circle',
        emoji: '🔵', title: 'The Unit Circle',
        color: '#60a5fa', bg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
        desc: 'cos θ and sin θ as coordinates on a circle of radius 1',
        pages: [
          {
            id: u(), title: 'Unit circle — key angles', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-1.8', xMax: '1.8', yMin: '-1.8', yMax: '1.8' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sqrt(1-x^2)',  id: 'top' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: '-sqrt(1-x^2)', id: 'bot' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Unit circle: x = cos θ, y = sin θ at angle θ.' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '1',  y: '0',  id: 'p0',   label: '0°' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '0',  y: '1',  id: 'p90',  label: '90°' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '-1', y: '0',  id: 'p180', label: '180°' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '0',  y: '-1', id: 'p270', label: '270°' } },
            ],
          },
        ],
      },
    ],
  },

  /* ── Functions & Graphs ───────────────────────────────────────────────────── */
  {
    id: 'graphs',
    label: 'Functions & Graphs',
    sublabel: 'Plotting, analysis & calculus intro',
    color: '#34d399',
    lessons: [
      {
        id: 'linear-functions',
        emoji: '📈', title: 'Linear Functions',
        color: '#34d399', bg: 'linear-gradient(135deg, #022c22 0%, #14532d 100%)',
        desc: 'f(x) = ax + b — slope, y-intercept, and intersections',
        pages: [
          {
            id: u(), title: 'Slope and y-intercept', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 1', id: 'f1' } },
              { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f1', label: 'f(x) = 2x + 1', x0: '0.5', y0: '3' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Slope a = 2 means +2 in y for every +1 in x. y-intercept = 1.' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '0', y: '1', id: 'yint', label: 'b = 1' } },
            ],
          },
          {
            id: u(), title: 'Intersection of two lines', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function',      inputs: { expr: '2*x + 1', id: 'f1' } },
              { id: u(), funcId: 'graph-plot-function',      inputs: { expr: '-x + 4',  id: 'f2' } },
              { id: u(), funcId: 'narrate',                  inputs: { text: 'Set 2x + 1 = −x + 4 and solve for x.' } },
              { id: u(), funcId: 'graph-find-intersections', inputs: { f1: 'f1', f2: 'f2' } },
            ],
          },
        ],
      },
      {
        id: 'quadratic-graphs',
        emoji: '⛰️', title: 'Quadratic Functions',
        color: '#fbbf24', bg: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)',
        desc: 'Parabolas — vertex, axis of symmetry, roots',
        pages: [
          {
            id: u(), title: 'f(x) = x² − 4x + 3', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2 - 4*x + 3', id: 'par' } },
              { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'par', label: 'x² − 4x + 3', x0: '3', y0: '2' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Vertex at x = −b/2a = 2. Roots at x = 1 and x = 3.' } },
              { id: u(), funcId: 'graph-mark-roots',    inputs: { funcId: 'par' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '2', y: '-1', id: 'vert', label: 'vertex' } },
            ],
          },
          {
            id: u(), title: 'Effect of coefficient a', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2',     id: 'a1' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x^2',   id: 'a2' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: '0.5*x^2', id: 'a3' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Larger |a| = narrower parabola. Smaller |a| = wider.' } },
            ],
          },
        ],
      },
      {
        id: 'derivatives-intro',
        emoji: '📉', title: 'Introduction to Derivatives',
        color: '#c084fc', bg: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
        desc: 'Slope at a point, tangent line, and the derivative function',
        pages: [
          {
            id: u(), title: 'Tangent line to f(x) = x²', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2', id: 'fx' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'At x = 2, f(2) = 4. The slope is f′(2) = 2·2 = 4.' } },
              { id: u(), funcId: 'graph-tangent',       inputs: { funcId: 'fx', x0: '2', y0: '4' } },
            ],
          },
          {
            id: u(), title: 'Derivative of sin(x) is cos(x)', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',   inputs: { xMin: '-7', xMax: '7', yMin: '-2', yMax: '2' } },
              { id: u(), funcId: 'graph-plot-function',  inputs: { expr: 'sin(x)', id: 'sinf' } },
              { id: u(), funcId: 'narrate',              inputs: { text: 'The derivative of sin(x) is cos(x).' } },
              { id: u(), funcId: 'graph-plot-derivative', inputs: { funcId: 'sinf' } },
            ],
          },
          {
            id: u(), title: 'Area under a curve — Riemann sum', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2', id: 'fx' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'Area under x² from 0 to 3 = ∫₀³ x² dx = 9.' } },
              { id: u(), funcId: 'graph-shade-area',    inputs: { funcId: 'fx', a: '0', b: '3' } },
              { id: u(), funcId: 'graph-riemann-sum',   inputs: { funcId: 'fx', a: '0', b: '3', n: '6', method: 'midpoint' } },
            ],
          },
        ],
      },
    ],
  },

  /* ── Geometry ─────────────────────────────────────────────────────────────── */
  {
    id: 'geometry',
    label: 'Geometry',
    sublabel: 'Shapes, angles & proofs',
    color: '#38bdf8',
    lessons: [
      {
        id: 'polygons',
        emoji: '🔷', title: 'Polygons & Angles',
        color: '#38bdf8', bg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
        desc: 'Interior angles, perimeter, and properties of regular polygons',
        pages: [
          {
            id: u(), title: 'Triangle — sum of angles = 180°', layout: 'single-geo',
            steps: [
              { id: u(), funcId: 'geo-create-polygon', inputs: { shapeId: 'tri', 'shape-type': 'triangle', values: '6,5,4', fillColor: '#1e3a5f', borderColor: '#38bdf8' } },
              { id: u(), funcId: 'geo-show-angles',    inputs: { shapeId: 'tri', color: '#fbbf24' } },
              { id: u(), funcId: 'narrate',            inputs: { text: 'The three interior angles of any triangle always sum to 180°.' } },
            ],
          },
          {
            id: u(), title: 'Rectangle — perimeter & area', layout: 'geo-equation',
            steps: [
              { id: u(), funcId: 'geo-create-polygon', inputs: { shapeId: 'rect', 'shape-type': 'rectangle', values: '8,4', fillColor: '#1e3a5f', borderColor: '#60a5fa' } },
              { id: u(), funcId: 'geo-label-sides',    inputs: { shapeId: 'rect', labels: '8,4,8,4' } },
              { id: u(), funcId: 'eq-create',          inputs: { eq: 'P = 2(l + w) = 2(8 + 4) = 24' } },
              { id: u(), funcId: 'narrate',            inputs: { text: 'Perimeter = 2(l + w) = 24 units. Area = l × w = 32 units².' } },
            ],
          },
        ],
      },
      {
        id: 'pythagoras',
        emoji: '📐', title: 'Pythagorean Theorem',
        color: '#fbbf24', bg: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)',
        desc: 'a² + b² = c² — proof and applications in right triangles',
        pages: [
          {
            id: u(), title: 'a² + b² = c²', layout: 'geo-equation',
            steps: [
              { id: u(), funcId: 'geo-create-polygon',  inputs: { shapeId: 'tri', 'shape-type': 'right-triangle', values: '5,3,4', fillColor: '#1e3a5f', borderColor: '#fbbf24' } },
              { id: u(), funcId: 'geo-label-sides',     inputs: { shapeId: 'tri', labels: 'a=3,b=4,c=?' } },
              { id: u(), funcId: 'eq-create',           inputs: { eq: 'a^2 + b^2 = c^2' } },
              { id: u(), funcId: 'narrate',             inputs: { text: '3² + 4² = 9 + 16 = 25. So c = √25 = 5.' } },
              { id: u(), funcId: 'eq-replace-variable', inputs: { var_a: '3', var_b: '4' } },
            ],
          },
          {
            id: u(), title: 'Find the missing side', layout: 'geo-equation',
            steps: [
              { id: u(), funcId: 'geo-create-polygon',  inputs: { shapeId: 'tri', 'shape-type': 'right-triangle', values: '13,5,12', fillColor: '#1e3a5f', borderColor: '#fbbf24' } },
              { id: u(), funcId: 'geo-label-sides',     inputs: { shapeId: 'tri', labels: 'a=5,b=?,c=13' } },
              { id: u(), funcId: 'eq-create',           inputs: { eq: '5^2 + b^2 = 13^2' } },
              { id: u(), funcId: 'eq-send-other-side',  inputs: { term: '5^2' } },
              { id: u(), funcId: 'narrate',             inputs: { text: 'b² = 169 − 25 = 144, so b = 12.' } },
              { id: u(), funcId: 'eq-racine-des-bords', inputs: { eq: 'b^2 = 144' } },
            ],
          },
        ],
      },
    ],
  },
]

export const BUILTIN_LESSONS = LESSON_GRADES.flatMap(g => g.lessons.filter(l => !l.comingSoon))
