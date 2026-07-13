import type { ObjectId } from 'mongodb';
import type { Recurrence, Reminder } from '@/schemas/schedulable.schema';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

/** A checklist sub-item. Embedded in the Task (small, bounded, always rendered with the task). */
export interface ChecklistItem {
  _id: ObjectId;
  title: string;
  done: boolean;
}

/**
 * A discrete unit of work — the most-read/most-written domain. Carries the shared "Schedulable"
 * fields (dueDate/recurrence/reminders) reused across Task/Habit/Goal/CalendarEvent. Tags are
 * referenced by id; comments live in a separate collection (unbounded). Soft-deletable for a
 * trash/undo experience. Notably carries NO timer/session fields — timing is entirely mediated by
 * the Activity Engine, keeping the timer system independent of Tasks.
 */
export interface Task {
  _id: ObjectId;
  workspaceId: ObjectId;
  projectId: ObjectId | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  recurrence: Recurrence | null;
  reminders: Reminder[];
  tagIds: ObjectId[];
  checklist: ChecklistItem[];
  createdBy: ObjectId;
  assigneeId: ObjectId | null;
  /** Set when status becomes `done`, cleared otherwise — powers "completed on" views. */
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
