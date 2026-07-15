import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

export async function ensureMilestoneIndexes(db: Db): Promise<void> {
  const milestones = db.collection(COLLECTIONS.milestones);
  await milestones.createIndex({ workspaceId: 1, goalId: 1, order: 1 });
  await milestones.createIndex({ workspaceId: 1, dueDate: 1 });
  await milestones.createIndex({ goalId: 1, status: 1 });
}
