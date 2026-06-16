'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { getBanners } from '@/lib/banners'

const BRAND_BG = 'linear-gradient(135deg,#FF2D55 0%,#FF4E2A 60%,#FF6035 100%)'
const INTERVAL  = 5000

export function BannerStrip({ placement = 'home', className = '' }) {
  const [banners, setBanners] = useState([])
  const [current, setCurrent] = useState(0)
  const [ready,   setReady]   = useState(false)
  const [paused,  setPaused]  = useState(false)
  const timerRef              = useRef(null)

  useEffect(() => {
    getBanners(placement).then(data => {
      setBanners(data || [])
      setReady(true)
    })
  }, [placement])

  const go   = useCallback((i) => setCurrent(i), [])
  const prev = useCallback(() => setCurrent(c => (c - 1 + banners.length) % banners.length), [banners.length])
  const next = useCallback(() => setCurrent(c => (c + 1) % banners.length), [banners.length])

  useEffect(() => {
    clearInterval(timerRef.current)
    if (!ready || banners.length < 2 || paused) return
    timerRef.current = setInterval(next, INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [ready, banners.length, paused, next])

  if (!ready || banners.length === 0) return null

  const active = banners[current]
  const isExt  = (url) => url?.startsWith('http')

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl shadow-2xl ${className}`}
      style={{ height: 'clamp(200px, 36vw, 460px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slides ─────────────────────────────────────────────────────────── */}
      {banners.map((b, i) => (
        <div
          key={b.id}
          aria-hidden={i !== current}
          className="absolute inset-0"
          style={{
            opacity:    i === current ? 1 : 0,
            transition: 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)',
            zIndex:     i === current ? 1 : 0,
          }}
        >
          {/* Background image with Ken Burns zoom */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:    b.image_url ? `url(${b.image_url})` : BRAND_BG,
              backgroundSize:     'cover',
              backgroundPosition: 'center',
              animation:          i === current ? 'kb-zoom 7s ease-in-out forwards' : 'none',
              transform:          i !== current ? 'scale(1.07)' : undefined,
            }}
          />
          {/* Left-to-right dark gradient */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg,rgba(0,0,0,0.80) 0%,rgba(0,0,0,0.45) 52%,rgba(0,0,0,0.08) 100%)' }}
          />
          {/* Bottom vignette */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(0deg,rgba(0,0,0,0.55) 0%,transparent 55%)' }}
          />
        </div>
      ))}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end px-6 py-6 md:px-12 md:py-10 lg:px-16 lg:py-12">
        <div className="max-w-lg">
          {/* Sponsored pill */}
          <span className="inline-block mb-3 px-2.5 py-[3px] rounded-full border border-white/25 bg-black/25 backdrop-blur-sm text-[9px] font-black uppercase tracking-[0.15em] text-white/65">
            Sponsored
          </span>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl md:text-[2.1rem] lg:text-[2.6rem] font-black text-white leading-tight drop-shadow-md mb-2">
            {active?.title}
          </h2>

          {/* Subtitle */}
          {active?.subtitle && (
            <p className="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed mb-5 max-w-sm">
              {active.subtitle}
            </p>
          )}

          {/* CTA button */}
          {active?.cta_text && active?.cta_link && (
            <Link
              href={active.cta_link}
              target={isExt(active.cta_link) ? '_blank' : '_self'}
              rel={isExt(active.cta_link) ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center gap-2 px-5 py-2.5 md:px-7 md:py-3 rounded-2xl bg-white text-[#FF2D55] text-xs md:text-sm font-black shadow-xl hover:scale-[1.04] hover:shadow-2xl transition-all duration-150"
            >
              {active.cta_text}
              {isExt(active.cta_link) && <ExternalLink size={11} />}
            </Link>
          )}
        </div>

        {/* ── Dot indicators ── */}
        {banners.length > 1 && (
          <div className="absolute bottom-5 right-5 md:right-10 lg:right-16 flex items-center gap-1.5 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Slide ${i + 1}`}
                style={{
                  padding:      0,
                  border:       'none',
                  cursor:       'pointer',
                  height:       6,
                  width:        i === current ? 24 : 6,
                  borderRadius: 3,
                  background:   i === current ? '#ffffff' : 'rgba(255,255,255,0.32)',
                  transition:   'all 0.35s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Arrow buttons ───────────────────────────────────────────────────── */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center text-white bg-black/28 hover:bg-black/55 border border-white/20 backdrop-blur-sm transition-all duration-150 hover:scale-110"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center text-white bg-black/28 hover:bg-black/55 border border-white/20 backdrop-blur-sm transition-all duration-150 hover:scale-110"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      {banners.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20">
          <div
            key={`pb-${current}`}
            style={{
              height:    '100%',
              width:     '0%',
              background: 'rgba(255,255,255,0.55)',
              animation:  paused ? 'none' : `banner-fill ${INTERVAL}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* ── CSS Keyframes ───────────────────────────────────────────────────── */}
      <style>{`
        @keyframes kb-zoom    { from { transform: scale(1.0) } to { transform: scale(1.07) } }
        @keyframes banner-fill { from { width: 0% }             to { width: 100% }           }
      `}</style>
    </div>
  )
}
