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
 *           | { status: "too-advanced", message, alternatives: [exampleId] }
 *           | { status: "trivial", message: "..." }
 *
 *   Request 2 — Generator (sonnet)
 *     System: BASE_RULES + per-module docs for selected modules only
 *     Output: compact lesson JSON
 */

// ── BASE RULES ────────────────────────────────────────────────────────────────
// Injected into every generator call, regardless of module selection.

import { EXAMPLE_LESSONS } from './exampleLessons.js'

export const BASE_RULES = `Lesson generator for math-engine. Return ONLY raw JSON, no prose, no fences.

FORMAT: [["Title","LC",[["FC",a,...],...]],...]
  LC = layout code   FC = function code   args = positional
  ARGS ARE FLAT, siblings of the code: ["fv",0,0,6] — NEVER ["fv",[0,0,6]].
    A nested array puts every argument into the first input and destroys the step.
  bool→0/1  ""=skip optional mid-arg  omit trailing defaults
  Output compact codes ONLY — never {"func":…} form.

ANIMATION FIRST: teach by drawing/animating, not text. No narration steps. Every step = a visual action.

COLORS: 0=red 1=purple 2=orange 3=green 4=yellow 5=pink 6=teal 7=white. Never blue. Never repeat one on a page.

LENGTH: 4-6 pages typical, 3 min, 8 max. Arc: concept → worked example → different case → recap.
  One idea + one visual per page. No padding pages, no cramming stages. Max 8 steps/page.

TEXT(tc/tf): lines sep by | · $latex$ inline · **bold** · JSON: double backslashes (\\\\frac not \\frac)
  ONE FORMULA PER LINE: "$a$|$b$|$c$", never "$a$ $b$ $c$" (narrow panel, wraps mid-fraction).
  Max 3 lines. clr "" unless the user asks for a colored box. Brief annotations → c* codes, not tc.

LAYOUT: any layout with a text panel (tg/tG/tq/te/ge/Ge/Gc) needs ≥1 tc, else pick a non-text layout.
sL:[layout] — change THIS page's layout mid-script (te → "single-equation" → "graph-equation"). Shared
  panels resize smoothly, others fade. Arg is the FULL name, never the LC code. Most pages need no sL.

COMPUTE not assert: every number via {{ expr }} (mathjs) or eq-*; never hand-type a computed result.
SHOW THE WORK: the quantity being solved for stays an UNKNOWN everywhere until the steps derive it —
  in the equation, in tc content, and in shape labels alike. A lesson that states the answer before
  deriving it has taught nothing. Reveal it only after, from the step that found it ([eq-result]).
COLOR LINKS: a colored shape edge/angle REQUIRES its matching eq term or comment in that color. One color per concept.
ORDERING: fp→before fV/fr/fn/fP/ft/fs/cf | gp→before gl/ga/gh/gE/gA/gr | S2c→before S2l/S2a/S2h/S2E/S2A | fp needs an id arg.

[id]token refs (in tc/tf content, and as an ev: value e.g. ev:[a=[tri]0,b=[tri]1]) — never retype a
number another step made; pull it live so it cannot drift:
  2D shape (gp/S2c): [id]N=side N · [id]h=height · [id]r=radius · [id]aN=angle N°
  3D solid (S3c)   : [id]a/r/h/l/d/R — same letters S3m labels: cube→a sphere→r cone/cylinder→r+h
                     rect-prism→l+h+d pyramid→a+h tetra/octahedron→a torus→R+r
  Point (fa)       : [id]x [id]y          Segment (fsg): [id]x1 [id]y1 [id]x2 [id]y2 [id]len
  Function (fp)    : [id]expr=its expression as text · [id]N=Nth number in it L→R, literal
                     ("2x+4"→[id]0=2 [id]1=4) or |slider| live value ("|a|x+|b|"→[id]0=a)
  Slider           : [name]v — by its own name, whichever function uses it
  Table cell       : [id]r<row>c<col> 0-indexed, e.g. [grid1]r0c1
  {{ mathjs }}     : runs AFTER token substitution, so {{ [trap]0 + [trap]1 }} works
  {color: text} or \\clr{color}{x} inside $ $ · [eq-result]=current eq's answer (tf/cu)
`

