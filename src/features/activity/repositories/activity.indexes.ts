import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/**
 * Activity indexes (architecture doc Section 9). The uniqueness constraint that powers
 * `findOrCreateBySource` is partial — it applies only to linked activities (those with a real
 * `sourceId`), so that many standalone quick-focus/custom activities (all with `sourceId: null`)
 * can coexist without colliding.
 */
export async function ensureActivityIndexes(db: Db): Promise<void> {
  const activities = db.collection(COLLECTIONS.activities);
  await activities.createIndex(
    { workspaceId: 1, sourceType: 1, sourceId: 1 },
    { unique: true, partialFilterExpression: { sourceId: { $type: 'objectId' } } }
  );
  // "Recently tracked" quick-start list.
  await activities.createIndex({ workspaceId: 1, userId: 1, lastTrackedAt: -1 });
}
