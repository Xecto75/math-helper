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
import { PANELS } from './panels.js'

export const BASE_RULES = `Lesson generator for Vectora. Return ONLY raw JSON, no prose, no fences.

FORMAT: [["Title","PN",[["FC",a,...],...]],...]
  PN = panel digits (see PANELS)   FC = function code   args = positional
  ARGS ARE FLAT, siblings of the code: ["fv",0,0,6] — NEVER ["fv",[0,0,6]].
    A nested array puts every argument into the first input and destroys the step.
  bool→0/1  ""=skip optional mid-arg  omit trailing defaults
  Output compact codes ONLY — never {"func":…} form.

ANIMATION FIRST: teach by drawing/animating, not text. Every step = a visual action.

COLORS: 0=red 1=purple 2=orange 3=green 4=yellow 5=pink 6=teal 7=white. Never blue. Never repeat one on a page.

LENGTH: 4-6 pages typical, 3 min, 8 max. Arc: concept → worked example → different case → recap.
  One idea + one visual per page. No padding pages, no cramming stages. Max 8 steps/page.

COMPUTE not assert: every number via {{ expr }} (mathjs) or a solving step; never hand-type a computed
  result. {{ }} runs AFTER [id]token substitution, so {{ [a] + [b] }} works.
SHOW THE WORK: the quantity being solved for stays an UNKNOWN everywhere until the steps derive it.
  A lesson that states the answer before deriving it has taught nothing — reveal it only after, from
  the step that found it.
COLOR LINKS: one colour per concept; whatever carries a colour must be matched by whatever refers to it.

INLINE SYNTAX — the ONLY markup these strings understand, anywhere text is written:
  |                    splits lines (a | inside $ $ stays an absolute value)
  **bold**             the only emphasis that exists
  {color: text}        or \\clr{color}{x} inside $ $
  ^sup                 outside maths: "m^2" prints m². Inside $ $ use LaTeX ^{ }.
  $math$  $$block$$    see MATH INSIDE TEXT below
  {{ expr }}           evaluated with mathjs   ·   [id]token   live value off a shape/graph/table
  EVERYTHING ELSE IS PRINTED AS TYPED. *italic*, _underscore_, backtick code spans, # headings
  and "- " bullets are not parsed — those characters appear on the page exactly as written,
  which is how *a word meant to be emphasised* ends up surrounded by asterisks. Emphasis is
  **bold** and nothing else; for a list use the isList argument of tc, not "-" or "1." lines
  you write yourself.

MATH INSIDE TEXT — text boxes, comment bubbles, titles, annotation notes: every string a learner
reads. Put the maths between $ … $ and write ordinary LaTeX (KaTeX renders it).
  THE BACKSLASH IS WRITTEN TWICE IN JSON AND NEVER MORE. "$\\\\sqrt{25}$" is correct: JSON
  turns the two into the one the renderer needs. "$\\\\\\\\sqrt{25}$" arrives as \\\\sqrt and
  prints the letters s q r t on the page — that is the single most common way these lessons break,
  and it breaks silently. Count the backslashes in every $ $ before returning.

  root       $\\\\sqrt{25}$   $\\\\sqrt[3]{8}$      power     $x^2$  $2^{10}$  (braces past one char)
  fraction   $\\\\frac{a}{b}$                 index     $x_1$  $a_{n+1}$
  trig       $\\\\cos \\\\theta$  $\\\\sin(2x)$  $\\\\tan A$   inverse   $\\\\arcsin(0.8)$  $\\\\arccos x$
  greek      $\\\\pi$ $\\\\theta$ $\\\\alpha$ $\\\\Delta$      degrees   $30^\\\\circ$
  multiply   $3 \\\\times 4$  $3 \\\\cdot 4$        plus/minus $\\\\pm$
  compare    $\\\\le$ $\\\\ge$ $\\\\ne$ $\\\\approx$          absolute  $\\\\left|x\\\\right|$
  log/exp    $\\\\log_2 8$  $e^{2x}$           angle     $\\\\angle ABC$
  words and units go inside \\\\text{ }: $49\\\\text{ m}^2$ — bare letters in $ $ come out
  italic, because maths mode reads every letter as a variable.

  Outside the $ $ it is plain prose: write "the square root of 25", never a loose \\sqrt.
  Equation-panel strings (eq/ev/er) are NOT LaTeX — those take plain math, x/2 and x^2.

sL:[mode] — change THIS page's panels mid-script ("0" → "03"). Shared panels resize smoothly,
  others fade. Same digits as the page field. Most pages need no sL.
`

// ── LAYOUTS ───────────────────────────────────────────────────────────────────
// Every layout, and the modules it needs to be fillable. A layout is offered
// only when ALL of them were picked — a two-panel layout with one panel the
// generator has no functions for is what produced invented codes: it chose
// text-graph with no graph module loaded, then made up plausible-looking codes
// to put something in the empty half.
//
// `needs` is a list of alternatives when a panel can be served by more than one
// module (single-3d works with either geo module).
const LAYOUT_INFO = {
  sT: { name: 'single-text',    desc: 'text box alone, no paired display', needs: [['text']] },
  se: { name: 'single-equation', desc: 'equation alone',                   needs: [['equation']] },
  sg: { name: 'single-graph',   desc: 'graph alone',                       needs: [['graph']] },
  sq: { name: 'single-grid',    desc: 'table alone',                       needs: [['table']] },
  s3: { name: 'single-3d',      desc: 'a solid, alone', needs: [['geo2d', 'geo3d']] },
  sc: { name: 'single-calc',    desc: 'calculation lines alone',           needs: [['calc']] },
  te: { name: 'text-equation',  desc: 'text + equation',                   needs: [['text'], ['equation']] },
  tg: { name: 'text-graph',     desc: 'text + graph',                      needs: [['text'], ['graph']] },
  tq: { name: 'text-grid',      desc: 'text + table',                      needs: [['text'], ['table']] },
  tG: { name: 'text-geo',       desc: 'text + SVG geometry',               needs: [['text'], ['geo2d']] },
  ge: { name: 'graph-equation', desc: 'graph + equation',                  needs: [['graph'], ['equation']] },
  Ge: { name: 'geo-equation',   desc: 'SVG geometry + equation',           needs: [['geo2d'], ['equation']] },
  qe: { name: 'grid-equation',  desc: 'table + equation, no text',         needs: [['table'], ['equation']] },
  qg: { name: 'grid-graph',     desc: 'table + graph',                     needs: [['table'], ['graph']] },
}

// The layouts a given module set can actually fill.
// The panels a given module set can actually fill. A panel is offered only if
// at least one of the modules that draw into it was picked, so the generator
// never sees a panel it has no function for.
export function panelsFor(moduleIds) {
  const have = new Set(moduleIds)
  return Object.entries(PANELS)
    .filter(([, pnl]) => pnl.modules.some(m => have.has(m)))
    .map(([digit, pnl]) => `  ${digit} = ${pnl.id}  —  ${pnl.label}`)
}

