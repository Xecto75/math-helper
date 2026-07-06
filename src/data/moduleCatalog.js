/**
 * moduleCatalog.js
 *
 * Single source of truth for the AI lesson-generation pipeline.
 *
 * ARCHITECTURE:
 *   Request 1 — Router  (haiku, fast/cheap)
 *     Input : user prompt
 *     Output: { modules: ["geo2d", "equation", ...] }
 *
 *   Request 2 — Generator (sonnet)
 *     System: BASE_RULES + per-module docs for selected modules only
 *     Output: compact lesson JSON
 */

// ── BASE RULES ────────────────────────────────────────────────────────────────
// Injected into every generator call, regardless of module selection.

export const BASE_RULES = `Lesson generator for math-engine. Return ONLY raw JSON, no prose, no fences.

FORMAT: [["Title","LC",[["FC",a,...],...]],...]
  LC = layout code   FC = function code   args = positional
  bool→0/1  ""=skip optional mid-arg  omit trailing defaults
  Output compact codes ONLY — never {"func":…} form.

ANIMATION FIRST: teach by drawing/animating, not text. Never add narration steps.
tc/tf only for a key formula or label — never prose. Every step must be a visual action.

COLORS: 0=red 1=purple 2=orange 3=green 4=yellow 5=pink 6=teal 7=white
  Never use blue. Never repeat a color on the same page.

LIMITS: max 6 pages · max 8 steps/page · no padding steps
TEXT(tc/tf): lines sep by | · $latex$ inline · **bold** · JSON: double backslashes (\\\\frac not \\frac)
tc max 3 lines — prefer cmt/labels over tc for brief annotations.
tc clr: always "" unless user explicitly asks for a colored box.

LAYOUT RULE: any layout with a text panel (tg/tG/tq/te/ge/Ge/Gc) MUST contain ≥1 tc — never leave the text panel empty. If no formula is needed, use a non-text layout instead.
COMPUTE not assert: derive every number via {{ expr }} (mathjs) or eq-*; never hand-type a computed result.
COLOR LINKS: coloring a shape edge/angle REQUIRES coloring its matching eq term or comment. One color per concept.
ORDERING: fp→before fV/fr/fn/fP/ft/fs/cf | gp→before gl/ga/gh/gE/gA/gr | S2c→before S2l/S2a/S2h/S2E/S2A | fp needs an explicit id arg.

RICH TEXT (tc/tf content):
  Geo refs  : [id]N=side N  [id]h=height  [id]r=radius  [id]aN=angle N°
  Computed  : {{ mathjs expression }}
  Color text: {color: text}  or inside $ $: \\clr{color}{x}
  [eq-result]: pull current equation's numeric answer (for tf/cu)
`

// ── MODULE DEFINITIONS ────────────────────────────────────────────────────────

