import 'server-only';
import type { Task, Subtask } from '@/features/tasks/types/task';
import type {
  ProjectRefDto,
  SubtaskDto,
  TagRefDto,
  TaskDetailDto,
  TaskListItemDto,
} from '@/features/tasks/types/task-dto';

/**
 * Recursively count completed/total subtasks across every nesting level. Tolerates `undefined`
 * because list-view queries may project the `subtasks` field out of the document for payload size.
 */
export function countSubtaskProgress(subtasks: Subtask[] | undefined): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const node of subtasks ?? []) {
    total += 1;
    if (node.completed) completed += 1;
    const child = countSubtaskProgress(node.children);
    completed += child.completed;
    total += child.total;
  }
  return { completed, total };
}

function serializeSubtask(node: Subtask): SubtaskDto {
  return {
    id: node._id.toHexString(),
    title: node.title,
    completed: node.completed,
    order: node.order,
    children: node.children.map(serializeSubtask),
  };
}

function baseListItem(
  task: Task,
  project: ProjectRefDto | null,
  tags: TagRefDto[]
): TaskListItemDto {
  return {
    id: task._id.toHexString(),
    title: task.title,
    status: task.status,
    priority: task.priority,
    color: task.color,
    project,
    tags,
    startDate: task.startDate ? task.startDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    dueHasTime: task.dueHasTime,
    subtaskProgress: countSubtaskProgress(task.subtasks),
    order: task.order,
    isRecurring: task.recurrence != null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    updatedAt: task.updatedAt.toISOString(),
  };
}

/** Light shape for list/board views — the existing "drop heavy fields" precedent. */
export function serializeTaskListItem(
  task: Task,
  project: ProjectRefDto | null,
  tags: TagRefDto[] = []
): TaskListItemDto {
  return baseListItem(task, project, tags);
}

/** Full detail shape — every field, recursively serialized subtasks. */
export function serializeTask(
  task: Task,
  project: ProjectRefDto | null,
  tags: TagRefDto[] = []
): TaskDetailDto {
  return {
    ...baseListItem(task, project, tags),
    description: task.description,
    notes: task.notes,
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: task.actualMinutes,
    recurrence: task.recurrence
      ? {
          frequency: task.recurrence.frequency,
          interval: task.recurrence.interval,
          daysOfWeek: task.recurrence.daysOfWeek,
          endDate: task.recurrence.endDate ? new Date(task.recurrence.endDate).toISOString() : null,
          completionBehavior: task.recurrence.completionBehavior ?? 'fixed',
        }
      : null,
    subtasks: task.subtasks.map(serializeSubtask),
    assigneeId: task.assigneeId ? task.assigneeId.toHexString() : null,
    createdBy: task.createdBy.toHexString(),
    archivedAt: task.archivedAt ? task.archivedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
  };
}
