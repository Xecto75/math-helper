import { useRef, useImperativeHandle, forwardRef } from 'react'
import TermCell from './TermCell.jsx'

/**
 * Renders  left[] = right[]  as cells.
 * Exposes { cellRefs: { left: HTMLElement[], right: HTMLElement[] } } via ref.
 */
const EquationDisplay = forwardRef(function EquationDisplay({ snapshot }, ref) {
  const leftRefs = useRef([])
  const rightRefs = useRef([])
  const equalsRef = useRef(null)

  // Rebuild ref arrays on every render so they stay in sync with the DOM
  leftRefs.current = []
  rightRefs.current = []

  useImperativeHandle(ref, () => ({
    get cellRefs() {
      return { left: leftRefs.current, right: rightRefs.current }
    },

    // Collect the target cells. side 'both' = whole equation; otherwise one side.
    // Explicit indices select specific cells; empty indices select every cell.
    getTargetEls(target) {
      if (target.side === 'both') {
        return [...leftRefs.current, ...rightRefs.current].filter(Boolean)
      }
      const refs = target.side === 'left' ? leftRefs.current : rightRefs.current
      const hasIndices = Array.isArray(target.indices) && target.indices.length > 0
      return (hasIndices ? target.indices.map(i => refs[i]) : refs).filter(Boolean)
    },

    // A "whole" selection (whole equation, or a whole side with no indices) draws
    // ONE merged box; explicit indices draw one box per cell.
    isWholeSelection(target) {
      return target.side === 'both' || !(Array.isArray(target.indices) && target.indices.length > 0)
    },

    // Visual rect of a term-wrap, ignoring its trailing padding-right (which is just
    // spacing between terms and would otherwise create a phantom gap on the right).
    _visualRect(el) {
      const r    = el.getBoundingClientRect()
      const padR = parseFloat(getComputedStyle(el).paddingRight) || 0
      return { left: r.left, top: r.top, right: r.right - padR, bottom: r.bottom, width: r.width - padR, height: r.height }
    },

    getPageCoords(target) {
      const els = this.getTargetEls(target)
      if (!els.length) return null
      const rects  = els.map(el => this._visualRect(el))
      const left   = Math.min(...rects.map(r => r.left))
      const right  = Math.max(...rects.map(r => r.right))
      const top    = Math.min(...rects.map(r => r.top))
      // Whole-equation comment: anchor x on the "=" sign. Otherwise center of the cells.
      let x = (left + right) / 2
      if (target.side === 'both' && equalsRef.current) {
        const er = equalsRef.current.getBoundingClientRect()
        x = (er.left + er.right) / 2
      }
      return { x, y: top }
    },

    getCellRects(target) {
      const els = this.getTargetEls(target)
      if (!els.length) return []
      if (!this.isWholeSelection(target)) {
        // per-cell outlines (tight to each cell, padding removed)
        return els.map(el => this._visualRect(el))
      }
      // One merged bounding box that adapts to the equation/side size, with a
      // uniform padding on ALL four sides.
      const rects  = els.map(el => this._visualRect(el))
      const PAD    = 7
      const left   = Math.min(...rects.map(r => r.left))   - PAD
      const right  = Math.max(...rects.map(r => r.right))  + PAD
      const top    = Math.min(...rects.map(r => r.top))    - PAD
      const bottom = Math.max(...rects.map(r => r.bottom)) + PAD
      return [{ left, top, right, bottom, x: left, y: top, width: right - left, height: bottom - top }]
    },
  }))

  if (!snapshot) return null

  const { left, right } = snapshot

  return (
    <div className="equation-display">
      <div className="equation-side" data-side="left">
        {left.length === 0
          ? <span className="term-zero">0</span>
          : left.map((term, i) => (
              <TermCell
                key={term.id}
                term={term}
                prevTerm={left[i - 1] ?? null}
                ref={el => { leftRefs.current[i] = el }}
              />
            ))
        }
      </div>

      <span className="equals-sign" ref={equalsRef}>=</span>

      <div className="equation-side" data-side="right">
        {right.length === 0
          ? <span className="term-zero">0</span>
          : right.map((term, i) => (
              <TermCell
                key={term.id}
                term={term}
                prevTerm={right[i - 1] ?? null}
                ref={el => { rightRefs.current[i] = el }}
              />
            ))
        }
      </div>
    </div>
  )
})

export default EquationDisplay
