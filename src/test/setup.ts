import { afterAll, beforeEach } from 'vitest';
import type { MongoMemoryReplSet } from 'mongodb-memory-server';

/**
 * Global test setup. Runs before test files and:
 *  1. Populates the server env vars that env.server.ts validates eagerly at import time — this MUST
 *     happen before any '@/...' module is imported, hence the dynamic imports further down.
 *  2. Boots a single shared in-memory replica set (guarded on globalThis so it survives across
 *     files), pointing MONGODB_URI at it.
 *  3. Creates all indexes, then clears every collection before each test for isolation.
 */

process.env.DATABASE_NAME = 'pulse_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-at-least-32-characters';
process.env.APP_URL ??= 'http://localhost:3000';
process.env.RESEND_API_KEY ??= 'test-resend-key';
process.env.EMAIL_FROM ??= 'test@pulse.test';

const globalRef = globalThis as typeof globalThis & {
  __pulseMongo__?: MongoMemoryReplSet;
};

if (!globalRef.__pulseMongo__) {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  globalRef.__pulseMongo__ = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
}
process.env.MONGODB_URI = globalRef.__pulseMongo__.getUri();

// Imported dynamically so the env vars above are in place before env.server.ts is evaluated.
const { ensureAllIndexes } = await import('@/db/indexes');
const { getDb, closeConnection } = await import('@/db/client');
const { COLLECTIONS } = await import('@/db/collections');

await ensureAllIndexes();

beforeEach(async () => {
  const db = await getDb();
  await Promise.all(
    Object.values(COLLECTIONS).map((name) => db.collection(name).deleteMany({}))
  );
});

afterAll(async () => {
  await closeConnection();
});
