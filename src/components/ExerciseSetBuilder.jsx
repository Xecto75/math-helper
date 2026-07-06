import { useState } from 'react'
import { PAGE_BACKGROUNDS } from '../data/primaryDisplays.js'

let _uid = 0
const uid = () => `ex${++_uid}`

function makeExPage(exerciseType = 'choices4') {
  const base = { id: uid(), type: 'exercise', exerciseType, title: '', background: 'board' }
  if (exerciseType === 'choices2') return { ...base, choices: ['', ''], correct: '' }
  if (exerciseType === 'choices4') return { ...base, choices: ['', '', '', ''], correct: '' }
  if (exerciseType === 'reorder')  return { ...base, items: ['', '', ''] }
  if (exerciseType === 'wires')    return { ...base, pairs: [['', ''], ['', ''], ['', '']] }
  return base
}

const ADD_TYPES = [
  ['choices4', '4 Choices'],
  ['choices2', '2 Choices'],
  ['reorder',  'Reorder'],
  ['wires',    'Wires'],
]
const TYPE_LABELS = { choices2: '2 Choices', choices4: '4 Choices', reorder: 'Reorder', wires: 'Wires' }

export default function ExerciseSetBuilder({ editingSet, onSave, onCancel }) {
  const [name, setName]   = useState(editingSet?.name ?? '')
  const [pages, setPages] = useState(() =>
    editingSet ? editingSet.pages.map(p => ({ ...p, id: uid() })) : [makeExPage()]
  )
  const [activeIdx, setActiveIdx] = useState(0)

  const page  = pages[Math.min(activeIdx, pages.length - 1)]
  const exType = page?.exerciseType ?? 'choices4'

  const addPage = (type) => {
    setPages(prev => [...prev, makeExPage(type)])
    setActiveIdx(pages.length)
  }

  const removePage = (idx) => {
    if (pages.length === 1) return
    const next = pages.filter((_, i) => i !== idx)
    setPages(next)
    setActiveIdx(i => Math.min(i, next.length - 1))
  }

  const upd = (fn) =>
    setPages(prev => prev.map((p, i) => i !== activeIdx ? p : fn(p)))

  const setExType = (type) => {
    upd(p => {
      const fresh = makeExPage(type)
      return { ...fresh, id: p.id, title: p.title }
    })
  }

  const setField  = (field, val) => upd(p => ({ ...p, [field]: val }))

  const setChoice = (idx, val) => upd(p => {
    const choices = [...(p.choices ?? [])]; choices[idx] = val; return { ...p, choices }
  })

  const setItem = (idx, val) => upd(p => {
    const items = [...(p.items ?? [])]; items[idx] = val; return { ...p, items }
  })

  const setPair = (idx, side, val) => upd(p => ({
    ...p,
    pairs: (p.pairs ?? []).map((pair, pi) =>
      pi !== idx ? pair : side === 0 ? [val, pair[1]] : [pair[0], val]
    ),
  }))

  const handleSave = () => {
    onSave({ name: name.trim() || 'Exercise Set', pages: JSON.parse(JSON.stringify(pages)) })
  }

  return (
    <div className="exbuilder">

      {/* Header */}
      <div className="exbuilder-header">
        <button className="exbuilder-back-btn" onClick={onCancel}>← Back</button>
        <input
          className="exbuilder-name-inp"
          placeholder="Exercise set name…"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button className="exbuilder-save-btn" onClick={handleSave}>Save ✓</button>
      </div>

      {/* Page tabs + add buttons */}
      <div className="exbuilder-tabs">
        {pages.map((p, i) => (
          <button key={p.id}
            className={`exbuilder-tab${i === activeIdx ? ' exbuilder-tab--active' : ''}`}
            onClick={() => setActiveIdx(i)}>
            Ex{i + 1}
            <span className="exbuilder-tab-type">{TYPE_LABELS[p.exerciseType] ?? ''}</span>
            {pages.length > 1 && (
              <span className="exbuilder-tab-x"
                onClick={e => { e.stopPropagation(); removePage(i) }}>×</span>
            )}
          </button>
        ))}
        <span className="exbuilder-tabs-sep" />
        {ADD_TYPES.map(([type, label]) => (
          <button key={type} className="exbuilder-add-tab" onClick={() => addPage(type)}>
            + {label}
          </button>
        ))}
      </div>

      {/* Page editor */}
      {page && (
        <div className="exbuilder-body">

          {/* Question */}
          <div className="exbuilder-row">
            <label className="exbuilder-label">Question</label>
            <input className="exbuilder-input" value={page.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="Question text…" />
          </div>

          {/* Type switcher */}
          <div className="exbuilder-type-row">
            {ADD_TYPES.map(([t, label]) => (
              <button key={t}
                className={`exbuilder-type-btn${exType === t ? ' exbuilder-type-btn--active' : ''}`}
                onClick={() => setExType(t)}>
                {label}
              </button>
            ))}
          </div>

          {/* Background */}
          <div className="exbuilder-row">
            <label className="exbuilder-label">Background</label>
            <div className="exbuilder-bg-group">
              {PAGE_BACKGROUNDS.map(bg => (
                <button key={bg.id}
                  className={`lb-bg-btn${(page.background ?? 'board') === bg.id ? ' lb-bg-btn--active' : ''}`}
                  onClick={() => setField('background', bg.id)}>
                  {bg.icon} {typeof bg.label === 'object' ? bg.label.en : bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Choices */}
          {(exType === 'choices2' || exType === 'choices4') && (
            <div className="exbuilder-section">
              <div className="exbuilder-section-title">Choices</div>
              {(page.choices ?? []).map((c, i) => (
                <div key={i} className="exbuilder-item-row">
                  <span className="exbuilder-item-label">#{i + 1}</span>
                  <input className="exbuilder-input" value={c}
                    onChange={e => setChoice(i, e.target.value)}
                    placeholder={`Choice ${i + 1}`} />
                </div>
              ))}
              <div className="exbuilder-item-row">
                <span className="exbuilder-item-label">✓ Answer</span>
                <select className="exbuilder-input exbuilder-select"
                  value={page.correct ?? ''}
                  onChange={e => setField('correct', e.target.value)}>
                  <option value="">— select correct answer —</option>
                  {(page.choices ?? []).map((c, i) => (
                    <option key={i} value={c}>{c || `Choice ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Reorder */}
          {exType === 'reorder' && (
            <div className="exbuilder-section">
              <div className="exbuilder-section-title">Items — enter in correct order</div>
              {(page.items ?? []).map((item, i) => (
                <div key={i} className="exbuilder-item-row">
                  <span className="exbuilder-item-label">#{i + 1}</span>
                  <input className="exbuilder-input" value={item}
                    onChange={e => setItem(i, e.target.value)}
                    placeholder={`Item ${i + 1}`} />
                  <button className="exbuilder-rm"
                    onClick={() => upd(p => ({ ...p, items: p.items.filter((_, ii) => ii !== i) }))}>✕</button>
                </div>
              ))}
              <button className="exbuilder-add-row"
                onClick={() => upd(p => ({ ...p, items: [...(p.items ?? []), ''] }))}>
                + Add item
              </button>
            </div>
          )}

          {/* Wires */}
          {exType === 'wires' && (
            <div className="exbuilder-section">
              <div className="exbuilder-section-title">Pairs — left matches right</div>
              {(page.pairs ?? []).map((pair, i) => (
                <div key={i} className="exbuilder-item-row">
                  <input className="exbuilder-input exbuilder-wire-inp" value={pair[0]}
                    onChange={e => setPair(i, 0, e.target.value)} placeholder="Left" />
                  <span className="exbuilder-wire-arrow">→</span>
                  <input className="exbuilder-input exbuilder-wire-inp" value={pair[1]}
                    onChange={e => setPair(i, 1, e.target.value)} placeholder="Right" />
                  <button className="exbuilder-rm"
                    onClick={() => upd(p => ({ ...p, pairs: p.pairs.filter((_, pi) => pi !== i) }))}>✕</button>
                </div>
              ))}
              <button className="exbuilder-add-row"
                onClick={() => upd(p => ({ ...p, pairs: [...(p.pairs ?? []), ['', '']] }))}>
                + Add pair
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