// ── MODULE DEFINITIONS ────────────────────────────────────────────────────────

export const MODULES = {

  // ── Equation ───────────────────────────────────────────────────────────────
  equation: {
    label: 'Equation Solving',
    description: 'Algebra: solve, distribute, combine, substitute, inverse trig, exponents',
    layouts: ['se', 'te', 'ge', 'Ge', 'qe'],
    doc: `EQUATION LAYOUTS: se=single-equation  te=text-equation  ge=graph-equation  Ge=geo-equation  qe=grid-equation

RULES: eq ONCE per page, never again mid-solve. ef for ANY degree-1 single-variable eq (fractions,
multi-term, constants both sides). Non-linear (quadratic/trig/log): ec/es/eo/ed/eD manually.

STRING SYNTAX: plain math, no LaTeX (LaTeX only inside $...$ in tc) — fractions x/2 (NOT \\frac),
exponents x^2, colored vars |label|{color}

FIND-THE-MISSING-VALUE PAGES — the derivation IS the lesson, so build it as steps:
  eq:"a^2+b^2=c^2" → ev:"a=5,c=13" (knowns ONLY) → es to isolate the unknown term → er (√) / ed / ef
  → the value appears BECAUSE of the steps → only now S2l/tf/cu put it on the shape.
  The shape's own S2c vals do hold the real numbers (geometry cannot be drawn without them) and that
  is fine — they are not learner-visible. Everything the student READS (eq, tc, labels) must keep the
  unknown unknown until derived. Substituting it, or writing "$b^2=169-25=144$" in a tc, skips the
  entire lesson.

FUNCTIONS [positional args]:
  eq:[equation]                      — create/display equation (plain math string)
  ec:[]                              — auto-combine like terms
  eD:[equation]                      — distribute parentheses (provide expanded form)
  es:[termIndex]                     — move term at index to other side (0=first term left→right)
  eo:[]                              — reorder so like terms are adjacent
  ed:[divisor]                       — divide both sides by number
  em:[multiplier]                    — multiply both sides by number (clears x/2=4 style fractions)
  ef:[]                              — animated full solve (combine→send→divide) — use for any degree-1 eq
  ev:[replacements]                  — substitute KNOWN values only, never the one being solved for
                                        (see FIND-THE-MISSING-VALUE). Prefer a live [id]token over a
                                        literal when the value came from a shape/graph/table:
                                        "a=[tri]0,r=[circ]r"
  eS:[name]                          — stash the current solved result under a name (no visual
                                        change); a later eq/ev/tc/cu pulls it back via [name]v
  er:[equation]                      — show √ both sides (eq must be "x^2=N" form)
  ea:[trig]                          — apply inverse trig: sin|cos|tan
  ee:[equation,newDegree]            — change exponent (fade old, fade in new)

INTENT: algebra/solve-for-x → te+eq-* | geo+equation mix → Ge layout
`,
  },

  // ── 2D Shapes (Three.js flat) ──────────────────────────────────────────────
  geo2d: {
    label: '2D Shapes (animated)',
    description: 'Flat 2D shapes (animated): triangles, rectangles, circles, polygons — edges, angle arcs, side labels',
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

fillColor/borderColor: color index (0–7) or "" for default.

SIZE: view is ~12 world units tall — keep every side value 2-10 so the shape, its labels and its
  arcs all fit. Oversized values are auto-zoomed to fit but render small and cramped: teach
  30-40-50 as a 3-4-5 and put the real numbers in S2l labels or the equation.

INDICES:
  right-triangle : v0=BL v1=BR(90°, ALWAYS) v2=top · e0=base e1=vertical e2=hyp
  rectangle/square: v0=BL CCW → v1=BR v2=TR v3=TL · e0=bottom e1=right e2=top e3=left
  trapeze/parallelogram: e0=bottom e1=right e2=top e3=left

S2l blank=auto lengths; literal text only for unknowns ("c = ?"). S2a=all arcs, S2A=pop one;
angle value in text = {{ [id]aN }}°. S2w anchors: "v0","v1"…=vertices, "e0","e1"…=edge midpoints;
arrowId unique per shape; use it for relationships (v2 is opposite e0 in a right-triangle).
ORDERING: S2c before S2l/S2a/S2h/S2E/S2A/S2w/S2x on the same shape.
`,
  },

  // ── 3D Shapes (Three.js volumetric) ───────────────────────────────────────
  geo3d: {
    label: '3D Shapes (volumetric)',
    description: 'Rotatable 3D solids: cube, sphere, cone, cylinder, prism, pyramid',
    layouts: ['s3'],
    doc: `GEO3D LAYOUT: s3=single-3d

FUNCTIONS [positional args]:
  S3c:[id,type,a,b,c,color]    — create 3D shape (auto-rotates in perspective view)
  S3t:[labelId,text,x,y]       — floating text label at world position (y<0 = below shape)
  S3x:[id]                     — remove shape by id
  S3C:[]                       — clear all shapes and labels
  S3m:[id,clr]                 — label the dimensions THIS shape's VOLUME formula needs (auto by type: cube→a sphere→r cone/cylinder→r+h rect-prism→l+w+h pyramid→a+h tetra/octahedron→a torus→R+r). Prefer over hand-written S3t labels.
  S3mx:[id]                    — remove volume-measure labels
  S2E:[id,edgeIndex,color]     — highlight one edge. Box solids only: edgeIndex 0-11 of the 12 box edges.
  S2Ex:[id,edgeIndex]          — remove one edge's highlight
  S2F:[id,faceIndex,color]     — highlight one FACE (translucent panel) — cube/rectangular-prism only. faceIndex: 0=+X 1=-X 2=top 3=bottom 4=+Z 5=-Z
  S2Fx:[id,faceIndex]          — remove one face's highlight
  S2v:[zoom,panX,panY,distance,duration,preset]  — camera. preset (3D only): front|back|top|bottom|side|corner — look straight at a highlighted face.

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

color: index 0-7. Auto-spins, no camera needed. S3t for volume/surface formulas below the shape.
S2E/S2F work on box solids only (cube, prism, rectangular-prism), never curved ones.
`,
  },

  // ── Canvas Geometry (SVG) ──────────────────────────────────────────────────
  geo_canvas: {
    label: 'Canvas Geometry (SVG)',
    description: 'SVG 2D constructions/proofs — arrows, annotations, measurements',
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

gM = exactly the area formula's measures: square→s · rectangle→l+h · parallelogram→b+h(dashed) ·
trapeze→B+b+h(dashed) · triangle→b+h(dashed) · circle→r · other→s. Use it over gr for area (gr gives
height only). gP labels EVERY side — use it for perimeter instead of chaining gE+gl.
tc refs: [id]N=side [id]h=height [id]r=radius [id]aN=angle°. Never guess an angle: {{ [id]aN }}°.
ga/gr/gM/gP clr "" = light blue.
`,
  },

  // ── Graphing (Desmos) ──────────────────────────────────────────────────────
  graph: {
    label: 'Function Graphing',
    description: 'Desmos graphing: plot, shade, intersections, derivatives, Riemann, unit circle, vectors, transforms',
    layouts: ['sg', 'tg', 'ge'],
    doc: `GRAPH LAYOUTS: sg=single-graph  tg=text-graph  ge=graph-equation

FUNCTIONS [positional args]:
  fp:[expr,id,hideLabel]        — plot f(x); id required ("f","g"). Auto-labels "f(x) = expr" near the curve unless hideLabel=1 — no fn for the same curve unless you need another x or custom text.
  fx:[id]                       — remove function
  fs:[id,a,b]                   — shade area under curve from a to b
  fi:[f1,f2,clr,hideLabel]      — intersection points of two functions (also general forms like
                                    "-6x+3y=12"); shows (x,y) unless hideLabel=1
  fa:[x,y,id,funcId,label,showCoords]  — add point (funcId/label/showCoords optional)
  fap:[id]                      — remove point
  fbf:[pointIds,id,clr]         — least-squares trend line through placed points (comma-separated fa ids), dashed
  fsc:[slope,intercept,coeff,count,xMin,xMax,clr,id]  — scatter around y=slope·x+intercept; coeff=spread (0=on the line). Correlation/regression.
  fscx:[id]                     — remove scatter plot
  fsg:[x1,y1,x2,y2,clr,id]      — finite SEGMENT (not an infinite line) — geometry drawn on the graph
  fsgx:[id]                     — remove segment
  fst:[id,ticks,clr]            — congruent tick(s) 1-3 at a segment midpoint; different count = different equal pair
  fstx:[id]                     — remove segment tick
  fsd:[id,parts,clr,showLabels] — mark the points splitting a segment into "parts" equal sections
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

fp with |name| sliders auto-shows a live equation badge — nothing to call.
ORDERING: fp before fV/fr/fn/fP/ft/fs/cf on the same function. fP needs a non-root x.
`,
  },

  // ── Data Tables ───────────────────────────────────────────────────────────
  table: {
    label: 'Data Tables',
    description: 'Animated data grids: values, comparisons, frequency tables',
    layouts: ['sq', 'tq', 'qe'],
    doc: `TABLE LAYOUTS: sq=single-grid  tq=text-grid  qe=grid-equation (table + equation, no text — pair with Th to walk a per-row calculation next to its formula)

FUNCTIONS [positional args]:
  Tt:[data,hdr,gId,clr]          — PREFERRED way to create: data is a literal 2D array "[[2,2,3],[5,5,6]]", size auto-detected, no cols/rows.
  Tc:[gId,cols,rows,hdr,vals]    — create grid (hdr=0/1; vals: rows sep by |, cells by ,)
  Tx:[id]                        — erase grid (fade out)
  Ta:[id,vals]                   — append column (vals: top-to-bottom comma list)
  Tr:[id,colIndex]               — remove column (0=first, -1=last)
  TR:[id,vals]                   — append row (vals: comma list)
  TrR:[id,rowIndex]              — remove row (0=first, -1=last)
  Tv:[id,col,row,val]            — update single cell (col/row 0-based)
  TV:[id,changes]                — update multiple cells "col,row,val|col,row,val"
  Th:[id,rowIndex,clr]           — highlight one row (0-based); calling again slides the same bar, no clear step between rows
  Thx:[id]                       — fade out the row highlight
`,
  },

  // ── Text Boxes ────────────────────────────────────────────────────────────
  text: {
    label: 'Text & Formula Panels',
    description: 'Text/formula panels: LaTeX, lists, computed values',
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

Layouts tg/tG/tq/te/ge/Ge/Gc have a text panel — ≥1 tc or it renders blank. tc = key formulas; c* codes = brief annotations.
`,
  },

  // ── Step-by-step Calculation ───────────────────────────────────────────────
  calc: {
    label: 'Step-by-step Calculation',
    description: 'Vertical LaTeX calculation lines, one at a time (PEMDAS, integrals, derivations)',
    layouts: ['sc'],
    doc: `CALC LAYOUTS: sc=single-calc

FUNCTIONS [positional args]:
  Cs:[latex]    — append one calculation line (LaTeX string)
  Cc:[]         — clear all lines

One step per Cs, LaTeX with doubled backslashes. PEMDAS / arithmetic / long derivations → sc+Cs.
`,
  },

  // ── Comment Annotations ────────────────────────────────────────────────────
  comments: {
    label: 'Comment Annotations',
    description: 'Comment bubbles on points, curves, cells, vertices/edges, equation terms',
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

id="" when no later update is needed. Works on any layout. Prefer c* over tc for brief labels on visuals.
`,
  },
}

