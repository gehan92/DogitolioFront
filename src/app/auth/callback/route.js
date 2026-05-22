import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code  = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')

  // Auth error (e.g. expired magic link) — send to /auth with a message
  if (error) {
    const msg = errorCode === 'otp_expired'
      ? 'Your sign-in link has expired. Please request a new one.'
      : 'Authentication failed. Please try again.'
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(msg)}`, requestUrl.origin)
    )
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      )
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
