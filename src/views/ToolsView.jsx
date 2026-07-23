import { u } from '../i18n/uiText.js'

const TOOL_CATEGORIES = [
  {
    id: 'nombres',
    label: 'Numbers & Operations',
    tools: [
      { id: 'numbers', emoji: '🔢', label: 'Digits',             color: '#4ade80', bg: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', desc: 'Explore digits 0 to 9' },
      { id: 'mult',    emoji: '✖️', label: 'Times Table',         color: '#c084fc', bg: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)', desc: 'Enter a number and see its table' },
      { id: 'mdas',    emoji: '🧮', label: 'Order of Operations', color: '#fb923c', bg: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)', desc: 'Step-by-step calculation' },
      { id: 'fractions-tool', emoji: '½', label: 'Fractions',     color: '#34d399', bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', desc: 'Visualize and simplify fractions', comingSoon: true },
    ],
  },
  {
    id: 'mesures',
    label: 'Measurements & Time',
    tools: [
      { id: 'clock',        emoji: '🕐', label: 'Clock',       color: '#22d3ee', bg: 'linear-gradient(135deg, #164e63 0%, #0e7490 100%)', desc: 'Enter a time and read the clock' },
      { id: 'unit-convert', emoji: '📏', label: 'Conversions', color: '#fbbf24', bg: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)', desc: 'Convert cm, m, km, g, kg…', comingSoon: true },
      { id: 'calendar',     emoji: '📅', label: 'Calendar',    color: '#a78bfa', bg: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 100%)', desc: 'Calculate durations and dates', comingSoon: true },
    ],
  },
  {
    id: 'geometrie',
    label: 'Geometry',
    tools: [
      { id: 'perimeter-tool', emoji: '📐', label: 'Perimeter',  color: '#60a5fa', bg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', desc: 'Calculate the perimeter of shapes', comingSoon: true },
      { id: 'area-tool',      emoji: '🔷', label: 'Area',       color: '#38bdf8', bg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)', desc: 'Calculate the area of shapes', comingSoon: true },
      { id: 'angles-tool',    emoji: '📏', label: 'Angles',     color: '#67e8f9', bg: 'linear-gradient(135deg, #083344 0%, #155e75 100%)', desc: 'Explore and measure angles', comingSoon: true },
      { id: 'pythagore-tool', emoji: '📐', label: 'Pythagoras', color: '#fbbf24', bg: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)', desc: "Calculate a right triangle's sides", comingSoon: true },
    ],
  },
  {
    id: 'algebra',
    label: 'Algebra & Equations',
    tools: [
      { id: 'equation-tool', emoji: '⚖️', label: 'Equations',   color: '#f472b6', bg: 'linear-gradient(135deg, #831843 0%, #9d174d 100%)', desc: 'Solve one-variable equations', comingSoon: true },
      { id: 'expression',    emoji: '🔣', label: 'Expressions', color: '#e879f9', bg: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)', desc: 'Simplify and expand expressions', comingSoon: true },
    ],
  },
  {
    id: 'graphiques',
    label: 'Graphs & Functions',
    tools: [
      { id: 'graph-tool', emoji: '📈', label: 'Function Plotter', color: '#34d399', bg: 'linear-gradient(135deg, #022c22 0%, #14532d 100%)', desc: 'Plot functions on a coordinate plane', comingSoon: true },
      { id: 'stats-tool', emoji: '📊', label: 'Statistics',       color: '#fbbf24', bg: 'linear-gradient(135deg, #431407 0%, #7c2d12 100%)', desc: 'Represent and analyze data', comingSoon: true },
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
            <span className="cat-label">{cat.label}</span>
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
                <span className="card-title">{tool.label}</span>
                <span className="card-desc">{tool.desc}</span>
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
