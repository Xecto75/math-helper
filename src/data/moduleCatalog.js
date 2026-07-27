/**
 * moduleCatalog.js
 *
 * Single source of truth for the AI lesson-generation pipeline.
 *
 * ARCHITECTURE:
 *   Request 1 — Router  (haiku, fast/cheap)
 *     Input : user prompt
 *     Output: { status: "ok", modules: ["geo2d", "equation", ...] }
 *           | { status: "off-topic" }
 *           | { status: "clarify" | "trivial", message: "..." }
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

LENGTH: scale to the topic — typically 4–6 pages, 3 minimum and 8 maximum.
  A one- or two-page answer does not teach enough; beyond 8 it stops being one lesson.
  Build a full lesson arc: concept → worked example → a second, different case → recap.
  Each page must earn its place (its own idea, its own visual) — do not pad a thin
  idea across pages, and do not cram distinct stages onto one page.
  max 8 steps/page · no padding steps
TEXT(tc/tf): lines sep by | · $latex$ inline · **bold** · JSON: double backslashes (\\\\frac not \\frac)
tc max 3 lines — prefer the c* comment codes (cf/cG/cE/…) or labels over tc for brief annotations.
tc clr: always "" unless user explicitly asks for a colored box.

LAYOUT RULE: any layout with a text panel (tg/tG/tq/te/ge/Ge/Gc) MUST contain ≥1 tc — never leave the text panel empty. If no formula is needed, use a non-text layout instead.
sL:[layout] — switch THIS page's layout mid-script (e.g. start te, later sL:"single-equation", later sL:"graph-equation" once a graph is needed). Panels shared by both layouts (e.g. the equation panel across te→se→ge) resize smoothly instead of popping; panels that appear/disappear fade. IMPORTANT: layout here is the FULL name string ("single-equation", "graph-equation", …), never the short LC code ("se", "ge") — LC codes are only for the page's own top-level layout slot, not this arg. Only use sL when the page genuinely benefits from evolving its layout as steps progress — most pages should just pick one layout and stay in it.
COMPUTE not assert: derive every number via {{ expr }} (mathjs) or eq-*; never hand-type a computed result.
COLOR LINKS: coloring a shape edge/angle REQUIRES coloring its matching eq term or comment. One color per concept.
ORDERING: fp→before fV/fr/fn/fP/ft/fs/cf | gp→before gl/ga/gh/gE/gA/gr | S2c→before S2l/S2a/S2h/S2E/S2A | fp needs an explicit id arg.

RICH TEXT (tc/tf content) — NEVER hand-type a number that some other step already
created; pull it live with [id]token instead, so it can never drift out of sync:
  Flat 2D shape (gp or S2c) : [id]N=side N  [id]h=height  [id]r=radius  [id]aN=angle N°
  Volumetric 3D solid (S3c) : [id]a/r/h/l/d/R — letter depends on shape type, matches
                               exactly what S3m (Show Volume Measures) labels on screen:
                               cube→a  sphere→r  cone/cylinder→r+h  rectangular-prism→l+h+d
                               pyramid→a+h  tetrahedron/octahedron→a  torus→R+r
  Graph point (fa)          : [id]x  [id]y
  Graph segment (fsg)       : [id]x1 [id]y1 [id]x2 [id]y2 [id]len
  Graph function (fp)       : [id]expr — its plotted expression as text (not a number)
                               [id]N  — the Nth number written in it, left to right, whether
                               a literal ("2x+4" → [id]0=2 [id]1=4) or a |slider| var's live
                               value ("|a|x+|b|" → [id]0=a's value [id]1=b's value)
  Slider (a |name| in fp)   : [name]v — that slider's current value, by its own name,
                               regardless of which function(s) use it
  Table cell (Tt or Tc)     : [id]r<row>c<col>, both 0-indexed, e.g. [grid1]r0c1
  Computed  : {{ mathjs expression }} — runs AFTER [id]token substitution, so
              {{ [trap]0 + [trap]1 }} works
  Color text: {color: text}  or inside $ $: \\clr{color}{x}
  [eq-result]: pull current equation's numeric answer (for tf/cu)
This SAME [id]token syntax also works as an ev: replacement value (see ev: below) —
e.g. ev:[a=[tri]0,b=[tri]1] instead of typing the side lengths again.
`

// ── MODULE DEFINITIONS ────────────────────────────────────────────────────────

export const MODULES = {

  // ── Equation ───────────────────────────────────────────────────────────────
  equation: {
    label: 'Equation Solving',
    description: 'Algebraic equations — linear solving, distribute, combine, inverse trig, variable substitution, exponent steps',
    layouts: ['se', 'te', 'ge', 'Ge', 'qe'],
    doc: `EQUATION LAYOUTS: se=single-equation  te=text-equation  ge=graph-equation  Ge=geo-equation  qe=grid-equation

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
  em:[multiplier]                    — multiply both sides by number (clears x/2=4 style fractions)
  ef:[]                              — animated full solve (combine→send→divide) — use for any degree-1 eq
  ev:[replacements]                  — substitute values e.g. "a=2,b=-3,c=1" — prefer
                                        a live [id]token ref over a literal when the
                                        value came from a shape/graph/table, e.g.
                                        "a=[tri]0,r=[circ]r" (see RICH TEXT above)
  eS:[name]                          — stash the equation's current solved numeric result
                                        under a name (no visual change), so a LATER eq/ev/tc/cu
                                        step can pull it back via [name]v — use to chain solves
  er:[equation]                      — show √ both sides (eq must be "x^2=N" form)
  ea:[trig]                          — apply inverse trig: sin|cos|tan
  ee:[equation,newDegree]            — change exponent (fade old, fade in new)

INTENT: algebra/solve-for-x → te+eq-* | geo+equation mix → Ge layout

EXAMPLE — linear equation:
[["Solve 3x + 6 = 15","te",[["tc","b","Linear Equation","$3x + 6 = 15$",0,""],["eq","3x + 6 = 15"],["ef"]]]]

EXAMPLE — quadratic manual steps:
[["x² − 5x + 6 = 0","te",[["tc","b","Quadratic","$x^2 - 5x + 6 = 0$",0,""],["eq","x^2 - 5x + 6 = 0"],["ec"],["es",0],["ed",1]]]]

EXAMPLE — chained solve, find y=mx+b from two points (save m, use it to find b, then show both):
[["Line through (2,3) and (4,5)","ge",[["fa",2,3,"p1"],["fa",4,5,"p2"],["eq","m = (y2 - y1) / (x2 - x1)"],["ev","y2=[p2]y,y1=[p1]y,x2=[p2]x,x1=[p1]x"],["ef"],["eS","m"],["eq","b = y1 - m * x1"],["ev","y1=[p1]y,m=[m]v,x1=[p1]x"],["ef"],["eS","b"],["eq","y = m*x + b"],["ev","m=[m]v,b=[b]v"]]]]
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
  S2a:[id,color,showValues]                             — show all interior angle arcs; showValues=true also labels each arc with its measured degrees
  S2A:[id,angleIndex,color]                             — pop+recolor one angle arc
  S2E:[id,edgeIndex,color]                              — animated highlight on one edge
  S2tk:[id,edgeIndex,ticks,color]                       — congruent-side tick mark(s) at an edge's midpoint (ticks=1-3; use a different count for a different equal-side pair)
  S2tx:[id,edgeIndex]                                    — remove tick mark(s) from an edge
  S2c with type="line": a genuine line SEGMENT (not an infinite line) — vals=[length]; e0 is its only edge, v0/v1 its endpoints
  S2w:[id,arrowId,from,to,color]                        — draw animated arrow inside shape
  S2W:[id,arrowId]                                      — remove arrow
  S2x:[id]                                              — remove shape
  S2f:[id]                                              — flip horizontal
  S2r:[id]                                              — rotate 90° CCW
  gM:[id,clr]                                           — show ALL area-formula measures (dashed height + relevant side labels — square→s, rectangle→l+h, parallelogram→b+h, trapeze→B+b+h, triangle→b+h, circle→r). Same function as geo_canvas's gM — works on geo2d shapes too.
  gP:[id,clr]                                           — show ALL perimeter-formula measures (every side highlighted in turn + labeled with its length; circle→r same as gM). Same function as geo_canvas's gP — works on geo2d shapes too.

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
  S3m:[id,clr]                 — label exactly the dimensions needed for THIS shape's VOLUME formula (auto-detects by type — cube→a, sphere→r, cone/cylinder→r+h, rectangular-prism→l+w+h, pyramid→a+h, tetrahedron/octahedron→a, torus→R+r). Prefer this over manually writing S3t volume labels.
  S3mx:[id]                    — remove volume-measure labels
  S2E:[id,edgeIndex,color]     — highlight one edge. On cube/rectangular-prism ("box"/"prism"/"rectangular-prism"), edgeIndex is 0-11 (one of the 12 box edges); doesn't work on curved solids (sphere/cone/cylinder/torus).
  S2Ex:[id,edgeIndex]          — remove one edge's highlight
  S2F:[id,faceIndex,color]     — highlight one FACE (translucent panel) — cube/rectangular-prism only. faceIndex: 0=+X 1=-X 2=top 3=bottom 4=+Z 5=-Z
  S2Fx:[id,faceIndex]          — remove one face's highlight
  S2v:[zoom,panX,panY,distance,duration,preset]  — camera control. preset (3D only, optional): "front"|"back"|"top"|"bottom"|"side"|"corner" jumps to that viewing angle — use it to look straight at a highlighted face.

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
Face/edge highlighting (S2E/S2F) only works on box-shaped solids (cube, prism,
rectangular-prism) — curved and other polyhedra solids aren't supported yet.

EXAMPLE — cube with volume:
[["Cube","s3",[["S3c","box","cube",3,"","",1],["S3t","lbl","V = a³ = {{ 3**3 }} units³",0,-4]]]]

EXAMPLE — cylinder:
[["Cylinder","s3",[["S3c","cyl","cylinder",2,5,"",3],["S3t","lbl2","V = πr²h = {{ pi * 4 * 5 }}",0,-5]]]]

EXAMPLE — highlight a face + an edge on a rectangular prism:
[["Surface Area","s3",[["S3c","box","rectangular-prism",4,3,2,1],["S2F","box",2,3],["S2E","box",0,4]]]]
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
  gP:[id,clr]                                           — show ALL perimeter measures (every side highlighted in turn + labeled with its length; circle→r same as gM)

TYPES: triangle  right-triangle  rectangle  square  circle  parallelogram  trapeze  pentagon  hexagon
VALS: right-triangle="a,b"  rectangle="w,h"  square="s"  parallelogram="w,h,dx"  trapeze="aTop,bBot,h"  circle="r"  pentagon/hexagon/octagon="r"

INDICES (same as geo2d):
  right-triangle : v0=BL  v1=BR=90°  v2=top  ·  e0=base  e1=vertical  e2=hyp
  rectangle/square: v0=BL CCW  ·  e0=bottom  e1=right  e2=top  e3=left

gM shows exactly what's needed for the area formula, per type: square→s ; rectangle→l+h ;
parallelogram→b+h(dashed) ; trapeze→B(bottom)+b(top)+h(dashed) ; triangle/right-triangle→b+h(dashed) ;
circle→r ; other polygons→s (one side). Prefer gM over gr when teaching area — gr alone only gives height.
gP always labels EVERY side (perimeter needs the full sum, not a subset) — use gP instead of manually
chaining several gE+gl calls when teaching perimeter.

RICH REFS in tc: [id]N=side  [id]h=height  [id]r=radius  [id]aN=angle°
ANGLES: never guess — use {{ [id]aN }}°
ga/gr/gM/gP clr: ""=light blue

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
  fi:[f1,f2,clr,hideLabel]        — mark intersection points of two functions (works on a general
                                    equation like "-6x+3y=12" too, not just one solved for y);
                                    shows (x,y) coords by default, hideLabel=1 to hide them
  fa:[x,y,id,funcId,label,showCoords]  — add point (funcId/label/showCoords optional)
  fap:[id]                      — remove point
  fbf:[pointIds,id,clr]         — least-squares line through already-placed points (comma-separated
                                    IDs from fa), dashed by default — the "trend line through a scatter"
  fsc:[slope,intercept,coeff,count,xMin,xMax,clr,id]  — scatter plot: points scattered around y=slope·x+intercept; coeff=spread (0=all on the line). Use for correlation/regression lessons.
  fscx:[id]                     — remove scatter plot
  fsg:[x1,y1,x2,y2,clr,id]      — finite line SEGMENT between two points (NOT infinite like y=mx+b) — use for geometry constructions drawn on the graph
  fsgx:[id]                     — remove segment
  fst:[id,ticks,clr]            — congruent-side tick mark(s) (1-3) at a segment's midpoint; different tick count = different equal-side pair
  fstx:[id]                     — remove segment tick
  fsd:[id,parts,clr,showLabels] — mark the points de partage that split a segment into "parts" equal sections
  fsdx:[id]                     — remove segment division points
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
  fB:[points,showCoords,clr]    — batch add points "id:x:y:label|..." (parallel)
  fBP:[pointIds]                — batch show projections "id1|id2|..." (parallel)
  fTC:[]                        — draw complete unit circle (all 16 standard angles)

NOTE: fp automatically shows a live-updating equation badge (bottom of the graph, curve's
color) whenever its expr has |name| sliders — nothing to call for this, it just happens.

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
    layouts: ['sq', 'tq', 'qe'],
    doc: `TABLE LAYOUTS: sq=single-grid  tq=text-grid  qe=grid-equation (table + equation, no text — pair with Th to walk a per-row calculation next to its formula)

FUNCTIONS [positional args]:
  Tt:[data,hdr,gId,clr]          — EASIEST way to create a table: data is a literal 2D array, e.g. "[[2,2,3],[5,5,6],[4,4,4]]" — size is auto-detected, don't also pass cols/rows. Prefer this over Tc.
  Tc:[gId,cols,rows,hdr,vals]    — create grid (hdr=0/1; vals: rows sep by |, cells by ,)
  Tx:[id]                        — erase grid (fade out)
  Ta:[id,vals]                   — append column (vals: top-to-bottom comma list)
  Tr:[id,colIndex]               — remove column (0=first, -1=last)
  TR:[id,vals]                   — append row (vals: comma list)
  TrR:[id,rowIndex]              — remove row (0=first, -1=last)
  Tv:[id,col,row,val]            — update single cell (col/row 0-based)
  TV:[id,changes]                — update multiple cells "col,row,val|col,row,val"
  Th:[id,rowIndex,clr]           — highlight one row (0-based) — pair with an equation panel to
                                    walk through a per-row calculation; calling again just slides
                                    the same bar to the new row, no clear step needed between rows
  Thx:[id]                       — fade out the row highlight

EXAMPLE:
[["3x3 Table","sq",[["Tt","[[2,2,3],[5,5,6],[4,4,4]]"]]]]
[["Grade Table","sq",[["Tc","t1",3,4,1,"Name,Score,Grade|Alice,95,A|Bob,82,B|Carol,78,B+"],["Tv","t1",2,3,"A-"]]]]
`,
  },

  // ── Text Boxes ────────────────────────────────────────────────────────────
  text: {
    label: 'Text & Formula Panels',
    description: 'Floating text panels with LaTeX, bullet lists, and computed values — used alongside other displays to show formulas or explanations',
    layouts: [],
    doc: `TEXT LAYOUTS: sT=single-text (text box alone, no paired display)
TEXT FUNCTIONS [positional args]:
  tc:[boxId,title,content,isList,color]   — create text box
  ti:[bId,item]                           — append item to list box
  tx:[bId,index]                          — remove list item (0=first, -1=last)
  tt:[bId,title]                          — change title
  td:[bId]                                — remove box
  tf:[bId,content]                        — cross-fade content

content syntax: lines sep by | · $latex$ inline · **bold**
isList: 0=paragraph  1=bullet list  "steps"=numbered list ("1. …", "2. …")
color: "" always, unless user asks for a colored box

IMPORTANT: layouts tg/tG/tq/te/ge/Ge/Gc have a text panel — include ≥1 tc or the panel is blank.
Prefer tc for key formulas. Prefer the c* comment codes for brief point annotations.
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
Prefer the c* comment codes over tc for brief labels on visual elements.
`,
  },
}

// ── ROUTER ────────────────────────────────────────────────────────────────────

export const ROUTER_SYSTEM_PROMPT = `You are a math lesson module router.
Given a topic or lesson description, first classify the request, then — only if it needs a lesson — decide which display modules it will need.

Available modules:
${Object.entries(MODULES).map(([id, m]) => `  ${id.padEnd(12)} — ${m.description}`).join('\n')}

Prompts arrive in ANY language (English, French, German, Spanish, Italian,
Portuguese…), often informal, unpunctuated, and misspelled. Language, spelling
and phrasing are NEVER grounds for "off-topic" — classify on SUBJECT MATTER only.
Expect and accept misspelled math terms ("pytagore", "pythagore", "equation du
2eme degre", "trigo").

Step 1 — classify:
  "ok"        — the subject is mathematics. ANY phrasing counts, not just
                "make me a lesson": a direct question ("how do I find c?"),
                a how-to, a concept comparison ("when do I use the law of sines
                vs cosines?"), a request for exercises or practice, or a bare
                topic name. If a math teacher would answer it, it is "ok".
  "off-topic" — the SUBJECT is not mathematics (languages, history, event
                planning, general knowledge, coding, non-math science,
                personal advice). Not for odd phrasing or a foreign language.
  "clarify"   — mentions math but names NO topic at all (e.g. "help me with my
                math homework", "j'ai besoin d'aide en maths"). If any topic is
                named — fractions, equations, triangles… — it is "ok", however
                vague or discouraged the wording ("I don't get fractions at all,
                help" names fractions, so it is "ok", NOT clarify).
  "trivial"   — a fully-specified arithmetic question with a one-line answer, not worth a full lesson (e.g. "2+2", "15% of 80").

  Math includes: algebra, geometry, trigonometry, calculus, statistics, functions, arithmetic.
  When in doubt, classify as "ok" — a false positive (treating a borderline request as math) is far less costly than a false negative (blocking a real math question). Only use "off-topic" when the request is clearly not math. Short ambiguous prompts (e.g. "9/11") should default to math.

Step 2 (only when status is "ok") — pick the minimum module set:
  · Pick the minimum set needed — don't add modules speculatively.
  · Always include "text" when another display needs a formula panel alongside it.
  · Always include "comments" when point annotations or edge labels would help clarity.
  · geo2d and geo3d are mutually exclusive (you can't show a 2D flat shape AND a 3D shape on the same page).
  · geo2d vs geo_canvas: prefer geo2d for new lessons (animated, Three.js); use geo_canvas for SVG constructions or when the lesson specifically needs arrows between vertices.

Reply with ONLY valid JSON — no prose, no fences. One of:
{"status":"ok","modules":["id1","id2",...]}
{"status":"off-topic"}
{"status":"clarify","message":"<one short English sentence asking which math topic>"}
{"status":"trivial","message":"<the direct English answer, one short sentence>"}

Examples:
  "solve 2x + 5 = 11"                            → {"status":"ok","modules":["equation","text"]}
  "right triangle and Pythagorean theorem"        → {"status":"ok","modules":["geo2d","equation","text","comments"]}
  "plot x² and find its roots"                    → {"status":"ok","modules":["graph","text","comments"]}
  "explain the area of a circle"                  → {"status":"ok","modules":["geo2d","text"]}
  "volume of a cylinder"                          → {"status":"ok","modules":["geo3d","text"]}
  "3 + 4 × 2 order of operations"                → {"status":"ok","modules":["calc"]}
  "compare student scores in a table"             → {"status":"ok","modules":["table","text"]}
  "derivative of f(x) = x³"                      → {"status":"ok","modules":["graph","text","calc"]}
  "9/11"                                          → {"status":"ok","modules":["equation","text"]}

  Non-English, informal, misspelled — all "ok". These are REAL failures the
  router previously rejected as off-topic; treat them as the reference bar:
  "comment on fait pour trouver c dans pytagore"  → {"status":"ok","modules":["geo2d","equation","text","comments"]}
  "donne moi des exercices sur les equation du 2eme degre" → {"status":"ok","modules":["equation","text"]}
  "la loi des sinus vs cosinus cest quand on utilise laquelle" → {"status":"ok","modules":["geo2d","equation","text","comments"]}
  "2x-6+3x=8 ca fait quoi"                        → {"status":"ok","modules":["equation","text"]}
  "wie berechne ich den Umfang eines Kreises"     → {"status":"ok","modules":["geo2d","equation","text"]}
  "¿cómo se resuelve una ecuación de segundo grado?" → {"status":"ok","modules":["equation","text"]}

  "how do I conjugate French verbs"               → {"status":"off-topic"}
  "write me a python script to sort a list"       → {"status":"off-topic"}
  "help me with my math problem"                  → {"status":"clarify","message":"Which math topic? (e.g. algebra, geometry, trigonometry…)"}
  "2+2"                                           → {"status":"trivial","message":"2 + 2 = 4. Want to explore a deeper concept instead?"}
`

// ── GENERATOR PROMPT BUILDER ──────────────────────────────────────────────────

/**
 * Build the full generator system prompt for a given set of module ids.
 * BASE_RULES + one section per selected module.
 */
