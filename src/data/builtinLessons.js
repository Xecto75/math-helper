let _u = 0
const u = () => `bl${++_u}`

// A lesson that exists in the list but has no pages yet. It shows in the Library
// as "coming soon" and cannot be opened — the shelf is the plan for what the
// secondary curriculum needs, and each one gets built by hand later. The
// difficulty is what the card shows in its corner; the comment beside it is the
// Quebec secondary year it belongs to, for whoever fills it in.
const soon = (id, emoji, title, desc, difficulty, color, bg) =>
  ({ id, emoji, title, desc, difficulty, color, bg, comingSoon: true, pages: [] })

// One look per category — every card on a shelf is the same.
const BG = {
  amber:  'linear-gradient(135deg, #451a03 0%, #b45309 100%)',
  blue:   'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
  red:    'linear-gradient(135deg, #450a0a 0%, #991b1b 100%)',
  green:  'linear-gradient(135deg, #022c22 0%, #14532d 100%)',
  sky:    'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
  purple: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 100%)',
}

export const LESSON_GRADES = [
  /* ── Arithmetic ───────────────────────────────────────────────────────────── */
  {
    id: 'arithmetic',
    label: 'Numbers & Arithmetic',
    sublabel: 'Integers, fractions, ratios & percent',
    color: '#fbbf24',
    lessons: [
      soon('integers-operations', '➕', 'Integers & Order of Operations',
        'Negative numbers, and which operation goes first', 'beginner', '#fbbf24', BG.amber),   // sec 1
      soon('fractions-decimals', '½', 'Fractions & Decimals',
        'Add, compare and convert between the two forms', 'beginner', '#fbbf24', BG.amber),     // sec 1-2
      soon('ratios-proportions', '🔗', 'Ratios, Rates & Proportions',
        'Equivalent ratios, unit rates, and solving a proportion', 'beginner', '#fbbf24', BG.amber), // sec 2
      soon('percentages', '％', 'Percentages',
        'Percent of a number, increase, decrease and discounts', 'beginner', '#fbbf24', BG.amber),   // sec 2
    ],
  },

  /* ── Algebra ──────────────────────────────────────────────────────────────── */
  {
    id: 'algebra',
    label: 'Algebra',
    sublabel: 'Equations & expressions',
    color: '#60a5fa',
    lessons: [
      {
        id: 'linear-equations', difficulty: 'beginner',
        emoji: '⚖️', title: 'Solving Linear Equations',
        color: '#60a5fa', bg: BG.blue,
        desc: 'Isolate x step by step — send terms across, divide both sides',
        pages: [
          {
            id: u(), title: 'Solve: 3x + 5 = 14', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',          inputs: { eq: '3x + 5 = 14' } },
              { id: u(), funcId: 'eq-send-other-side', inputs: { term: '+5' } },
              { id: u(), funcId: 'eq-divide',           inputs: { divisor: '3' } },
            ],
          },
          {
            id: u(), title: 'Solve: 2x − 7 = x + 4', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',          inputs: { eq: '2x - 7 = x + 4' } },
              { id: u(), funcId: 'eq-send-other-side', inputs: { term: '-7' } },
              { id: u(), funcId: 'eq-send-other-side', inputs: { term: 'x' } },
              { id: u(), funcId: 'eq-combine',         inputs: {} },
            ],
          },
          {
            id: u(), title: 'Solve: 4(x + 2) = 24', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',          inputs: { eq: '4(x + 2) = 24' } },
              { id: u(), funcId: 'eq-distribute',      inputs: { eq: '4(x + 2)' } },
              { id: u(), funcId: 'eq-send-other-side', inputs: { term: '+8' } },
              { id: u(), funcId: 'eq-divide',          inputs: { divisor: '4' } },
            ],
          },
        ],
      },
      {
        id: 'quadratic-equations', difficulty: 'advanced',
        emoji: '🔬', title: 'Quadratic Equations',
        color: '#60a5fa', bg: BG.blue,
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
        id: 'factoring', difficulty: 'intermediate',
        emoji: '🔣', title: 'Expanding & Factoring',
        color: '#60a5fa', bg: BG.blue,
        desc: 'Distributivity, notable identities, and factoring expressions',
        pages: [
          {
            id: u(), title: 'Expand: (x + 3)(x − 2)', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',    inputs: { eq: '(x + 3)(x - 2)' } },
              { id: u(), funcId: 'eq-distribute', inputs: { eq: '(x + 3)(x - 2)' } },
              { id: u(), funcId: 'eq-combine',    inputs: {} },
            ],
          },
          {
            id: u(), title: 'Notable identity: (a + b)²', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',    inputs: { eq: '(x + 5)^2' } },
              { id: u(), funcId: 'eq-distribute', inputs: { eq: '(x + 5)^2' } },
              { id: u(), funcId: 'eq-combine',    inputs: {} },
            ],
          },
        ],
      },
      {
        id: 'systems-equations', difficulty: 'intermediate',
        emoji: '🔀', title: 'Systems of Equations',
        color: '#60a5fa', bg: BG.blue,
        desc: 'Solve 2×2 linear systems — substitution and elimination',
        pages: [
          {
            id: u(), title: 'x + y = 10,  x − y = 4', layout: 'graph-equation',
            steps: [
              { id: u(), funcId: 'eq-create',              inputs: { eq: 'x + y = 10' } },
              { id: u(), funcId: 'graph-plot-function',    inputs: { expr: '10 - x', id: 'f1' } },
              { id: u(), funcId: 'graph-plot-function',    inputs: { expr: 'x - 4',  id: 'f2' } },
              { id: u(), funcId: 'graph-find-intersections', inputs: { f1: 'f1', f2: 'f2' } },
            ],
          },
        ],
      },
      soon('algebraic-expressions', '🔤', 'Algebraic Expressions',
        'Building expressions, substituting a value, collecting like terms', 'beginner', '#60a5fa', BG.blue),  // sec 1-2
      soon('inequalities', '≤', 'Inequalities',
        'Solving them, and why dividing by a negative flips the sign', 'intermediate', '#60a5fa', BG.blue),    // sec 3-4
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
        id: 'trig-ratios', difficulty: 'intermediate',
        emoji: '📐', title: 'Trig Ratios — SOH CAH TOA',
        color: '#f87171', bg: BG.red,
        desc: 'sin, cos, tan in a right triangle with labeled sides',
        pages: [
          {
            id: u(), title: 'Right triangle — labeling sides', layout: 'single-geo',
            steps: [
              { id: u(), funcId: 'geo-create-polygon', inputs: { shapeId: 'tri', 'shape-type': 'right-triangle', values: '5,3,4', fillColor: '#1e3a5f', borderColor: '#60a5fa' } },
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
            ],
          },
          {
            id: u(), title: 'Finding the angle — inverse trig', layout: 'single-equation',
            steps: [
              { id: u(), funcId: 'eq-create',             inputs: { eq: '\\sin\\theta = 0.8' } },
              { id: u(), funcId: 'eq-apply-inverse-trig', inputs: { trig: 'sin' } },
            ],
          },
        ],
      },
      {
        id: 'trig-graphs', difficulty: 'advanced',
        emoji: '〰️', title: 'Graphs of sin, cos, tan',
        color: '#f87171', bg: BG.red,
        desc: 'Plot and compare the three trig functions on the same axes',
        pages: [
          {
            id: u(), title: 'Graph of sin(x)', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-2', yMax: '2' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(x)', id: 'sinf' } },
              { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'sinf', label: 'sin(x)', x0: '1.5', y0: '1.2' } },
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
            ],
          },
          {
            id: u(), title: 'Amplitude & period — A·sin(Bx)', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-3', yMax: '3' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(x)',   id: 'base' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*sin(x)', id: 'amp2' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(2*x)', id: 'per2' } },
            ],
          },
        ],
      },
      {
        id: 'unit-circle', difficulty: 'advanced',
        emoji: '🔵', title: 'The Unit Circle',
        color: '#f87171', bg: BG.red,
        desc: 'cos θ and sin θ as coordinates on a circle of radius 1',
        pages: [
          {
            id: u(), title: 'Unit circle — key angles', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-1.8', xMax: '1.8', yMin: '-1.8', yMax: '1.8' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sqrt(1-x^2)',  id: 'top' } },
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: '-sqrt(1-x^2)', id: 'bot' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '1',  y: '0',  id: 'p0',   label: '0°' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '0',  y: '1',  id: 'p90',  label: '90°' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '-1', y: '0',  id: 'p180', label: '180°' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '0',  y: '-1', id: 'p270', label: '270°' } },
            ],
          },
        ],
      },
      soon('metric-relations', '⊿', 'Metric Relations in Right Triangles',
        'The altitude to the hypotenuse, and the relations it creates', 'intermediate', '#f87171', BG.red),  // sec 3
      soon('sine-cosine-laws', '∡', 'Sine & Cosine Laws',
        'Solving any triangle, not just the right-angled ones', 'advanced', '#f87171', BG.red),              // sec 4
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
        id: 'linear-functions', difficulty: 'beginner',
        emoji: '📈', title: 'Linear Functions',
        color: '#34d399', bg: BG.green,
        desc: 'f(x) = ax + b — slope, y-intercept, and intersections',
        pages: [
          {
            id: u(), title: 'Slope and y-intercept', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 1', id: 'f1' } },
              { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f1', label: 'f(x) = 2x + 1', x0: '0.5', y0: '3' } },
              { id: u(), funcId: 'graph-add-point',     inputs: { x: '0', y: '1', id: 'yint', label: 'b = 1' } },
            ],
          },
          {
            id: u(), title: 'Intersection of two lines', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function',      inputs: { expr: '2*x + 1', id: 'f1' } },
              { id: u(), funcId: 'graph-plot-function',      inputs: { expr: '-x + 4',  id: 'f2' } },
              { id: u(), funcId: 'graph-find-intersections', inputs: { f1: 'f1', f2: 'f2' } },
            ],
          },
        ],
      },
      {
        id: 'quadratic-graphs', difficulty: 'intermediate',
        emoji: '⛰️', title: 'Quadratic Functions',
        color: '#34d399', bg: BG.green,
        desc: 'Parabolas — vertex, axis of symmetry, roots',
        pages: [
          {
            id: u(), title: 'f(x) = x² − 4x + 3', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2 - 4*x + 3', id: 'par' } },
              { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'par', label: 'x² − 4x + 3', x0: '3', y0: '2' } },
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
            ],
          },
        ],
      },
      {
        id: 'derivatives-intro', difficulty: 'advanced',
        emoji: '📉', title: 'Introduction to Derivatives',
        color: '#34d399', bg: BG.green,
        desc: 'Slope at a point, tangent line, and the derivative function',
        pages: [
          {
            id: u(), title: 'Tangent line to f(x) = x²', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2', id: 'fx' } },
              { id: u(), funcId: 'graph-tangent',       inputs: { funcId: 'fx', x0: '2', y0: '4' } },
            ],
          },
          {
            id: u(), title: 'Derivative of sin(x) is cos(x)', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-set-viewport',   inputs: { xMin: '-7', xMax: '7', yMin: '-2', yMax: '2' } },
              { id: u(), funcId: 'graph-plot-function',  inputs: { expr: 'sin(x)', id: 'sinf' } },
              { id: u(), funcId: 'graph-plot-derivative', inputs: { funcId: 'sinf' } },
            ],
          },
          {
            id: u(), title: 'Area under a curve — Riemann sum', layout: 'single-graph',
            steps: [
              { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2', id: 'fx' } },
              { id: u(), funcId: 'graph-shade-area',    inputs: { funcId: 'fx', a: '0', b: '3' } },
              { id: u(), funcId: 'graph-riemann-sum',   inputs: { funcId: 'fx', a: '0', b: '3', n: '6', method: 'midpoint' } },
            ],
          },
        ],
      },
      soon('function-basics', '🎯', 'What a Function Is',
        'Notation, domain, range, and reading a graph', 'beginner', '#34d399', BG.green),        // sec 3
      soon('exponential-functions', '🚀', 'Exponential Functions',
        'Growth and decay, and how they beat any polynomial', 'advanced', '#34d399', BG.green),  // sec 4-5
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
        id: 'polygons', difficulty: 'beginner',
        emoji: '🔷', title: 'Polygons & Angles',
        color: '#38bdf8', bg: BG.sky,
        desc: 'Interior angles, perimeter, and properties of regular polygons',
        pages: [
          {
            id: u(), title: 'Triangle — sum of angles = 180°', layout: 'single-geo',
            steps: [
              { id: u(), funcId: 'geo-create-polygon', inputs: { shapeId: 'tri', 'shape-type': 'triangle', values: '6,5,4', fillColor: '#1e3a5f', borderColor: '#38bdf8' } },
              { id: u(), funcId: 'geo-show-angles',    inputs: { shapeId: 'tri', color: '#fbbf24' } },
            ],
          },
          {
            id: u(), title: 'Rectangle — perimeter & area', layout: 'geo-equation',
            steps: [
              { id: u(), funcId: 'geo-create-polygon', inputs: { shapeId: 'rect', 'shape-type': 'rectangle', values: '8,4', fillColor: '#1e3a5f', borderColor: '#60a5fa' } },
              { id: u(), funcId: 'geo-label-sides',    inputs: { shapeId: 'rect', labels: '8,4,8,4' } },
              { id: u(), funcId: 'eq-create',          inputs: { eq: 'P = 2(l + w) = 2(8 + 4) = 24' } },
            ],
          },
        ],
      },
      {
        id: 'pythagoras', difficulty: 'beginner',
        emoji: '📐', title: 'Pythagorean Theorem',
        color: '#38bdf8', bg: BG.sky,
        desc: 'a² + b² = c² — proof and applications in right triangles',
        pages: [
          {
            id: u(), title: 'a² + b² = c²', layout: 'geo-equation',
            steps: [
              { id: u(), funcId: 'geo-create-polygon',  inputs: { shapeId: 'tri', 'shape-type': 'right-triangle', values: '5,3,4', fillColor: '#1e3a5f', borderColor: '#fbbf24' } },
              { id: u(), funcId: 'geo-label-sides',     inputs: { shapeId: 'tri', labels: 'a=3,b=4,c=?' } },
              { id: u(), funcId: 'eq-create',           inputs: { eq: 'a^2 + b^2 = c^2' } },
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
              { id: u(), funcId: 'eq-racine-des-bords', inputs: { eq: 'b^2 = 144' } },
            ],
          },
        ],
      },
      soon('area-volume', '📦', 'Area, Perimeter & Volume',
        'Plane figures, then prisms, cylinders and pyramids', 'beginner', '#38bdf8', BG.sky),        // sec 1-2
      soon('similar-figures', '🔍', 'Similar & Congruent Figures',
        'Scale factor, and what it does to lengths, areas and volumes', 'intermediate', '#38bdf8', BG.sky), // sec 2-3
      soon('analytic-geometry', '🧭', 'Analytic Geometry',
        'Distance, midpoint and slope between two points', 'intermediate', '#38bdf8', BG.sky),       // sec 4
    ],
  },

  /* ── Statistics & Probability ─────────────────────────────────────────────── */
  {
    id: 'stats',
    label: 'Statistics & Probability',
    sublabel: 'Data, chance & correlation',
    color: '#a78bfa',
    lessons: [
      soon('stats-data', '📊', 'Data, Graphs & Averages',
        'Mean, median, mode, and choosing the right graph', 'beginner', '#a78bfa', BG.purple),        // sec 1-2
      soon('probability-basics', '🎲', 'Probability Basics',
        'Counting outcomes, and independent vs dependent events', 'beginner', '#a78bfa', BG.purple),  // sec 2-3
      soon('scatter-correlation', '✳️', 'Scatter Plots & Correlation',
        'Reading a cloud of points and fitting a line through it', 'intermediate', '#a78bfa', BG.purple), // sec 3-4
    ],
  },
]

// Each shelf reads easiest to hardest. Sorted here rather than by hand-ordering
// the arrays above, so adding a lesson anywhere in a category lands it in the
// right place on its own.
const RANK = { beginner: 0, intermediate: 1, advanced: 2 }
for (const grade of LESSON_GRADES) {
  grade.lessons.sort((a, b) => (RANK[a.difficulty] ?? 0) - (RANK[b.difficulty] ?? 0))
}

export const BUILTIN_LESSONS = LESSON_GRADES.flatMap(g => g.lessons.filter(l => !l.comingSoon))
