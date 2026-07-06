export default function CustomView({ promptVal, onChange, onSend, aiLoading, aiError, onBuilder }) {
  return (
    <div className="section-view custom-view">
      <p className="section-sub">Décris une leçon et laisse la magie opérer !</p>
      <div className="custom-prompt-box">
        <textarea
          className="custom-textarea"
          placeholder="Ex : Une leçon sur les tables de 7 pour un enfant de 8 ans…"
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
          {aiLoading ? '⏳ Génération en cours…' : '✨ Générer la leçon'}
        </button>
        {aiError && <p className="custom-error">{aiError}</p>}
      </div>
      <div className="custom-or">— ou —</div>
      <button className="builder-open-btn" onClick={onBuilder}>
        📖 Créer manuellement (Lesson Builder)
      </button>
    </div>
  )
}
