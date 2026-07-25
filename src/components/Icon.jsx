// Minimal stroke-based icon set (24x24, currentColor) used by Profile/Settings —
// replaces emoji so those screens read as a proper product settings panel
// instead of a novelty picker. Every icon shares the same stroke weight/caps
// so they sit together consistently regardless of which ones a screen uses.
const base = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
}

export function PencilIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="M15 5l4 4" />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function BookIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

export function WrenchIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.8 2.8-2-2z" />
    </svg>
  )
}

export function FlameIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

export function StarIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.6l-5.9 3 1.2-6.5-4.8-4.6 6.6-.9Z" />
    </svg>
  )
}

export function GlobeIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.5 2.6 3.8 5.9 3.8 9.5s-1.3 6.9-3.8 9.5c-2.5-2.6-3.8-5.9-3.8-9.5S9.5 5.1 12 2.5z" />
    </svg>
  )
}

export function SunIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7" />
    </svg>
  )
}

export function MoonIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
    </svg>
  )
}

export function TypeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 5h14M12 5v14M9 19h6" />
    </svg>
  )
}

export function VolumeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 9.5a4 4 0 0 1 0 5.5M19.5 7a7.5 7.5 0 0 1 0 10.5" />
    </svg>
  )
}

export function VolumeMuteIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 9.5l4.5 5M21.5 9.5 17 14.5" />
    </svg>
  )
}

export function CreditCardIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
      <path d="M2.5 10h19M6 15h4" />
    </svg>
  )
}

export function TerminalIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="4" width="19" height="16" rx="2.2" />
      <path d="M6.5 9.5 10 12l-3.5 2.5M12.5 15h5" />
    </svg>
  )
}

export function UserIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.2a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

// Google's own mark — required as-is (not recolored) by their sign-in button
// guidelines, so this is the one icon here that isn't a plain currentColor stroke.
export function GoogleIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" {...props}>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.9 14-5.1l-6.5-5.5C29.4 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.5 5.5C40.9 36.8 44 31 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  )
}
