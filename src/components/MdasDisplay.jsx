import { useState, useImperativeHandle, forwardRef, useRef } from 'react'
import { MDAS_PRESETS } from '../engine/demoScripts.js'

const MdasDisplay = forwardRef(function MdasDisplay({ presetIdx = 0, onPresetChange }, ref) {
  const [s, setS]           = useState(null)
  const elRefs              = useRef({})
  const setRef              = k => el => { elRefs.current[k] = el }
  const [lastResultId, setLastResultId] = useState(null)

  useImperativeHandle(ref, () => ({
    setExpr(tokens) {
      setS({ tokens, hl: null })
    },
    highlight(from, to, color, label) {
      setS(prev => prev ? { ...prev, hl: { from, to, color, label } } : prev)
    },
    clearHighlight() {
      setS(prev => prev ? { ...prev, hl: null } : prev)
    },
    collapse(from, to, resultText, color) {
      const rid = `res_${Date.now()}`
      setLastResultId(rid)
      setS(prev => {
        if (!prev) return prev
        const newTok = { id: rid, kind: 'num', text: resultText, color, isResult: true }
        return {
          tokens: [...prev.tokens.slice(0, from), newTok, ...prev.tokens.slice(to + 1)],
          hl: null,
        }
      })
    },
    showFinal(value) {
      setS(prev => prev ? { ...prev, finalValue: value } : prev)
    },
    getEl(k)  { return elRefs.current[k] ?? null },
    clearAll() { setS(null); setLastResultId(null) },
  }))

  if (!s) return <div className="mdas-display mdas-display--empty" />

  const { tokens, hl, finalValue } = s

  const renderToken = (t) => (
    <span
      key={t.id}
      className={`mdas-token mdas-token--${t.kind}${t.isResult ? ' mdas-token--result' : ''}`}
      style={t.color ? { '--tcolor': t.color } : undefined}
      ref={t.isResult && t.id === lastResultId ? setRef('result-token') : undefined}
    >
      {t.text}
    </span>
  )

  let exprContent
  if (hl) {
    const before  = tokens.slice(0, hl.from)
    const inRange = tokens.slice(hl.from, hl.to + 1)
    const after   = tokens.slice(hl.to + 1)
    exprContent = (
      <>
        {before.map(renderToken)}
        <span
          className="mdas-hl-group"
          style={{ '--hlc': hl.color }}
          ref={setRef('hl-group')}
        >
          {inRange.map(renderToken)}
        </span>
        {after.map(renderToken)}
      </>
    )
  } else {
    exprContent = tokens.map(renderToken)
  }

  return (
    <div className="mdas-display">
      <div className="mdas-dots">
        {MDAS_PRESETS.map((_, i) => (
          <button
            key={i}
            className={`mdas-dot${i === presetIdx ? ' mdas-dot--active' : ''}`}
            onClick={() => onPresetChange?.(i)}
          />
        ))}
      </div>
      <div className="mdas-inner" ref={setRef('inner')}>

        {/* Expression row */}
        <div className="mdas-expr" ref={setRef('expr')}>
          {exprContent}
        </div>

        {/* Step label */}
        {hl?.label && (
          <div
            className="mdas-step-label"
            style={{ '--hlc': hl.color }}
            ref={setRef('step-label')}
          >
            {hl.label}
          </div>
        )}

        {/* Final equals result */}
        {finalValue != null && (
          <div className="mdas-final" ref={setRef('final')}>
            <span className="mdas-final-eq">= </span>
            <span className="mdas-final-val">{finalValue}</span>
          </div>
        )}
      </div>
    </div>
  )
})

export default MdasDisplay
