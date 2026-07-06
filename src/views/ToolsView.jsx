import { u } from '../i18n/uiText.js'

const TOOL_CATEGORIES = [
  {
    id: 'nombres',
    label: { en: 'Numbers & Operations', fr: 'Nombres & Opérations' },
    tools: [
      { id: 'numbers', emoji: '🔢', label: { en: 'Digits',             fr: 'Les Chiffres' },          color: '#4ade80', bg: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', desc: { en: 'Explore digits 0 to 9', fr: 'Explore les chiffres de 0 à 9' } },
      { id: 'mult',    emoji: '✖️', label: { en: 'Times Table',         fr: 'Table de ×' },            color: '#c084fc', bg: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)', desc: { en: 'Enter a number and see its table', fr: 'Entre un nombre et vois sa table' } },
      { id: 'mdas',    emoji: '🧮', label: { en: 'Order of Operations', fr: 'Ordre des Opérations' },  color: '#fb923c', bg: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)', desc: { en: 'Step-by-step calculation', fr: 'Calcule étape par étape' } },
      { id: 'fractions-tool', emoji: '½', label: { en: 'Fractions', fr: 'Fractions' },                color: '#34d399', bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', desc: { en: 'Visualize and simplify fractions', fr: 'Visualise et simplifie des fractions' }, comingSoon: true },
    ],
  },
  {
    id: 'mesures',
    label: { en: 'Measurements & Time', fr: 'Mesures & Temps' },
    tools: [
      { id: 'clock',        emoji: '🕐', label: { en: 'Clock',         fr: 'Horloge' },    color: '#22d3ee', bg: 'linear-gradient(135deg, #164e63 0%, #0e7490 100%)', desc: { en: 'Enter a time and read the clock', fr: "Entre une heure et lis l'horloge" } },
      { id: 'unit-convert', emoji: '📏', label: { en: 'Conversions',   fr: 'Conversions' }, color: '#fbbf24', bg: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)', desc: { en: 'Convert cm, m, km, g, kg…', fr: 'Convertis cm, m, km, g, kg…' }, comingSoon: true },
      { id: 'calendar',     emoji: '📅', label: { en: 'Calendar',      fr: 'Calendrier' },  color: '#a78bfa', bg: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 100%)', desc: { en: 'Calculate durations and dates', fr: 'Calcule des durées et des dates' }, comingSoon: true },
    ],
  },
  {
    id: 'geometrie',
    label: { en: 'Geometry', fr: 'Géométrie' },
    tools: [
      { id: 'perimeter-tool', emoji: '📐', label: { en: 'Perimeter',  fr: 'Périmètre' }, color: '#60a5fa', bg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', desc: { en: 'Calculate the perimeter of shapes', fr: 'Calcule le périmètre de formes' }, comingSoon: true },
      { id: 'area-tool',      emoji: '🔷', label: { en: 'Area',       fr: 'Aire' },       color: '#38bdf8', bg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)', desc: { en: 'Calculate the area of shapes', fr: "Calcule l'aire de formes géométriques" }, comingSoon: true },
      { id: 'angles-tool',    emoji: '📏', label: { en: 'Angles',     fr: 'Angles' },     color: '#67e8f9', bg: 'linear-gradient(135deg, #083344 0%, #155e75 100%)', desc: { en: 'Explore and measure angles', fr: 'Explore et mesure des angles' }, comingSoon: true },
      { id: 'pythagore-tool', emoji: '📐', label: { en: 'Pythagoras', fr: 'Pythagore' },  color: '#fbbf24', bg: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)', desc: { en: "Calculate a right triangle's sides", fr: "Calcule les côtés d'un triangle rectangle" }, comingSoon: true },
    ],
  },
  {
    id: 'algebra',
    label: { en: 'Algebra & Equations', fr: 'Algèbre & Équations' },
    tools: [
      { id: 'equation-tool', emoji: '⚖️', label: { en: 'Equations',   fr: 'Équations' },  color: '#f472b6', bg: 'linear-gradient(135deg, #831843 0%, #9d174d 100%)', desc: { en: 'Solve one-variable equations', fr: 'Résous des équations à une inconnue' }, comingSoon: true },
      { id: 'expression',    emoji: '🔣', label: { en: 'Expressions',  fr: 'Expressions' }, color: '#e879f9', bg: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)', desc: { en: 'Simplify and expand expressions', fr: 'Simplifie et développe des expressions' }, comingSoon: true },
    ],
  },
  {
    id: 'graphiques',
    label: { en: 'Graphs & Functions', fr: 'Graphiques & Fonctions' },
    tools: [
      { id: 'graph-tool', emoji: '📈', label: { en: 'Function Plotter', fr: 'Traceur de Fonctions' }, color: '#34d399', bg: 'linear-gradient(135deg, #022c22 0%, #14532d 100%)', desc: { en: 'Plot functions on a coordinate plane', fr: 'Trace des fonctions sur un repère' }, comingSoon: true },
      { id: 'stats-tool', emoji: '📊', label: { en: 'Statistics',       fr: 'Statistiques' },         color: '#fbbf24', bg: 'linear-gradient(135deg, #431407 0%, #7c2d12 100%)', desc: { en: 'Represent and analyze data', fr: 'Représente et analyse des données' }, comingSoon: true },
    ],
  },
]

export default function ToolsView({ onOpen, lang = 'en' }) {
  return (
    <div className="section-view">
      <p className="section-sub">{u(lang, 'toolsSub')}</p>
      {TOOL_CATEGORIES.map(cat => (
        <div key={cat.id} className="grade-section">
          <div className="grade-header">
            <span className="cat-label">{cat.label[lang] ?? cat.label.en}</span>
          </div>
          <div className="card-grid">
            {cat.tools.map(tool => (
              <button
                key={tool.id}
                className={`lesson-card${tool.comingSoon ? ' lesson-card--soon' : ''}`}
                style={{ background: tool.bg, '--card-color': tool.color }}
                onClick={() => !tool.comingSoon && onOpen(tool.id)}
                disabled={tool.comingSoon}
              >
                <span className="card-emoji">{tool.emoji}</span>
                <span className="card-title">{tool.label[lang] ?? tool.label.en}</span>
                <span className="card-desc">{tool.desc[lang] ?? tool.desc.en}</span>
                {tool.comingSoon
                  ? <span className="card-cta card-cta--soon">{u(lang, 'soon')}</span>
                  : <span className="card-cta">{u(lang, 'open')}</span>
                }
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
