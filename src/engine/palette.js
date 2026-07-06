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
}

/**
 * Resolve a raw color string to a hex value.
 * Accepts:
 *   '#rrggbb' or '#rgb'  → returned as-is
 *   'yellow', 'orange'…  → looked up in PALETTE
 *   anything else        → returned as-is (graceful fallback)
 */
export function resolveColor(raw) {
  if (!raw) return raw
  const s = String(raw).trim()
  if (s.startsWith('#')) return s
  return PALETTE[s.toLowerCase()] ?? s
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
