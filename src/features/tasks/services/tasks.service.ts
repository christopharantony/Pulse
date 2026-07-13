import 'server-only';
import { ObjectId } from 'mongodb';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import { taskActivityRepository } from '@/features/tasks/repositories/task-activity.repository';
import { projectsRepository } from '@/features/projects/repositories/projects.repository';
import { tagsRepository } from '@/features/tags/repositories/tags.repository';
import type { Subtask, Task, TaskStatus } from '@/features/tasks/types/task';
import type {
  CreateTaskInput,
  SubtaskInput,
  TaskListQueryInput,
  UpdateTaskInput,
} from '@/features/tasks/validators/tasks.schema';
import { MAX_SUBTASK_COUNT } from '@/features/tasks/validators/tasks.schema';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';
import { clampLimit } from '@/lib/query/pagination';
import type { OffsetResult } from '@/lib/query/offset';
import {
  serializeTask,
  serializeTaskListItem,
} from '@/features/tasks/services/task-serializer';
import type { ProjectRefDto, TagRefDto, TaskDetailDto, TaskListItemDto } from '@/features/tasks/types/task-dto';
import { computeNextDueDate, isExpired } from '@/features/tasks/services/recurrence';

export class TaskError extends AppError {
  constructor(
    message: string,
    code: 'TASK_NOT_FOUND' | 'TASK_NOT_IN_TRASH' | 'SUBTASK_LIMIT_EXCEEDED' | 'SUBTASK_NOT_FOUND',
    status: number
  ) {
    super(message, code, status);
  }
}

function notFound(): never {
  throw new TaskError('Task not found', 'TASK_NOT_FOUND', 404);
}

/** Load a task and verify it belongs to the caller's workspace, or throw 404. */
async function getOwnedTask(ctx: WorkspaceContext, id: ObjectId, opts?: { includeDeleted?: boolean }): Promise<Task> {
  const task = await tasksRepository.findById(id, opts);
  if (!task || !task.workspaceId.equals(ctx.workspaceId)) notFound();
  return task;
}

function toObjectIds(ids?: string[]): ObjectId[] {
  return (ids ?? []).map((id) => new ObjectId(id));
}

function countSubtasks(subtasks: SubtaskInput[]): number {
  return subtasks.reduce((sum, node) => sum + 1 + countSubtasks(node.children), 0);
}

function toSubtaskDocs(subtasks: SubtaskInput[]): Subtask[] {
  return subtasks.map((node) => ({
    _id: new ObjectId(),
    title: node.title,
    completed: node.completed,
    order: node.order,
    children: toSubtaskDocs(node.children),
  }));
}

function regenerateSubtaskIds(subtasks: Subtask[]): Subtask[] {
  return subtasks.map((node) => ({
    ...node,
    _id: new ObjectId(),
    children: regenerateSubtaskIds(node.children),
  }));
}

/**
 * Create a task within the caller's workspace. Maps the validated (string-id) request shape into
 * the repository's ObjectId-typed input and generates ids for embedded subtasks.
 */
export async function createTask(ctx: WorkspaceContext, input: CreateTaskInput): Promise<Task> {
  const subtasks = input.subtasks ?? [];
  if (countSubtasks(subtasks) > MAX_SUBTASK_COUNT) {
    throw new TaskError('Too many subtasks', 'SUBTASK_LIMIT_EXCEEDED', 422);
  }
  const status = input.status ?? 'inbox';
  const order = await tasksRepository.nextOrderValue(ctx.workspaceId, status);

  const task = await tasksRepository.create(ctx.workspaceId, ctx.userId, {
    title: input.title,
    description: input.description ?? null,
    notes: input.notes ?? null,
    projectId: input.projectId ? new ObjectId(input.projectId) : null,
    status,
    priority: input.priority,
    color: input.color ?? null,
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    dueHasTime: input.dueHasTime,
    estimatedMinutes: input.estimatedMinutes ?? null,
    recurrence: input.recurrence ?? null,
    reminders: input.reminders ?? [],
    tagIds: toObjectIds(input.tagIds),
    subtasks: toSubtaskDocs(subtasks),
    order,
    assigneeId: input.assigneeId ? new ObjectId(input.assigneeId) : null,
  });

  await taskActivityRepository.record({
    workspaceId: ctx.workspaceId,
    taskId: task._id,
    userId: ctx.userId,
    type: 'created',
    toValue: task.status,
  });

  return task;
}

