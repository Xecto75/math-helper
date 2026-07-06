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
            {lang === 'fr' ? 'Décris la leçon que tu veux créer…' : 'Describe the lesson you want to build…'}
          </p>
          <div className="custom-station-row">
            <textarea
              className="custom-station-input"
              placeholder={lang === 'fr'
                ? 'ex. Crée une leçon sur les fractions pour un élève de 3e année…'
                : 'e.g. Build a lesson on fractions for a grade 3 student…'}
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
                {lang === 'fr' ? 'Générer' : 'Generate'}
              </button>
              <button className="custom-station-builder" onClick={onBuilder}>
                {lang === 'fr' ? '✏️ Builder' : '✏️ Builder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
