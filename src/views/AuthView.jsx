import { useState } from 'react'
import { GoogleIcon } from '../components/Icon.jsx'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../lib/supabase.js'

// Sign-in / sign-up. Deliberately thin: it collects an email and a password and
// hands both straight to Supabase. No password rules, hashing, reset flow or
// session handling live here — that is exactly the code you do not want to
// write yourself, and Supabase already did it.
export default function AuthView({ onDone }) {
  const [mode,     setMode]     = useState('signin')   // 'signin' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')
  const [notice,   setNotice]   = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await signUpWithEmail(email, password, name)
        if (error) throw error
        // With email confirmation on, there is no session yet — say so instead
        // of silently doing nothing, which reads as a broken button.
        if (!data.session) {
          setNotice('Check your inbox to confirm your address, then sign in.')
          setMode('signin')
          return
        }
      } else {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
      }
      onDone?.()
    } catch (err) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setError(''); setBusy(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
      // Success navigates away to Google; nothing to do here.
    } catch (err) {
      setError(err.message ?? 'Google sign-in failed.')
      setBusy(false)
    }
  }

  return (
    <div className="section-view auth-view">
      <h2 className="auth-title">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
      <p className="section-sub">
        {mode === 'signup'
          ? 'Free plan includes the lesson library and 3 custom lessons a month.'
          : 'Sign in to keep your lessons and progress.'}
      </p>

      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && (
          <input
            className="auth-input" type="text" placeholder="Name (optional)"
            value={name} onChange={e => setName(e.target.value)} autoComplete="name"
          />
        )}
        <input
          className="auth-input" type="email" placeholder="Email" required
          value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
        />
        <input
          className="auth-input" type="password" placeholder="Password" required minLength={8}
          value={password} onChange={e => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
        <button className="auth-submit-btn" type="submit" disabled={busy || !email || !password}>
          {busy ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {/* Email first, Google under the divider — the order every sign-in sheet
          uses, and the one the user pointed at. */}
      <div className="auth-divider"><span>or</span></div>

      <button className="auth-google-btn" onClick={google} disabled={busy}>
        <GoogleIcon width={18} height={18} />
        Continue with Google
      </button>

      {error  && <p className="auth-error">{error}</p>}
      {notice && <p className="auth-notice">{notice}</p>}

      <button
        className="auth-switch"
        onClick={() => { setMode(m => (m === 'signup' ? 'signin' : 'signup')); setError(''); setNotice('') }}
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : "No account yet? Create one"}
      </button>
    </div>
  )
}