export async function getTask(ctx: WorkspaceContext, id: ObjectId): Promise<Task> {
  return getOwnedTask(ctx, id, { includeDeleted: true });
}

/**
 * Update a task. If `status` transitions to `completed`, delegate to `completeTask` so recurrence
 * advancement always runs through one path rather than being duplicated between "edit" and
 * "checkbox toggle" call sites.
 */
export async function updateTask(
  ctx: WorkspaceContext,
  id: ObjectId,
  input: UpdateTaskInput
): Promise<Task> {
  await getOwnedTask(ctx, id);

  if (input.status === 'completed') {
    const { status, ...rest } = input;
    void status;
    if (Object.keys(rest).length > 0) {
      await applyPatch(id, rest);
    }
    return completeTask(ctx, id);
  }

  return applyPatch(id, input);
}

async function applyPatch(id: ObjectId, input: UpdateTaskInput): Promise<Task> {
  const patch: Partial<Task> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;
  if (input.projectId !== undefined) {
    patch.projectId = input.projectId ? new ObjectId(input.projectId) : null;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.color !== undefined) patch.color = input.color ?? null;
  if (input.startDate !== undefined) patch.startDate = input.startDate ?? null;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate ?? null;
  if (input.dueHasTime !== undefined) patch.dueHasTime = input.dueHasTime;
  if (input.estimatedMinutes !== undefined) patch.estimatedMinutes = input.estimatedMinutes ?? null;
  if (input.recurrence !== undefined) patch.recurrence = input.recurrence ?? null;
  if (input.reminders !== undefined) patch.reminders = input.reminders ?? [];
  if (input.tagIds !== undefined) patch.tagIds = toObjectIds(input.tagIds);
  if (input.subtasks !== undefined) {
    if (countSubtasks(input.subtasks) > MAX_SUBTASK_COUNT) {
      throw new TaskError('Too many subtasks', 'SUBTASK_LIMIT_EXCEEDED', 422);
    }
    patch.subtasks = toSubtaskDocs(input.subtasks);
  }
  if (input.assigneeId !== undefined) {
    patch.assigneeId = input.assigneeId ? new ObjectId(input.assigneeId) : null;
  }

  const updated = await tasksRepository.updateById(id, patch);
  if (!updated) notFound();
  return updated;
}

export interface TaskCompletionResult {
  task: Task;
  rolledForward: boolean;
}

/**
 * Complete a task. If it carries an active, non-expired recurrence, roll the series forward
 * (compute the next due date, reset status/completedAt) instead of marking it `completed` —
 * a recurring task's document represents the whole series, not a single occurrence.
 */
export async function completeTask(ctx: WorkspaceContext, id: ObjectId): Promise<Task> {
  const task = await getOwnedTask(ctx, id);
  const now = new Date();

  if (task.recurrence && task.recurrence.frequency !== 'none' && !isExpired(task.recurrence, now)) {
    const nextDue = computeNextDueDate(task.dueDate ?? now, task.recurrence, now);
    const rollForwardStatus: TaskStatus = task.status === 'inbox' ? 'inbox' : 'todo';
    const updated = await tasksRepository.updateById(id, {
      status: rollForwardStatus,
      dueDate: nextDue,
      completedAt: null,
    });
    if (!updated) notFound();
    await taskActivityRepository.record({
      workspaceId: ctx.workspaceId,
      taskId: id,
      userId: ctx.userId,
      type: 'status_changed',
      fromValue: task.status,
      toValue: `${rollForwardStatus} (recurrence rolled forward)`,
    });
    return updated;
  }

  const updated = await tasksRepository.updateStatus(id, 'completed');
  if (!updated) notFound();
  await taskActivityRepository.record({
    workspaceId: ctx.workspaceId,
    taskId: id,
    userId: ctx.userId,
    type: 'status_changed',
    fromValue: task.status,
    toValue: 'completed',
  });
  return updated;
}

export async function deleteTask(ctx: WorkspaceContext, id: ObjectId): Promise<void> {
  await getOwnedTask(ctx, id);
  const ok = await tasksRepository.softDeleteById(id);
  if (!ok) notFound();
  await taskActivityRepository.record({
    workspaceId: ctx.workspaceId,
    taskId: id,
    userId: ctx.userId,
    type: 'deleted',
  });
}

