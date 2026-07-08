import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/**
 * Sliding window rate limiting implementation using Upstash Redis Sorted Sets (ZSET)
 * @param key Unique key for the rate limit target (e.g. rate_limit:otp:127.0.0.1)
 * @param limit Maximum number of requests allowed in the window
 * @param windowSeconds Duration of the rate limit window in seconds
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Rate Limit] Upstash Redis credentials missing in production.');
      return { success: false, count: limit + 1, limit };
    }

    console.warn('[Rate Limit] Upstash Redis credentials missing. Bypassing rate limit check in development.');
    return { success: true, count: 1, limit };
  }

  const now = Date.now();
  const clearBefore = now - windowSeconds * 1000;
  const memberId = `${now}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zadd(key, { score: now, member: memberId });
    pipeline.zremrangebyscore(key, 0, clearBefore);
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    const count = results[2] as number;

    return {
      success: count <= limit,
      count,
      limit,
    };
  } catch (error: any) {
    console.error('[Rate Limit] Redis operation failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
      return { success: false, count: limit + 1, limit };
    }

    return { success: true, count: 1, limit };
  }
}
