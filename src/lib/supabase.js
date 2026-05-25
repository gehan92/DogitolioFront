import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Browser-side Supabase client (lazy singleton to avoid SSR module-level errors)
let _supabase = null
export function getSupabase() {
  if (!_supabase) _supabase = createClientComponentClient()
  return _supabase
}
export const supabase = typeof window !== 'undefined'
  ? createClientComponentClient()
  : { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), signOut: async () => {} } }

// Auth helpers
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
}

export async function signInWithFacebook() {
  return supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
}

export async function signInWithEmail(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email, password, name) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
