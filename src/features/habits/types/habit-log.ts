import type { ObjectId } from 'mongodb';

export type HabitLogStatus = 'completed' | 'skipped';

/**
 * One record per day a habit was completed or skipped. A separate collection (not an embedded
 * array on Habit) because it grows daily and forever. Keyed uniquely by `{habitId, date}`, where
 * `date` is midnight UTC of the day, so logging is idempotent per day.
 */
export interface HabitLog {
  _id: ObjectId;
  workspaceId: ObjectId;
  habitId: ObjectId;
  userId: ObjectId;
  date: Date;
  status: HabitLogStatus;
  createdAt: Date;
  updatedAt: Date;
}
