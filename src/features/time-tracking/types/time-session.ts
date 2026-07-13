import type { ObjectId } from 'mongodb';

/**
 * An append-only record of one timed interval against an Activity. Highest write volume in the
 * system, so it is a separate collection from `activities` (never an embedded array) and is not
 * soft-deletable. References an Activity only — never a Task/Habit/Goal — which is what keeps the
 * timer engine decoupled from those domains.
 *
 * `endedAt: null` marks the single in-progress session for a user (enforced by a partial unique
 * index on `userId`). `durationSeconds` is computed once, at stop time, not on every read.
 */
export interface TimeSession {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  activityId: ObjectId;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}
