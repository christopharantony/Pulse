import type { ObjectId } from 'mongodb';
import type { Recurrence } from '@/schemas/schedulable.schema';

/**
 * A recurring commitment tracked by completion streaks (distinct from a Task's done/not-done).
 * `currentStreak`/`longestStreak` are a denormalised cache recomputed from `habit_logs` — never
 * trusted from client input. The logs collection is the source of truth.
 */
export interface Habit {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  description: string | null;
  color: string | null;
  recurrence: Recurrence;
  /** e.g. "3× per week"; null means simply "every scheduled day". */
  targetPerPeriod: number | null;
  currentStreak: number;
  longestStreak: number;
  createdBy: ObjectId;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
