import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session — keeps user logged in across page reloads
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Protect /admin routes — redirect to home if not logged in
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth', req.url))
    }

    // Check admin role in profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Redirect already-logged-in users away from /auth
  if (pathname.startsWith('/auth') && session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
