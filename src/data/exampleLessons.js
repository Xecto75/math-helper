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
    desc: 'An arithmetic sequence written out with its +d arrows, each letter of tₙ = t₁ + (n − 1)d named by a coloured comment, that general term worked out for n = 10, then a geometric sequence plotted rank by rank',
    color: '#f59e0b',
    pages: [
      {
        id: u(), title: 'An Arithmetic Sequence Adds the Same Number', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Arithmetic sequence', content: 'Each term is the one before it **plus the same number**.|That number is the **common difference** $d$.', isList: 'true' } },
          { id: u(), funcId: 'eq-sequence', inputs: { kind: 'arithmetic', first: '3', step: '4', count: '5', dots: 'yes', arrows: 'above' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Common difference', text: 'Every arrow adds the same amount: $d = 4$.', side: 'right' } },
        ],
      },
      {
        id: u(), title: 'What Each Letter of the General Term Means', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'General term', content: '$\\clr{cyan}{t_n} = \\clr{green}{t_1} + (\\clr{purple}{n} - 1) \\times \\clr{orange}{d}$|Each letter has one job.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|tₙ|{cyan} = |t₁|{green} + (|n|{purple} - 1) * |d|{orange}' } },
          { id: u(), funcId: 'cmt-equation', inputs: { cmtId: 'ctn', text: 'The term we are looking for', side: 'left', indices: '0', color: 'cyan' } },
          { id: u(), funcId: 'cmt-equation', inputs: { cmtId: 'ct1', text: 'The first term', side: 'right', indices: '0', color: 'green' } },
          { id: u(), funcId: 'cmt-equation', inputs: { cmtId: 'cn', text: 'The rank of the term', side: 'right', indices: '1', color: 'purple' } },
          { id: u(), funcId: 'cmt-equation', inputs: { cmtId: 'cd', text: 'The common difference', side: 'right', indices: '3', color: 'orange' } },
        ],
      },
      {
        id: u(), title: 'Working Out the 10th Term', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Method', content: 'Write the general term.|Replace each letter by its value: $\\clr{green}{t_1} = 3$, $\\clr{purple}{n} = 10$, $\\clr{orange}{d} = 4$.|Work out what is left.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|t₁₀|{cyan} = |t₁|{green} + (|n|{purple} - 1) * |d|{orange}' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 't₁=3,n=10,d=4' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'The 10th term is $t_{10} = [eq-result]$.|Nine steps of $+4$ after the first term, not ten — that is what the $n - 1$ is for.' } },
        ],
      },
      {
        id: u(), title: 'A Geometric Sequence Multiplies Instead', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'eq-sequence', inputs: { kind: 'geometric', first: '3', step: '2', count: '6', dots: 'no', arrows: 'above', points: 'yes', rank: '1' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Geometric sequence', text: 'Each term is the one before it **times** the same number: the **common ratio** $r = 2$.|Plotted rank by rank, the points climb faster and faster.', side: 'left' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Rank 6: $3 \\times 2^5 = {{ 3 * 2^5 }}$', x: '6', y: '{{ 3 * 2^5 }}' } },
        ],
      },
    ],
  },
  {
    id: 'vectors',
    emoji: '➡️',
    title: 'Vectors',
    desc: 'The vector from A to B drawn as an arrow with its Δx and Δy components read off the graph, its length found with the Pythagorean theorem, then two vectors added tip to tail',
    color: '#06b6d4',
    pages: [
      {
        id: u(), title: 'A Vector Is a Move: Δx Across, Δy Up', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Components', content: 'A vector is a **move**, not a place.|From $A(1, 1)$ to $B(5, 4)$, the move $\\vec{AB}$ is $\\Delta x$ across and $\\Delta y$ up.', isList: 'true' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '7', yMin: '-1', yMax: '6' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '1', y: '1', id: 'pA', label: 'A' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '5', y: '4', id: 'pB', label: 'B' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '1', y1: '1', x2: '5', y2: '4', color: 'green', id: 'ab', arrow: 'end', name: 'AB' } },
          { id: u(), funcId: 'graph-show-projection', inputs: { pointId: 'ab', showValues: 'true' } },
          { id: u(), funcId: 'cmt-graph-func', inputs: { text: '$\\vec{AB} = (\\Delta x,\\ \\Delta y)$', funcId: 'ab', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'The Length of a Vector', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '7', yMin: '-1', yMax: '6' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '1', y: '1', id: 'pA', label: 'A' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '5', y: '4', id: 'pB', label: 'B' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '1', y1: '1', x2: '5', y2: '4', color: 'green', id: 'ab', arrow: 'end', name: 'AB' } },
          { id: u(), funcId: 'graph-show-projection', inputs: { pointId: 'ab', showValues: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|AB| = sqrt(|Δx|^2 + |Δy|^2)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'Δx=4,Δy=3' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Adding Two Vectors Tip to Tail', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Tip to tail', content: 'Draw $\\vec v$ starting where $\\vec u$ ends.|The sum $\\vec u + \\vec v$ runs from the tail of $\\vec u$ to the tip of $\\vec v$.|Its components are the components added: $(3 + 2,\\ 1 + 4)$.', isList: 'true' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '7', yMin: '-1', yMax: '6' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '3', y2: '1', color: 'red', id: 'u', arrow: 'end', name: 'u' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '3', y1: '1', x2: '5', y2: '5', color: 'purple', id: 'v', arrow: 'end', name: 'v' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '0', y1: '0', x2: '5', y2: '5', color: 'green', id: 'w', arrow: 'end', name: 'u + v' } },
          { id: u(), funcId: 'cmt-graph-func', inputs: { text: '$\\vec u + \\vec v = ([w]x2,\\ [w]y2)$', funcId: 'w', color: 'green' } },
        ],
      },
    ],
  },
  {
    id: 'conics',
    emoji: '⭕',
    title: 'Conics',
    desc: 'The vertex, focus and directrix of a parabola marked on the plotted curve, the focus found again by comparing with x² = 4py, then an ellipse with its foci and c = √(a² − b²) worked out from the curve\'s own a and b',
    color: '#a78bfa',
    pages: [
      {
        id: u(), title: 'Vertex, Focus and Directrix of a Parabola', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Characteristic elements', content: 'A parabola has a **vertex**, a **focus** inside the curve and a **directrix** line outside it.|Every point of the curve is exactly as far from the focus as from the directrix.', isList: 'true' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y = x^2 / 8', id: 'ant' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'ant', show: 'vertices,foci,directrix', id: 'P', labels: 'names' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Focus', x: '[PF]x', y: '[PF]y' } },
        ],
      },
      {
        id: u(), title: 'Finding the Focus from x² = 4py', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y = x^2 / 8', id: 'ant' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'ant', show: 'vertices,foci', id: 'P', labels: 'names' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Compare the two forms', text: '$y = \\dfrac{x^2}{8}$ is the same as $x^2 = 8y$.|The standard form is $x^2 = 4py$, so $4p = 8$.', side: 'left' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '4|p| = 8' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'p' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'p = [p]v: the focus sits [p]v units above the vertex', x: '[PF]x', y: '[PF]y' } },
        ],
      },
      {
        id: u(), title: 'An Ellipse and Its Foci: c = √(a² − b²)', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2/25 + y^2/16 = 1', id: 'orb' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'orb', show: 'vertices,foci', id: 'E', labels: 'names' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Where the foci are', text: 'The two foci sit on the long axis, at a distance $c$ from the centre.|$c = \\sqrt{a^2 - b^2}$, with $a$ and $b$ read off the equation.', side: 'left' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|c| = sqrt(|a|^2 - |b|^2)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a=[E]a,b=[E]b' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'c' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Focus: [c]v from the centre', x: '[EF2]x', y: '[EF2]y' } },
        ],
      },
    ],
  },
  {
    id: 'probability',
    emoji: '🎲',
    title: 'Probability — Trees and Venn Diagrams',
    desc: 'Counting the outcomes of two coin flips on a possibility tree, reading the probability of one outcome off a highlighted path, then ∩ and ∪ on a Venn diagram with the double-counted overlap taken off',
    color: '#f472b6',
    pages: [
      {
        id: u(), title: 'Counting Outcomes on a Possibility Tree', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Possibility tree', content: 'One **stage** per column, one **branch** per outcome of that stage.|Every path down the tree is one possible result.', isList: 'true' } },
          { id: u(), funcId: 'chart-tree', inputs: { stages: 'H,T | H,T', headers: 'Flip 1,Flip 2', results: '1', chartId: 'flips' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Each of the 2 outcomes of the first flip pairs with each of the 2 outcomes of the second.|$2 \\times 2 = {{ 2 * 2 }}$ paths, so 4 possible results.' } },
        ],
      },
      {
        id: u(), title: 'Reading a Probability off One Path', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Equally likely paths', content: 'When every path is as likely as the others, one result is worth $\\dfrac{1}{\\text{number of paths}}$.', isList: 'false' } },
          { id: u(), funcId: 'chart-tree', inputs: { stages: 'H,T | H,T', headers: 'Flip 1,Flip 2', results: '1', chartId: 'flips' } },
          { id: u(), funcId: 'chart-tree-path', inputs: { path: 'T,H', chartId: 'flips' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'One path out of four is tails then heads.|$P(\\text{T then H}) = \\dfrac{1}{4}$' } },
        ],
      },
      {
        id: u(), title: 'Venn Diagram: A ∩ B and A ∪ B', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Two sets that overlap', content: 'Set $A$ has **18** elements, set $B$ has **12**, and **5** of them are in both.', isList: 'false' } },
          { id: u(), funcId: 'chart-venn', inputs: { sets: 'A,B', chartId: 'venn' } },
          { id: u(), funcId: 'chart-venn-highlight', inputs: { expr: 'A∩B', color: 'green', chartId: 'venn' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$\\clr{green}{A \\cap B}$ — in **both** sets: the 5 in the overlap.' } },
          { id: u(), funcId: 'chart-venn-highlight', inputs: { expr: 'A∪B', color: 'orange', chartId: 'venn' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$\\clr{orange}{A \\cup B}$ — in **at least one** set.|$18 + 12 - 5 = {{ 18 + 12 - 5 }}$: the overlap was counted twice, so it comes off once.' } },
        ],
      },
    ],
  },
  {
    id: 'fractions',
    emoji: '🍕',
    title: 'Fractions, Decimals and Percentages',
    desc: 'What the numerator and denominator count on a fraction circle, two eighths added to three on the same circle, the same quantity read as a fraction then a percentage then a decimal, and 2/3 + 1/4 worked out over a common denominator',
    color: '#fb923c',
    pages: [
      {
        id: u(), title: 'What a Fraction Counts', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Numerator and denominator', content: 'The **denominator** says how many equal parts the whole is cut into.|The **numerator** says how many of those parts are taken.', isList: 'true' } },
          { id: u(), funcId: 'chart-pie', inputs: { chartId: 'pizza', num: '3', den: '8', color: 'orange' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$\\clr{orange}{\\dfrac{3}{8}}$: the circle is cut into **8** equal parts and **3** are taken.' } },
          { id: u(), funcId: 'chart-pie-set', inputs: { chartId: 'pizza', num: '5' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Two more parts of that same size are taken.|$\\dfrac{3}{8} + \\dfrac{2}{8} = \\clr{orange}{\\dfrac{5}{8}}$ — same denominator, so only the numerators add.' } },
        ],
      },
      {
        id: u(), title: 'One Quantity, Three Ways to Write It', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Fraction, percentage, decimal', content: 'The same part of a whole can be written three ways. Here it is $\\clr{green}{\\dfrac{3}{4}}$ of the circle.', isList: 'false' } },
          { id: u(), funcId: 'chart-pie', inputs: { chartId: 'res', num: '3', den: '4', color: 'green' } },
          { id: u(), funcId: 'chart-pie-mode', inputs: { chartId: 'res', mode: 'percent' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'A percentage is a fraction out of 100.|$\\dfrac{3}{4} = \\dfrac{75}{100} = 75\\,\\%$' } },
          { id: u(), funcId: 'chart-pie-mode', inputs: { chartId: 'res', mode: 'decimal' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'A decimal is the numerator divided by the denominator.|$\\dfrac{3}{4} = 75\\,\\% = 0{,}75$' } },
        ],
      },
      {
        id: u(), title: 'Adding Fractions over a Common Denominator', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Method', content: 'Two fractions can only be added once their parts are the same size.|Rewrite both over a **common denominator**.|Then add the numerators and leave the denominator alone.', isList: 'true' } },
          { id: u(), funcId: 'eq-fraction-op', inputs: { expression: '2/3 + 1/4' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Twelfths fit both thirds and quarters.|$\\dfrac{2}{3} + \\dfrac{1}{4} = \\dfrac{8}{12} + \\dfrac{3}{12} = \\dfrac{11}{12}$' } },
        ],
      },
    ],
  },
  {
    id: 'inequalities',
    emoji: '🌗',
    title: 'Inequalities and Half-Planes',
    desc: 'The boundary of 12x + 5 ≤ 50 solved as an equation, the solutions x ≤ 3.75 shaded on the graph with a solid boundary, then two inequalities shading two half-planes that cross at a vertex',
    color: '#4ade80',
    pages: [
      {
        id: u(), title: 'Solve the Boundary First', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Method', content: 'An inequality is solved like an equation: its **boundary** is where the two sides are equal.|Solve $12x + 5 = 50$.|Then decide which side of that boundary makes $\\le$ true.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '12x + 5 = 50' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'The boundary is $x = [eq-result]$.|Below it the left side is smaller, so $12x + 5 \\le 50$ holds for every $x \\le [eq-result]$.' } },
        ],
      },
      {
        id: u(), title: 'Shading the Solutions on the Graph', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Reading the shading', content: '$x \\le 3{,}75$ — every number to the left of 3,75 is a solution.|A **solid** boundary means the boundary itself is included; a dashed one means it is not.', isList: 'true' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-2', xMax: '6', yMin: '-3', yMax: '3' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x <= 3.75', id: 'sol' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '3', y: '0', id: 'p3', label: 'x = 3 is a solution' } },
        ],
      },
      {
        id: u(), title: 'Two Inequalities: Half-Planes That Overlap', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Two half-planes', content: 'Each inequality shades a **half-plane**: $x + y \\le 8$ and $y \\ge 2x$.|What satisfies both is where the two shadings overlap.|Their boundaries meet at a vertex of that region.', isList: 'true' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '9', yMin: '-1', yMax: '9' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y <= -x + 8', id: 'c1' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y >= 2x', id: 'c2' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '-x + 8', id: 'l1', hideLabel: '1' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2x', id: 'l2', hideLabel: '1' } },
          { id: u(), funcId: 'graph-find-intersections', inputs: { f1: 'l1', f2: 'l2', color: 'green' } },
        ],
      },
    ],
  },
  {
    id: 'angles-lines',
    emoji: '🛤️',
    title: 'Angles and Special Lines',
    desc: 'Two parallel lines cut by a transversal with the corresponding angles marked equal, the altitude of a triangle drawn to the opposite side at a right angle, then the triangle\'s area computed from that altitude\'s live length',
    color: '#60a5fa',
    pages: [
      {
        id: u(), title: 'Corresponding Angles on Parallel Lines', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Parallel lines cut by a transversal', content: 'Two **parallel** lines, $d_1$ and $d_2$, are crossed by a third line $t$ — the **transversal**.|Angles in matching positions at the two crossings are **corresponding angles**.|On parallel lines they have the same measure.', isList: 'true' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-5', xMax: '6', yMin: '-4', yMax: '5' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '2', x2: '5', y2: '2', id: 'p1', name: 'd₁' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '-1', x2: '5', y2: '-1', id: 'p2', name: 'd₂' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-2', y1: '-3', x2: '3', y2: '4', id: 's', name: 't' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'p1', b: 's', color: 'green', id: 'g1', side: 'above-right' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'p2', b: 's', color: 'green', id: 'g2', side: 'above-right' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Corresponding angles', text: 'Same position at each crossing, same measure — that is what makes $d_1 \\parallel d_2$ visible.', side: 'right', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'The Altitude of a Triangle', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Altitude', content: 'A segment from one vertex to the opposite side, meeting it at a **right angle**.|Its length is the $h$ in the area formula.', isList: 'true' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '6', b: '5', c: '7' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 't', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'h', parentId: 't', anchors: 'v2,e0:5', color: 'purple' } },
          { id: u(), funcId: 'geo3d-mark-angle', inputs: { id: 't', markId: 'droit', from: 'v1', vertex: 'e0:5', to: 'v2', color: 'purple', label: '-' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'altitude', shapeId: 'h', edgeIndex: '0', color: 'purple' } },
        ],
      },
      {
        id: u(), title: 'Area from the Altitude', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '6', b: '5', c: '7' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 't', labels: 'b =,,' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'h', parentId: 't', anchors: 'v2,e0:5', color: 'purple' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'h', shapeId: 'h', edgeIndex: '0', color: 'purple' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|A| = |b| * |h|{purple} / 2' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'b=[t]0,h=[h]0' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
    ],
  },
  {
    id: 'transformations',
    emoji: '🔁',
    title: 'Geometric Transformations',
    desc: 'Moving a named right triangle three ways: a translation five right and one up, a quarter-turn rotation, and a mirror reflection, each image named A\'B\'C\' beside the original',
    color: '#10b981',
    pages: [
      {
        id: u(), title: 'Translation: Every Point Moves the Same Way', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Translation', content: 'Every point moves **5 right** and **1 up**.|Shape, size and orientation are all kept — only the position changes.|The image is named $A\'B\'C\'$, vertex for vertex.', isList: 'true' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'f', type: 'right-triangle', a: '3', b: '2' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'f', dx: '-3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'f', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'g', type: 'right-triangle', a: '3', b: '2', color: 'green' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'g', dx: '2', dy: '1' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'g', names: 'A\',B\',C\'', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'Rotation: a Quarter Turn', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Rotation', content: 'The figure turns a **quarter turn** (90°) counter-clockwise.|Lengths and angles are kept; the orientation of the figure turns with it.', isList: 'true' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'f', type: 'right-triangle', a: '3', b: '2' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'f', dx: '-3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'f', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'g', type: 'right-triangle', a: '3', b: '2', color: 'orange' } },
          { id: u(), funcId: 'geo2d-rotate', inputs: { id: 'g' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'g', dx: '3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'g', names: 'A\',B\',C\'', color: 'orange' } },
        ],
      },
      {
        id: u(), title: 'Reflection: the Figure Is Flipped', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Reflection', content: 'The figure is flipped, as in a **mirror**.|Lengths and angles are kept, but the vertices are read in the opposite order.', isList: 'true' } },
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
    desc: '4 + 8 ÷ 2 − 1 × 3 worked out one operation at a time in the right order, brackets that change the result of 2 × (3 + 5), then a longer expression where both products are done before the addition and subtraction',
    color: '#fbbf24',
    pages: [
      {
        id: u(), title: 'The Order Operations Are Done In', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'The order', content: 'Brackets first.|Then multiplication and division, left to right.|Then addition and subtraction, left to right.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '4 + 8 ÷ 2 - 1 × 3' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$8 \\div 2$ and $1 \\times 3$ go first, then the $+$ and the $-$: the answer is $[eq-result]$.|Straight left to right would have given 13,5 — the order is what makes the answer one number and not several.' } },
        ],
      },
      {
        id: u(), title: 'Brackets Change the Result', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Brackets first', content: 'Without brackets, $2 \\times 3 + 5 = 11$: the product comes first.|Brackets say "this is one number": what is inside is worked out before anything else touches it.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '2 × (3 + 5)' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Same numbers, same signs: $2 \\times 3 + 5 = 11$ but $2 \\times (3 + 5) = [eq-result]$.' } },
        ],
      },
      {
        id: u(), title: 'A Longer Expression, the Same Rules', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Two products first', content: 'In $3 \\times 4 + 2 \\times 1{,}5 - 5$ there are two products and no brackets.|Both products are worked out first, then the addition and the subtraction, left to right.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '3 × 4 + 2 × 1,5 - 5' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$12 + 3 - 5 = [eq-result]$.|A decimal changes nothing about the order.' } },
        ],
      },
    ],
  },
  {
    id: 'reference-functions',
    emoji: '〰️',
    title: 'Reference Functions',
    desc: 'The absolute value |x − 2| drawn as a V with its vertex marked, the same V moved and opened by the parameters a, h and k on sliders, then a step function 3⌊x⌋ read at one point',
    color: '#34d399',
    pages: [
      {
        id: u(), title: 'The Absolute Value Function', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Absolute value', content: '$\\lvert x - 2 \\rvert$ is the **distance** between $x$ and 2, so it is never negative.|Its graph is a V, and the point of the V sits where the inside is 0.', isList: 'true' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-3', xMax: '7', yMin: '-1', yMax: '5' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sqrt((x - 2)^2)', id: 'd', hideLabel: '1' } },
          { id: u(), funcId: 'graph-name-func', inputs: { funcId: 'd', label: 'f(x) = |x − 2|', x0: '5' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '2', y: '0', id: 'm', funcId: 'd', label: 'Vertex (2, 0)' } },
        ],
      },
      {
        id: u(), title: 'The Parameters a, h and k', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Moving the V', content: '$f(x) = a\\,\\lvert x - h \\rvert + k$|$h$ slides the vertex left or right, $k$ slides it up or down.|$a$ opens the V, closes it, or flips it upside down.|Drag a slider and watch which part of the V answers.', isList: 'true' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '|a| * sqrt((x - |h|)^2) + |k|', id: 'va' } },
          { id: u(), funcId: 'graph-adjust-view', inputs: { cx: '0', cy: '2', range: '10' } },
        ],
      },
      {
        id: u(), title: 'A Step Function: the Floor', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Whole part only', content: '$f(x) = 3\\lfloor x \\rfloor$ — the floor $\\lfloor x \\rfloor$ keeps only the whole part of $x$.|The graph is flat steps that jump at every whole number.', isList: 'true' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '0', xMax: '6', yMin: '-1', yMax: '16' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '3 * floor(x)', id: 'tarif' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '2.5', y: '6', id: 'p', funcId: 'tarif', label: 'f(2,5) = 3 × 2 = 6' } },
        ],
      },
    ],
  },
  {
    id: 'expand-factor',
    emoji: '🧩',
    title: 'Expand, Factor, Divide',
    desc: '(x + 2)(x + 3) expanded term by term and collected into x² + 5x + 6, like terms collected in 3x + 5 + x + 2 + 2x − 1, then x³ − 2x² − 5x + 6 divided by the known factor (x − 1) in long division',
    color: '#84cc16',
    pages: [
      {
        id: u(), title: 'Expanding (x + 2)(x + 3)', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Method', content: 'Every term of the first bracket multiplies every term of the second.|That gives four products.|Then the like terms among them are collected.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(x+2)(x+3)' } },
          { id: u(), funcId: 'eq-distribute', inputs: { eq: '(x+2)(x+3)' } },
          { id: u(), funcId: 'eq-combine', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$x \\times x = x^2$, then $3x$ and $2x$ collect into $5x$, and $2 \\times 3 = 6$.|$(x + 2)(x + 3) = x^2 + 5x + 6$' } },
        ],
      },
      {
        id: u(), title: 'Collecting Like Terms', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Like terms', content: 'Only terms with the **same letter at the same exponent** can be added.|Here $3x$, $x$ and $2x$ are like terms, and 5, 2 and $-1$ are like terms.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '3x + 5 + x + 2 + 2x - 1' } },
          { id: u(), funcId: 'eq-combine', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Dividing by a Known Factor', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Why the division works', content: '$x = 1$ makes $x^3 - 2x^2 - 5x + 6$ zero, so $(x - 1)$ is a **factor** of it.|Dividing by that factor gives what is left to factor.|A remainder of 0 confirms the factor was a real one.', isList: 'true' } },
          { id: u(), funcId: 'eq-polynomial-divide', inputs: { poly: 'x^3 - 2x^2 - 5x + 6', divisor: 'x - 1' } },
        ],
      },
    ],
  },
  {
    id: 'metric-relations',
    emoji: '🔺',
    title: 'Metric Relations and the Law of Cosines',
    desc: 'The altitude from the right angle splitting the hypotenuse into m and n, h computed from h² = m·n with the segments\' own lengths, then the law of cosines used on a triangle with two sides and the angle between them',
    color: '#f87171',
    pages: [
      {
        id: u(), title: 'The Altitude Splits the Hypotenuse into m and n', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Metric relations', content: 'In a right triangle, the altitude $\\clr{purple}{h}$ drawn from the right angle cuts the hypotenuse into two pieces, $\\clr{orange}{m}$ and $\\clr{green}{n}$.|Those three lengths are tied together: $\\clr{purple}{h}^2 = \\clr{orange}{m} \\times \\clr{green}{n}$.', isList: 'true' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'right-triangle', a: '6', b: '8' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'h', parentId: 't', anchors: 'v1,e2:6.4', color: 'purple' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'mseg', parentId: 't', anchors: 'v2,e2:6.4', color: 'orange' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'nseg', parentId: 't', anchors: 'e2:6.4,v0', color: 'green' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'h', shapeId: 'h', edgeIndex: '0', color: 'purple' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'm', shapeId: 'mseg', edgeIndex: '0', color: 'orange' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'n', shapeId: 'nseg', edgeIndex: '0', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'Computing h from h² = m × n', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'right-triangle', a: '6', b: '8' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'h', parentId: 't', anchors: 'v1,e2:6.4', color: 'purple' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'mseg', parentId: 't', anchors: 'v2,e2:6.4', color: 'orange' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'nseg', parentId: 't', anchors: 'e2:6.4,v0', color: 'green' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|h|{purple} = sqrt(|m|{orange} * |n|{green})' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'm=[mseg]0,n=[nseg]0' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'h' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'h = [h]v', shapeId: 'h', edgeIndex: '0', color: 'purple' } },
        ],
      },
      {
        id: u(), title: 'The Law of Cosines: Two Sides and the Angle Between', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'cmt-free', inputs: { title: 'When to use it', text: 'Two sides and the angle **between** them are known: $a = 5$, $b = 8$, $C = 60°$.|The third side comes from $c^2 = a^2 + b^2 - 2ab\\cos C$ — the Pythagorean theorem plus a correction for the angle.', side: 'left' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '5', b: '8', c: '7' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 't', labels: 'a = 5,b = 8,c = ?' } },
          { id: u(), funcId: 'geo3d-mark-angle', inputs: { id: 't', markId: 'port', from: 'v0', vertex: 'v1', to: 'v2', color: 'orange', label: '60°' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|c| = sqrt(|a|^2 + |b|^2 - 2 * |a| * |b| * cos(|C|{orange}))' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a=5,b=8,C=60' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'c' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'c = [c]v', shapeId: 't', edgeIndex: '2', color: 'orange' } },
        ],
      },
    ],
  },
  {
    id: 'solids-views',
    emoji: '🧊',
    title: 'Solids — Views and Missing Measure',
    desc: 'The r and h of a cylinder drawn on the solid as letters, the missing height found by isolating h in V = πr²h, then the same prism seen from the front, the top and the side',
    color: '#6ee7b7',
    pages: [
      {
        id: u(), title: 'The Measures a Volume Formula Needs', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Cylinder', content: 'A cylinder is measured by its **radius** $r$ and its **height** $h$.|$V = \\pi r^2 h$ — the area of the disc, times how tall the solid is.', isList: 'true' } },
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'c', type: 'cylinder', a: '2', b: '5' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'c', values: 'letters' } },
        ],
      },
      {
        id: u(), title: 'Finding a Missing Measure from the Volume', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Isolating h', text: 'The volume and the radius are known: $V = 62{,}83$ and $r = 2$.|Isolate $h$ in $V = \\pi r^2 h$: divide the volume by the area of the disc.', side: 'left' } },
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'c', type: 'cylinder', a: '2', b: '5' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'c', values: 'letters' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|h| = |V| / (pi * |r|^2)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'r=2,V=62.83' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Front, Top and Side Views of a Solid', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Three views', content: 'A solid is drawn flat by looking at it **from the front**, **from above** and **from the side**.|Each view shows two of the three dimensions, so two views together give all three.', isList: 'true' } },
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'p', type: 'rectangular-prism', a: '4', b: '2', c: '3' } },
          { id: u(), funcId: 'geo3d-set-view', inputs: { preset: 'front' } },
          { id: u(), funcId: 'geo3d-set-view', inputs: { preset: 'top' } },
          { id: u(), funcId: 'geo3d-set-view', inputs: { preset: 'side' } },
        ],
      },
    ],
  },
  {
    id: 'exponents-scientific',
    emoji: '🔬',
    title: 'Exponents and Scientific Notation',
    desc: '1,5 × 10⁸ written out in full one decimal place at a time, the product rule for powers of the same base checked against the real product, then two numbers put on the same power of ten before they are added',
    color: '#eab308',
    pages: [
      {
        id: u(), title: 'What the Exponent Does to the Decimal Point', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Scientific notation', content: 'A number in scientific notation is a number between 1 and 10, times a power of ten.|The exponent counts how many places the decimal point moves.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '1,5 x 10^8' } },
          { id: u(), funcId: 'eq-sci-expand', inputs: { side: 'left', index: '0' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'The exponent 8 moves the decimal point **8 places** to the right.|Writing it as $1{,}5 \\times 10^8$ says the same thing without the zeros.' } },
        ],
      },
      {
        id: u(), title: 'Multiplying Powers of the Same Base', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Same base: add the exponents', content: '$2^3$ is three 2s multiplied, $2^4$ is four of them.|Multiplied together that is seven 2s: $2^3 \\times 2^4 = 2^{3+4} = 2^7$.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '2^3 × 2^4' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'The rule and the plain calculation agree: $[eq-result]$, and $2^7 = {{ 2^7 }}$.|The rule only works because the base is the same on both sides.' } },
        ],
      },
      {
        id: u(), title: 'Adding on the Same Power of Ten', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Method', content: 'Powers of ten can only be added when they are the **same** power.|Rewrite one of the numbers on the other\'s power of ten.|Then the two numbers in front are what gets added.', isList: 'true' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '4,45 x 10^4' } },
          { id: u(), funcId: 'eq-sci-expand', inputs: { side: 'left', index: '0', target: '2' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$4{,}45 \\times 10^4 = 445 \\times 10^2$, the same number written on $10^2$.|$445 \\times 10^2 + 2{,}34 \\times 10^2 = {{ 445 + 2.34 }} \\times 10^2$' } },
        ],
      },
    ],
  },
]
