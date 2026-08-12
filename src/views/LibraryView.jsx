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

// A long soft landing: most of the distance is covered early, then it eases
// down to nothing. The browser's own 'smooth' is quicker and stops harder,
// which is what made an arrow press feel like a snap rather than a glide.
const easeOut = (t) => 1 - Math.pow(1 - t, 4)

// One category = one shelf you drag sideways. The bar underneath says how far
// along it you are, and can be scrubbed like any scrollbar.
function Shelf({ cat, onPlay, adminMode, onEditLesson, lang }) {
  const trackRef = useRef(null)
  const [overflows, setOverflow] = useState(false)
  const [dragging, setDragging]  = useState(false)
  // Which sides still have shelf left on them — the edge that can be scrolled
  // to is the edge that fades, so the fade means "there is more this way".
  const [more, setMore] = useState({ left: false, right: false })
  // Where the scrub bar's thumb sits, as fractions of the whole shelf.
  const [bar, setBar] = useState({ size: 1, pos: 0 })
  const count = cat.lessons.length

  const stepOf = (el) => {
    const card = el.querySelector('.lib-card-wrap')
    return card ? card.offsetWidth + 16 : 1              // 16 = the gap
  }

  // Which sides have more shelf, how far along the bar is, and whether there is
  // anything to drag to at all.
  const sync = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setOverflow(max > 4)
    setMore(prev => {
      const next = { left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 }
      return prev.left === next.left && prev.right === next.right ? prev : next
    })
    setBar({
      size: el.clientWidth / el.scrollWidth,
      pos:  max > 0 ? (el.scrollLeft / max) : 0,
    })
  }, [])

  useEffect(() => {
    sync()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', sync); ro.disconnect() }
  }, [sync])

  // Our own glide instead of scrollTo({behavior:'smooth'}). The duration grows
  // with the distance, so a one-card nudge and a jump across the shelf both
  // feel like the same movement rather than one being a blur.
  const anim = useRef(0)
  const stopGlide = () => cancelAnimationFrame(anim.current)
  useEffect(() => stopGlide, [])

  const glideTo = (target) => {
    const el = trackRef.current
    if (!el) return
    stopGlide()
    const max  = el.scrollWidth - el.clientWidth
    const to   = Math.max(0, Math.min(max, target))
    const from = el.scrollLeft
    const dist = to - from
    if (Math.abs(dist) < 1) return
    const ms = Math.min(760, 300 + Math.abs(dist) * 0.42)
    const t0 = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / ms)
      el.scrollLeft = from + dist * easeOut(t)
      if (t < 1) anim.current = requestAnimationFrame(tick)
    }
    anim.current = requestAnimationFrame(tick)
  }

  const glideToCard = (i) => {
    const el = trackRef.current
    if (el) glideTo(Math.max(0, Math.min(count - 1, i)) * stepOf(el))
  }

  // Move one card from where the shelf actually is, then land on a boundary.
  // Working from a rounded index instead was what made the back arrow look
  // dead at the far right: the last card sits flush to the edge, so the left
  // edge is parked partway across a card, and stepping back from the rounded
  // index only re-aligned it by the leftover — a few dozen pixels, no visible
  // travel. One card from the true position always moves a full card.
  const nudge = (dir) => {
    const el = trackRef.current
    if (!el) return
    const step = stepOf(el)
    glideToCard(Math.round((el.scrollLeft + dir * step) / step))
  }

  // Drag to swipe, for anyone without a touchscreen or a sideways trackpad.
  // A press that never moves more than a few pixels is still a click on the
  // card underneath — only a real drag suppresses it.
  //
  // There is no CSS scroll-snap here on purpose. It used to fight this: the
  // browser re-snapped on every frame while the drag was writing scrollLeft,
  // and let go with a hard jump at the end. Dragging is free-running now, and
  // the settle below is one smooth glide we control.
  const drag = useRef(null)
  // Set when a drag ends, read by the click that the browser fires straight
  // after it, so releasing on top of a card does not also open that lesson.
  // Cleared on the next press as well, in case the release landed on nothing.
  const swallowClick = useRef(false)
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch') return              // the browser does this one better
    stopGlide()                                        // grabbing mid-glide takes over
    swallowClick.current = false
    drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false, vx: 0, lastX: e.clientX, lastT: performance.now() }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) > 4) { d.moved = true; setDragging(true) }
    if (!d.moved) return
    // Speed of the last hop, for deciding where a flick was aimed.
    const now = performance.now()
    const dt  = now - d.lastT
    if (dt > 0) d.vx = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = now
    trackRef.current.scrollLeft = d.left - dx
  }
  const endDrag = () => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return false
    setDragging(false)
    swallowClick.current = true
    const el = trackRef.current
    if (el) {
      // Let the flick carry before deciding where it lands: the shelf keeps
      // going roughly as far as the throw was fast, then settles on whichever
      // card that puts it nearest. Rounding at the exact moment of release
      // ignored the throw entirely, which is why it stopped dead.
      const step  = stepOf(el)
      const carry = -d.vx * 190                        // px of glide per px/ms of throw
      glideToCard(Math.round((el.scrollLeft + carry) / step))
    }
    return true
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
          className={`lib-track${dragging ? ' is-dragging' : ''}`}
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={e => {
            if (swallowClick.current) { swallowClick.current = false; e.preventDefault(); e.stopPropagation() }
          }}
        >
          {cat.lessons.map(lesson => (
            <LessonCard
              key={lesson.id} lesson={lesson} lang={lang}
              onPlay={onPlay} adminMode={adminMode} onEditLesson={onEditLesson}
            />
          ))}
        </div>

        {/* The shelf runs off the edge rather than stopping at it — the side
            that fades is the side with more lessons on it. */}
        <span className={`lib-fade lib-fade--l${more.left  ? ' is-on' : ''}`} aria-hidden="true" />
        <span className={`lib-fade lib-fade--r${more.right ? ' is-on' : ''}`} aria-hidden="true" />

        {overflows && (
          <>
            {/* Enabled by whether the shelf can still travel that way, not by a
                card index. At the far right the left edge sits partway across a
                card, and an index-based test called that "the last one" and
                greyed the back arrow out with shelf still behind it. */}
            <button
              className="lib-arrow lib-arrow--prev" onClick={() => nudge(-1)}
              disabled={!more.left} aria-label="Previous"
            ><ChevronIcon /></button>
            <button
              className="lib-arrow lib-arrow--next" onClick={() => nudge(1)}
              disabled={!more.right} aria-label="Next"
            ><ChevronIcon /></button>
          </>
        )}
      </div>

      {overflows && (
        <ScrubBar bar={bar} color={cat.color} trackRef={trackRef} onGrab={stopGlide} />
      )}
    </section>
  )
}

