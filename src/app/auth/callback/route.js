import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code  = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')

  if (error) {
    const msg = errorCode === 'otp_expired'
      ? 'Your sign-in link has expired. Please request a new one.'
      : 'Authentication failed. Please try again.'
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(msg)}`, requestUrl.origin)
    )
  }

  if (code) {
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

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      )
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
