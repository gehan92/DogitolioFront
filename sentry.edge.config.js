// This file configures the initialization of Sentry for edge runtime routes.
// Sentry.init() is a safe no-op when NEXT_PUBLIC_SENTRY_DSN is unset.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
})
