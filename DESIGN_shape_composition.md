# Design note — composing shapes in geo2d

Not implemented. Parked here for when it gets built. Written 2026-07-30.

## The problem

Two lessons the engine currently cannot express:

1. **Overlay** — a triangle sitting inside the rectangle that shares its base and
   height ("why is the area base×h/2"). `S2c` centres every shape it creates and
   `S2m` nudges by raw world offsets, so the generator has to guess coordinates
   and lands close but wrong. It also cannot match the rectangle's height to the
   triangle's, because a triangle given three sides *computes* its height
   (6,5,7 is 3.87 tall, not 4) and that number is not available at authoring time.

2. **Construction** — the classic exam figure: points F, A, E on a baseline, G
   above A with a right angle at G, D placed by a 30° ray from A, tick marks
   showing which segments are congruent, 45° and 30° arcs, letters at every
   vertex. This is not "shapes that touch", it is one construction whose parts
   are defined by each other.

## The structural fact that makes this cheap

Every geo2d feature — `S2l` side labels, `S2a` angle arcs, `S2E` edge
highlights, `S2tk` ticks, `gM`/`gP` measures, `S2w` arrows, `[id]h` and `[id]aN`
value refs — reads `registry[id].vertices` in `src/engine/threeEngine.js`.
`S2c` is merely one way to fill that array.

**Anything else that writes vertices in the same format inherits every one of
those features for free.** Two helpers already exist and do most of the work:

- `resolveShapePoint(id, ref)` — returns the world position of `v0`, `e2`, … 
- `buildFlatGroupFromVerts(verts, hexColor, opts)` — builds a shape from vertices

## Level 1 — attach (solves the overlay case)

    S2at:[id, "e0", targetId, "e2", flip]

Translate + rotate `id` so its edge e0 coincides with `targetId`'s edge e2.
One transform computed from two endpoint pairs.

Pin down the ambiguity before building:

- **side → side** determines placement completely *except* which side of the
  edge the shape folds onto — hence the `flip` argument.
- **point → point** leaves rotation free, so it needs an angle as well.
  Do not support bare point-to-point; support side-to-side and point+angle.

## Level 2 — named points (solves the construction case)

    S2p:[id, spec]        spec: "3,2" | "tri:v1" | "tri:e0@0.25" | "A@45,5"
                          (absolute · another shape's vertex · fraction along an
                           edge · polar: from A, 45°, length 5)
    S2g:[id, "F,A,G", fill, border]      polygon through named points
    S2ang:[A, B, C, color, showValue]    arc at B between BA and BC,
                                         auto right-angle box at 90°
    S2pl:["F,A,G,D,E"]                   vertex letters

The exam figure above becomes roughly ten steps, and every existing function
keeps working on `S2g` shapes because they land in the same registry.

## Ordering

Level 1 is a **subset** of Level 2 — once points exist, "attach" is just
building a shape from another shape's points. If both are wanted eventually,
Level 2 is the real design and Level 1 is a shortcut worth keeping only for
brevity in simple lessons.

## The part that is not engine work

The generator only builds well from a worked model (see `moduleCatalog.js`: an
`ok` verdict requires a reference lesson). A new function the model has never
seen used will not get used correctly — it will keep reaching for `S2c` plus
guessed coordinates. **Each phase needs a reference lesson built in the Lesson
Builder that demonstrates it**, or the capability is invisible in practice.
That, not the transform maths, is the real cost.
