/**
 * Named color palette for lesson content.
 * Use {name} in equation strings instead of {#rrggbb}.
 * The API / lesson author just picks a name; hex is managed here.
 */
export const PALETTE = {
  red:    '#f87171',
  orange: '#f97316',
  yellow: '#fbbf24',
  green:  '#22c55e',
  purple: '#a855f7',
  pink:   '#f472b6',
  cyan:   '#06b6d4',
  gray:   '#94a3b8',
  grey:   '#94a3b8',
  white:  '#f1f5f9',
}

/**
 * System colors — used internally for UI tokens, never by lesson content.
 * Kept separate so they never clash with PALETTE colors.
 */
export const SYS = {
  blue:     '#60a5fa',   // reserved — polygon fill, axis, arcsin and system UI
  operator: '#818cf8',   // arcsin( arccos( arctan( ) tokens — indigo
  annot:    '#60a5fa',   // a lone equation annotation — the same reserved blue
}

/**
 * Colours an annotation cycles through once there is more than one on screen.
 * The first wears SYS.annot — that one is the app pointing at the equation, and
 * a colour would say "this part matters" without saying why. From the second on,
 * they have to be told apart at a glance, so each takes a lesson colour none of
 * the others is already wearing. teal and white are left out: CSS teal is nearly
 * black on this background, and white reads as ordinary text.
 */
export const ANNOT_ROTATION = ['red', 'purple', 'orange', 'green', 'yellow', 'pink']

/**
 * Resolve a raw color string to a hex value.
 * Accepts:
 *   '#rrggbb' or '#rgb'  → returned as-is
 *   'yellow', 'orange'…  → looked up in PALETTE
 *   anything else        → returned as-is (graceful fallback)
 */
// Names that are not lesson colours but that lessons — and steps already saved
// with them — ask for anyway. Without these resolveColor handed the word
// straight to the browser and CSS painted its own: "blue" came out #0000FF and
// "teal" #008080, which is nearly invisible on this background. Resolving them
// here fixes every step already carrying the name, with nothing to re-edit.
const ALIASES = {
  blue: SYS.blue,      // the reserved blue, not the CSS keyword
  teal: PALETTE.cyan,  // the prompt offers teal; the palette calls it cyan
}

export function resolveColor(raw) {
  if (!raw) return raw
  const s = String(raw).trim()
  if (s.startsWith('#')) return s
  const k = s.toLowerCase()
  return PALETTE[k] ?? ALIASES[k] ?? s
}

/**
 * Pre-process a LaTeX string, replacing \clr{name} with \textcolor{#hex}.
 * Use inside $...$ in text boxes or calc steps:
 *   \clr{orange}{\text{Opposite}}  →  \textcolor{#f97316}{\text{Opposite}}
 *   \clr{yellow}{\theta}           →  \textcolor{#fbbf24}{\theta}
 */
export function resolveLatexColors(latex) {
  return latex.replace(/\\clr\{([^}]+)\}/g, (_, name) => {
    const hex = resolveColor(name.trim())
    return `\\textcolor{${hex}}`
  })
}
