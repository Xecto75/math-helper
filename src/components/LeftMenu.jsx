import { useState } from 'react'
import { CATEGORIES } from '../data/functions.js'

export default function LeftMenu({ activeId, onSelect }) {
  const [open, setOpen] = useState(() =>
    Object.fromEntries(CATEGORIES.map(c => [c.id, c.defaultOpen ?? false]))
  )

  const toggle = id => setOpen(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <nav className="left-menu">
      {CATEGORIES.map(cat => (
        <div key={cat.id} className="menu-cat">

          <button
            className={`menu-cat-hd${open[cat.id] ? ' is-open' : ''}`}
            onClick={() => toggle(cat.id)}
          >
            <span>{cat.label}</span>
            <svg className="menu-chevron" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {open[cat.id] && (
            <ul className="menu-fn-list">
              {cat.functions.map(fn => (
                <li key={fn.id}>
                  <button
                    className={[
                      'menu-fn-item',
                      fn.id === activeId ? 'is-active' : '',
                      fn.status === 'soon'  ? 'is-soon'   : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => onSelect(fn)}
                  >
                    <span className={`menu-dot menu-dot--${fn.status}`} />
                    <span className="menu-fn-label">{fn.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

        </div>
      ))}
    </nav>
  )
}
