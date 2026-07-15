import type { ObjectId } from 'mongodb';

export type GoalHabitContributionType = 'count' | 'value';
// 'count': each satisfied day's log = +contributionWeight units toward the goal's targetValue.
// 'value': each day's logged numeric/duration value * contributionWeight is summed toward targetValue.

/**
 * A genuine M:N join between Goal and Habit — unlike Task's simple scalar `goalId`, this needs
 * metadata (contribution weight/type) and a single habit can plausibly serve multiple goals at
 * once (e.g. "Workout" contributing to both "Lose 10kg" and "Run a marathon"). Hard-deleted on
 * unlink, mirroring `WorkspaceMember`'s hard-delete convention for membership rows — there is
 * nothing to "restore" about a severed link.
 */
export interface GoalHabitLink {
  _id: ObjectId;
  workspaceId: ObjectId;
  goalId: ObjectId;
  habitId: ObjectId;
  contributionType: GoalHabitContributionType;
  contributionWeight: number;
  createdAt: Date;
  updatedAt: Date;
}
