import { useEffect } from 'react'
import AuthView from '../views/AuthView.jsx'

// The sign-in sheet, over whatever the user was doing. It exists because the
// moment people meet the wall is mid-task — they typed a prompt and pressed
// generate — and sending them off to hunt for a Profile panel loses most of
// them. Same pattern as every site that gates an action rather than a page.
export default function AuthModal({ open, onClose, onDone, reason, mode = 'signin' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">✕</button>
        {reason && <p className="auth-modal-reason">{reason}</p>}
        {/* keyed on mode so reopening in another mode remounts the form clean
            rather than keeping the previous one's fields and messages */}
        <AuthView key={mode} initialMode={mode} onDone={() => { onDone?.(); onClose?.() }} />
      </div>
    </div>
  )
}
