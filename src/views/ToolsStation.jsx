import { useState } from 'react'

const ALL_TOOLS = [
  { id: 'numbers',       emoji: '🎲', label: { en: 'Number Dots',    fr: 'Points Chiffres' },    color: '#4ade80', bg: 'linear-gradient(135deg,#14532d,#166534)' },
  { id: 'clock',         emoji: '🕐', label: { en: 'Clock',            fr: 'Horloge' },            color: '#22d3ee', bg: 'linear-gradient(135deg,#164e63,#0e7490)' },
  { id: 'mult',          emoji: '✖️', label: { en: 'Times Table',      fr: 'Table de ×' },         color: '#c084fc', bg: 'linear-gradient(135deg,#4c1d95,#6d28d9)' },
  { id: 'mdas',          emoji: '🧮', label: { en: 'Order of Ops',     fr: 'Ordre des Ops.' },     color: '#fb923c', bg: 'linear-gradient(135deg,#7c2d12,#c2410c)' },
  { id: 'perimeter-tool',emoji: '📐', label: { en: 'Perimeter',        fr: 'Périmètre' },          color: '#60a5fa', bg: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)',  comingSoon: true },
  { id: 'area-tool',     emoji: '🔷', label: { en: 'Area',             fr: 'Aire' },               color: '#38bdf8', bg: 'linear-gradient(135deg,#0c4a6e,#0369a1)',  comingSoon: true },
  { id: 'angles-tool',   emoji: '📏', label: { en: 'Angles',           fr: 'Angles' },             color: '#67e8f9', bg: 'linear-gradient(135deg,#083344,#155e75)',  comingSoon: true },
  { id: 'pythagore-tool',emoji: '📐', label: { en: 'Pythagoras',       fr: 'Pythagore' },          color: '#fbbf24', bg: 'linear-gradient(135deg,#451a03,#92400e)',  comingSoon: true },
  { id: 'equation-tool', emoji: '⚖️', label: { en: 'Equations',       fr: 'Équations' },          color: '#f472b6', bg: 'linear-gradient(135deg,#831843,#9d174d)',  comingSoon: true },
  { id: 'fractions-tool',emoji: '½',  label: { en: 'Fractions',        fr: 'Fractions' },          color: '#34d399', bg: 'linear-gradient(135deg,#064e3b,#065f46)',  comingSoon: true },
  { id: 'graph-tool',    emoji: '📈', label: { en: 'Functions',        fr: 'Fonctions' },          color: '#34d399', bg: 'linear-gradient(135deg,#022c22,#14532d)',  comingSoon: true },
  { id: 'unit-convert',  emoji: '📏', label: { en: 'Conversions',      fr: 'Conversions' },        color: '#fbbf24', bg: 'linear-gradient(135deg,#451a03,#92400e)',  comingSoon: true },
  { id: 'stats-tool',    emoji: '📊', label: { en: 'Statistics',       fr: 'Statistiques' },       color: '#fbbf24', bg: 'linear-gradient(135deg,#431407,#7c2d12)',  comingSoon: true },
  { id: 'calendar',      emoji: '📅', label: { en: 'Calendar',         fr: 'Calendrier' },         color: '#a78bfa', bg: 'linear-gradient(135deg,#3b0764,#6d28d9)',  comingSoon: true },
]

const COLS = 3
const ROWS = 2
const PER_PAGE = COLS * ROWS

export default function ToolsStation({ onOpen, lang = 'en' }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(ALL_TOOLS.length / PER_PAGE)

  const slice = ALL_TOOLS.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const padded = [...slice, ...Array(PER_PAGE - slice.length).fill(null)]
  const row1 = padded.slice(0, COLS)
  const row2 = padded.slice(COLS)

  return (
    <div className="station station--tools">
      <div className="tools-centered">

        {/* Left arrow */}
        <button
          className={`tools-arrow tools-arrow--left${page === 0 ? ' tools-arrow--hidden' : ''}`}
          onClick={() => setPage(p => Math.max(0, p - 1))}
        >‹</button>

        {/* Grid */}
        <div className="tools-grid">
          <div className="tools-row">
            {row1.map((tool, i) => tool
              ? <ToolCard key={tool.id} tool={tool} onOpen={onOpen} lang={lang} />
              : <div key={`empty-${i}`} className="tool-card tool-card--empty" />
            )}
          </div>
          <div className="tools-row">
            {row2.map((tool, i) => tool
              ? <ToolCard key={tool.id} tool={tool} onOpen={onOpen} lang={lang} />
              : <div key={`empty-${i}`} className="tool-card tool-card--empty" />
            )}
          </div>
        </div>

        {/* Right arrow */}
        <button
          className={`tools-arrow tools-arrow--right${page >= totalPages - 1 ? ' tools-arrow--hidden' : ''}`}
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
        >›</button>

      </div>
    </div>
  )
}

function ToolCard({ tool, onOpen, lang }) {
  return (
    <button
      className={`tool-card${tool.comingSoon ? ' tool-card--soon' : ''}`}
      style={{ background: tool.bg, '--tool-color': tool.color }}
      onClick={() => !tool.comingSoon && onOpen?.(tool.id)}
      disabled={tool.comingSoon}
    >
      <span className="tool-card-emoji">{tool.emoji}</span>
      <span className="tool-card-label">{tool.label[lang] ?? tool.label.en}</span>
      {tool.comingSoon && <span className="tool-card-soon-badge">🔒</span>}
    </button>
  )
}
