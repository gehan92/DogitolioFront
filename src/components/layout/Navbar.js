'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, UtensilsCrossed, User, LogIn, LayoutDashboard, X, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Avatar, Button } from '@/components/ui'
import clsx from 'clsx'

const navLinks = [
  { href: '/',            label: 'Home',       icon: Home },
  { href: '/restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { href: '/search',      label: 'Search',      icon: Search },
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
      {/* ── TOP NAV (desktop + mobile top bar) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[var(--c-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <UtensilsCrossed size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold text-[var(--c-text)]">Kade</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-surface-secondary'
                )}>
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin"
                className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-surface-secondary'
                )}>
                Dashboard
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-8 h-8 skeleton rounded-full" />
            ) : user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface-secondary transition-colors">
                  <Avatar src={profile?.avatar_url} name={profile?.name || user.email} size={32} />
                  <span className="hidden md:block text-sm font-medium text-[var(--c-text)] max-w-[120px] truncate">
                    {profile?.name || 'Me'}
                  </span>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-12 z-20 w-52 bg-white border border-[var(--c-border)] rounded-2xl shadow-modal p-1.5 animate-fade-in">
                      <div className="px-3 py-2 border-b border-[var(--c-border)] mb-1">
                        <p className="text-sm font-semibold text-[var(--c-text)] truncate">{profile?.name || 'User'}</p>
                        <p className="text-xs text-[var(--c-muted)] truncate">{user.email}</p>
                      </div>
                      <Link href="/profile" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-surface-secondary transition-colors">
                        <User size={15} /> My Profile
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-surface-secondary transition-colors text-amber-700">
                          <LayoutDashboard size={15} /> Admin Dashboard
                        </Link>
                      )}
                      <button onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-red-50 text-red-600 transition-colors mt-1">
                        <LogIn size={15} className="rotate-180" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/auth">
                <Button size="sm" variant="primary">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── BOTTOM NAV (mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--c-border)] safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors',
                pathname === href
                  ? 'text-brand-600'
                  : 'text-[var(--c-dim)]'
              )}>
              <Icon size={20} strokeWidth={pathname === href ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
          {user ? (
            <Link href="/profile"
              className={clsx('flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors',
                pathname === '/profile' ? 'text-brand-600' : 'text-[var(--c-dim)]')}>
              <User size={20} strokeWidth={pathname === '/profile' ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">Me</span>
            </Link>
          ) : (
            <Link href="/auth"
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[var(--c-dim)]">
              <LogIn size={20} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">Sign In</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}
