import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Browser-side Supabase client
export const supabase = createClientComponentClient()

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

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
