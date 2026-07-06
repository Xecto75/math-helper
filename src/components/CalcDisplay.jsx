import { useState, useImperativeHandle, forwardRef, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { resolveLatexColors } from '../engine/palette.js'

function CalcStep({ step }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  let html = ''
  try {
    html = katex.renderToString(resolveLatexColors(step.latex), {
      throwOnError: false,
      displayMode: true,
      output: 'html',
    })
  } catch {
    html = `<span>${step.latex}</span>`
  }

  return (
    <div
      className={`calc-step${visible ? ' calc-step--in' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

const CalcDisplay = forwardRef(function CalcDisplay(_, ref) {
  const [steps, setSteps] = useState([])

  useImperativeHandle(ref, () => ({
    addStep(step) {
      setSteps(prev => [...prev, step])
    },
    clearAll() {
      setSteps([])
    },
  }))

  return (
    <div className="calc-display">
      {steps.map(step => (
        <CalcStep key={step.id} step={step} />
      ))}
    </div>
  )
})

export default CalcDisplay
