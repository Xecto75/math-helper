/**
 * Function registry — every animation the system can play.
 *
 * status: 'ready'  = wired up and demoed here
 *         'soon'   = placeholder, not yet implemented
 *         'legacy' = fully working, but hidden from "Add function" — only
 *                    reachable by old saved lessons that already use it (e.g.
 *                    the pre-Three.js SVG shape engine, kept for backward
 *                    compat but not selectable on any new page/layout)
 *
 * For 'ready' functions the `inputs[].default` field pre-fills a working
 * example so you can hit Lancer immediately.
 */

export const CATEGORIES = [

  // ── Équation ─────────────────────────────────────────────────────────────
  // Individual animations from the equation engine, each independently testable.
  {
    id: 'equation',
    label: 'Équation',
    defaultOpen: true,
    functions: [
      {
        id:          'eq-create',
        label:       'Create Equation',
        description: 'Display an equation for the first time',
        status:      'ready',
        inputs: [
          {
            id: 'eq', label: 'Equation', type: 'text',
            placeholder: '3x + 5 = 14', default: '3x + 5 = 14',
          },
        ],
      },
      {
        id:          'eq-combine',
        label:       'Combine Terms',
        description: 'Auto-merge like terms on the current equation',
        status:      'ready',
        inputs:      [],
      },
      {
        id:          'eq-distribute',
        label:       'Distribute',
        description: 'Expand parentheses: 2(x+3) → 2x+6',
        status:      'ready',
        inputs: [
          {
            id:          'eq',
            label:       'Équation',
            type:        'text',
            placeholder: '2(x + 3) = 10',
            default:     '2(x + 3) = 10',
          },
        ],
      },
      {
        id:          'eq-send-other-side',
        label:       'Send to Other Side',
        description: 'Move a specific term to the other side (e.g. -1, 3x, x/2)',
        status:      'ready',
        inputs: [
          {
            id:          'term',
            label:       'Term index (0 = first term, left→right)',
            type:        'number',
            placeholder: '0',
            default:     0,
          },
        ],
      },
      {
        id:          'eq-reorder',
        label:       'Reorder',
        description: 'Auto-group like terms so they are adjacent',
        status:      'ready',
        inputs:      [],
      },
      {
        id:          'eq-divide',
        label:       'Divide Both Sides',
        description: 'Draw a division line and simplify every term',
        status:      'ready',
        inputs: [
          {
            id:      'divisor',
            label:   'Diviseur',
            type:    'number',
            default: 2,
            min:     1,
          },
        ],
      },
      {
        id:          'eq-replace-variable',
        label:       'Replace Variable',
        description: 'Fade symbolic letters and replace with numeric values — equation must already be on the page',
        status:      'ready',
        inputs: [
          { id: 'replacements', label: 'Replacements (a=v,b=v,...)', type: 'text', default: 'a=2,b=-3,c=1', placeholder: 'a=2,b=-3,c=1' },
        ],
      },
      {
        id:          'eq-full-solve',
        label:       'Full Solve (step-by-step)',
        description: 'Animate the equation solving itself: combine, send to the other side, divide. Never jumps to the answer. Works on the equation currently on the page.',
        status:      'ready',
        inputs:      [],
      },
      {
        id:          'quadratic-solve',
        label:       'Quadratic Solve',
        description: 'Solve ax² + bx + c = 0 step-by-step: highlights a, b, c, shows the quadratic formula with substituted values, discriminant, and both solutions.',
        status:      'ready',
        inputs:      [],
      },
      {
        id:          'eq-racine-des-bords',
        label:       'Square Root Both Sides',
        description: 'Show √ on both sides, remove ², replace constant with its square root',
        status:      'ready',
        inputs: [
          { id: 'eq', label: 'Equation', type: 'text', default: 'x^2 = 4', placeholder: 'x^2 = 9' },
        ],
      },
      {
        id:          'eq-apply-inverse-trig',
        label:       'Apply Inverse Trig',
        // arcsin / arccos / arctan (also written sin⁻¹, cos⁻¹, tan⁻¹) is the REVERSE of a
        // trig function.  If sin(θ) = 0.8 then arcsin(0.8) = θ ≈ 53.13°.
        // Visually: arcXXX() wraps appear on BOTH sides, the trig side cancels
        // (arcsin(sin(θ)) → θ), and the numeric/fraction side resolves to the angle.
        description: 'Wrap both sides in arcsin / arccos / arctan — cancels the trig function and computes the angle. Equation must already be on the page.',
        status:      'ready',
        inputs: [
          {
            id: 'trig', label: 'Function', type: 'select', default: 'sin',
            options: [
              { value: 'sin', label: 'arcsin  (sin⁻¹)' },
              { value: 'cos', label: 'arccos  (cos⁻¹)' },
              { value: 'tan', label: 'arctan  (tan⁻¹)' },
            ],
          },
        ],
      },
      {
        id:          'eq-disparition-exposant',
        label:       'Change Exponent',
        description: 'Fade the current exponent and fade in the new one (degree 0 or negative stay explicit)',
        status:      'ready',
        inputs: [
          { id: 'eq',        label: 'Equation',   type: 'text',   default: '3x^2 = 9', placeholder: '5x^3 = 40' },
          { id: 'newDegree', label: 'New degree', type: 'number', default: 1 },
        ],
      },
    ],
  },


  // ── Tables ────────────────────────────────────────────────────────────────
  {
    id: 'tableaux',
    label: 'Tables',
    defaultOpen: false,
    functions: [
      {
        id: 'table-create', label: 'Create Table',
        description: 'Simplest way to make a table — give one 2D array, size is auto-detected (no need to also specify rows/cols)',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'data', label: 'Data (2D array)', type: 'text',
            default: '[[2,2,3],[5,5,6],[4,4,4]]',
            placeholder: '[[2,2,3],[5,5,6],[4,4,4]]' },
          { id: 'headerRow', label: 'First row is a header', type: 'select', default: 'false',
            options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] },
          { id: 'gridId', label: 'Table ID', type: 'text', default: 'table1' },
          { id: 'color',  label: 'Line color (optional)', type: 'color-name', default: '' },
        ],
      },
      {
        id: 'tab-create-grid', label: 'createGrid',
        description: 'Create an animated grid with values',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId',    label: 'Grid ID',  type: 'text',   default: 'grid1', placeholder: 'grid1' },
          { id: 'cols',      label: 'Columns',  type: 'number', default: 3,   min: 1, max: 12 },
          { id: 'rows',      label: 'Rows',     type: 'number', default: 4,   min: 1, max: 20 },
          { id: 'headerRow', label: 'Header row', type: 'select', default: 'true',
            options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
          { id: 'values',    label: 'Values (rows by |, cols by ,)',
            type: 'text',
            default: 'Name,Age,Score|Alice,25,95|Bob,30,87|Carol,22,91',
            placeholder: 'A,B,C|1,2,3|4,5,6' },
        ],
      },
      {
        id: 'tab-erase-grid', label: 'eraseGrid',
        description: 'Fade out and remove the grid',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId', label: 'Grid', type: 'grid-id', default: '' },
        ],
      },
      {
        id: 'tab-add-column', label: 'addColumn',
        description: 'Append a new column to the right',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId', label: 'Grid', type: 'grid-id', default: '' },
          { id: 'values', label: 'Column values (comma-separated, top to bottom)',
            type: 'text', default: 'Grade,A,B+,A-', placeholder: 'Header,v1,v2,v3' },
        ],
      },
      {
        id: 'tab-remove-column', label: 'removeColumn',
        description: 'Remove a column by index (0 = first, -1 = last)',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId',   label: 'Grid',                     type: 'grid-id', default: '' },
          { id: 'colIndex', label: 'Column index (-1 = last)', type: 'number',  default: -1 },
        ],
      },
      {
        id: 'tab-add-row', label: 'addRow',
        description: 'Append a new row at the bottom',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId', label: 'Grid', type: 'grid-id', default: '' },
          { id: 'values', label: 'Row values (comma-separated)',
            type: 'text', default: 'Dave,28,88', placeholder: 'val1,val2,val3' },
        ],
      },
      {
        id: 'tab-remove-row', label: 'removeRow',
        description: 'Remove a row by index (0 = first, -1 = last)',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId',   label: 'Grid',                  type: 'grid-id', default: '' },
          { id: 'rowIndex', label: 'Row index (-1 = last)', type: 'number',  default: -1 },
        ],
      },
      {
        id: 'tab-change-value', label: 'changeValue',
        description: 'Update a single cell with a fade transition',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId', label: 'Grid',           type: 'grid-id', default: '' },
          { id: 'col',    label: 'Column (0-based)', type: 'number', default: 2 },
          { id: 'row',    label: 'Row (0-based)',    type: 'number', default: 1 },
          { id: 'value',  label: 'New value',        type: 'text',   default: '100' },
        ],
      },
      {
        id: 'tab-change-values', label: 'changeValues',
        description: 'Update multiple cells simultaneously',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId',  label: 'Grid', type: 'grid-id', default: '' },
          { id: 'changes', label: 'Changes (col,row,value per entry, separated by |)',
            type: 'text', default: '2,1,100|2,2,95|2,3,98',
            placeholder: 'col,row,value|col,row,value' },
        ],
      },
    ],
  },

  // ── Graphiques ────────────────────────────────────────────────────────────
  // Desmos graphing engine functions — each independently testable.
  {
    id: 'graphiques',
    label: 'Graphiques',
    defaultOpen: false,
    functions: [
      {
        id: 'graph-plot-function',
        label: 'plotFunction',
        description: 'Trace f(x) sur le graphique — étiquette "f(x) = …" (ou g/h/…) affichée automatiquement, sauf si masquée',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'expr', label: 'f(x)', type: 'text', default: 'x^2 - 2*x - 1', placeholder: 'ex: x^2 + 1' },
          { id: 'id',   label: 'ID (optionnel)', type: 'text', default: '', placeholder: 'auto' },
          { id: 'hideLabel', label: 'Hide label', type: 'select', default: '0',
            options: [
              { value: '0', label: 'Show (default)' },
              { value: '1', label: 'Hide' },
            ] },
        ],
      },
      {
        id: 'graph-remove-function',
        label: 'removeFunction',
        description: 'Supprime une fonction existante (+ ses étiquettes et tangentes)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Fonction', type: 'func-id', default: '' },
        ],
      },
      {
        id: 'graph-shade-area',
        label: 'shadeUnderCurve',
        description: 'Ombre l\'aire sous une courbe existante entre x = a et x = b',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Fonction', type: 'func-id', default: '' },
          { id: 'a',      label: 'a',        type: 'number',  default: 0 },
          { id: 'b',      label: 'b',        type: 'number',  default: 3 },
        ],
      },
      {
        id: 'graph-find-intersections',
        label: 'findIntersections',
        description: 'Marque le(s) point(s) d\'intersection de f et g',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'f1', label: 'f(x)', type: 'func-id', default: '' },
          { id: 'f2', label: 'g(x)', type: 'func-id', default: '' },
        ],
      },
      {
        id: 'graph-add-point',
        label: 'addPoint',
        description: 'Place un point (x, y) — donne un ID unique pour en garder plusieurs',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'x', label: 'x', type: 'text', default: '2', placeholder: '2  or  sqrt(3)/2  or  pi/4' },
          { id: 'y', label: 'y', type: 'text', default: '3', placeholder: '-sqrt(3)/2  or  pi  etc.' },
          { id: 'id',         label: 'Point ID (blank = auto)', type: 'text', default: '', placeholder: 'e.g. pA' },
          { id: 'funcId',     label: 'Color from func (optional)', type: 'text', default: '', placeholder: 'e.g. f → curve color, darker' },
          { id: 'label',      label: 'Angle label (inside)', type: 'text', default: '', placeholder: 'e.g. 30°' },
          { id: 'showCoords', label: 'Show coords outside', type: 'text', default: 'false', placeholder: 'true / false' },
        ],
      },
      {
        id: 'graph-remove-point',
        label: 'removePoint',
        description: 'Supprime un point par son ID',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'id', label: 'Point ID', type: 'text', default: '', placeholder: 'same ID used in addPoint' },
        ],
      },
      {
        id: 'graph-scatter-plot',
        label: 'scatterPlot',
        description: 'Nuage de points dispersés autour de y = pente·x + ordonnée — coeff contrôle la dispersion (0 = tous sur la droite)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'slope',     label: 'Pente (m)',       type: 'number', default: 1 },
          { id: 'intercept', label: 'Ordonnée à l\'origine (b)', type: 'number', default: 0 },
          { id: 'coeff',     label: 'Dispersion (coefficient)', type: 'number', default: 1 },
          { id: 'count',     label: 'Nombre de points', type: 'number', default: 20 },
          { id: 'xMin',      label: 'x min', type: 'number', default: -5 },
          { id: 'xMax',      label: 'x max', type: 'number', default: 5 },
          { id: 'color',     label: 'Couleur (optionnel)', type: 'color-name', default: '' },
          { id: 'id',        label: 'ID', type: 'text', default: 'nuage1' },
        ],
      },
      {
        id: 'graph-remove-scatter-plot',
        label: 'removeScatterPlot',
        description: 'Supprime un nuage de points par son ID',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'nuage1' },
        ],
      },
      {
        id: 'graph-add-segment',
        label: 'addSegment',
        description: 'Trace un segment de droite FINI entre deux points (pas une droite infinie)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'x1', label: 'x1', type: 'number', default: 0 },
          { id: 'y1', label: 'y1', type: 'number', default: 0 },
          { id: 'x2', label: 'x2', type: 'number', default: 4 },
          { id: 'y2', label: 'y2', type: 'number', default: 0 },
          { id: 'color', label: 'Couleur (optionnel)', type: 'color-name', default: '' },
          { id: 'id', label: 'ID', type: 'text', default: 'seg1' },
        ],
      },
      {
        id: 'graph-remove-segment',
        label: 'removeSegment',
        description: 'Supprime un segment par son ID',
        status: 'ready', useGraph: true,
        inputs: [{ id: 'id', label: 'ID', type: 'text', default: 'seg1' }],
      },
      {
        id: 'graph-segment-tick',
        label: 'segmentTick',
        description: 'Marque de côtés égaux (1 à 3 tirets perpendiculaires) au milieu d\'un segment — change le nombre pour marquer une autre paire égale',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'id',    label: 'Segment ID', type: 'text',   default: 'seg1' },
          { id: 'ticks', label: 'Nombre de tirets (1-3)', type: 'number', default: 1, min: 1, max: 3 },
          { id: 'color', label: 'Couleur', type: 'color-name', default: 'blue' },
        ],
      },
      {
        id: 'graph-remove-segment-tick',
        label: 'removeSegmentTick',
        description: 'Supprime la marque de côté égal d\'un segment',
        status: 'ready', useGraph: true,
        inputs: [{ id: 'id', label: 'Segment ID', type: 'text', default: 'seg1' }],
      },
      {
        id: 'graph-divide-segment',
        label: 'divideSegment',
        description: 'Marque les points de partage qui séparent un segment en N sections égales',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'id',    label: 'Segment ID', type: 'text', default: 'seg1' },
          { id: 'parts', label: 'Sections (N)', type: 'number', default: 2, min: 2 },
          { id: 'color', label: 'Couleur', type: 'color-name', default: 'purple' },
          { id: 'showLabels', label: 'Afficher les étiquettes (P1, P2…)', type: 'select', default: 'false',
            options: [{ value: 'false', label: 'Non' }, { value: 'true', label: 'Oui' }] },
        ],
      },
      {
        id: 'graph-remove-divide-segment',
        label: 'removeDivideSegment',
        description: 'Supprime les points de partage d\'un segment',
        status: 'ready', useGraph: true,
        inputs: [{ id: 'id', label: 'Segment ID', type: 'text', default: 'seg1' }],
      },
      {
        id: 'graph-adjust-view',
        label: 'adjustView',
        description: 'Centre le graphique sur (cx, cy), plage visible = range',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'cx',    label: 'Centre x', type: 'number', default: 0 },
          { id: 'cy',    label: 'Centre y', type: 'number', default: 0 },
          { id: 'range', label: 'Range',    type: 'number', default: 10, min: 0.1 },
        ],
      },
      {
        id: 'graph-set-viewport',
        label: 'setViewport',
        description: 'Définit les limites visibles du graphique',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'xMin', label: 'xMin', type: 'number', default: -5 },
          { id: 'xMax', label: 'xMax', type: 'number', default:  5 },
          { id: 'yMin', label: 'yMin', type: 'number', default: -4 },
          { id: 'yMax', label: 'yMax', type: 'number', default:  4 },
        ],
      },
      {
        id: 'graph-name-func',
        label: 'nameFunc',
        description: 'Affiche une étiquette flottante sur une courbe déjà tracée',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Fonction',    type: 'func-id' , default: '' },
          { id: 'label',  label: 'Étiquette',   type: 'text',    default: 'f(x)' },
          { id: 'x0',     label: 'x₀',          type: 'number',  default: 3 },
          { id: 'y0',     label: 'y₀ (optionnel)', type: 'number', default: '', placeholder: 'auto' },
        ],
      },
      {
        id: 'graph-tangent',
        label: 'tangent',
        description: 'Trace la tangente d\'une courbe déjà tracée en (x₀, y₀)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Fonction',    type: 'func-id', default: '' },
          { id: 'x0',     label: 'x₀',          type: 'number',  default: 1 },
          { id: 'y0',     label: 'y₀ (optionnel)', type: 'number', default: '', placeholder: 'auto' },
        ],
      },
      {
        id: 'graph-horizontal-line',
        label: 'addHorizontalLine',
        description: 'Trace une droite horizontale y = c',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'y', label: 'y', type: 'number', default: 1 },
        ],
      },
      {
        id: 'graph-mark-roots',
        label: 'markRoots',
        description: 'Marque les racines f(x) = 0 d\'une courbe existante',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Fonction', type: 'func-id', default: '' },
        ],
      },
      {
        id: 'graph-trig-circle',
        label: 'trigCircle',
        description: 'Draws a complete unit circle with all 16 standard angles, coord labels outside, angle labels inside, and projection lines — all at once',
        status: 'ready', useGraph: true,
        inputs: [],
      },
      {
        id: 'graph-batch-add-points',
        label: 'batchAddPoints',
        description: 'Add all points at once (parallel) — format: id:x:y:label|id:x:y:label|...',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'points',     label: 'Points (id:x:y:label|...)', type: 'text', default: 'p0:1:0:0°|p90:0:1:90°', placeholder: 'p0:1:0:0°|p30:sqrt(3)/2:1/2:30°' },
          { id: 'showCoords', label: 'Show coords outside', type: 'text', default: 'true', placeholder: 'true / false' },
        ],
      },
      {
        id: 'graph-batch-show-projections',
        label: 'batchShowProjections',
        description: 'Show projections for all listed points at once (parallel)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'pointIds', label: 'Point IDs (pipe-separated)', type: 'text', default: 'p0|p90', placeholder: 'p0|p30|p45|p60|...' },
        ],
      },
      {
        id: 'graph-show-projection',
        label: 'showProjection',
        description: 'Draw dashed projection lines from an existing point (created with addPoint) to both axes',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'pointId',    label: 'Point ID', type: 'text', default: '', placeholder: 'same ID used in addPoint' },
          { id: 'showValues', label: 'Show values on axes', type: 'text', default: 'false', placeholder: 'true / false' },
        ],
      },
      {
        id: 'graph-plot-derivative',
        label: 'plotDerivative',
        description: 'Trace la dérivée f\'(x) d\'une courbe existante',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Fonction', type: 'func-id', default: '' },
        ],
      },
      {
        id: 'graph-riemann-sum',
        label: 'riemannSum',
        description: 'Dessine les rectangles de Riemann sous une courbe',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Fonction', type: 'func-id', default: '' },
          { id: 'a',      label: 'a',        type: 'number',  default: -2 },
          { id: 'b',      label: 'b',        type: 'number',  default:  2 },
          { id: 'n',      label: 'n (rectangles)', type: 'number', default: 5, min: 1, max: 50 },
          {
            id: 'method', label: 'Méthode', type: 'select', default: 'midpoint',
            options: [
              { value: 'left',     label: 'Gauche (left)' },
              { value: 'right',    label: 'Droite (right)' },
              { value: 'midpoint', label: 'Milieu (midpoint)' },
            ],
          },
        ],
      },
      {
        id: 'graph-draw-vector',
        label: 'drawVector',
        description: 'Dessine un vecteur (flèche) de (x1,y1) vers (x2,y2)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'x1', label: 'x₁', type: 'number', default: 0 },
          { id: 'y1', label: 'y₁', type: 'number', default: 0 },
          { id: 'x2', label: 'x₂', type: 'number', default: 2 },
          { id: 'y2', label: 'y₂', type: 'number', default: 3 },
        ],
      },
      {
        id: 'graph-draw-angle',
        label: 'drawAngle',
        description: 'Marque l\'angle ABC (sommet B) avec un arc + sa mesure calculée (carré auto si 90°)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'ax', label: 'A x', type: 'number', default: 4 },
          { id: 'ay', label: 'A y', type: 'number', default: 0 },
          { id: 'bx', label: 'B x (vertex)', type: 'number', default: 0 },
          { id: 'by', label: 'B y (vertex)', type: 'number', default: 0 },
          { id: 'cx', label: 'C x', type: 'number', default: 3 },
          { id: 'cy', label: 'C y', type: 'number', default: 4 },
          { id: 'color', label: 'Color', type: 'color-name', default: 'yellow', placeholder: 'yellow / #hex' },
        ],
      },
      {
        id: 'graph-transform-function',
        label: 'transformFunction',
        description: 'Applique une transformation géométrique à une courbe existante',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Fonction', type: 'func-id', default: '' },
          {
            id: 'transformType', label: 'Transformation', type: 'select', default: 'translateX',
            options: [
              { value: 'translateX', label: 'Décalage horizontal (→)' },
              { value: 'translateY', label: 'Décalage vertical (↑)' },
              { value: 'scaleY',     label: 'Étirement vertical' },
              { value: 'scaleX',     label: 'Étirement horizontal' },
              { value: 'reflectX',   label: 'Réflexion axe-x (−f)' },
              { value: 'reflectY',   label: 'Réflexion axe-y (f(−x))' },
            ],
          },
          { id: 'value', label: 'Valeur', type: 'number', default: 2 },
        ],
      },
    ],
  },

  // ── Extras ────────────────────────────────────────────────────────────────
  {
    id: 'extras',
    label: 'Extras',
    defaultOpen: false,
    functions: [
      {
        id: 'ext-annotation', label: 'Annotations',
        description: 'Pointer visuel sur un élément ou un point', status: 'soon',
        inputs: [],
      },
      {
        id: 'ext-navigation', label: 'Navigation',
        description: 'Boutons Suivant / Précédent entre sections', status: 'soon',
        inputs: [],
      },
    ],
  },

  // ── Text Boxes ────────────────────────────────────────────────────────────
  {
    id: 'textboxes',
    label: 'Text Boxes',
    defaultOpen: false,
    functions: [
      {
        id: 'text-create', label: 'Create Text Box', status: 'ready',
        useText: true,
        description: 'Create a text panel with optional title, paragraph or list mode, supports $LaTeX$ inline',
        inputs: [
          { id: 'boxId',  label: 'Box ID',  type: 'text', default: 'box1', placeholder: 'box1' },
          { id: 'title',  label: 'Title (optional)', type: 'text', default: '', placeholder: 'My title' },
          { id: 'content', label: 'Content (lines separated by |)', type: 'text',
            default: 'This is the first line.|Second line with $x^2 + y^2 = r^2$.',
            placeholder: 'Line 1|Line 2|Line 3' },
          { id: 'isList', label: 'List mode', type: 'select', default: 'false',
            options: [{ value: 'false', label: 'Paragraph' }, { value: 'true', label: 'Bullet list' }] },
          { id: 'color',  label: 'Accent color (optional)', type: 'color-name', default: '' },
        ],
      },
      {
        id: 'text-add-item', label: 'Add List Item', status: 'ready',
        useText: true,
        description: 'Append a new item to an existing list text box',
        inputs: [
          { id: 'boxId', label: 'Box ID', type: 'text', default: 'box1' },
          { id: 'item',  label: 'Item text (LaTeX ok)', type: 'text',
            default: 'New item with $\\frac{a}{b}$', placeholder: 'New bullet point' },
        ],
      },
      {
        id: 'text-remove-item', label: 'Remove List Item', status: 'ready',
        useText: true,
        description: 'Remove an item from a list text box by index (0 = first, -1 = last)',
        inputs: [
          { id: 'boxId', label: 'Box ID',  type: 'text',   default: 'box1' },
          { id: 'index', label: 'Index',   type: 'number', default: -1 },
        ],
      },
      {
        id: 'text-update-title', label: 'Update Title', status: 'ready',
        useText: true,
        description: 'Change the title of an existing text box',
        inputs: [
          { id: 'boxId', label: 'Box ID', type: 'text', default: 'box1' },
          { id: 'title', label: 'New title', type: 'text', default: 'Updated Title' },
        ],
      },
      {
        id: 'text-remove', label: 'Remove Text Box', status: 'ready',
        useText: true,
        description: 'Remove an entire text box',
        inputs: [
          { id: 'boxId', label: 'Box ID', type: 'text', default: 'box1' },
        ],
      },
      {
        id: 'text-fade-content', label: 'Fade Content', status: 'ready',
        useText: true,
        description: 'Cross-fade the content of a text box. Use [eq-result] to pull the current equation\'s numeric result (color follows the result term).',
        inputs: [
          { id: 'boxId',   label: 'Box ID',      type: 'text', default: 'box1' },
          { id: 'content', label: 'New Content',  type: 'text', default: '[eq-result]', placeholder: '[eq-result] or any text / $LaTeX$' },
        ],
      },
    ],
  },

  // ── Comments ──────────────────────────────────────────────────────────────
  {
    id: 'comments',
    label: 'Comments',
    defaultOpen: false,
    functions: [
      {
        id: 'cmt-graph', label: 'Comment → Exact Point', status: 'ready',
        useGraph: true,
        description: 'Comment dot at an exact (x, y) coordinate',
        inputs: [
          { id: 'cmtId', label: 'Comment ID (optional)', type: 'text', default: '', placeholder: 'e.g. cmt1 — needed to edit later' },
          { id: 'text',  label: 'Text',  type: 'text',   default: 'f(0) = 1' },
          { id: 'x',     label: 'X',     type: 'number', default: '0' },
          { id: 'y',     label: 'Y',     type: 'number', default: '1' },
          { id: 'color', label: 'Color', type: 'color-name',   default: 'purple' },
        ],
      },
      {
        id: 'cmt-graph-func', label: 'Comment → On Curve', status: 'ready',
        useGraph: true,
        description: 'Comment dot snapped to f(x) — dot always lands exactly on the curve',
        inputs: [
          { id: 'cmtId',  label: 'Comment ID (optional)', type: 'text',    default: '', placeholder: 'e.g. cmt1' },
          { id: 'text',   label: 'Text',     type: 'text',    default: 'f(x)' },
          { id: 'funcId', label: 'Function', type: 'func-id', default: '' },
          { id: 'x',     label: 'X',        type: 'number',  default: '1' },
          { id: 'color',  label: 'Color',    type: 'color-name',    default: 'purple' },
        ],
      },
      {
        id: 'cmt-graph-area', label: 'Comment → Inside Area', status: 'ready',
        useGraph: true,
        description: 'Comment dot placed inside the shaded area under a curve',
        inputs: [
          { id: 'cmtId',  label: 'Comment ID (optional)', type: 'text',    default: '', placeholder: 'e.g. cmt1' },
          { id: 'text',   label: 'Text',     type: 'text',    default: 'area' },
          { id: 'funcId', label: 'Function', type: 'func-id', default: '' },
          { id: 'x',     label: 'X',        type: 'number',  default: '1' },
          { id: 'color',  label: 'Color',    type: 'color-name',    default: 'purple' },
        ],
      },
      {
        id: 'cmt-grid', label: 'Comment → Grid Cell', status: 'ready',
        useTable: true,
        description: 'Add a comment box linked to a grid cell',
        inputs: [
          { id: 'cmtId',   label: 'Comment ID (optional)', type: 'text',    default: '', placeholder: 'e.g. cmt1' },
          { id: 'text',    label: 'Text',    type: 'text',    default: 'Alice scored 95' },
          { id: 'gridId',  label: 'Grid',    type: 'grid-id', default: '' },
          { id: 'col',     label: 'Col',     type: 'number',  default: '2' },
          { id: 'row',     label: 'Row',     type: 'number',  default: '1' },
          { id: 'color',   label: 'Color',   type: 'color-name',    default: 'green' },
        ],
      },
      {
        id: 'cmt-geo', label: 'Comment → Geo Vertex', status: 'ready',
        useGeo: true, use3D: true,
        description: 'Add a comment box linked to a shape vertex',
        inputs: [
          { id: 'cmtId',       label: 'Comment ID (optional)', type: 'text',   default: '', placeholder: 'e.g. cmt-theta' },
          { id: 'text',        label: 'Text',    type: 'text',   default: 'Right angle' },
          { id: 'shapeId',     label: 'Shape ID', type: 'text',  default: 'triangle' },
          { id: 'vertexIndex', label: 'Vertex #', type: 'number', default: '0' },
          { id: 'color',       label: 'Color',   type: 'color-name',   default: 'orange' },
        ],
      },
      {
        id: 'cmt-geo-edge', label: 'Comment → Geo Edge', status: 'ready',
        useGeo: true, use3D: true,
        description: 'Add a comment box linked to the midpoint of a shape edge',
        inputs: [
          { id: 'cmtId',     label: 'Comment ID (optional)', type: 'text',   default: '', placeholder: 'e.g. cmt-hyp' },
          { id: 'text',      label: 'Text',    type: 'text',   default: 'Hypotenuse' },
          { id: 'shapeId',   label: 'Shape ID', type: 'text',  default: 'triangle' },
          { id: 'edgeIndex', label: 'Edge #',  type: 'number', default: '0' },
          { id: 'color',     label: 'Color',   type: 'color-name',   default: 'orange' },
        ],
      },
      {
        id: 'cmt-equation', label: 'Comment → Equation', status: 'ready',
        description: 'Add a comment box framing the whole equation, a whole side, or specific terms. The frame resizes dynamically with the equation.',
        inputs: [
          { id: 'cmtId',   label: 'Comment ID (optional)', type: 'text',   default: '', placeholder: 'e.g. cmt1' },
          { id: 'text',    label: 'Text',    type: 'text',   default: 'This equation' },
          { id: 'side',    label: 'Scope',   type: 'select',
            options: [
              { value: 'both',  label: 'Whole equation' },
              { value: 'left',  label: 'Left side' },
              { value: 'right', label: 'Right side' },
            ],
            default: 'both' },
          { id: 'indices', label: 'Indices (blank = whole)', type: 'text', default: '', placeholder: 'blank, or 0,1,2 for specific terms' },
          { id: 'color',   label: 'Color',   type: 'color-name',   default: 'red' },
        ],
      },
      {
        id: 'cmt-free', label: 'Comment → Free (no link)', status: 'ready',
        useAll: true,
        description: 'A comment box with no connector line or target — just floats on the given side',
        inputs: [
          { id: 'cmtId', label: 'Comment ID (optional)', type: 'text', default: '', placeholder: 'e.g. cmt1' },
          { id: 'title', label: 'Title (optional)', type: 'text', default: '', placeholder: 'e.g. Coefficients' },
          { id: 'text',  label: 'Text',  type: 'text',   default: 'Note' },
          { id: 'side',  label: 'Side',  type: 'select',
            options: [
              { value: 'right', label: 'Right' },
              { value: 'left',  label: 'Left' },
            ],
            default: 'right' },
          { id: 'color', label: 'Color', type: 'color-name', default: 'purple' },
        ],
      },
      {
        id: 'cmt-clear', label: 'Clear All Comments', status: 'ready',
        useAll: true,
        description: 'Remove all active comment boxes',
        inputs: [],
      },
      {
        id: 'cmt-update', label: 'Update Comment', status: 'ready',
        useAll: true,
        description: 'Change the text and/or color of an existing comment. Use [eq-result] in text to pull the current equation result (color auto-follows).',
        inputs: [
          { id: 'cmtId', label: 'Comment ID', type: 'text', default: '', placeholder: 'ID set when created' },
          { id: 'text',  label: 'New Text (optional)',  type: 'text', default: '[eq-result]', placeholder: '[eq-result] or custom' },
          { id: 'color', label: 'New Color (optional)', type: 'color-name', default: '', placeholder: 'leave blank = auto from eq' },
        ],
      },
      {
        id: 'narrate', label: 'Narrate', status: 'ready',
        useAll: true,
        description: 'Set the narration text and speak it aloud — the only function that controls narration',
        inputs: [
          { id: 'text', label: 'Text', type: 'text', default: 'Here we can see the two functions intersect at two points.', placeholder: 'What to say…' },
        ],
      },
    ],
  },

  // ── Calcul ────────────────────────────────────────────────────────────────
  {
    id: 'calcul',
    label: 'Calcul',
    defaultOpen: false,
    functions: [
      {
        id: 'calc-step', label: 'Add Step', status: 'ready',
        useCalc: true,
        description: 'Append one LaTeX equation step to the calculation display',
        inputs: [
          { id: 'latex', label: 'LaTeX', type: 'text', default: '\\int_1^4 (2x+1)\\,dx', placeholder: '= x^2 + x + C' },
        ],
      },
      {
        id: 'calc-clear', label: 'Clear Steps', status: 'ready',
        useCalc: true,
        description: 'Erase all steps from the calculation display',
        inputs: [],
      },
    ],
  },

  // ── Horloge (children) ───────────────────────────────────────────────────
  {
    id: 'horloge',
    label: 'Horloge',
    defaultOpen: false,
    functions: [
      {
        id: 'clock-show', label: 'Afficher l\'heure', status: 'ready',
        useClock: true,
        description: 'Show an analog clock and animate the hands to the given time',
        inputs: [
          { id: 'hour',   label: 'Heure (1–12)',   type: 'number', default: 3, min: 0, max: 12 },
          { id: 'minute', label: 'Minutes (0–59)', type: 'number', default: 0, min: 0, max: 59 },
        ],
      },
      {
        id: 'clock-set-time', label: 'Changer l\'heure', status: 'ready',
        useClock: true,
        description: 'Animate clock hands to a new time',
        inputs: [
          { id: 'hour',   label: 'Heure (1–12)',   type: 'number', default: 6, min: 0, max: 12 },
          { id: 'minute', label: 'Minutes (0–59)', type: 'number', default: 30, min: 0, max: 59 },
        ],
      },
      {
        id: 'clock-highlight-hand', label: 'Pointer une aiguille', status: 'ready',
        useClock: true,
        description: 'Highlight the hour or minute hand with a glow and label',
        inputs: [
          {
            id: 'hand', label: 'Aiguille', type: 'select', default: 'hour',
            options: [
              { value: 'hour',   label: 'Heures (courte)' },
              { value: 'minute', label: 'Minutes (longue)' },
            ],
          },
        ],
      },
    ],
  },

  // ── MDAS (children) ──────────────────────────────────────────────────────
  {
    id: 'mdas',
    label: 'Ordre des opérations',
    defaultOpen: false,
    functions: [
      {
        id: 'mdas-example', label: 'Exemple MDAS', status: 'ready',
        useMdas: true,
        description: 'Animates an order-of-operations example step by step (× ÷ before + −), with a rules text box on the left',
        inputs: [
          {
            id: 'expr', label: 'Expression (numbers and + − × ÷)', type: 'text',
            default: '3 + 4 × 2 - 1', placeholder: 'e.g. 5 + 2 × 3 - 4',
          },
        ],
      },
    ],
  },

  // ── Chiffres (children) ──────────────────────────────────────────────────
  {
    id: 'chiffres',
    label: 'Chiffres',
    defaultOpen: false,
    functions: [
      {
        id: 'numbers-show', label: 'Afficher les chiffres', status: 'ready',
        useNumbers: true,
        description: 'Show a colorful grid of all 10 digits (0–9), each paired with visual objects illustrating the quantity',
        inputs: [],
      },
      {
        id: 'numbers-highlight', label: 'Surligner un chiffre', status: 'ready',
        useNumbers: true,
        description: 'Zoom in on a specific digit card and dim the others',
        inputs: [
          { id: 'digit', label: 'Chiffre (0–9)', type: 'number', default: 3, min: 0, max: 9 },
        ],
      },
    ],
  },

  // ── Arithmetic (children) ─────────────────────────────────────────────────
  {
    id: 'arithmetic',
    label: 'Calcul simple',
    defaultOpen: false,
    functions: [
      {
        id: 'arith-solve', label: 'Résoudre', status: 'ready',
        useArith: true,
        description: 'Show a vertical +/−/×/÷ calculation step-by-step with borrowing and carries',
        inputs: [
          { id: 'a',  label: 'Top number',  type: 'number', default: 63 },
          { id: 'op', label: 'Opérateur (+  −  ×  ÷)', type: 'text', default: '-' },
          { id: 'b',  label: 'Bottom number', type: 'number', default: 5 },
        ],
      },
      {
        id: 'mult-table-show', label: 'Table de multiplication', status: 'ready',
        useMult: true,
        description: 'Affiche la table de multiplication complète (de 1×1 à N×N) avec animation',
        inputs: [
          { id: 'maxN', label: 'De 1 à N', type: 'number', default: 12, min: 2, max: 15 },
        ],
      },
      {
        id: 'mult-table-highlight', label: 'Surligner une case', status: 'ready',
        useMult: true,
        description: 'Met en évidence une case de la table (ligne × colonne)',
        inputs: [
          { id: 'row', label: 'Ligne (multiplicateur)',   type: 'number', default: 3 },
          { id: 'col', label: 'Colonne (multiplicande)', type: 'number', default: 4 },
        ],
      },
    ],
  },

  // ── 2D Shapes (Three.js flat, screen-locked) ─────────────────────────────
  {
    id: 'geo2d',
    label: '2D Shapes',
    defaultOpen: true,
    functions: [
      {
        id: 'geo3d-create-2d',
        label: 'Create 2D Shape',
        description: 'Add a flat 2D shape to the scene (screen-locked, no rotation)',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',   label: 'ID', type: 'text', default: 'shape1', placeholder: 'unique name' },
          {
            id: 'type', label: 'Shape', type: 'select', default: 'triangle',
            options: [
              { value: 'triangle',        label: 'Triangle' },
              { value: 'right-triangle',  label: 'Right Triangle' },
              { value: 'rectangle',       label: 'Rectangle' },
              { value: 'square',          label: 'Square' },
              { value: 'circle',          label: 'Circle' },
              { value: 'parallelogram',   label: 'Parallelogram' },
              { value: 'trapeze',         label: 'Trapezoid' },
              { value: 'pentagon',        label: 'Pentagon' },
              { value: 'hexagon',         label: 'Hexagon' },
              { value: 'octagon',         label: 'Octagon' },
              { value: 'regular-polygon', label: 'Regular Polygon (n sides)' },
              { value: 'line',            label: 'Line Segment' },
            ],
          },
          { id: 'a',     label: 'Size / Radius / Side 1',     type: 'number', default: '3' },
          { id: 'b',     label: 'Side 2 / Height (optional)', type: 'number', default: '' },
          { id: 'c',     label: 'Side 3 (optional)',          type: 'number', default: '' },
          { id: 'color', label: 'Color', type: 'color-name', default: 'blue' },
        ],
      },
      {
        id: 'geo3d-move',
        label: 'Move Shape',
        description: 'Translate a shape by (dx, dy) with a smooth animation',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text',   default: 'shape1' },
          { id: 'dx', label: 'dx', type: 'number', default: 2 },
          { id: 'dy', label: 'dy', type: 'number', default: 0 },
        ],
      },
      {
        id: 'geo3d-highlight',
        label: 'Highlight Shape',
        description: 'Pulse the shape brighter then fade back to normal',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'shape1' },
        ],
      },
      {
        id: 'geo3d-label-sides',
        label: 'Label Sides',
        description: 'Show computed lengths (or custom labels) on each side of a flat shape',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',     label: 'ID',                                      type: 'text', default: 'shape1' },
          { id: 'labels', label: 'Custom labels (comma-sep, blank = auto)', type: 'text', default: '', placeholder: 'a, b, c  or  3, 4, 5' },
        ],
      },
      {
        id: 'geo3d-show-angles',
        label: 'Show Angles',
        description: 'Draw interior angle arcs at each vertex of a flat shape',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',    label: 'ID',    type: 'text',       default: 'shape1' },
          { id: 'color', label: 'Color', type: 'color-name', default: 'blue' },
        ],
      },
      {
        id: 'geo3d-highlight-angle',
        label: 'Highlight Angle',
        description: 'Pop and recolour one angle arc on a flat shape',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',         label: 'ID',      type: 'text',       default: 'shape1' },
          { id: 'angleIndex', label: 'Angle #', type: 'number',     default: 0 },
          { id: 'color',      label: 'Color',   type: 'color-name', default: 'cyan' },
        ],
      },
      {
        id: 'geo3d-highlight-edge',
        label: 'Highlight Edge',
        description: 'Draw a colored line over one edge (or several one after another — e.g. "0,1,2") — works on flat 2D shapes (edge = side index) AND cube/rectangular-prism 3D solids (edge = 0-11, one of the 12 box edges)',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',     type: 'text',       default: 'shape1' },
          { id: 'edgeIndex', label: 'Edge # (comma-sep for several)', type: 'text', default: '0' },
          { id: 'color',     label: 'Color',  type: 'color-name', default: 'orange' },
        ],
      },
      {
        id: 'geo3d-remove-edge-highlight',
        label: 'Remove Edge Highlight',
        description: 'Remove one or more edges\' highlight (flat shape or 3D solid) — comma-sep for several, e.g. "0,1,2"',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',     type: 'text',   default: 'shape1' },
          { id: 'edgeIndex', label: 'Edge # (comma-sep for several)', type: 'text', default: '0' },
        ],
      },
      {
        id: 'geo3d-show-tick',
        label: 'Show Equal-Side Tick',
        description: 'Congruent-side tick mark(s) crossing the middle of an edge (or several at once, comma-sep — e.g. "0,1") — use a different tick count to mark a different pair of equal sides. Auto-added when a shape has congruent sides, so you usually won\'t need this manually.',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',       type: 'text',       default: 'shape1' },
          { id: 'edgeIndex', label: 'Edge # (comma-sep for several)', type: 'text', default: '0' },
          { id: 'ticks',     label: 'Tick count (1-3)', type: 'number', default: 1, min: 1, max: 3 },
          { id: 'color',     label: 'Color',    type: 'color-name', default: 'blue' },
        ],
      },
      {
        id: 'geo3d-remove-tick',
        label: 'Remove Equal-Side Tick',
        description: 'Remove the tick mark(s) from one or more edges (comma-sep for several)',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',     type: 'text',   default: 'shape1' },
          { id: 'edgeIndex', label: 'Edge # (comma-sep for several)', type: 'text', default: '0' },
        ],
      },
      {
        id: 'geo3d-divide-segment',
        label: 'Divide Segment',
        description: 'Mark the points that split an edge into N equal sections (points de partage) — e.g. parts=3 marks the two points at 1/3 and 2/3',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',          label: 'ID',       type: 'text',       default: 'shape1' },
          { id: 'edgeIndex',   label: 'Edge #',   type: 'number',     default: 0 },
          { id: 'parts',       label: 'Parts (N)', type: 'number',    default: 2, min: 2 },
          { id: 'color',       label: 'Color',    type: 'color-name', default: 'purple' },
          { id: 'showLabels',  label: 'Show labels (P1, P2…)', type: 'select', default: 'false',
            options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] },
        ],
      },
      {
        id: 'geo3d-remove-divide-segment',
        label: 'Remove Divide Segment',
        description: 'Remove the division points from one edge',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',       type: 'text',   default: 'shape1' },
          { id: 'edgeIndex', label: 'Edge #',   type: 'number', default: 0 },
          { id: 'parts',     label: 'Parts (N)', type: 'number', default: 2 },
        ],
      },
      {
        id: 'geo3d-show-arrow',
        label: 'Show Arrow',
        description: 'Draw an animated arrow inside a flat shape from one anchor (v0/e0…) to another',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',      label: 'Shape ID',        type: 'text',       default: 'shape1' },
          { id: 'arrowId', label: 'Arrow ID',         type: 'text',       default: 'arr1' },
          { id: 'from',    label: 'From (v0/e0/…)',   type: 'text',       default: 'v2' },
          { id: 'to',      label: 'To   (v1/e2/…)',   type: 'text',       default: 'e0' },
          { id: 'color',   label: 'Color',             type: 'color-name', default: 'yellow' },
        ],
      },
      {
        id: 'geo3d-remove-arrow',
        label: 'Remove Arrow',
        description: 'Remove a previously drawn arrow from a shape by its arrow ID',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',      label: 'Shape ID',  type: 'text', default: 'shape1' },
          { id: 'arrowId', label: 'Arrow ID',  type: 'text', default: 'arr1' },
        ],
      },
      {
        id: 'geo3d-clear-highlights',
        label: 'Clear Highlights',
        description: 'Remove all angle and edge highlights from a shape',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'shape1' },
        ],
      },
      {
        id: 'geo3d-set-view',
        label: 'Set View',
        description: 'Zoom/pan the 2D/3D camera, or jump to a named viewing angle (3D only) — e.g. "top" to look straight down at a highlighted top face',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'zoom',     label: 'Zoom (1 = default)', type: 'number', default: 1 },
          { id: 'panX',     label: 'Pan X',              type: 'number', default: 0 },
          { id: 'panY',     label: 'Pan Y',              type: 'number', default: 0 },
          { id: 'distance', label: 'Camera distance (3D only, blank = auto)', type: 'text', default: '' },
          { id: 'duration', label: 'Duration (s)',        type: 'number', default: 0.3 },
          { id: 'preset',   label: 'View angle (3D only, optional)', type: 'select', default: '',
            options: [
              { value: '',       label: '— keep current angle —' },
              { value: 'front',  label: 'Front' },
              { value: 'back',   label: 'Back' },
              { value: 'top',    label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
              { value: 'side',   label: 'Side' },
              { value: 'corner', label: 'Corner (3/4 view)' },
            ] },
        ],
      },
      {
        id: 'geo3d-remove',
        label: 'Remove Shape',
        description: 'Remove a shape from the scene by ID',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'shape1' },
        ],
      },
      {
        id: 'geo2d-flip',
        label: 'Flip Horizontal',
        description: 'Mirror the shape horizontally across the Y axis',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'shape1' },
        ],
      },
      {
        id: 'geo2d-rotate',
        label: 'Rotate 90°',
        description: 'Rotate the shape 90° counter-clockwise',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'shape1' },
        ],
      },
      // ── Legacy SVG shape engine (GeometryDisplay / geometryEngine.js) — kept
      // for existing lessons that already use it; prefer "Create 2D Shape"
      // (geo3d-create-2d) above for new lessons.
      {
        id: 'geo-create-polygon', label: 'Create Shape (legacy SVG)',
        description: 'Draw a polygon or circle from side lengths / dimensions',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1', placeholder: 'shape1' },
          { id: 'shape-type', label: 'Type', type: 'select', default: 'triangle',
            options: [
              { value: 'triangle',       label: 'Triangle' },
              { value: 'right-triangle', label: 'Right triangle' },
              { value: 'rectangle',      label: 'Rectangle' },
              { value: 'square',         label: 'Square' },
              { value: 'parallelogram',  label: 'Parallelogram' },
              { value: 'trapeze',        label: 'Trapeze' },
              { value: 'pentagon',       label: 'Pentagon' },
              { value: 'hexagon',        label: 'Hexagon' },
              { value: 'octagon',        label: 'Octagon' },
              { value: 'regular-polygon', label: 'Regular polygon' },
              { value: 'circle',         label: 'Circle' },
            ] },
          { id: 'values', label: 'Values (comma-separated)', type: 'text', default: '5,4,3',
            placeholder: 'triangle="a,b,c"  rectangle="w,h"  square="s"  trapeze="aTop,bBot,h"  circle="r"' },
          { id: 'fillColor',   label: 'Fill color (optional)',   type: 'color-name', default: '' },
          { id: 'borderColor', label: 'Border color (optional)', type: 'color-name', default: '' },
          { id: 'flipX', label: 'Flip X', type: 'select', default: 'false',
            options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] },
          { id: 'flipY', label: 'Flip Y', type: 'select', default: 'false',
            options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] },
        ],
      },
      {
        id: 'geo-erase-shape', label: 'Erase Shape (legacy SVG)',
        description: 'Remove a shape and its labels',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
        ],
      },
      {
        id: 'geo-move-shape', label: 'Move Shape (legacy SVG)',
        description: 'Animate a shape sliding by (dx, dy)',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text',   default: 'shape1' },
          { id: 'dx',      label: 'dx',       type: 'number', default: 3 },
          { id: 'dy',      label: 'dy',       type: 'number', default: 2 },
        ],
      },
      {
        id: 'geo-highlight-shape', label: 'Highlight Shape (legacy SVG)',
        description: 'Pulse a shape’s outline/fill briefly',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
        ],
      },
      {
        id: 'geo-label-sides', label: 'Label Sides (legacy SVG)',
        description: 'Label every side — blank or "a=" auto-fills the computed length',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
          { id: 'labels',  label: 'Labels (comma-separated, blank = length only)',
            type: 'text', default: 'a=,b=,c=', placeholder: 'a=,b=,c=' },
        ],
      },
      {
        id: 'geo-show-angles', label: 'Show Angles (legacy SVG)',
        description: 'Draw arcs + degree labels at every interior angle',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
          { id: 'color',   label: 'Color (optional)', type: 'color-name', default: '' },
        ],
      },
      {
        id: 'geo-show-measure', label: 'Show Measure (legacy SVG)',
        description: 'Height line for polygons (top vertex → base), radius line for circles',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
          { id: 'color',   label: 'Color (optional)', type: 'color-name', default: '' },
          { id: 'angle',   label: 'Angle (circles only, degrees)', type: 'number', default: 35 },
          { id: 'label',   label: 'Label override (optional)', type: 'text', default: '' },
        ],
      },
      {
        id: 'geo-show-area-measures', label: 'Show Area Measures',
        description: 'Every measurement needed for the area formula, tailored per shape: square→s, rectangle→l+h, parallelogram→b+h, trapeze→B+b+h, triangle→b+h, circle→r. Works with shapes from either Create Shape (geo-create-polygon) or Create 2D Shape (geo3d-create-2d).',
        status: 'ready', useGeo: true, use3D: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID (must match the shape\'s own ID)', type: 'text', default: 'shape1' },
          { id: 'color',   label: 'Color (optional)', type: 'color-name', default: '' },
        ],
      },
      {
        id: 'geo-highlight-edge', label: 'Highlight Edge (legacy SVG)',
        description: 'Flash one edge by index, or several one after another — e.g. "0,1,2" instead of calling this 3 times',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId',   label: 'Shape ID',  type: 'text',   default: 'shape1' },
          { id: 'edgeIndex', label: 'Edge index (comma-sep for several)', type: 'text', default: '0' },
          { id: 'color',     label: 'Color',     type: 'color-name', default: 'amber' },
        ],
      },
      {
        id: 'geo-highlight-angle', label: 'Highlight Angle (legacy SVG)',
        description: 'Flash the angle arc at one vertex',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId',     label: 'Shape ID',    type: 'text',   default: 'shape1' },
          { id: 'vertexIndex', label: 'Vertex index', type: 'number', default: 0 },
          { id: 'color',       label: 'Color',       type: 'color-name', default: 'amber' },
        ],
      },
      {
        id: 'geo-show-arrow', label: 'Show Arrow (legacy SVG)',
        description: 'Draw an arrow between two shape corners/points',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
          { id: 'arrowId', label: 'Arrow ID (optional)', type: 'text', default: '' },
          { id: 'from',    label: 'From (e.g. corner:0)', type: 'text', default: 'corner:0' },
          { id: 'to',      label: 'To (e.g. corner:2)',   type: 'text', default: 'corner:2' },
          { id: 'color',   label: 'Color', type: 'color-name', default: 'amber' },
        ],
      },
      {
        id: 'geo-remove-arrow', label: 'Remove Arrow (legacy SVG)',
        description: 'Remove a previously drawn arrow',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'arrowId', label: 'Arrow ID', type: 'text', default: '' },
        ],
      },
      {
        id: 'geo-add-text', label: 'Add Floating Text (legacy SVG)',
        description: 'Place a small LaTeX label anywhere on the canvas',
        status: 'legacy', useGeo: true,
        inputs: [
          { id: 'labelId', label: 'Label ID', type: 'text', default: 'lbl1' },
          { id: 'text',    label: 'Text',     type: 'text', default: 'A = \\pi r^2' },
          { id: 'x',       label: 'X',        type: 'number', default: 0 },
          { id: 'y',       label: 'Y',        type: 'number', default: -4 },
        ],
      },
      {
        id: 'geo-clear', label: 'Clear All Shapes (legacy SVG)',
        description: 'Remove every shape, label, and highlight',
        status: 'legacy', useGeo: true,
        inputs: [],
      },
    ],
  },

  // ── 3D Shapes (Three.js volumetric, rotatable) ────────────────────────────
  {
    id: 'geo3d',
    label: '3D Shapes',
    defaultOpen: true,
    functions: [
      {
        id: 'geo3d-create',
        label: 'Create 3D Shape',
        description: 'Add a volumetric 3D shape to the scene (rotatable)',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',   label: 'ID', type: 'text', default: 'shape1', placeholder: 'unique name' },
          {
            id: 'type', label: 'Shape', type: 'select', default: 'cube',
            options: [
              { value: 'cube',              label: 'Cube' },
              { value: 'sphere',            label: 'Sphere' },
              { value: 'cone',              label: 'Cone' },
              { value: 'cylinder',          label: 'Cylinder' },
              { value: 'rectangular-prism', label: 'Rectangular Prism' },
              { value: 'pyramid',           label: 'Square Pyramid' },
              { value: 'tetrahedron',       label: 'Tetrahedron' },
              { value: 'octahedron',        label: 'Octahedron' },
              { value: 'torus',             label: 'Torus' },
            ],
          },
          { id: 'a',     label: 'Size / Radius',        type: 'number', default: '3' },
          { id: 'b',     label: 'Height (optional)',    type: 'number', default: '' },
          { id: 'c',     label: 'Depth (optional)',     type: 'number', default: '' },
          { id: 'color', label: 'Color', type: 'color-name', default: 'blue' },
        ],
      },
      {
        id: 'geo3d-add-text',
        label: 'Add Text',
        description: 'Add a floating text label at a world position',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'labelId', label: 'Label ID', type: 'text',   default: 'lbl1' },
          { id: 'text',    label: 'Text',     type: 'text',   default: 'A = πr²' },
          { id: 'x',       label: 'x',        type: 'number', default: 0 },
          { id: 'y',       label: 'y',        type: 'number', default: -4 },
        ],
      },
      {
        id: 'geo3d-show-volume-measures',
        label: 'Show Volume Measures',
        description: 'Labels exactly the dimensions needed for THIS shape\'s volume formula: cube→a, sphere→r, cone/cylinder→r+h, rectangular-prism→l+w+h, pyramid→a+h, tetrahedron/octahedron→a, torus→R+r',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',    label: 'ID', type: 'text', default: 'shape1' },
          { id: 'color', label: 'Color (optional)', type: 'color-name', default: '' },
        ],
      },
      {
        id: 'geo3d-remove-volume-measures',
        label: 'Remove Volume Measures',
        description: 'Remove the volume-measure labels from a shape',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'shape1' },
        ],
      },
      {
        id: 'geo3d-highlight-edge',
        label: 'Highlight Edge',
        description: 'Draw a colored line over one edge of a cube/rectangular-prism (edge = 0-11, one of the 12 box edges), or several one after another — e.g. "0,1,2"',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',     type: 'text',       default: 'shape1' },
          { id: 'edgeIndex', label: 'Edge # (comma-sep for several)', type: 'text', default: '0' },
          { id: 'color',     label: 'Color',  type: 'color-name', default: 'orange' },
        ],
      },
      {
        id: 'geo3d-remove-edge-highlight',
        label: 'Remove Edge Highlight',
        description: 'Remove one or more edges\' highlight — comma-sep for several, e.g. "0,1,2"',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',     type: 'text',   default: 'shape1' },
          { id: 'edgeIndex', label: 'Edge # (comma-sep for several)', type: 'text', default: '0' },
        ],
      },
      {
        id: 'geo3d-highlight-face',
        label: 'Highlight Face',
        description: 'Translucent colored panel on one face of a cube/rectangular-prism — faces: 0=+X 1=-X 2=top 3=bottom 4=+Z 5=-Z',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',      type: 'text',       default: 'shape1' },
          { id: 'faceIndex', label: 'Face # (0-5)', type: 'number', default: 0, min: 0, max: 5 },
          { id: 'color',     label: 'Color',   type: 'color-name', default: 'orange' },
        ],
      },
      {
        id: 'geo3d-remove-face-highlight',
        label: 'Remove Face Highlight',
        description: 'Remove one face\'s highlight panel',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',        label: 'ID',      type: 'text',   default: 'shape1' },
          { id: 'faceIndex', label: 'Face # (0-5)', type: 'number', default: 0 },
        ],
      },
      {
        id: 'geo3d-remove',
        label: 'Remove Shape',
        description: 'Remove a shape from the scene by ID',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'shape1' },
        ],
      },
      {
        id: 'geo3d-clear',
        label: 'Clear All',
        description: 'Remove all shapes and labels from the scene',
        status: 'ready', use3D: true,
        inputs: [],
      },
    ],
  },
]

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Returns the category id ('equation', 'geometrie', …) for a function id. */
export function getFunctionCategory(funcId) {
  for (const cat of CATEGORIES) {
    if (cat.functions.find(f => f.id === funcId)) return cat.id
  }
  return null
}

export function findFunction(id) {
  for (const cat of CATEGORIES) {
    const fn = cat.functions.find(f => f.id === id)
    if (fn) return fn
  }
  return null
}

/** Build a { inputId: value } map using each input's default (or empty string). */
export function defaultInputs(fn) {
  return Object.fromEntries(
    fn.inputs.map(inp => [
      inp.id,
      inp.default !== undefined ? String(inp.default) : '',
    ])
  )
}
