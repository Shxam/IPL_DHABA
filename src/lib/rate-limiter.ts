import { writeAuditLog } from '@/services/audit';

interface RateLimitData {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitData>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof global !== 'undefined') {
  const globalAny = global as any;
  if (!globalAny.rateLimitCleanupInterval) {
    globalAny.rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      rateLimitMap.forEach((data, key) => {
        // Find if there's any active timestamp. If none, we can clean up the key.
        // We don't know the exact window for this key here, but cleaning up timestamps older than 1 hour is safe
        const activeTimestamps = data.timestamps.filter((ts) => now - ts < 60 * 60 * 1000);
        if (activeTimestamps.length === 0) {
          rateLimitMap.delete(key);
        } else {
          data.timestamps = activeTimestamps;
        }
      });
    }, 5 * 60 * 1000);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // in seconds
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  ipAddress: string,
  endpoint: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = rateLimitMap.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(key, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const msPassed = now - oldestTimestamp;
    const msRemaining = windowMs - msPassed;
    const retryAfter = Math.ceil(msRemaining / 1000);

    // Write rate_limit.hit to audit logs
    await writeAuditLog({
      event: 'rate_limit.hit',
      ip_address: ipAddress,
      metadata: {
        endpoint,
        key,
        limit,
        windowSeconds,
      },
    });

    return {
      allowed: false,
      retryAfter,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    retryAfter: 0,
  };
}