export const MODULES = {

  // ── Equation ───────────────────────────────────────────────────────────────
  equation: {
    label: 'Equation Solving',
    description: 'Algebraic equations — linear solving, distribute, combine, inverse trig, variable substitution, exponent steps',
    layouts: ['se', 'te', 'ge', 'Ge'],
    doc: `EQUATION LAYOUTS: se=single-equation  te=text-equation  ge=graph-equation  Ge=geo-equation

EQUATION RULE:
  · Call eq ONCE to create. NEVER call eq again mid-solve.
  · Use ef for any degree-1 single-variable equation (fractions, multi-term, constants both sides).
  · For non-linear (quadratic, trig, log): use ec/es/eo/ed/eD steps manually.

STRING SYNTAX: plain math — fractions: x/2 (NOT \\frac), exponents: x^2, colored vars: |label|{color}
  NO LaTeX in eq strings. LaTeX only inside $...$ in tc.

FUNCTIONS [positional args]:
  eq:[equation]                      — create/display equation (plain math string)
  ec:[]                              — auto-combine like terms
  eD:[equation]                      — distribute parentheses (provide expanded form)
  es:[termIndex]                     — move term at index to other side (0=first term left→right)
  eo:[]                              — reorder so like terms are adjacent
  ed:[divisor]                       — divide both sides by number
  ef:[]                              — animated full solve (combine→send→divide) — use for any degree-1 eq
  ev:[replacements]                  — substitute values e.g. "a=2,b=-3,c=1"
  er:[equation]                      — show √ both sides (eq must be "x^2=N" form)
  ea:[trig]                          — apply inverse trig: sin|cos|tan
  ee:[equation,newDegree]            — change exponent (fade old, fade in new)

INTENT: algebra/solve-for-x → te+eq-* | geo+equation mix → Ge layout

EXAMPLE — linear equation:
[["Solve 3x + 6 = 15","te",[["tc","b","Linear Equation","$3x + 6 = 15$",0,""],["eq","3x + 6 = 15"],["ef"]]]]

EXAMPLE — quadratic manual steps:
[["x² − 5x + 6 = 0","te",[["tc","b","Quadratic","$x^2 - 5x + 6 = 0$",0,""],["eq","x^2 - 5x + 6 = 0"],["ec"],["es",0],["ed",1]]]]
`,
  },

  // ── 2D Shapes (Three.js flat) ──────────────────────────────────────────────
  geo2d: {
    label: '2D Shapes (animated)',
    description: 'Flat 2D shapes in a 2D canvas: triangles, rectangles, circles, polygons — with animated edges, angle arcs, side labels, movement',
    layouts: ['s3'],
    doc: `GEO2D LAYOUT: s3=single-3d  (used for ALL Three.js displays — 2D and 3D)

FUNCTIONS [positional args]:
  S2c:[id,type,vals,flipX,flipY,fillColor,borderColor]  — create flat 2D shape
  S2m:[id,dx,dy]                                        — move shape by offset
  S2h:[id]                                              — pulse highlight
  S2l:[id,customLabels]                                 — label sides (blank=auto-lengths)
  S2a:[id,color]                                        — show all interior angle arcs
  S2A:[id,angleIndex,color]                             — pop+recolor one angle arc
  S2E:[id,edgeIndex,color]                              — animated highlight on one edge
  S2w:[id,arrowId,from,to,color]                        — draw animated arrow inside shape
  S2W:[id,arrowId]                                      — remove arrow
  S2x:[id]                                              — remove shape
  S2f:[id]                                              — flip horizontal
  S2r:[id]                                              — rotate 90° CCW
  gM:[id,clr]                                           — show ALL area-formula measures (dashed height + relevant side labels — square→s, rectangle→l+h, parallelogram→b+h, trapeze→B+b+h, triangle→b+h, circle→r). Same function as geo_canvas's gM — works on geo2d shapes too.

SHAPE TYPES & VALS:
  triangle         vals="a,b,c"          (3 side lengths)
  right-triangle   vals="a,b"            (two legs; hypotenuse auto)
  rectangle        vals="w,h"
  square           vals="s"
  circle           vals="r"
  parallelogram    vals="w,h,dx"
  trapeze          vals="aTop,bBot,h"
  pentagon         vals="r"             (circumradius)
  hexagon          vals="r"
  octagon          vals="r"
  regular-polygon  vals="r"

fillColor/borderColor: numeric color index (0–7) or "" for default.

VERTEX & EDGE INDICES:
  right-triangle : v0=bottom-left  v1=bottom-right(90°)  v2=top
                   e0=base  e1=vertical  e2=hypotenuse    ← Right angle is ALWAYS v1
  rectangle/square: v0=BL CCW → v1=BR, v2=TR, v3=TL
                    e0=bottom  e1=right  e2=top  e3=left
  trapeze/parallelogram: e0=bottom  e1=right  e2=top  e3=left

LABELS: S2l blank=auto-computed lengths; use literal labels only for unknowns like "c = ?"
ANGLES: S2a draws all arcs; S2A pops one. Use {{ [id]aN }}° for the angle value in text.
ARROWS: S2w draws an animated arrow from one anchor to another inside the polygon.
  from/to anchors — "v0","v1",… = vertex positions · "e0","e1",… = edge midpoints
  arrowId must be unique per shape so multiple arrows can coexist and be removed independently.
  Use to show relationships: e.g. angle v2 is opposite to edge e0 in a right-triangle.
ORDERING: S2c MUST come before S2l/S2a/S2h/S2E/S2A/S2w/S2x on the same shape.

EXAMPLE — right triangle with Pythagorean theorem:
[["Pythagorean Theorem","s3",[["S2c","tri","right-triangle","3,4"],["S2E","tri",0,3],["S2E","tri",1,2],["S2E","tri",2,1],["S2a","tri",4],["S2l","tri","a,b,c"]]]]

EXAMPLE — arrow from angle vertex to opposite edge (shows side-angle relationship):
[["Opposite Side","s3",[["S2c","tri","right-triangle","3,4"],["S2a","tri",3],["S2l","tri",""],["S2w","tri","a1","v2","e0",4]]]]

EXAMPLE — rectangle with labeled sides and highlighted angle:
[["Rectangle","s3",[["S2c","rect","rectangle","6,4"],["S2l","rect",""],["S2A","rect",0,4],["S2A","rect",2,4]]]]

EXAMPLE — circle:
[["Circle","s3",[["S2c","circ","circle","3"],["S2h","circ"]]]]
`,
  },

  // ── 3D Shapes (Three.js volumetric) ───────────────────────────────────────
  geo3d: {
    label: '3D Shapes (volumetric)',
    description: 'Rotatable 3D shapes with perspective: cube, sphere, cone, cylinder, prism, pyramid, etc.',
    layouts: ['s3'],
    doc: `GEO3D LAYOUT: s3=single-3d

FUNCTIONS [positional args]:
  S3c:[id,type,a,b,c,color]    — create 3D shape (auto-rotates in perspective view)
  S3t:[labelId,text,x,y]       — floating text label at world position (y<0 = below shape)
  S3x:[id]                     — remove shape by id
  S3C:[]                       — clear all shapes and labels

SHAPE TYPES & PARAMS:
  cube             a=side length
  sphere           a=radius
  cone             a=radius  b=height
  cylinder         a=radius  b=height
  rectangular-prism a=width  b=height  c=depth
  pyramid          a=base side  b=height
  tetrahedron      a=size
  octahedron       a=size
  torus            a=outer radius

color: numeric index (0–7)
The shape auto-spins; no camera control needed.
Use S3t for volume/surface-area formulas below the shape.

EXAMPLE — cube with volume:
[["Cube","s3",[["S3c","box","cube",3,"","",1],["S3t","lbl","V = a³ = {{ 3**3 }} units³",0,-4]]]]

EXAMPLE — cylinder:
[["Cylinder","s3",[["S3c","cyl","cylinder",2,5,"",3],["S3t","lbl2","V = πr²h = {{ pi * 4 * 5 }}",0,-5]]]]
`,
  },

  // ── Canvas Geometry (SVG) ──────────────────────────────────────────────────
  geo_canvas: {
    label: 'Canvas Geometry (SVG)',
    description: 'SVG-based 2D geometry for detailed step-by-step geometric constructions, proofs, and measurements with arrows and annotations',
    layouts: ['sG', 'tG', 'Ge'],
    doc: `GEO-CANVAS LAYOUTS: sG=single-geo  tG=text-geo  Ge=geo-equation

FUNCTIONS [positional args]:
  gp:[shId,type,vals,flipX,flipY,fillClr,borderClr]   — create polygon/shape
  gx:[id]                                              — erase shape
  gm:[id,dx,dy]                                        — move shape
  gh:[id]                                              — highlight shape (pulse)
  gl:[id,labels]                                       — label sides
  gt:[lId,text,x,y]                                    — add floating text
  ga:[id,clr]                                          — show all angle arcs
  gw:[id,arrId,from,to,clr]                            — draw arrow (from vertex to vertex)
  gW:[arrId]                                           — remove arrow
  gE:[id,edgeIdx,clr]                                  — highlight edge
  gA:[id,vtxIdx,clr]                                   — highlight angle at vertex
  gC:[]                                                — clear all
  gr:[id,clr,angle,label]                              — show measure (circle=radius, polygon=height)
  gM:[id,clr]                                           — show ALL area measures (dashed height + relevant side labels — different per shape type, see below)

TYPES: triangle  right-triangle  rectangle  square  circle  parallelogram  trapeze  pentagon  hexagon
VALS: right-triangle="a,b"  rectangle="w,h"  square="s"  parallelogram="w,h,dx"  trapeze="aTop,bBot,h"  circle="r"  pentagon/hexagon/octagon="r"

INDICES (same as geo2d):
  right-triangle : v0=BL  v1=BR=90°  v2=top  ·  e0=base  e1=vertical  e2=hyp
  rectangle/square: v0=BL CCW  ·  e0=bottom  e1=right  e2=top  e3=left

gM shows exactly what's needed for the area formula, per type: square→s ; rectangle→l+h ;
parallelogram→b+h(dashed) ; trapeze→B(bottom)+b(top)+h(dashed) ; triangle/right-triangle→b+h(dashed) ;
circle→r ; other polygons→s (one side). Prefer gM over gr when teaching area — gr alone only gives height.

RICH REFS in tc: [id]N=side  [id]h=height  [id]r=radius  [id]aN=angle°
ANGLES: never guess — use {{ [id]aN }}°
ga/gr/gM clr: ""=light blue

EXAMPLE — circle area:
[["Circle Area","tG",[["gp","circ","circle","3",0,0,4,0],["gr","circ","",35],["gh","circ"],["tc","b","Circle","A = πr² = {{ pi * [circ]r^2 }}|C = 2πr = {{ 2 * pi * [circ]r }}",0,""]]]]
`,
  },

  // ── Graphing (Desmos) ──────────────────────────────────────────────────────
  graph: {
    label: 'Function Graphing',
    description: 'Desmos-based graphing: plot functions, shade areas, intersections, derivatives, Riemann sums, trig circle, vectors, geometric angles, transformations',
    layouts: ['sg', 'tg', 'ge'],
    doc: `GRAPH LAYOUTS: sg=single-graph  tg=text-graph  ge=graph-equation

FUNCTIONS [positional args]:
  fp:[expr,id,hideLabel]        — plot f(x); id is required (e.g. "f", "g"). Auto-shows a "f(x) = expr" label near the curve unless hideLabel=1 — don't also call fn for the same curve unless you want a different x position or custom text.
  fx:[id]                       — remove function
  fs:[id,a,b]                   — shade area under curve from a to b
  fi:[f1,f2]                    — mark intersection points of two functions
  fa:[x,y,id,funcId,label,showCoords]  — add point (funcId/label/showCoords optional)
  fap:[id]                      — remove point
  fv:[cx,cy,range]              — center view at (cx,cy) with given range
  fV:[xMin,xMax,yMin,yMax]      — set exact viewport bounds
  fn:[id,lbl,x]                 — floating label on a curve at x position
  ft:[id,x,y]                   — draw tangent line at (x, y)
  fh:[y]                        — horizontal line y=c
  fr:[id]                       — mark roots f(x)=0
  fP:[id,showValues]            — dashed projection lines from point to axes
  fd:[id]                       — plot derivative f'(x)
  fR:[id,a,b,n,method]          — Riemann rectangles (method: left|right|midpoint)
  fD:[x1,y1,x2,y2]             — draw vector/arrow
  fT:[id,type,val]              — transform function (translateX|translateY|scaleY|scaleX|reflectX|reflectY)
  fg:[Ax,Ay,Bx,By,Cx,Cy,clr]   — mark angle ABC at vertex B (auto square if 90°)
  fB:[points,showCoords]        — batch add points "id:x:y:label|..." (parallel)
  fBP:[pointIds]                — batch show projections "id1|id2|..." (parallel)
  fTC:[]                        — draw complete unit circle (all 16 standard angles)

ORDERING: fp must come before fV/fr/fn/fP/ft/fs/cf on the same function
fP needs a non-root x value (not exactly on an axis intercept)

EXAMPLE — quadratic with roots:
[["Quadratic f(x)=x²−2x−3","tg",[["fp","x^2-2x-3","f"],["fV",-3,6,-6,8],["fr","f"],["cg","","x=-1",-1,0,1],["cg","","x=3",3,0,2]]]]

EXAMPLE — derivative:
[["Derivative","sg",[["fp","x^3-3*x","f"],["fd","f"],["fn","f","f(x)",2],["ft","f",1,0]]]]
`,
  },

  // ── Data Tables ───────────────────────────────────────────────────────────
  table: {
    label: 'Data Tables',
    description: 'Animated data grids for showing values, comparisons, frequency tables, or step-by-step table manipulations',
    layouts: ['sq', 'tq'],
    doc: `TABLE LAYOUTS: sq=single-grid  tq=text-grid

FUNCTIONS [positional args]:
  Tc:[gId,cols,rows,hdr,vals]    — create grid (hdr=0/1; vals: rows sep by |, cells by ,)
  Tx:[id]                        — erase grid (fade out)
  Ta:[id,vals]                   — append column (vals: top-to-bottom comma list)
  Tr:[id,colIndex]               — remove column (0=first, -1=last)
  TR:[id,vals]                   — append row (vals: comma list)
  TrR:[id,rowIndex]              — remove row (0=first, -1=last)
  Tv:[id,col,row,val]            — update single cell (col/row 0-based)
  TV:[id,changes]                — update multiple cells "col,row,val|col,row,val"

EXAMPLE:
[["Grade Table","sq",[["Tc","t1",3,4,1,"Name,Score,Grade|Alice,95,A|Bob,82,B|Carol,78,B+"],["Tv","t1",2,3,"A-"]]]]
`,
  },

  // ── Text Boxes ────────────────────────────────────────────────────────────
  text: {
    label: 'Text & Formula Panels',
    description: 'Floating text panels with LaTeX, bullet lists, and computed values — used alongside other displays to show formulas or explanations',
    layouts: [],
    doc: `TEXT FUNCTIONS [positional args]:
  tc:[boxId,title,content,isList,color]   — create text box
  ti:[bId,item]                           — append item to list box
  tx:[bId,index]                          — remove list item (0=first, -1=last)
  tt:[bId,title]                          — change title
  td:[bId]                                — remove box
  tf:[bId,content]                        — cross-fade content

content syntax: lines sep by | · $latex$ inline · **bold**
isList: 0=paragraph  1=bullet list
color: "" always, unless user asks for a colored box

IMPORTANT: layouts tg/tG/tq/te/ge/Ge/Gc have a text panel — include ≥1 tc or the panel is blank.
Prefer tc for key formulas. Prefer cmt-* for brief point annotations.
`,
  },

  // ── Step-by-step Calculation ───────────────────────────────────────────────
  calc: {
    label: 'Step-by-step Calculation',
    description: 'Vertical LaTeX calculation display for PEMDAS, integrals, derivatives, multi-step arithmetic — each line appears one at a time',
    layouts: ['sc'],
    doc: `CALC LAYOUTS: sc=single-calc

FUNCTIONS [positional args]:
  Cs:[latex]    — append one calculation line (LaTeX string)
  Cc:[]         — clear all lines

One step per Cs call. LaTeX inside — double all backslashes.
INTENT: PEMDAS / order-of-operations / arithmetic → sc+Cs | complex derivations → sc+Cs

EXAMPLE — PEMDAS:
[["Order of Operations","sc",[["Cs","3 + 4 \\\\times 2"],["Cs","= 3 + 8"],["Cs","= 11"]]]]

EXAMPLE — integral:
[["Definite Integral","sc",[["Cs","\\\\int_1^4 (2x+1)\\\\,dx"],["Cs","= [x^2+x]_1^4"],["Cs","= (16+4)-(1+1)"],["Cs","= 18"]]]]
`,
  },

  // ── Comment Annotations ────────────────────────────────────────────────────
  comments: {
    label: 'Comment Annotations',
    description: 'Floating comment bubbles anchored to graph points, curve segments, grid cells, shape vertices/edges, or equation terms',
    layouts: [],
    doc: `COMMENT FUNCTIONS [positional args]:
  cg:[id,text,x,y,clr]              — comment at exact graph point (x,y)
  cf:[id,text,funcId,x,clr]         — comment snapped onto curve f at x
  cA:[id,text,funcId,x,clr]         — comment inside shaded area under curve at x
  cq:[id,text,gridId,col,row,clr]   — comment on a grid cell
  cG:[id,text,shapeId,vtx,clr]      — comment on a shape vertex
  cE:[id,text,shapeId,edge,clr]     — comment on a shape edge midpoint
  ce:[id,text,side,indices,clr]     — comment on equation (side=both|left|right; indices=blank or "0,1,2")
  cx:[]                              — clear all comments
  cu:[id,text,clr]                  — update existing comment text/color; use [eq-result] to pull eq answer

Leave id="" when you don't need to update it later.
Comments work on any layout — pair with any module.
Prefer cmt over tc for brief labels on visual elements.
`,
  },
}

