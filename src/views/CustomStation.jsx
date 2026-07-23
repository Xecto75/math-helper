import { useState } from 'react'

export default function CustomStation({ onGenerate, onBuilder, lang = 'en' }) {
  const [prompt, setPrompt] = useState('')

  const handleSend = () => {
    if (!prompt.trim()) return
    onGenerate?.(prompt.trim())
  }

  return (
    <div className="station station--custom">
      <div className="station-content station-content--bottom">
        <div className="custom-station-prompt">
          <p className="custom-station-label">
            Describe the lesson you want to build…
          </p>
          <div className="custom-station-row">
            <textarea
              className="custom-station-input"
              placeholder="e.g. Build a lesson on fractions for a grade 3 student…"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend() }}
              rows={3}
              spellCheck={false}
            />
            <div className="custom-station-actions">
              <button
                className="custom-station-send"
                onClick={handleSend}
                disabled={!prompt.trim()}
              >
                Generate
              </button>
              <button className="custom-station-builder" onClick={onBuilder}>
                ✏️ Builder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
