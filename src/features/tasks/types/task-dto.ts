import type { TaskPriority, TaskStatus } from '@/features/tasks/types/task';

/**
 * Task API contracts — the serialized (JSON-safe) shapes routes return and the client consumes.
 * All ids and dates are strings here (never `ObjectId`/`Date`). Mirrors the dashboard feature's
 * documented domain-vs-DTO split (`src/features/dashboard/types/dashboard.ts`).
 */

export interface TagRefDto {
  id: string;
  name: string;
  color: string | null;
}

export interface ProjectRefDto {
  id: string;
  name: string;
  color: string | null;
}

export interface SubtaskDto {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  children: SubtaskDto[];
}

export interface RecurrenceDto {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  endDate: string | null;
  completionBehavior: 'fixed' | 'rolling';
}

/** Light shape for list/board views — omits heavy fields the list never renders. */
export interface TaskListItemDto {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  color: string | null;
  project: ProjectRefDto | null;
  tags: TagRefDto[];
  startDate: string | null;
  dueDate: string | null;
  dueHasTime: boolean;
  subtaskProgress: { completed: number; total: number };
  order: number;
  isRecurring: boolean;
  completedAt: string | null;
  updatedAt: string;
}

/** Full detail shape — everything, including recursively serialized subtasks. */
export interface TaskDetailDto extends TaskListItemDto {
  description: string | null;
  notes: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  recurrence: RecurrenceDto | null;
  subtasks: SubtaskDto[];
  assigneeId: string | null;
  createdBy: string;
  archivedAt: string | null;
  createdAt: string;
}