// ── ROUTER ────────────────────────────────────────────────────────────────────

export const ROUTER_SYSTEM_PROMPT = `You are a math lesson module router.
Given a topic or lesson description, decide which display modules the lesson will need.

Available modules:
${Object.entries(MODULES).map(([id, m]) => `  ${id.padEnd(12)} — ${m.description}`).join('\n')}

Rules:
  · Pick the minimum set needed — don't add modules speculatively.
  · Always include "text" when another display needs a formula panel alongside it.
  · Always include "comments" when point annotations or edge labels would help clarity.
  · geo2d and geo3d are mutually exclusive (you can't show a 2D flat shape AND a 3D shape on the same page).
  · geo2d vs geo_canvas: prefer geo2d for new lessons (animated, Three.js); use geo_canvas for SVG constructions or when the lesson specifically needs arrows between vertices.

Reply with ONLY valid JSON — no prose, no fences:
{"modules":["id1","id2",...]}

Examples:
  "solve 2x + 5 = 11"                            → {"modules":["equation","text"]}
  "right triangle and Pythagorean theorem"        → {"modules":["geo2d","equation","text","comments"]}
  "plot x² and find its roots"                    → {"modules":["graph","text","comments"]}
  "explain the area of a circle"                  → {"modules":["geo2d","text"]}
  "volume of a cylinder"                          → {"modules":["geo3d","text"]}
  "3 + 4 × 2 order of operations"                → {"modules":["calc"]}
  "compare student scores in a table"             → {"modules":["table","text"]}
  "derivative of f(x) = x³"                      → {"modules":["graph","text","calc"]}
`

// ── GENERATOR PROMPT BUILDER ──────────────────────────────────────────────────

/**
 * Build the full generator system prompt for a given set of module ids.
 * BASE_RULES + one section per selected module.
 */
export function buildGeneratorPrompt(moduleIds) {
  const parts = [BASE_RULES.trim()]

  for (const id of moduleIds) {
    const m = MODULES[id]
    if (!m) continue
    parts.push(`\n${'═'.repeat(60)}\nMODULE: ${m.label.toUpperCase()}\n${'═'.repeat(60)}\n${m.doc.trim()}`)
  }

  return parts.join('\n')
}
