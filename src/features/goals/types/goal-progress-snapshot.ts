import type { ObjectId } from 'mongodb';
import type { GoalProgressMethod } from '@/features/goals/types/goal';

/**
 * One precomputed row per goal per day, written nightly by `goal-rollup.service.ts`. Never a
 * source of truth — always derived from the live `Goal` document, rebuildable at any time. Feeds
 * the Monthly/Yearly Goal Progress charts and "Goals at Risk" detection (no movement in N days)
 * without recomputing a year of history on every page load. Mirrors `AnalyticsDailyRollup`.
 */
export interface GoalProgressSnapshot {
  _id: ObjectId;
  workspaceId: ObjectId;
  goalId: ObjectId;
  date: Date;
  progressPct: number;
  currentValue: number;
  method: GoalProgressMethod;
  createdAt: Date;
  updatedAt: Date;
}
