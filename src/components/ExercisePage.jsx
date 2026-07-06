import { useState, useRef, useEffect } from 'react'

const BG = {
  board: "url('/assets/backgrounds/board.webp')",
  stomp: "url('/assets/backgrounds/stomp.webp')",
}

const WIRE_COLORS = ['#f87171','#60a5fa','#34d399','#fbbf24','#c084fc','#fb923c','#38bdf8','#4ade80']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── Choices (2 or 4) ─────────────────────────────────────────────────────── */
function ChoicesExercise({ page, onComplete }) {
  const { title, background, choices, correct } = page
  const [selected, setSelected] = useState(null)

  const handle = (c) => {
    if (selected) return
    setSelected(c)
    if (c === correct) setTimeout(() => onComplete?.(), 1800)
  }

  return (
    <div className="expage" style={{ backgroundImage: BG[background] ?? BG.board }}>
      <div className="expage-title-wrap">
        <h2 className="expage-title">{title}</h2>
      </div>
      <div className={`expage-choices expage-choices--${choices.length}`}>
        {choices.map((c, i) => {
          let cls = 'expage-choice'
          if (selected === c) cls += c === correct ? ' expage-choice--correct' : ' expage-choice--wrong'
          else if (selected && c === correct) cls += ' expage-choice--reveal'
          return (
            <button key={i} className={cls} onClick={() => handle(c)} disabled={!!selected}>
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Reorder ──────────────────────────────────────────────────────────────── */
function ReorderExercise({ page, onComplete }) {
  const { title, background, items } = page
  const [order, setOrder]       = useState(() => shuffle(items.map((_, i) => i)))
  const [picked, setPicked]     = useState(null)
  const [feedback, setFeedback] = useState(null)

  const handleClick = (pos) => {
    if (feedback) return
    if (picked === null) { setPicked(pos); return }
    if (picked !== pos) {
      setOrder(prev => {
        const next = [...prev];
        [next[picked], next[pos]] = [next[pos], next[picked]]
        return next
      })
    }
    setPicked(null)
  }

  const confirm = () => {
    const ok = order.every((origIdx, pos) => origIdx === pos)
    setFeedback(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(() => onComplete?.(), 1800)
    else setTimeout(() => setFeedback(null), 1400)
  }

  return (
    <div className="expage" style={{ backgroundImage: BG[background] ?? BG.board }}>
      <div className="expage-title-wrap">
        <h2 className="expage-title">{title}</h2>
      </div>
      <div className="expage-reorder">
        {order.map((origIdx, pos) => (
          <button
            key={origIdx}
            className={`expage-reorder-item${picked === pos ? ' expage-reorder-item--picked' : ''}${feedback === 'correct' ? ' expage-reorder-item--correct' : feedback === 'wrong' ? ' expage-reorder-item--wrong' : ''}`}
            onClick={() => handleClick(pos)}
          >
            {items[origIdx]}
          </button>
        ))}
      </div>
      <div className="expage-bottom">
        {feedback
          ? <div className={`expage-feedback expage-feedback--${feedback}`}>{feedback === 'correct' ? '✓ Correct!' : '✗ Not quite'}</div>
          : <button className="expage-confirm" onClick={confirm}>Confirm ✓</button>
        }
      </div>
    </div>
  )
}

/* ── Wires (drag to connect) ──────────────────────────────────────────────── */
function WiresExercise({ page, onComplete }) {
  const { title, background, pairs } = page
  const containerRef = useRef(null)
  const leftRefs     = useRef([])
  const rightRefs    = useRef([])

  const [rightOrder]            = useState(() => shuffle(pairs.map((_, i) => i)))
  const [conns, setConns]       = useState([])   // { left, rightVis, color }
  const [lines, setLines]       = useState([])
  const [drag, setDrag]         = useState(null)  // { x1,y1,x2,y2 } live preview
  const [feedback, setFeedback] = useState(null)

  // Recompute permanent lines whenever connections change
  useEffect(() => {
    const cr = containerRef.current?.getBoundingClientRect()
    if (!cr) return
    setLines(
      conns.map(c => {
        const le = leftRefs.current[c.left]
        const re = rightRefs.current[c.rightVis]
        if (!le || !re) return null
        const lr = le.getBoundingClientRect()
        const rr = re.getBoundingClientRect()
        return {
          x1: lr.right - cr.left,
          y1: lr.top   + lr.height / 2 - cr.top,
          x2: rr.left  - cr.left,
          y2: rr.top   + rr.height / 2 - cr.top,
          color: c.color,
        }
      }).filter(Boolean)
    )
  }, [conns])

  const startDrag = (e, side, idx) => {
    if (feedback) return
    e.preventDefault()

    const cr  = containerRef.current.getBoundingClientRect()
    const ref = side === 'left' ? leftRefs.current[idx] : rightRefs.current[idx]
    const r   = ref.getBoundingClientRect()
    // Anchor: right edge of left items, left edge of right items
    const x1  = side === 'left' ? r.right - cr.left : r.left - cr.left
    const y1  = r.top + r.height / 2 - cr.top

    // Remove any existing connection from this item before starting drag
    setConns(prev =>
      side === 'left'
        ? prev.filter(c => c.left !== idx)
        : prev.filter(c => c.rightVis !== idx)
    )

    const onMove = (ev) => {
      const cx = ev.clientX - cr.left
      const cy = ev.clientY - cr.top
      setDrag({ x1, y1, x2: cx, y2: cy })
    }

    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setDrag(null)

      // Find which item the cursor landed on (opposite side)
      const targetRefs = side === 'left' ? rightRefs.current : leftRefs.current
      let hitIdx = null
      for (let i = 0; i < targetRefs.length; i++) {
        const el = targetRefs[i]
        if (!el) continue
        const tr = el.getBoundingClientRect()
        if (ev.clientX >= tr.left && ev.clientX <= tr.right &&
            ev.clientY >= tr.top  && ev.clientY <= tr.bottom) {
          hitIdx = i; break
        }
      }
      if (hitIdx === null) return

      const left     = side === 'left'  ? idx    : hitIdx
      const rightVis = side === 'right' ? idx    : hitIdx
      setConns(prev => {
        const filtered = prev.filter(c => c.left !== left && c.rightVis !== rightVis)
        const color    = WIRE_COLORS[filtered.length % WIRE_COLORS.length]
        return [...filtered, { left, rightVis, color }]
      })
    }

    setDrag({ x1, y1, x2: e.clientX - cr.left, y2: e.clientY - cr.top })
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const confirm = () => {
    if (conns.length < pairs.length) return
    const ok = conns.every(c => rightOrder[c.rightVis] === c.left)
    setFeedback(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(() => onComplete?.(), 1800)
    else setTimeout(() => setFeedback(null), 1400)
  }

  const connectedL = new Set(conns.map(c => c.left))
  const connectedR = new Set(conns.map(c => c.rightVis))

  return (
    <div className="expage" style={{ backgroundImage: BG[background] ?? BG.board }}>
      <div className="expage-title-wrap">
        <h2 className="expage-title">{title}</h2>
      </div>

      <div className="expage-wires" ref={containerRef} style={{ userSelect: 'none' }}>
        <svg className="expage-wires-svg">
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.color} strokeWidth="5" strokeLinecap="round" />
          ))}
          {drag && (
            <line x1={drag.x1} y1={drag.y1} x2={drag.x2} y2={drag.y2}
              stroke="rgba(255,255,255,0.65)" strokeWidth="3.5"
              strokeLinecap="round" strokeDasharray="10 6" />
          )}
        </svg>

        <div className="expage-wires-col">
          {pairs.map((pair, i) => {
            const conn = conns.find(c => c.left === i)
            return (
              <div
                key={i}
                ref={el => { leftRefs.current[i] = el }}
                className={`expage-wire-item${connectedL.has(i) ? ' expage-wire-item--conn' : ''}`}
                style={conn ? { borderColor: conn.color, boxShadow: `0 0 0 3px ${conn.color}55`, cursor: 'grab' } : { cursor: 'grab' }}
                onMouseDown={e => startDrag(e, 'left', i)}
              >{pair[0]}</div>
            )
          })}
        </div>

        <div className="expage-wires-col">
          {rightOrder.map((pairIdx, vi) => {
            const conn = conns.find(c => c.rightVis === vi)
            return (
              <div
                key={vi}
                ref={el => { rightRefs.current[vi] = el }}
                className={`expage-wire-item${connectedR.has(vi) ? ' expage-wire-item--conn' : ''}`}
                style={conn ? { borderColor: conn.color, boxShadow: `0 0 0 3px ${conn.color}55`, cursor: 'grab' } : { cursor: 'grab' }}
                onMouseDown={e => startDrag(e, 'right', vi)}
              >{pairs[pairIdx][1]}</div>
            )
          })}
        </div>
      </div>

      <div className="expage-bottom">
        {feedback
          ? <div className={`expage-feedback expage-feedback--${feedback}`}>{feedback === 'correct' ? '✓ Correct!' : '✗ Not quite'}</div>
          : <button className="expage-confirm" onClick={confirm}>Confirm ✓</button>
        }
      </div>
    </div>
  )
}

/* ── Main export ──────────────────────────────────────────────────────────── */
export default function ExercisePage({ page, onComplete }) {
  if (!page) return null
  const t = page.exerciseType
  if (t === 'choices2' || t === 'choices4') return <ChoicesExercise page={page} onComplete={onComplete} />
  if (t === 'reorder')                       return <ReorderExercise page={page} onComplete={onComplete} />
  if (t === 'wires')                         return <WiresExercise   page={page} onComplete={onComplete} />
  return null
}
