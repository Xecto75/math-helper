import { useState } from 'react'
import { GoogleIcon } from '../components/Icon.jsx'
import {
  signInWithGoogle, signInWithEmail, signUpWithEmail,
  sendPasswordReset, updatePassword,
} from '../lib/supabase.js'

// Sign-in / sign-up / password reset. Deliberately thin: it collects an email
// and a password and hands both straight to Supabase. No password rules,
// hashing, token handling or mail sending live here — that is exactly the code
// you do not want to write yourself, and Supabase already did it.
//
// Four modes. `recover` is the one the app forces after someone follows the
// link from a reset email: at that point Supabase has already signed them in
// with a one-time token, so setting a new password needs no old one.
export default function AuthView({ onDone, initialMode = 'signin' }) {
  const [mode,     setMode]     = useState(initialMode) // signin | signup | reset | recover
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')
  const [notice,   setNotice]   = useState('')

  const go = (next) => { setMode(next); setError(''); setNotice('') }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      if (mode === 'reset') {
        const { error } = await sendPasswordReset(email)
        if (error) throw error
        setNotice('Check your inbox — the link brings you back here to set a new password.')
        return
      }
      if (mode === 'recover') {
        const { error } = await updatePassword(password)
        if (error) throw error
        setNotice('Password updated.')
        onDone?.()
        return
      }
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

  const TITLES = {
    signin:  'Welcome back',
    signup:  'Create your account',
    reset:   'Reset your password',
    recover: 'Choose a new password',
  }
  const SUBS = {
    signin:  'Sign in to keep your lessons and progress.',
    signup:  'The free plan includes the lesson library and a few custom lessons a month.',
    reset:   'Enter your email and we will send you a link to set a new one.',
    recover: 'Almost done — pick something you will remember.',
  }
  const SUBMIT = {
    signin: 'Sign in', signup: 'Create account',
    reset:  'Send reset link', recover: 'Update password',
  }

  const wantsEmail    = mode !== 'recover'
  const wantsPassword = mode !== 'reset'
  const canSubmit = !busy &&
    (!wantsEmail    || !!email) &&
    (!wantsPassword || !!password)

  return (
    <div className="section-view auth-view">
      <h2 className="auth-title">{TITLES[mode]}</h2>
      <p className="section-sub">{SUBS[mode]}</p>

      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && (
          <input
            className="auth-input" type="text" placeholder="Name (optional)"
            value={name} onChange={e => setName(e.target.value)} autoComplete="name"
          />
        )}
        {wantsEmail && (
          <input
            className="auth-input" type="email" placeholder="Email" required
            value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
          />
        )}
        {wantsPassword && (
          <input
            className="auth-input" type="password"
            placeholder={mode === 'recover' ? 'New password' : 'Password'}
            required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        )}

        {mode === 'signin' && (
          <button type="button" className="auth-forgot" onClick={() => go('reset')}>
            Forgot your password?
          </button>
        )}

        <button className="auth-submit-btn" type="submit" disabled={!canSubmit}>
          {busy ? '…' : SUBMIT[mode]}
        </button>
      </form>

      {/* Email first, Google under the divider — the order every sign-in sheet
          uses, and the one the user pointed at. Hidden once we are past
          identifying the account: neither reset nor recover has any use for it. */}
      {(mode === 'signin' || mode === 'signup') && (
        <>
          <div className="auth-divider"><span>or</span></div>
          <button className="auth-google-btn" onClick={google} disabled={busy}>
            <GoogleIcon width={18} height={18} />
            Continue with Google
          </button>
        </>
      )}

      {error  && <p className="auth-error">{error}</p>}
      {notice && <p className="auth-notice">{notice}</p>}

      {mode !== 'recover' && (
        <button
          className="auth-switch"
          onClick={() => go(mode === 'signup' ? 'signin' : mode === 'reset' ? 'signin' : 'signup')}
        >
          {mode === 'signup' ? 'Already have an account? Sign in'
            : mode === 'reset' ? 'Back to sign in'
            : 'No account yet? Create one'}
        </button>
      )}
    </div>
  )
}
