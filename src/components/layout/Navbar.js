'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Search, UtensilsCrossed, User, LogIn, LayoutDashboard, Info, Phone, ChevronDown, Building2, Palette, Moon, Sun, Crown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { THEMES } from '@/lib/themes'
import { Avatar, ThemePicker } from '@/components/ui'
import clsx from 'clsx'

const navLinks = [
  { href: '/',            label: 'Home',    icon: Home },
  { href: '/restaurants', label: 'Places',  icon: UtensilsCrossed },
  { href: '/search',      label: 'Search',  icon: Search },
  { href: '/about',       label: 'About',   icon: Info },
  { href: '/contact',     label: 'Contact', icon: Phone },
]

export default function Navbar() {
  const { user, profile, isAdmin, isOwner, isSuperuser, loading, signOut } = useAuth()
  const { activeTheme, siteDefault, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)

  // Simple dark/light toggle for normal users
  function toggleDark() {
    if (activeTheme.dark) {
      const siteThemeIsDark = THEMES[siteDefault]?.dark
      setTheme(siteThemeIsDark ? 'warm' : null)
    } else {
      setTheme('midnight')
    }
  }

  async function handleSignOut() {
    await signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* ── TOP NAV */}
      <header className="sticky top-0 z-40" style={{ background: 'var(--c-surface)' }}>
        {/* 2px brand accent line */}
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,var(--c-brand) 0%,var(--c-brand-dk) 100%)' }} />

        <div className="border-b" style={{ borderColor: 'var(--c-border)', boxShadow: '0 1px 16px rgba(0,0,0,.05)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-6">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <img
                src="/logo.svg"
                alt="Digitolio"
                className="w-8 h-8 rounded-xl transition-transform duration-200 group-hover:scale-105"
              />
              <span
                className="text-[17px] font-extrabold tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span style={{
                  background: 'linear-gradient(135deg,var(--c-brand),var(--c-brand-dk))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Digi</span>
                <span style={{ color: 'var(--c-text)' }}>tolio</span>
              </span>
            </Link>

            {/* Desktop nav — centred */}
            <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
              {navLinks.map(({ href, label }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className="relative px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-150 select-none active:scale-[0.97]"
                    style={{
                      color: active ? 'var(--c-brand)' : 'var(--c-muted)',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--c-text)'; e.currentTarget.style.background = 'var(--c-surface2)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--c-muted)'; e.currentTarget.style.background = '' } }}
                  >
                    {label}
                    {active && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--c-brand)' }} />
                    )}
                  </Link>
                )
              })}
              {isSuperuser && (
                <Link
                  href="/superadmin"
                  className="relative px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 border border-violet-200"
                  style={{ color: '#7c3aed', background: pathname.startsWith('/superadmin') ? '#f5f3ff' : '' }}
                >
                  <Crown size={13} />
                  Super Admin
                </Link>
              )}
              {isAdmin && !isSuperuser && (
                <Link
                  href="/admin"
                  className="relative px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 border border-amber-200"
                  style={{ color: '#d97706', background: pathname.startsWith('/admin') ? '#fffbeb' : '' }}
                >
                  <LayoutDashboard size={13} />
                  Admin
                </Link>
              )}
              {isOwner && (
                <Link
                  href="/owner"
                  className="relative px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 border border-blue-200"
                  style={{ color: '#2563eb', background: pathname.startsWith('/owner') ? '#eff6ff' : '' }}
                >
                  <Building2 size={13} />
                  My Dashboard
                </Link>
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">

              {/* ── Theme controls */}
              {isAdmin ? (
                <div className="relative">
                  <button
                    onClick={() => { setThemeOpen(v => !v); setMenuOpen(false) }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
                    style={{
                      color:      themeOpen ? 'var(--c-brand)'    : 'var(--c-muted)',
                      background: themeOpen ? 'var(--c-brand-lt)' : '',
                    }}
                    title="Change theme" aria-label="Change theme"
                  >
                    <Palette size={17} />
                  </button>
                  {themeOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setThemeOpen(false)} />
                      <div className="absolute right-0 top-[calc(100%+8px)] z-20">
                        <ThemePicker onClose={() => setThemeOpen(false)} />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={toggleDark}
                  aria-label={activeTheme.dark ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="relative flex items-center gap-1.5 h-8 pl-1 pr-3 rounded-full border transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface2)' }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shrink-0"
                    style={{
                      background: activeTheme.dark
                        ? 'linear-gradient(135deg,#6366f1,#818cf8)'
                        : 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                    }}
                  >
                    {activeTheme.dark ? <Sun size={12} className="text-white" /> : <Moon size={12} className="text-white" />}
                  </span>
                  <span className="text-[11px] font-semibold hidden sm:block" style={{ color: 'var(--c-muted)' }}>
                    {activeTheme.dark ? 'Light' : 'Dark'}
                  </span>
                </button>
              )}

              {loading ? (
                <div className="w-8 h-8 skeleton rounded-full" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl transition-colors duration-150"
                    style={{ background: menuOpen ? 'var(--c-surface2)' : '' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface2)' }}
                    onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = '' }}
                  >
                    <Avatar src={profile?.avatar_url} name={profile?.name || user.email} size={30} />
                    <span className="hidden md:block text-[13px] font-semibold max-w-[100px] truncate" style={{ color: 'var(--c-text)' }}>
                      {profile?.name || 'Me'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={clsx('transition-transform duration-200', menuOpen && 'rotate-180')}
                      style={{ color: 'var(--c-dim)' }}
                    />
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div
                        className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 rounded-2xl p-1.5 animate-fade-in"
                        style={{
                          background: 'var(--c-surface)',
                          border:     '1px solid var(--c-border)',
                          boxShadow:  '0 8px 40px rgba(0,0,0,.14)',
                        }}
                      >
                        <div className="px-3 py-2.5 mb-1 border-b" style={{ borderColor: 'var(--c-border)' }}>
                          <p className="text-[13px] font-bold truncate" style={{ color: 'var(--c-text)' }}>{profile?.name || 'User'}</p>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--c-dim)' }}>{user.email}</p>
                        </div>
                        <Link href="/profile" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150"
                          style={{ color: 'var(--c-text)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface2)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '' }}
                        >
                          <User size={14} style={{ color: 'var(--c-dim)' }} className="shrink-0" /> My Profile
                        </Link>
                        {isSuperuser && (
                          <Link href="/superadmin" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-violet-700 hover:bg-violet-50 transition-colors duration-150">
                            <Crown size={14} className="shrink-0" /> Super Admin
                          </Link>
                        )}
                        {isAdmin && !isSuperuser && (
                          <Link href="/admin" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-amber-700 hover:bg-amber-50 transition-colors duration-150">
                            <LayoutDashboard size={14} className="shrink-0" /> Admin Dashboard
                          </Link>
                        )}
                        {isOwner && (
                          <Link href="/owner" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-blue-700 hover:bg-blue-50 transition-colors duration-150">
                            <Building2 size={14} className="shrink-0" /> My Dashboard
                          </Link>
                        )}
                        <div className="my-1 border-t" style={{ borderColor: 'var(--c-border)' }} />
                        <button onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors duration-150">
                          <LogIn size={14} className="rotate-180 shrink-0" /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="inline-flex items-center px-5 py-2 text-[13px] font-bold text-white rounded-xl transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg,var(--c-brand),var(--c-brand-dk))',
                    boxShadow:  '0 2px 12px color-mix(in srgb,var(--c-brand) 40%,transparent)',
                  }}
                >
                  Sign In
                </Link>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ── MOBILE BOTTOM NAV */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t safe-bottom"
        style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
      >
        <div className="flex items-center justify-around px-1 pt-1 pb-0.5">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5"
              >
                <span
                  className="w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
                  style={{ background: active ? 'color-mix(in srgb,var(--c-brand) 12%,transparent)' : '' }}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? 'var(--c-brand)' : 'var(--c-dim)' }}
                  />
                </span>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: active ? 'var(--c-brand)' : 'var(--c-dim)' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
          {user ? (
            <>
              {isOwner && (
                <Link href="/owner" className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5">
                  <span className="w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
                    style={{ background: pathname.startsWith('/owner') ? '#dbeafe' : '' }}>
                    <Building2
                      size={20}
                      strokeWidth={pathname.startsWith('/owner') ? 2.5 : 1.8}
                      style={{ color: pathname.startsWith('/owner') ? '#2563eb' : 'var(--c-dim)' }}
                    />
                  </span>
                  <span className="text-[10px] font-semibold leading-none"
                    style={{ color: pathname.startsWith('/owner') ? '#2563eb' : 'var(--c-dim)' }}>Dashboard</span>
                </Link>
              )}
              <Link href="/profile" className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5">
                <span
                  className="w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
                  style={{ background: pathname === '/profile' ? 'color-mix(in srgb,var(--c-brand) 12%,transparent)' : '' }}
                >
                  <User
                    size={20}
                    strokeWidth={pathname === '/profile' ? 2.5 : 1.8}
                    style={{ color: pathname === '/profile' ? 'var(--c-brand)' : 'var(--c-dim)' }}
                  />
                </span>
                <span className="text-[10px] font-semibold leading-none"
                  style={{ color: pathname === '/profile' ? 'var(--c-brand)' : 'var(--c-dim)' }}>Me</span>
              </Link>
            </>
          ) : (
            <Link href="/auth" className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5">
              <span className="w-10 h-8 flex items-center justify-center rounded-xl">
                <LogIn size={20} strokeWidth={1.8} style={{ color: 'var(--c-dim)' }} />
              </span>
              <span className="text-[10px] font-semibold leading-none" style={{ color: 'var(--c-dim)' }}>Sign In</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}