export async function restoreTask(ctx: WorkspaceContext, id: ObjectId): Promise<Task> {
  await getOwnedTask(ctx, id, { includeDeleted: true });
  const restored = await tasksRepository.restore(id);
  if (!restored) notFound();
  await taskActivityRepository.record({
    workspaceId: ctx.workspaceId,
    taskId: id,
    userId: ctx.userId,
    type: 'restored',
  });
  return restored;
}

export async function permanentlyDeleteTask(ctx: WorkspaceContext, id: ObjectId): Promise<void> {
  const task = await getOwnedTask(ctx, id, { includeDeleted: true });
  if (!task.deletedAt) {
    throw new TaskError('Task must be trashed before it can be permanently deleted', 'TASK_NOT_IN_TRASH', 409);
  }
  const ok = await tasksRepository.hardDeleteById(id);
  if (!ok) notFound();
}

export async function duplicateTask(
  ctx: WorkspaceContext,
  id: ObjectId,
  overrides?: { title?: string }
): Promise<Task> {
  const original = await getOwnedTask(ctx, id);
  const order = await tasksRepository.nextOrderValue(ctx.workspaceId, 'todo');

  return tasksRepository.create(ctx.workspaceId, ctx.userId, {
    title: overrides?.title ?? `${original.title} (copy)`,
    description: original.description,
    notes: original.notes,
    projectId: original.projectId,
    status: 'todo',
    priority: original.priority,
    color: original.color,
    startDate: original.startDate,
    dueDate: null,
    dueHasTime: original.dueHasTime,
    estimatedMinutes: original.estimatedMinutes,
    recurrence: original.recurrence,
    reminders: original.reminders,
    tagIds: original.tagIds,
    subtasks: regenerateSubtaskIds(original.subtasks),
    order,
    assigneeId: original.assigneeId,
  });
}

export async function archiveTask(ctx: WorkspaceContext, id: ObjectId): Promise<Task> {
  await getOwnedTask(ctx, id);
  const updated = await tasksRepository.archive(id);
  if (!updated) notFound();
  return updated;
}

export async function unarchiveTask(
  ctx: WorkspaceContext,
  id: ObjectId,
  restoreStatus: TaskStatus = 'todo'
): Promise<Task> {
  await getOwnedTask(ctx, id);
  const updated = await tasksRepository.unarchive(id, restoreStatus);
  if (!updated) notFound();
  return updated;
}

const ORDER_REBALANCE_EPSILON = 0.001;

export async function reorderTask(ctx: WorkspaceContext, id: ObjectId, targetOrder: number): Promise<Task> {
  const task = await getOwnedTask(ctx, id);
  const updated = await tasksRepository.reorder(id, targetOrder);
  if (!updated) notFound();
  if (targetOrder < ORDER_REBALANCE_EPSILON) {
    await tasksRepository.renumberOrders(ctx.workspaceId, task.status);
  }
  return updated;
}

export async function moveTask(
  ctx: WorkspaceContext,
  id: ObjectId,
  status: TaskStatus,
  targetOrder: number
): Promise<Task> {
  const task = await getOwnedTask(ctx, id);
  const updated = await tasksRepository.moveToStatus(id, status, targetOrder);
  if (!updated) notFound();
  await taskActivityRepository.record({
    workspaceId: ctx.workspaceId,
    taskId: id,
    userId: ctx.userId,
    type: 'status_changed',
    fromValue: task.status,
    toValue: status,
  });
  if (targetOrder < ORDER_REBALANCE_EPSILON) {
    await tasksRepository.renumberOrders(ctx.workspaceId, status);
  }
  return updated;
}

/** Re-verify every id belongs to the caller's workspace before a bulk write — never trust the client list. */
async function filterOwnedIds(ctx: WorkspaceContext, ids: ObjectId[]): Promise<ObjectId[]> {
  const collection = await tasksRepository.collection();
  const owned = await collection
    .find({ _id: { $in: ids }, workspaceId: ctx.workspaceId })
    .project({ _id: 1 })
    .toArray();
  return owned.map((doc) => doc._id as ObjectId);
}

