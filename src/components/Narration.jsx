import MathText from './RichText.jsx'

export default function Narration({ title, narration, answer }) {
  return (
    <>
      {/* Title — fixed top zone */}
      <div className="stage-title-zone">
        {title && <p className="stage-title">{title}</p>}
      </div>

      {/* Equation slot is rendered by the parent between these two zones */}

      {/* Result + Narration — fixed bottom zone */}
      <div className="stage-bottom-zone">
        {answer && (
          <div className="answer-box">
            <span className="answer-label">Answer</span>
            <span className="answer-value">{answer}</span>
          </div>
        )}
        {narration && (
          <>
            <div className="stage-divider" />
            <p className="narration-text"><MathText text={narration} /></p>
          </>
        )}
      </div>
    </>
  )
}