export function layoutsFor(moduleIds) {
  const have = new Set(moduleIds)
  return Object.entries(LAYOUT_INFO)
    .filter(([, l]) => l.needs.every(alts => alts.some(m => have.has(m))))
    .map(([code, l]) => `  ${code} = ${l.name}  —  ${l.desc}`)
}

// ── MODULE DEFINITIONS ────────────────────────────────────────────────────────
// Each module carries its own `rules` (including how to reference the things it
// creates) and its own `funcs`. Nothing here is emitted unless its module was
// picked, so the generator never reads about a function it cannot call.

export const MODULES = {

  // ── Equation ───────────────────────────────────────────────────────────────
  equation: {
    label: 'Equation Solving',
    description: 'Algebra: solve, distribute, combine, substitute, inverse trig, exponents, arithmetic and geometric sequences, operations on fractions',
    rules: `eq ONCE per page, never again mid-solve. ef for ANY degree-1 single-variable eq (fractions,
multi-term, constants both sides). Quadratic ax^2+bx+c: eQ. Other non-linear (trig/log): ec/es/eo/ed/eD
manually.

STRING SYNTAX: plain math, no LaTeX — fractions x/2 (NOT \\frac), exponents x^2 (a letter or an
expression works too: 2^n, a_1 * r^(n-1)), subscripts a_1, coloured vars |label|{color}.

FIND-THE-MISSING-VALUE PAGES — the derivation IS the lesson, so build it as steps:
  eq:"a^2+b^2=c^2" → ev:"a=5,c=13" (knowns ONLY) → es to isolate the unknown term → er (√) / ed / ef
  → the value appears BECAUSE of the steps → only now is it written anywhere the student reads.
  Everything read (the equation, panel text, labels) must keep the unknown unknown until derived.
  Substituting it, or writing "$b^2=169-25=144$", skips the entire lesson.

REFERENCING RESULTS: [eq-result] = the current equation's answer. eS stashes one under a name, which
  a later step pulls back as [name]v.

FORMULAS THAT ARE NOT SOLVED: a page can put up a theoretical form (y = ax + b, A = pi*r^2) and
explain its parts instead of solving it. eq once, then one eA per part — the underline and its note
say what that piece is. This is the ONLY way to label a piece of a formula: a text box beside the
equation cannot point at anything, and colouring a term says a piece matters without saying why.
One colour per part, and if a text box or a shape refers to that part it carries the same colour.

INTENT: algebra/solve-for-x → an equation layout with eq-*.`,
    funcs: `FUNCTIONS [positional args]:
  eq:[eq]                                   — create/display equation (plain math string)
  ec:[]                                     — auto-combine like terms
  eD:[eq]                                   — distribute parentheses (provide expanded form)
  es:[term]                                 — move term at index to other side (0=first term left→right)
  eo:[]                                     — reorder so like terms are adjacent
  ed:[divisor]                              — divide both sides by number
  em:[multiplier]                           — multiply both sides by number (clears x/2=4 style fractions)
  ef:[]                                     — animated full solve (combine→send→divide) — use for any degree-1 eq
  eQ:[]                                     — QUADRATIC (degree 2, one variable): solves the equation eq put up, terms on
                                              either side — brought to = 0, a, b and c highlighted, the quadratic formula written with
                                              them substituted, the discriminant, then the roots. ef stays for degree 1.
  ev:[replacements]                         — substitute KNOWN values only, never the one being solved for
                                        (see FIND-THE-MISSING-VALUE). Prefer a live [id]token over a
                                        literal when the value came from a shape/graph/table:
                                        "a=[tri]0,r=[circ]r"
  eS:[name]                                 — stash the current solved result under a name (no visual
                                        change); a later eq/ev/tc/cu pulls it back via [name]v
  er:[eq]                                   — show √ both sides (eq must be "x^2=N" form)
  ea:[trig]                                 — apply inverse trig: sin|cos|tan
  ee:[eq,newDegree]                         — change exponent (fade old, fade in new)
  eT:[side,index,op,value]                  — transform ONE term into an equal form. Everything
                                              else that scales acts on both sides; this does not,
                                              because it is a statement about the term, not a move
                                              on the equation — the value is unchanged.
                                              op "over": 6 becomes 6/1, giving it a denominator.
                                              op "amplify" with value k: a fraction of two numbers
                                              has both multiplied by k (6/1 amplified by 3 = 18/3),
                                              which is how two fractions reach a common denominator.
                                              A mixed number is written "6 2/3" — it goes up as
                                              written and its "+" arrives a beat later on its own.
  eR3:[equation]                            — RULE OF THREE. Draws the cross over the equals sign of a
                                              proportion and writes a·d = b·c underneath in grey as each
                                              line lands, then a last line dividing by what multiplied
                                              the unknown. Nothing moves; the equation is not replaced.
                                              It then STOPS on the working, and › writes the answer.
                                              The proportion is typed into eR3 itself — no eq before it.
                                              Write the unknown in |pipes| when it is a NUMERATOR —
                                              "2/3 = |x|/12" — or x/12 parses as (1/12)x and there is no
                                              ratio left to cross. A denominator needs no pipes.
  eFr:[expression]                          — FRACTION OPERATION worked the way it is on paper: + and − bring the
                                              fractions to one denominator (×k beside each), then combine the numerators;
                                              × pairs numerator with numerator and denominator with denominator; ÷ turns
                                              the second fraction over and becomes ×; the answer is reduced last. Type the
                                              operation into eFr itself — "2/3 + 1/4", "3/4 ÷ 2/5", as many fractions as
                                              needed — with no eq before it.
  eFa:[side,index]                          — expand a FACTORIAL one factor at a time: 5! → 4!·5 → 3!·4·5
                                              → … → 1·2·3·4·5. Write it in eq with a plain "!" ("5!",
                                              "5! = x"). Follow with ef to multiply it out. This is the
                                              step that makes n! mean something; the answer alone does
                                              not.
  eSc:[side,index,target]                   — write out SCIENTIFIC NOTATION. The term must have been
                                              created as m x 10^n and written with an x: "24,56 x 10^2". Written "24,56 * 10^2", eq
                                              multiplies it out on the spot and there is no notation left for eSc to write out.
                                              The comma walks one place per beat while the exponent
                                              counts down, and a 0 is laid down when it runs off the
                                              end: 24,56×10² → 245,6×10¹ → 2456. A negative exponent
                                              walks it the other way (24,56×10⁻² → 0,2456).
                                              target = the exponent to stop at (blank = 0, all the way out): 4,45×10⁴ with target 2
                                              becomes 445×10², putting two terms on the same power of ten before they are added.
  eA:[annotId,side,from,to,part,text,color] — underline part of the equation and write a note under it.
                                              SEVEN arguments and the note is the SIXTH — part comes before it and is easy to
                                              skip. part is "" for the whole term; "coeff"/"var" narrow to the a or the x of
                                              "ax"; "int"/"sep"/"dec" narrow to the whole part, the separator or the decimal
                                              part of a decimal number, so 35,234 can be annotated in three pieces. Those
                                              six strings are all it accepts, never a sentence. text is the note itself.
                                              side "left"/"right", cells counted per side from 0, to "" = just that
                                              cell. Overlapping notes stack.
  eX:[annotId]                              — remove one annotation, or all of them when id is ""
  eW:[arrowId,side,from,to,text,place,color] — curved arrow from one term to another with a note at its
                                              middle: how the terms of a SEQUENCE are linked. Write the
                                              sequence in eq as a list, items separated by ";":
                                              "u_0 ; u_1 ; u_2 ; … ; u_n" or "3 ; 7 ; 11 ; 15" (no + between
                                              items, u_0 prints as u₀, "…" is an item too). side "left" for a
                                              list, cells from 0. place "above" for each hop between
                                              neighbours ("+4", "×2"), "below" for one long arrow from the
                                              first term to the last ("+n × 4").
  eWx:[arrowId]                             — remove one arrow, or all of them when id is ""
  eWc:[arrowId,side,from,to,text,place,color] — one arrow from EVERY term to the next, all with the same note,
                                              drawn left to right: the whole sequence linked in one step.
                                              to "" = up to the last term. Use it instead of one eW per hop.
  eSq:[kind,first,step,count,dots,arrows,points,rank,color] — write a SEQUENCE out from its first term and
                                              its step, computed: kind "arithmetic" (+d) or "geometric" (×r).
                                              It goes up as a list with its arrows (+4, ×3) drawn for you.
                                              dots "yes" adds "…"; arrows "above"/"below"/"none"; points
                                              "yes" also plots (n, aₙ) from n = rank on a graph panel.
  eP:[poly,divisor]                         — polynomial long division, laid out as the school tableau. Takes
                                        over the equation panel — a page has an equation or a
                                        division, never both, and either replaces the other. Draws
                                        the setup, then waits; each click brings down one
                                        subtraction. One variable, ^ for exponents: "8x^3-4x^2+8x-12"
                                        divided by "x-1". Use it for factoring and for dividing out a
                                        known root — the panel does the arithmetic.
`,
  },

  // ── Charts ─────────────────────────────────────────────────────────────────
  chart: {
    label: 'Fraction circles',
    description: 'Fraction circles (pies) — a quantity drawn, not a grid of cells; possibility trees and Venn diagrams (counting, basic probability)',
    rules: `Same panel as tables (2), nothing else in common: a table is cells you fill in, a chart is
a quantity you draw. A page has ONE or the other, never both.

FRACTION CIRCLE (cP) is the one to reach for whenever a fraction is the subject: it draws den equal
slices with num filled AND writes the fraction under the circle as plain text. Never pair it with a
text box repeating the same fraction — the circle already says it.

PERCENTAGES: the same circle, the same fill, a different number underneath — cP with mode "percent",
or cM to rewrite one that is already up. Going fraction → percent with cM IS the lesson on percentages:
the drawing stays put, which is what shows they are two names for one quantity. Never draw a second
pie to show the percentage of the first.

IMPROPER FRACTIONS: num MAY exceed den, and that is the case worth drawing. 8/3 comes out as two
whole circles and two thirds of a third — the fill runs on into the next circle instead of stopping
at one. Never reduce 8/3 to 2 2/3 before drawing it, and never clamp it to 3/3: seeing the fill pass
a whole circle IS how the idea lands.
cP builds it in stages on its own: one circle fills, the next arrives beside it while the row
slides over, each keeps its own tally, and the tallies add up into the fraction at the end. Never
stage that by hand with several cP calls — one call is the whole animation.

CHANGING A VALUE: cS sweeps an EXISTING pie to a new value, animating through the in-between fill, so
3/8 → 5/8 is watched filling rather than replaced. That IS the teaching moment — never draw a second
pie to show a new value, and never cX+cP to fake a change. Blank keeps what it has: cS:["p",5] means
five eighths, cS:[chartId,num,den] means the same amount cut into quarters.

EQUIVALENT FRACTIONS: two pies side by side (same panel, two ids) is how 1/2 = 2/4 is shown — same
filled area, different slice count. cS one of them to land on the other.


ONE colour per chart, and whatever refers to it in text or an equation carries the same one.`,
    funcs: `FUNCTIONS [positional args]:
  cP:[chartId,num,den,color,label,mode] — fraction circle: den slices, num filled, the value written
                                       underneath. label is optional text above the circle;
                                       mode "percent" or "decimal" writes it that way from the start.
  cS:[chartId,num,den]                  — sweep an existing pie to a new value. "" for either part keeps
                                       the current one. Animated — this is the point of the panel.
  cM:[chartId,mode]                     — rewrite the value as "percent", "decimal" or "fraction"
                                       ("toggle" cycles the three). The drawing does not move; only the
                                       number under it is rewritten.
  cN:[chartId,sets]                     — the number sets drawn inside one another, ℝ ⊃ ℚ ⊃ 𝔻 ⊃ ℤ ⊃ ℕ,
                                          each with a few examples in its own band. sets "" = those five;
                                          otherwise one row per ring, outermost first, "symbol|name|ex,ex".
                                          The nesting is the teaching: a list of definitions cannot show
                                          that every natural number is also an integer.
  cT:[stages,count,headers,results,id]  — POSSIBILITY TREE: a column per stage, a path per outcome, and
                                       the complete outcomes down a last column. Outcomes comma
                                       separated ("P,F"); stages that differ are separated by "|"
                                       ("P,F | 1,2,3,4,5,6" is a coin then a die). With no "|" the same
                                       outcomes repeat "count" times. Any number of outcomes per stage.
                                       headers names the columns; results="0" hides the last one.
                                       Counting the leaves IS the multiplication rule — use it for
                                       dénombrement, compound experiments and OU/ET, not only for coins.
  cTp:[path,id]                        — follow ONE outcome through that tree, branch by branch: the
                                       path lights up as it is walked and the rest dims. Write it as it
                                       reads in the results column ("PFP"). path="" clears it.
  cV:[sets,id]                                         — VENN diagram, 2 or 3 sets: sets="A,B" or "A,B,C" (never more). Draws
                                    the diagram EMPTY; shade it with cVh, one step per region.
  cVh:[expr,color,id]                                  — shade the region expr names: "A∩B", "A∪B", "A'", "A∩B'", "(A∪B)'",
                                    "A∩B∩C". Use ∩ or &, ∪ or U, ' for the complement, () to group. Each cVh cross-fades out
                                    of the previous one, so walk the cases with several cVh on ONE cV. expr="" clears it.
  cX:[chartId]                          — several at once with "a|b|c" — fade a chart out and drop it
Several charts can share the panel — they lay out in a row automatically, so two pies side by side
is just two cP with different ids.
`,
  },

  // ── 2D Shapes (Three.js flat) ──────────────────────────────────────────────
  // ── 2D Shapes (Three.js flat) ──────────────────────────────────────────────
  // The only flat-geometry module. It shares its engine and its display with
  // geo3d — same scene, same camera — which is why the function ids all read
  // "geo3d-" even for a plane figure.
  geo2d: {
    label: '2D Shapes (animated)',
    description: 'Flat 2D shapes (animated): triangles, rectangles, circles, polygons — edges, angle arcs, side labels',
    rules: `SHAPE TYPES — what a, b, c mean (leave the unused ones ""):
  triangle         a,b,c = the 3 side lengths      right-triangle   a,b = the 2 legs (hyp auto)
  rectangle        a=width  b=height               square           a=side
  circle           a=radius  b=degrees (omit = 360)   line             a=length
                     90 = quarter, 180 = half, 270 = three quarters. A sector is drawn with
                     its two radii, not just the arc.
  parallelogram    a=width  b=height  c=dx         trapeze          a=top  b=bottom  c=height
  trapeze-right    a=top  b=bottom  c=height       rhombus          a=big diag  b=small diag
                     vertical left edge, 2 right angles            area = a x b / 2
  pentagon/hexagon/octagon/regular-polygon         a=circumradius

color: index (0–7) or "" for default.

A RIGHT TRIANGLE IS ALWAYS type "right-triangle" (a=base b=height, right angle at v1) — NEVER
"triangle". Any shape needing a right angle, or a chosen base AND height, is right-triangle: [id]h
comes back EXACTLY as typed. A triangle given 3 sides has a height it COMPUTES — you do not
choose it. Never assume it: read it as [id]h (a 6,5,7 triangle is 3.87 tall, not 4), and if a second
shape has to match that height, it cannot be hand-typed — build the lesson around what gM shows.

SIZE & PLACE: every shape is centred on its centre of gravity (S2p too, so its corners can be copied
  from the problem as written), and the view zooms in on a figure that is much too small and out on
  one that is too big. Keep side values roughly 2-10 anyway: a 30-40-50 triangle is framed the same,
  but it reads better as a 3-4-5 with the real numbers in S2l labels or the equation.

INDICES:
  right-triangle : v0=BL v1=BR(90°, ALWAYS) v2=top · e0=base e1=vertical e2=hyp
  rectangle/square: v0=BL CCW → v1=BR v2=TR v3=TL · e0=bottom e1=right e2=top e3=left
  trapeze/parallelogram: e0=bottom e1=right e2=top e3=left

S2l blank=auto lengths; literal text only for unknowns ("c = ?"). S2a=all arcs, S2A=pop one;
angle value in text = {{ [id]aN }}°. S2w anchors: "v0","v1"…=vertices, "e0","e1"…=edge midpoints;
arrowId unique per shape; use it for relationships (v2 is opposite e0 in a right-triangle).

SNAPPING (S2s) — the ONLY way to draw a figure whose parts touch: a triangle cut by a line parallel
to one side, a median, a segment along part of an edge. S2c always CENTRES what it builds, so two
S2c shapes can never meet. S2s takes its corners from a shape that already exists:
  vN     = corner N        eN@0.4 = 40% along edge N        eN:7.2 = 7.2 units along edge N
  Edge N runs from corner N to corner N+1. Prefer eN:distance — the problem hands you lengths, not
  fractions, and the figure then measures EXACTLY right ([id]N comes back as the true length).
  A snapped shape is an ordinary shape: S2l/S2a/S2n/S2E/[id]N all work on it.
  Triangle ABC cut at D on BC and E on CA, small triangle CDE:
    S2c big triangle AB,BC,CA  then  S2s small big "v2,e1:BD,e2:CE"   (v2=C, then D, then E)

NAMING (S2n) — letters go on the CORNERS, lengths on the SIDES (S2l). Where two shapes share a
corner, name it on ONE of them and put "-" in the other, or the letter is drawn twice on itself.

REFERENCING A SHAPE: [id]N=side N · [id]h=height · [id]r=radius · [id]aN=angle N°. Never retype a
  number the shape already knows — pull it live so it cannot drift.
ORDERING: S2c before S2l/S2a/S2h/S2E/S2A/S2w/S2x on the same shape.
A coloured edge or angle REQUIRES whatever refers to it to carry the same colour.`,
    funcs: `FUNCTIONS [positional args]:
  S2c:[id,type,a,b,c,color]            — create flat 2D shape. a/b/c are SEPARATE
                                                          numeric args (not one "6,4" string) and
                                                          there is ONE color. Flip/rotate are S2f/S2r.
  S2p:[shapeId,points,color,fill]      — polygon from its CORNERS: "x,y;x,y;…" in
                                                          order, not closed. For the figure a problem
                                                          draws when it is nobody's named shape.
                                     fill "no" = outline only, nothing tinting the inside
  S2s:[shapeId,parentId,anchors,color] — NEW shape whose corners sit ON an existing
                                                          one. anchors = ONE comma string; 2 = segment,
                                                          3+ = polygon. See SNAPPING below.
  S2n:[shapeId,names,color]            — name the CORNERS (A,B,C…). ONE comma string,
                                                          one entry per corner, "-" skips one.
  S2m:[id,dx,dy]                       — move shape by offset
  S2h:[id]                             — pulse highlight
  S2l:[id,labels]                      — label sides. labels is ONE string, entries
                                                          COMMA-separated in edge order, never "|":
                                                          "6,4,," labels e0 and e1 and leaves e2/e3
                                                          alone; "" labels every side with its real
                                                          computed length.
  S2a:[id,color,showValues]            — show all interior angle arcs; showValues=true also labels each arc with its measured degrees
  S2A:[id,angleIndex,color]            — pop+recolor one angle arc
  S2Ma:[id,markId,from,vertex,to,color,label,size] — mark ONE angle between three anchors on a shape (vN / eN@t /
                                         eN:d), e.g. angle DEC with E on edge BC; label "" = its measure, "-" = none; angles overlapping at one point pull apart by themselves (the smaller pushed out past the wider)
  S2E:[id,edgeIndex,color]             — animated highlight on one edge
  S2tk:[id,edgeIndex,ticks,color]      — congruent-side tick mark(s) at an edge's midpoint (ticks=1-3; use a different count for a different equal-side pair)
  S2tx:[id,edgeIndex]                  — remove tick mark(s) from an edge
  S2c with type="line": a genuine line SEGMENT (not an infinite line) — vals=[length]; e0 is its only edge, v0/v1 its endpoints
  S2w:[id,arrowId,from,to,color]                — draw animated arrow inside shape
  S2W:[id,arrowId]                              — remove arrow
  S2x:[id]                                      — several at once with "a|b|c" — remove shape
  S2f:[id]                                      — flip horizontal
  S2r:[id]                                      — rotate 90° CCW
  S2v:[zoom,panX,panY,distance,duration,preset] — camera. preset (3D only): front|back|top|bottom|side|corner — look straight at a highlighted face.
  gM:[shapeId,color]                            — show ALL area-formula measures (dashed height + relevant side labels — square→s, rectangle→l+h, parallelogram→b+h, trapeze→B+b+h, triangle→b+h, circle→r)
  gP:[shapeId,color]                            — show ALL perimeter-formula measures (every side highlighted in turn + labeled with its length; circle→r same as gM)
ga/gr/gM/gP clr "" = light blue.
`,
  },


  // ── 3D Shapes (Three.js volumetric) ───────────────────────────────────────
  geo3d: {
    label: '3D Shapes (volumetric)',
    description: 'Rotatable 3D solids: cube, sphere, cone, cylinder, prism, pyramid',
    rules: `SHAPE TYPES & PARAMS:
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

REFERENCING A SOLID: [id]a/r/h/l/d/R — the same letters S3m labels: cube→a · sphere→r ·
  cone/cylinder→r+h · rect-prism→l+h+d · pyramid→a+h · tetra/octahedron→a · torus→R+r.
  Pull the number live rather than retyping it.`,
    funcs: `FUNCTIONS [positional args]:
  S3c:[id,type,a,b,c,color]                     — create 3D shape (auto-rotates in perspective view)
  S3t:[labelId,text,x,y]                        — floating text label at world position (y<0 = below shape)
  S3x:[id]                                      — remove shape by id
  S3C:[]                                        — clear all shapes and labels
  S3m:[id,color,values]                                — label the dimensions THIS shape's VOLUME formula needs (auto by type: cube→a sphere→r cone/cylinder→r+h rect-prism→l+w+h pyramid→a+h tetra/octahedron→a torus→R+r). Prefer over hand-written S3t labels. values "letters" writes only the letters (r, h…), no numbers — for finding them.
  S3mx:[id]                                     — remove volume-measure labels
  S2E:[id,edgeIndex,color]                      — highlight one edge. Box solids only: edgeIndex 0-11 of the 12 box edges.
  S2Ex:[id,edgeIndex]                           — remove one edge's highlight
  S2F:[id,faceIndex,color]                      — highlight one FACE (translucent panel) — cube/rectangular-prism only. faceIndex: 0=+X 1=-X 2=top 3=bottom 4=+Z 5=-Z
  S2Fx:[id,faceIndex]                           — remove one face's highlight
  S2v:[zoom,panX,panY,distance,duration,preset] — camera. preset (3D only): front|back|top|bottom|side|corner — look straight at a highlighted face.
`,
  },

  // ── Canvas Geometry (SVG) ──────────────────────────────────────────────────
  // The SVG geometry module used to live here. It drew the same plane figures
  // as geo2d through a second engine, which is what made a flat trapezoid come
  // out under a "geo3d-" function id. Geometry is one engine now — the same
  // one the solids use. Its gp/gs/gv functions still run, for lessons already
  // saved and from the Builder; the API just cannot pick them.

  // ── Graphing (Desmos) ──────────────────────────────────────────────────────
  graph: {
    label: 'Function Graphing',
    description: 'Desmos graphing: plot, shade, intersections, unit circle, vectors, transforms, conics (vertices, foci, directrix, asymptotes)',
    layouts: ['sg', 'tg', 'ge'],
    rules: `REFERENCING WHAT IS PLOTTED — pull the value live, never retype it:
  Point (fa)    : [id]x  [id]y
  Segment (fsg) : [id]x1 [id]y1 [id]x2 [id]y2 [id]len
  Function (fp) : [id]expr = its expression as text · [id]N = the Nth number in it L→R, either a
                  literal ("2x+4" → [id]0=2, [id]1=4) or a |slider| live value ("|a|x+|b|" → [id]0=a)
  Slider        : [name]v — by its own name, whichever function uses it
  Conic (fK)    : its points are graph points — [idF]x [idF]y, [idV1]x … · its numbers [id]a [id]b [id]c
                  [id]p [id]e [id]h [id]k [id]r

fp with |name| sliders auto-shows a live equation badge — nothing to call.
CONICS: plot the conic with fp in any form ("x^2/9 + y^2/4 = 1", "y = (x-1)^2/8"), then fK shows its vertices, foci,
  directrix, asymptotes — never work those out and place them with fa/fh/fsg yourself.
ORDERING: fp before fV/fr/fn/fP/fs/fK on the same function. fp needs an id arg. fP needs a non-root x.`,
    funcs: `FUNCTIONS [positional args]:
  fp:[expr,id,hideLabel]                               — plot f(x); id required ("f","g"). Auto-labels "f(x) = expr" near the curve unless hideLabel=1 — no fn for the same curve unless you need another x or custom text.
                                    fp also takes an INEQUALITY and shades the region it describes: "x > -2", "x >= -2",
                                    "y < 2x+1", "2x - y >= 3". Strict (> <) draws a DASHED boundary, inclusive (>= <=) a solid
                                    one. A region is never auto-labelled, so hideLabel does not apply to it.
  fx:[funcId]                                          — remove function
  fs:[funcId,a,b]                                      — shade area under curve from a to b
  fi:[f1,f2,color,hideLabel]                           — intersection points of two functions (also general forms like
                                    "-6x+3y=12"); shows (x,y) unless hideLabel=1
  fa:[x,y,id,funcId,color,label,showCoords,style,hideLabel] — add point; all but x,y optional.
                                    funcId = take that curve's colour. style "open" = hollow dot (endpoint NOT included);
                                    hideLabel=1 = a bare dot.
  fap:[id]                                             — remove point
  fbf:[pointIds,id,color]                              — least-squares trend line through placed points (comma-separated fa ids), dashed
  fsc:[slope,intercept,coeff,count,xMin,xMax,color,id] — scatter around y=slope·x+intercept; coeff=spread (0=on the line). Correlation/regression.
  fscx:[id]                                            — remove scatter plot
  fsg:[x1,y1,x2,y2,color,id,arrow,name]                    — finite SEGMENT (not an infinite line) — geometry drawn on the graph; name is written beside it (a vector's gets its arrow on top), and the same id again changes it in place
                                    arrow="end" makes it a VECTOR, "both" a two-headed measure arrow; omit it for a plain
                                    segment. Prefer fsg over fD: a vector is a segment, so it gets an id, a colour and removal.
  fsgx:[id]                                            — remove segment
  fst:[id,ticks,color]                                 — congruent tick(s) 1-3 at a segment midpoint; different count = different equal pair
  fstx:[id]                                            — remove segment tick
  fsd:[id,parts,color,showLabels]                      — mark the points splitting a segment into "parts" equal sections
  fsdx:[id]                                            — remove segment division points
  fv:[cx,cy,range]                                     — center view at (cx,cy); range = VERTICAL span. LEAVE MARGIN: ask for
                                    ~1.5x the span you need, or the vertex/root/point at the extreme
                                    sits flat on the edge of the panel. x follows the panel shape.
  fV:[xMin,xMax,yMin,yMax]                             — exact bounds, padded the same way (~a quarter of the span spare on
                                    each side). Widened automatically to keep units square.
  fn:[funcId,label,x0]                                 — floating label on a curve at x position
  fh:[y]                                               — horizontal line y=c
  fr:[funcId]                                          — mark roots f(x)=0
  fP:[pointId,showValues]                              — dashed projection lines from point to axes; given a VECTOR (segment id) instead,
                                                       its components: dashed Δx and Δy legs labelled "Δx = …", "Δy = …"
  fD:[x1,y1,x2,y2]                                     — draw vector/arrow
  fgb:[a,b,color,id,side,label]                        — mark the ANGLE BETWEEN two segments/vectors, by their ids. The arc
                                    sits on the endpoint they share — two vectors from the origin meet there — or where
                                    their lines cross. Right angles draw a square instead of an arc. Measure is computed.
                                    side "right"/"above-left"/… picks one of the FOUR angles two crossing lines make (opposite, alternate
                                    interior…) by where it opens; label replaces the measure ("-" = none).
  fgx:[id]                                             — remove an angle mark
  fT:[funcId,transformType,value]                      — transform function (translateX|translateY|scaleY|scaleX|reflectX|reflectY)
  fg:[ax,ay,bx,by,cx,cy,color,id,label]                — mark angle ABC at vertex B (auto square if 90°); label replaces the measure ("-" = none)
  fB:[points,showCoords,color]                         — batch add points "id:x:y:label|..." (parallel)
  fBP:[pointIds]                                       — batch show projections "id1|id2|..." (parallel)
  fTC:[]                                               — draw complete unit circle (all 16 standard angles)
  fK:[funcId,show,id,labels,color]                     — CHARACTERISTIC ELEMENTS of the conic fp plotted (parabola, ellipse, circle,
                                    hyperbola; any form, position or tilt), computed from the curve: show = comma list of
                                    vertices|foci|centre|directrix|asymptotes|axes, blank = the usual ones for that conic;
                                    labels both|names|coords|none. Its points are graph points id+code (id "P": PV PF for a
                                    parabola, PC PV1 PV2 (PV3 PV4 ellipse) PF1 PF2) → cg at [PF]x,[PF]y; numbers [P]a [P]b [P]c
                                    [P]p [P]e [P]h [P]k [P]r.
  fKx:[id]                                             — remove the elements shown under that id
`,
  },

  // ── Data Tables ───────────────────────────────────────────────────────────
  table: {
    label: 'Data Tables',
    description: 'Animated data grids: values, comparisons, frequency tables',
    layouts: ['sq', 'tq', 'qe'],
    rules: `REFERENCING A CELL: [id]r<row>c<col>, 0-indexed — e.g. [grid1]r0c1. Pull the value live
  rather than retyping it.
Th walks a per-row calculation: call it again to slide the same bar to the next row, no clear between.`,
    funcs: `FUNCTIONS [positional args]:
  Tc:[gridId,cols,rows,headerRow,headerCol,values,color]
                                         — create the grid. vals: rows separated by |, cells by ,
                                           headerRow styles the TOP ROW as headings, headerCol the
                                           LEFT COLUMN (both 0/1). Turn both on for a table that
                                           crosses two axes — a times table, two dice, a truth
                                           table — where the top row and the left column are the
                                           things being compared and every other cell is a result.
                                           One grid per panel: creating another replaces it.
  Tx:[gridId]                            — erase grid (fade out)
  Ta:[gridId,values]                     — append column (vals: top-to-bottom comma list)
  Tr:[gridId,colIndex]                   — remove column (0=first, -1=last)
  TR:[gridId,values]                     — append row (vals: comma list)
  TrR:[gridId,rowIndex]                  — remove row (0=first, -1=last)
  Tv:[gridId,col,row,value]              — update single cell (col/row 0-based)
  TV:[gridId,changes]                    — update multiple cells "col,row,val|col,row,val"
  Th:[gridId,rowIndex,color]             — highlight one row (0-based); calling again slides the same bar, no clear step between rows
  Thx:[gridId]                           — fade out the row highlight
`,
  },

  // ── Text Boxes ────────────────────────────────────────────────────────────
  text: {
    label: 'Text & Formula Panels',
    description: 'Text/formula panels: LaTeX, lists, computed values',
    layouts: [],
    rules: `ONE FORMULA PER LINE: "$a$|$b$|$c$", never "$a$ $b$ $c$" — the panel is narrow and wraps
  mid-fraction. Max 3 lines per box.
isList: 0=paragraph · 1=bullet list · "steps"=numbered list ("1. …", "2. …")
color: "" always, unless the user asks for a coloured box.
Any layout with a text panel needs ≥1 tc, or that half renders blank — otherwise pick a layout
  without one. tc is for key formulas; brief labels on a visual belong to annotation functions.`,
    funcs: `FUNCTIONS [positional args]:
  tc:[boxId,title,content,isList,color] — create text box
  ti:[boxId,item]                       — append item to list box
  tx:[boxId,index]                      — remove list item (0=first, -1=last)
  tt:[boxId,title]                      — change title
  td:[boxId]                            — several at once with "a|b|c" — remove box
  tf:[boxId,content]                    — cross-fade content
`,
  },

  // ── Step-by-step Calculation ───────────────────────────────────────────────
  calc: {
    label: 'Step-by-step Calculation',
    description: 'Vertical LaTeX calculation lines, one at a time (PEMDAS, derivations), and the animated order-of-operations walkthrough',
    layouts: ['sc'],
    rules: `One step per Cs, LaTeX with doubled backslashes. PEMDAS, arithmetic and long derivations
  belong here rather than in an equation panel.`,
    funcs: `FUNCTIONS [positional args]:
  Cs:[latex] — append one calculation line (LaTeX string)
  Cc:[]      — clear all lines
  Mx:[expr]  — ORDER OF OPERATIONS, one operation at a time: × and ÷ left to right, then + and −, each
               pair highlighted and collapsed into its result, with the rules box beside it. expr = whole
               numbers and + − × ÷ only ("4 + 8 ÷ 2 - 1 × 3"): no parentheses, exponents or decimals, and
               every division comes out whole. It fills its own page: that page's panel field is "sM"
               instead of digits, and Mx is its only step.
`,
  },

  // ── Comment Annotations ────────────────────────────────────────────────────
  comments: {
    label: 'Comment Annotations',
    description: 'Comment bubbles on points, curves, cells, vertices/edges, equation terms',
    layouts: [],
    rules: `id="" when no later update is needed (cu/cd need one). Works on any layout. Prefer a
  comment over a text box for a brief label on a visual.
Only the comment functions for panels this lesson actually has are listed below.`,
    // A comment has to attach to something. Each line names the module whose
    // panel it anchors on, so a lesson with no graph is never shown how to
    // comment on a curve.
    funcs: (have) => {
      const lines = [
        ['graph', `  cg:[cmtId,text,x,y,color]         — comment at exact graph point (x,y). x/y take a live value too:
                                      "[x]v" (saved result), "[pA]x", or {{ }} arithmetic on them —
                                      never hand-type a coordinate the lesson already derived.`],
        ['graph', `  cf:[cmtId,text,funcId,x,color]    — comment snapped onto curve f at x. funcId may instead be a
                                      SEGMENT id (from fsg): it anchors on the segment's midpoint in
                                      both x and y, x ignored — use this for "rise = 6" style labels
                                      rather than cg with hand-typed coordinates.`],
        ['graph', '  cA:[cmtId,text,funcId,x,color]    — comment inside shaded area under curve at x'],
        ['table', '  cq:[cmtId,text,gridId,col,row,color]  — comment on a grid cell'],
        ['shape', '  cG:[cmtId,text,shapeId,vertexIndex,color]  — comment on a shape vertex'],
        ['shape', '  cE:[cmtId,text,shapeId,edgeIndex,color]  — comment on a shape edge midpoint'],
        ['equation', '  ce:[cmtId,text,side,indices,color]  — comment on equation (side=both|left|right; indices=blank or "0,1,2")'],
        [null, '  cF:[cmtId,title,text,side,color]  — free comment: no connector line and no target, it floats on side (right|left); title optional'],
        [null, '  cd:[cmtId]                        — fade out a comment by id, leaving the others; "a|b|c" drops several together'],
        [null, '  cx:[]                             — clear all comments'],
        [null, '  cu:[cmtId,text,color]             — update existing comment text/color'],
      ]
      const shapes = ['geo2d', 'geo3d', 'geo_canvas']
      const ok = (need) =>
        need === null ? true
        : need === 'shape' ? shapes.some(m => have.has(m))
        : have.has(need)
      return ['FUNCTIONS [positional args]:', ...lines.filter(([n]) => ok(n)).map(([, l]) => l)].join('\n')
    },
  },
}

