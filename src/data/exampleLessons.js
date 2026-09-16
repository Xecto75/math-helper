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
    desc: 'Léa saves 50 $ plus 20 $ a week: an arithmetic sequence with its +20 arrows, what each letter of tₙ = t₁ + (n − 1)d stands for with a coloured comment per letter, the general term worked out for week 10, then a doubling bacteria colony as a geometric sequence plotted on the graph',
    color: '#f59e0b',
    pages: [
      {
        id: u(), title: 'Le plan d\'épargne de Léa', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Le plan d\'épargne de Léa', content: 'Léa a **50 $** à la semaine 1 et ajoute **20 $** chaque semaine.|Combien aura-t-elle à la semaine 10 ?', isList: 'false' } },
          { id: u(), funcId: 'eq-sequence', inputs: { kind: 'arithmetic', first: '50', step: '20', count: '5', dots: 'yes', arrows: 'above' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Suite arithmétique', text: 'On ajoute toujours la même valeur : c\'est la **raison** $d = 20$.', side: 'right' } },
        ],
      },
      {
        id: u(), title: 'Que veut dire chaque lettre ?', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'regle', title: 'Terme général', content: '$\\clr{cyan}{t_n} = \\clr{green}{t_1} + (\\clr{purple}{n} - 1) \\times \\clr{orange}{d}$|Chaque lettre a un rôle précis.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|tₙ|{cyan} ; |t₁|{green} ; |n|{purple} ; |d|{orange}' } },
          { id: u(), funcId: 'cmt-equation', inputs: { cmtId: 'ctn', text: 'Le terme cherché', side: 'left', indices: '0', color: 'cyan' } },
          { id: u(), funcId: 'cmt-equation', inputs: { cmtId: 'ct1', text: 'Le 1er terme : 50 $', side: 'left', indices: '1', color: 'green' } },
          { id: u(), funcId: 'cmt-equation', inputs: { cmtId: 'cn', text: 'Le rang : n° de la semaine', side: 'left', indices: '2', color: 'purple' } },
          { id: u(), funcId: 'cmt-equation', inputs: { cmtId: 'cd', text: 'La raison : +20 $ par semaine', side: 'left', indices: '3', color: 'orange' } },
        ],
      },
      {
        id: u(), title: 'Combien à la semaine 10 ?', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Semaine 10', content: 'On remplace chaque lettre par sa valeur : $\\clr{green}{t_1} = 50$, $\\clr{purple}{n} = 10$ et $\\clr{orange}{d} = 20$.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|t₁₀|{cyan} = |t₁|{green} + (|n|{purple} - 1) * |d|{orange}' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 't₁=50,n=10,d=20' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'On remplace chaque lettre par sa valeur : $\\clr{green}{t_1} = 50$, $\\clr{purple}{n} = 10$ et $\\clr{orange}{d} = 20$.|À la semaine 10, Léa aura **[eq-result] $**.' } },
        ],
      },
      {
        id: u(), title: 'Doubler au lieu d\'ajouter', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'eq-sequence', inputs: { kind: 'geometric', first: '3', step: '2', count: '6', dots: 'no', arrows: 'above', points: 'yes', rank: '1' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Suite géométrique', text: 'Une colonie de bactéries **double** chaque heure.|On multiplie par la raison $r = 2$ : les points montent de plus en plus vite.', side: 'left' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Heure 6 : {{ 3 * 2^5 }} bactéries', x: '6', y: '{{ 3 * 2^5 }}' } },
        ],
      },
    ],
  },
  {
    id: 'vectors',
    emoji: '➡️',
    title: 'Vectors',
    desc: 'A drone\'s trip from A to B as a vector: its Δx and Δy components on the graph, its length found with Pythagoras, then two trips added tip to tail',
    color: '#06b6d4',
    pages: [
      {
        id: u(), title: 'Le trajet du drone', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Le trajet du drone', content: 'Un drone part de $A(1, 1)$ et arrive en $B(5, 4)$.|Son déplacement est le **vecteur** $\\vec{AB}$.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-1', xMax: '7', yMin: '-1', yMax: '6' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '1', y: '1', id: 'pA', label: 'A' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '5', y: '4', id: 'pB', label: 'B' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '1', y1: '1', x2: '5', y2: '4', color: 'green', id: 'ab', arrow: 'end', name: 'AB' } },
          { id: u(), funcId: 'graph-show-projection', inputs: { pointId: 'ab', showValues: 'true' } },
          { id: u(), funcId: 'cmt-graph-func', inputs: { text: 'De $A$ à $B$ : $\\Delta x$ puis $\\Delta y$', funcId: 'ab', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'La longueur du trajet', layout: 'graph-equation',
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
        id: u(), title: 'Deux trajets de suite', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Addition bout à bout', content: 'Le drone fait $\\vec u$, puis $\\vec v$ à partir de là où il est arrivé.|Le trajet total est $\\vec u + \\vec v$.', isList: 'false' } },
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
    desc: 'A satellite dish as a parabola with its focus shown on the curve and found again from x² = 4py, then a planet\'s elliptical orbit with the Sun at a focus and c computed from a and b',
    color: '#a78bfa',
    pages: [
      {
        id: u(), title: 'L\'antenne parabolique', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Antenne parabolique', content: 'Tous les signaux qui frappent la parabole rebondissent vers un seul point : le **foyer**.|C\'est là qu\'on place le récepteur.', isList: 'false' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y = x^2 / 8', id: 'ant' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'ant', show: 'vertices,foci,directrix', id: 'P', labels: 'names' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Récepteur', x: '[PF]x', y: '[PF]y' } },
        ],
      },
      {
        id: u(), title: 'Trouver le foyer par calcul', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'y = x^2 / 8', id: 'ant' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'ant', show: 'vertices,foci', id: 'P', labels: 'names' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Comparer', text: '$y = \\dfrac{x^2}{8}$ s\'écrit $x^2 = 8y$.|On la compare à $x^2 = 4py$.', side: 'left' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '4|p| = 8' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'p' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Le foyer est à [p]v unités du sommet', x: '[PF]x', y: '[PF]y' } },
        ],
      },
      {
        id: u(), title: 'L\'orbite d\'une planète', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2/25 + y^2/16 = 1', id: 'orb' } },
          { id: u(), funcId: 'graph-conic-elements', inputs: { funcId: 'orb', show: 'vertices,foci', id: 'E', labels: 'names' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Orbite elliptique', text: 'Le Soleil n\'est pas au centre de l\'orbite : il est à un **foyer**.|$c = \\sqrt{a^2 - b^2}$', side: 'left' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|c| = sqrt(|a|^2 - |b|^2)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a=[E]a,b=[E]b' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'c' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Soleil : à [c]v du centre', x: '[EF2]x', y: '[EF2]y' } },
        ],
      },
    ],
  },
  {
    id: 'probability',
    emoji: '🎲',
    title: 'Probability — Trees and Venn Diagrams',
    desc: 'Counting the meals a cafeteria menu allows with a possibility tree, the probability of one meal by following its path, then a class survey on a Venn diagram (both activities, at least one)',
    color: '#f472b6',
    pages: [
      {
        id: u(), title: 'Combien de repas possibles ?', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Le menu de la cafétéria', content: 'Un plat : **pâtes** ou **pizza**. Un dessert : **fruit**, **yogourt** ou **gâteau**.|Combien de repas différents ?', isList: 'false' } },
          { id: u(), funcId: 'chart-tree', inputs: { stages: 'Pâtes,Pizza | Fruit,Yogourt,Gâteau', headers: 'Plat,Dessert', results: '1', chartId: 'menu' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Chaque plat va avec chacun des desserts.|$2 \\times 3 = {{ 2 * 3 }}$ repas possibles.' } },
        ],
      },
      {
        id: u(), title: 'La chance d\'avoir pizza et gâteau', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Au hasard', content: 'Si le repas est tiré au hasard, les 6 repas ont la **même chance**.', isList: 'false' } },
          { id: u(), funcId: 'chart-tree', inputs: { stages: 'Pâtes,Pizza | Fruit,Yogourt,Gâteau', headers: 'Plat,Dessert', results: '1', chartId: 'menu' } },
          { id: u(), funcId: 'chart-tree-path', inputs: { path: 'Pizza,Gâteau', chartId: 'menu' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Un seul chemin sur 6 mène à pizza et gâteau.|$P(\\text{pizza et gâteau}) = \\dfrac{1}{6}$' } },
        ],
      },
      {
        id: u(), title: 'Sport et musique', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Sondage de 30 élèves', content: '$S$ : **18** font du sport. $M$ : **12** font de la musique.|**5** font les deux.', isList: 'false' } },
          { id: u(), funcId: 'chart-venn', inputs: { sets: 'S,M', chartId: 'venn' } },
          { id: u(), funcId: 'chart-venn-highlight', inputs: { expr: 'S∩M', color: 'green', chartId: 'venn' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$\\clr{green}{S \\cap M}$ : les deux activités, **5** élèves.' } },
          { id: u(), funcId: 'chart-venn-highlight', inputs: { expr: 'S∪M', color: 'orange', chartId: 'venn' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$\\clr{orange}{S \\cup M}$ : au moins une activité.|$18 + 12 - 5 = {{ 18 + 12 - 5 }}$ élèves : les 5 étaient comptés deux fois.' } },
        ],
      },
    ],
  },
  {
    id: 'fractions',
    emoji: '🍕',
    title: 'Fractions, Decimals and Percentages',
    desc: 'Samuel\'s pizza cut into eighths as a fraction circle, the same tank level written as a fraction, a percentage and a decimal, then a recipe\'s 2/3 and 1/4 cup added with a common denominator',
    color: '#fb923c',
    pages: [
      {
        id: u(), title: 'La pizza de Samuel', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'La pizza de Samuel', content: 'Samuel coupe sa pizza en **8** parts égales et en mange **3**.', isList: 'false' } },
          { id: u(), funcId: 'chart-pie', inputs: { chartId: 'pizza', num: '3', den: '8', color: 'orange' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Il a mangé $\\clr{orange}{\\dfrac{3}{8}}$ de la pizza.|8 : le nombre de parts égales. 3 : les parts mangées.' } },
          { id: u(), funcId: 'chart-pie-set', inputs: { chartId: 'pizza', num: '5' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Son amie en mange 2 de plus.|$\\dfrac{3}{8} + \\dfrac{2}{8} = \\clr{orange}{\\dfrac{5}{8}}$' } },
        ],
      },
      {
        id: u(), title: 'Le réservoir d\'essence', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Trois écritures', content: 'La jauge indique que le réservoir est plein aux $\\clr{green}{\\dfrac{3}{4}}$.', isList: 'false' } },
          { id: u(), funcId: 'chart-pie', inputs: { chartId: 'res', num: '3', den: '4', color: 'green' } },
          { id: u(), funcId: 'chart-pie-mode', inputs: { chartId: 'res', mode: 'percent' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'La même quantité en pourcentage.|$\\dfrac{3}{4} = 75\\,\\%$' } },
          { id: u(), funcId: 'chart-pie-mode', inputs: { chartId: 'res', mode: 'decimal' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Et en nombre décimal.|$\\dfrac{3}{4} = 75\\,\\% = 0{,}75$' } },
        ],
      },
      {
        id: u(), title: 'Additionner dans une recette', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'La recette', content: 'On verse $\\dfrac{2}{3}$ tasse de lait et $\\dfrac{1}{4}$ tasse d\'eau.|Combien de liquide en tout ?', isList: 'false' } },
          { id: u(), funcId: 'eq-fraction-op', inputs: { expression: '2/3 + 1/4' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Il faut le **même dénominateur** avant d\'additionner.|En tout : $\\dfrac{11}{12}$ tasse, un peu moins d\'une tasse.' } },
        ],
      },
    ],
  },
  {
    id: 'inequalities',
    emoji: '🌗',
    title: 'Inequalities and Half-Planes',
    desc: 'A movie budget as an inequality: the boundary 12x + 5 = 50 solved, the solutions x ≤ 3.75 shaded on the graph, then a snack stand with two constraints and the vertex where they cross',
    color: '#4ade80',
    pages: [
      {
        id: u(), title: 'Combien de billets de cinéma ?', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Sortie au cinéma', content: 'Un billet coûte **12 $** et le popcorn **5 $**. Tu as **50 $**.|$12x + 5 \\le 50$ : combien de billets $x$ ?', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '12x + 5 = 50' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'La frontière est $x = [eq-result]$.|On doit rester sous **50 $**, donc $x \\le [eq-result]$ : au plus **3 billets**.' } },
        ],
      },
      {
        id: u(), title: 'Toutes les solutions', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Sur le graphique', content: '$x \\le 3{,}75$ : tous les nombres à gauche de 3,75.|Trait **plein** : 3,75 fait partie des solutions.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-2', xMax: '6', yMin: '-3', yMax: '3' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x <= 3.75', id: 'sol' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '3', y: '0', id: 'p3', label: '3 billets' } },
        ],
      },
      {
        id: u(), title: 'Deux conditions à la fois', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Le kiosque', content: 'Au plus **8** articles : $x + y \\le 8$|Au moins deux fois plus de boissons que de hot-dogs : $y \\ge 2x$', isList: 'false' } },
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
    desc: 'Two parallel streets cut by an avenue with equal corresponding angles, the altitude of a triangle drawn at a right angle, then the triangle\'s area computed from that altitude\'s live length',
    color: '#60a5fa',
    pages: [
      {
        id: u(), title: 'Des rues parallèles', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Plan du quartier', content: 'La rue Principale et la rue du Parc sont **parallèles**.|L\'avenue les traverse toutes les deux.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-5', xMax: '6', yMin: '-4', yMax: '5' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '2', x2: '5', y2: '2', id: 'p1', name: 'rue Principale' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-4', y1: '-1', x2: '5', y2: '-1', id: 'p2', name: 'rue du Parc' } },
          { id: u(), funcId: 'graph-add-segment', inputs: { x1: '-2', y1: '-3', x2: '3', y2: '4', id: 's', name: 'avenue' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'p1', b: 's', color: 'green', id: 'g1', side: 'above-right' } },
          { id: u(), funcId: 'graph-angle-between', inputs: { a: 'p2', b: 's', color: 'green', id: 'g2', side: 'above-right' } },
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Angles correspondants', text: 'Même position à chaque croisement : quand les rues sont parallèles, ils ont la **même mesure**.', side: 'right', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'La hauteur d\'un triangle', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Hauteur', content: 'Segment qui part d\'un sommet et arrive sur le côté opposé en formant un **angle droit**.', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '6', b: '5', c: '7' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 't', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-snap-shape', inputs: { shapeId: 'h', parentId: 't', anchors: 'v2,e0:5', color: 'purple' } },
          { id: u(), funcId: 'geo3d-mark-angle', inputs: { id: 't', markId: 'droit', from: 'v1', vertex: 'e0:5', to: 'v2', color: 'purple', label: '-' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'hauteur', shapeId: 'h', edgeIndex: '0', color: 'purple' } },
        ],
      },
      {
        id: u(), title: 'L\'aire à partir de la hauteur', layout: 'equation-3d',
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
        id: u(), title: 'La translation', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Translation', content: 'Chaque point se déplace de **5 vers la droite** et **1 vers le haut**.|La figure garde sa forme, sa taille et son orientation.', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'f', type: 'right-triangle', a: '3', b: '2' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'f', dx: '-3', dy: '0' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'f', names: 'A,B,C' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 'g', type: 'right-triangle', a: '3', b: '2', color: 'green' } },
          { id: u(), funcId: 'geo3d-move', inputs: { id: 'g', dx: '2', dy: '1' } },
          { id: u(), funcId: 'geo3d-name-vertices', inputs: { shapeId: 'g', names: 'A\',B\',C\'', color: 'green' } },
        ],
      },
      {
        id: u(), title: 'La rotation', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Rotation', content: 'La figure tourne d\'un **quart de tour** (90°) dans le sens contraire des aiguilles d\'une montre.', isList: 'false' } },
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
        id: u(), title: 'La réflexion', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Réflexion', content: 'La figure est retournée comme dans un **miroir**.|Les longueurs restent les mêmes, mais l\'ordre des sommets s\'inverse.', isList: 'false' } },
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
    desc: 'Two students get different answers to 4 + 8 ÷ 2 − 1 × 3 and the order is worked out one operation at a time, then brackets that change the result and a shopping bill computed in the right order',
    color: '#fbbf24',
    pages: [
      {
        id: u(), title: '4 + 8 ÷ 2 − 1 × 3 : qui a raison ?', layout: 'text-mdas',
        steps: [
          { id: u(), funcId: 'mdas-example', inputs: { expr: '4 + 8 ÷ 2 - 1 × 3' } },
        ],
      },
      {
        id: u(), title: 'Les parenthèses changent tout', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Parenthèses d\'abord', content: 'Sans parenthèses, $2 \\times 3 + 5 = 11$.|Avec des parenthèses, on calcule d\'abord ce qu\'elles contiennent :', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '2 × (3 + 5)' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Sans parenthèses, $2 \\times 3 + 5 = 11$.|Avec des parenthèses, $2 \\times (3 + 5) = [eq-result]$ : un tout autre résultat.' } },
        ],
      },
      {
        id: u(), title: 'La facture du magasin', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Au magasin', content: '3 cahiers à **4 $**, 2 stylos à **1,50 $** et un coupon de **5 $**.|$3 \\times 4 + 2 \\times 1{,}50 - 5$', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '3 × 4 + 2 × 1,5 - 5' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Les multiplications d\'abord, puis l\'addition et la soustraction.|Total à payer : **[eq-result] $**.' } },
        ],
      },
    ],
  },
  {
    id: 'reference-functions',
    emoji: '〰️',
    title: 'Reference Functions',
    desc: 'The distance to home as the absolute value |x − 2|, its a, h and k parameters on sliders, then an hourly parking rate as a step (floor) function with a point read on it',
    color: '#34d399',
    pages: [
      {
        id: u(), title: 'La distance jusqu\'à la maison', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Valeur absolue', content: 'Ta maison est à la position 2 sur la rue.|La distance entre toi et la maison est $\\lvert x - 2 \\rvert$ : jamais négative.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '-3', xMax: '7', yMin: '-1', yMax: '5' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sqrt((x - 2)^2)', id: 'd', hideLabel: '1' } },
          { id: u(), funcId: 'graph-name-func', inputs: { funcId: 'd', label: 'f(x) = |x − 2|', x0: '5' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '2', y: '0', id: 'm', funcId: 'd', label: 'Maison' } },
        ],
      },
      {
        id: u(), title: 'Les paramètres a, h et k', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Transformer le V', content: '$f(x) = a\\,\\lvert x - h \\rvert + k$|$h$ déplace le sommet à gauche ou à droite, $k$ en haut ou en bas.|$a$ ouvre, ferme ou retourne le V.', isList: 'false' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '|a| * sqrt((x - |h|)^2) + |k|', id: 'va' } },
          { id: u(), funcId: 'graph-adjust-view', inputs: { cx: '0', cy: '2', range: '10' } },
        ],
      },
      {
        id: u(), title: 'Le tarif de stationnement', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Partie entière', content: 'On paie **3 $** par heure **complète** de stationnement.|$f(x) = 3\\lfloor x \\rfloor$ : 2 h 30 compte comme 2 heures.', isList: 'false' } },
          { id: u(), funcId: 'graph-set-viewport', inputs: { xMin: '0', xMax: '6', yMin: '-1', yMax: '16' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '3 * floor(x)', id: 'tarif' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '2.5', y: '6', id: 'p', funcId: 'tarif', label: '2 h 30 → 6 $' } },
        ],
      },
    ],
  },
  {
    id: 'expand-factor',
    emoji: '🧩',
    title: 'Expand, Factor, Divide',
    desc: 'A garden enlarged to (x + 2)(x + 3) expanded into x² + 5x + 6, a triangle\'s perimeter reduced by collecting like terms, then a polynomial divided by a known factor (x − 1) in long division',
    color: '#84cc16',
    pages: [
      {
        id: u(), title: 'Agrandir un jardin', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Le jardin', content: 'Un jardin carré mesure $x$ m de côté. On l\'agrandit de **2 m** d\'un côté et de **3 m** de l\'autre.|Son aire : $(x + 2)(x + 3)$', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '(x+2)(x+3)' } },
          { id: u(), funcId: 'eq-distribute', inputs: { eq: '(x+2)(x+3)' } },
          { id: u(), funcId: 'eq-combine', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'Chaque terme de la première parenthèse multiplie chaque terme de la seconde.|Aire du nouveau jardin : $x^2 + 5x + 6$ m².' } },
        ],
      },
      {
        id: u(), title: 'Le périmètre d\'un triangle', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Réduire', content: 'Les côtés mesurent $3x + 5$, $x + 2$ et $2x - 1$.|On additionne les termes **semblables** : les $x$ ensemble, les nombres ensemble.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '3x + 5 + x + 2 + 2x - 1' } },
          { id: u(), funcId: 'eq-combine', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Trouver l\'autre facteur', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Factoriser', content: '$x = 1$ annule $x^3 - 2x^2 - 5x + 6$, donc $(x - 1)$ en est un **facteur**.|On divise pour trouver le reste de la factorisation.', isList: 'false' } },
          { id: u(), funcId: 'eq-polynomial-divide', inputs: { poly: 'x^3 - 2x^2 - 5x + 6', divisor: 'x - 1' } },
        ],
      },
    ],
  },
  {
    id: 'metric-relations',
    emoji: '🔺',
    title: 'Metric Relations and the Law of Cosines',
    desc: 'An access ramp as a right triangle whose altitude splits the hypotenuse into m and n, h computed from h² = m·n with their live lengths, then the law of cosines for the distance between two boats',
    color: '#f87171',
    pages: [
      {
        id: u(), title: 'La hauteur d\'une rampe', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Relations métriques', content: 'La hauteur $\\clr{purple}{h}$ issue de l\'angle droit coupe l\'hypoténuse en $\\clr{orange}{m}$ et $\\clr{green}{n}$.|$\\clr{purple}{h}^2 = \\clr{orange}{m} \\times \\clr{green}{n}$', isList: 'false' } },
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
        id: u(), title: 'Calculer la hauteur', layout: 'equation-3d',
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
        id: u(), title: 'La distance entre deux bateaux', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Deux bateaux', text: 'Ils quittent le port à 60° l\'un de l\'autre et parcourent 5 km et 8 km.|Quelle distance les sépare ?', side: 'left' } },
          { id: u(), funcId: 'geo3d-create-2d', inputs: { id: 't', type: 'triangle', a: '5', b: '8', c: '7' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 't', labels: '5 km,8 km,?' } },
          { id: u(), funcId: 'geo3d-mark-angle', inputs: { id: 't', markId: 'port', from: 'v0', vertex: 'v1', to: 'v2', color: 'orange', label: '60°' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|c| = sqrt(|a|^2 + |b|^2 - 2 * |a| * |b| * cos(|C|{orange}))' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'a=5,b=8,C=60' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'c' } },
          { id: u(), funcId: 'cmt-geo-edge', inputs: { text: 'c = [c]v km', shapeId: 't', edgeIndex: '2', color: 'orange' } },
        ],
      },
    ],
  },
  {
    id: 'solids-views',
    emoji: '🧊',
    title: 'Solids — Views and Missing Measure',
    desc: 'A cylindrical water tank with its r and h drawn as letters, the height needed for 62.83 m³ found from V = πr²h, then a building seen from the front, the top and the side',
    color: '#6ee7b7',
    pages: [
      {
        id: u(), title: 'Le réservoir d\'eau', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Réservoir cylindrique', content: 'Pour savoir combien d\'eau contient le réservoir, il faut son rayon $r$ et sa hauteur $h$.|$V = \\pi r^2 h$', isList: 'false' } },
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'c', type: 'cylinder', a: '2', b: '5' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'c', values: 'letters' } },
        ],
      },
      {
        id: u(), title: 'Quelle hauteur pour 62,83 m³ ?', layout: 'equation-3d',
        steps: [
          { id: u(), funcId: 'cmt-free', inputs: { title: 'Le problème', text: 'Le réservoir doit contenir $62{,}83\\text{ m}^3$ et son rayon mesure $2\\text{ m}$.|Quelle hauteur lui faut-il ?', side: 'left' } },
          { id: u(), funcId: 'geo3d-create', inputs: { id: 'c', type: 'cylinder', a: '2', b: '5' } },
          { id: u(), funcId: 'geo3d-show-volume-measures', inputs: { id: 'c', values: 'letters' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '|h| = |V| / (pi * |r|^2)' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { replacements: 'r=2,V=62.83' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Les vues d\'un bâtiment', layout: 'text-3d',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Vues d\'un solide', content: 'Un architecte dessine un bâtiment **de face**, **de dessus** et **de côté**.|Chaque vue montre deux des trois dimensions.', isList: 'false' } },
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
    desc: 'The Earth–Sun distance 1.5 × 10⁸ km written out in full, the product rule for powers of the same base checked by calculation, then two distances put on the same power of ten before they are added',
    color: '#eab308',
    pages: [
      {
        id: u(), title: 'La distance Terre-Soleil', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Un très grand nombre', content: 'La Terre est à environ $1{,}5 \\times 10^8$ km du Soleil.|Écrit au long, ça donne combien ?', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '1,5 x 10^8' } },
          { id: u(), funcId: 'eq-sci-expand', inputs: { side: 'left', index: '0' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: 'L\'exposant 8 déplace la virgule de **8 places** vers la droite.|La notation scientifique évite d\'écrire tous ces zéros.' } },
        ],
      },
      {
        id: u(), title: 'Multiplier des puissances', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Même base', content: '$2^3 \\times 2^4$ : on garde la base et on **additionne** les exposants.|$2^3 \\times 2^4 = 2^{3+4} = 2^7$', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '2^3 × 2^4' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$2^3 \\times 2^4 = 2^{3+4} = 2^7$|Vérification : le calcul donne [eq-result], et $2^7 = {{ 2^7 }}$.' } },
        ],
      },
      {
        id: u(), title: 'Additionner en notation scientifique', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: { boxId: 'q', title: 'Deux distances', content: '$4{,}45 \\times 10^4$ km $+$ $2{,}34 \\times 10^2$ km|On met d\'abord les deux nombres sur la **même puissance de 10**.', isList: 'false' } },
          { id: u(), funcId: 'eq-create', inputs: { eq: '4,45 x 10^4' } },
          { id: u(), funcId: 'eq-sci-expand', inputs: { side: 'left', index: '0', target: '2' } },
          { id: u(), funcId: 'text-fade-content', inputs: { boxId: 'q', content: '$4{,}45 \\times 10^4 = 445 \\times 10^2$|$445 \\times 10^2 + 2{,}34 \\times 10^2 = {{ 445 + 2.34 }} \\times 10^2$ km' } },
        ],
      },
    ],
  },
]
