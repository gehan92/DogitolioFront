import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type        = requestUrl.searchParams.get('type')
  const next        = requestUrl.searchParams.get('next') || '/'

  if (token_hash && type) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll:  ()       => cookieStore.getAll(),
          setAll: (toSet)   => toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const separator = next.includes('?') ? '&' : '?'
      return NextResponse.redirect(new URL(`${next}${separator}confirmed=1`, requestUrl.origin))
    }
  }

  return NextResponse.redirect(
    new URL(
      `/auth?error=${encodeURIComponent('Your confirmation link has expired or is invalid. Please sign up again or request a new link.')}`,
      requestUrl.origin
    )
  )
}
