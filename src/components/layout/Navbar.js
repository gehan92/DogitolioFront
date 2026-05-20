'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, UtensilsCrossed, User, LogIn, LayoutDashboard, Info, Phone, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui'
import clsx from 'clsx'

const navLinks = [
  { href: '/',            label: 'Home',    icon: Home },
  { href: '/restaurants', label: 'Places',  icon: UtensilsCrossed },
  { href: '/search',      label: 'Search',  icon: Search },
  { href: '/about',       label: 'About',   icon: Info },
  { href: '/contact',     label: 'Contact', icon: Phone },
]

export default function Navbar() {
  const { user, profile, isAdmin, loading } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    setMenuOpen(false)
  }

  return (
    <>
      {/* ── TOP NAV */}
      <header className="sticky top-0 z-40 bg-white">
        {/* 2px brand gradient accent line */}
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,#FF2D55 0%,#FF6035 100%)' }} />

        <div className="border-b border-gray-100" style={{ boxShadow: '0 1px 16px rgba(0,0,0,.05)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-6">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <img
                src="/digtolio_logo.jpg"
                alt="Digitolio"
                className="w-8 h-8 rounded-xl transition-transform duration-200 group-hover:scale-105"
              />
              <span
                className="text-[17px] font-extrabold tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span style={{
                  background: 'linear-gradient(135deg,#FF2D55,#FF6035)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Digi</span>
                <span className="text-gray-900">tolio</span>
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
                    className={clsx(
                      'relative px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-150 select-none',
                      active
                        ? 'text-[#FF2D55]'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 active:scale-[0.97]'
                    )}
                  >
                    {label}
                    {active && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF2D55]" />
                    )}
                  </Link>
                )
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={clsx(
                    'relative px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-150',
                    pathname.startsWith('/admin')
                      ? 'text-amber-600'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  Dashboard
                </Link>
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {loading ? (
                <div className="w-8 h-8 skeleton rounded-full" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-gray-50 transition-colors duration-150"
                  >
                    <Avatar src={profile?.avatar_url} name={profile?.name || user.email} size={30} />
                    <span className="hidden md:block text-[13px] font-semibold text-gray-800 max-w-[100px] truncate">
                      {profile?.name || 'Me'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={clsx('text-gray-400 transition-transform duration-200', menuOpen && 'rotate-180')}
                    />
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 bg-white border border-gray-100 rounded-2xl p-1.5 animate-fade-in"
                        style={{ boxShadow: '0 8px 40px rgba(0,0,0,.12)' }}>
                        <div className="px-3 py-2.5 mb-1 border-b border-gray-100">
                          <p className="text-[13px] font-bold text-gray-900 truncate">{profile?.name || 'User'}</p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{user.email}</p>
                        </div>
                        <Link href="/profile" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150">
                          <User size={14} className="text-gray-400 shrink-0" /> My Profile
                        </Link>
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-amber-700 hover:bg-amber-50 transition-colors duration-150">
                            <LayoutDashboard size={14} className="shrink-0" /> Admin Dashboard
                          </Link>
                        )}
                        <div className="my-1 border-t border-gray-100" />
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
                    background: 'linear-gradient(135deg,#FF2D55,#FF6035)',
                    boxShadow: '0 2px 12px rgba(255,45,85,.28)',
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-bottom">
        <div className="flex items-center justify-around px-1 pt-1 pb-0.5">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5"
              >
                <span className={clsx(
                  'w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-150',
                  active ? 'bg-[#FF2D55]/10' : ''
                )}>
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={active ? 'text-[#FF2D55]' : 'text-gray-400'}
                  />
                </span>
                <span className={clsx(
                  'text-[10px] font-semibold leading-none',
                  active ? 'text-[#FF2D55]' : 'text-gray-400'
                )}>
                  {label}
                </span>
              </Link>
            )
          })}
          {user ? (
            <Link href="/profile" className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5">
              <span className={clsx(
                'w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-150',
                pathname === '/profile' ? 'bg-[#FF2D55]/10' : ''
              )}>
                <User
                  size={20}
                  strokeWidth={pathname === '/profile' ? 2.5 : 1.8}
                  className={pathname === '/profile' ? 'text-[#FF2D55]' : 'text-gray-400'}
                />
              </span>
              <span className={clsx('text-[10px] font-semibold leading-none', pathname === '/profile' ? 'text-[#FF2D55]' : 'text-gray-400')}>Me</span>
            </Link>
          ) : (
            <Link href="/auth" className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5">
              <span className="w-10 h-8 flex items-center justify-center rounded-xl">
                <LogIn size={20} strokeWidth={1.8} className="text-gray-400" />
              </span>
              <span className="text-[10px] font-semibold leading-none text-gray-400">Sign In</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}

