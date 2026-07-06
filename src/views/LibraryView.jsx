import { u } from '../i18n/uiText.js'

export default function LibraryView({ grades, onPlay, adminMode, onEditLesson, lang = 'en' }) {
  return (
    <div className="section-view">
      <p className="section-sub">{u(lang, 'librarySub')}</p>
      {grades.map(grade => (
        <div key={grade.id} className="grade-section">
          <div className="grade-header">
            <span className="grade-pill" style={{ background: grade.color + '22', color: grade.color, borderColor: grade.color + '44' }}>
              {grade.label}
            </span>
            <span className="grade-sublabel">{grade.sublabel}</span>
          </div>
          <div className="card-grid">
            {grade.lessons.map(lesson => (
              <div key={lesson.id} className="lesson-card-wrap">
                <button
                  className={`lesson-card${lesson.comingSoon ? ' lesson-card--soon' : ''}`}
                  style={{ background: lesson.bg, '--card-color': lesson.color }}
                  onClick={() => !lesson.comingSoon && onPlay(lesson)}
                  disabled={lesson.comingSoon && !adminMode}
                >
                  <span className="card-emoji">{lesson.emoji}</span>
                  <span className="card-title">{lesson.title}</span>
                  <span className="card-desc">{lesson.desc}</span>
                  {lesson.comingSoon
                    ? <span className="card-cta card-cta--soon">{u(lang, 'soon')}</span>
                    : <span className="card-cta">{u(lang, 'start')}</span>
                  }
                </button>
                {adminMode && (
                  <button
                    className="card-edit-btn"
                    title="Edit lesson"
                    onClick={e => { e.stopPropagation(); onEditLesson(lesson) }}
                  >
                    ✏️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
