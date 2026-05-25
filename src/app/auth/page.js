'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithGoogle, signInWithFacebook, signInWithEmail, signUpWithEmail } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function AuthPage() {
  return (
    <Suspense>
      <AuthInner />
    </Suspense>
  )
}

function AuthInner() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tab,       setTab]       = useState('signin')
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  useEffect(() => {
    if (!loading && user) router.replace(isAdmin ? '/admin' : '/')
  }, [user, loading, isAdmin])

  // Show error passed from auth callback (e.g. expired magic link)
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) setError(urlError)
  }, [searchParams])

  function reset() { setError(''); setSuccess('') }

  async function handleGoogle() {
    reset()
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  async function handleFacebook() {
    reset()
    const { error } = await signInWithFacebook()
    if (error) setError(error.message)
  }

  async function handleEmailAuth(e) {
    e.preventDefault()
    reset()
    if (!email || !password) return setError('Please fill in all fields.')
    if (tab === 'signup' && !name.trim()) return setError('Please enter your name.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setBusy(true)
    try {
      if (tab === 'signin') {
        const { error } = await signInWithEmail(email, password)
        if (error) setError(error.message)
      } else {
        const { error } = await signUpWithEmail(email, password, name.trim())
        if (error) {
          const msg = error.message?.toLowerCase() || ''
          if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
            setError('An account with this email already exists. Please sign in instead.')
            setTab('signin')
          } else {
            setError(error.message)
          }
        } else {
          setSuccess('Account created! Check your email to confirm, then sign in.')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,#fff5f7 0%,#f9f9f9 100%)' }}>

      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#FF2D55 0%,#FF6035 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10">
          <img src="/digtolio_logo.jpg" alt="Digitolio" className="w-12 h-12 rounded-2xl mb-3" />
          <span className="text-white font-black text-2xl tracking-tight">Digitolio</span>
        </div>
        <div className="relative z-10 space-y-7">
          {["Browse menus from every restaurant","See real prices before you go","Read & write trusted reviews"].map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={14} className="text-white" />
              </div>
              <p className="text-white/90 text-sm font-medium leading-snug">{t}</p>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-white/50 text-xs">Sri Lanka&apos;s food discovery platform</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/digtolio_logo.jpg" alt="Digitolio" className="w-14 h-14 mx-auto rounded-2xl mb-3" />
            <h1 className="font-black text-2xl" style={{ background: 'linear-gradient(90deg,#FF2D55,#FF6035)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Digitolio</h1>
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-1">
            {tab === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-gray-400 text-sm mb-7">
            {tab === 'signin' ? "Sign in to rate and review food places." : "Join to discover menus across Sri Lanka."}
          </p>

          {/* Tab switcher */}
          <div className="flex p-1 rounded-xl mb-6" style={{ background: '#f3f4f6' }}>
            {[['signin','Sign In'],['signup','Sign Up']].map(([key, label]) => (
              <button key={key} onClick={() => { setTab(key); reset() }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-150 ${
                  tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 mb-5">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-green-50 border border-green-100 mb-5">
              <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {/* Email / Password form */}
          <form onSubmit={handleEmailAuth} className="space-y-3 mb-5">
            {tab === 'signup' && (
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Full name" value={name}
                  onChange={e => setName(e.target.value)} autoComplete="name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/15 transition-all"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/15 transition-all"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/15 transition-all"
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={busy}
              className="w-full py-3 rounded-xl text-white text-sm font-black transition-all duration-150 hover:opacity-90 active:scale-[.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)', boxShadow: '0 4px 16px rgba(255,45,85,.30)' }}>
              {busy ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400 font-medium">or continue with</span>
            </div>
          </div>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleGoogle}
              className="flex items-center justify-center gap-2.5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button onClick={handleFacebook}
              className="flex items-center justify-center gap-2.5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By continuing you agree to our terms of service.
          </p>
          <div className="text-center mt-3">
            <a href="/" className="text-sm font-semibold text-[#FF2D55] hover:underline">
              ← Browse without signing in
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
