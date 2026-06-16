import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session — keeps user logged in across page reloads
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  const needsAdmin      = pathname.startsWith('/admin')
  const needsSuperadmin = pathname.startsWith('/superadmin')

  if (needsAdmin || needsSuperadmin) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth', req.url))
    }

    // Fetch role once for both admin and superadmin checks
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (needsSuperadmin) {
      // Only superusers may access /superadmin
      if (!profile || profile.role !== 'superuser') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    } else if (needsAdmin) {
      // Admins and superusers may access /admin
      if (!profile || !['admin', 'superuser'].includes(profile.role)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
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
