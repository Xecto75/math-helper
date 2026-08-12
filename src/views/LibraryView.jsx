import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { u } from '../i18n/uiText.js'
import { SearchIcon, CloseIcon, ChevronIcon } from '../components/Icon.jsx'

// Accent- and case-insensitive, so "geometrie" finds "Géométrie" and "PYTHAG"
// finds "Pythagorean". Typing is how people search; spelling it exactly is not.
const fold = (s) => (s ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')

// Every word in the query has to appear somewhere in the lesson — its title,
// what it is about, its category, or its level. That is what makes "trig
// advanced" and "geometry angles" both work: the words can come from different
// parts of the card, and order does not matter.
function matches(query, haystack) {
  const words = fold(query).split(/\s+/).filter(Boolean)
  const hay   = fold(haystack)
  return words.every(w => hay.includes(w))
}

function LessonCard({ lesson, catLabel, onPlay, adminMode, onEditLesson, lang }) {
  const soon = lesson.comingSoon
  return (
    <div className="lib-card-wrap">
      <button
        className={`lib-card${soon ? ' lib-card--soon' : ''}`}
        style={{ background: lesson.bg, '--card-color': lesson.color }}
        onClick={() => !soon && onPlay(lesson)}
        disabled={soon && !adminMode}
      >
        {lesson.difficulty && (
          <span className={`lib-diff lib-diff--${lesson.difficulty}`}>
            {u(lang, 'diff')[lesson.difficulty]}
          </span>
        )}
        <span className="lib-card-emoji">{lesson.emoji}</span>
        <span className="lib-card-title">{lesson.title}</span>
        <span className="lib-card-desc">{lesson.desc}</span>
        <span className="lib-card-foot">
          {catLabel && <span className="lib-card-cat">{catLabel}</span>}
          <span className={`lib-card-cta${soon ? ' lib-card-cta--soon' : ''}`}>
            {soon ? u(lang, 'soon') : u(lang, 'start')}
          </span>
        </span>
      </button>
      {adminMode && (
        <button
          className="lib-card-edit"
          title="Edit lesson"
          onClick={e => { e.stopPropagation(); onEditLesson(lesson) }}
        >
          ✏️
        </button>
      )}
    </div>
  )
}

// One category = one shelf you drag sideways. Dots below say how many lessons
// are on it and which one you are looking at; clicking one jumps there.
function Shelf({ cat, onPlay, adminMode, onEditLesson, lang }) {
  const trackRef = useRef(null)
  const [active, setActive]     = useState(0)
  const [overflows, setOverflow] = useState(false)
  const count = cat.lessons.length

  // Which card is at the left edge, and whether there is anything to drag to.
  const sync = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('.lib-card-wrap')
    const step = card ? card.offsetWidth + 16 : 1        // 16 = the gap
    const max  = el.scrollWidth - el.clientWidth
    // At the far right the shelf stops with the last card flush to the edge,
    // which leaves the left edge sitting on some middle card — so the last dots
    // could never light up. Once there is no more shelf, it IS the last one.
    setActive(max > 0 && el.scrollLeft >= max - 2
      ? count - 1
      : Math.round(el.scrollLeft / step))
    setOverflow(max > 4)
  }, [count])

  useEffect(() => {
    sync()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', sync); ro.disconnect() }
  }, [sync])

  const scrollTo = (i) => {
    const el = trackRef.current
    const card = el?.querySelector('.lib-card-wrap')
    if (!el || !card) return
    el.scrollTo({ left: i * (card.offsetWidth + 16), behavior: 'smooth' })
  }

  const nudge = (dir) => scrollTo(Math.max(0, Math.min(cat.lessons.length - 1, active + dir)))

  // Drag to swipe, for anyone without a touchscreen or a sideways trackpad.
  // A press that never moves more than a few pixels is still a click on the
  // card underneath — only a real drag suppresses it.
  const drag = useRef(null)
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch') return              // the browser does this one better
    drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 4) d.moved = true
    if (d.moved) trackRef.current.scrollLeft = d.left - dx
  }
  const endDrag = () => {
    const moved = drag.current?.moved
    drag.current = null
    return moved
  }

  return (
    <section className="lib-shelf">
      <header className="lib-shelf-head">
        <span className="lib-shelf-dot" style={{ background: cat.color }} />
        <h3 className="lib-shelf-title">{cat.label}</h3>
        <span className="lib-shelf-sub">{cat.sublabel}</span>
        <span className="lib-shelf-count">{cat.lessons.length}</span>
      </header>

      <div className="lib-shelf-body">
        <div
          className="lib-track"
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={e => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation() } }}
        >
          {cat.lessons.map(lesson => (
            <LessonCard
              key={lesson.id} lesson={lesson} lang={lang}
              onPlay={onPlay} adminMode={adminMode} onEditLesson={onEditLesson}
            />
          ))}
        </div>

        {overflows && (
          <>
            <button
              className="lib-arrow lib-arrow--prev" onClick={() => nudge(-1)}
              disabled={active === 0} aria-label="Previous"
            ><ChevronIcon /></button>
            <button
              className="lib-arrow lib-arrow--next" onClick={() => nudge(1)}
              disabled={active >= cat.lessons.length - 1} aria-label="Next"
            ><ChevronIcon /></button>
          </>
        )}
      </div>

      <div className="lib-dots">
        {cat.lessons.map((lesson, i) => (
          <button
            key={lesson.id}
            className={`lib-dot${i === active ? ' lib-dot--on' : ''}`}
            style={i === active ? { background: cat.color } : undefined}
            onClick={() => scrollTo(i)}
            aria-label={lesson.title}
          />
        ))}
      </div>
    </section>
  )
}

export default function LibraryView({ grades, onPlay, adminMode, onEditLesson, lang = 'en' }) {
  const [query, setQuery] = useState('')

  // Flattened once per language, not per keystroke: each lesson carries the
  // text it can be found by, including its category and level.
  const searchable = useMemo(() => {
    const diff = u(lang, 'diff')
    return grades.flatMap(cat => cat.lessons.map(lesson => ({
      lesson,
      catLabel: cat.label,
      text: [lesson.title, lesson.desc, cat.label, cat.sublabel, diff[lesson.difficulty]].join(' '),
    })))
  }, [grades, lang])

  const results = query.trim()
    ? searchable.filter(row => matches(query, row.text))
    : null

  return (
    <div className="section-view lib-view">
      <div className="lib-search">
        <SearchIcon className="lib-search-icon" />
        <input
          className="lib-search-input"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={u(lang, 'searchLessons')}
        />
        {query && (
          <button className="lib-search-clear" onClick={() => setQuery('')} aria-label="Clear">
            <CloseIcon width={15} height={15} />
          </button>
        )}
      </div>

      {results
        ? (results.length
            ? (
              <>
                <p className="lib-result-count">{results.length} {u(lang, results.length === 1 ? 'resultOne' : 'resultMany')}</p>
                <div className="lib-results">
                  {results.map(({ lesson, catLabel }) => (
                    <LessonCard
                      key={lesson.id} lesson={lesson} catLabel={catLabel} lang={lang}
                      onPlay={onPlay} adminMode={adminMode} onEditLesson={onEditLesson}
                    />
                  ))}
                </div>
              </>
            )
            : <p className="lib-no-results">{u(lang, 'noResults')}</p>
          )
        : grades.map(cat => (
            <Shelf
              key={cat.id} cat={cat} lang={lang}
              onPlay={onPlay} adminMode={adminMode} onEditLesson={onEditLesson}
            />
          ))
      }
    </div>
  )
}
