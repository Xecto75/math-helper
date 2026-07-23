let _id = 0
const u = () => `ex${++_id}`

export const EXAMPLE_LESSONS = [

  /* ─── 1. Linear Equation ─────────────────────────────────────── */
  {
    id: 'linear-eq',
    emoji: '⚖️',
    title: 'Linear Equation',
    desc: 'Isolate x step by step — send terms across, divide',
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
          { id: u(), funcId: 'geo3d-create-2d',   inputs: { id: 'tri2', type: 'triangle', a: '7', b: '5.7', c: '7.8', color: 'purple' } },
          { id: u(), funcId: 'geo3d-set-view',    inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-show-angles', inputs: { id: 'tri2', color: 'yellow' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 'tri2', labels: 'a=7,b=?,c=7.8' } },
          { id: u(), funcId: 'eq-create',         inputs: { eq: 'b = 7 * sin(45) / sin(60)' } },
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
    title: 'Lines — Slope and Intercept',
    desc: 'f(x) = mx + b — plotting, finding m and b from two points',
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
      {
        id: u(), title: 'f(x) = 2x + 1 — slope and intercept', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 1', id: 'f1' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f1', label: 'f(x) = 2x + 1', x0: '0.5', y0: '3' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0', y: '1', id: 'yint', label: 'b = 1' } },
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'f(x) = 2x + 1' } },
        ],
      },
      {
        id: u(), title: 'Find the equation from two points', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-add-point', inputs: { x: '0', y: '2', id: 'pA', label: 'A(0,2)' } },
          { id: u(), funcId: 'graph-add-point', inputs: { x: '3', y: '8', id: 'pB', label: 'B(3,8)' } },
          { id: u(), funcId: 'cmt-free', inputs: {
            cmtId: 'formula', title: 'Slope',
            text: '$m = \\dfrac{y_2 - y_1}{x_2 - x_1}$', side: 'right', color: '',
          }},
          { id: u(), funcId: 'eq-create',      inputs: { eq: 'm = {{ ([pB]y - [pA]y) / ([pB]x - [pA]x) }}' } },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'm' } },
          { id: u(), funcId: 'cmt-update', inputs: { cmtId: 'formula', text: '$b = y_1 - m \\cdot x_1$' } },
          { id: u(), funcId: 'eq-create',      inputs: { eq: 'b = {{ [pA]y - [m]v * [pA]x }}' } },
          { id: u(), funcId: 'eq-save-result', inputs: { name: 'b' } },
          { id: u(), funcId: 'cmt-update', inputs: { cmtId: 'formula', text: '$y = mx + b$' } },
          { id: u(), funcId: 'eq-create',      inputs: { eq: 'y = [m]v*x + [b]v' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 2', id: 'line' } },
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

  /* ─── 14. Sine Function ────────────────────────────────────────── */
  {
    id: 'sine-function',
    emoji: '〰️',
    title: 'Sine Function',
    desc: 'f(x) = A·sin(B(x−C))+D — amplitude, period, and the midline',
    color: '#a78bfa',
    pages: [
      {
        id: u(), title: 'f(x) = A·sin(B(x−C))+D — drag to explore', layout: 'text-graph',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'The parameters A, B, C, and D',
            content: '$A$ is the amplitude — how far the curve goes above/below its midline.|$B$ changes the period: period $= 2\\pi / B$ — the larger $B$ is, the shorter the period.|$C$ shifts the curve left or right (phase shift).|$D$ shifts the curve up or down — it moves the midline to $y=D$.',
            isList: 'true',
          }},
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-4', yMax: '4' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '|A|*sin(|B|*(x-|C|))+|D|', id: 'explore', hideLabel: '1' } },
        ],
      },
      {
        id: u(), title: 'Key Features — Amplitude, Period, Midline', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-2', yMax: '5' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*sin(x) + 1', id: 'sinf' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'sinf', label: '2·sin(x) + 1', x0: '-1.8', y0: '2.6' } },
          { id: u(), funcId: 'graph-horizontal-line', inputs: { y: '1' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Midline', x: '-6', y: '1.4', color: 'gray' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: 'pi/2', y: '3', id: 'pmax', label: 'Max (π/2, 3)', showCoords: 'true' } },
          { id: u(), funcId: 'graph-add-segment',   inputs: { x1: '1.5708', y1: '1', x2: '1.5708', y2: '3', id: 'amp', color: 'green' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Amplitude = 2', x: '2.6', y: '2', color: 'green' } },
          { id: u(), funcId: 'graph-add-segment',   inputs: { x1: '-1.5708', y1: '-1.5', x2: '4.7124', y2: '-1.5', id: 'period', color: 'purple' } },
          { id: u(), funcId: 'cmt-graph', inputs: { text: 'Period = 2π', x: '1.5708', y: '-1.85', color: 'purple' } },
        ],
      },
    ],
  },

  /* ─── 15. Types of Two Lines ────────────────────────────────────── */
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

  /* ─── 16. Correlation ───────────────────────────────────────────── */
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
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["x (study hours)","y (score %)"],[1,55],[2,62],[3,68],[4,75],[5,82],[6,90]]',
            headerRow: 'true', gridId: 'etude1',
          }},
        ],
      },
      {
        id: u(), title: 'Scatter Plot — Positive Trend', layout: 'grid-graph',
        steps: [
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["x (study hours)","y (score %)"],[1,55],[2,62],[3,68],[4,75],[5,82],[6,90]]',
            headerRow: 'true', gridId: 'etude2',
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
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["x (study hours)","y (score %)"],[1,55],[2,62],[3,68],[4,75],[5,82],[6,90]]',
            headerRow: 'true', gridId: 'etude3',
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

  /* ─── 17. Mean Deviation ───────────────────────────────────────────── */
  {
    id: 'mean-deviation',
    emoji: '📶',
    title: 'Mean Deviation',
    desc: 'A measure of spread — mean absolute deviation from the average',
    color: '#f43f5e',
    pages: [
      {
        id: u(), title: 'The Data', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Mean Deviation',
            content: 'Mean deviation measures how spread out data is around the average.|The smaller the mean deviation, the more tightly clustered the data is around the average.',
            isList: 'true',
          }},
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["Runner","Time (min)"],["A",12],["B",15],["C",11],["D",14],["E",13]]',
            headerRow: 'true', gridId: 'temps1',
          }},
        ],
      },
      {
        id: u(), title: 'Calculate the Average', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',     inputs: { eq: 'M = (12 + 15 + 11 + 14 + 13) / 5' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Calculate the Mean Deviation', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["Runner","Time","Deviation |x - 13|"],["A",12,1],["B",15,2],["C",11,2],["D",14,1],["E",13,0]]',
            headerRow: 'true', gridId: 'dev1',
          }},
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'result', title: 'Result',
            content: '$\\text{M.D.} = \\dfrac{\\sum|x_i-\\bar{x}|}{n} = \\dfrac{1+2+2+1+0}{5} = 1.2$',
            isList: 'false',
          }},
        ],
      },
    ],
  },

  /* ─── 18. Measures of Central Tendency ──────────────────────────── */
  {
    id: 'central-tendency',
    emoji: '🎯',
    title: 'Measures of Central Tendency',
    desc: 'Mean, median, and mode — three ways to summarize data',
    color: '#38bdf8',
    pages: [
      {
        id: u(), title: 'Mean, Median, and Mode', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Three Measures',
            content: 'Mean: sum of the data divided by the number of data points.|Median: the middle value when data is in order.|Mode: the value that appears most often.',
            isList: 'true',
          }},
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["Student","Grade"],[1,65],[2,70],[3,70],[4,75],[5,80],[6,85],[7,90]]',
            headerRow: 'true', gridId: 'notes1',
          }},
        ],
      },
      {
        id: u(), title: 'Calculate the Mean', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',     inputs: { eq: 'M = (65 + 70 + 70 + 75 + 80 + 85 + 90) / 7' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Median and Mode', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'medmode', title: 'Median and Mode',
            content: 'The data is already in increasing order.|The median is the 4th value (the middle position): 75.|The mode is 70 (it appears 2 times).',
            isList: 'true',
          }},
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["Position","Grade"],[1,65],[2,70],[3,70],["4 (median)",75],[5,80],[6,85],[7,90]]',
            headerRow: 'true', gridId: 'notes2',
          }},
        ],
      },
    ],
  },

  /* ─── 19. Unit Conversion ─────────────────────────── */
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
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["km","hm","dam","m","dm","cm","mm"],[1000,100,10,1,0.1,0.01,0.001]]',
            headerRow: 'true', gridId: 'longueur1',
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
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["km²","hm²","dam²","m²","dm²","cm²","mm²"],[1000000,10000,100,1,0.01,0.0001,0.000001]]',
            headerRow: 'true', gridId: 'aire1',
          }},
        ],
      },
    ],
  },

  /* ─── 20. Quick Quiz — exercise pages demo ────────────── */
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
]
