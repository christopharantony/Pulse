import type { ObjectId } from 'mongodb';

export type MilestoneStatus = 'pending' | 'completed';

/**
 * A checkpoint within a Goal. A separate collection (not embedded in Goal) because the "Upcoming
 * Milestones" dashboard widget needs an efficient cross-goal `{workspaceId, dueDate}` query — an
 * embedded array can't be indexed that way. Mirrors why `TaskComment`/`TaskActivity` are separate
 * collections despite `Task.subtasks` being embedded (subtasks never need a cross-task query).
 */
export interface Milestone {
  _id: ObjectId;
  workspaceId: ObjectId;
  goalId: ObjectId;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completedDate: Date | null;
  /** Dense integer position among the goal's milestones. */
  order: number;
  status: MilestoneStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
