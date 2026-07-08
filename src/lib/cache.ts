import { redis } from './redis';

/**
 * Get data from Upstash Redis cache
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null; // Bypassed if Redis credentials are not configured
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached) {
      console.log(`[Cache] HIT for key: ${key}`);
      return cached;
    }
    console.log(`[Cache] MISS for key: ${key}`);
    return null;
  } catch (error: any) {
    console.error(`[Cache] Read error for key ${key}:`, error.message);
    return null;
  }
}

/**
 * Set data in Upstash Redis cache with an expiry
 */
export async function setCachedData<T>(key: string, data: T, expirySeconds = 300): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }

  try {
    await redis.set(key, data, { ex: expirySeconds });
    console.log(`[Cache] SET for key: ${key} (Expires in ${expirySeconds}s)`);
  } catch (error: any) {
    console.error(`[Cache] Write error for key ${key}:`, error.message);
  }
}

/**
 * Delete a cache key to invalidate it
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }

  try {
    await redis.del(key);
    console.log(`[Cache] INVALIDATED key: ${key}`);
  } catch (error: any) {
    console.error(`[Cache] Invalidation error for key ${key}:`, error.message);
  }
}
