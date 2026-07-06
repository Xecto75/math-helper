export const T = {
  fr: {
    // ── MDAS ─────────────────────────────────────────────────────────────────
    'mdas.rules.title': 'Ordre des opérations',
    'mdas.rules.M':     '**1er — M×** Multiplication',
    'mdas.rules.D':     '**1er — D÷** Division',
    'mdas.rules.A':     '**2e — A+** Addition',
    'mdas.rules.S':     '**2e — S−** Soustraction',
    'mdas.rules.ltr':   'Toujours de gauche à droite',
    'mdas.step.mult':   '× avant + et − : {left} × {right} = {result}',
    'mdas.step.div':    '÷ avant + et − : {left} ÷ {right} = {result}',
    'mdas.step.add':    '+ de gauche à droite : {left} + {right} = {result}',
    'mdas.step.sub':    '− de gauche à droite : {left} − {right} = {result}',

    // ── Clock ─────────────────────────────────────────────────────────────────
    'clock.hours':   'heures',
    'clock.minutes': 'minutes',

    // ── Number word labels ────────────────────────────────────────────────────
    'num.0': 'zéro',
    'num.1': 'un',
    'num.2': 'deux',
    'num.3': 'trois',
    'num.4': 'quatre',
    'num.5': 'cinq',
    'num.6': 'six',
    'num.7': 'sept',
    'num.8': 'huit',
    'num.9': 'neuf',
  },

  en: {
    // ── MDAS ─────────────────────────────────────────────────────────────────
    'mdas.rules.title': 'Order of Operations',
    'mdas.rules.M':     '**1st — M×** Multiplication',
    'mdas.rules.D':     '**1st — D÷** Division',
    'mdas.rules.A':     '**2nd — A+** Addition',
    'mdas.rules.S':     '**2nd — S−** Subtraction',
    'mdas.rules.ltr':   'Always left to right',
    'mdas.step.mult':   '× before + and − : {left} × {right} = {result}',
    'mdas.step.div':    '÷ before + and − : {left} ÷ {right} = {result}',
    'mdas.step.add':    '+ left to right: {left} + {right} = {result}',
    'mdas.step.sub':    '− left to right: {left} − {right} = {result}',

    // ── Clock ─────────────────────────────────────────────────────────────────
    'clock.hours':   'hours',
    'clock.minutes': 'minutes',

    // ── Number word labels ────────────────────────────────────────────────────
    'num.0': 'zero',
    'num.1': 'one',
    'num.2': 'two',
    'num.3': 'three',
    'num.4': 'four',
    'num.5': 'five',
    'num.6': 'six',
    'num.7': 'seven',
    'num.8': 'eight',
    'num.9': 'nine',
  },
}

/**
 * Translate a key to the given language, with optional variable interpolation.
 * Falls back to French, then to the raw key if not found.
 *
 * t('mdas.step.mult', 'en', { left: 4, right: 2, result: 8 })
 * → "Multiplication first: 4 × 2 = 8"
 */
export function t(key, lang = 'fr', vars = {}) {
  const str = T[lang]?.[key] ?? T.fr?.[key] ?? key
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}
