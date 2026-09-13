// ── The one speed knob ────────────────────────────────────────────────────────
// Everything that animates has to take its duration from here, or fast-forward
// cannot reach it — which is exactly what went wrong: the gsap tweens sped up
// and the comment boxes, their connector lines and the geometry kept playing at
// full length, so a skip still felt slow.
//
// The app animates in three different ways and each needs the number in its own
// shape, so this hands out the same k three ways:
//
//   gsap tweens      → the global timeline's timeScale (set in ActionExecutor)
//   rAF / setTimeout → animMs(), a duration in milliseconds
//   CSS transitions  → the --anim-k custom property, used inside calc()
//
// k is a DURATION multiplier: 1 is the speed the animation was written at,
// 1/30 is a fast-forward. Anything new that animates should read it from here.
let _k = 1

export function setAnimK(k) {
  _k = k > 0 ? k : 1
  // On the root element, so every stylesheet and inline style can see it. A
  // transition already running when this flips picks up the new duration on
  // its own — the browser re-reads the custom property.
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--anim-k', String(_k))
  }
}

export function animK() { return _k }

// A duration in milliseconds, hurried. For rAF loops and setTimeout.
export const animMs = (ms) => ms * _k

// A duration for an inline style, hurried. Written as calc() rather than a
// resolved number so the value stays live: it follows the var, not the render.
export const animCss = (sec) => `calc(${sec}s * var(--anim-k, 1))`
