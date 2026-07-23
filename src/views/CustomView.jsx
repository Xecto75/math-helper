export default function CustomView({ promptVal, onChange, onSend, aiLoading, aiError, onBuilder }) {
  return (
    <div className="section-view custom-view">
      <p className="section-sub">Describe a lesson and let the magic happen!</p>
      <div className="custom-prompt-box">
        <textarea
          className="custom-textarea"
          placeholder="E.g.: A lesson on the 7-times table for an 8-year-old…"
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
          {aiLoading ? '⏳ Generating…' : '✨ Generate lesson'}
        </button>
        {aiError && <p className="custom-error">{aiError}</p>}
      </div>
      <div className="custom-or">— or —</div>
      <button className="builder-open-btn" onClick={onBuilder}>
        📖 Create manually (Lesson Builder)
      </button>
    </div>
  )
}
