export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config.js')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config.js')
  }
}

export const onRequestError = (...args) => {
  // Lazily require so this file has no cost when Sentry isn't configured.
  const Sentry = require('@sentry/nextjs')
  return Sentry.captureRequestError(...args)
}
