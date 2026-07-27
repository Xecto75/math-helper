import { useState } from 'react'
import { u } from '../i18n/uiText.js'
import { GRADES, STATS, tr } from '../i18n/catalog.js'
import { PencilIcon, CheckIcon, BookIcon, WrenchIcon, FlameIcon, StarIcon, UserIcon, GoogleIcon } from '../components/Icon.jsx'

// A small set of solid accent colors to pick the avatar background from —
// same idea as Slack/Linear/GitHub's "pick a color" avatar, instead of a
// grid of animal emoji standing in for a profile picture.
const AVATAR_COLORS = ['#818cf8', '#f472b6', '#fb923c', '#34d399', '#38bdf8', '#facc15', '#a78bfa', '#f87171']
// Stored value is the stable key (g1…s5/other); the label is translated at render.
const GRADE_KEYS = ['g1','g2','g3','g4','g5','g6','s1','s2','s3','s4','s5','other']

export default function ProfileView({ profile, onSave, lang = 'en' }) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState(profile.name)

  const save = (patch) => onSave({ ...profile, ...patch })
  const avatarColor = profile.avatarColor || AVATAR_COLORS[0]
  const initial = (profile.name || '').trim().charAt(0).toUpperCase()

  const STAT_ROWS = [
    { key: 'lessonsDone', value: '—', Icon: BookIcon },
    { key: 'toolsUsed',   value: '—', Icon: WrenchIcon },
    { key: 'dayStreak',   value: '—', Icon: FlameIcon },
    { key: 'points',      value: '—', Icon: StarIcon },
  ]

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
              <span className="profile-name">{profile.name || 'Student'}</span>
              <button className="name-edit-btn" onClick={() => { setNameInput(profile.name); setEditingName(true) }}>
                <PencilIcon width={15} height={15} />
              </button>
            </div>
          )}
          <p className="profile-grade-label">{u(lang, 'level')}</p>
          <div className="grade-picker">
            {GRADE_KEYS.map(g => (
              <button key={g} className={`grade-chip${profile.grade === g ? ' grade-chip--active' : ''}`} onClick={() => save({ grade: g })}>{tr(lang, GRADES, g)}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="settings-block">
        <h3 className="settings-block-title">{u(lang, 'statsTitle')}</h3>
        <div className="stats-grid">
          {STAT_ROWS.map(s => (
            <div key={s.key} className="stat-card">
              <s.Icon className="stat-icon" width={19} height={19} />
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{tr(lang, STATS, s.key)}</span>
            </div>
          ))}
        </div>
        <p className="plan-note">{u(lang, 'statsNote')}</p>
      </div>

      {/* Account */}
      <div className="settings-block">
        <h3 className="settings-block-title">{u(lang, 'accountTitle')}</h3>
        <button className="account-btn account-btn--outline">
          <GoogleIcon />
          {u(lang, 'connect')}
        </button>
        <p className="plan-note" style={{ marginTop: 10 }}>{u(lang, 'connectNote')}</p>
      </div>

    </div>
  )
}
