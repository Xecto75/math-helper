import { useMemo } from 'react'

const GEO_IDS = new Set([
  'formes-de-base', 'symetrie', 'angles-intro', 'perimetre', 'aire',
  'volume-intro', 'volume-solides', 'perimetre-aire-avances',
  'coordonnees-repere', 'pythagore', 'theoreme-thales',
  'cercle-trigonometrique', 'vecteurs', 'geometrie-espace', 'trigonometrie',
])
const MATH_IDS = new Set([
  'les-chiffres', 'comparaison-nombres', 'lire-lheure', 'mesures-de-base',
  'compter-100', 'addition-soustraction', 'multiplication-simple', 'division-simple',
  'multiplication', 'ordre-operations', 'fractions-simples', 'fractions-intro',
  'nombres-decimaux', 'conversions-unites', 'nombres-negatifs-intro',
  'nombres-relatifs', 'fractions-operations', 'pourcentages', 'proportionnalite',
  'priorite-operations-pemdas', 'puissances-racines', 'suites-numeriques',
])

const BG = {
  geo:    "url('/assets/backgrounds/station_geometry.webp')",
  math:   "url('/assets/backgrounds/station_math.webp')",
  extras: "url('/assets/backgrounds/station_geometry.webp')",
}

export default function LessonTreeView({ grades, category, onPlay }) {
  const filtered = useMemo(() => {
    if (!grades) return []
    const ids = category === 'geo' ? GEO_IDS : category === 'math' ? MATH_IDS : null
    return grades
      .map(g => ({
        ...g,
        lessons: ids
          ? g.lessons.filter(l => ids.has(l.id))
          : g.lessons.filter(l => !GEO_IDS.has(l.id) && !MATH_IDS.has(l.id)),
      }))
      .filter(g => g.lessons.length > 0)
  }, [grades, category])

  return (
    <div className="station station--tree" style={{ backgroundImage: BG[category] ?? BG.geo }}>
      <div className="tree-scroll">
        <div className="tree-columns">
          {filtered.map(grade => (
            <div key={grade.id} className="tree-col">
              <div className="tree-col-header">
                <span className="tree-col-label" style={{ color: grade.color }}>{grade.label}</span>
                <span className="tree-col-sublabel">{grade.sublabel}</span>
              </div>
              <div className="tree-col-lessons">
                {grade.lessons.map(lesson => (
                  <button
                    key={lesson.id}
                    className={`tree-card${lesson.comingSoon ? ' tree-card--locked' : ''}`}
                    style={{ background: lesson.bg, '--lesson-color': lesson.color }}
                    onClick={() => !lesson.comingSoon && onPlay?.(lesson)}
                    disabled={lesson.comingSoon}
                  >
                    <span className="tree-card-emoji">{lesson.emoji}</span>
                    <div className="tree-card-info">
                      <span className="tree-card-title">{lesson.title}</span>
                    </div>
                    {lesson.comingSoon && <span className="tree-card-lock">🔒</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
