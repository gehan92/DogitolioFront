import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  let res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll:  ()        => req.cookies.getAll(),
        setAll: (cookies)  => {
          cookies.forEach(({ name, value, options }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: { headers: req.headers } })
          cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    }
  )

  // Refresh session cookie on every request so it never expires silently
  await supabase.auth.getUser()

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
