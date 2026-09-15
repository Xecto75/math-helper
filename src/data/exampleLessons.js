let _id = 0
const u = () => `ex${++_id}`

export const EXAMPLE_LESSONS = [

  /* ─── 1. Linear Equation ─────────────────────────────────────── */
  {
    id: 'linear-eq',
    emoji: '⚖️',
    title: 'Solving an Equation',
    desc: 'Isolate x in an equation — distribute, send terms across, divide. Equation panel only, no graph, no function',
    color: '#60a5fa',
    pages: [
      {
        id: u(), title: 'Automatic solve: 4(x + 2) − 3 = 2x + 9', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',     inputs: { eq: '4(x + 2) - 3 = 2x + 9' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Solve: 2(x − 3) = x + 1', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',          inputs: { eq: '2(x - 3) = x + 1' } },
          { id: u(), funcId: 'eq-distribute',       inputs: { eq: '2(x - 3)' } },
          { id: u(), funcId: 'eq-send-other-side',  inputs: { term: '-6' } },
          { id: u(), funcId: 'eq-send-other-side',  inputs: { term: 'x' } },
          { id: u(), funcId: 'eq-combine',          inputs: {} },
        ],
      },
    ],
  },

  /* ─── 2. Quadratic Equation ──────────────────────────────────── */
  {
    id: 'quadratic-eq',
    emoji: '📉',
    title: 'Quadratic Equation',
    desc: 'Discriminant Δ = b² − 4ac and the quadratic formula',
    color: '#a78bfa',
    pages: [
      /* Page 1 — concept + formula */
      {
        id: u(), title: 'The Quadratic Formula', layout: 'text-equation',
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
            content: '$\\Delta > 0$ → two real solutions|$\\Delta = 0$ → one solution (double)|$\\Delta < 0$ → no real solution',
            isList: 'true', color: 'green',
          }},
        ],
      },
      /* Page 2 — solve x² − 5x + 6 = 0 */
      {
        id: u(), title: 'Solve: x² − 5x + 6 = 0', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'eq-create',        inputs: { eq: 'x^2 - 5x + 6 = 0' } },
          { id: u(), funcId: 'quadratic-solve',  inputs: {} },
        ],
      },
      /* Page 3 — solve 2x² + 3x − 2 = 0 */
      {
        id: u(), title: 'Solve: 2x² + 3x − 2 = 0', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'eq-create',        inputs: { eq: '2x^2 + 3x - 2 = 0' } },
          { id: u(), funcId: 'quadratic-solve',  inputs: {} },
        ],
      },
    ],
  },

  /* ─── 3. System by Substitution ─────────────────────────────── */
  {
    id: 'substitution',
    emoji: '🔄',
    title: 'System by Substitution',
    desc: 'Solve {2x+y=5, x-y=1} step by step — one page per step, method overview first',
    color: '#34d399',
    pages: [
      /* Page 1 — overview: what the method is + the 5-step roadmap. Uses the
         equation panel for real (equation 1, live) instead of leaving it
         empty next to the text panel. */
      {
        id: u(), title: 'The Substitution Method', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'what', title: 'What is it?',
            content: 'A way to solve a system of two equations in two unknowns — reduce it down to ONE equation in ONE unknown, solve that, then back-substitute.|Equation 2: $x - y = 1$ (equation 1 is on the right, live).',
            isList: 'true',
          }},
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'roadmap', title: 'The 5 steps', color: 'purple',
            content: 'Define the two equations|Isolate a common variable in one of the equations|Substitute the result in the second equation|Resolve the equation|Replace the value found in the first equation',
            isList: 'true',
          }},
          { id: u(), funcId: 'eq-create', inputs: { eq: '2x + y = 5' } },
        ],
      },
      /* Page 2 — Step 1 */
      {
        id: u(), title: 'Step 1 — Define the Two Equations', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'eq2', title: 'Equation 2',
            content: 'x − y = 1',
            isList: 'false',
          }},
          { id: u(), funcId: 'eq-create', inputs: { eq: '2x + y = 5' } },
        ],
      },
      /* Page 3 — Step 2 */
      {
        id: u(), title: 'Step 2 — Isolate a Common Variable', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',          inputs: { eq: '2x + y = 5' } },
          { id: u(), funcId: 'eq-send-other-side', inputs: { term: '0' } },
        ],
      },
      /* Page 4 — Step 3. Show the ORIGINAL 2nd equation first, then the same
         equation again with y replaced by (5 - 2x) — a clear before/after
         instead of jumping straight to the substituted form. */
      {
        id: u(), title: 'Step 3 — Substitute Into the Second Equation', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create', inputs: { eq: 'x - y = 1' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: 'x - (5 - 2x) = 1' } },
        ],
      },
      /* Page 5 — Step 4 */
      {
        id: u(), title: 'Step 4 — Resolve the Equation', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',     inputs: { eq: 'x - (5 - 2x) = 1' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      /* Page 6 — Step 5 — replace + verify graphically */
      {
        id: u(), title: 'Step 5 — Replace the Value in the First Equation', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'eq-create',                 inputs: { eq: 'y = 5 - 2*2' } },
          { id: u(), funcId: 'eq-full-solve',              inputs: {} },
          { id: u(), funcId: 'graph-plot-function',       inputs: { expr: '5 - 2x', id: 'f1' } },
          { id: u(), funcId: 'graph-plot-function',       inputs: { expr: 'x - 1',  id: 'f2' } },
          { id: u(), funcId: 'graph-add-point',           inputs: { x: '2', y: '1', id: 'sol', label: 'Solution', showCoords: 'true' } },
          { id: u(), funcId: 'graph-show-projection',     inputs: { pointId: 'sol', showValues: 'true' } },
        ],
      },
    ],
  },

  /* ─── 4. Law of Sines ─────────────────────────────────────────── */
  {
    id: 'law-of-sines',
    emoji: '📐',
    title: 'Law of Sines',
    desc: 'a/sinA = b/sinB = c/sinC — find a side or an angle',
    color: '#f87171',
    pages: [
      {
        id: u(), title: 'The Triangle — Sides and Angles', layout: 'text-geo',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',   inputs: { id: 'tri', type: 'triangle', a: '5', b: '7', c: '9', color: 'blue' } },
          { id: u(), funcId: 'geo3d-set-view',    inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-show-angles', inputs: { id: 'tri', color: 'yellow' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 'tri', labels: 'a=5,b=7,c=9' } },
          // Angle A is opposite side a by convention — for this triangle's own
          // vertex numbering that's vertex 2 (vertex 0 → opposite b, vertex 1 →
          // opposite c), verified live against the actual computed degrees.
          { id: u(), funcId: 'cmt-geo', inputs: { text: 'A={{[tri]a2}}°', shapeId: 'tri', vertexIndex: '2', color: 'orange' } },
          { id: u(), funcId: 'cmt-geo', inputs: { text: 'B={{[tri]a0}}°', shapeId: 'tri', vertexIndex: '0', color: 'orange' } },
          { id: u(), funcId: 'cmt-geo', inputs: { text: 'C={{[tri]a1}}°', shapeId: 'tri', vertexIndex: '1', color: 'orange' } },
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'sines', title: 'The Law of Sines',
            content: 'Every side, divided by the sine of the angle facing it, gives the same number:|$$\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}$$|$$\\dfrac{5}{\\sin([tri]a2^\\circ)} = \\dfrac{7}{\\sin([tri]a0^\\circ)} = \\dfrac{9}{\\sin([tri]a1^\\circ)} = {{ 5/sin([tri]a2 deg) }}$$',
            isList: 'false',
          }},
        ],
      },
      {
        id: u(), title: 'Find b: a=7, A=60°, B=45°', layout: 'geo-equation',
        steps: [
          // b/c aren't 5.7/7.8 by coincidence — they're the exact law-of-sines
          // solution for a=7,A=60°,B=45° (computed once, not re-derived here)
          // so the shape's OWN live vertex angles read back as a clean 45°/60°,
          // letting the equation below reference them instead of retyping
          // "45"/"60" as bare numbers that could silently drift from the shape.
          { id: u(), funcId: 'geo3d-create-2d',   inputs: { id: 'tri2', type: 'triangle', a: '7', b: '5.715476', c: '7.807486', color: 'purple' } },
          { id: u(), funcId: 'geo3d-set-view',    inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-show-angles', inputs: { id: 'tri2', color: 'yellow' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 'tri2', labels: 'a=7,b=?,c=7.8' } },
          { id: u(), funcId: 'eq-create',         inputs: { eq: 'b = [tri2]0 * sin([tri2]a0) / sin([tri2]a2)' } },
          { id: u(), funcId: 'eq-full-solve',     inputs: {} },
        ],
      },
    ],
  },

  /* ─── 5. Pythagorean Theorem ─────────────────────────────────────────── */
  {
    id: 'pythagoras',
    emoji: '📐',
    title: 'Pythagorean Theorem',
    desc: 'a² + b² = c² — find the hypotenuse or a missing side',
    color: '#fbbf24',
    pages: [
      {
        id: u(), title: 'a² + b² = c²', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',    inputs: { id: 'tri', type: 'right-triangle', a: '3', b: '4', color: 'blue' } },
          { id: u(), funcId: 'geo3d-set-view',     inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-label-sides',  inputs: { id: 'tri', labels: 'a=3,b=4,c=?' } },
          { id: u(), funcId: 'eq-create',          inputs: { eq: 'a^2 + b^2 = c^2' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_a: '3', var_b: '4' } },
        ],
      },
      {
        id: u(), title: 'Find the missing side', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',    inputs: { id: 'tri', type: 'right-triangle', a: '5', b: '12', color: 'purple' } },
          { id: u(), funcId: 'geo3d-set-view',     inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-label-sides',  inputs: { id: 'tri', labels: 'a=5,b=?,c=13' } },
          { id: u(), funcId: 'eq-create',          inputs: { eq: '5^2 + b^2 = 13^2' } },
          { id: u(), funcId: 'eq-send-other-side', inputs: { term: '5^2' } },
        ],
      },
    ],
  },

  /* ─── 6. Various Areas ────────────────────────────────────────── */
  {
    id: 'areas',
    emoji: '🔷',
    title: 'Various Areas',
    desc: 'Trapezoid A=(B+b)h/2, circle A=πr² — formulas and calculations',
    color: '#10b981',
    pages: [
      {
        id: u(), title: 'Area of a Trapezoid', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',       inputs: { id: 'trap', type: 'trapeze', a: '6', b: '4', c: '3', color: 'teal' } },
          { id: u(), funcId: 'geo3d-set-view',        inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo-show-area-measures', inputs: { shapeId: 'trap', color: '' } },
          { id: u(), funcId: 'cmt-free', inputs: {
            cmtId: '', title: 'Area of Trapezoid',
            text: '$A = \\dfrac{(B + b) \\cdot h}{2}$', side: 'right', color: '',
          }},
          { id: u(), funcId: 'eq-create',           inputs: { eq: '|A| = (|B| + |b|) * |h| / 2' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_B: '6', var_b: '4', var_h: '3' } },
          { id: u(), funcId: 'eq-full-solve',       inputs: {} },
        ],
      },
      {
        id: u(), title: 'Area of a Circle', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',       inputs: { id: 'circ', type: 'circle', a: '4', color: 'orange' } },
          { id: u(), funcId: 'geo3d-set-view',        inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo-show-area-measures', inputs: { shapeId: 'circ', color: '' } },
          { id: u(), funcId: 'cmt-free', inputs: {
            cmtId: '', title: 'Area of Circle',
            text: '$A = \\pi r^2$', side: 'right', color: '',
          }},
          { id: u(), funcId: 'eq-create',           inputs: { eq: '|A| = pi * |r|^2' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_r: '[circ]r' } },
          { id: u(), funcId: 'eq-full-solve',       inputs: {} },
        ],
      },
    ],
  },

  /* ─── 7. Various Volumes ───────────────────────────────────────────── */
  {
    id: 'volumes',
    emoji: '📦',
    title: 'Various Volumes',
    desc: 'Prism V=lwh, cylinder V=πr²h — formulas and calculations',
    color: '#f59e0b',
    pages: [
      {
        id: u(), title: 'Volume of a Rectangular Prism', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create',              inputs: { id: 'prism', type: 'rectangular-prism', a: '5', b: '3', c: '4', color: 'blue' } },
          { id: u(), funcId: 'geo3d-set-view',             inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'prism' } },
          { id: u(), funcId: 'eq-create',                  inputs: { eq: 'V = |l| * |h| * |d|' } },
          { id: u(), funcId: 'eq-replace-variable',        inputs: { var_l: '5', var_h: '3', var_d: '4' } },
          { id: u(), funcId: 'eq-full-solve',              inputs: {} },
        ],
      },
      {
        id: u(), title: 'Volume of a Cylinder', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create',              inputs: { id: 'cyl', type: 'cylinder', a: '3', b: '5', color: 'orange' } },
          { id: u(), funcId: 'geo3d-set-view',             inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'cyl' } },
          { id: u(), funcId: 'eq-create',                  inputs: { eq: 'V = pi * |r|^2 * |h|' } },
          { id: u(), funcId: 'eq-replace-variable',        inputs: { var_r: '3', var_h: '5' } },
          { id: u(), funcId: 'eq-full-solve',              inputs: {} },
        ],
      },
    ],
  },

  /* ─── 8. Perimeter ─────────────────────────────────────────────── */
  {
    id: 'perimeters',
    emoji: '📏',
    title: 'Perimeter',
    desc: 'Trapezoid P=sum of sides, circle C=2πr — formulas',
    color: '#06b6d4',
    pages: [
      {
        id: u(), title: 'Perimeter of a Trapezoid', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',   inputs: { id: 'trap', type: 'trapeze', a: '8', b: '5', c: '4', color: 'cyan' } },
          { id: u(), funcId: 'geo3d-set-view',    inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 'trap' } },
          { id: u(), funcId: 'eq-create',         inputs: { eq: 'P = a + b + c + d' } },
        ],
      },
      {
        id: u(), title: 'Circumference of a Circle', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',    inputs: { id: 'circ', type: 'circle', a: '3', color: 'pink' } },
          { id: u(), funcId: 'geo3d-set-view',     inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-label-sides',  inputs: { id: 'circ', labels: 'r=3' } },
          { id: u(), funcId: 'eq-create',          inputs: { eq: 'C = 2 * pi * r' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_r: '3' } },
        ],
      },
    ],
  },

  /* ─── 9. SOH CAH TOA ───────────────────────────────────────────── */
  {
    id: 'soh-cah-toa',
    emoji: '📐',
    title: 'Trigonometry SOH CAH TOA',
    desc: 'sin, cos, tan in a right triangle — definitions and inverse',
    color: '#fb923c',
    pages: [
      {
        id: u(), title: 'SOH — Sine', layout: 'text-geo',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',        inputs: { id: 'tri', type: 'right-triangle', a: '3', b: '4', c: '', color: 'blue' } },
          { id: u(), funcId: 'geo3d-set-view',         inputs: { zoom: '2', panX: '0', panY: '0', distance: '', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-highlight-angle',  inputs: { id: 'tri', angleIndex: '0', color: 'yellow' } },
          { id: u(), funcId: 'cmt-geo',                inputs: { cmtId: '', text: 'θ', shapeId: 'tri', vertexIndex: '0', color: 'yellow' } },
          { id: u(), funcId: 'geo3d-highlight-edge',   inputs: { id: 'tri', edgeIndex: '2', color: 'purple' } },
          { id: u(), funcId: 'cmt-geo-edge',           inputs: { cmtId: '', text: 'Hypotenuse', shapeId: 'tri', edgeIndex: '2', color: 'purple' } },
          { id: u(), funcId: 'geo3d-show-arrow',       inputs: { id: 'tri', arrowId: 'arr1', from: 'v0', to: 'e1', color: 'orange' } },
          { id: u(), funcId: 'geo3d-highlight-edge',   inputs: { id: 'tri', edgeIndex: '1', color: 'orange' } },
          { id: u(), funcId: 'cmt-geo-edge',           inputs: { cmtId: '', text: 'Opposite', shapeId: 'tri', edgeIndex: '1', color: 'orange' } },
          { id: u(), funcId: 'geo3d-remove-arrow',     inputs: { id: 'tri', arrowId: 'arr1' } },
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'formula', title: 'Sine — SOH',
            content: '$\\sin(\\clr{yellow}{\\theta}) = \\dfrac{\\clr{orange}{\\text{Opposite}}}{\\clr{purple}{\\text{Hypotenuse}}}$',
            isList: 'false',
          }},
        ],
      },
      {
        id: u(), title: 'SOH — Sine example', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',        inputs: { id: 'tri', type: 'right-triangle', a: '3', b: '4', c: '', color: 'blue' } },
          { id: u(), funcId: 'geo3d-label-sides',      inputs: { id: 'tri', labels: '' } },
          { id: u(), funcId: 'geo3d-highlight-angle',  inputs: { id: 'tri', angleIndex: '0', color: 'yellow' } },
          { id: u(), funcId: 'cmt-geo',                inputs: { cmtId: 'angle', text: 'θ', shapeId: 'tri', vertexIndex: '0', color: 'yellow' } },
          { id: u(), funcId: 'geo3d-highlight-edge',   inputs: { id: 'tri', edgeIndex: '2', color: 'purple' } },
          { id: u(), funcId: 'cmt-geo-edge',           inputs: { cmtId: '', text: 'Hypotenuse', shapeId: 'tri', edgeIndex: '2', color: 'purple' } },
          { id: u(), funcId: 'geo3d-show-arrow',       inputs: { id: 'tri', arrowId: 'arr1', from: 'v0', to: 'e1', color: 'orange' } },
          { id: u(), funcId: 'geo3d-highlight-edge',   inputs: { id: 'tri', edgeIndex: '1', color: 'orange' } },
          { id: u(), funcId: 'cmt-geo-edge',           inputs: { cmtId: '', text: 'Opposite', shapeId: 'tri', edgeIndex: '1', color: 'orange' } },
          { id: u(), funcId: 'geo3d-remove-arrow',     inputs: { id: 'tri', arrowId: 'arr1' } },
          { id: u(), funcId: 'eq-create',              inputs: { eq: '|Opposite|{orange}/|Hypothenuse|{purple} = sin(|θ|{yellow})' } },
          { id: u(), funcId: 'eq-replace-variable',    inputs: { var_Opposite: '4', var_Hypothenuse: '5' } },
          { id: u(), funcId: 'eq-apply-inverse-trig',  inputs: { trig: 'sin' } },
          { id: u(), funcId: 'cmt-update',              inputs: { cmtId: 'angle', text: '[eq-result]°' } },
        ],
      },
    ],
  },

  /* ─── 10. Lines — Slope and Intercept ──────────────────────────── */
  {
    id: 'linear-functions',
    emoji: '📈',
    title: 'Linear Function — Slope and Intercept',
    desc: 'What a linear function IS: f(x) = mx + b drawn on the graph, reading slope and intercept, finding m and b from two points',
    color: '#4ade80',
    pages: [
      {
        id: u(), title: 'f(x) = mx + b — drag to explore', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Slope and y-intercept',
            content: '$m$ is the slope: $+m$ for every $+1$ in $x$.|$b$ is the y-intercept — where the line crosses the $y$-axis.',
            isList: 'true',
          }},
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '|m|*x+|b|', id: 'explore', hideLabel: '1' } },
        ],
      },
      /* Page 2 — what the slope actually MEANS: rise over run, read straight
         off the graph. This is the concept page 3's formula comes from, so
         the formula there is recognised instead of appearing from nowhere. */
      {
        id: u(), title: 'What the slope means — rise over run', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'riserun', title: 'Slope = rise ÷ run',
            content: 'Pick any two points on the line.|**Run** — how far you move across in $x$.|**Rise** — how far you move up in $y$.|The slope is $m = \\dfrac{\\text{rise}}{\\text{run}}$ — and it is the same wherever you measure it.',
            isList: 'true',
          }},
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-1', xMax: '6', yMin: '-1', yMax: '11' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 1', id: 'f1' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f1', label: 'y = 2x + 1' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '1', y: '3', id: 'pA', label: 'A(1, 3)' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '4', y: '9', id: 'pB', label: 'B(4, 9)' } },
          { id: u(), funcId: 'graph-add-segment',   inputs: { x1: '1', y1: '3', x2: '4', y2: '3', id: 'run',  color: 'orange' } },
          { id: u(), funcId: 'cmt-graph',           inputs: { text: 'run = 3', x: '2.5', y: '2.2', color: 'orange' } },
          { id: u(), funcId: 'graph-add-segment',   inputs: { x1: '4', y1: '3', x2: '4', y2: '9', id: 'rise', color: 'green' } },
          { id: u(), funcId: 'cmt-graph',           inputs: { text: 'rise = 6', x: '4.7', y: '6', color: 'green' } },
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'riseruncalc', title: 'Here',
            content: '$m = \\dfrac{6}{3} = 2$ — the line climbs $2$ for every $1$ across.',
            isList: 'false',
          }},
        ],
      },
      /* Page 3 — the full derivation, every step shown rather than computed
         inline: slope formula → substitute → solve → y = mx + b → substitute
         m → substitute a known point → solve for b → plot the result. */
      {
        id: u(), title: 'Find the equation from two points', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'given', title: 'Given two points',
            content: '$A(1,\\ 3)$ and $B(4,\\ 9)$|Goal: find $y = mx + b$ passing through both.',
            isList: 'false',
          }},
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'method', title: 'The method',
            content: 'Find the slope $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$|Write $y = mx + b$ and put $m$ in|Substitute one known point for $x$ and $y$|Solve — the only unknown left is $b$',
            isList: 'steps',
          }},

          /* Step 1 — the slope, from the formula out */
          { id: u(), funcId: 'eq-create',           inputs: { eq: '|m| = (|y2| - |y1|) / (|x2| - |x1|)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_y2: '9', var_y1: '3', var_x2: '4', var_x1: '1' } },
          { id: u(), funcId: 'eq-full-solve',       inputs: {} },
          { id: u(), funcId: 'eq-save-result',      inputs: { name: 'm' } },

          /* Step 2 — y = mx + b, slope in, then a known point in */
          { id: u(), funcId: 'eq-create',           inputs: { eq: '|y| = |m| * |x| + |b|' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_m: '[m]v' } },
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'why', title: 'Why a known point?',
            content: '$A$ is ON the line, so $x=1,\\ y=3$ must satisfy $y = 2x + b$ — leaving $b$ as the only unknown.',
            isList: 'false',
          }},
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_y: '3', var_x: '1' } },
          { id: u(), funcId: 'eq-full-solve',       inputs: {} },
          { id: u(), funcId: 'eq-save-result',      inputs: { name: 'b' } },

          /* Step 3 — the answer, then see it. The working notes come down so
             the graph gets the room; the givens stay as the reference. */
          { id: u(), funcId: 'text-remove',         inputs: { boxId: 'method' } },
          { id: u(), funcId: 'text-remove',         inputs: { boxId: 'why' } },
          { id: u(), funcId: 'set-layout',          inputs: { mode: 'text-graph' } },
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'result', title: 'The equation',
            content: '$m = 2$ and $b = 1$, so $y = 2x + 1$.',
            isList: 'false',
          }},
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-1', xMax: '6', yMin: '-1', yMax: '11' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '1', y: '3', id: 'pA', label: 'A(1, 3)' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '4', y: '9', id: 'pB', label: 'B(4, 9)' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 1', id: 'line' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'line', label: 'y = 2x + 1' } },
        ],
      },
    ],
  },

  /* ─── 11. Unit Circle ───────────────────────────────── */
  {
    id: 'unit-circle',
    emoji: '🔵',
    title: 'Unit Circle',
    desc: 'x = cos θ, y = sin θ — cardinal angles and 30/45/60° angles',
    color: '#60a5fa',
    pages: [
      {
        id: u(), title: 'The Unit Circle', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Unit Circle',
            content: 'Circle of radius $1$ centered at the origin.|For an angle $\\theta$: $x = \\cos\\theta$ and $y = \\sin\\theta$.',
            isList: 'true',
          }},
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-1.8', xMax: '1.8', yMin: '-1.8', yMax: '1.8' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sqrt(1-x^2)',  id: 'top' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '-sqrt(1-x^2)', id: 'bot' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '1',  y: '0',  id: 'p0',   label: '0°' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0',  y: '1',  id: 'p90',  label: '90°' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '-1', y: '0',  id: 'p180', label: '180°' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0',  y: '-1', id: 'p270', label: '270°' } },
        ],
      },
      {
        id: u(), title: 'Special Angles — 30°, 45°, 60°', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'vals', title: 'Special Values',
            content: '$30°$ → $(\\frac{\\sqrt3}{2}, \\frac12)$|$45°$ → $(\\frac{\\sqrt2}{2}, \\frac{\\sqrt2}{2})$|$60°$ → $(\\frac12, \\frac{\\sqrt3}{2})$',
            isList: 'true',
          }},
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-1.8', xMax: '1.8', yMin: '-1.8', yMax: '1.8' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sqrt(1-x^2)',  id: 'top' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '-sqrt(1-x^2)', id: 'bot' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0.866', y: '0.5',   id: 'p30', label: '30°' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0.707', y: '0.707', id: 'p45', label: '45°' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0.5',   y: '0.866', id: 'p60', label: '60°' } },
        ],
      },
    ],
  },

  /* ─── 12. Parabola Function ─────────────────────────────────────── */
  {
    id: 'parabola',
    emoji: '🔼',
    title: 'Parabola Function',
    desc: 'f(x) = ax²+bx+c — roots, vertex, and axis of symmetry',
    color: '#f472b6',
    pages: [
      {
        id: u(), title: 'f(x) = ax² + bx + c — drag to explore', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'The parameters a, b, and c',
            content: '$a$ controls how wide the parabola is, and whether it opens upward ($a>0$) or downward ($a<0$).|$b$ shifts the vertex left or right (together with $a$).|$c$ is the y-intercept — where the parabola crosses the $y$-axis.',
            isList: 'true',
          }},
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '|a|*x^2+|b|*x+|c|', id: 'explore', hideLabel: '1' } },
        ],
      },
      {
        // Every claim here has an actual matching visual — no side paragraph
        // to read instead of looking at the graph. markRoots already draws
        // its own "x = 1" / "x = 3" labels at the roots; the axis of symmetry
        // used to only be DESCRIBED in text with no line ever drawn — now
        // it's a real vertical segment with a two-word tag, nothing more.
        id: u(), title: 'Key Features — Roots, Vertex, Axis of Symmetry', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-2', xMax: '6', yMin: '-3', yMax: '6' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2 - 4*x + 3', id: 'par' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'par', label: 'x² − 4x + 3', x0: '4', y0: '4.5' } },
          { id: u(), funcId: 'graph-mark-roots',    inputs: { funcId: 'par' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '2', y: '-1', id: 'vert', label: 'Vertex (2, −1)', showCoords: 'true' } },
          { id: u(), funcId: 'graph-add-segment',   inputs: { x1: '2', y1: '-3', x2: '2', y2: '6', id: 'axis', color: 'purple' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Axis of symmetry', x: '2', y: '5.5', color: 'purple' } },
        ],
      },
    ],
  },

  /* ─── 13. Exponential Function ───────────────────────────────── */
  {
    id: 'exponential',
    emoji: '🚀',
    title: 'Exponential Function',
    desc: 'f(x) = a·bˣ + k — growth, decay, and the horizontal asymptote',
    color: '#fb923c',
    pages: [
      {
        id: u(), title: 'f(x) = a·bˣ + k — drag to explore', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'The parameters a, b, and k',
            content: '$a$ stretches the curve vertically (its value at $x=0$ is $a+k$).|$b$ is the growth factor: $b>1$ means growth, $0<b<1$ means decay ($b$ must stay positive).|$k$ shifts the curve up or down — it moves the horizontal asymptote to $y=k$.',
            isList: 'true',
          }},
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-3', xMax: '5', yMin: '-5', yMax: '20' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '|a|*|b|^x+|k|', id: 'explore', hideLabel: '1' } },
        ],
      },
      {
        id: u(), title: 'Key Features — Asymptote and Y-Intercept', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-3', xMax: '5', yMin: '-6', yMax: '10' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2^x - 3', id: 'exp' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'exp', label: 'f(x) = 2ˣ − 3', x0: '2', y0: '3' } },
          { id: u(), funcId: 'graph-horizontal-line', inputs: { y: '-3' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Asymptote y = −3', x: '2.5', y: '-3.6', color: 'gray' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0', y: '-2', id: 'yint', label: 'Y-intercept (0, −2)', showCoords: 'true' } },
        ],
      },
    ],
  },

  /* ─── 14. Types of Two Lines ────────────────────────────────────── */
  {
    id: 'line-types',
    emoji: '✏️',
    title: 'Types of Two Lines',
    desc: 'Parallel (same slope), intersecting — finding the intersection',
    color: '#6ee7b7',
    pages: [
      {
        id: u(), title: 'Parallel Lines — Same Slope', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Parallel Lines',
            content: 'Two lines with the same slope never cross.',
            isList: 'false',
          }},
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 1', id: 'f1' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x - 2', id: 'f2' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f1', label: 'f₁ = 2x+1', x0: '0.5', y0: '3' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f2', label: 'f₂ = 2x−2', x0: '0.5', y0: '-1' } },
        ],
      },
      {
        id: u(), title: 'Intersecting Lines — Finding the Intersection', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function',      inputs: { expr: '2*x + 1', id: 'f1' } },
          { id: u(), funcId: 'graph-plot-function',      inputs: { expr: '-x + 4',  id: 'f2' } },
          { id: u(), funcId: 'graph-find-intersections', inputs: { f1: 'f1', f2: 'f2' } },
          { id: u(), funcId: 'eq-create',                inputs: { eq: '2x + 1 = -x + 4' } },
          { id: u(), funcId: 'eq-send-other-side',       inputs: { term: '+1' } },
          { id: u(), funcId: 'eq-send-other-side',       inputs: { term: '-x' } },
          { id: u(), funcId: 'eq-combine',               inputs: {} },
          { id: u(), funcId: 'eq-divide',                inputs: { divisor: '3' } },
        ],
      },
    ],
  },

  /* ─── 15. Correlation ───────────────────────────────────────────── */
  {
    id: 'correlation',
    emoji: '📊',
    title: 'Correlation',
    desc: 'Scatter plot and coefficient r — the link between two variables',
    color: '#eab308',
    pages: [
      {
        id: u(), title: 'What is Correlation?', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Correlation',
            content: 'Correlation measures the link between two variables.|Positive correlation: as $x$ increases, $y$ increases too.|Negative correlation: as $x$ increases, $y$ decreases.|No correlation: no clear link between the two.',
            isList: 'true',
          }},
          { id: u(), funcId: 'tab-create-grid', inputs: {
            gridId: 'etude1', cols: '2', rows: '7',
            headerRow: 'true', headerCol: 'false',
            values: 'x (study hours),y (score %)|1,55|2,62|3,68|4,75|5,82|6,90',
          }},
        ],
      },
      {
        id: u(), title: 'Scatter Plot — Positive Trend', layout: 'grid-graph',
        steps: [
          { id: u(), funcId: 'tab-create-grid', inputs: {
            gridId: 'etude2', cols: '2', rows: '7',
            headerRow: 'true', headerCol: 'false',
            values: 'x (study hours),y (score %)|1,55|2,62|3,68|4,75|5,82|6,90',
          }},
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '0', xMax: '8', yMin: '0', yMax: '100' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '1', y: '55', id: 'p1' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '2', y: '62', id: 'p2' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '3', y: '68', id: 'p3' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '4', y: '75', id: 'p4' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '5', y: '82', id: 'p5' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '6', y: '90', id: 'p6' } },
        ],
      },
      {
        id: u(), title: 'The Correlation Coefficient r', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'formula', title: 'Coefficient r',
            content: '$r = \\dfrac{\\sum (x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2 \\sum (y_i-\\bar{y})^2}}$|$r$ is always between $-1$ and $1$.',
            isList: 'true',
          }},
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'interp', title: 'Interpretation',
            content: '$r$ close to $1$: strong positive correlation|$r$ close to $-1$: strong negative correlation|$r$ close to $0$: no correlation',
            isList: 'true',
          }},
          { id: u(), funcId: 'tab-create-grid', inputs: {
            gridId: 'etude3', cols: '2', rows: '7',
            headerRow: 'true', headerCol: 'false',
            values: 'x (study hours),y (score %)|1,55|2,62|3,68|4,75|5,82|6,90',
          }},
          // Switch to table + equation once the formula's been introduced —
          // everything from here plugs the real data into it, row by row.
          { id: u(), funcId: 'set-layout', inputs: { mode: 'grid-equation' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(1+2+3+4+5+6)/6 = 3.5' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(55+62+68+75+82+90)/6 = 72' } },
          { id: u(), funcId: 'tab-highlight-row', inputs: { gridId: 'etude3', rowIndex: '1' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(1-3.5)*(55-72) = 42.5' } },
          { id: u(), funcId: 'tab-highlight-row', inputs: { gridId: 'etude3', rowIndex: '2' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(2-3.5)*(62-72) = 15' } },
          { id: u(), funcId: 'tab-highlight-row', inputs: { gridId: 'etude3', rowIndex: '3' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(3-3.5)*(68-72) = 2' } },
          { id: u(), funcId: 'tab-highlight-row', inputs: { gridId: 'etude3', rowIndex: '4' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(4-3.5)*(75-72) = 1.5' } },
          { id: u(), funcId: 'tab-highlight-row', inputs: { gridId: 'etude3', rowIndex: '5' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(5-3.5)*(82-72) = 15' } },
          { id: u(), funcId: 'tab-highlight-row', inputs: { gridId: 'etude3', rowIndex: '6' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(6-3.5)*(90-72) = 45' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '42.5+15+2+1.5+15+45 = 121' } },
          { id: u(), funcId: 'tab-clear-row-highlight', inputs: { gridId: 'etude3' } },
          { id: u(), funcId: 'cmt-free', inputs: {
            cmtId: '', title: '',
            text: '$\\sum(x_i-\\bar{x})^2 = 17.5, \\ \\sum(y_i-\\bar{y})^2 = 838$',
            side: 'left', color: '',
          }},
          { id: u(), funcId: 'eq-create', inputs: { eq: 'r = 121/121.099' } },
          { id: u(), funcId: 'cmt-free', inputs: {
            cmtId: '', title: '',
            text: 'r ≈ 0.999 → very strong positive correlation',
            side: 'right', color: 'green',
          }},
        ],
      },
    ],
  },

  /* ─── 18. Unit Conversion ─────────────────────────── */
  {
    id: 'unit-conversion',
    emoji: '🧮',
    title: 'Unit Conversion',
    desc: 'km, hm, dam, m, dm, cm, mm — and area units (km²)',
    color: '#84cc16',
    pages: [
      {
        id: u(), title: 'Length Units', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Length Units',
            content: 'Each unit is worth 10 times the next.|To convert, move the decimal point one position per unit.',
            isList: 'true',
          }},
          { id: u(), funcId: 'tab-create-grid', inputs: {
            gridId: 'longueur1', cols: '7', rows: '2',
            headerRow: 'true', headerCol: 'false',
            values: 'km,hm,dam,m,dm,cm,mm|1000,100,10,1,0.1,0.01,0.001',
          }},
        ],
      },
      {
        id: u(), title: 'Convert 3.45 km to m', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'method', title: 'Method',
            content: 'From km to m, we skip 3 positions to the right (km → hm → dam → m).|So we move the decimal point 3 positions to the right.',
            isList: 'true',
          }},
          { id: u(), funcId: 'eq-create',     inputs: { eq: 'm = 3.45 * 1000' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Area Units (km²)', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'aire', title: 'Area Units',
            content: 'For area units, each unit is worth 100 times the next (not 10!).|E.g.: 1 km² = 100 hm² = 10,000 dam² = 1,000,000 m².',
            isList: 'true',
          }},
          { id: u(), funcId: 'tab-create-grid', inputs: {
            gridId: 'aire1', cols: '7', rows: '2',
            headerRow: 'true', headerCol: 'false',
            values: 'km²,hm²,dam²,m²,dm²,cm²,mm²|1000000,10000,100,1,0.01,0.0001,0.000001',
          }},
        ],
      },
    ],
  },

  /* ─── 19. Quick Quiz — exercise pages demo ────────────── */
  {
    id: 'quick-quiz',
    emoji: '📝',
    title: 'Quick Quiz: Slopes & Graphs',
    desc: 'Practice questions — 4 choices, 2 choices, and a typed-answer page',
    color: '#fbbf24',
    pages: [
      {
        id: u(), title: 'Question 1', layout: 'single-graph',
        type: 'exercise',
        question: 'What is the slope of the line $y = 2x + 1$?',
        exerciseType: 'choices4',
        choices: ['1', '2', '3', '4'],
        correctChoice: 1,
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2x + 1', id: 'f1' } },
        ],
      },
      {
        id: u(), title: 'Question 2',
        type: 'exercise',
        question: 'Is $y = 3x + 2$ increasing or decreasing as $x$ increases?',
        exerciseType: 'choices2',
        choices: ['Increasing', 'Decreasing'],
        correctChoice: 0,
        steps: [],
      },
      {
        id: u(), title: 'Question 3', layout: 'single-graph',
        type: 'exercise',
        question: 'What is the $y$-coordinate of point $P$?',
        exerciseType: 'input',
        answer: '5',
        steps: [
          { id: u(), funcId: 'graph-add-point', inputs: { x: '3', y: '5', id: 'p1', label: 'P' } },
        ],
      },
    ],
  },
  /* ─── To build ────────────────────────────────────────────────────────────────
     Added empty, so they can be built in the Builder and saved over. One blank
     page each, the same one "+ page" makes. Until a lesson here has a step, the
     router never offers it as a model (server.js, availableExamples). */
  {
    id: 'sequences',
    emoji: '🔢',
    title: 'Arithmetic and Geometric Sequences',
    desc: 'Terms linked by +d or ×r arrows, the general term worked out step by step, then the terms placed as points on the graph',
    color: '#f59e0b',
    pages: [
      {
        id: u(), title: 'Suite arithmétique : on ajoute d', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Suite arithmétique', content: 'Chaque terme s\'obtient en **ajoutant** la même valeur au précédent.|Cette valeur $d$ s\'appelle la **raison**.', isList: 'false' } },
          { id: u(), funcId: 'eq-sequence', inputs: { kind: 'arithmetic', first: '3', step: '4', count: '5', dots: 'yes', arrows: 'above' } },
        ],
      },
      {
        id: u(), title: 'Suite géométrique : on multiplie par r', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Suite géométrique', content: 'Chaque terme s\'obtient en **multipliant** le précédent par la même valeur.|Cette valeur $r$ s\'appelle la **raison**.', isList: 'false' } },
          { id: u(), funcId: 'eq-sequence', inputs: { kind: 'geometric', first: '2', step: '3', count: '5', dots: 'yes', arrows: 'above' } },
        ],
      },
      {
        id: u(), title: 'Le terme général d\'une suite arithmétique', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'form', title: 'Terme général', content: '$a_n = a_1 + (n - 1)\\,d$|Avec $a_1 = 3$ et $d = 4$, que vaut $a_{10}$ ?', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|a₁₀| = |a₁| + (|n| - 1) * |d|' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a₁=3,n=10,d=4' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Le terme général d\'une suite géométrique', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'form', title: 'Terme général', content: '$a_n = a_1 \\cdot r^{\\,n - 1}$|Avec $a_1 = 2$ et $r = 3$, que vaut $a_5$ ?', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|a₅| = |a₁| * |r|^(|n| - 1)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a₁=2,r=3,n=5' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Les termes sur un graphique', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'eq-sequence', inputs: { kind: 'arithmetic', first: '1', step: '2', count: '5', dots: 'no', arrows: 'above', points: 'yes', rank: '1' } },
        ],
      },
    ],
  },
  {
    id: 'vectors',
    emoji: '➡️',
    title: 'Vectors',
    desc: 'Named vectors on the graph, their Δx and Δy components, a tip-to-tail sum, a scalar multiple and the angle between two vectors',
    color: '#06b6d4',
    pages: [
      {
        id: u(), title: 'Un vecteur : une flèche', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Vecteur', content: 'Un vecteur a une **longueur** (sa norme), une **direction** et un **sens**.|On le dessine comme une flèche.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '6', yMin: '-1', yMax: '5' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '4', y2: '3', id: 'u', arrow: 'end', name: 'u' } },
          { id: u(), funcId: 'graph-show-projection', inputs: { pointId: 'u', showValues: 'true' } },
        ],
      },
      {
        id: u(), title: 'La norme d\'un vecteur', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '6', yMin: '-1', yMax: '5' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '4', y2: '3', id: 'u', arrow: 'end', name: 'u' } },
          { id: u(), funcId: 'graph-show-projection', inputs: { pointId: 'u', showValues: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|norme| = sqrt(|Δx|^2 + |Δy|^2)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'Δx=4,Δy=3' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Additionner deux vecteurs', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'somme', title: 'Somme bout à bout', content: 'On place le début de $\\vec v$ au bout de $\\vec u$.|La somme va du début de $\\vec u$ au bout de $\\vec v$.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '7', yMin: '-1', yMax: '6' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '3', y2: '1', color: 'red', id: 'u', arrow: 'end', name: 'u' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '3', y1: '1', x2: '5', y2: '5', color: 'purple', id: 'v', arrow: 'end', name: 'v' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '5', y2: '5', color: 'green', id: 'w', arrow: 'end', name: 'u + v' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'u + v = ([w]x2, [w]y2)', x: '[w]x2', y: '[w]y2', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'Multiplier un vecteur par un scalaire', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'scal', title: 'Multiple scalaire', content: '$3\\vec u$ a la même direction que $\\vec u$, mais il est 3 fois plus long.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '8', yMin: '-1', yMax: '6' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '2', y2: '1', color: 'red', id: 'u', arrow: 'end', name: 'u' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '2', x2: '6', y2: '5', color: 'orange', id: 't', arrow: 'end', name: '3u' } },
          { id: u(), funcId: 'cmt-graph-func', inputs: { text: 'longueur = [t]len', funcId: 't', color: 'orange' } },
        ],
      },
      {
        id: u(), title: 'L\'angle entre deux vecteurs', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '6', yMin: '-1', yMax: '5' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '5', y2: '0', color: 'red', id: 'a', arrow: 'end', name: 'a' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '3', y2: '4', color: 'purple', id: 'b', arrow: 'end', name: 'b' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'a', b: 'b', color: 'orange', id: 'ang' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Angle entre deux vecteurs', text: '$\\cos\\theta = \\dfrac{\\vec a \\cdot \\vec b}{\\|\\vec a\\|\\,\\|\\vec b\\|}$', side: 'right' } },
        ],
      },
    ],
  },
  {
    id: 'conics',
    emoji: '⭕',
    title: 'Conics',
    desc: 'Parabola, ellipse, circle and hyperbola drawn from their equation, with their vertices, foci, directrix and asymptotes',
    color: '#a78bfa',
    pages: [
      {
        id: u(), title: 'La parabole', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y = (x - 1)^2 / 4', id: 'P' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'P', id: 'P', labels: 'both' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Foyer', x: '[PF]x', y: '[PF]y' } },
        ],
      },
      {
        id: u(), title: 'L\'ellipse', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2/9 + y^2/4 = 1', id: 'E' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'E', id: 'E', labels: 'names' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'La somme des distances aux deux foyers est constante', x: '[EF1]x', y: '[EF1]y' } },
        ],
      },
      {
        id: u(), title: 'Le cercle', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '(x - 1)^2 + (y + 2)^2 = 9', id: 'C' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'C', id: 'C', labels: 'both' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Centre', x: '[CC]x', y: '[CC]y' } },
        ],
      },
      {
        id: u(), title: 'L\'hyperbole', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2/4 - y^2/9 = 1', id: 'H' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'H', id: 'H', labels: 'names' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Asymptotes', text: 'Deux droites dont l\'hyperbole s\'approche sans jamais les toucher.', side: 'right' } },
        ],
      },
      {
        id: u(), title: 'Trouver c dans une ellipse', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2/25 + y^2/9 = 1', id: 'E' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'E', show: 'foci', id: 'E', labels: 'names' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|c| = sqrt(|a|^2 - |b|^2)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a=[E]a,b=[E]b' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
    ],
  },
  {
    id: 'probability',
    emoji: '🎲',
    title: 'Probability — Trees and Venn Diagrams',
    desc: 'A possibility tree followed branch by branch, Venn regions (∩, ∪, complement) shaded one at a time, and n! for permutations',
    color: '#f472b6',
    pages: [
      {
        id: u(), title: 'Arbre des possibles : deux lancers', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'intro', title: 'Deux lancers de pièce', content: 'Chaque lancer donne **P** (pile) ou **F** (face).|L\'arbre montre toutes les issues : $2 \\times 2 = 4$.', isList: 'false' } },
          { id: u(), funcId: 'chart-tree', inputs: { stages: 'P,F', count: '2', headers: '1er lancer,2e lancer', results: '1', chartId: 'arbre' } },
          { id: u(), funcId: 'chart-tree-path', inputs: { path: 'PF', chartId: 'arbre' } },
        ],
      },
      {
        id: u(), title: 'Une pièce puis un dé', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'intro', title: 'Pièce puis dé', content: 'Pour chaque côté de la pièce, le dé a 6 faces.|$2 \\times 6 = 12$ issues possibles.', isList: 'false' } },
          { id: u(), funcId: 'chart-tree', inputs: { stages: 'P,F | 1,2,3,4,5,6', headers: 'Pièce,Dé', results: '1', chartId: 'pd' } },
          { id: u(), funcId: 'chart-tree-path', inputs: { path: 'P3', chartId: 'pd' } },
        ],
      },
      {
        id: u(), title: 'Diagramme de Venn : ET et OU', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'sets', title: 'Deux ensembles', content: '$A$ : les élèves qui font du sport|$B$ : les élèves qui font de la musique', isList: 'true' } },
          { id: u(), funcId: 'chart-venn', inputs: { sets: 'A,B', chartId: 'venn' } },
          { id: u(), funcId: 'chart-venn-highlight', inputs: { expr: 'A∩B', color: 'green', chartId: 'venn' } },
          { id: u(), funcId: 'chart-venn-highlight', inputs: { expr: 'A∪B', color: 'orange', chartId: 'venn' } },
          { id: u(), funcId: 'chart-venn-highlight', inputs: { expr: 'A\'', color: 'red', chartId: 'venn' } },
        ],
      },
      {
        id: u(), title: 'Combien de façons d\'ordonner ?', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Placer 5 livres', content: 'Pour la 1re place, 5 choix ; pour la 2e, 4 ; puis 3…|Le nombre total s\'écrit $5!$ (factorielle).', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '5! = x' } },
          { id: u(), funcId: 'eq-factorial', inputs: { side: 'left', index: '0' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
    ],
  },
  {
    id: 'fractions',
    emoji: '🍕',
    title: 'Fractions, Decimals and Percentages',
    desc: 'A fraction circle filling from 3/8 to 5/8, the same amount written as a percentage and a decimal, and the nested number sets ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ',
    color: '#fb923c',
    pages: [
      {
        id: u(), title: 'Une fraction : des parts égales', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Lire une fraction', content: 'Le **dénominateur** dit en combien de parts égales on coupe.|Le **numérateur** dit combien de parts on prend.', isList: 'false' } },
          { id: u(), funcId: 'chart-pie', inputs: { chartId: 'pie', num: '3', den: '8', color: 'orange' } },
          { id: u(), funcId: 'chart-pie-set', inputs: { chartId: 'pie', num: '5' } },
        ],
      },
      {
        id: u(), title: 'Fraction, pourcentage, décimal', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Trois écritures', content: 'Le même cercle, la même quantité, trois façons de l\'écrire.', isList: 'false' } },
          { id: u(), funcId: 'chart-pie', inputs: { chartId: 'pie', num: '3', den: '4', color: 'green' } },
          { id: u(), funcId: 'chart-pie-mode', inputs: { chartId: 'pie', mode: 'percent' } },
          { id: u(), funcId: 'chart-pie-mode', inputs: { chartId: 'pie', mode: 'decimal' } },
        ],
      },
      {
        id: u(), title: 'Fractions équivalentes', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Même quantité', content: '$\\dfrac{1}{2}$ et $\\dfrac{2}{4}$ remplissent la même surface.', isList: 'false' } },
          { id: u(), funcId: 'chart-pie', inputs: { chartId: 'a', num: '1', den: '2', color: 'orange' } },
          { id: u(), funcId: 'chart-pie', inputs: { chartId: 'b', num: '2', den: '4', color: 'teal' } },
          { id: u(), funcId: 'chart-pie-set', inputs: { chartId: 'b', num: '4', den: '8' } },
        ],
      },
      {
        id: u(), title: 'Additionner des fractions', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Même dénominateur d\'abord', content: 'On amplifie chaque fraction pour avoir le même dénominateur, puis on additionne les numérateurs.', isList: 'false' } },
          { id: u(), funcId: 'eq-fraction-op', inputs: { expression: '2/3 + 1/4' } },
        ],
      },
      {
        id: u(), title: 'Multiplier des fractions', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Numérateur × numérateur', content: 'On multiplie les numérateurs ensemble et les dénominateurs ensemble, puis on simplifie.', isList: 'false' } },
          { id: u(), funcId: 'eq-fraction-op', inputs: { expression: '2/3 × 3/4' } },
        ],
      },
      {
        id: u(), title: 'Diviser des fractions', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Multiplier par l\'inverse', content: 'Diviser par une fraction, c\'est multiplier par son inverse.', isList: 'false' } },
          { id: u(), funcId: 'eq-fraction-op', inputs: { expression: '3/4 ÷ 2/5' } },
        ],
      },
      {
        id: u(), title: 'Les ensembles de nombres', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Des ensembles emboîtés', content: 'Chaque ensemble est contenu dans le suivant : un entier naturel est aussi un entier, un décimal, un rationnel et un réel.', isList: 'false' } },
          { id: u(), funcId: 'chart-number-sets', inputs: { chartId: 'ens' } },
        ],
      },
    ],
  },
  {
    id: 'inequalities',
    emoji: '🌗',
    title: 'Inequalities and Half-Planes',
    desc: 'Solve the inequality, shade its half-plane (dashed boundary when strict), then cross two regions to find a vertex',
    color: '#4ade80',
    pages: [
      {
        id: u(), title: 'Une inéquation à une variable', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Inéquation', content: '$x > -2$ : tous les nombres plus grands que $-2$.|Frontière **pointillée** : $-2$ n\'est pas inclus.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-6', xMax: '6', yMin: '-4', yMax: '4' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x > -2', id: 'r' } },
        ],
      },
      {
        id: u(), title: 'Le demi-plan y < 2x + 1', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Demi-plan', content: 'Tous les points **sous** la droite vérifient $y < 2x + 1$.|Frontière pointillée : les points de la droite ne sont pas inclus.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-5', xMax: '5', yMin: '-5', yMax: '5' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y < 2x + 1', id: 'r' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '2', y: '1', id: 'pt', label: '(2, 1)', showCoords: 'false' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: '1 < 2(2) + 1 : vrai', x: '2', y: '1' } },
        ],
      },
      {
        id: u(), title: 'Frontière pleine : ≥', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Inégalité large', content: 'Avec $\\ge$, la droite fait partie de la solution : **trait plein**.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-5', xMax: '5', yMin: '-5', yMax: '5' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y >= -x + 2', id: 'r' } },
        ],
      },
      {
        id: u(), title: 'Deux contraintes, un sommet', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '8', yMin: '-1', yMax: '7' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y <= -x + 6', id: 'c1' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y >= x / 2', id: 'c2' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '-x + 6', id: 'l1', hideLabel: '1' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x / 2', id: 'l2', hideLabel: '1' } },
          { id: u(), funcId: 'graph-find-intersections', inputs: { f1: 'l1', f2: 'l2', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'Trouver la frontière', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Où est la frontière ?', content: 'Pour $2x + 3 < 11$, on résout d\'abord $2x + 3 = 11$.|La solution est tout ce qui est d\'un seul côté de cette valeur.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '2x + 3 = 11' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
    ],
  },
  {
    id: 'angles-lines',
    emoji: '🛤️',
    title: 'Angles and Special Lines',
    desc: 'Two parallels cut by a transversal with alternate-interior and corresponding angles, then the altitude and median of a triangle attached to the figure',
    color: '#60a5fa',
    pages: [
      {
        id: u(), title: 'Angles opposés par le sommet', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Opposés par le sommet', content: 'Deux droites qui se croisent forment deux paires d\'angles **égaux**.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-5', xMax: '5', yMin: '-4', yMax: '4' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '-2', x2: '4', y2: '2', id: 'd1', name: 'd₁' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '2', x2: '4', y2: '-2', id: 'd2', name: 'd₂' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'd1', b: 'd2', color: 'orange', id: 'a1', side: 'right' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'd1', b: 'd2', color: 'orange', id: 'a2', side: 'left' } },
        ],
      },
      {
        id: u(), title: 'Parallèles et sécante : angles correspondants', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Angles correspondants', content: 'Même position à chaque intersection : ils sont **égaux** quand les droites sont parallèles.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-5', xMax: '6', yMin: '-4', yMax: '5' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '2', x2: '5', y2: '2', id: 'p1', name: 'd₁' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '-1', x2: '5', y2: '-1', id: 'p2', name: 'd₂' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-2', y1: '-3', x2: '3', y2: '4', id: 's', name: 'sécante' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'p1', b: 's', color: 'green', id: 'g1', side: 'above-right' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'p2', b: 's', color: 'green', id: 'g2', side: 'above-right' } },
        ],
      },
      {
        id: u(), title: 'Angles alternes-internes', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Alternes-internes', content: 'Entre les parallèles, de part et d\'autre de la sécante : ils sont **égaux**.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-5', xMax: '6', yMin: '-4', yMax: '5' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '2', x2: '5', y2: '2', id: 'p1', name: 'd₁' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '-1', x2: '5', y2: '-1', id: 'p2', name: 'd₂' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-2', y1: '-3', x2: '3', y2: '4', id: 's', name: 'sécante' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'p1', b: 's', color: 'pink', id: 'g1', side: 'below-left' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'p2', b: 's', color: 'pink', id: 'g2', side: 'above-right' } },
        ],
      },
      {
        id: u(), title: 'La hauteur d\'un triangle', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Hauteur', content: 'Segment qui part d\'un sommet et tombe **perpendiculairement** sur le côté opposé.', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '6', b: '5', c: '7' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 't', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'h', parentId: 't', anchors: 'v2,e0:5', color: 'purple' } },
          { id: u(), funcId: 'geo3d-mark-angle', inputs: { id: 't', markId: 'droit', from: 'v1', vertex: 'e0:5', to: 'v2', color: 'purple', label: '-' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'hauteur', shapeId: 'h', edgeIndex: '0', color: 'purple' } },
        ],
      },
      {
        id: u(), title: 'La médiane d\'un triangle', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Médiane', content: 'Segment qui relie un sommet au **milieu** du côté opposé.', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '6', b: '5', c: '7' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 't', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'm', parentId: 't', anchors: 'v2,e0@0.5', color: 'orange' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'médiane', shapeId: 'm', edgeIndex: '0', color: 'orange' } },
        ],
      },
    ],
  },
  {
    id: 'transformations',
    emoji: '🔁',
    title: 'Geometric Transformations',
    desc: 'Translation, rotation and reflection of the same named figure, the image drawn beside the original',
    color: '#10b981',
    pages: [
      {
        id: u(), title: 'Translation', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Translation', content: 'La figure **glisse** : même forme, même taille, même orientation.', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'f', type: 'right-triangle', a: '3', b: '2' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'f', dx: '-3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'f', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'g', type: 'right-triangle', a: '3', b: '2', color: 'orange' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'g', dx: '3', dy: '1' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'g', names: 'A\',B\',C\'', color: 'orange' } },
        ],
      },
      {
        id: u(), title: 'Rotation', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Rotation', content: 'La figure **tourne** autour d\'un point : ici d\'un quart de tour.', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'f', type: 'right-triangle', a: '3', b: '2' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'f', dx: '-3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'f', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'g', type: 'right-triangle', a: '3', b: '2', color: 'green' } },
          { id: u(), funcId: 'geo2d-rotate', inputs: { id: 'g' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'g', dx: '3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'g', names: 'A\',B\',C\'', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'Réflexion', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Réflexion', content: 'La figure est **retournée** comme dans un miroir.', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'f', type: 'right-triangle', a: '3', b: '2' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'f', dx: '-3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'f', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'g', type: 'right-triangle', a: '3', b: '2', color: 'purple' } },
          { id: u(), funcId: 'geo2d-flip', inputs: { id: 'g' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'g', dx: '3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'g', names: 'A\',B\',C\'', color: 'purple' } },
        ],
      },
    ],
  },
  {
    id: 'order-of-operations',
    emoji: '🧮',
    title: 'Order of Operations',
    desc: 'Multiplication and division before addition and subtraction, one operation at a time, left to right',
    color: '#fbbf24',
    pages: [
      {
        id: u(), title: '× et ÷ avant + et −', layout: 'text-mdas',
        steps: [
          { id: u(), funcId: 'mdas-example', inputs: { expr: '4 + 8 ÷ 2 - 1 × 3' } },
        ],
      },
      {
        id: u(), title: 'Un deuxième exemple', layout: 'text-mdas',
        steps: [
          { id: u(), funcId: 'mdas-example', inputs: { expr: '10 - 2 × 3 + 12 ÷ 4' } },
        ],
      },
      {
        id: u(), title: 'Les parenthèses d\'abord', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Parenthèses', content: 'Ce qui est entre **parenthèses** se calcule avant tout le reste.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '2 × (3 + 5) - 4' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Et les exposants ?', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'L\'ordre complet', content: 'Parenthèses|Exposants|× et ÷, de gauche à droite|+ et −, de gauche à droite', isList: 'steps' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '2 + 3^2 × 2' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
    ],
  },
  {
    id: 'reference-functions',
    emoji: '〰️',
    title: 'Reference Functions',
    desc: 'Step, absolute value, square root and sinusoidal functions with sliders a, b, h, k, a piecewise function, then transformations',
    color: '#34d399',
    pages: [
      {
        id: u(), title: 'La racine carrée', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Racine carrée', content: '$f(x) = a\\sqrt{b(x - h)} + k$|Déplace les curseurs pour voir l\'effet de chaque paramètre.', isList: 'false' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '|a| * sqrt(|b| * (x - |h|)) + |k|', id: 'rac' } },
          { id: u(), funcId: 'graph-adjust-view', inputs: { cx: '2', cy: '1', range: '10' } },
        ],
      },
      {
        id: u(), title: 'La sinusoïde', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Sinusoïde', content: '$f(x) = a\\sin(b(x - h)) + k$|$a$ : amplitude|$b$ : fréquence|$h$ : déphasage, $k$ : décalage vertical', isList: 'false' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '|a| * sin(|b| * (x - |h|)) + |k|', id: 'sin' } },
          { id: u(), funcId: 'graph-adjust-view', inputs: { cx: '0', cy: '0', range: '6' } },
        ],
      },
      {
        id: u(), title: 'La fonction en escalier', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Partie entière', content: '$f(x) = \\lfloor x \\rfloor$ : le plus grand entier plus petit ou égal à $x$.|Chaque marche a un point **plein** à gauche et **vide** à droite.', isList: 'false' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'floor(x)', id: 'esc' } },
          { id: u(), funcId: 'graph-adjust-view', inputs: { cx: '0', cy: '0', range: '10' } },
        ],
      },
      {
        id: u(), title: 'La valeur absolue', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Valeur absolue', content: '$f(x) = \\lvert x - h \\rvert + k$|Un V dont le sommet est en $(h, k)$.', isList: 'false' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sqrt((x - 2)^2) + 1', id: 'va', hideLabel: '1' } },
          { id: u(), funcId: 'graph-name-func', inputs: { funcId: 'va', label: 'f(x) = |x − 2| + 1', x0: '5' } },
          { id: u(), funcId: 'graph-adjust-view', inputs: { cx: '2', cy: '2', range: '8' } },
        ],
      },
      {
        id: u(), title: 'Transformer une fonction', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2', id: 'f' } },
          { id: u(), funcId: 'graph-transform-function', inputs: { funcId: 'f', transformType: 'translateX', value: '2' } },
          { id: u(), funcId: 'graph-transform-function', inputs: { funcId: 'f', transformType: 'translateY', value: '-1' } },
          { id: u(), funcId: 'graph-transform-function', inputs: { funcId: 'f', transformType: 'scaleY', value: '2' } },
        ],
      },
    ],
  },
  {
    id: 'expand-factor',
    emoji: '🧩',
    title: 'Expand, Factor, Divide',
    desc: 'Distributivity, collecting like terms, and dividing a polynomial by a binomial in the long-division layout',
    color: '#84cc16',
    pages: [
      {
        id: u(), title: 'Distribuer un facteur', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Distributivité', content: '$a(b + c) = ab + ac$|Le facteur devant multiplie **chaque** terme de la parenthèse.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '3(x + 4) = 2x + 5' } },
          { id: u(), funcId: 'eq-distribute', inputs: { eq: '3(x + 4) = 2x + 5' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Double distributivité', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Deux parenthèses', content: 'Chaque terme de la première parenthèse multiplie chaque terme de la seconde.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(x+2)(x+3)' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Réduire des termes semblables', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Termes semblables', content: 'On additionne les termes qui ont la **même** partie littérale.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '3x + 5 - x + 2' } },
          { id: u(), funcId: 'eq-combine', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Diviser un polynôme par un binôme', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Division de polynômes', content: 'Comme la division longue : diviser, multiplier, soustraire, abaisser.', isList: 'false' } },
          { id: u(), funcId: 'eq-polynomial-divide', inputs: { poly: 'x^3 - 2x^2 - 5x + 6', divisor: 'x - 1' } },
        ],
      },
    ],
  },
  {
    id: 'metric-relations',
    emoji: '🔺',
    title: 'Metric Relations and the Law of Cosines',
    desc: 'The altitude from the right angle attached to the triangle, the angles marked and h² = m·n worked out, then the law of cosines',
    color: '#f87171',
    pages: [
      {
        id: u(), title: 'La hauteur issue de l\'angle droit', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Relations métriques', content: 'La hauteur $h$ coupe l\'hypoténuse en deux segments $m$ et $n$.|$h^2 = m \\cdot n$', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'right-triangle', a: '6', b: '8' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 't', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'h', parentId: 't', anchors: 'v1,e2:6.4', color: 'purple' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'h', shapeId: 'h', edgeIndex: '0', color: 'purple' } },
        ],
      },
      {
        id: u(), title: 'Calculer la hauteur', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'right-triangle', a: '6', b: '8' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'h', parentId: 't', anchors: 'v1,e2:6.4', color: 'purple' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'h = ?', shapeId: 'h', edgeIndex: '0', color: 'purple' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|h| = sqrt(|m| * |n|)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'm=6.4,n=3.6' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'La loi des cosinus : trouver un côté', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '5', b: '8', c: '7' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 't', labels: 'a=,b=,c = ?' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|c| = sqrt(|a|^2 + |b|^2 - 2 * |a| * |b| * cos(|C|))' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a=5,b=8,C=60' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'La loi des cosinus : trouver un angle', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '5', b: '8', c: '7' } },
          { id: u(), funcId: 'geo3d-show-angles', inputs: { id: 't', showValues: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: 'cos(|C|) = (|a|^2 + |b|^2 - |c|^2) / (2 * |a| * |b|)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a=5,b=8,c=7' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Conclusion', text: '$\\cos C = \\dfrac{1}{2}$, donc $C = 60^\\circ$', side: 'right' } },
        ],
      },
    ],
  },
  {
    id: 'solids-views',
    emoji: '🧊',
    title: 'Solids — Views and Missing Measure',
    desc: 'Front, top and side views of a solid, its measures written as letters, then the missing measure found from the volume',
    color: '#6ee7b7',
    pages: [
      {
        id: u(), title: 'Un prisme vu de face, de dessus, de côté', layout: 'single-3d',
        steps: [
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'p', type: 'rectangular-prism', a: '4', b: '2', c: '3' } },
          { id: u(), funcId: 'geo3d-set-view', inputs: { preset: 'front' } },
          { id: u(), funcId: 'geo3d-set-view', inputs: { preset: 'top' } },
          { id: u(), funcId: 'geo3d-set-view', inputs: { preset: 'side' } },
          { id: u(), funcId: 'geo3d-set-view', inputs: { preset: 'corner' } },
        ],
      },
      {
        id: u(), title: 'Les mesures du volume', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Volume du cylindre', content: '$V = \\pi r^2 h$|Il faut le rayon $r$ de la base et la hauteur $h$.', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'c', type: 'cylinder', a: '2', b: '5' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'c', values: 'letters' } },
        ],
      },
      {
        id: u(), title: 'Trouver la hauteur manquante', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'c', type: 'cylinder', a: '2', b: '5' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'c', values: 'letters' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|h| = |V| / (pi * |r|^2)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'V=62.83,r=2' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Volume d\'une pyramide', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'py', type: 'pyramid', a: '4', b: '6' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'py' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|V| = |a|^2 * |h| / 3' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a=[py]a,h=[py]h' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
    ],
  },
  {
    id: 'exponents-scientific',
    emoji: '🔬',
    title: 'Exponents and Scientific Notation',
    desc: 'The laws of exponents applied step by step, then a number rewritten in scientific notation and back',
    color: '#eab308',
    pages: [
      {
        id: u(), title: 'Multiplier des puissances de même base', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'loi', title: 'Même base', content: '$a^m \\times a^n = a^{m+n}$|On garde la base et on **additionne** les exposants.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '2^3 × 2^4' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Puissance d\'une puissance', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'loi', title: 'Puissance de puissance', content: '$(a^m)^n = a^{m \\times n}$|On **multiplie** les exposants.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(2^3)^2' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Écrire un nombre en entier', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Notation scientifique', content: '$m \\times 10^n$ avec $1 \\le m < 10$.|L\'exposant dit de combien de places déplacer la virgule.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '3,45 x 10^4' } },
          { id: u(), funcId: 'eq-sci-expand', inputs: { side: 'left', index: '0' } },
        ],
      },
      {
        id: u(), title: 'Un très grand nombre', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Grand exposant', content: 'Plus l\'exposant est grand, plus la virgule avance vers la **droite**.|Chaque place vide reçoit un 0.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '7,2 x 10^5' } },
          { id: u(), funcId: 'eq-sci-expand', inputs: { side: 'left', index: '0' } },
        ],
      },
      {
        id: u(), title: 'Mettre sur la même puissance de 10', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'def', title: 'Avant d\'additionner', content: 'Pour additionner $2,34 \\times 10^2$ et $4,45 \\times 10^4$, on les met d\'abord sur la même puissance de 10.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '4,45 x 10^4' } },
          { id: u(), funcId: 'eq-sci-expand', inputs: { side: 'left', index: '0', target: '2' } },
        ],
      },
    ],
  },
]
