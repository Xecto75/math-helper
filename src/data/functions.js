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
    label: 'Equation',
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
            label:       'Equation',
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
            label:   'Divisor',
            type:    'number',
            default: 2,
            min:     1,
          },
        ],
      },
      {
        id:          'eq-multiply',
        label:       'Multiply Both Sides',
        description: 'Show ×N on both sides and simplify every term — clears a fraction like x/2 = 4',
        status:      'ready',
        inputs: [
          {
            id:      'multiplier',
            label:   'Multiplier',
            type:    'number',
            default: 2,
          },
        ],
      },
      {
        id:          'eq-replace-variable',
        label:       'Replace Variable',
        description: 'Fade symbolic letters and replace with numeric values — equation must already be on the page. A value can be a hardcoded number OR a live reference to whatever created it, so it never goes out of sync: [id]0/[id]h/[id]r/[id]aN (2D or flat-2D shape side/height/radius/vertex-angle), [id]a/[id]r/[id]h/[id]l/[id]d/[id]R (a 3D solid\'s dimension — matches the letter shown by Show Volume Measures for that shape type), [id]x/[id]y (a graph point), [id]x1/[id]y1/[id]x2/[id]y2/[id]len (a graph segment), [id]r<row>c<col> (a table cell, 0-indexed), [funcId]N (the Nth number written in a plotted expression, left to right — a literal like "2x+4"\'s 2/4 OR a |slider| var\'s live value), [sliderName]v (a slider addressed directly by its own name).',
        status:      'ready',
        inputs: [
          { id: 'replacements', label: 'Replacements (a=v,b=v,...)', type: 'text', default: 'a=2,b=-3,c=1', placeholder: 'a=2,b=-3,c=1  or  m=[fx1]0,b=[fx1]1  or  a=[a]v,b=[b]v' },
        ],
      },
      {
        id:          'eq-save-result',
        label:       'Save Result As...',
        description: 'Silently stash the equation\'s current solved numeric result under a name — no visual change, the equation already showed it. Read it back anywhere else via [name]v: another eq-create/eq-replace-variable, a text box, or a comment. Use this to chain solves — e.g. compute the slope m between two points and save it, then use [m]v to solve for b, save that too, then show "y = mx + b" with both substituted in.',
        status:      'ready',
        inputs: [
          { id: 'name', label: 'Save as name', type: 'text', default: 'm', placeholder: 'm' },
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
        description: 'Simplest way to make a table — give one 2D array, size is auto-detected (no need to also specify rows/cols). Any cell is referenceable elsewhere via [gridId]r<row>c<col>, 0-indexed (see eq-replace-variable), including after table-change-value edits it.',
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
      {
        id: 'tab-highlight-row', label: 'highlightRow',
        description: 'Highlight one table row — useful for walking through a calculation row by row alongside the equation panel. Calling again just slides the same bar to the new row, so no clear step is needed between rows.',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId',    label: 'Grid',            type: 'grid-id', default: '' },
          { id: 'rowIndex',  label: 'Row (0-based)',    type: 'number',  default: 0 },
          { id: 'color',     label: 'Color (optional)', type: 'color-name', default: '' },
        ],
      },
      {
        id: 'tab-clear-row-highlight', label: 'clearRowHighlight',
        description: 'Fade out the row highlight bar',
        status: 'ready', useTable: true,
        inputs: [
          { id: 'gridId', label: 'Grid', type: 'grid-id', default: '' },
        ],
      },
    ],
  },

  // ── Graphiques ────────────────────────────────────────────────────────────
  // Desmos graphing engine functions — each independently testable.
  {
    id: 'graphiques',
    label: 'Graphs',
    defaultOpen: false,
    functions: [
      {
        id: 'graph-plot-function',
        label: 'plotFunction',
        description: 'Plot f(x) on the graph — label "f(x) = …" (or g/h/…) shown automatically unless hidden. Wrap a variable in |pipes| (e.g. |a|x+|b|) to turn it into a slider. Its expression is reusable elsewhere via [id]expr (text, e.g. "f(x) = [f1]expr" in a text-create).',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'expr', label: 'f(x)', type: 'text', default: 'x^2 - 2*x - 1', placeholder: 'e.g.: x^2 + 1' },
          { id: 'id',   label: 'ID (optional)', type: 'text', default: '', placeholder: 'auto' },
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
        description: 'Remove an existing function (+ its labels and tangents)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Function', type: 'func-id', default: '' },
        ],
      },
      {
        id: 'graph-shade-area',
        label: 'shadeUnderCurve',
        description: 'Shade the area under an existing curve between x = a and x = b',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Function', type: 'func-id', default: '' },
          { id: 'a',      label: 'a',        type: 'number',  default: 0 },
          { id: 'b',      label: 'b',        type: 'number',  default: 3 },
        ],
      },
      {
        id: 'graph-find-intersections',
        label: 'findIntersections',
        description: 'Mark the intersection point(s) of f and g — works even if one is written as a general equation (e.g. "-6x+3y=12") rather than solved for y. Shows the (x, y) coordinates by default.',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'f1',        label: 'f(x)', type: 'func-id', default: '' },
          { id: 'f2',        label: 'g(x)', type: 'func-id', default: '' },
          { id: 'color',     label: 'Color (optional)', type: 'color-name', default: '' },
          { id: 'hideLabel', label: 'Hide coordinates', type: 'select', default: '0',
            options: [{ value: '0', label: 'Show (default)' }, { value: '1', label: 'Hide' }] },
        ],
      },
      {
        id: 'graph-add-point',
        label: 'addPoint',
        description: 'Place a point (x, y) — give it a unique ID to keep several. Coordinates reusable elsewhere via [id]x / [id]y (see eq-replace-variable).',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'x', label: 'x', type: 'text', default: '2', placeholder: '2  or  sqrt(3)/2  or  pi/4' },
          { id: 'y', label: 'y', type: 'text', default: '3', placeholder: '-sqrt(3)/2  or  pi  etc.' },
          { id: 'id',         label: 'Point ID (blank = auto)', type: 'text', default: '', placeholder: 'e.g. pA' },
          { id: 'funcId',     label: 'Color from func (optional)', type: 'text', default: '', placeholder: 'e.g. f → curve color, darker' },
          { id: 'label',      label: 'Label (| = new line)', type: 'text', default: '', placeholder: 'e.g. Vertex|(2, -1)' },
          { id: 'showCoords', label: 'Show coords outside', type: 'text', default: 'false', placeholder: 'true / false' },
        ],
      },
      {
        id: 'graph-remove-point',
        label: 'removePoint',
        description: 'Remove a point by its ID',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'id', label: 'Point ID', type: 'text', default: '', placeholder: 'same ID used in addPoint' },
        ],
      },
      {
        id: 'graph-best-fit-line',
        label: 'bestFitLine',
        description: 'Least-squares regression line through a set of already-placed points (see addPoint) — the "line through a cloud of points" trend line. Leave Point IDs blank to use every point currently on the graph. Dashed by default so it reads as a fitted line rather than more data.',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'pointIds', label: 'Point IDs (comma-separated, blank = all points)', type: 'text', default: '', placeholder: 'blank = all points, or p1,p2,p3,p4,p5,p6' },
          { id: 'id',       label: 'Line ID (blank = auto)', type: 'text', default: '', placeholder: 'e.g. trend' },
          { id: 'color',    label: 'Color (optional)', type: 'color-name', default: '' },
        ],
      },
      {
        id: 'graph-scatter-plot',
        label: 'scatterPlot',
        description: 'Scatter of points dispersed around y = slope·x + intercept — coeff controls the spread (0 = all on the line)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'slope',     label: 'Slope (m)',       type: 'number', default: 1 },
          { id: 'intercept', label: 'Y-intercept (b)', type: 'number', default: 0 },
          { id: 'coeff',     label: 'Spread (coefficient)', type: 'number', default: 1 },
          { id: 'count',     label: 'Number of points', type: 'number', default: 20 },
          { id: 'xMin',      label: 'x min', type: 'number', default: -5 },
          { id: 'xMax',      label: 'x max', type: 'number', default: 5 },
          { id: 'color',     label: 'Color (optional)', type: 'color-name', default: '' },
          { id: 'id',        label: 'ID', type: 'text', default: 'cloud1' },
        ],
      },
      {
        id: 'graph-remove-scatter-plot',
        label: 'removeScatterPlot',
        description: 'Remove a scatter plot by its ID',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'id', label: 'ID', type: 'text', default: 'cloud1' },
        ],
      },
      {
        id: 'graph-add-segment',
        label: 'addSegment',
        description: 'Draw a FINITE line segment between two points (not an infinite line). Reusable elsewhere via [id]x1/[id]y1/[id]x2/[id]y2/[id]len (see eq-replace-variable).',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'x1', label: 'x1', type: 'number', default: 0 },
          { id: 'y1', label: 'y1', type: 'number', default: 0 },
          { id: 'x2', label: 'x2', type: 'number', default: 4 },
          { id: 'y2', label: 'y2', type: 'number', default: 0 },
          { id: 'color', label: 'Color (optional)', type: 'color-name', default: '' },
          { id: 'id', label: 'ID', type: 'text', default: 'seg1' },
        ],
      },
      {
        id: 'graph-remove-segment',
        label: 'removeSegment',
        description: 'Remove a segment by its ID',
        status: 'ready', useGraph: true,
        inputs: [{ id: 'id', label: 'ID', type: 'text', default: 'seg1' }],
      },
      {
        id: 'graph-segment-tick',
        label: 'segmentTick',
        description: 'Equal-side mark (1 to 3 perpendicular ticks) at the segment midpoint — change the count to mark a different equal pair',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'id',    label: 'Segment ID', type: 'text',   default: 'seg1' },
          { id: 'ticks', label: 'Number of ticks (1-3)', type: 'number', default: 1, min: 1, max: 3 },
          { id: 'color', label: 'Color', type: 'color-name', default: 'blue' },
        ],
      },
      {
        id: 'graph-remove-segment-tick',
        label: 'removeSegmentTick',
        description: 'Remove the equal-side mark from a segment',
        status: 'ready', useGraph: true,
        inputs: [{ id: 'id', label: 'Segment ID', type: 'text', default: 'seg1' }],
      },
      {
        id: 'graph-divide-segment',
        label: 'divideSegment',
        description: 'Mark the division points that split a segment into N equal sections',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'id',    label: 'Segment ID', type: 'text', default: 'seg1' },
          { id: 'parts', label: 'Sections (N)', type: 'number', default: 2, min: 2 },
          { id: 'color', label: 'Color', type: 'color-name', default: 'purple' },
          { id: 'showLabels', label: 'Show labels (P1, P2…)', type: 'select', default: 'false',
            options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] },
        ],
      },
      {
        id: 'graph-remove-divide-segment',
        label: 'removeDivideSegment',
        description: 'Remove the division points of a segment',
        status: 'ready', useGraph: true,
        inputs: [{ id: 'id', label: 'Segment ID', type: 'text', default: 'seg1' }],
      },
      {
        id: 'graph-adjust-view',
        label: 'adjustView',
        description: 'Center the graph on (cx, cy), visible range = range',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'cx',    label: 'Center x', type: 'number', default: 0 },
          { id: 'cy',    label: 'Center y', type: 'number', default: 0 },
          { id: 'range', label: 'Range',    type: 'number', default: 10, min: 0.1 },
        ],
      },
      {
        id: 'graph-set-viewport',
        label: 'setViewport',
        description: 'Set the visible bounds of the graph',
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
        description: 'Show a floating label on an already-plotted curve — y is always recalculated from f(x0), never typed in. Leave x₀ blank to place it at the current viewport\'s center (avoids an unwanted auto-adjust from a label landing off-screen).',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Function',    type: 'func-id' , default: '' },
          { id: 'label',  label: 'Label',       type: 'text',    default: 'f(x)' },
          { id: 'x0',     label: 'x₀ (blank = viewport center)', type: 'number', default: '' },
        ],
      },
      {
        id: 'graph-tangent',
        label: 'tangent',
        description: 'Draw the tangent of an already-plotted curve at (x₀, y₀)',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Function',    type: 'func-id', default: '' },
          { id: 'x0',     label: 'x₀',          type: 'number',  default: 1 },
          { id: 'y0',     label: 'y₀ (optional)', type: 'number', default: '', placeholder: 'auto' },
        ],
      },
      {
        id: 'graph-horizontal-line',
        label: 'addHorizontalLine',
        description: 'Draw a horizontal line y = c',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'y', label: 'y', type: 'number', default: 1 },
        ],
      },
      {
        id: 'graph-mark-roots',
        label: 'markRoots',
        description: 'Mark the roots f(x) = 0 of an existing curve',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Function', type: 'func-id', default: '' },
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
          { id: 'color',      label: 'Color (optional)', type: 'color-name', default: '' },
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
        description: 'Draw the derivative f\'(x) of an existing curve',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Function', type: 'func-id', default: '' },
        ],
      },
      {
        id: 'graph-riemann-sum',
        label: 'riemannSum',
        description: 'Draw the Riemann rectangles under a curve',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Function', type: 'func-id', default: '' },
          { id: 'a',      label: 'a',        type: 'number',  default: -2 },
          { id: 'b',      label: 'b',        type: 'number',  default:  2 },
          { id: 'n',      label: 'n (rectangles)', type: 'number', default: 5, min: 1, max: 50 },
          {
            id: 'method', label: 'Method', type: 'select', default: 'midpoint',
            options: [
              { value: 'left',     label: 'Left' },
              { value: 'right',    label: 'Right' },
              { value: 'midpoint', label: 'Midpoint' },
            ],
          },
        ],
      },
      {
        id: 'graph-draw-vector',
        label: 'drawVector',
        description: 'Draw a vector (arrow) from (x1,y1) to (x2,y2)',
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
        description: 'Mark angle ABC (vertex B) with an arc + its computed measure (auto square if 90°)',
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
        description: 'Apply a geometric transformation to an existing curve',
        status: 'ready', useGraph: true,
        inputs: [
          { id: 'funcId', label: 'Function', type: 'func-id', default: '' },
          {
            id: 'transformType', label: 'Transformation', type: 'select', default: 'translateX',
            options: [
              { value: 'translateX', label: 'Horizontal shift (→)' },
              { value: 'translateY', label: 'Vertical shift (↑)' },
              { value: 'scaleY',     label: 'Vertical stretch' },
              { value: 'scaleX',     label: 'Horizontal stretch' },
              { value: 'reflectX',   label: 'X-axis reflection (−f)' },
              { value: 'reflectY',   label: 'Y-axis reflection (f(−x))' },
            ],
          },
          { id: 'value', label: 'Value', type: 'number', default: 2 },
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
        description: 'Visual pointer on an element or point', status: 'soon',
        inputs: [],
      },
      {
        id: 'ext-navigation', label: 'Navigation',
        description: 'Next / Previous buttons between sections', status: 'soon',
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
        description: 'Create a text panel with optional title, paragraph or list mode, supports $LaTeX$ inline, {{ mathjs expr }}, and live [id]token value references (same as eq-replace-variable — see its description for the full token list) so numbers shown here never drift from the shape/graph/table that produced them',
        inputs: [
          { id: 'boxId',  label: 'Box ID',  type: 'text', default: 'box1', placeholder: 'box1' },
          { id: 'title',  label: 'Title (optional)', type: 'text', default: '', placeholder: 'My title' },
          { id: 'content', label: 'Content (lines separated by |)', type: 'text',
            default: 'This is the first line.|Second line with $x^2 + y^2 = r^2$.',
            placeholder: 'Line 1|Line 2|Line 3, e.g. Area = {{ [trap]0 * [trap]h }}' },
          { id: 'isList', label: 'List mode', type: 'select', default: 'false',
            options: [
              { value: 'false', label: 'Paragraph' },
              { value: 'true',  label: 'Bullet list' },
              { value: 'steps', label: 'Steps (numbered)' },
            ] },
          { id: 'color',  label: 'Accent color (optional)', type: 'color-name', default: '' },
        ],
      },
      {
        id: 'text-add-item', label: 'Add List Item', status: 'ready',
        useText: true,
        description: 'Append a new item to an existing list text box — supports the same $LaTeX$/{{ }}/[id]token syntax as Create Text Box',
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
          { id: 'color', label: 'Color', type: 'color-name',   default: '#60a5fa' },
        ],
      },
      {
        id: 'cmt-graph-func', label: 'Comment → On Curve', status: 'ready',
        useGraph: true,
        description: 'Comment dot snapped onto a curve at x — or onto a SEGMENT (its id from Add Segment), where it lands on the midpoint and X is ignored',
        inputs: [
          { id: 'cmtId',  label: 'Comment ID (optional)', type: 'text',    default: '', placeholder: 'e.g. cmt1' },
          { id: 'text',   label: 'Text',     type: 'text',    default: 'f(x)' },
          { id: 'funcId', label: 'Function or segment ID', type: 'func-id', default: '' },
          { id: 'x',     label: 'X (ignored for a segment)', type: 'number',  default: '1' },
          { id: 'color',  label: 'Color',    type: 'color-name',    default: '#60a5fa' },
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
          { id: 'color',  label: 'Color',    type: 'color-name',    default: '#60a5fa' },
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
        description: 'A comment box with no connector line or target — just floats on the given side. Text supports the same $LaTeX$/{{ }}/[id]token syntax as Create Text Box (see its description), same as every other comment\'s text field.',
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
          { id: 'color', label: 'Color', type: 'color-name', default: '#60a5fa' },
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
        description: 'Change the text and/or color of an existing comment. Use [eq-result] in text to pull the current equation result (color auto-follows), or any [id]token value reference (same as Create Text Box / eq-replace-variable).',
        inputs: [
          { id: 'cmtId', label: 'Comment ID', type: 'text', default: '', placeholder: 'ID set when created' },
          { id: 'text',  label: 'New Text (optional)',  type: 'text', default: '[eq-result]', placeholder: '[eq-result] or custom' },
          { id: 'color', label: 'New Color (optional)', type: 'color-name', default: '', placeholder: 'leave blank = auto from eq' },
        ],
      },
      {
        id: 'narrate', label: 'Narrate', status: 'ready',
        useAll: true,
        description: 'Set the narration text and speak it aloud — the only function that controls narration. Supports the same $LaTeX$/{{ }}/[id]token syntax as Create Text Box.',
        inputs: [
          { id: 'text', label: 'Text', type: 'text', default: 'Here we can see the two functions intersect at two points.', placeholder: 'What to say…' },
        ],
      },
    ],
  },

  // ── Page flow ─────────────────────────────────────────────────────────────
  {
    id: 'flow',
    label: 'Page Flow',
    defaultOpen: false,
    functions: [
      {
        id: 'set-layout', label: 'Change Layout', status: 'ready',
        useAll: true,
        description: 'Switch the page layout mid-script (e.g. Text + Equation → Equation only → Graph + Equation as a derivation progresses). Shared display slots (like the equation panel staying on screen across all three) smoothly resize and reposition instead of popping; slots that appear or disappear fade.',
        inputs: [
          { id: 'mode', label: 'Layout', type: 'select', default: 'single-equation',
            options: [
              { value: 'single-graph',    label: 'Graph only' },
              { value: 'single-3d',       label: 'Geometry only' },
              { value: 'single-grid',     label: 'Table only' },
              { value: 'single-equation', label: 'Equation only' },
              { value: 'single-calc',     label: 'Calculation steps' },
              { value: 'grid-graph',      label: 'Table + Graph' },
              { value: 'grid-equation',  label: 'Table + Equation' },
              { value: 'geo-equation',    label: 'Geometry + Equation' },
              { value: 'graph-equation',  label: 'Graph + Equation' },
              { value: 'text-graph',      label: 'Text + Graph' },
              { value: 'text-geo',        label: 'Text + Geometry' },
              { value: 'text-grid',       label: 'Text + Table' },
              { value: 'text-equation',   label: 'Text + Equation' },
              { value: 'equation-text',   label: 'Equation + Text' },
            ],
          },
        ],
      },
    ],
  },

  // ── Calcul ────────────────────────────────────────────────────────────────
  {
    id: 'calcul',
    label: 'Calculation',
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
    label: 'Clock',
    defaultOpen: false,
    functions: [
      {
        id: 'clock-show', label: 'Show the Time', status: 'ready',
        useClock: true,
        description: 'Show an analog clock and animate the hands to the given time',
        inputs: [
          { id: 'hour',   label: 'Hour (1–12)',    type: 'number', default: 3, min: 0, max: 12 },
          { id: 'minute', label: 'Minutes (0–59)', type: 'number', default: 0, min: 0, max: 59 },
        ],
      },
      {
        id: 'clock-set-time', label: 'Change the Time', status: 'ready',
        useClock: true,
        description: 'Animate clock hands to a new time',
        inputs: [
          { id: 'hour',   label: 'Hour (1–12)',    type: 'number', default: 6, min: 0, max: 12 },
          { id: 'minute', label: 'Minutes (0–59)', type: 'number', default: 30, min: 0, max: 59 },
        ],
      },
      {
        id: 'clock-highlight-hand', label: 'Point to a Hand', status: 'ready',
        useClock: true,
        description: 'Highlight the hour or minute hand with a glow and label',
        inputs: [
          {
            id: 'hand', label: 'Hand', type: 'select', default: 'hour',
            options: [
              { value: 'hour',   label: 'Hours (short hand)' },
              { value: 'minute', label: 'Minutes (long hand)' },
            ],
          },
        ],
      },
    ],
  },

  // ── MDAS (children) ──────────────────────────────────────────────────────
  {
    id: 'mdas',
    label: 'Order of Operations',
    defaultOpen: false,
    functions: [
      {
        id: 'mdas-example', label: 'MDAS Example', status: 'ready',
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
    label: 'Digits',
    defaultOpen: false,
    functions: [
      {
        id: 'numbers-show', label: 'Show the Digits', status: 'ready',
        useNumbers: true,
        description: 'Show a colorful grid of all 10 digits (0–9), each paired with visual objects illustrating the quantity',
        inputs: [],
      },
    ],
  },

  // ── Arithmetic (children) ─────────────────────────────────────────────────
  {
    id: 'arithmetic',
    label: 'Simple Arithmetic',
    defaultOpen: false,
    functions: [
      {
        id: 'arith-solve', label: 'Solve', status: 'ready',
        useArith: true,
        description: 'Show a vertical +/−/×/÷ calculation step-by-step with borrowing and carries',
        inputs: [
          { id: 'a',  label: 'Top number',  type: 'number', default: 63 },
          { id: 'op', label: 'Operator (+  −  ×  ÷)', type: 'text', default: '-' },
          { id: 'b',  label: 'Bottom number', type: 'number', default: 5 },
        ],
      },
      {
        id: 'mult-table-show', label: 'Multiplication Table', status: 'ready',
        useMult: true,
        description: 'Show the full multiplication table (from 1×1 to N×N) with animation',
        inputs: [
          { id: 'maxN', label: 'From 1 to N', type: 'number', default: 12, min: 2, max: 15 },
        ],
      },
      {
        id: 'mult-table-highlight', label: 'Highlight a Cell', status: 'ready',
        useMult: true,
        description: 'Highlight a cell in the table (row × column)',
        inputs: [
          { id: 'row', label: 'Row (multiplier)',   type: 'number', default: 3 },
          { id: 'col', label: 'Column (multiplicand)', type: 'number', default: 4 },
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
          { id: 'labels', label: 'Custom labels (comma-sep, blank = auto)', type: 'text', default: '', placeholder: 'a=, b=, c=  (blank after "=" auto-fills the real value)' },
        ],
      },
      {
        id: 'geo3d-show-angles',
        label: 'Show Angles',
        description: 'Draw interior angle arcs at each vertex of a flat shape — turn on "Show values" to also label each arc with its actual measured degrees',
        status: 'ready', use3D: true,
        inputs: [
          { id: 'id',    label: 'ID',    type: 'text',       default: 'shape1' },
          { id: 'color', label: 'Color', type: 'color-name', default: 'blue' },
          { id: 'showValues', label: 'Show values (°)', type: 'select', default: 'false',
            options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] },
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
        id: 'geo-show-perimeter-measures', label: 'Show Perimeter Measures',
        description: 'Every side needed for the perimeter, tailored per shape: any polygon → each side highlighted in turn and labeled with its length, circle → r (same radius line as Show Area Measures). Unlike Show Area Measures, this always labels EVERY side since perimeter needs the full sum, not a minimal subset. Works with shapes from either Create Shape (geo-create-polygon) or Create 2D Shape (geo3d-create-2d).',
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
        description: 'Add a volumetric 3D shape to the scene (rotatable). Its dimensions are referenceable elsewhere via [id]token (a/r/h/l/d/R depending on shape — see eq-replace-variable\'s description) — use that instead of retyping the same number.',
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
