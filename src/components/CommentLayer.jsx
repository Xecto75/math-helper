import { useEffect, useLayoutEffect, useState, useCallback, useRef, memo, forwardRef, useImperativeHandle } from 'react'
import MathText from './RichText.jsx'
import { getShapePoint3D } from '../engine/threeEngine.js'
import { onGraphInteractiveChange, offGraphInteractiveChange } from '../engine/desmosEngine.js'

const BOX_W   = 150
const BOX_H   = 56
const BOX_GAP = 10
const DOT_R   = 5
const MARGIN  = 10
const TAN10   = Math.tan(10 * Math.PI / 180)

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay
  const d2x = dx - cx, d2y = dy - cy
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return false
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / denom
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / denom
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99
}

function countEdgeCrossings(lx, ly, tx, ty, edges) {
  return edges.filter(e => segmentsIntersect(lx, ly, tx, ty, e.x1, e.y1, e.x2, e.y2)).length
}

// Find the nearest non-overlapping Y slot for a new box, given fixed same-side boxes.
function findFreeSlot(idealY, fixedBoxes, crHeight) {
  const clamp = y => Math.max(MARGIN, Math.min(crHeight - BOX_H - MARGIN, y))
  const hits  = y => fixedBoxes.some(b => Math.abs(b.boxY - y) < BOX_H + BOX_GAP)

  const clamped = clamp(idealY)
  if (!hits(clamped)) return clamped

  const candidates = fixedBoxes
    .flatMap(b => [b.boxY - BOX_H - BOX_GAP, b.boxY + BOX_H + BOX_GAP])
    .map(clamp)
    .filter(y => !hits(y))

  if (!candidates.length) return clamped
  return candidates.reduce((best, y) =>
    Math.abs(y - idealY) < Math.abs(best - idealY) ? y : best, candidates[0])
}

// Comments render text exactly like a text box: $latex$, {color: x}, {{ compute }},
// [id] geo refs, **bold**, ^sup — all via the shared MathText component.
function renderCommentText(text) {
  return <MathText text={text} />
}