export async function bulkUpdateTasks(
  ctx: WorkspaceContext,
  ids: string[],
  patch: { status?: TaskStatus; priority?: Task['priority']; projectId?: string | null; tagIds?: string[] }
): Promise<number> {
  const ownedIds = await filterOwnedIds(ctx, ids.map((id) => new ObjectId(id)));
  return tasksRepository.bulkUpdate(ownedIds, {
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.projectId !== undefined
      ? { projectId: patch.projectId ? new ObjectId(patch.projectId) : null }
      : {}),
    ...(patch.tagIds !== undefined ? { tagIds: toObjectIds(patch.tagIds) } : {}),
  });
}

export async function bulkDeleteTasks(ctx: WorkspaceContext, ids: string[]): Promise<number> {
  const ownedIds = await filterOwnedIds(ctx, ids.map((id) => new ObjectId(id)));
  return tasksRepository.bulkSoftDelete(ownedIds);
}

export async function bulkArchiveTasks(ctx: WorkspaceContext, ids: string[]): Promise<number> {
  const ownedIds = await filterOwnedIds(ctx, ids.map((id) => new ObjectId(id)));
  return tasksRepository.bulkArchive(ownedIds);
}

// --- Subtasks ---------------------------------------------------------------------------------

export interface SubtaskProgress {
  completed: number;
  total: number;
}

function countProgress(subtasks: Subtask[]): SubtaskProgress {
  let completed = 0;
  let total = 0;
  for (const node of subtasks) {
    total += 1;
    if (node.completed) completed += 1;
    const child = countProgress(node.children);
    completed += child.completed;
    total += child.total;
  }
  return { completed, total };
}

export async function addSubtask(
  ctx: WorkspaceContext,
  taskId: ObjectId,
  parentSubtaskId: string | null,
  title: string
): Promise<Task> {
  const task = await getOwnedTask(ctx, taskId);
  if (countSubtasks(task.subtasks as unknown as SubtaskInput[]) >= MAX_SUBTASK_COUNT) {
    throw new TaskError('Too many subtasks', 'SUBTASK_LIMIT_EXCEEDED', 422);
  }
  const updated = await tasksRepository.addSubtask(
    taskId,
    parentSubtaskId ? new ObjectId(parentSubtaskId) : null,
    { title }
  );
  if (!updated) throw new TaskError('Subtask parent not found', 'SUBTASK_NOT_FOUND', 404);
  return updated;
}

export async function updateSubtask(
  ctx: WorkspaceContext,
  taskId: ObjectId,
  subtaskId: ObjectId,
  patch: { title?: string; completed?: boolean; order?: number }
): Promise<Task> {
  await getOwnedTask(ctx, taskId);
  const updated = await tasksRepository.updateSubtask(taskId, subtaskId, patch);
  if (!updated) throw new TaskError('Subtask not found', 'SUBTASK_NOT_FOUND', 404);
  return updated;
}

export async function toggleSubtask(
  ctx: WorkspaceContext,
  taskId: ObjectId,
  subtaskId: ObjectId,
  completed: boolean
): Promise<{ task: Task; progress: SubtaskProgress }> {
  const task = await updateSubtask(ctx, taskId, subtaskId, { completed });
  return { task, progress: countProgress(task.subtasks) };
}

export async function removeSubtask(ctx: WorkspaceContext, taskId: ObjectId, subtaskId: ObjectId): Promise<Task> {
  await getOwnedTask(ctx, taskId);
  const updated = await tasksRepository.removeSubtask(taskId, subtaskId);
  if (!updated) throw new TaskError('Subtask not found', 'SUBTASK_NOT_FOUND', 404);
  return updated;
}

export async function reorderSubtasks(
  ctx: WorkspaceContext,
  taskId: ObjectId,
  parentSubtaskId: string | null,
  orderedIds: string[]
): Promise<Task> {
  await getOwnedTask(ctx, taskId);
  const updated = await tasksRepository.reorderSubtasks(
    taskId,
    parentSubtaskId ? new ObjectId(parentSubtaskId) : null,
    orderedIds.map((id) => new ObjectId(id))
  );
  if (!updated) throw new TaskError('Subtask parent not found', 'SUBTASK_NOT_FOUND', 404);
  return updated;
}

// --- List / search + serialization ----------------------------------------------------------

