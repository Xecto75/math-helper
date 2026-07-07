let _id = 0
const u = () => `ex${++_id}`

export const EXAMPLE_LESSONS = [

  /* ─── 1. Équation linéaire ─────────────────────────────────────── */
  {
    id: 'linear-eq',
    emoji: '⚖️',
    title: 'Équation linéaire',
    desc: 'Isoler x étape par étape — envoyer les termes, diviser',
    color: '#60a5fa',
    pages: [
      {
        id: u(), title: 'Résolution automatique : 4(x + 2) − 3 = 2x + 9', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',     inputs: { eq: '4(x + 2) - 3 = 2x + 9' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Résoudre : 2(x − 3) = x + 1', layout: 'single-equation',
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

  /* ─── 2. Équation quadratique ──────────────────────────────────── */
  {
    id: 'quadratic-eq',
    emoji: '📉',
    title: 'Équation quadratique',
    desc: 'Discriminant Δ = b² − 4ac et la formule quadratique',
    color: '#a78bfa',
    pages: [
      /* Page 1 — concept + formule */
      {
        id: u(), title: 'La formule quadratique', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Équation quadratique',
            content: 'Forme générale : $ax^2 + bx + c = 0$|On cherche les valeurs de $x$ qui annulent l\'équation — les **zéros**.',
            isList: 'false', color: 'purple',
          }},
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'formula', title: 'Formule quadratique',
            content: '$x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$',
            isList: 'false', color: 'amber',
          }},
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'cases', title: 'Discriminant $\\Delta = b^2 - 4ac$',
            content: '$\\Delta > 0$ → deux solutions réelles|$\\Delta = 0$ → une solution (double)|$\\Delta < 0$ → pas de solution réelle',
            isList: 'true', color: 'green',
          }},
        ],
      },
      /* Page 2 — résoudre x² − 5x + 6 = 0 */
      {
        id: u(), title: 'Résoudre : x² − 5x + 6 = 0', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'eq-create',        inputs: { eq: 'x^2 - 5x + 6 = 0' } },
          { id: u(), funcId: 'quadratic-solve',  inputs: {} },
        ],
      },
      /* Page 3 — résoudre 2x² + 3x − 2 = 0 */
      {
        id: u(), title: 'Résoudre : 2x² + 3x − 2 = 0', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'eq-create',        inputs: { eq: '2x^2 + 3x - 2 = 0' } },
          { id: u(), funcId: 'quadratic-solve',  inputs: {} },
        ],
      },
    ],
  },

  /* ─── 3. Système par substitution ─────────────────────────────── */
  {
    id: 'substitution',
    emoji: '🔄',
    title: 'Système par substitution',
    desc: 'Résoudre {y = 2x+1, x+y = 7} en substituant la 1ʳᵉ dans la 2ᵉ',
    color: '#34d399',
    pages: [
      {
        id: u(), title: 'Substituer y dans la 2ᵉ équation', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',          inputs: { eq: 'x + (2x + 1) = 7' } },
          { id: u(), funcId: 'eq-combine',         inputs: {} },
          { id: u(), funcId: 'eq-send-other-side', inputs: { term: '+1' } },
          { id: u(), funcId: 'eq-divide',          inputs: { divisor: '3' } },
        ],
      },
      {
        id: u(), title: 'Trouver y — solution finale', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'y = 2x + 1' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_x: '2' } },
        ],
      },
    ],
  },

  /* ─── 4. Loi des sinus ─────────────────────────────────────────── */
  {
    id: 'law-of-sines',
    emoji: '📐',
    title: 'Loi des sinus',
    desc: 'a/sinA = b/sinB = c/sinC — trouver un côté ou un angle',
    color: '#f87171',
    pages: [
      {
        id: u(), title: 'La formule', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',   inputs: { id: 'tri', type: 'triangle', a: '5', b: '7', c: '9', color: 'blue' } },
          { id: u(), funcId: 'geo3d-set-view',    inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-show-angles', inputs: { id: 'tri', color: 'yellow' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 'tri', labels: 'a=5,b=7,c=9' } },
          { id: u(), funcId: 'eq-create',         inputs: { eq: 'a/sin(A) = b/sin(B) = c/sin(C)' } },
        ],
      },
      {
        id: u(), title: 'Trouver b : a=7, A=60°, B=45°', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create', inputs: { eq: '7/sin(60) = b/sin(45)' } },
        ],
      },
    ],
  },

  /* ─── 5. Pythagore ─────────────────────────────────────────────── */
  {
    id: 'pythagoras',
    emoji: '📐',
    title: 'Théorème de Pythagore',
    desc: 'a² + b² = c² — trouver l\'hypoténuse ou un côté manquant',
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
        id: u(), title: 'Trouver le côté manquant', layout: 'geo-equation',
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

  /* ─── 6. Aires diverses ────────────────────────────────────────── */
  {
    id: 'areas',
    emoji: '🔷',
    title: 'Aires diverses',
    desc: 'Trapèze A=(B+b)h/2, cercle A=πr² — formules et calculs',
    color: '#10b981',
    pages: [
      {
        id: u(), title: 'Aire d\'un trapèze', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',    inputs: { id: 'trap', type: 'trapeze', a: '6', b: '4', c: '3', color: 'teal' } },
          { id: u(), funcId: 'geo3d-set-view',     inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-label-sides',  inputs: { id: 'trap', labels: 'B=6,b=4,,h=3' } },
          { id: u(), funcId: 'eq-create',          inputs: { eq: 'A = (B + b) * h / 2' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_B: '6', var_b: '4', var_h: '3' } },
        ],
      },
      {
        id: u(), title: 'Aire d\'un cercle', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',    inputs: { id: 'circ', type: 'circle', a: '4', color: 'orange' } },
          { id: u(), funcId: 'geo3d-set-view',     inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-label-sides',  inputs: { id: 'circ', labels: 'r=4' } },
          { id: u(), funcId: 'eq-create',          inputs: { eq: 'A = pi * r^2' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_r: '4' } },
        ],
      },
    ],
  },

  /* ─── 7. Volumes ───────────────────────────────────────────────── */
  {
    id: 'volumes',
    emoji: '📦',
    title: 'Volumes divers',
    desc: 'Prisme V=lwh, cylindre V=πr²h — formules et calculs',
    color: '#f59e0b',
    pages: [
      {
        id: u(), title: 'Volume du prisme rectangle', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'V = l * w * h' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_l: '5', var_w: '3', var_h: '4' } },
        ],
      },
      {
        id: u(), title: 'Volume du cylindre', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'V = pi * r^2 * h' } },
          { id: u(), funcId: 'eq-replace-variable', inputs: { var_r: '3', var_h: '5' } },
        ],
      },
    ],
  },

  /* ─── 8. Périmètre ─────────────────────────────────────────────── */
  {
    id: 'perimeters',
    emoji: '📏',
    title: 'Périmètre',
    desc: 'Trapèze P=somme des côtés, cercle C=2πr — formules',
    color: '#06b6d4',
    pages: [
      {
        id: u(), title: 'Périmètre d\'un trapèze', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',   inputs: { id: 'trap', type: 'trapeze', a: '8', b: '5', c: '4', color: 'cyan' } },
          { id: u(), funcId: 'geo3d-set-view',    inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-label-sides', inputs: { id: 'trap' } },
          { id: u(), funcId: 'eq-create',         inputs: { eq: 'P = a + b + c + d' } },
        ],
      },
      {
        id: u(), title: 'Circonférence d\'un cercle', layout: 'geo-equation',
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
    title: 'Trigonométrie SOH CAH TOA',
    desc: 'sin, cos, tan dans un triangle rectangle — définitions et inverse',
    color: '#fb923c',
    pages: [
      {
        id: u(), title: 'SOH — sin θ = opp / hyp', layout: 'geo-equation',
        steps: [
          { id: u(), funcId: 'geo3d-create-2d',       inputs: { id: 'tri', type: 'right-triangle', a: '3', b: '4', color: 'blue' } },
          { id: u(), funcId: 'geo3d-set-view',        inputs: { zoom: '1.5', duration: '0.3' } },
          { id: u(), funcId: 'geo3d-label-sides',     inputs: { id: 'tri', labels: 'adj=3,opp=4,hyp=5' } },
          { id: u(), funcId: 'geo3d-highlight-angle', inputs: { id: 'tri', angleIndex: '0', color: 'yellow' } },
          { id: u(), funcId: 'eq-create',             inputs: { eq: 'sin(theta) = opp / hyp = 4/5 = 0.8' } },
        ],
      },
      {
        id: u(), title: 'Trouver l\'angle — trig inverse', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',             inputs: { eq: 'sin(theta) = 0.8' } },
          { id: u(), funcId: 'eq-apply-inverse-trig', inputs: { trig: 'sin' } },
        ],
      },
    ],
  },

  /* ─── 10. Droites — pente et ordonnée ──────────────────────────── */
  {
    id: 'linear-functions',
    emoji: '📈',
    title: 'Droites — pente et ordonnée',
    desc: 'f(x) = mx + b — tracer, trouver m et b à partir de deux points',
    color: '#4ade80',
    pages: [
      {
        id: u(), title: 'f(x) = 2x + 1 — pente et ordonnée', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 1', id: 'f1' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f1', label: 'f(x) = 2x + 1', x0: '0.5', y0: '3' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0', y: '1', id: 'yint', label: 'b = 1' } },
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'f(x) = 2x + 1' } },
        ],
      },
      {
        id: u(), title: 'Trouver m et b — A(0,2) et B(3,8)', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '0', y: '2', id: 'pA', label: 'A(0,2)' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '3', y: '8', id: 'pB', label: 'B(3,8)' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 2', id: 'line' } },
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'm = (8 - 2) / (3 - 0) = 2' } },
        ],
      },
    ],
  },

  /* ─── 11. Cercle trigonométrique ───────────────────────────────── */
  {
    id: 'unit-circle',
    emoji: '🔵',
    title: 'Cercle trigonométrique',
    desc: 'x = cos θ, y = sin θ — angles cardinaux et angles 30/45/60°',
    color: '#60a5fa',
    pages: [
      {
        id: u(), title: 'Le cercle unité', layout: 'single-graph',
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
      {
        id: u(), title: 'Angles remarquables — 30°, 45°, 60°', layout: 'single-graph',
        steps: [
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

  /* ─── 12. Fonction parabole ─────────────────────────────────────── */
  {
    id: 'parabola',
    emoji: '🔼',
    title: 'Fonction parabole',
    desc: 'f(x) = ax²+bx+c — racines, sommet, forme vertex',
    color: '#f472b6',
    pages: [
      {
        id: u(), title: 'Racines et sommet', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'x^2 - 4*x + 3', id: 'par' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'par', label: 'x² − 4x + 3', x0: '3', y0: '2' } },
          { id: u(), funcId: 'graph-mark-roots',    inputs: { funcId: 'par' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '2', y: '-1', id: 'vert', label: 'sommet' } },
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'f(x) = x^2 - 4x + 3' } },
        ],
      },
      {
        id: u(), title: 'Forme vertex a(x − h)² + k', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '(x-2)^2 - 1', id: 'vf' } },
          { id: u(), funcId: 'graph-add-point',     inputs: { x: '2', y: '-1', id: 'h', label: 'sommet (2,−1)' } },
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'f(x) = (x - 2)^2 - 1' } },
        ],
      },
    ],
  },

  /* ─── 13. Fonction exponentielle ───────────────────────────────── */
  {
    id: 'exponential',
    emoji: '🚀',
    title: 'Fonction exponentielle',
    desc: 'f(x) = aˣ — croissance, décroissance et transformations',
    color: '#fb923c',
    pages: [
      {
        id: u(), title: 'f(x) = 2ˣ — croissance', layout: 'graph-equation',
        steps: [
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-3', xMax: '5', yMin: '-1', yMax: '20' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2^x', id: 'exp' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'exp', label: '2ˣ', x0: '2', y0: '8' } },
          { id: u(), funcId: 'eq-create',           inputs: { eq: 'f(x) = 2^x' } },
        ],
      },
      {
        id: u(), title: 'Glissement et étirement', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-3', xMax: '5', yMin: '-1', yMax: '20' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2^x',     id: 'base' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2^(x-2)', id: 'shift' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '3*2^x',   id: 'stretch' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'base',    label: '2ˣ',      x0: '3', y0: '10' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'shift',   label: '2^(x−2)', x0: '4', y0: '5' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'stretch', label: '3·2ˣ',    x0: '2', y0: '16' } },
        ],
      },
    ],
  },

  /* ─── 14. Fonction sinus ────────────────────────────────────────── */
  {
    id: 'sine-function',
    emoji: '〰️',
    title: 'Fonction sinus',
    desc: 'f(x) = A·sin(Bx) — période, amplitude et transformations',
    color: '#a78bfa',
    pages: [
      {
        id: u(), title: 'f(x) = sin(x) — période et amplitude', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-2', yMax: '2' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(x)', id: 'sinf' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'sinf', label: 'sin(x)', x0: '1.5', y0: '1.2' } },
          { id: u(), funcId: 'graph-mark-roots',    inputs: { funcId: 'sinf' } },
        ],
      },
      {
        id: u(), title: 'A·sin(Bx) — amplitude et période', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-set-viewport',  inputs: { xMin: '-7', xMax: '7', yMin: '-3', yMax: '3' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(x)',   id: 'base' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*sin(x)', id: 'amp2' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: 'sin(2*x)', id: 'per2' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'base', label: 'sin(x)',   x0: '1.5', y0: '1.1' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'amp2', label: '2·sin(x)', x0: '1.5', y0: '2.2' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'per2', label: 'sin(2x)',  x0: '0.8', y0: '-1.2' } },
        ],
      },
    ],
  },

  /* ─── 15. Types de 2 droites ────────────────────────────────────── */
  {
    id: 'line-types',
    emoji: '✏️',
    title: 'Types de 2 droites',
    desc: 'Parallèles (même pente), sécantes — trouver l\'intersection',
    color: '#6ee7b7',
    pages: [
      {
        id: u(), title: 'Droites parallèles — même pente', layout: 'single-graph',
        steps: [
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x + 1', id: 'f1' } },
          { id: u(), funcId: 'graph-plot-function', inputs: { expr: '2*x - 2', id: 'f2' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f1', label: 'f₁ = 2x+1', x0: '0.5', y0: '3' } },
          { id: u(), funcId: 'graph-name-func',     inputs: { funcId: 'f2', label: 'f₂ = 2x−2', x0: '0.5', y0: '-1' } },
        ],
      },
      {
        id: u(), title: 'Droites sécantes — trouver l\'intersection', layout: 'graph-equation',
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

  /* ─── 16. Corrélation ───────────────────────────────────────────── */
  {
    id: 'correlation',
    emoji: '📊',
    title: 'Corrélation',
    desc: 'Nuage de points et coefficient r — lien entre deux variables',
    color: '#eab308',
    pages: [
      {
        id: u(), title: 'Qu\'est-ce que la corrélation?', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'La corrélation',
            content: 'La corrélation mesure le lien entre deux variables.|Corrélation positive : quand $x$ augmente, $y$ augmente aussi.|Corrélation négative : quand $x$ augmente, $y$ diminue.|Aucune corrélation : pas de lien clair entre les deux.',
            isList: 'true',
          }},
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["x (heures d\'étude)","y (note %)"],[1,55],[2,62],[3,68],[4,75],[5,82],[6,90]]',
            headerRow: 'true', gridId: 'etude1',
          }},
        ],
      },
      {
        id: u(), title: 'Nuage de points — tendance positive', layout: 'grid-graph',
        steps: [
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["x (heures d\'étude)","y (note %)"],[1,55],[2,62],[3,68],[4,75],[5,82],[6,90]]',
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
        id: u(), title: 'Le coefficient de corrélation r', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'formula', title: 'Coefficient r',
            content: '$r = \\dfrac{\\sum (x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2 \\sum (y_i-\\bar{y})^2}}$|$r$ est toujours entre $-1$ et $1$.',
            isList: 'true',
          }},
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'interp', title: 'Interprétation',
            content: '$r$ proche de $1$ : forte corrélation positive|$r$ proche de $-1$ : forte corrélation négative|$r$ proche de $0$ : aucune corrélation|Ici : $r \\approx 0.99$ → très forte corrélation positive',
            isList: 'true',
          }},
          { id: u(), funcId: 'eq-create', inputs: { eq: 'r = 0.99' } },
        ],
      },
    ],
  },

  /* ─── 17. Écart moyen ───────────────────────────────────────────── */
  {
    id: 'mean-deviation',
    emoji: '📶',
    title: 'Écart moyen',
    desc: 'Mesure de dispersion — écart absolu moyen autour de la moyenne',
    color: '#f43f5e',
    pages: [
      {
        id: u(), title: 'Les données', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'L\'écart moyen',
            content: 'L\'écart moyen mesure la dispersion des données autour de la moyenne.|Plus l\'écart moyen est petit, plus les données sont regroupées autour de la moyenne.',
            isList: 'true',
          }},
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["Coureur","Temps (min)"],["A",12],["B",15],["C",11],["D",14],["E",13]]',
            headerRow: 'true', gridId: 'temps1',
          }},
        ],
      },
      {
        id: u(), title: 'Calculer la moyenne', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',     inputs: { eq: 'M = (12 + 15 + 11 + 14 + 13) / 5' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Calculer l\'écart moyen', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["Coureur","Temps","Écart |x - 13|"],["A",12,1],["B",15,2],["C",11,2],["D",14,1],["E",13,0]]',
            headerRow: 'true', gridId: 'dev1',
          }},
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'result', title: 'Résultat',
            content: '$\\text{É.M.} = \\dfrac{\\sum|x_i-\\bar{x}|}{n} = \\dfrac{1+2+2+1+0}{5} = 1.2$',
            isList: 'false',
          }},
        ],
      },
    ],
  },

  /* ─── 18. Mesures de tendance centrale ──────────────────────────── */
  {
    id: 'central-tendency',
    emoji: '🎯',
    title: 'Mesures de tendance centrale',
    desc: 'Moyenne, médiane et mode — trois façons de résumer des données',
    color: '#38bdf8',
    pages: [
      {
        id: u(), title: 'Moyenne, médiane et mode', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Trois mesures',
            content: 'Moyenne : somme des données divisée par le nombre de données.|Médiane : valeur du milieu quand les données sont en ordre.|Mode : valeur qui apparaît le plus souvent.',
            isList: 'true',
          }},
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["Élève","Note"],[1,65],[2,70],[3,70],[4,75],[5,80],[6,85],[7,90]]',
            headerRow: 'true', gridId: 'notes1',
          }},
        ],
      },
      {
        id: u(), title: 'Calculer la moyenne', layout: 'single-equation',
        steps: [
          { id: u(), funcId: 'eq-create',     inputs: { eq: 'M = (65 + 70 + 70 + 75 + 80 + 85 + 90) / 7' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Médiane et mode', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'medmode', title: 'Médiane et mode',
            content: 'Les données sont déjà en ordre croissant.|La médiane est la 4ᵉ valeur (position du milieu) : 75.|Le mode est 70 (il apparaît 2 fois).',
            isList: 'true',
          }},
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["Position","Note"],[1,65],[2,70],[3,70],["4 (médiane)",75],[5,80],[6,85],[7,90]]',
            headerRow: 'true', gridId: 'notes2',
          }},
        ],
      },
    ],
  },

  /* ─── 19. Conversion d'unités de mesure ─────────────────────────── */
  {
    id: 'unit-conversion',
    emoji: '🧮',
    title: 'Conversion d\'unités de mesure',
    desc: 'km, hm, dam, m, dm, cm, mm — et les unités d\'aire (km²)',
    color: '#84cc16',
    pages: [
      {
        id: u(), title: 'Unités de longueur', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'intro', title: 'Unités de longueur',
            content: 'Chaque unité vaut 10 fois la suivante.|Pour convertir, on déplace la virgule d\'une position par unité.',
            isList: 'true',
          }},
          { id: u(), funcId: 'table-create', inputs: {
            data: '[["km","hm","dam","m","dm","cm","mm"],[1000,100,10,1,0.1,0.01,0.001]]',
            headerRow: 'true', gridId: 'longueur1',
          }},
        ],
      },
      {
        id: u(), title: 'Convertir 3.45 km en m', layout: 'text-equation',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'method', title: 'Méthode',
            content: 'Du km au m, on saute 3 positions vers la droite (km → hm → dam → m).|On déplace donc la virgule de 3 positions vers la droite.',
            isList: 'true',
          }},
          { id: u(), funcId: 'eq-create',     inputs: { eq: 'm = 3.45 * 1000' } },
          { id: u(), funcId: 'eq-full-solve', inputs: {} },
        ],
      },
      {
        id: u(), title: 'Unités d\'aire (km²)', layout: 'text-grid',
        steps: [
          { id: u(), funcId: 'text-create', inputs: {
            boxId: 'aire', title: 'Unités d\'aire',
            content: 'Pour les unités d\'aire, chaque unité vaut 100 fois la suivante (pas 10!).|Ex : 1 km² = 100 hm² = 10 000 dam² = 1 000 000 m².',
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
]
