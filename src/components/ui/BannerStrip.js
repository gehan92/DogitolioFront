'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, ExternalLink, Megaphone } from 'lucide-react'
import { getBanners } from '@/lib/banners'

const DISMISS_KEY = 'digitolio_dismissed_banners'

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]') }
  catch { return [] }
}

function markDismissed(id) {
  try {
    const current = getDismissed()
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...new Set([...current, id])]))
  } catch {}
}

// ── Single banner card ───────────────────────────────────────────────────────
function BannerCard({ banner, onDismiss }) {
  const [exiting, setExiting] = useState(false)
  const hasImage = !!banner.image_url
  const isExternal = banner.cta_link?.startsWith('http')

  function handleDismiss() {
    setExiting(true)
    setTimeout(() => onDismiss(banner.id), 260)
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-sm transition-all duration-200 hover:shadow-md"
      style={{
        opacity:    exiting ? 0 : 1,
        transform:  exiting ? 'translateY(-6px) scaleY(0.96)' : 'none',
        transition: 'opacity .26s ease, transform .26s ease',
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: 'linear-gradient(180deg,#FF2D55,#FF6035)' }}
      />

      {/* Optional dimmed background image */}
      {hasImage && (
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:    `url(${banner.image_url})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <div className="relative flex items-center gap-3 px-4 py-3.5 pl-6">
        {/* Icon */}
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
        >
          <Megaphone size={16} className="text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <span
            className="inline-block text-[9px] font-black uppercase tracking-[0.12em] mb-0.5 px-1.5 py-px rounded-sm"
            style={{ background: 'var(--c-brand-lt)', color: 'var(--c-brand)' }}
          >
            Sponsored
          </span>
          <p className="font-bold text-[var(--c-text)] text-[13px] leading-tight line-clamp-1">{banner.title}</p>
          {banner.subtitle && (
            <p className="text-[11px] text-[var(--c-muted)] mt-0.5 line-clamp-1">{banner.subtitle}</p>
          )}
        </div>

        {/* Thumbnail */}
        {hasImage && (
          <div className="hidden sm:block shrink-0 w-16 h-11 rounded-lg overflow-hidden border border-[var(--c-border)]">
            <img
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* CTA */}
        {banner.cta_text && banner.cta_link && (
          <Link
            href={banner.cta_link}
            target={isExternal ? '_blank' : '_self'}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap hover:opacity-90 hover:scale-[1.03] transition-all duration-150"
            style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
          >
            {banner.cta_text}
            {isExternal && <ExternalLink size={10} />}
          </Link>
        )}

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 rounded-lg text-[var(--c-dim)] hover:text-[var(--c-muted)] hover:bg-[var(--c-surface2)] transition-colors"
          aria-label="Dismiss advertisement"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Public-facing strip ──────────────────────────────────────────────────────
export function BannerStrip({ placement = 'home', className = '' }) {
  const [banners, setBanners] = useState([])
  const [visible, setVisible] = useState(new Set())
  const [ready,   setReady]   = useState(false)

  useEffect(() => {
    getBanners(placement).then(data => {
      const dismissed = new Set(getDismissed())
      const active    = data.filter(b => !dismissed.has(b.id))
      setBanners(active)
      setVisible(new Set(active.map(b => b.id)))
      setReady(true)
    })
  }, [placement])

  function dismiss(id) {
    markDismissed(id)
    setVisible(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  const showing = banners.filter(b => visible.has(b.id))

  if (!ready || showing.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`} role="complementary" aria-label="Sponsored content">
      {showing.map(banner => (
        <BannerCard key={banner.id} banner={banner} onDismiss={dismiss} />
      ))}
    </div>
  )
}