// How far along the shelf you are, and a handle to drag it by. A row of dots
// could only ever say "card 3 of 6"; this says how much of the shelf is on
// screen and moves continuously with it, which is what a shelf that scrolls
// freely actually does.
function ScrubBar({ bar, color, trackRef, onGrab }) {
  const railRef = useRef(null)
  const [scrubbing, setScrubbing] = useState(false)

  const scrubTo = (clientX) => {
    const el = trackRef.current
    const rail = railRef.current
    if (!el || !rail) return
    const r = rail.getBoundingClientRect()
    const thumbW = r.width * bar.size
    // Grab the middle of the thumb, so the shelf does not jump on first touch.
    const t = (clientX - r.left - thumbW / 2) / Math.max(1, r.width - thumbW)
    el.scrollLeft = Math.max(0, Math.min(1, t)) * (el.scrollWidth - el.clientWidth)
  }

  return (
    <div
      className={`lib-scrub${scrubbing ? ' is-scrubbing' : ''}`}
      onPointerDown={e => {
        onGrab?.()
        setScrubbing(true)
        e.currentTarget.setPointerCapture(e.pointerId)
        scrubTo(e.clientX)
      }}
      onPointerMove={e => { if (scrubbing) scrubTo(e.clientX) }}
      onPointerUp={e => { setScrubbing(false); e.currentTarget.releasePointerCapture(e.pointerId) }}
      onPointerCancel={() => setScrubbing(false)}
    >
      <div className="lib-scrub-rail" ref={railRef}>
        <div
          className="lib-scrub-thumb"
          style={{
            width: `${Math.max(12, bar.size * 100)}%`,
            left:  `${bar.pos * (100 - Math.max(12, bar.size * 100))}%`,
            background: color,
          }}
        />
      </div>
    </div>
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
