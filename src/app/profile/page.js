'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Star, User } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { Avatar, Button, StarRating, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [user, loading])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading || !user) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]"><Spinner size={32} /></div>
    </>
  )

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* Profile header */}
        <div className="card p-6 mb-5">
          <div className="flex items-center gap-4">
            <Avatar src={profile?.avatar_url} name={profile?.name || user.email} size={64} />
            <div>
              <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">{profile?.name || 'User'}</h1>
              <p className="text-sm text-[var(--c-muted)]">{user.email}</p>
              {profile?.role === 'admin' && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">Admin</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/restaurants" className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <Star size={16} className="text-brand-600" />
            </div>
            <span className="text-sm font-semibold text-[var(--c-text)]">Browse restaurants</span>
          </Link>
          {profile?.role === 'admin' && (
            <Link href="/admin" className="card p-4 flex items-center gap-3 hover:border-amber-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <User size={16} className="text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-[var(--c-text)]">Admin dashboard</span>
            </Link>
          )}
        </div>

        {/* Sign out */}
        <div className="card p-4">
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 py-2 text-red-600 hover:text-red-700 font-medium text-sm transition-colors">
            <LogOut size={16} />
            Sign out
          </button>
        </div>

        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}
