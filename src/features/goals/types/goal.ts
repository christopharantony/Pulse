import type { ObjectId } from 'mongodb';

export type GoalStatus = 'not_started' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalCategory =
  | 'personal'
  | 'career'
  | 'health'
  | 'finance'
  | 'learning'
  | 'business'
  | 'relationships'
  | 'custom';
export type GoalProgressMethod = 'manual' | 'milestone' | 'task' | 'habit' | 'mixed';
/** Reserved seam for future team collaboration; unenforced while workspaces are personal-only. */
export type GoalVisibility = 'private' | 'workspace';

/**
 * A longer-horizon outcome that Tasks/Habits/time can roll up into. `currentValue` is a
 * denormalised cache recomputed by `goal-progress.service.ts` at defined trigger points (milestone
 * completion, task/habit change, manual edit) — never queried fresh on every list render, matching
 * how `Habit.currentStreak` is cached rather than derived on read.
 */
export interface Goal {
  _id: ObjectId;
  workspaceId: ObjectId;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: GoalCategory;
  /** Freeform label shown when `category === 'custom'`; null otherwise. */
  customCategoryLabel: string | null;
  status: GoalStatus;
  priority: GoalPriority;
  progressMethod: GoalProgressMethod;
  startDate: Date | null;
  targetDate: Date | null;
  /** Set when `status` transitions to `'completed'`; cleared on reactivation. */
  completionDate: Date | null;
  /** Numeric target for the manual/habit-value progress methods (e.g. "24" books); null otherwise. */
  targetValue: number | null;
  /** Manual method's live value; also written by the habit-based method's contribution sum. */
  currentValue: number;
  visibility: GoalVisibility;
  tagIds: ObjectId[];
  createdBy: ObjectId;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
