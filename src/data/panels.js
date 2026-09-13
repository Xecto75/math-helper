/**
 * Panels — what a page can show, and how a choice of panels becomes a layout.
 *
 * A page used to name a layout ("text-geo", "grid-equation"), which meant the
 * generator had to know all 15 hand-maintained names, know which ones existed,
 * and know which one to reach for. It picked wrong constantly, and every new
 * pairing meant another name nobody had heard of.
 *
 * Now a page names PANELS instead — one or two digits — and the layout is
 * derived here. "What is on the page" is the author's decision; "how it is
 * arranged" is not, and never was: the arrangement is presentation, and it
 * belongs to the system.
 *
 * Nothing about how existing layouts RENDER changes. This file only decides
 * which of them a pair of panels lands on; the CSS they resolve to is the same
 * CSS as before.
 */

// Each panel: the display slot it turns on, and the catalog modules whose
// functions are legal while it is up. `modules` is what gates the function set —
// `modules` is what gates the function set. Flat geometry and solids are
// separate panels with separate engines: nothing that draws flat belongs to
// panel 5, and nothing volumetric belongs to panel 4.
export const PANELS = {
  0: { id: 'text',     label: 'Texte',      slot: 'text',     modules: ['text'] },
  1: { id: 'graph',    label: 'Graphique',  slot: 'graph',    modules: ['graph'] },
  2: { id: 'chart',    label: 'Chart',      slot: 'table',    modules: ['table', 'chart'] },
  3: { id: 'equation', label: 'Équation',   slot: 'equation', modules: ['equation'] },
  4: { id: 'geo2d',    label: 'Géométrie 2D', slot: '3d',       modules: ['geo2d'] },
  5: { id: 'geo3d',    label: 'Géométrie 3D', slot: '3d',       modules: ['geo3d'] },
}

export const PANEL_KEYS = Object.keys(PANELS)

// One panel alone.
const SINGLE = {
  0: 'single-text',
  1: 'single-graph',
  2: 'single-grid',
  3: 'single-equation',
  4: 'single-3d',
  5: 'single-3d',
}

// Two panels. Keyed by the pair in ascending order, so "03" and "30" are the
// same page — which side a panel sits on is the system's call, not the
// author's. The eight that already existed keep their own name (and therefore
// their own hand-tuned CSS); the seven that did not are new classes built on
// the same two conventions: text is the narrow left column, an equation is the
// short bottom band, and two visuals split down the middle.
const PAIR = {
  '0,1': 'text-graph',
  '0,2': 'text-grid',
  '0,3': 'text-equation',
  '0,4': 'text-3d',
  '0,5': 'text-3d',        // new
  '1,2': 'grid-graph',
  '1,3': 'graph-equation',
  '1,4': 'graph-3d',
  '1,5': 'graph-3d',       // new
  '2,3': 'grid-equation',
  '2,4': 'grid-3d',
  '2,5': 'grid-3d',        // new
  '3,4': 'equation-3d',
  '3,5': 'equation-3d',    // new
  '4,5': 'single-3d',    // one engine, one display — the pair is one panel
}

// Layout name → the panels that produce it. Lets an already-saved lesson (which
// stores the layout name) show the right panels selected in the Builder, and
// lets isFuncCompatible work off panels for old and new pages alike.
export const PANELS_FOR_LAYOUT = (() => {
  const out = {}
  for (const [k, name] of Object.entries(SINGLE)) out[name] = [k]
  for (const [k, name] of Object.entries(PAIR))   out[name] = k.split(',')
  // Layouts that predate the panel list and have no panel of their own. They
  // still render — a saved lesson using one is untouched — they just cannot be
  // reached by choosing panels.
  out['equation-text'] = ['0', '3']
  // Geometry moved to the Three display, so panel 4 now resolves to the -3d
  // layouts. These names are what every page saved before that still carries;
  // without them the Builder showed no panel selected on an existing page, and
  // touching the picker would have jumped it to a different layout.
  out['single-geo']   = ['4']
  out['text-geo']     = ['0', '4']
  out['graph-geo']    = ['1', '4']
  out['grid-geo']     = ['2', '4']
  out['geo-equation'] = ['3', '4']
  out['geo-3d']       = ['4', '5']
  return out
})()

// A panel spec is ONE or TWO digits and nothing else. The test has to be that
// strict: the old layout codes include "s3", and merely stripping non-digits
// would read that as panel 3 and quietly turn every existing single-3d page
// into an equation page.
const SPEC_RE = /^[0-5]{1,2}$/

/**
 * "3" → 'single-equation' · "03" → 'text-equation' · "30" → 'text-equation'
 * Anything that is not a 1-or-2 panel spec returns null, so callers can fall
 * back to treating the value as a plain layout name (every lesson saved before
 * this file existed does exactly that).
 */
export function resolveLayout(spec) {
  const raw = String(spec ?? '').trim()
  if (!SPEC_RE.test(raw)) return null
  const digits = [...new Set(raw)].sort()
  if (digits.length === 1) return SINGLE[digits[0]] ?? null
  if (digits.length === 2) return PAIR[digits.join(',')] ?? null
  return null
}

/** The panel digits behind a layout name, or [] if it has none. */
export function panelsOf(layoutName) {
  return PANELS_FOR_LAYOUT[layoutName] ?? []
}

/** Panel digits → layout name, accepting either form. Never throws. */
export function layoutFrom(specOrName) {
  return resolveLayout(specOrName) ?? (specOrName || null)
}

/** Every module whose functions are legal on a page showing these panels. */
export function modulesForPanels(digits) {
  const out = new Set()
  for (const d of digits) for (const m of PANELS[d]?.modules ?? []) out.add(m)
  return [...out]
}
