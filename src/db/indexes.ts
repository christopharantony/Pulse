import 'server-only';
import { ensureIndexes as ensureAuthIndexes, getDb } from '@/db/client';
import { ensureWorkspaceIndexes } from '@/features/workspace/repositories/workspace.indexes';
import { ensureTagIndexes } from '@/features/tags/repositories/tags.indexes';
import { ensureProjectIndexes } from '@/features/projects/repositories/projects.indexes';
import { ensureTaskIndexes } from '@/features/tasks/repositories/tasks.indexes';
import { ensureActivityIndexes } from '@/features/activity/repositories/activity.indexes';
import { ensureTimeSessionIndexes } from '@/features/time-tracking/repositories/time-session.indexes';
import { ensureHabitIndexes } from '@/features/habits/repositories/habits.indexes';
import { ensureGoalIndexes } from '@/features/goals/repositories/goals.indexes';
import { ensureMilestoneIndexes } from '@/features/goals/repositories/milestones.indexes';
import { ensureGoalHabitLinkIndexes } from '@/features/goals/repositories/goal-habit-links.indexes';
import { ensureGoalActivityIndexes } from '@/features/goals/repositories/goal-activity.indexes';
import { ensureGoalProgressSnapshotIndexes } from '@/features/goals/repositories/goal-progress-snapshots.indexes';
import { ensureCalendarIndexes } from '@/features/calendar/repositories/calendar.indexes';
import { ensureNoteIndexes } from '@/features/notes/repositories/notes.indexes';
import { ensureNotificationIndexes } from '@/features/notifications/repositories/notifications.indexes';
import { ensureAnalyticsIndexes } from '@/features/analytics/repositories/analytics.indexes';

/**
 * Composes index creation across every domain into one idempotent entry point, invoked once on
 * server startup from src/instrumentation.ts. `createIndex` is a no-op when an index with the same
 * spec already exists, so this is safe to run on every boot.
 *
 * Each domain owns its own `ensure<Domain>Indexes(db)` function (co-located with its repository);
 * this file is the single place they are wired together. New domains register below.
 */
export async function ensureAllIndexes(): Promise<void> {
  // Identity & auth collections (pre-existing — defined in src/db/client.ts).
  await ensureAuthIndexes();

  const db = await getDb();
  await ensureWorkspaceIndexes(db);
  await ensureTagIndexes(db);
  await ensureProjectIndexes(db);
  await ensureTaskIndexes(db);
  await ensureActivityIndexes(db);
  await ensureTimeSessionIndexes(db);
  await ensureHabitIndexes(db);
  await ensureGoalIndexes(db);
  await ensureMilestoneIndexes(db);
  await ensureGoalHabitLinkIndexes(db);
  await ensureGoalActivityIndexes(db);
  await ensureGoalProgressSnapshotIndexes(db);
  await ensureCalendarIndexes(db);
  await ensureNoteIndexes(db);
  await ensureNotificationIndexes(db);
  await ensureAnalyticsIndexes(db);
}
