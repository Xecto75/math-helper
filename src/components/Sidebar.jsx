import { useEffect, useRef } from 'react'
import { u } from '../i18n/uiText.js'

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/>
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ),
  saved: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
    </svg>
  ),
  build: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  tools: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
}

// The Lesson Builder is an authoring tool, not a feature: it edits the shipped
// examples and writes to files on the server. It exists only while running from
// source (npm run dev). In a production build import.meta.env.DEV is false, this
// entry is never created, and the drawer is never rendered — the visitor cannot
// reach it because it is not there.
// Collapse/expand control. Same idea as the panel toggle every chat app puts in
// this corner: two overlapping marks, the brand by default and this one on
// hover, so the rail keeps its clean look while still saying it can open.
const PANEL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9.5 4v16"/>
  </svg>
)

const TOP_ITEMS = [
  { id: 'home'    },
  { id: 'library' },
  { id: 'saved'   },
  ...(import.meta.env.DEV ? [{ id: 'build' }] : []),
]

const BOTTOM_ITEMS = [
  { id: 'profile'  },
  { id: 'settings' },
]

export default function Sidebar({ active, onToggle, expanded, onSetExpanded, lang = 'en' }) {
  // Labels live in the translations rather than next to the icons: they used to
  // be invisible, so English was harmless — now that the rail opens, a French
  // visitor would be reading "Saved Lessons".
  const names = u(lang, 'nav')
  const railRef = useRef(null)

  // Anywhere outside the rail puts it away again. On pointerdown rather than
  // click so it closes as the user reaches for whatever they are going for,
  // instead of a beat later — and only while it is open, so the listener costs
  // nothing the rest of the time.
  useEffect(() => {
    if (!expanded) return
    const onDown = (e) => {
      if (!railRef.current?.contains(e.target)) onSetExpanded(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [expanded, onSetExpanded])

  const item = (it) => (
    <button
      key={it.id}
      className={`sidebar-btn${active === it.id ? ' sidebar-btn--active' : ''}`}
      // Stops the rail's own handler below: these icons go somewhere, and
      // opening the rail on the way there would move the thing being clicked.
      onClick={(e) => { e.stopPropagation(); onToggle(it.id) }}
      title={names[it.id]}
    >
      <span className="sidebar-icon">{ICONS[it.id]}</span>
      <span className="sidebar-label">{names[it.id]}</span>
    </button>
  )

  return (
    // Any dead space in the rail opens it — the whole column is the target, not
    // one small button. The section icons opt out above.
    <aside className="sidebar" ref={railRef} onClick={() => onSetExpanded(true)}>
      <button
        className="sidebar-brand"
        onClick={(e) => { e.stopPropagation(); onSetExpanded(!expanded) }}
        title={u(lang, expanded ? 'navCollapse' : 'navExpand')}
        aria-expanded={expanded}
      >
        <span className="sidebar-brand-mark">∑</span>
        <span className="sidebar-brand-panel">{PANEL_ICON}</span>
      </button>

      <nav className="sidebar-nav sidebar-nav--top">
        {TOP_ITEMS.map(item)}
      </nav>

      <nav className="sidebar-nav sidebar-nav--bottom">
        {BOTTOM_ITEMS.map(item)}
      </nav>
    </aside>
  )
}
