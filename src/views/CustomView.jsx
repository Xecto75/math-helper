import { MISC, tr } from '../i18n/catalog.js'

export default function CustomView({ promptVal, onChange, onSend, aiLoading, aiError, onBuilder, lang = 'en' }) {
  return (
    <div className="section-view custom-view">
      <p className="section-sub">{tr(lang, MISC, 'customPrompt')}</p>
      <div className="custom-prompt-box">
        <textarea
          className="custom-textarea"
          placeholder={tr(lang, MISC, 'customPlaceholder')}
          value={promptVal}
          onChange={e => onChange(e.target.value)}
          disabled={aiLoading}
          rows={4}
        />
        <button
          className="custom-generate-btn"
          onClick={onSend}
          disabled={aiLoading || !promptVal.trim()}
        >
          {aiLoading ? `⏳ ${tr(lang, MISC, 'generating')}` : `✨ ${tr(lang, MISC, 'generateLesson')}`}
        </button>
        {aiError && <p className="custom-error">{aiError}</p>}
      </div>
      <div className="custom-or">— {tr(lang, MISC, 'or')} —</div>
      <button className="builder-open-btn" onClick={onBuilder}>
        📖 {tr(lang, MISC, 'createManually')}
      </button>
    </div>
  )
}
