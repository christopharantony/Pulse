import type { ObjectId } from 'mongodb';
import type { Recurrence, Reminder } from '@/schemas/schedulable.schema';

export type TaskStatus =
  | 'inbox'
  | 'todo'
  | 'in_progress'
  | 'waiting'
  | 'completed'
  | 'cancelled'
  | 'archived';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

/**
 * A recursive subtask node. Embedded in the Task (small, bounded by product design — see
 * `MAX_SUBTASK_DEPTH`/`MAX_SUBTASK_COUNT` in the validators — and always rendered with the task).
 */
export interface Subtask {
  _id: ObjectId;
  title: string;
  completed: boolean;
  /** Fractional-index position among siblings at the same nesting level. */
  order: number;
  children: Subtask[];
}

/**
 * A discrete unit of work — the most-read/most-written domain. Carries the shared "Schedulable"
 * fields (dueDate/recurrence/reminders) reused across Task/Habit/Goal/CalendarEvent. Tags are
 * referenced by id; comments live in a separate collection (unbounded). Soft-deletable for a
 * trash/undo experience, and separately archivable (status: 'archived') for a reversible-but-
 * hidden-from-active-views state that isn't the same thing as trash. Notably carries no
 * timer/session fields beyond the reserved `actualMinutes` placeholder — timing is entirely
 * mediated by the future Activity Engine, keeping the timer system independent of Tasks.
 */
export interface Task {
  _id: ObjectId;
  workspaceId: ObjectId;
  projectId: ObjectId | null;
  /** Optional link to the Goal this task contributes to; a task belongs to at most one goal. */
  goalId: ObjectId | null;
  title: string;
  description: string | null;
  /** Freeform notes, distinct from `description` (e.g. context vs. scratch space). */
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** Hex colour for UI accent, or null for the default. */
  color: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  /** Whether `dueDate` carries a meaningful time-of-day, or is a date-only due date. */
  dueHasTime: boolean;
  estimatedMinutes: number | null;
  /** Reserved for the future Activity Engine — never written by Task Management itself. */
  actualMinutes: number | null;
  recurrence: Recurrence | null;
  reminders: Reminder[];
  tagIds: ObjectId[];
  subtasks: Subtask[];
  /** Manual sort position, scoped per (workspaceId, status) — see repository `nextOrderValue`. */
  order: number;
  createdBy: ObjectId;
  assigneeId: ObjectId | null;
  /** Set when status becomes `completed`, cleared otherwise — powers "completed on" views. */
  completedAt: Date | null;
  /** Set when status becomes `archived`, cleared on unarchive. */
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
