import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

export async function ensureGoalActivityIndexes(db: Db): Promise<void> {
  const activity = db.collection(COLLECTIONS.goalActivity);
  await activity.createIndex({ goalId: 1, createdAt: -1 });
  await activity.createIndex({ workspaceId: 1, createdAt: -1 });
}
