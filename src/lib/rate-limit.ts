import 'server-only';
import { getRateLimitAttemptsCollection } from '@/db/client';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

// Simple fixed-window counter backed by Mongo (no Redis dependency in this project). One atomic
// upsert per call: starts a fresh window on first attempt or once the previous window has aged
// out, otherwise increments the existing counter. The TTL index on `expiresAt` (db/client.ts)
// garbage-collects old windows automatically.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const attempts = await getRateLimitAttemptsCollection();
  const now = new Date();

  const existing = await attempts.findOne({ key });
  const windowExpired = !existing || now.getTime() - existing.windowStart.getTime() >= windowMs;

  if (windowExpired) {
    const windowStart = now;
    const expiresAt = new Date(now.getTime() + windowMs);
    await attempts.updateOne(
      { key },
      { $set: { key, count: 1, windowStart, expiresAt } },
      { upsert: true }
    );
    return { allowed: true, remaining: limit - 1, retryAfterMs: windowMs };
  }

  const updated = await attempts.findOneAndUpdate(
    { key },
    { $inc: { count: 1 } },
    { returnDocument: 'after' }
  );
  const count = updated?.count ?? limit + 1;
  const retryAfterMs = Math.max(
    0,
    (existing.windowStart.getTime() + windowMs) - now.getTime()
  );

  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterMs };
}
