import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Habit and habit-log indexes (architecture doc Section 9, extended for Phase 8). */
export async function ensureHabitIndexes(db: Db): Promise<void> {
  const habits = db.collection(COLLECTIONS.habits);
  await habits.createIndex({ workspaceId: 1, archivedAt: 1 });
  // In-app search over name/description (mirrors tasks' text index).
  await habits.createIndex({ name: 'text', description: 'text' });
  // Reserved for a future reminder-dispatch job (see docs/architecture) — unused in Phase 8, but
  // safe/cheap to create now so dispatch doesn't need an index migration when it ships.
  await habits.createIndex({ 'reminders.timeOfDay': 1 });

  const habitLogs = db.collection(COLLECTIONS.habitLogs);
  // One log per habit per day; also the single-habit streak/calendar range-read query.
  await habitLogs.createIndex({ habitId: 1, date: 1 }, { unique: true });
  await habitLogs.createIndex({ habitId: 1, status: 1, date: 1 });
  // Multi-habit month/workspace calendar & stats views — the {habitId,...} indexes above are the
  // wrong shape for "all habits in this workspace, this month."
  await habitLogs.createIndex({ workspaceId: 1, date: 1 });
}
