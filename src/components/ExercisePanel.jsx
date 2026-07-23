import MathText from './RichText.jsx'

// Sits between the top bar and the lesson canvas — the question stays put
// no matter what the page's layout shows underneath it (a graph, a shape,
// nothing at all). Only used when the page actually has a visual; see
// ExerciseQuestionHero for the no-visual case.
export function ExerciseQuestionBar({ question }) {
  if (!question) return null
  return (
    <div className="exercise-question-bar">
      <div className="exercise-question-text"><MathText text={question} /></div>
    </div>
  )
}

// A page with no layout/visual would otherwise leave the whole canvas area
// empty — instead the question itself fills that space, large and centered,
// so there's no dead void between the header and the answer bar.
export function ExerciseQuestionHero({ question }) {
  if (!question) return null
  return (
    <div className="exercise-question-hero">
      <div className="exercise-question-hero-text"><MathText text={question} /></div>
    </div>
  )
}

// Sits in the bottom area, replacing the normal playback toolbar while the
// current page is an exercise — choices or a text/number input, a Confirm
// button, then correct/incorrect feedback.
//
// Choices (2/4): one attempt — once confirmed (right or wrong) everything
// locks, the correct choice is highlighted green, no retry.
// Input: a wrong attempt stays editable — just type another answer and
// Confirm again — plus a "Give Up" button that reveals the correct answer
// and locks it.
export function ExerciseAnswerBar({ exercise, answer, result, onSelectChoice, onInputChange, onConfirm, onGiveUp }) {
  if (!exercise) return null
  const isChoices = exercise.exerciseType === 'choices2' || exercise.exerciseType === 'choices4'
  const canConfirm = isChoices ? answer != null : String(answer ?? '').trim() !== ''
  const locked = result === 'correct' || result === 'revealed' || (isChoices && !!result)

  return (
    <div className="exercise-answer-bar">
      {isChoices ? (
        <div className={`exercise-choices exercise-choices--${exercise.choices.length}`}>
          {exercise.choices.map((choice, idx) => {
            const isSelected = answer === idx
            const isCorrectChoice = idx === exercise.correctChoice
            let state = 'idle'
            if (result && isCorrectChoice) state = 'correct'
            else if (result && isSelected && !isCorrectChoice) state = 'wrong'
            else if (isSelected) state = 'selected'
            return (
              <button
                key={idx}
                className={`exercise-choice-btn exercise-choice-btn--${state}`}
                disabled={locked}
                onClick={() => onSelectChoice(idx)}
              >
                <MathText text={choice || `Choice ${idx + 1}`} />
              </button>
            )
          })}
        </div>
      ) : (
        <input
          className={`exercise-input${result ? ` exercise-input--${result === 'revealed' ? 'incorrect' : result}` : ''}`}
          type="text"
          placeholder="Your answer…"
          value={result === 'revealed' ? String(exercise.answer) : (answer ?? '')}
          disabled={locked}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && canConfirm && !locked) onConfirm() }}
        />
      )}

      <div className="exercise-confirm-row">
        {!locked && (
          <button className="exercise-confirm-btn" disabled={!canConfirm} onClick={onConfirm}>
            Confirm
          </button>
        )}
        {result && (
          <span className={`exercise-feedback exercise-feedback--${result === 'revealed' ? 'incorrect' : result}`}>
            {result === 'correct' ? '✓ Correct!'
              : result === 'revealed' ? `Answer: ${exercise.answer}`
              : isChoices ? '✗ Incorrect'
              : '✗ Incorrect — try again'}
          </span>
        )}
        {!isChoices && result === 'incorrect' && (
          <button className="exercise-retry-btn" onClick={onGiveUp}>Give Up</button>
        )}
      </div>
    </div>
  )
}
