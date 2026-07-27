import { u } from '../i18n/uiText.js'
import { CAT_LABELS, TOOL_NAMES, TOOL_DESCS, tr } from '../i18n/catalog.js'

const TOOL_CATEGORIES = [
  {
    id: 'nombres',
    tools: [
      { id: 'numbers', emoji: '🔢',             color: '#4ade80', bg: 'linear-gradient(135deg, #14532d 0%, #166534 100%)' },
      { id: 'mult',    emoji: '✖️',         color: '#c084fc', bg: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)' },
      { id: 'mdas',    emoji: '🧮', color: '#fb923c', bg: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)' },
      { id: 'fractions-tool', emoji: '½',     color: '#34d399', bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', comingSoon: true },
    ],
  },
  {
    id: 'mesures',
    tools: [
      { id: 'clock',        emoji: '🕐',       color: '#22d3ee', bg: 'linear-gradient(135deg, #164e63 0%, #0e7490 100%)' },
      { id: 'unit-convert', emoji: '📏', color: '#fbbf24', bg: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)', comingSoon: true },
      { id: 'calendar',     emoji: '📅',    color: '#a78bfa', bg: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 100%)', comingSoon: true },
    ],
  },
  {
    id: 'geometrie',
    tools: [
      { id: 'perimeter-tool', emoji: '📐',  color: '#60a5fa', bg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', comingSoon: true },
      { id: 'area-tool',      emoji: '🔷',       color: '#38bdf8', bg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)', comingSoon: true },
      { id: 'angles-tool',    emoji: '📏',     color: '#67e8f9', bg: 'linear-gradient(135deg, #083344 0%, #155e75 100%)', comingSoon: true },
      { id: 'pythagore-tool', emoji: '📐', color: '#fbbf24', bg: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)', comingSoon: true },
    ],
  },
  {
    id: 'algebra',
    tools: [
      { id: 'equation-tool', emoji: '⚖️',   color: '#f472b6', bg: 'linear-gradient(135deg, #831843 0%, #9d174d 100%)', comingSoon: true },
      { id: 'expression',    emoji: '🔣', color: '#e879f9', bg: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)', comingSoon: true },
    ],
  },
  {
    id: 'graphiques',
    tools: [
      { id: 'graph-tool', emoji: '📈', color: '#34d399', bg: 'linear-gradient(135deg, #022c22 0%, #14532d 100%)', comingSoon: true },
      { id: 'stats-tool', emoji: '📊',       color: '#fbbf24', bg: 'linear-gradient(135deg, #431407 0%, #7c2d12 100%)', comingSoon: true },
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
            <span className="cat-label">{tr(lang, CAT_LABELS, cat.id)}</span>
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
                <span className="card-title">{tr(lang, TOOL_NAMES, tool.id)}</span>
                <span className="card-desc">{tr(lang, TOOL_DESCS, tool.id)}</span>
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
