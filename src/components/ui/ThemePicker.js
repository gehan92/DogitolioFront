'use client'
import { Check, Moon, RotateCcw, Sun, Monitor } from 'lucide-react'
import { THEMES } from '@/lib/themes'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

export function ThemePicker({ onClose }) {
  const { activeKey, userKey, siteDefault, setTheme } = useTheme()

  const lightThemes = Object.entries(THEMES).filter(([, t]) => !t.dark)
  const darkThemes  = Object.entries(THEMES).filter(([, t]) =>  t.dark)

  function select(key) {
    setTheme(key === siteDefault ? null : key)
    onClose?.()
  }

  return (
    <div
      className="w-[min(420px,95vw)] rounded-2xl overflow-hidden animate-fade-in"
      style={{
        background:  'var(--c-surface)',
        border:      '1px solid var(--c-border)',
        boxShadow:   '0 24px 64px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.08)',
      }}
    >
      {/* ── Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--c-border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'var(--c-brand-lt)' }}>
            <Monitor size={14} style={{ color: 'var(--c-brand)' }} />
          </span>
          <div>
            <p className="text-[13px] font-bold leading-none" style={{ color: 'var(--c-text)' }}>Appearance</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-muted)' }}>
              {userKey ? 'Personal override active' : 'Using site default'}
            </p>
          </div>
        </div>
        {userKey && userKey !== siteDefault && (
          <button
            onClick={() => { setTheme(null); onClose?.() }}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{ color: 'var(--c-muted)', background: 'var(--c-surface2)' }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      {/* ── Light section */}
      <div className="px-4 pt-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5" style={{ color: 'var(--c-dim)' }}>
          <Sun size={10} /> Light
        </p>
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {lightThemes.map(([key, theme]) => (
            <ThemeCard key={key} themeKey={key} theme={theme} activeKey={activeKey} siteDefault={siteDefault} onSelect={select} />
          ))}
        </div>
      </div>

      {/* ── Dark section */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5" style={{ color: 'var(--c-dim)' }}>
          <Moon size={10} /> Dark
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {darkThemes.map(([key, theme]) => (
            <ThemeCard key={key} themeKey={key} theme={theme} activeKey={activeKey} siteDefault={siteDefault} onSelect={select} />
          ))}
        </div>
      </div>

      {/* ── Footer */}
      <div className="px-4 py-2.5 border-t text-center" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface2)' }}>
        <p className="text-[10px]" style={{ color: 'var(--c-dim)' }}>Saved to this device only</p>
      </div>
    </div>
  )
}

/* ── Mini preview card ─────────────────────────────────────────────────── */
function ThemeCard({ themeKey, theme, activeKey, siteDefault, onSelect }) {
  const isActive  = activeKey  === themeKey
  const isDefault = siteDefault === themeKey
  const v = theme.vars

  return (
    <button
      type="button"
      onClick={() => onSelect(themeKey)}
      className="group relative rounded-xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none"
      style={{
        boxShadow: isActive
          ? `0 0 0 2.5px ${v['--c-brand']}, 0 8px 28px ${v['--c-brand']}33`
          : `0 0 0 1.5px ${v['--c-border']}`,
      }}
    >
      {/* Mini UI — browser chrome header */}
      <div
        className="relative h-[46px] w-full overflow-hidden flex flex-col justify-end"
        style={{ background: `linear-gradient(135deg, ${v['--c-brand']} 0%, ${v['--c-brand-dk']} 100%)` }}
      >
        {/* fake window dots */}
        <div className="absolute top-2 left-2.5 flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.5 }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.35 }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.25 }} />
        </div>
        {/* fake nav bar */}
        <div className="px-2.5 pb-2 flex items-end gap-1.5">
          <span className="w-8 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.6 }} />
          <span className="w-5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.35 }} />
          <span className="w-5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.35 }} />
        </div>
      </div>

      {/* Mini UI — page body */}
      <div className="px-2 py-2" style={{ background: v['--c-bg'] }}>
        {/* fake card */}
        <div className="rounded-md p-1.5 mb-1.5" style={{ background: v['--c-surface'], border: `1px solid ${v['--c-border']}` }}>
          <span className="block w-10 h-1.5 rounded-full mb-1" style={{ background: v['--c-brand'], opacity: 0.9 }} />
          <span className="block w-full h-1 rounded-full mb-0.5" style={{ background: v['--c-text'], opacity: 0.12 }} />
          <span className="block w-3/4 h-1 rounded-full" style={{ background: v['--c-text'], opacity: 0.08 }} />
        </div>
        {/* second stub */}
        <div className="flex gap-1">
          <span className="flex-1 h-4 rounded-md" style={{ background: v['--c-surface2'], border: `1px solid ${v['--c-border']}` }} />
          <span className="flex-1 h-4 rounded-md" style={{ background: v['--c-surface2'], border: `1px solid ${v['--c-border']}` }} />
        </div>
      </div>

      {/* Label row */}
      <div
        className="flex items-center justify-between px-2 pb-2"
        style={{ background: v['--c-bg'] }}
      >
        <p className="text-[11px] font-bold truncate" style={{ color: v['--c-text'] }}>{theme.label}</p>
        {isDefault && (
          <span className="text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded" style={{ background: v['--c-brand-lt'], color: v['--c-brand'] }}>
            site
          </span>
        )}
      </div>

      {/* Active check overlay */}
      {isActive && (
        <span
          className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md"
          style={{ background: v['--c-surface'] }}
        >
          <Check size={11} style={{ color: v['--c-brand'] }} />
        </span>
      )}
    </button>
  )
}
