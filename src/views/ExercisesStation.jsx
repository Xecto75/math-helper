import { useState } from 'react'
import ExerciseSetBuilder from '../components/ExerciseSetBuilder.jsx'

const SETS_KEY = 'math-exercise-sets'
function readSets()       { try { return JSON.parse(localStorage.getItem(SETS_KEY) ?? '[]') } catch { return [] } }
function writeSets(sets)  { localStorage.setItem(SETS_KEY, JSON.stringify(sets)) }

const CATEGORIES = [
  {
    id:    'geo',
    emoji: '📐',
    label: { en: 'Geometry',    fr: 'Géométrie' },
    desc:  { en: 'Shapes, angles, perimeter & area', fr: 'Formes, angles, périmètre & aire' },
    color: '#38bdf8',
    bg:    'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
  },
  {
    id:    'math',
    emoji: '🔢',
    label: { en: 'Arithmetic',  fr: 'Arithmétique' },
    desc:  { en: 'Numbers, operations & fractions', fr: 'Nombres, opérations & fractions' },
    color: '#4ade80',
    bg:    'linear-gradient(135deg, #14532d 0%, #166534 100%)',
  },
  {
    id:    'extras',
    emoji: '✨',
    label: { en: 'Extras',      fr: 'Extras' },
    desc:  { en: 'Algebra, stats & advanced topics', fr: 'Algèbre, stats & sujets avancés' },
    color: '#c084fc',
    bg:    'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
  },
]

const TYPE_ICONS = { choices2: '2⃣', choices4: '4⃣', reorder: '🔀', wires: '🔗' }

export default function ExercisesStation({ onPlay, lang = 'en' }) {
  const [sets, setSets]               = useState(readSets)
  const [selectedCat, setSelectedCat] = useState(null)
  const [building, setBuilding]       = useState(false)
  const [editGlobalIdx, setEditGlobalIdx] = useState(null)

  const openNew      = ()    => { setEditGlobalIdx(null); setBuilding(true) }
  const openEdit     = (idx) => { setEditGlobalIdx(idx);  setBuilding(true) }
  const closeBuilder = ()    => { setBuilding(false); setEditGlobalIdx(null) }

  const handleSave = (entry) => {
    const withCat = { ...entry, category: selectedCat }
    setSets(prev => {
      const next = editGlobalIdx !== null
        ? prev.map((s, i) => i === editGlobalIdx ? withCat : s)
        : [withCat, ...prev]
      writeSets(next)
      return next
    })
    closeBuilder()
  }

  const handleDelete = (globalIdx) => {
    setSets(prev => {
      const next = prev.filter((_, i) => i !== globalIdx)
      writeSets(next)
      return next
    })
  }

  // ── Builder overlay ────────────────────────────────────────────────────────
  if (building) {
    return (
      <ExerciseSetBuilder
        editingSet={editGlobalIdx !== null ? sets[editGlobalIdx] : null}
        onSave={handleSave}
        onCancel={closeBuilder}
      />
    )
  }

  // ── Category picker ────────────────────────────────────────────────────────
  if (!selectedCat) {
    return (
      <div className="station station--exercises">
        <div className="exercises-category-grid">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className="exercises-cat-card"
              style={{ background: cat.bg, '--cat-color': cat.color }}
              onClick={() => setSelectedCat(cat.id)}
            >
              <span className="exercises-cat-emoji">{cat.emoji}</span>
              <span className="exercises-cat-label">{cat.label[lang] ?? cat.label.en}</span>
              <span className="exercises-cat-desc">{cat.desc[lang] ?? cat.desc.en}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Exercise set list for selected category ────────────────────────────────
  const catEntries = sets
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.category === selectedCat)

  return (
    <div className="station station--exercises">
      <div className="exercises-lesson-view">

        {/* Tab bar */}
        <div className="exercises-tab-bar">
          <button className="exercises-back-tab" onClick={() => setSelectedCat(null)}>
            ← {lang === 'fr' ? 'Retour' : 'Back'}
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`exercises-tab${selectedCat === cat.id ? ' exercises-tab--active' : ''}`}
              style={selectedCat === cat.id
                ? { background: cat.bg, color: cat.color, borderColor: cat.color }
                : {}}
              onClick={() => setSelectedCat(cat.id)}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label[lang] ?? cat.label.en}</span>
            </button>
          ))}
          <button className="exsets-new-btn exsets-new-btn--tab" onClick={openNew}>
            + {lang === 'fr' ? 'Nouveau' : 'New'}
          </button>
        </div>

        {/* Content */}
        <div className="exercises-lessons-scroll">
          {catEntries.length === 0 ? (
            <div className="exsets-empty">
              <div className="exsets-empty-icon">📝</div>
              <p className="exsets-empty-text">
                {lang === 'fr' ? 'Aucun exercice pour l\'instant.' : 'No exercises yet.'}
              </p>
              <button className="exsets-empty-cta" onClick={openNew}>
                {lang === 'fr' ? 'Créer un exercice' : 'Create your first exercise set'}
              </button>
            </div>
          ) : (
            <div className="exsets-grid">
              {catEntries.map(({ s, i: globalIdx }) => (
                <div key={globalIdx} className="exsets-card">
                  <div className="exsets-card-name">{s.name}</div>
                  <div className="exsets-card-meta">
                    <span>{s.pages.length} {s.pages.length === 1 ? 'exercise' : 'exercises'}</span>
                    <span className="exsets-card-types">
                      {[...new Set(s.pages.map(p => p.exerciseType))].map(t => (
                        <span key={t} title={t}>{TYPE_ICONS[t] ?? '❓'}</span>
                      ))}
                    </span>
                  </div>
                  <div className="exsets-card-btns">
                    <button className="exsets-play-btn" onClick={() => onPlay?.(s)}>
                      ▶ {lang === 'fr' ? 'Jouer' : 'Play'}
                    </button>
                    <button className="exsets-edit-btn" onClick={() => openEdit(globalIdx)} title="Edit">✏️</button>
                    <button className="exsets-del-btn"  onClick={() => handleDelete(globalIdx)} title="Delete">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
