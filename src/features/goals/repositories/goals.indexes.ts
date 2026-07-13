import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Goal indexes (architecture doc Section 9). */
export async function ensureGoalIndexes(db: Db): Promise<void> {
  const goals = db.collection(COLLECTIONS.goals);
  await goals.createIndex({ workspaceId: 1, status: 1 });
}