// Language names the model is asked to write in. Only the Latin-alphabet
// languages the interface itself is translated into — the lesson renderer
// handles accents and diacritics fine (French has shipped for a long time),
// but a non-Latin script would need font and layout work first.
const LANG_NAMES = { en: 'English', fr: 'French', de: 'German', es: 'Spanish' }

export function buildGeneratorPrompt(moduleIds, lang = 'en') {
  const parts = [BASE_RULES.trim()]

  // Appended after the base rules, and scoped to learner-visible prose only:
  // compact codes, layout codes, ids and colour names are format, not content —
  // translating those breaks parsing.
  const langName = LANG_NAMES[lang]
  if (langName && lang !== 'en') {
    parts.push(
      `\n${'═'.repeat(60)}\nLANGUAGE\n${'═'.repeat(60)}\n` +
      `Write every learner-visible string in ${langName}: page titles, ` +
      `text-box titles and content, and comment text.\n` +
      `Do NOT translate anything structural — compact function codes, layout ` +
      `codes, shape ids, colour names, ids you invent, and mathematical ` +
      `notation all stay exactly as documented above.`
    )
  }

  for (const id of moduleIds) {
    const m = MODULES[id]
    if (!m) continue
    parts.push(`\n${'═'.repeat(60)}\nMODULE: ${m.label.toUpperCase()}\n${'═'.repeat(60)}\n${m.doc.trim()}`)
  }

  return parts.join('\n')
}
