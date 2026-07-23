import { useState } from 'react'
import { u } from '../i18n/uiText.js'

const AVATARS = ['🦁','🐯','🦊','🐼','🐨','🦄','🐲','🦋','🐬','🦅','🌟','🚀']
const GRADES  = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Sec 1','Sec 2','Sec 3','Sec 4','Sec 5','Other']

export default function ProfileView({ profile, onProfile, lang = 'en' }) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState(profile.name)

  const save = (patch) => onProfile({ ...profile, ...patch })

  const STATS = [
    { label: 'Lessons done', value: '—', icon: '📚' },
    { label: 'Tools used',   value: '—', icon: '🛠️' },
    { label: 'Day streak',   value: '—', icon: '🔥' },
    { label: 'Points',       value: '—', icon: '⭐' },
  ]

  return (
    <div className="section-view profile-view">

      {/* Avatar + name */}
      <div className="profile-hero">
        <div className="avatar-picker">
          <div className="avatar-current">{profile.avatar}</div>
          <div className="avatar-grid">
            {AVATARS.map(a => (
              <button key={a} className={`avatar-opt${profile.avatar === a ? ' avatar-opt--active' : ''}`} onClick={() => save({ avatar: a })}>{a}</button>
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
              <button className="name-save-btn" onClick={() => { save({ name: nameInput }); setEditingName(false) }}>✓</button>
            </div>
          ) : (
            <div className="name-row">
              <span className="profile-name">{profile.name || 'Student'}</span>
              <button className="name-edit-btn" onClick={() => { setNameInput(profile.name); setEditingName(true) }}>✏️</button>
            </div>
          )}
          <p className="profile-grade-label">{u(lang, 'level')}</p>
          <div className="grade-picker">
            {GRADES.map(g => (
              <button key={g} className={`grade-chip${profile.grade === g ? ' grade-chip--active' : ''}`} onClick={() => save({ grade: g })}>{g}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="settings-block">
        <h3 className="settings-block-title">{u(lang, 'statsTitle')}</h3>
        <div className="stats-grid">
          {STATS.map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="plan-note">{u(lang, 'statsNote')}</p>
      </div>

      {/* Account */}
      <div className="settings-block">
        <h3 className="settings-block-title">{u(lang, 'accountTitle')}</h3>
        <button className="account-btn account-btn--outline">{u(lang, 'connect')}</button>
        <p className="plan-note" style={{ marginTop: 10 }}>{u(lang, 'connectNote')}</p>
      </div>

    </div>
  )
}
