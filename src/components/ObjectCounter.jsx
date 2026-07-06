import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { flushSync } from 'react-dom'

const MAX = 40

const PATTERNS = {
  1: [1], 2: [2], 3: [2,1], 4: [2,2], 5: [3,2],
  6: [3,2,1], 7: [2,3,2], 8: [3,2,3], 9: [3,3,3],
}

function getRows(count) {
  if (count <= 9 && PATTERNS[count]) return PATTERNS[count]
  const rows = []
  let rem = count
  while (rem > 0) { rows.push(Math.min(3, rem)); rem -= 3 }
  return rows
}

const ObjectCounter = forwardRef(function ObjectCounter(_props, ref) {
  const [objects, setObjects] = useState([])
  const [groups,  setGroups]  = useState([])
  const containerRef          = useRef(null)
  const nextId                = useRef(0)

  function mkId() { return `obj-${nextId.current++}` }

  function animateNewItems(from) {
    requestAnimationFrame(() => {
      const el = containerRef.current
      if (!el) return
      const items = Array.from(el.querySelectorAll('.counter-obj'))
      const fresh = items.slice(from)
      if (!fresh.length) return
      gsap.from(fresh, {
        scale: 0, opacity: 0,
        stagger: Math.min(0.08, 600 / (fresh.length * 1000)),
        duration: 0.35, ease: 'back.out(1.7)',
      })
    })
  }

  useImperativeHandle(ref, () => ({
    clearAll() { setObjects([]); setGroups([]) },

    show(count, emoji = '🍎') {
      const n   = Math.min(Math.max(Number(count) || 0, 0), MAX)
      const arr = Array.from({ length: n }, () => ({ id: mkId(), emoji }))
      flushSync(() => { setObjects(arr); setGroups([]) })
      animateNewItems(0)
    },

    add(count, emoji) {
      let arr
      setObjects(prev => {
        const e = emoji || prev[prev.length - 1]?.emoji || '🍎'
        const n = Math.min(Math.max(Number(count) || 0, 0), MAX - prev.length)
        arr = [...prev, ...Array.from({ length: n }, () => ({ id: mkId(), emoji: e }))]
        return arr
      })
      requestAnimationFrame(() => animateNewItems(arr ? arr.length - (Number(count) || 0) : 0))
    },

    remove(count) {
      const n = Math.min(Math.max(Number(count) || 0, 0), MAX)
      setObjects(prev => {
        const el = containerRef.current
        if (el) {
          const allItems = Array.from(el.querySelectorAll('.counter-obj'))
          const outItems = allItems.slice(-n)
          gsap.to(outItems, {
            scale: 0, opacity: 0, stagger: 0.05, duration: 0.25, ease: 'power2.in',
            onComplete: () => setObjects(p => p.slice(0, p.length - n)),
          })
          return prev
        }
        return prev.slice(0, prev.length - n)
      })
    },

    group(groupSize, color = '#818cf8') {
      const size = Math.max(1, Number(groupSize) || 2)
      setGroups(prev => [...prev, { size, color }])
    },
  }))

  if (!objects.length) return <div className="counter-display counter-display--empty" />

  // Build group border info
  const groupBorders = []
  if (groups.length > 0) {
    let pos = 0
    for (const g of groups) {
      let remaining = objects.length - pos
      while (remaining >= g.size) {
        groupBorders.push({ start: pos, end: pos + g.size - 1, color: g.color })
        pos += g.size; remaining -= g.size
      }
    }
  }

  // Split objects into rows
  const rowPattern = getRows(objects.length)
  const rows = []
  let offset = 0
  for (const count of rowPattern) {
    rows.push(objects.slice(offset, offset + count))
    offset += count
  }

  return (
    <div className="counter-display" ref={containerRef}>
      <div className="counter-rows">
        {rows.map((rowObjs, ri) => (
          <div key={ri} className="counter-row">
            {rowObjs.map((obj, i) => {
              const globalIdx = rows.slice(0, ri).reduce((a, r) => a + r.length, 0) + i
              const border = groupBorders.find(b => globalIdx >= b.start && globalIdx <= b.end)
              return (
                <span
                  key={obj.id}
                  className={`counter-obj${border ? ' counter-obj--grouped' : ''}`}
                  style={border ? { '--group-color': border.color, outline: `2px solid ${border.color}`, background: border.color + '22', borderRadius: '8px' } : {}}
                >
                  {obj.emoji}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
})

export default ObjectCounter
