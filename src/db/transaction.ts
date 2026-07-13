import 'server-only';
import type { ClientSession } from 'mongodb';
import { getClient } from '@/db/client';

/**
 * Run `fn` inside a MongoDB multi-document transaction, committing on success and aborting on any
 * thrown error. Used where two collections must stay consistent — e.g. creating a workspace plus
 * its owner membership, or (later) stopping a timer while incrementing an activity's total.
 *
 * CAVEAT: multi-document transactions require a replica set. A standalone `mongod` (a common local
 * dev setup) throws `IllegalOperation`/"Transaction numbers are only allowed on a replica set".
 * Run local dev against a single-node replica set, or MongoDB Atlas (a replica set by default).
 * Tests use MongoMemoryReplSet for the same reason.
 */
export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const client = await getClient();
  const session = client.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    // `withTransaction` only resolves after the callback ran and committed, so `result` is set.
    return result!;
  } finally {
    await session.endSession();
  }
}
