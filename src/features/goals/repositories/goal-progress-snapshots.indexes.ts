import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

export async function ensureGoalProgressSnapshotIndexes(db: Db): Promise<void> {
  const snapshots = db.collection(COLLECTIONS.goalProgressSnapshots);
  await snapshots.createIndex({ goalId: 1, date: 1 }, { unique: true });
  await snapshots.createIndex({ workspaceId: 1, date: 1 });
}
