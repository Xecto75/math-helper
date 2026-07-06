import { useState, useRef, useEffect } from 'react'
import { PALETTE } from '../engine/palette.js'

const ENTRIES = Object.entries(PALETTE) // [['red','#f87171'], ...]

export default function ColorInput({ value, onChange, placeholder, disabled, className }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState(value ?? '')
  const wrapRef = useRef(null)

  // Keep query in sync when value changes externally
  useEffect(() => { setQuery(value ?? '') }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const q = query.trim().toLowerCase()
  const matches = q
    ? ENTRIES.filter(([name, hex]) => name.startsWith(q) || hex.startsWith(q))
    : ENTRIES

  function pick(name) {
    setQuery(name)
    onChange(name)
    setOpen(false)
  }

  function handleChange(e) {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    setOpen(true)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <input
        className={className}
        type="text"
        value={query}
        placeholder={placeholder ?? '#hex or name'}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        autoComplete="off"
        style={{ paddingLeft: query && (query.startsWith('#') || PALETTE[query])
          ? 28 : undefined }}
      />
      {/* color preview swatch */}
      {query && (
        <span style={{
          position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)',
          width: 12, height: 12, borderRadius: 3,
          background: PALETTE[query] ?? (query.startsWith('#') ? query : 'transparent'),
          border: '1px solid rgba(255,255,255,0.2)',
          pointerEvents: 'none',
        }} />
      )}
      {open && matches.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: 'var(--bg-2, #1e1e2e)',
          border: '1px solid var(--border, #333)',
          borderRadius: 6, marginTop: 2,
          maxHeight: 180, overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          {matches.map(([name, hex]) => (
            <div
              key={name}
              onMouseDown={() => pick(name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 9px', cursor: 'pointer',
                background: name === query ? 'var(--bg-3, #2a2a3e)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3, #2a2a3e)'}
              onMouseLeave={e => e.currentTarget.style.background = name === query ? 'var(--bg-3, #2a2a3e)' : 'transparent'}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                background: hex, border: '1px solid rgba(255,255,255,0.15)',
              }} />
              <span style={{ fontSize: 13, color: 'var(--text-1, #e2e8f0)', fontWeight: 500 }}>{name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-2, #94a3b8)', marginLeft: 'auto' }}>{hex}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
