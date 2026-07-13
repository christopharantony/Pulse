import 'server-only';
import { ObjectId } from 'mongodb';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import type { Task } from '@/features/tasks/types/task';
import type { CreateTaskInput } from '@/features/tasks/validators/tasks.schema';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';

/**
 * Create a task within the caller's workspace. Maps the validated (string-id) request shape into the
 * repository's ObjectId-typed input and generates ids for embedded checklist items. This is the thin
 * seam the dashboard's quick-create action uses; the full Tasks feature will grow this service.
 */
export async function createTask(ctx: WorkspaceContext, input: CreateTaskInput): Promise<Task> {
  return tasksRepository.create(ctx.workspaceId, ctx.userId, {
    title: input.title,
    description: input.description ?? null,
    projectId: input.projectId ? new ObjectId(input.projectId) : null,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate ?? null,
    recurrence: input.recurrence ?? null,
    reminders: input.reminders ?? [],
    tagIds: (input.tagIds ?? []).map((id) => new ObjectId(id)),
    checklist: (input.checklist ?? []).map((item) => ({
      _id: new ObjectId(),
      title: item.title,
      done: item.done,
    })),
    assigneeId: input.assigneeId ? new ObjectId(input.assigneeId) : null,
  });
}