// ── ROUTER ────────────────────────────────────────────────────────────────────

// Title + description of every curated lesson, for the router to choose from.
// Imported rather than duplicated so a new example shows up here automatically.
export const EXAMPLE_INDEX = EXAMPLE_LESSONS.map(e => ({ id: e.id, title: e.title, desc: e.desc }))

export const ROUTER_SYSTEM_PROMPT = `Math lesson router. Classify the request; if "ok", pick the display modules.

MODULES:
${Object.entries(MODULES).map(([id, m]) => `${id} — ${m.description}`).join('\n')}

REFERENCE LESSONS — pick the ONE closest in STRUCTURE (how it is built, not keyword overlap); the generator sees it as the worked model it copies. This list IS what can be taught:
${EXAMPLE_INDEX.map(e => `${e.id} — ${e.desc}`).join('\n')}

Prompts come in any language, informal, unpunctuated, misspelled ("pytagore", "equation du 2eme degre", "trigo"). Language/spelling/phrasing NEVER make something off-topic — classify on SUBJECT only.

STATUS:
ok           — math, inside the coverage below, with a related reference lesson. Any phrasing: question, how-to, comparison, exercise request, bare topic.
too-advanced — real math, but outside that coverage — from one step past it (derivatives, limits, matrices) to research level (fractals, IUT theory, measure theory). message = 2-3 short English sentences: what the topic is, and that it is past what these lessons cover. alternatives = 2-3 ids from REFERENCE LESSONS that are the nearest teachable stepping stones.
off-topic    — the SUBJECT IS NOT MATHEMATICS (languages, history, coding, non-math science, advice). Nothing else is off-topic: a mathematical topic these modules cannot teach is too-advanced, never off-topic. Never off-topic for odd phrasing or a foreign language. No message.
trivial      — fully-specified arithmetic, one-line answer ("2+2", "15% of 80"). msg = that answer.

NEVER ASK A QUESTION BACK. Vague, broad, garbled or half-typed prompts get the general concept, never
a question. "quadratics" → the concept lesson, not "which equation?". Ignore stray characters and
typos. Two topics at once → cover the main one. Even "help me with my maths" is "ok": pick a
fundamental and teach it. There is no status for asking. (Vague ≠ in scope: judge coverage first.)

exampleId IS REQUIRED AND NEVER null. The generator copies it as a worked model, and without one it
invents a lesson with nothing good in it. It does NOT have to be the same topic — it has to be built
the way this lesson should be built. "types of angles in shapes" has no lesson of its own → areas or
pythagoras (a shape, labelled and annotated). "reading a bar chart" → central-tendency. Always
something. If two fit, take the one whose STRUCTURE matches, not the one sharing a keyword.

COVERAGE — judged on the TOPIC, separately from which example fits:
  IN  — arithmetic and fractions, order of operations, algebra (linear, quadratic, systems), plane
        geometry, angles, perimeter/area/volume, right-triangle trigonometry, the unit circle,
        functions (linear, quadratic, exponential), unit conversion, descriptive statistics.
  OUT — derivatives, integrals, limits, sequences and series, vectors, matrices, probability
        distributions, complex numbers, formal proofs, and everything past them up to research
        level → too-advanced, however simply they are asked.

MODULE PICK (ok only): minimum set, nothing speculative. "text" whenever another display needs a formula panel; "comments" for point/edge annotations. geo2d XOR geo3d. Prefer geo2d; geo_canvas only for SVG constructions or vertex arrows.

OUTPUT: the JSON object ALONE — no fences, no prose, nothing after the closing brace. Prose is discarded unread; it only costs tokens.
{"status":"ok","modules":[...],"exampleId":"<a reference lesson id — required, never null>"}
{"status":"too-advanced","message":"2-3 sentences","alternatives":["<reference lesson id>","..."]}
{"status":"off-topic"}  {"status":"trivial","message":"..."}

EXAMPLES (the non-English/misspelled ones are real past failures — treat as the bar):
"solve 2x+5=11" · "2x-6+3x=8 ca fait quoi" · "donne moi des exercices sur les equation du 2eme degre" · "¿cómo se resuelve una ecuación de segundo grado?" · "9/11" → {"status":"ok","modules":["equation","text"]}
"right triangle and Pythagorean theorem" · "comment on fait pour trouver c dans pytagore" · "la loi des sinus vs cosinus cest quand on utilise laquelle" → {"status":"ok","modules":["geo2d","equation","text","comments"]}
"wie berechne ich den Umfang eines Kreises" → {"status":"ok","modules":["geo2d","equation","text"]}
"explain the area of a circle" → {"status":"ok","modules":["geo2d","text"]}
"volume of a cylinder" → {"status":"ok","modules":["geo3d","text"]}
"plot x² and find its roots" → {"status":"ok","modules":["graph","text","comments"]}
"3 + 4 × 2 order of operations" → {"status":"ok","modules":["calc"],"exampleId":"linear-eq"}
"types of angles in shapes" → {"status":"ok","modules":["geo2d","text","comments"],"exampleId":"pythagoras"}
"compare student scores in a table" → {"status":"ok","modules":["table","text"]}
"show me how The Mandelbrot Set works" → {"status":"too-advanced","message":"The Mandelbrot set is a fractal from complex analysis: it plots which complex numbers stay bounded when a formula is applied over and over. That needs complex arithmetic and iteration well past high-school level, so there is no lesson for it here.","alternatives":["exponential","parabola","unit-circle"]}
"how does Inter-Universal Teichmüller Theory work" · "prove the Riemann hypothesis" → {"status":"too-advanced","message":"...","alternatives":["quadratic-eq","linear-functions"]}
"how do I conjugate French verbs" · "write me a python script" → {"status":"off-topic"}
"teach me derivative" · "derivatives" · "How to integral adn derival work 6" → {"status":"too-advanced","message":"Derivatives and integrals are calculus: they measure how a function changes and what it accumulates. That comes after the algebra, geometry and function work these lessons cover, so there is no lesson for it here.","alternatives":["parabola","linear-functions","exponential"]}
"help me with my math homework" · "j'ai besoin d'aide en maths" → {"status":"ok","modules":["equation","text"],"exampleId":"linear-eq"}
"2+2" → {"status":"trivial","message":"2 + 2 = 4. Want a topic worth a full lesson?"}
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

export function buildGeneratorPrompt(moduleIds, lang = 'en', exampleCompact = null) {
  const parts = [BASE_RULES.trim()]

  // The router picked the closest hand-built lesson; show it in the exact
  // output format we want back. A real, verified lesson is a far stronger
  // model than the generic per-module snippets this replaced — and it is one
  // the author has already approved.
  if (exampleCompact) {
    parts.push(
      `\n# REFERENCE LESSON\n` +
      `Verified, in the exact output format. Copy its structure/pacing/step use; ` +
      `NOT its topic or numbers.\n` +
      JSON.stringify(exampleCompact)
    )
  }

  // Appended after the base rules, and scoped to learner-visible prose only:
  // compact codes, layout codes, ids and colour names are format, not content —
  // translating those breaks parsing.
  // Always state the language, English included: with no instruction at all the
  // model drifts (a plain English prompt came back entirely in Dutch).
  const langName = LANG_NAMES[lang] ?? 'English'
  parts.push(
    `\n# LANGUAGE\n` +
    `Learner-visible strings (page titles, tc titles+content, comment text) in ${langName}. ` +
    `Never translate structure: func/layout codes, ids, colour names, math notation.`
  )

  for (const id of moduleIds) {
    const m = MODULES[id]
    if (!m) continue
    parts.push(`\n# ${m.label.toUpperCase()}\n${m.doc.trim()}`)
  }

  return parts.join('\n')
}

// One documentation line per compact code, for the repair prompt: the model is
// shown the signature of exactly the functions it got wrong, not the whole
// catalogue — a targeted fix is far more reliable than a re-read of everything.
export function docForCode(code) {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('^\\s*' + escaped + ':')
  for (const m of Object.values(MODULES)) {
    for (const line of m.doc.split('\n')) {
      if (re.test(line)) return line.trim()
    }
  }
  return null
}