/** Batch-load the projects referenced by a page of tasks into a serialized lookup map. */
async function loadProjects(projectIds: (ObjectId | null)[]): Promise<Map<string, ProjectRefDto>> {
  const ids = [...new Map(projectIds.filter((id): id is ObjectId => id != null).map((id) => [id.toHexString(), id])).values()];
  const map = new Map<string, ProjectRefDto>();
  if (ids.length === 0) return map;
  const collection = await projectsRepository.collection();
  const projects = await collection.find({ _id: { $in: ids } }).toArray();
  for (const project of projects) {
    map.set(project._id.toHexString(), { id: project._id.toHexString(), name: project.name, color: project.color });
  }
  return map;
}

/** Batch-load the tags referenced by a page of tasks into a serialized lookup map. */
async function loadTags(workspaceId: ObjectId, tagIds: ObjectId[][]): Promise<Map<string, TagRefDto>> {
  const ids = [...new Map(tagIds.flat().map((id) => [id.toHexString(), id])).values()];
  const map = new Map<string, TagRefDto>();
  if (ids.length === 0) return map;
  const tags = await tagsRepository.listByIds(workspaceId, ids);
  for (const tag of tags) {
    map.set(tag._id.toHexString(), { id: tag._id.toHexString(), name: tag.name, color: tag.color });
  }
  return map;
}

export interface ListTasksResult {
  items: TaskListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listTasks(ctx: WorkspaceContext, query: TaskListQueryInput): Promise<ListTasksResult> {
  const result: OffsetResult<Task> = await tasksRepository.listFiltered(
    ctx.workspaceId,
    {
      status: query.status,
      priority: query.priority,
      tagIds: toObjectIds(query.tagIds),
      projectId: query.projectId ? new ObjectId(query.projectId) : undefined,
      q: query.q,
      dueFrom: query.dueFrom,
      dueTo: query.dueTo,
      hasDueDate: query.hasDueDate,
      hasSubtasks: query.hasSubtasks,
      isRecurring: query.isRecurring,
      includeArchived: query.includeArchived,
      includeDeleted: query.includeDeleted,
    },
    { field: query.sortBy, direction: query.sortDir },
    { page: query.page, limit: query.limit }
  );

  const [projectMap, tagMap] = await Promise.all([
    loadProjects(result.items.map((t) => t.projectId)),
    loadTags(ctx.workspaceId, result.items.map((t) => t.tagIds)),
  ]);

  const items = result.items.map((task) =>
    serializeTaskListItem(
      task,
      task.projectId ? (projectMap.get(task.projectId.toHexString()) ?? null) : null,
      task.tagIds.map((id) => tagMap.get(id.toHexString())).filter((t): t is TagRefDto => !!t)
    )
  );

  return { items, total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages };
}

export async function searchTasks(ctx: WorkspaceContext, term: string, opts?: { limit?: number }): Promise<TaskListItemDto[]> {
  const result = await listTasks(ctx, { q: term, limit: clampLimit(opts?.limit) });
  return result.items;
}

export async function getTaskDetail(ctx: WorkspaceContext, id: ObjectId): Promise<TaskDetailDto> {
  const task = await getOwnedTask(ctx, id, { includeDeleted: true });
  const [projectMap, tagMap] = await Promise.all([
    loadProjects([task.projectId]),
    loadTags(ctx.workspaceId, [task.tagIds]),
  ]);
  return serializeTask(
    task,
    task.projectId ? (projectMap.get(task.projectId.toHexString()) ?? null) : null,
    task.tagIds.map((id) => tagMap.get(id.toHexString())).filter((t): t is TagRefDto => !!t)
  );
}

export async function listTrash(ctx: WorkspaceContext): Promise<TaskListItemDto[]> {
  const tasks = await tasksRepository.listTrash(ctx.workspaceId);
  const [projectMap, tagMap] = await Promise.all([
    loadProjects(tasks.map((t) => t.projectId)),
    loadTags(ctx.workspaceId, tasks.map((t) => t.tagIds)),
  ]);
  return tasks.map((task) =>
    serializeTaskListItem(
      task,
      task.projectId ? (projectMap.get(task.projectId.toHexString()) ?? null) : null,
      task.tagIds.map((id) => tagMap.get(id.toHexString())).filter((t): t is TagRefDto => !!t)
    )
  );
}
