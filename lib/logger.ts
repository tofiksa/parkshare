/**
 * Centralized logging utility
 * 
 * Replaces console.log/error/warn with a proper logging system
 * that integrates with Sentry in production.
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // In production, only log errors and warnings unless explicitly enabled
    if (process.env.NODE_ENV === "production") {
      return level === "error" || level === "warn" || process.env.ENABLE_DEBUG_LOGS === "true"
    }
    // In development, log everything
    return true
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ""
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return
    
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("debug", message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return
    console.info(this.formatMessage("info", message, context))
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog("warn")) return
    console.warn(this.formatMessage("warn", message, context))
    
    // Send warnings to Sentry in production
    if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
      try {
        // Dynamic import to avoid issues if Sentry is not configured
        import("@sentry/nextjs").then((Sentry) => {
          Sentry.captureMessage(message, {
            level: "warning",
            extra: context,
          })
        }).catch(() => {
          // Sentry not available, ignore
        })
      } catch {
        // Sentry not available, ignore
      }
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog("error")) return
    
    const errorObj = error instanceof Error ? error : new Error(String(error))
    console.error(this.formatMessage("error", message, { ...context, error: errorObj.message }))
    
    // Send errors to Sentry in production
    if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // Dynamic import to avoid issues if Sentry is not configured
        import("@sentry/nextjs").then((Sentry) => {
          Sentry.captureException(errorObj, {
            level: "error",
            tags: context,
            extra: {
              message,
              ...context,
            },
          })
        }).catch(() => {
          // Sentry not available, ignore
        })
      } catch {
        // Sentry not available, ignore
      }
    }
  }
}

export const logger = new Logger()

