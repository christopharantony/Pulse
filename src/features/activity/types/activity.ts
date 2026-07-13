import type { ObjectId } from 'mongodb';

/**
 * What an Activity was created from. `task`/`habit`/`goal`/`calendar_event` carry a `sourceId`
 * pointing back at the origin document; `quick_focus`/`custom` have a null `sourceId` and live
 * entirely on the Activity itself.
 */
export type ActivitySourceType =
  | 'task'
  | 'habit'
  | 'goal'
  | 'calendar_event'
  | 'quick_focus'
  | 'custom';

/** Source types that are backed by another document (and therefore de-duplicated by source). */
export type LinkedActivitySourceType = 'task' | 'habit' | 'goal' | 'calendar_event';

/** Source types that stand alone (a new Activity every time; never de-duplicated). */
export type StandaloneActivitySourceType = 'quick_focus' | 'custom';

/**
 * The central domain: a source-agnostic "thing that can be timed". Every timer session references
 * an Activity, never a Task/Habit/Goal directly — this is what makes the time-tracking system
 * independent of those domains. The dependency arrow points *from* Task/Habit/Goal/Calendar *to*
 * Activity (via sourceType/sourceId), never the reverse.
 *
 * `title`/`color` are a denormalised snapshot of the source (so the timer UI renders without a
 * join); `totalTrackedSeconds`/`lastTrackedAt` are a denormalised rollup kept current with atomic
 * `$inc` on session stop (so "total time on this task" is an O(1) read).
 */
export interface Activity {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  sourceType: ActivitySourceType;
  sourceId: ObjectId | null;
  title: string;
  color: string | null;
  totalTrackedSeconds: number;
  lastTrackedAt: Date | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
