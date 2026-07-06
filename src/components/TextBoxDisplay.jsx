import { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react'
import MathText from './RichText.jsx'

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

// Single text box card
function TextBox({ box }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const accent = (box.color && box.color !== '') ? box.color : '#60a5fa'
  const count  = box.items.length
  const scale  = count <= 1 ? 2.0 : count <= 2 ? 1.5 : count <= 3 ? 1.2 : 1.0
  return (
    <div
      data-box-id={box.id}
      className={`tb-card${visible ? ' tb-card--in' : ''}`}
      style={{ '--tb-accent': accent, '--tb-scale': scale, borderLeftColor: accent }}
    >
      {box.title && (
        <div className="tb-title" style={{ color: accent }}>
          <MathText text={box.title} />
        </div>
      )}
      {box.isList ? (
          <ul className="tb-list">
            {box.items.map((item, i) => <ListItem key={`${i}_${item}`} text={item} />)}
          </ul>
        ) : (
          <div className="tb-body">
            {box.items.map((item, i) => (
              <p key={i} className="tb-para"><MathText text={item} /></p>
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
    restoreBoxesState(bxs) { setBoxes([...bxs]) },

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

    removeBox(id) {
      setBoxes(prev => prev.filter(b => b.id !== id))
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
