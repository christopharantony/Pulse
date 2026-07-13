import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/**
 * Time-session indexes (architecture doc Section 9). The partial unique index is the load-bearing
 * one: it makes "at most one running timer per user, regardless of source" a database-enforced
 * guarantee rather than something application code must remember to check.
 */
export async function ensureTimeSessionIndexes(db: Db): Promise<void> {
  const sessions = db.collection(COLLECTIONS.timeSessions);
  // At most one running (endedAt: null) session per user.
  await sessions.createIndex(
    { userId: 1 },
    { unique: true, partialFilterExpression: { endedAt: null } }
  );
  // "Sessions for this activity" / timesheet view.
  await sessions.createIndex({ activityId: 1, startedAt: -1 });
  // A user's timesheet across all activities, date-ranged.
  await sessions.createIndex({ workspaceId: 1, userId: 1, startedAt: -1 });
}
