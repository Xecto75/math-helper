import { u } from '../i18n/uiText.js'
import { PLANS as PLAN_NAMES, PLAN_FEATURES, tr } from '../i18n/catalog.js'
import {
  SunIcon, MoonIcon, TypeIcon,
  CreditCardIcon, TerminalIcon, CheckIcon,
} from '../components/Icon.jsx'

// No language setting: the interface follows the browser, and a generated
// lesson follows the language its prompt was written in (App.jsx, server.js).

const TEXT_SIZES = ['small', 'normal', 'large']

// Price digits stay literal (they are not language-dependent); only the plan
// name, the /mo suffix, and the feature wording come from the catalog.
const PLANS = [
  { id: 'free', amount: '$0',    features: ['lessons4', 'tools4', 'custom3'] },
  { id: 'pro',  amount: '$4.99', perMonth: true, features: ['allLessons', 'allTools', 'customUnlim', 'progress', 'adFree'], highlight: true },
]

export default function SettingsView({ lang, theme, onTheme, textSize, onTextSize, plan, onPlan, adminMode, onAdminMode }) {
  return (
    <div className="section-view settings-view">
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
