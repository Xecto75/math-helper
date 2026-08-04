import { useState } from 'react'
import { PencilIcon, CheckIcon, UserIcon } from '../components/Icon.jsx'

// The account panel. What lived here before came from an earlier project: a
// school-grade picker (grade 1…5) nothing ever read, four stat cards that only
// ever showed "—" because no counter feeds them, and a "Connect with Google"
// button with no handler at all. All of it is gone; what is left is the state
// the server actually knows — who you are, your plan, and what remains of your
// quota — plus the display name, which is yours to set.
const AVATAR_COLORS = ['#818cf8', '#f472b6', '#fb923c', '#34d399', '#38bdf8', '#facc15', '#a78bfa', '#f87171']

export default function ProfileView({ profile, onSave, me, onSignIn, onSignOut }) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState(profile.name)

  const save = (patch) => onSave({ ...profile, ...patch })
  const avatarColor = profile.avatarColor || AVATAR_COLORS[0]
  const displayName = me?.displayName || profile.name || 'Student'
  const initial = displayName.trim().charAt(0).toUpperCase()
  const isPro   = me?.plan === 'pro'

  return (
    <div className="section-view profile-view">

      {/* Avatar + name */}
      <div className="profile-hero">
        <div className="avatar-picker">
          <div className="avatar-current" style={{ background: avatarColor }}>
            {initial || <UserIcon width={28} height={28} />}
          </div>
          <div className="avatar-grid">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                className={`avatar-opt${avatarColor === c ? ' avatar-opt--active' : ''}`}
                style={{ background: c }}
                aria-label={`Choose avatar color ${c}`}
                onClick={() => save({ avatarColor: c })}
              />
            ))}
          </div>
        </div>
        <div className="profile-info">
          {editingName ? (
            <div className="name-edit">
              <input
                className="name-input"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { save({ name: nameInput }); setEditingName(false) } }}
                autoFocus
              />
              <button className="name-save-btn" onClick={() => { save({ name: nameInput }); setEditingName(false) }}>
                <CheckIcon width={16} height={16} />
              </button>
            </div>
          ) : (
            <div className="name-row">
              <span className="profile-name">{displayName}</span>
              <button className="name-edit-btn" onClick={() => { setNameInput(profile.name); setEditingName(true) }}>
                <PencilIcon width={15} height={15} />
              </button>
            </div>
          )}
          {me?.email && <p className="profile-grade-label">{me.email}</p>}
        </div>
      </div>

      {/* Account — the server's numbers, never the browser's */}
      <div className="settings-block">
        <h3 className="settings-block-title">Account</h3>

        {!me ? (
          <>
            <button className="account-btn account-btn--outline" onClick={onSignIn}>Sign in</button>
            <p className="plan-note" style={{ marginTop: 10 }}>
              An account is what holds your free lessons. Google or email, either takes a few seconds.
            </p>
          </>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{isPro ? 'Pro' : 'Free'}</span>
                <span className="stat-label">Plan</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{isPro ? '∞' : (me.lessonsLeft ?? 0)}</span>
                <span className="stat-label">Lessons left</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{me.lessonsUsed ?? 0}</span>
                <span className="stat-label">Used this month</span>
              </div>
            </div>
            <p className="plan-note">
              {isPro
                ? 'Unlimited custom lessons on this account.'
                : `${me.lessonsLeft ?? 0} of ${me.freeLimit ?? 0} left — the count resets each month.`}
            </p>
            <button className="account-btn account-btn--outline" style={{ marginTop: 10 }} onClick={onSignOut}>
              Sign out
            </button>
          </>
        )}
      </div>

    </div>
  )
}
