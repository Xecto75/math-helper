import { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react'
import MathText, { isPureMathLine } from './RichText.jsx'

// Single animated item row
function ListItem({ text, entering }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <li className={`tb-item${visible ? ' tb-item--in' : ''}`}>
      <MathText text={text} />
    </li>
  )
}

// How long a card takes to fade out — must match the .tb-card transition in
// App.css, since the element is only unmounted once the transition has run.
export const TB_FADE_MS = 280

// Single text box card
function TextBox({ box }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])
  // Dropping the card straight out of the array made it vanish between two
  // frames while every other change on screen animates. Removal now flips this
  // flag first, which runs the same transition backwards, and the unmount
  // happens after it.
  const shown = visible && !box.leaving

  // No accent set → reserved blue, the app-wide default whenever a color is
  // left empty.
  const accent = (box.color && box.color !== '') ? box.color : '#60a5fa'
  const count  = box.items.length
  const scale  = count <= 1 ? 2.0 : count <= 2 ? 1.5 : count <= 3 ? 1.2 : 1.0
  return (
    <div
      data-box-id={box.id}
      className={`tb-card${shown ? ' tb-card--in' : ''}`}
      style={{ '--tb-accent': accent, '--tb-scale': scale, borderLeftColor: accent }}
    >
      {box.title && (
        <div className="tb-title" style={{ color: accent }}>
          <MathText text={box.title} />
        </div>
      )}
      {box.isList === 'steps' ? (
          <ol className="tb-list tb-list--steps">
            {box.items.map((item, i) => <ListItem key={`${i}_${item}`} text={item} />)}
          </ol>
        ) : box.isList ? (
          <ul className="tb-list">
            {box.items.map((item, i) => <ListItem key={`${i}_${item}`} text={item} />)}
          </ul>
        ) : (
          <div className="tb-body">
            {box.items.map((item, i) => (
              <p key={i} className={`tb-para${isPureMathLine(item) ? ' tb-para--eq' : ''}`}><MathText text={item} /></p>
            ))}
          </div>
        )}
    </div>
  )
}

const TextBoxDisplay = forwardRef(function TextBoxDisplay(_, ref) {
  const [boxes, setBoxes] = useState([])
  const panelRef  = useRef(null)
  const boxesRef  = useRef([])
  boxesRef.current = boxes

  useImperativeHandle(ref, () => ({
    isReady: () => true,
    getBoxesState()       { return boxesRef.current },
    // Strip `leaving`: a snapshot taken mid-fade would otherwise restore a card
    // that a pending timer then deletes.
    restoreBoxesState(bxs) { setBoxes(bxs.map(b => ({ ...b, leaving: false }))) },

    getBoxEl(id) {
      return panelRef.current?.querySelector(`[data-box-id="${id}"]`) ?? null
    },

    replaceItems(id, items) {
      setBoxes(prev => prev.map(b => b.id === id ? { ...b, items } : b))
    },

    updateBoxColor(id, color) {
      setBoxes(prev => prev.map(b => b.id === id ? { ...b, color } : b))
    },

    addBox(box) {
      setBoxes(prev => {
        const without = prev.filter(b => b.id !== box.id)
        return [...without, { ...box }]
      })
    },

    // Fade out first, unmount after. The timer only drops a card that is still
    // marked leaving, so re-adding the same id mid-fade (addBox rebuilds the
    // entry without the flag) brings it back instead of being wiped by the
    // pending removal.
    removeBox(id) {
      setBoxes(prev => prev.map(b => b.id === id ? { ...b, leaving: true } : b))
      setTimeout(() => {
        setBoxes(prev => prev.filter(b => !(b.id === id && b.leaving)))
      }, TB_FADE_MS)
    },

    addItem(id, text) {
      setBoxes(prev => prev.map(b =>
        b.id === id ? { ...b, items: [...b.items, text] } : b
      ))
    },

    removeItem(id, index) {
      setBoxes(prev => prev.map(b =>
        b.id === id ? { ...b, items: b.items.filter((_, i) => i !== index) } : b
      ))
    },

    updateTitle(id, title) {
      setBoxes(prev => prev.map(b => b.id === id ? { ...b, title } : b))
    },

    clearAll() {
      setBoxes(prev => prev.map(b => ({ ...b, leaving: true })))
      setTimeout(() => setBoxes(prev => prev.filter(b => !b.leaving)), TB_FADE_MS)
    },

    // Page teardown — no fade, the whole panel is going away anyway and a
    // pending timer would fight the next page's boxes.
    clearAllNow() {
      setBoxes([])
    },
  }))

  return (
    <div className="tb-panel" ref={panelRef}>
      {boxes.map(box => <TextBox key={box.id} box={box} />)}
    </div>
  )
})

export default TextBoxDisplay
