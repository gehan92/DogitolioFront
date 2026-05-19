'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UtensilsCrossed } from 'lucide-react'
import { signInWithGoogle, signInWithFacebook } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'

export default function AuthPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading])

  async function handleGoogle() {
    const { error } = await signInWithGoogle()
    if (error) alert(error.message)
  }

  async function handleFacebook() {
    const { error } = await signInWithFacebook()
    if (error) alert(error.message)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-surface-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UtensilsCrossed size={28} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-black text-[var(--c-text)]">Kade</h1>
          <p className="text-[var(--c-muted)] text-sm mt-1">Sign in to rate and review restaurants</p>
        </div>

        {/* Auth card */}
        <div className="card p-6 space-y-3">
          <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide text-center mb-4">
            Continue with
          </p>

          <button onClick={handleGoogle}
            className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--c-border)] rounded-xl hover:bg-surface-secondary transition-colors font-medium text-sm text-[var(--c-text)]">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button onClick={handleFacebook}
            className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--c-border)] rounded-xl hover:bg-surface-secondary transition-colors font-medium text-sm text-[var(--c-text)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--c-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-[var(--c-dim)]">coming soon</span>
            </div>
          </div>

          <button disabled
            className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--c-border)] rounded-xl opacity-40 cursor-not-allowed text-sm text-[var(--c-muted)] font-medium">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            TikTok Login
          </button>
        </div>

        <p className="text-center text-xs text-[var(--c-dim)] mt-6">
          By signing in you agree to our terms of service. You can browse all restaurants without an account.
        </p>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors">
            ← Continue browsing without login
          </a>
        </div>
      </div>
    </div>
  )
}
