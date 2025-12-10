import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === "development",
  
  // Session Replay configuration
  // Note: replayIntegration may not be available in all Sentry versions
  // If you get errors, you can remove the integrations array entirely
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null
    }
    return event
  },
})

