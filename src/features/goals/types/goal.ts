import type { ObjectId } from 'mongodb';

export type GoalStatus = 'active' | 'completed' | 'archived';

/**
 * A longer-horizon outcome that Tasks/Habits/time can roll up into. Mostly a view over other
 * domains plus its own target/progress. Loosely references contributing work via `tagIds` rather
 * than hard foreign keys, matching how goals span many entities.
 */
export interface Goal {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  description: string | null;
  status: GoalStatus;
  targetDate: Date | null;
  /** Optional numeric target (e.g. "read 12 books"); null for a purely qualitative goal. */
  targetValue: number | null;
  currentValue: number;
  tagIds: ObjectId[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
