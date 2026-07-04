'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Something went wrong</h1>
          <p style={{ color: '#666', maxWidth: 420 }}>
            We&apos;ve been notified and are looking into it. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: '10px 20px', borderRadius: 12, background: '#FF2D55', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
