'use client'
import { Check, Moon, RotateCcw, Sun } from 'lucide-react'
import { THEMES } from '@/lib/themes'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

export function ThemePicker({ onClose }) {
  const { activeKey, userKey, siteDefault, setTheme } = useTheme()

  const lightThemes = Object.entries(THEMES).filter(([, t]) => !t.dark)
  const darkThemes  = Object.entries(THEMES).filter(([, t]) =>  t.dark)

  function select(key) {
    setTheme(key)
    onClose?.()
  }

  return (
    <div
      className="w-[min(360px,92vw)] bg-[var(--c-surface)] border border-[var(--c-border)] rounded-2xl p-4 animate-fade-in"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-[var(--c-text)]">Choose Theme</p>
          <p className="text-[11px] text-[var(--c-muted)] mt-0.5">
            {userKey ? 'Personal preference active' : 'Following site default'}
          </p>
        </div>
        {userKey && (
          <button
            onClick={() => { setTheme(null); onClose?.() }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[var(--c-muted)] hover:text-[var(--c-brand)] transition-colors duration-150 px-2.5 py-1.5 rounded-lg hover:bg-[var(--c-surface2)]"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>

      {/* Light themes */}
      {lightThemes.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-dim)] mb-2.5 flex items-center gap-1.5">
            <Sun size={10} /> Light
          </p>
          <div className="grid grid-cols-2 gap-2">
            {lightThemes.map(([key, theme]) => (
              <ThemeCard
                key={key}
                themeKey={key}
                theme={theme}
                activeKey={activeKey}
                siteDefault={siteDefault}
                onSelect={select}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dark themes */}
      {darkThemes.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-dim)] mb-2.5 flex items-center gap-1.5">
            <Moon size={10} /> Dark
          </p>
          <div className="grid grid-cols-2 gap-2">
            {darkThemes.map(([key, theme]) => (
              <ThemeCard
                key={key}
                themeKey={key}
                theme={theme}
                activeKey={activeKey}
                siteDefault={siteDefault}
                onSelect={select}
              />
            ))}
          </div>
        </div>
      )}

      <p className="mt-3.5 text-[10px] text-[var(--c-dim)] text-center">
        Saved on this device only
      </p>
    </div>
  )
}

function ThemeCard({ themeKey, theme, activeKey, siteDefault, onSelect }) {
  const isActive  = activeKey  === themeKey
  const isDefault = siteDefault === themeKey

  return (
    <button
      type="button"
      onClick={() => onSelect(themeKey)}
      className={clsx(
        'relative p-3 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
        isActive
          ? 'border-[var(--c-brand)] shadow-lg'
          : 'border-transparent hover:border-[var(--c-border2)]'
      )}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${theme.vars['--c-surface']}, ${theme.preview[2]}50)`
          : theme.vars['--c-surface2'],
      }}
    >
      {/* Swatch row */}
      <div className="flex items-center gap-1 mb-2.5">
        <span
          className="w-5 h-5 rounded-full shrink-0 shadow-sm"
          style={{ background: theme.preview[0], outline: '1.5px solid rgba(0,0,0,.08)' }}
        />
        <span
          className="w-4 h-4 rounded-full shrink-0"
          style={{ background: theme.preview[1], outline: '1.5px solid rgba(0,0,0,.08)' }}
        />
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: theme.preview[2], outline: '1.5px solid rgba(0,0,0,.08)' }}
        />
      </div>

      <p className="text-xs font-bold leading-none mb-0.5" style={{ color: theme.vars['--c-text'] }}>
        {theme.label}
      </p>
      <p className="text-[10px] leading-tight truncate" style={{ color: theme.vars['--c-muted'] }}>
        {theme.description}
      </p>

      {/* Active checkmark */}
      {isActive && (
        <span
          className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-sm"
          style={{ background: theme.vars['--c-brand'] }}
        >
          <Check size={10} className="text-white" />
        </span>
      )}

      {/* Site default badge (shown only when NOT active) */}
      {isDefault && !isActive && (
        <span
          className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border"
          style={{
            color:       theme.vars['--c-muted'],
            borderColor: theme.vars['--c-border2'],
            background:  theme.vars['--c-surface'],
          }}
        >
          site
        </span>
      )}
    </button>
  )
}