// ── ROUTER ────────────────────────────────────────────────────────────────────

// Title + description of every curated lesson, for the router to choose from.
// Imported rather than duplicated so a new example shows up here automatically.
export const EXAMPLE_INDEX = EXAMPLE_LESSONS.map(e => ({ id: e.id, title: e.title, desc: e.desc }))

// Language names the model is asked to write in. Only the Latin-alphabet
// languages the interface itself is translated into — the lesson renderer
// handles accents and diacritics fine (French has shipped for a long time),
// but a non-Latin script would need font and layout work first.
const LANG_NAMES = { en: 'English', fr: 'French', de: 'German', es: 'Spanish', it: 'Italian', pt: 'Portuguese' }
const LANG_CODES = Object.keys(LANG_NAMES)

// The router's reading of the request's language, as the rest of the pipeline
// uses it: one of the codes above, English for any other language, and null
// when the router named none — the generator then reads it off the request.
export function lessonLang(code) {
  const c = typeof code === 'string' ? code.trim().slice(0, 2).toLowerCase() : ''
  return !c ? null : LANG_CODES.includes(c) ? c : 'en'
}

// The router's prompt, listing only the lessons it may pick from. server.js
// passes the ones that have steps: an example added empty, so it can be built
// in the Builder, is a model with nothing in it.
export function routerSystemPrompt(examples = EXAMPLE_INDEX) {
  return `Math lesson router. Classify the request; if "ok", pick the display modules.

MODULES:
${Object.entries(MODULES).map(([id, m]) => `${id} — ${m.description}`).join('\n')}

REFERENCE LESSONS — pick 1 to 3 related to the subject, the closest in STRUCTURE first (how it is built, not keyword overlap); the generator sees them as the worked models it copies. This list IS what can be taught:
${examples.map(e => `${e.id} — ${e.desc}`).join('\n')}

Prompts come in any language, informal, unpunctuated, misspelled ("pytagore", "equation du 2eme degre", "trigo"). Language/spelling/phrasing NEVER make something off-topic — classify on SUBJECT only.

lang IS REQUIRED, on every status: the language the request is written in, as ${LANG_CODES.slice(0, -1).map(c => `"${c}"`).join(', ')} or "${LANG_CODES.at(-1)}". Any other language, or no words at all → "en". A single word still has a language: judge it by its spelling. Every message is written in lang.

STATUS:
ok           — math, inside the coverage below, with a related reference lesson. Any phrasing: question, how-to, comparison, exercise request, bare topic.
too-advanced — real math, but outside that coverage — from one step past it (derivatives, limits, matrices) to research level (fractals, IUT theory, measure theory). message = 2-3 short sentences in lang: what the topic is, and that it is past what these lessons cover. alternatives = 2-3 ids from REFERENCE LESSONS that are the nearest teachable stepping stones.
off-topic    — the SUBJECT IS NOT MATHEMATICS (languages, history, coding, non-math science, advice). Nothing else is off-topic: a mathematical topic these modules cannot teach is too-advanced, never off-topic. Never off-topic for odd phrasing or a foreign language. No message.
trivial      — fully-specified arithmetic, one-line answer ("2+2", "15% of 80"). msg = that answer, in lang.

NEVER ASK A QUESTION BACK. Vague, broad, garbled or half-typed prompts get the general concept, never
a question. "quadratics" → the concept lesson, not "which equation?". Ignore stray characters and
typos. Two topics at once → cover the main one. Even "help me with my maths" is "ok": pick a
fundamental and teach it. There is no status for asking. (Vague ≠ in scope: judge coverage first.)

exampleIds IS REQUIRED: 1 to 3 ids, never empty, the closest first. The generator copies them as worked
models, and without one it invents a lesson with nothing good in it. They do NOT have to be the same
topic — the first has to be built the way this lesson should be built. "types of angles in shapes" has
no lesson of its own → areas or pythagoras (a shape, labelled and annotated). "reading a data table" →
correlation. Always something. A second or third is added only when it is related to the subject and
shows part of what this lesson needs that the first does not; one that fits beats three that half-fit.
If two fit, the one whose STRUCTURE matches goes first, not the one sharing a keyword.

COVERAGE — judged on the TOPIC, separately from which example fits:
  IN  — arithmetic and fractions, order of operations, algebra (linear, quadratic, systems), plane
        geometry, angles, perimeter/area/volume, right-triangle trigonometry, the unit circle,
        functions (linear, quadratic, exponential), conics (parabola, ellipse, circle, hyperbola:
        vertices, foci, directrix, asymptotes), arithmetic and geometric sequences, vectors
        (components, norm, sum, scalar multiple, angle between), counting and basic probability
        (possibility trees, Venn diagrams), unit conversion, descriptive statistics.
  OUT — derivatives, integrals, limits, series (sums), matrices, probability distributions,
        complex numbers, formal proofs, and everything past them up to research level →
        too-advanced, however simply they are asked.

MODULE PICK (ok only): minimum set, nothing speculative. "text" whenever another display needs a formula panel; "comments" for point/edge annotations. geo2d XOR geo3d. Prefer geo2d; geo_canvas only for SVG constructions or vertex arrows.

OUTPUT: the JSON object ALONE — no fences, no prose, nothing after the closing brace. Prose is discarded unread; it only costs tokens.
{"status":"ok","lang":"<code>","modules":[...],"exampleIds":["<closest reference lesson id — required>","<optional 2nd>","<optional 3rd>"]}
{"status":"too-advanced","lang":"<code>","message":"2-3 sentences","alternatives":["<reference lesson id>","..."]}
{"status":"off-topic","lang":"<code>"}  {"status":"trivial","lang":"<code>","message":"..."}

EXAMPLES (the non-English/misspelled ones are real past failures — treat as the bar):
"solve 2x+5=11" · "2x-6+3x=8 ca fait quoi" · "donne moi des exercices sur les equation du 2eme degre" · "¿cómo se resuelve una ecuación de segundo grado?" · "9/11" → {"status":"ok","modules":["equation","text"]}
"right triangle and Pythagorean theorem" · "comment on fait pour trouver c dans pytagore" · "la loi des sinus vs cosinus cest quand on utilise laquelle" → {"status":"ok","modules":["geo2d","equation","text","comments"]}
"wie berechne ich den Umfang eines Kreises" → {"status":"ok","modules":["geo2d","equation","text"]}
"explain the area of a circle" → {"status":"ok","modules":["geo2d","text"]}
"volume of a cylinder" → {"status":"ok","modules":["geo3d","text"]}
"plot x² and find its roots" → {"status":"ok","modules":["graph","text","comments"]}
"cest quoi une foncion linaire" · "what is a linear function" → {"status":"ok","modules":["graph","text","comments"],"exampleId":"linear-functions"}
  ↑ a FUNCTION is drawn on a graph. linear-eq is not it: that one isolates x in an equation and never
  plots anything. Read the descriptions, not the ids — "linear-eq" looks like a match and is not.
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
}

// ── GENERATOR PROMPT BUILDER ──────────────────────────────────────────────────

/**
 * Build the full generator system prompt for a given set of module ids.
 * BASE_RULES + one section per selected module.
 */
/**
 * Assembled in the order the generator needs to read it:
 *
 *   1. general rules      — true of every lesson, whatever the modules
 *   2. layouts            — only those the picked modules can actually fill
 *   3. module rules       — how each picked panel behaves, and how to reference it
 *   4. module functions   — the only codes it is allowed to emit
 *   5. language
 *   6. reference lesson   — last, so the worked model is freshest
 *
 * Nothing outside the picked modules appears anywhere. That is the whole point:
 * a generator shown a shape token, a layout or a function it has no panel for
 * will eventually use it, and the step is dead on arrival.
 */
// Keep only the steps the prompt can back up with a documented code, and only
// the pages that still have a step left. A reference is a worked model — one
// undocumented code in it is worth more damage than the step was worth.
function pruneToDocumented(compact, documented) {
  if (!Array.isArray(compact)) return compact
  return compact
    .map(page => {
      if (!Array.isArray(page)) return page
      const [title, layout, steps] = page
      return [title, layout, (steps ?? []).filter(s => documented.has(s?.[0]))]
    })
    .filter(page => !Array.isArray(page) || (page[2] ?? []).length > 0)
}

export function buildGeneratorPrompt(moduleIds, lang = 'en', references = null) {
  const ids  = moduleIds.filter(id => MODULES[id])
  const have = new Set(ids)
  const parts = [BASE_RULES.trim()]

  const panels = panelsFor(ids)
  parts.push(
    `\n# PANELS\n` +
    `A page shows ONE or TWO panels. The page's second field is their digits:\n` +
    `  "3" = equation alone   "03" = text + equation   "14" = graph + 2D geometry\n` +
    `Order is irrelevant — "03" and "30" are the same page. You choose WHAT is on\n` +
    `the page; the system chooses how it is arranged. Never write a layout name.\n` +
    `TWO AT MOST. A third panel is not a page, it is two pages.\n` +
    (panels.length ? panels.join(`\n`) : `  (none — this module set has no renderable panel)`)
  )

  const rules = ids.map(id => [MODULES[id], MODULES[id].rules])
                   .filter(([, r]) => r && r.trim())
  if (rules.length) {
    parts.push(
      `\n# RULES\n` +
      rules.map(([m, r]) => `## ${m.label}\n${r.trim()}`).join('\n\n')
    )
  }

  const funcs = ids.map(id => {
    const m = MODULES[id]
    return [m, typeof m.funcs === 'function' ? m.funcs(have) : m.funcs]
  }).filter(([, f]) => f && f.trim())
  if (funcs.length) {
    parts.push(
      `\n# FUNCTIONS\nThese codes and no others.\n\n` +
      funcs.map(([m, f]) => `## ${m.label}\n${f.trim()}`).join('\n\n')
    )
  }

  // Every code the prompt above actually documents. The reference lesson is
  // fixed, but this list is not: it shrinks with the module set. A step whose
  // code is missing here is a trap — the example says "copy this" while the
  // function list says that code does not exist, and the validator would
  // reject it. Drop those steps instead of teaching them.
  // BASE_RULES is in every prompt, so the codes it documents count too. sL lives
  // there, and leaving it out stripped every mid-page panel change from the
  // references — the steps after it then aimed at a panel the page never showed.
  const documented = new Set([
    ...[...BASE_RULES.matchAll(/^([A-Za-z0-9]+):\[/gm)].map(m => m[1]),
    ...funcs.flatMap(([, f]) => [...String(f).matchAll(/^ {2}([A-Za-z0-9]+):/gm)].map(m => m[1])),
  ])

  // Scoped to learner-visible prose only: compact codes, layout codes, ids and
  // colour names are format, not content — translating those breaks parsing.
  // Always state the language, English included: with no instruction at all the
  // model drifts (a plain English prompt came back entirely in Dutch). null is
  // a router that named no language: the generator gets the router's own rule.
  const names    = Object.values(LANG_NAMES)
  const langName = lang === null
    ? `the language the request is written in if it is ${names.slice(0, -1).join(', ')} or ${names.at(-1)}, and English for any other`
    : LANG_NAMES[lang] ?? 'English'
  parts.push(
    `\n# LANGUAGE\n` +
    `Learner-visible strings (page titles, panel titles and content, comment text) in ${langName}. ` +
    `Never translate structure: func/layout codes, ids, colour names, math notation.`
  )

  // The router picked 1 to 3 hand-built lessons, closest first; show them in
  // the exact output format we want back. A real, verified lesson is a far
  // stronger model than the generic per-module snippets this replaced — and it
  // is one the author has already approved. One lesson is a list of pages, so a
  // list whose first page is itself a list of lessons' pages is several.
  const refs = !references?.length ? []
    : Array.isArray(references[0]?.[0]) ? references.filter(r => r?.length) : [references]
  if (refs.length === 1) {
    // Word for word what a single reference always was.
    parts.push(
      `\n# REFERENCE LESSON\n` +
      `Verified, in the exact output format. Copy its structure/pacing/step use; ` +
      `NOT its topic or numbers.\n` +
      JSON.stringify(pruneToDocumented(refs[0], documented))
    )
  } else if (refs.length > 1) {
    parts.push(
      `\n# REFERENCE LESSONS\n` +
      `${refs.length} verified lessons related to this subject, the closest first, in the exact output ` +
      `format. Copy their structure/pacing/step use; NOT their topics or numbers.\n` +
      refs.map((r, i) => `## ${i + 1}\n` + JSON.stringify(pruneToDocumented(r, documented))).join('\n')
    )
  }

  return parts.join('\n')
}

// One documentation line per compact code, for the repair prompt: the model is
// shown the signature of exactly the functions it got wrong, not the whole
// catalogue — a targeted fix is far more reliable than a re-read of everything.
export function docForCode(code) {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('^\\s*' + escaped + ':')
  const every = new Set(Object.keys(MODULES))
  for (const m of Object.values(MODULES)) {
    const funcs = typeof m.funcs === 'function' ? m.funcs(every) : m.funcs
    for (const line of String(funcs ?? '').split('\n')) {
      if (re.test(line)) return line.trim()
    }
  }
  return null
}

