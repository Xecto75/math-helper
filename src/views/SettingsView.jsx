import { u, SUPPORTED_LANGS } from '../i18n/uiText.js'
import { PLANS as PLAN_NAMES, PLAN_FEATURES, tr } from '../i18n/catalog.js'
import {
  GlobeIcon, SunIcon, MoonIcon, TypeIcon, VolumeIcon, VolumeMuteIcon,
  CreditCardIcon, TerminalIcon, CheckIcon,
} from '../components/Icon.jsx'

// comingSoon is derived, not hand-maintained: a language is selectable exactly
// when UI strings exist for it (SUPPORTED_LANGS), so the list can never offer a
// language whose labels would silently fall back to English.
const LANGUAGES = [
  { code: 'en', label: 'English'  },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch'  },
  { code: 'es', label: 'Español'  },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文'     },
].map(l => ({ ...l, comingSoon: !SUPPORTED_LANGS.includes(l.code) }))

const TEXT_SIZES = ['small', 'normal', 'large']

// Price digits stay literal (they are not language-dependent); only the plan
// name, the /mo suffix, and the feature wording come from the catalog.
const PLANS = [
  { id: 'free', amount: '$0',    features: ['lessons4', 'tools4', 'custom3'] },
  { id: 'pro',  amount: '$4.99', perMonth: true, features: ['allLessons', 'allTools', 'customUnlim', 'progress', 'adFree'], highlight: true },
]

export default function SettingsView({ lang, onLang, theme, onTheme, textSize, onTextSize, muted, onMuted, plan, onPlan, adminMode, onAdminMode }) {
  return (
    <div className="section-view settings-view">
      {/* Language */}
      <div className="settings-block">
        <h3 className="settings-block-title"><GlobeIcon width={16} height={16} />{u(lang, 'langTitle')}</h3>
        <div className="settings-lang-grid">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              className={`lang-option${lang === l.code ? ' lang-option--active' : ''}${l.comingSoon ? ' lang-option--soon' : ''}`}
              onClick={() => !l.comingSoon && onLang(l.code)}
              disabled={l.comingSoon}
            >
              <span className="lang-name">{l.label}</span>
              {l.comingSoon && <span className="soon-badge">Soon</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="settings-block">
        <h3 className="settings-block-title"><SunIcon width={16} height={16} />{u(lang, 'themeTitle')}</h3>
        <div className="settings-row">
          <button className={`theme-btn${theme === 'dark'  ? ' theme-btn--active' : ''}`} onClick={() => onTheme('dark')}><MoonIcon width={15} height={15} />{u(lang, 'dark')}</button>
          <button className={`theme-btn${theme === 'light' ? ' theme-btn--active' : ''}`} onClick={() => onTheme('light')}><SunIcon width={15} height={15} />{u(lang, 'light')}</button>
        </div>
      </div>

      {/* Text size */}
      <div className="settings-block">
        <h3 className="settings-block-title"><TypeIcon width={16} height={16} />{u(lang, 'textSize')}</h3>
        <div className="settings-row">
          {TEXT_SIZES.map(s => (
            <button key={s} className={`theme-btn${textSize === s ? ' theme-btn--active' : ''}`} onClick={() => onTextSize(s)}>
              {u(lang, s)}
            </button>
          ))}
        </div>
      </div>

      {/* Sound */}
      <div className="settings-block">
        <h3 className="settings-block-title"><VolumeIcon width={16} height={16} />{u(lang, 'sound')}</h3>
        <div className="settings-row">
          <button className={`theme-btn${!muted ? ' theme-btn--active' : ''}`} onClick={() => onMuted(false)}><VolumeIcon width={15} height={15} />{u(lang, 'soundOn')}</button>
          <button className={`theme-btn${ muted ? ' theme-btn--active' : ''}`} onClick={() => onMuted(true)}><VolumeMuteIcon width={15} height={15} />{u(lang, 'soundOff')}</button>
        </div>
      </div>

      {/* Subscription */}
      <div className="settings-block">
        <h3 className="settings-block-title"><CreditCardIcon width={16} height={16} />{u(lang, 'subscription')}</h3>
        <div className="plan-cards">
          {PLANS.map(p => (
            <button
              key={p.id}
              className={`plan-card${plan === p.id ? ' plan-card--active' : ''}${p.highlight ? ' plan-card--highlight' : ''}`}
              onClick={() => onPlan(p.id)}
            >
              <div className="plan-header">
                <span className="plan-name">{tr(lang, PLAN_NAMES, p.id)}</span>
                <span className="plan-price">{p.amount}{p.perMonth ? tr(lang, PLAN_NAMES, 'perMonth') : ''}</span>
              </div>
              <ul className="plan-features">
                {p.features.map(f => <li key={f}><CheckIcon width={13} height={13} />{tr(lang, PLAN_FEATURES, f)}</li>)}
              </ul>
              {plan === p.id && <span className="plan-current">{tr(lang, PLAN_NAMES, 'currentPlan')}</span>}
            </button>
          ))}
        </div>
        {plan === 'free' && <p className="plan-note">{u(lang, 'planNote')}</p>}
      </div>

      {/* Admin / Developer */}
      <div className="settings-block">
        <h3 className="settings-block-title"><TerminalIcon width={16} height={16} />{u(lang, 'adminTitle')}</h3>
        <p className="plan-note" style={{ marginBottom: 12 }}>{u(lang, 'adminDesc')}</p>
        <div className="settings-row">
          <button className={`theme-btn${adminMode ? ' theme-btn--active' : ''}`}  onClick={() => onAdminMode(true)}>{u(lang, 'adminOn')}</button>
          <button className={`theme-btn${!adminMode ? ' theme-btn--active' : ''}`} onClick={() => onAdminMode(false)}>{u(lang, 'adminOff')}</button>
        </div>
      </div>

    </div>
  )
}
