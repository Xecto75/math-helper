// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY DISPLAYS — one per page. Defines icon, layout, sub-actions, and
// the input definitions needed by the lesson builder.
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_BACKGROUNDS = [
  { id: 'board',   icon: '🖊️', label: 'Blackboard' },
  { id: 'stomp',   icon: '🌿', label: 'Outdoor' },
]

// Input definition shape:  { id, label, type: 'text'|'number'|'select', options?, default?, placeholder? }

export const SECONDARY_ACTIONS = [
  {
    funcId: 'celebrate',
    icon: '🎉', label: 'Celebration',
    desc:  'Confetti burst',
    inputs: {},
    inputDefs: [],
  },
]

// funcId must map 1-to-1 with ActionExecutor cases AND demoScripts exports.
export const PRIMARY_DISPLAYS = [
  /* ── Clock ──────────────────────────────────────────────────────────── */
  {
    id: 'clock',
    icon: '🕐', color: '#22d3ee',
    label:  'Clock',
    desc:   'Set and read an analog clock',
    layout: 'single-clock',
    initAction: { funcId: 'clock-show', inputs: { hour: '3', minute: '0' } },
    subActions: [
      {
        funcId: 'clock-show', icon: '🕐',
        label: 'Show Clock',
        inputs: { hour: '3', minute: '0' },
        inputDefs: [
          { id: 'hour',   label: 'Hour',   type: 'number', default: '3', placeholder: '1–12' },
          { id: 'minute', label: 'Minute', type: 'number', default: '0', placeholder: '0–59' },
        ],
      },
      {
        funcId: 'clock-set-time', icon: '⏩',
        label: 'Animate to Time',
        inputs: { hour: '6', minute: '30' },
        inputDefs: [
          { id: 'hour',   label: 'Hour',   type: 'number', default: '6', placeholder: '1–12' },
          { id: 'minute', label: 'Minute', type: 'number', default: '30', placeholder: '0–59' },
        ],
      },
      {
        funcId: 'clock-highlight-hand', icon: '👆',
        label: 'Highlight Hand',
        inputs: { hand: 'hour' },
        inputDefs: [
          { id: 'hand', label: 'Hand', type: 'select', default: 'hour', options: [{ value: 'hour', label: 'Hour' }, { value: 'minute', label: 'Minute' }] },
        ],
      },
    ],
  },

  /* ── Number Grid (dice patterns) ────────────────────────────────────── */
  {
    id: 'numbers',
    icon: '🎲', color: '#4ade80',
    label: 'Number Dots',
    desc:  'Show 1–9 using subitizing dot patterns',
    layout: 'single-numbers',
    initAction: { funcId: 'numbers-show', inputs: {} },
    subActions: [
      {
        funcId: 'numbers-show-numeral', icon: '🔢',
        label: 'Reveal Numeral',
        inputs: { n: '1' },
        inputDefs: [
          { id: 'n', label: 'Number (1–9)', type: 'number', default: '1', placeholder: '1–9' },
        ],
      },
    ],
  },

  /* ── Times Table ─────────────────────────────────────────────────────── */
  {
    id: 'mult',
    icon: '✖️', color: '#c084fc',
    label:  'Times Table',
    desc:   'Interactive multiplication table',
    layout: 'single-mult',
    initAction: { funcId: 'mult-table-show', inputs: { maxN: '10' } },
    subActions: [
      {
        funcId: 'mult-table-show', icon: '✖️',
        label: 'Show Table',
        inputs: { maxN: '10' },
        inputDefs: [{ id: 'maxN', label: 'Size', type: 'number', default: '10', placeholder: 'up to 12' }],
      },
      {
        funcId: 'mult-table-highlight', icon: '✨',
        label: 'Highlight Cell',
        inputs: { row: '3', col: '4' },
        inputDefs: [
          { id: 'row', label: 'Row',    type: 'number', default: '3' },
          { id: 'col', label: 'Column', type: 'number', default: '4' },
        ],
      },
    ],
  },

  /* ── Order of Operations ─────────────────────────────────────────────── */
  {
    id: 'mdas',
    icon: '🧮', color: '#fb923c',
    label:  'Order of Operations',
    desc:   'Step-by-step PEMDAS walkthrough',
    layout: 'text-mdas',
    initAction: { funcId: 'mdas-example', inputs: { expr: '3 × 2 + 4' } },
    subActions: [
      {
        funcId: 'mdas-example', icon: '🧮',
        label: 'Solve Expression',
        inputs: { expr: '3 × 2 + 4' },
        inputDefs: [{ id: 'expr', label: 'Expression', type: 'text', placeholder: '3 × 2 + 4' }],
      },
    ],
  },

  /* ── Pizza Fractions ──────────────────────────────────────────────────── */
  {
    id: 'pizza',
    icon: '🍕', color: '#f59e0b',
    label:  'Pizza Fractions',
    desc:   'Visual fraction model with pizza slices',
    layout: 'single-pizza',
    initAction: { funcId: 'pizza-show', inputs: { slices: '4', shaded: '1', label: 'true' } },
    subActions: [
      {
        funcId: 'pizza-show', icon: '🍕',
        label: 'Show Pizza',
        inputs: { slices: '4', shaded: '1', label: 'true' },
        inputDefs: [
          { id: 'slices', label: 'Total slices', type: 'number', default: '4', placeholder: '2–12' },
          { id: 'shaded', label: 'Shaded slices', type: 'number', default: '1', placeholder: '0–N' },
          { id: 'label',  label: 'Show fraction', type: 'select', default: 'true', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
        ],
      },
      {
        funcId: 'pizza-shade', icon: '🎨',
        label: 'Shade Slices',
        inputs: { shaded: '2' },
        inputDefs: [
          { id: 'shaded', label: 'Shaded slices', type: 'number', default: '2' },
        ],
      },
      {
        funcId: 'pizza-compare', icon: '⚖️',
        label: 'Compare Two Pizzas',
        inputs: { slices2: '8', shaded2: '3', label2: 'true' },
        inputDefs: [
          { id: 'slices2', label: 'Slices (right)',  type: 'number', default: '8' },
          { id: 'shaded2', label: 'Shaded (right)',  type: 'number', default: '3' },
          { id: 'label2',  label: 'Show fraction',   type: 'select', default: 'true', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
        ],
      },
    ],
  },

  /* ── Object Counter ───────────────────────────────────────────────────── */
  {
    id: 'counter',
    icon: '🍎', color: '#ef4444',
    label:  'Object Counter',
    desc:   'Count objects — great for addition & multiplication',
    layout: 'single-counter',
    initAction: { funcId: 'counter-show', inputs: { count: '5', type: '🍎' } },
    subActions: [
      {
        funcId: 'counter-show', icon: '🍎',
        label: 'Show Objects',
        inputs: { count: '5', type: '🍎' },
        inputDefs: [
          { id: 'count', label: 'Count', type: 'number', default: '5', placeholder: '1–30' },
          { id: 'type',  label: 'Object emoji', type: 'text', default: '🍎', placeholder: '🍎 ⭐ 🟦 🏀…' },
        ],
      },
      {
        funcId: 'counter-add', icon: '➕',
        label: 'Add Objects',
        inputs: { count: '3', type: '' },
        inputDefs: [
          { id: 'count', label: 'How many to add', type: 'number', default: '3' },
          { id: 'type',  label: 'Object emoji (blank = same)', type: 'text', default: '', placeholder: 'Leave blank to reuse' },
        ],
      },
      {
        funcId: 'counter-group', icon: '⬛',
        label: 'Group Objects',
        inputs: { groupSize: '2', color: '#818cf8' },
        inputDefs: [
          { id: 'groupSize', label: 'Group size', type: 'number', default: '2' },
          { id: 'color',     label: 'Border color', type: 'text', default: '#818cf8', placeholder: '#hex' },
        ],
      },
      {
        funcId: 'counter-remove', icon: '➖',
        label: 'Remove Objects',
        inputs: { count: '2' },
        inputDefs: [
          { id: 'count', label: 'How many to remove', type: 'number', default: '2' },
        ],
      },
    ],
  },

  /* ── Number Line ──────────────────────────────────────────────────────── */
  {
    id: 'numberline',
    icon: '📏', color: '#38bdf8',
    label:  'Number Line',
    desc:   'Animated number line — counting, negatives, fractions',
    layout: 'single-numberline',
    initAction: { funcId: 'numberline-show', inputs: { from: '0', to: '10' } },
    subActions: [
      {
        funcId: 'numberline-show', icon: '📏',
        label: 'Show Number Line',
        inputs: { from: '0', to: '10' },
        inputDefs: [
          { id: 'from', label: 'Start', type: 'number', default: '0' },
          { id: 'to',   label: 'End',   type: 'number', default: '10' },
        ],
      },
      {
        funcId: 'numberline-mark', icon: '📍',
        label: 'Mark a Point',
        inputs: { value: '5', label: '', color: '#ef4444' },
        inputDefs: [
          { id: 'value', label: 'Value',       type: 'number', default: '5' },
          { id: 'label', label: 'Label (blank = auto)', type: 'text', default: '' },
          { id: 'color', label: 'Color',       type: 'text', default: '#ef4444', placeholder: '#hex' },
        ],
      },
      {
        funcId: 'numberline-jump', icon: '🦘',
        label: 'Jump (add/subtract)',
        inputs: { from: '2', steps: '3', size: '1', color: '#4ade80', label: '' },
        inputDefs: [
          { id: 'from',  label: 'Start value',    type: 'number', default: '2' },
          { id: 'steps', label: 'Number of jumps', type: 'number', default: '3' },
          { id: 'size',  label: 'Jump size',      type: 'number', default: '1' },
          { id: 'color', label: 'Color',           type: 'text', default: '#4ade80', placeholder: '#hex' },
          { id: 'label', label: 'Operation label', type: 'text', default: '', placeholder: '+3, ×2…' },
        ],
      },
      {
        funcId: 'numberline-shade', icon: '🎨',
        label: 'Shade a Range',
        inputs: { from: '0', to: '5', color: '#818cf840' },
        inputDefs: [
          { id: 'from',  label: 'From',  type: 'number', default: '0' },
          { id: 'to',    label: 'To',    type: 'number', default: '5' },
          { id: 'color', label: 'Color', type: 'text', default: '#818cf840', placeholder: '#hex with alpha' },
        ],
      },
    ],
  },

  /* ── Shape Board ──────────────────────────────────────────────────────── */
  {
    id: 'shapes',
    icon: '🔷', color: '#60a5fa',
    label:  'Shape Board',
    desc:   'Draw and label geometric shapes',
    layout: 'single-geo',
    initAction: { funcId: 'geo-create-polygon', inputs: { shapeId: 'shape1', 'shape-type': 'rectangle', values: '240,140', fillColor: '#818cf822', borderColor: '#818cf8' } },
    subActions: [
      {
        funcId: 'geo-create-polygon', icon: '🔷',
        label: 'Draw Shape',
        inputs: { shapeId: 'shape1', 'shape-type': 'rectangle', values: '240,140', fillColor: '#818cf822', borderColor: '#818cf8' },
        inputDefs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
          { id: 'shape-type', label: 'Type', type: 'select', default: 'rectangle', options: [
            { value: 'rectangle',      label: 'Rectangle' },
            { value: 'square',         label: 'Square' },
            { value: 'triangle',       label: 'Triangle' },
            { value: 'right-triangle', label: 'Right triangle' },
            { value: 'parallelogram',  label: 'Parallelogram' },
            { value: 'trapeze',        label: 'Trapeze' },
            { value: 'circle',         label: 'Circle' },
            { value: 'pentagon',       label: 'Pentagon' },
            { value: 'hexagon',        label: 'Hexagon' },
            { value: 'octagon',        label: 'Octagon' },
            { value: 'regular-polygon', label: 'Regular polygon' },
          ]},
          { id: 'values', label: 'Dimensions (w,h / s / a,b,c / aTop,bBot,h / r — depends on Type)', type: 'text', default: '240,140' },
          { id: 'fillColor',   label: 'Fill color',   type: 'text', default: '#818cf822' },
          { id: 'borderColor', label: 'Border color', type: 'text', default: '#818cf8' },
        ],
      },
      {
        funcId: 'geo-label-sides', icon: '🏷️',
        label: 'Label Sides',
        inputs: { shapeId: 'shape1', labels: '6 cm,4 cm,6 cm,4 cm' },
        inputDefs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
          { id: 'labels',  label: 'Labels (comma-separated)', type: 'text', default: '6 cm,4 cm,6 cm,4 cm' },
        ],
      },
      {
        funcId: 'geo-show-measure', icon: '📐',
        label: 'Show Measurement',
        inputs: { shapeId: 'shape1', color: '#ef4444', angle: 'false', label: '' },
        inputDefs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
          { id: 'label',   label: 'Custom label', type: 'text', default: '', placeholder: 'P = 20 cm' },
          { id: 'color',   label: 'Color', type: 'text', default: '#ef4444' },
          { id: 'angle',   label: 'Show angle?', type: 'select', default: 'false', options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] },
        ],
      },
      {
        funcId: 'geo-show-angles', icon: '∠',
        label: 'Show Angles',
        inputs: { shapeId: 'shape1', color: '#fbbf24' },
        inputDefs: [
          { id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' },
          { id: 'color',   label: 'Color', type: 'text', default: '#fbbf24' },
        ],
      },
      {
        funcId: 'geo-highlight-shape', icon: '✨',
        label: 'Highlight Shape',
        inputs: { shapeId: 'shape1' },
        inputDefs: [{ id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' }],
      },
      {
        funcId: 'geo-erase-shape', icon: '🗑️',
        label: 'Erase Shape',
        inputs: { shapeId: 'shape1' },
        inputDefs: [{ id: 'shapeId', label: 'Shape ID', type: 'text', default: 'shape1' }],
      },
      {
        funcId: 'geo-clear', icon: '🗑️',
        label: 'Clear All',
        inputs: {}, inputDefs: [],
      },
    ],
  },
]

// Flat lookup: funcId → inputDefs  (for the builder step renderer)
export const ACTION_INPUT_DEFS = {}
for (const pd of PRIMARY_DISPLAYS) {
  for (const sa of pd.subActions) ACTION_INPUT_DEFS[sa.funcId + '::' + pd.id] = sa.inputDefs
  ACTION_INPUT_DEFS[pd.id + '::init'] = pd.initAction
}
for (const sa of SECONDARY_ACTIONS) ACTION_INPUT_DEFS[sa.funcId] = sa.inputDefs