const CommentBox = memo(function CommentBox({ c }) {
  const [shown, setShown] = useState({ text: c.text, color: c.color ?? '#60a5fa', title: c.title ?? null })
  const [popKey, setPopKey] = useState(0)

  useEffect(() => {
    const newColor = c.color ?? '#60a5fa'
    const newTitle = c.title ?? null
    if (c.text === shown.text && newColor === shown.color && newTitle === shown.title) return
    setShown({ text: c.text, color: newColor, title: newTitle })
    setPopKey(k => k + 1)
  }, [c.text, c.color, c.title]) // eslint-disable-line react-hooks/exhaustive-deps

  const color = shown.color
  return (
    <div data-cmt-id={c.id} style={{
      animation: 'cmtFadeIn 0.35s ease both',
      position: 'absolute', left: c.boxX, top: c.boxY,
      width: BOX_W, minHeight: BOX_H,
      background: 'rgba(10,10,20,0.90)',
      border: `1.5px solid ${color}`,
      borderRadius: 8, padding: '8px 11px',
      boxSizing: 'border-box', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
      overflow: 'hidden',   // the comment box has a FIXED width — never let content spill out
    }}>
      {shown.title && (
        <div style={{
          width: '100%', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
          textTransform: 'uppercase', color, opacity: 0.75, marginBottom: 4,
        }}>{shown.title}</div>
      )}
      <p key={popKey} style={{
        margin: 0,
        width: '100%', maxWidth: '100%', overflow: 'hidden',
        fontSize: shown.text.length <= 4 ? 22 : shown.text.length <= 11 ? 16 : 13,
        fontWeight: 600,
        lineHeight: 1.3,
        color,
        fontFamily: 'system-ui, sans-serif',
        wordBreak: 'break-word',
        animation: 'cmtPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>{renderCommentText(shown.text)}</p>
    </div>
  )
})

const CommentLayer = forwardRef(function CommentLayer({ comments, contentRef, tableRef, graphRef, geoRef, threeRef, equationRef, equationSnap, layoutMode }, ref) {
  const [resolved, setResolved] = useState([])
  const layerRef = useRef(null)
  // When set to true, the next useLayoutEffect skips resolveItems — we already
  // have the correct resolved from setResolvedDirect (called by restoreSnapshot).
  const bypassRef = useRef(false)
  // Cache of placed positions: id -> { boxX, boxY, side }
  // Existing comments keep their position; only new ones are placed fresh.
  const placedRef = useRef({})

  // While the graph's pan/zoom toggle is on, a comment's connector line
  // (drawn to a graph point/curve) goes stale the instant the user pans —
  // re-deriving its position live through an arbitrary pan/zoom isn't worth
  // it, so the line just fades out. The comment box itself is unaffected.
  const [graphInteractive, setGraphInteractiveState] = useState(false)
  useEffect(() => {
    onGraphInteractiveChange(setGraphInteractiveState)
    return () => offGraphInteractiveChange(setGraphInteractiveState)
  }, [])

  const resolveItems = useCallback((clearCache) => {
    if (clearCache) placedRef.current = {}

    if (!contentRef?.current || !comments.length) {
      placedRef.current = {}
      setResolved([])
      return
    }

    const cr    = contentRef.current.getBoundingClientRect()
    const items = []

    for (const c of comments) {
      const t = c.target

      // Free-floating comment: no anchor, no connector line — just sits on
      // the requested side, stacked like any other comment on that side.
      if (t.type === 'free') {
        const side = t.side === 'left' ? 'left' : 'right'
        items.push({ ...c, tx: side === 'right' ? cr.width : 0, ty: cr.height / 2, side, cellRects: null, free: true })
        continue
      }

      let client    = null
      let cellRects = null

      if      (t.type === 'grid')                                 client = tableRef?.current?.getPageCoords(t)
      else if (t.type === 'graph')                                client = graphRef?.current?.getPageCoords(t)
      else if (t.type === 'geo-vertex' || t.type === 'geo-edge') {
        client = geoRef?.current?.getPageCoords(t)
        if (!client && threeRef?.current) {
          const idx    = t.type === 'geo-vertex' ? t.vertexIndex : t.edgeIndex
          const atype  = t.type === 'geo-vertex' ? 'vertex' : 'edge'
          const pt     = getShapePoint3D(t.shapeId, atype, idx)
          if (pt) {
            const obj = threeRef.current.getObject(t.shapeId)
            const wx  = pt[0] + (obj?.position.x ?? 0)
            const wy  = pt[1] + (obj?.position.y ?? 0)
            client = threeRef.current.getWorldToScreen(wx, wy)
          }
        }
      }
      else if (t.type === 'equation') {
        client    = equationRef?.current?.getPageCoords(t)
        cellRects = equationRef?.current?.getCellRects(t) ?? null
      }

      if (!client) {
        // DOM lookup failed (refs not yet updated after a state restore).
        // Fall back to the cached position so the comment stays visible
        // instead of flashing away for one frame.
        const cached = placedRef.current[c.id]
        if (cached) items.push({ ...c, tx: cached.tx ?? 0, ty: cached.ty ?? 0, side: cached.side ?? 'right', cellRects: null })
        continue
      }

      const tx = client.x - cr.left
      const ty = client.y - cr.top
      const forcedRight = layoutMode?.startsWith('text-')

      let side
      if (forcedRight) {
        side = 'right'
      } else if (layoutMode?.includes('geo') && geoRef?.current?.getEdgeSegments) {
        const edges = geoRef.current.getEdgeSegments()
        const testSide = (s) => {
          const bx  = s === 'right' ? cr.width - BOX_W - MARGIN : MARGIN + BOX_W
          return countEdgeCrossings(bx + cr.left, ty + cr.top, tx + cr.left, ty + cr.top, edges)
        }
        const lc = testSide('left'), rc = testSide('right')
        side = lc < rc ? 'left' : rc < lc ? 'right' : tx < cr.width / 2 ? 'left' : 'right'
      } else {
        side = tx < cr.width / 2 ? 'left' : 'right'
      }

      items.push({
        ...c, tx, ty, side,
        cellRects: cellRects?.map(r => ({
          x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height,
        })) ?? null,
      })
    }

    // Remove stale cache entries (comments no longer in the prop)
    const currentIds = new Set(items.map(i => i.id))
    for (const id of Object.keys(placedRef.current)) {
      if (!currentIds.has(id)) delete placedRef.current[id]
    }

    // Already-placed items keep their exact position; new items are placed fresh.
    const result  = []
    const toPlace = []
    for (const item of items) {
      const cached = placedRef.current[item.id]
      if (cached) result.push({ ...item, ...cached })
      else        toPlace.push(item)
    }

    // Place each new item one at a time, never touching already-placed ones.
    for (const item of toPlace) {
      const { side } = item
      const boxX     = side === 'right' ? cr.width - BOX_W - MARGIN : MARGIN
      const lx       = side === 'right' ? boxX : boxX + BOX_W
      const sameSide = result.filter(r => r.side === side)

      let bestScore = Infinity
      let bestBoxY  = MARGIN
      let bestGoUp  = item.ty < cr.height / 2

      for (const goUp of [true, false]) {
        const vOff      = Math.abs(lx - item.tx) * TAN10
        const idealY    = (goUp ? item.ty - vOff : item.ty + vOff) - BOX_H / 2
        const candidateY = findFreeSlot(idealY, sameSide, cr.height)

        // Prefer direction that avoids crossing already-placed lines
        const lineLx = side === 'left' ? boxX + BOX_W : boxX
        const lineLy = candidateY + BOX_H / 2
        const crossings = result.filter(r => {
          const rlx = r.side === 'left' ? r.boxX + BOX_W : r.boxX
          const rly = r.boxY + BOX_H / 2
          return segmentsIntersect(lineLx, lineLy, item.tx, item.ty, rlx, rly, r.tx, r.ty)
        }).length

        const natural = goUp === (item.ty < cr.height / 2) ? 0 : 1
        const score   = crossings * 1000 + natural
        if (score < bestScore) { bestScore = score; bestBoxY = candidateY; bestGoUp = goUp }
      }

      const placed = { ...item, boxX, boxY: bestBoxY, goUp: bestGoUp }
      result.push(placed)
      // Store tx/ty alongside box position so the fallback path (failed DOM lookup)
      // can keep the comment visible at its last known connector target.
      placedRef.current[item.id] = { boxX, boxY: bestBoxY, side, tx: item.tx, ty: item.ty }
    }

    setResolved(result)
    // equationSnap is a dependency so the frames re-measure whenever the equation
    // changes size (a step animation, a new term, etc.). Box positions stay put
    // via placedRef; only the freshly-measured cellRects/anchor update.
  }, [comments, contentRef, tableRef, graphRef, geoRef, equationRef, equationSnap, layoutMode])

  // Always keep a ref to the latest resolveItems so the ResizeObserver never
  // holds a stale closure. ResizeObserver fires before React effects run, so
  // without this it could call the old resolveItems (with old comments) right
  // after setComments([]) triggers a render, re-adding cleared comments.
  const resolveItemsRef = useRef(resolveItems)
  resolveItemsRef.current = resolveItems

  // Expose imperative handle so App.jsx can snapshot/restore resolved positions
  // atomically alongside comments — eliminating the flash that happens when
  // resolved is re-derived asynchronously from a fresh comments prop.
  useImperativeHandle(ref, () => ({
    getResolved: () => resolved,
    setResolvedDirect: (items) => {
      bypassRef.current = true
      // Sync placedRef so forward steps don't find stale entries for
      // comments that were removed by this backward restore.
      const newCache = {}
      for (const item of items) {
        newCache[item.id] = { boxX: item.boxX, boxY: item.boxY, side: item.side, tx: item.tx, ty: item.ty }
      }
      placedRef.current = newCache
      setResolved(items)
    },
  }), [resolved])

  // useLayoutEffect fires before paint, so resolved updates atomically with
  // the comments prop change — no visible frame with stale positioned comments.
  // bypassRef skips re-derivation when setResolvedDirect already provided the answer.
  useLayoutEffect(() => {
    if (bypassRef.current) { bypassRef.current = false; return }
    resolveItems(false)
  }, [resolveItems])

  // Window/container resize → full recompute from scratch
  // Uses the ref so it always calls the latest resolveItems even if it hasn't
  // been swapped in the deps-effect yet.
  useEffect(() => {
    const onResize = () => resolveItemsRef.current(true)
    window.addEventListener('resize', onResize)
    const obs = new ResizeObserver(() => resolveItemsRef.current(false))
    if (contentRef?.current) obs.observe(contentRef.current)
    return () => { window.removeEventListener('resize', onResize); obs.disconnect() }
  }, [contentRef])

  // After render, measure each box's REAL height (tall LaTeX content exceeds BOX_H)
  // and nudge any box that overflows the container back inside the bounds.
  useLayoutEffect(() => {
    if (!resolved.length || !layerRef.current || !contentRef?.current) return
    const crH = contentRef.current.getBoundingClientRect().height
    let changed = false
    const next = resolved.map(c => {
      const el = layerRef.current.querySelector(`[data-cmt-id="${c.id}"]`)
      if (!el) return c
      const h    = el.offsetHeight
      const maxY = crH - h - MARGIN
      const newY = Math.max(MARGIN, Math.min(c.boxY, maxY))
      if (Math.abs(newY - c.boxY) > 0.5) { changed = true; return { ...c, boxY: newY } }
      return c
    })
    if (changed) setResolved(next)
  }, [resolved, contentRef])

  if (!resolved.length) return null

  return (
    <div ref={layerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>

      <svg width="100%" height="100%"
           style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {resolved.map(c => {
          if (c.free) return null   // no connector line/dot for free-floating comments

          const color = c.color ?? '#60a5fa'
          const lx = c.side === 'left' ? c.boxX + BOX_W : c.boxX
          const ly = c.boxY + BOX_H / 2

          // Snap dot to top border of the outline rect (the cell's top edge - 2px)
          let dotTy = c.ty
          if (c.cellRects?.length) {
            const nearest = c.cellRects.reduce((best, r) =>
              Math.abs(r.x + r.w / 2 - c.tx) < Math.abs(best.x + best.w / 2 - c.tx) ? r : best
            , c.cellRects[0])
            dotTy = nearest.y - 2
          }

          // Only a graph-anchored connector goes stale during pan/zoom — a
          // table cell, geometry vertex, or equation term doesn't move when
          // the GRAPH is panned, so their lines stay put and stay visible.
          const fadeForPan = graphInteractive && c.target?.type === 'graph'

          return (
            <g key={c.id} style={{ animation: 'cmtFadeIn 0.35s ease both' }}>
              <g style={{ opacity: fadeForPan ? 0 : 1, transition: 'opacity 0.25s ease' }}>
                {c.cellRects?.map((r, i) => (
                  <rect key={i}
                    x={r.x - 2} y={r.y - 2} width={r.w + 4} height={r.h + 4}
                    fill={color} fillOpacity={0.14}
                    stroke={color} strokeOpacity={0.65} strokeWidth={1.5} rx={3} />
                ))}
                <line x1={lx} y1={ly} x2={c.tx} y2={dotTy}
                  stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
                <circle cx={c.tx} cy={dotTy} r={DOT_R} fill={color} opacity={0.9} />
              </g>
            </g>
          )
        })}
      </svg>

      {resolved.map(c => (
        <CommentBox key={c.id} c={c} />
      ))}

    </div>
  )
})

export default CommentLayer
