import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

export async function ensureGoalHabitLinkIndexes(db: Db): Promise<void> {
  const links = db.collection(COLLECTIONS.goalHabitLinks);
  await links.createIndex({ workspaceId: 1, goalId: 1, habitId: 1 }, { unique: true });
  await links.createIndex({ workspaceId: 1, habitId: 1 });
}
