'use client'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export { ThemePicker } from './ThemePicker'
export { BannerStrip } from './BannerStrip'

// ── BUTTON ────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', className, loading, disabled, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[.97]'

  const variants = {
    primary:  'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
    secondary:'bg-surface-secondary text-gray-700 hover:bg-surface-tertiary border border-[var(--c-border)]',
    ghost:    'text-gray-700 hover:bg-surface-secondary',
    danger:   'bg-red-500 text-white hover:bg-red-600',
    outline:  'border border-brand-500 text-brand-600 hover:bg-brand-50',
  }

  const sizes = {
    sm:  'px-3 py-1.5 text-sm',
    md:  'px-4 py-2.5 text-sm',
    lg:  'px-6 py-3 text-base',
    xl:  'px-8 py-4 text-base',
    icon:'p-2.5',
  }

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

// ── BADGE ─────────────────────────────────────────
export function Badge({ children, color = 'gray', className }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-700',
    green:  'bg-green-100 text-green-800',
    amber:  'bg-amber-100 text-amber-800',
    red:    'bg-red-100 text-red-700',
    brand:  'bg-brand-100 text-brand-700',
    blue:   'bg-blue-100 text-blue-800',
  }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colors[color], className)}>
      {children}
    </span>
  )
}

// ── SPINNER ───────────────────────────────────────
export function Spinner({ size = 20, className }) {
  return <Loader2 size={size} className={clsx('animate-spin text-brand-500', className)} />
}

// ── STAR RATING ───────────────────────────────────
export function StarRating({ rating = 0, max = 5, size = 16, interactive = false, onChange }) {
  const stars = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'group' : undefined} aria-label={`${rating} out of ${max} stars`}>
      {stars.map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          className={clsx(
            'transition-transform',
            interactive ? 'hover:scale-110 cursor-pointer' : 'cursor-default pointer-events-none'
          )}
          aria-label={interactive ? `Rate ${star} stars` : undefined}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill={star <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      ))}
    </div>
  )
}

// ── PRICE BADGE ───────────────────────────────────
export function PriceBadge({ range }) {
  const map = {
    budget:  { label: '৳ Budget',  className: 'price-budget' },
    mid:     { label: '৳৳ Mid',    className: 'price-mid' },
    premium: { label: '৳৳৳ Premium',className: 'price-premium' },
  }
  const item = map[range] || map.mid
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold', item.className)}>
      {item.label}
    </span>
  )
}

// ── AVATAR ────────────────────────────────────────
export function Avatar({ src, name = '?', size = 36 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (src) return <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-sm"
         style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

// ── SKELETON LOADER ───────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="skeleton h-44 rounded-t-2xl rounded-b-none" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-4 w-3/4 mt-2" />
      </div>
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {Icon && <div className="w-14 h-14 rounded-2xl bg-surface-secondary flex items-center justify-center mb-4">
        <Icon size={24} className="text-[var(--c-dim)]" />
      </div>}
      <h3 className="font-display text-xl font-bold text-[var(--c-text)] mb-2">{title}</h3>
      <p className="text-[var(--c-muted)] max-w-xs mb-6">{description}</p>
      {action}
    </div>
  )
}
