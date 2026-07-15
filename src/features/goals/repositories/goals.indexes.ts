import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Goal indexes (architecture doc Section 9, expanded for Phase 9). */
export async function ensureGoalIndexes(db: Db): Promise<void> {
  const goals = db.collection(COLLECTIONS.goals);
  await goals.createIndex({ workspaceId: 1, status: 1, priority: 1 });
  await goals.createIndex({ workspaceId: 1, targetDate: 1 });
  await goals.createIndex({ workspaceId: 1, category: 1 });
  await goals.createIndex({ workspaceId: 1, deletedAt: 1 });
  await goals.createIndex({ workspaceId: 1, archivedAt: 1 });
  await goals.createIndex({ title: 'text', description: 'text' });
}
