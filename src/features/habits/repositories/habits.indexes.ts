import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Habit and habit-log indexes (architecture doc Section 9). */
export async function ensureHabitIndexes(db: Db): Promise<void> {
  const habits = db.collection(COLLECTIONS.habits);
  await habits.createIndex({ workspaceId: 1, archivedAt: 1 });

  const habitLogs = db.collection(COLLECTIONS.habitLogs);
  // One log per habit per day; also the streak-calculation query.
  await habitLogs.createIndex({ habitId: 1, date: 1 }, { unique: true });
  await habitLogs.createIndex({ habitId: 1, status: 1, date: 1 });
}
