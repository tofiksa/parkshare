/**
 * Rate limiting utility
 * 
 * Uses Upstash Redis for distributed rate limiting in production,
 * falls back to in-memory rate limiting in development.
 */

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// In-memory rate limit store for development
const memoryStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries every minute
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of memoryStore.entries()) {
      if (value.resetTime < now) {
        memoryStore.delete(key)
      }
    }
  }, 60000)
}

async function getUpstashRateLimit(limit: number, window: number) {
  try {
    const { Ratelimit } = await import("@upstash/ratelimit")
    const { Redis } = await import("@upstash/redis")

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return null
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${window}s`),
    })
  } catch (error) {
    console.error("Failed to initialize Upstash rate limiter:", error)
    return null
  }
}

/**
 * Rate limit a request
 * 
 * @param identifier - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param limit - Maximum number of requests
 * @param window - Time window in seconds
 * @returns Rate limit result
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  window: number
): Promise<RateLimitResult> {
  // Try to use Upstash Redis if available
  const upstashRateLimit = await getUpstashRateLimit(limit, window)
  
  if (upstashRateLimit) {
    const result = await upstashRateLimit.limit(identifier)
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  }

  // Fallback to in-memory rate limiting
  const now = Date.now()
  const key = `${identifier}:${Math.floor(now / (window * 1000))}`
  const stored = memoryStore.get(key)

  if (!stored || stored.resetTime < now) {
    memoryStore.set(key, {
      count: 1,
      resetTime: now + window * 1000,
    })
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + window * 1000,
    }
  }

  if (stored.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: stored.resetTime,
    }
  }

  stored.count++
  return {
    success: true,
    limit,
    remaining: limit - stored.count,
    reset: stored.resetTime,
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }

  // Fallback (won't work in serverless, but useful for development)
  return "unknown"
}

