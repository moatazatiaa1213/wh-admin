import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env automatically

const DEFAULT_TTL = 60 // seconds

/**
 * Read a value from Redis. Returns null on cache miss OR on Redis error
 * (graceful degradation — callers fall through to the live data source).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key)
  } catch (e) {
    console.warn('[cache] cacheGet failed', { key, error: String(e), ts: Date.now() })
    return null
  }
}

/**
 * Write a value to Redis with a TTL. Failures are logged but not thrown —
 * a failed cache write is non-fatal; the caller already has the live data.
 */
export async function cacheSet<T>(key: string, value: T, ttl = DEFAULT_TTL): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttl })
  } catch (e) {
    console.warn('[cache] cacheSet failed', { key, error: String(e), ts: Date.now() })
  }
}

/**
 * Delete one or more keys from Redis. Used by mutation functions immediately
 * after a successful write so the next read fetches fresh data.
 */
export async function cacheInvalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch (e) {
    console.warn('[cache] cacheInvalidate failed', { keys, error: String(e), ts: Date.now() })
  }
}
