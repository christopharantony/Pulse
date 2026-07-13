import type { ObjectId } from 'mongodb';

/** Precomputed per-user/day metrics. Extend as new dashboard tiles need new aggregates. */
export interface DailyMetrics {
  trackedSeconds: number;
  tasksCompleted: number;
  habitsCompleted: number;
  focusSessions: number;
  /** Tasks past due at the close of the day. Added for the dashboard's overdue tile/penalty. */
  overdueTasks?: number;
  /** The day's productivity score (0–100). Persisted so trends read O(1) from rollups. */
  productivityScore?: number;
}

/**
 * One precomputed row per user per day, written by a scheduled/incremental job that aggregates
 * time_sessions/tasks/habit_logs. NEVER a source of truth — always derived and rebuildable. The
 * dashboard reads these rollups, not the raw event data, so analytics stays fast regardless of how
 * many years of history a power user accumulates.
 */
export interface AnalyticsDailyRollup {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  date: Date;
  metrics: DailyMetrics;
  createdAt: Date;
  updatedAt: Date;
}
