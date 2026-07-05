import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Singleton browser client — uses cookies for session persistence (works with middleware refresh)
let _client = null
function getBrowserClient() {
  if (!_client) _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  return _client
}

export const supabase = typeof window !== 'undefined'
  ? getBrowserClient()
  : {
      auth: {
        getSession:        async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: ()      => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut:           async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
      }),
    }

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
    options: {
      data: { full_name: name },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
  })
}

export async function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword })
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
