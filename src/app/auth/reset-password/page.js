'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, updatePassword } from '@/lib/supabase'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    // Supabase sets a PASSWORD_RECOVERY session from the URL hash automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if already in a session (in case onAuthStateChange already fired)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      const { error } = await updatePassword(password)
      if (error) setError(error.message)
      else {
        setSuccess(true)
        setTimeout(() => router.replace('/auth'), 2500)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--c-bg)' }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#FF2D55 0%,#FF6035 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10">
          <img src="/logo.png" alt="MealHere" className="w-12 h-12 rounded-2xl mb-3" />
          <span className="text-white font-black text-2xl tracking-tight">MealHere</span>
        </div>
        <div className="relative z-10">
          <p className="text-white/80 text-sm leading-relaxed">
            Choose a strong password you haven&apos;t used before. You&apos;ll be signed in automatically after resetting.
          </p>
        </div>
        <p className="relative z-10 text-white/50 text-xs">Sri Lanka&apos;s food discovery platform</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="MealHere" className="w-14 h-14 mx-auto rounded-2xl mb-3" />
            <h1 className="font-black text-2xl" style={{ background: 'linear-gradient(90deg,#FF2D55,#FF6035)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MealHere</h1>
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-1">Set new password</h2>
          <p className="text-gray-400 text-sm mb-7">Enter and confirm your new password below.</p>

          {success ? (
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                <CheckCircle2 size={26} className="text-white" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-lg">Password updated!</p>
                <p className="text-gray-400 text-sm mt-1">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-[#FF2D55] border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Verifying reset link…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 mb-5">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="New password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/15 transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/15 transition-all"
                  />
                </div>
                <button type="submit" disabled={busy}
                  className="w-full py-3 rounded-xl text-white text-sm font-black transition-all duration-150 hover:opacity-90 active:scale-[.98] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)', boxShadow: '0 4px 16px rgba(255,45,85,.30)' }}>
                  {busy ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
