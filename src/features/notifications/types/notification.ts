import type { ObjectId } from 'mongodb';

export type NotificationType =
  | 'task_due'
  | 'habit_reminder'
  | 'goal_deadline'
  | 'milestone_due'
  | 'goal_inactive'
  | 'mention'
  | 'system';

/**
 * A user-facing alert — the cross-domain fan-in point (task due dates, habit streaks, mentions).
 * Append-only (not soft-deletable); old read notifications are pruned by a separate job.
 * `entityType`/`entityId` loosely reference the source so the UI can deep-link.
 */
export interface Notification {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: ObjectId | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
