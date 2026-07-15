import type { ObjectId } from 'mongodb';

export type HabitLogStatus = 'completed' | 'skipped' | 'partial' | 'missed';
// 'missed' is reserved — no Phase 8 code path writes it (missed days are derived on read, see
// habit-schedule.ts's `resolveDayState`). Reserving the enum value now avoids a breaking union
// change if a future materialisation job ever needs to write it.

/**
 * One record per day a habit was logged, for any of the four habit types — a single collection
 * (not per-type collections, not an embedded array on Habit) because it grows daily and forever.
 * Keyed uniquely by `{habitId, date}`, where `date` is midnight UTC of the day, so logging is
 * idempotent per day.
 *
 * `status` is a denormalised convenience field, computed against the habit's CURRENT target/
 * checklist at write time — raising a numeric target later does not retroactively re-flag old
 * satisfied days as unsatisfied. Accepted as a rare edge case.
 */
export interface HabitLog {
  _id: ObjectId;
  workspaceId: ObjectId;
  habitId: ObjectId;
  userId: ObjectId;
  date: Date;
  status: HabitLogStatus;
  /** numeric/duration: today's logged quantity (minutes for duration). Null for boolean/checklist. */
  value: number | null;
  /** checklist: which `HabitChecklistItem.id`s are checked today. Null for other types. */
  checkedItemIds: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}
