import 'server-only';
import { ObjectId, type Filter, type UpdateFilter } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope, buildFilter } from '@/lib/query/filter';
import { buildTextSearch } from '@/lib/query/search';
import { buildDateRange } from '@/lib/query/date-range';
import { buildSort, type SortDirection } from '@/lib/query/sort';
import { buildOffset, toOffsetResult, type OffsetResult } from '@/lib/query/offset';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Recurrence, Reminder } from '@/schemas/schedulable.schema';
import type { Subtask, Task, TaskPriority, TaskStatus } from '@/features/tasks/types/task';

const base = createRepository<Task>({ collectionName: COLLECTIONS.tasks });

/** Fields a client is allowed to sort the task list by — enforced via `buildSort`'s allow-list. */
const TASK_SORT_ALLOW_LIST = [
  'dueDate',
  'priority',
  'title',
  'updatedAt',
  'createdAt',
  'order',
  'completedAt',
] as const;

/** Gap between consecutive `order` values for newly-appended tasks in a (workspace, status) bucket. */
const ORDER_GAP = 1000;
/** Below this gap between neighbors, a reorder triggers a bucket-wide renumber instead of a midpoint. */
const ORDER_EPSILON = 0.001;

/** Domain-typed create payload — all ids are already ObjectIds (converted at the caller boundary). */
export interface CreateTaskData {
  projectId?: ObjectId | null;
  goalId?: ObjectId | null;
  title: string;
  description?: string | null;
  notes?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  color?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  dueHasTime?: boolean;
  estimatedMinutes?: number | null;
  recurrence?: Recurrence | null;
  reminders?: Reminder[];
  tagIds?: ObjectId[];
  subtasks?: Subtask[];
  order?: number;
  assigneeId?: ObjectId | null;
}

async function create(
  workspaceId: ObjectId,
  createdBy: ObjectId,
  input: CreateTaskData
): Promise<Task> {
  const status = input.status ?? 'inbox';
  return base.insertOne({
    workspaceId,
    createdBy,
    projectId: input.projectId ?? null,
    goalId: input.goalId ?? null,
    title: input.title,
    description: input.description ?? null,
    notes: input.notes ?? null,
    status,
    priority: input.priority ?? 'none',
    color: input.color ?? null,
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    dueHasTime: input.dueHasTime ?? false,
    estimatedMinutes: input.estimatedMinutes ?? null,
    actualMinutes: null,
    recurrence: input.recurrence ?? null,
    reminders: input.reminders ?? [],
    tagIds: input.tagIds ?? [],
    subtasks: input.subtasks ?? [],
    order: input.order ?? Date.now(),
    assigneeId: input.assigneeId ?? null,
    completedAt: status === 'completed' ? new Date() : null,
    archivedAt: status === 'archived' ? new Date() : null,
  });
}

async function listByWorkspace(
  workspaceId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<Task>> {
  return base.findMany(withWorkspaceScope({}, workspaceId), opts);
}

async function listByProject(
  workspaceId: ObjectId,
  projectId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<Task>> {
  return base.findMany(withWorkspaceScope({ projectId }, workspaceId), opts);
}

async function listByGoal(
  workspaceId: ObjectId,
  goalId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<Task>> {
  return base.findMany(withWorkspaceScope({ goalId }, workspaceId), opts);
}

/** Completed/overdue/remaining/total counts for a goal's linked tasks — computed on read, never stored. */
async function countByGoal(
  workspaceId: ObjectId,
  goalId: ObjectId
): Promise<{ completed: number; overdue: number; remaining: number; total: number }> {
  const collection = await base.collection();
  const scope = { workspaceId, goalId, deletedAt: null } as Filter<Task>;
  const [completed, overdue, total] = await Promise.all([
    collection.countDocuments({ ...scope, status: 'completed' } as Filter<Task>),
    collection.countDocuments({
      ...scope,
      status: { $nin: ['completed', 'cancelled', 'archived'] },
      dueDate: { $ne: null, $lt: new Date() },
    } as Filter<Task>),
    collection.countDocuments(scope),
  ]);
  return { completed, overdue, remaining: total - completed, total };
}

async function listByStatus(
  workspaceId: ObjectId,
  status: TaskStatus,
  opts?: FindManyOptions
): Promise<PaginatedResult<Task>> {
  return base.findMany(withWorkspaceScope({ status }, workspaceId), opts);
}

/** Full-text search over title/description/notes within a workspace (requires the `$text` index). */
async function search(
  workspaceId: ObjectId,
  term: string,
  opts?: FindManyOptions
): Promise<PaginatedResult<Task>> {
  const filter = { ...withWorkspaceScope({}, workspaceId), ...buildTextSearch<Task>(term) };
  return base.findMany(filter as Filter<Task>, opts);
}

/**
 * Set task status, maintaining the `completedAt`/`archivedAt` invariants (set on entering that
 * status, cleared otherwise). This is a thin data-integrity rule, not business orchestration —
 * recurrence roll-forward and notifications live in the service layer.
 */
async function updateStatus(id: ObjectId, status: TaskStatus): Promise<Task | null> {
  return base.updateById(id, {
    status,
    completedAt: status === 'completed' ? new Date() : null,
    archivedAt: status === 'archived' ? new Date() : null,
  });
}

/** Trashed (soft-deleted) tasks for a workspace, newest first. */
async function listTrash(workspaceId: ObjectId): Promise<Task[]> {
  const collection = await base.collection();
  return collection
    .find({ workspaceId, deletedAt: { $ne: null } } as Filter<Task>)
    .sort({ deletedAt: -1 })
    .toArray() as Promise<Task[]>;
}

/** Restore a trashed task. Bypasses the soft-delete read scope, which would hide the target. */
async function restore(id: ObjectId): Promise<Task | null> {
  const collection = await base.collection();
  const doc = await collection.findOneAndUpdate(
    { _id: id } as Filter<Task>,
    { $set: { deletedAt: null, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return doc as Task | null;
}

export interface TaskListFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tagIds?: ObjectId[];
  projectId?: ObjectId;
  goalId?: ObjectId;
  q?: string;
  dueFrom?: Date;
  dueTo?: Date;
  hasDueDate?: boolean;
  hasSubtasks?: boolean;
  isRecurring?: boolean;
  includeArchived?: boolean;
  includeDeleted?: boolean;
}

/**
 * The main task-list query — filters/sort/offset-pagination composed from the shared `lib/query`
 * helpers, exactly as `recent-tasks.aggregator.ts` established. Offset pagination (not cursor) is
 * deliberate: the fixed cursor sort can't express "sort by priority" or "sort by due date," which
 * this list view needs to support.
 */
async function listFiltered(
  workspaceId: ObjectId,
  filter: TaskListFilter,
  sort: { field?: string; direction?: SortDirection },
  page: { page?: number; limit?: number }
): Promise<OffsetResult<Task>> {
  const collection = await base.collection();

  const clauses: Filter<Task>[] = [{ workspaceId } as Filter<Task>];
  if (!filter.includeDeleted) clauses.push({ deletedAt: null } as Filter<Task>);
  if (!filter.includeArchived) clauses.push({ status: { $ne: 'archived' } } as Filter<Task>);
  if (filter.status?.length) clauses.push({ status: { $in: filter.status } } as Filter<Task>);
  if (filter.priority?.length) clauses.push({ priority: { $in: filter.priority } } as Filter<Task>);
  if (filter.tagIds?.length) clauses.push({ tagIds: { $in: filter.tagIds } } as Filter<Task>);
  if (filter.projectId) clauses.push(buildFilter<Task>({ projectId: filter.projectId }, ['projectId']));
  if (filter.goalId) clauses.push(buildFilter<Task>({ goalId: filter.goalId }, ['goalId']));
  if (filter.hasDueDate !== undefined) {
    clauses.push({ dueDate: filter.hasDueDate ? { $ne: null } : null } as Filter<Task>);
  }
  if (filter.hasSubtasks !== undefined) {
    clauses.push({
      'subtasks.0': filter.hasSubtasks ? { $exists: true } : { $exists: false },
    } as Filter<Task>);
  }
  if (filter.isRecurring !== undefined) {
    clauses.push({
      recurrence: filter.isRecurring ? { $ne: null } : null,
    } as Filter<Task>);
  }
  const dateRange = buildDateRange<Task>('dueDate', filter.dueFrom, filter.dueTo);
  if (Object.keys(dateRange).length) clauses.push(dateRange);
  const textSearch = buildTextSearch<Task>(filter.q);
  if (Object.keys(textSearch).length) clauses.push(textSearch);

  const finalFilter = { $and: clauses } as Filter<Task>;
  const mongoSort = buildSort(sort.field, sort.direction, TASK_SORT_ALLOW_LIST, {
    order: 1,
    _id: 1,
  });
  const { skip, limit, page: safePage, pageSize } = buildOffset(page.page, page.limit);

  const [items, total] = await Promise.all([
    collection.find(finalFilter).sort(mongoSort).skip(skip).limit(limit).toArray() as Promise<Task[]>,
    collection.countDocuments(finalFilter),
  ]);

  return toOffsetResult(items, total, safePage, pageSize);
}

/** Highest `order` currently used in a (workspace, status) bucket, plus one gap — for appending. */
async function nextOrderValue(workspaceId: ObjectId, status: TaskStatus): Promise<number> {
  const collection = await base.collection();
  const top = await collection
    .find({ workspaceId, status, deletedAt: null } as Filter<Task>)
    .sort({ order: -1 })
    .limit(1)
    .toArray();
  const max = (top[0] as Task | undefined)?.order ?? 0;
  return max + ORDER_GAP;
}

/** Reset every task's `order` in a (workspace, status) bucket to clean, evenly-spaced multiples. */
async function renumberOrders(workspaceId: ObjectId, status: TaskStatus): Promise<void> {
  const collection = await base.collection();
  const docs = await collection
    .find({ workspaceId, status, deletedAt: null } as Filter<Task>)
    .sort({ order: 1 })
    .project({ _id: 1 })
    .toArray();
  await Promise.all(
    docs.map((doc, index) =>
      collection.updateOne(
        { _id: doc._id } as Filter<Task>,
        { $set: { order: (index + 1) * ORDER_GAP } } as UpdateFilter<Task>
      )
    )
  );
}

/** Reorder a task within its current status column; returns whether a bucket-wide renumber ran. */
async function reorder(id: ObjectId, newOrder: number): Promise<Task | null> {
  return base.updateById(id, { order: newOrder });
}

/** Move a task to a different status column at a given order — one write for the Kanban drag case. */
async function moveToStatus(id: ObjectId, status: TaskStatus, order: number): Promise<Task | null> {
  return base.updateById(id, {
    status,
    order,
    completedAt: status === 'completed' ? new Date() : null,
    archivedAt: status === 'archived' ? new Date() : null,
  });
}

async function archive(id: ObjectId): Promise<Task | null> {
  return base.updateById(id, { status: 'archived', archivedAt: new Date() });
}

async function unarchive(id: ObjectId, restoreStatus: TaskStatus): Promise<Task | null> {
  return base.updateById(id, { status: restoreStatus, archivedAt: null });
}

async function bulkUpdate(
  ids: ObjectId[],
  patch: Partial<Pick<Task, 'status' | 'priority' | 'projectId' | 'tagIds'>>
): Promise<number> {
  const collection = await base.collection();
  const set: Record<string, unknown> = { ...patch, updatedAt: new Date() };
  if (patch.status === 'completed') set.completedAt = new Date();
  if (patch.status === 'archived') set.archivedAt = new Date();
  const result = await collection.updateMany(
    { _id: { $in: ids }, deletedAt: null } as Filter<Task>,
    { $set: set } as UpdateFilter<Task>
  );
  return result.modifiedCount;
}

async function bulkSoftDelete(ids: ObjectId[]): Promise<number> {
  const collection = await base.collection();
  const result = await collection.updateMany(
    { _id: { $in: ids }, deletedAt: null } as Filter<Task>,
    { $set: { deletedAt: new Date(), updatedAt: new Date() } } as UpdateFilter<Task>
  );
  return result.modifiedCount;
}

async function bulkArchive(ids: ObjectId[]): Promise<number> {
  const collection = await base.collection();
  const result = await collection.updateMany(
    { _id: { $in: ids }, deletedAt: null } as Filter<Task>,
    { $set: { status: 'archived', archivedAt: new Date(), updatedAt: new Date() } } as UpdateFilter<Task>
  );
  return result.modifiedCount;
}

/**
 * Roll timer minutes into `actualMinutes` (the Activity Engine's reserved write target on Task —
 * see the field's doc comment). `actualMinutes` starts `null`, so a plain `$inc` would error on the
 * first write; a pipeline update with `$ifNull` treats that as 0 without a read-modify-write race.
 */
async function incrementActualMinutes(id: ObjectId, minutes: number): Promise<Task | null> {
  const collection = await base.collection();
  const doc = await collection.findOneAndUpdate(
    { _id: id } as Filter<Task>,
    [
      {
        $set: {
          actualMinutes: { $add: [{ $ifNull: ['$actualMinutes', 0] }, minutes] },
          updatedAt: new Date(),
        },
      },
    ],
    { returnDocument: 'after' }
  );
  return doc as Task | null;
}

export interface NewSubtaskInput {
  title: string;
  completed?: boolean;
  order?: number;
}

/** Recursively locate the sibling array a new/updated/removed subtask belongs to. */
function findSiblingArray(subtasks: Subtask[], parentId: ObjectId | null): Subtask[] | null {
  if (parentId === null) return subtasks;
  for (const node of subtasks) {
    if (node._id.equals(parentId)) return node.children;
    const found = findSiblingArray(node.children, parentId);
    if (found) return found;
  }
  return null;
}

function removeSubtaskRecursive(subtasks: Subtask[], id: ObjectId): Subtask[] {
  return subtasks
    .filter((node) => !node._id.equals(id))
    .map((node) => ({ ...node, children: removeSubtaskRecursive(node.children, id) }));
}

function updateSubtaskRecursive(
  subtasks: Subtask[],
  id: ObjectId,
  patch: Partial<Pick<Subtask, 'title' | 'completed' | 'order'>>
): Subtask[] {
  return subtasks.map((node) =>
    node._id.equals(id)
      ? { ...node, ...patch }
      : { ...node, children: updateSubtaskRecursive(node.children, id, patch) }
  );
}

async function addSubtask(
  taskId: ObjectId,
  parentSubtaskId: ObjectId | null,
  subtask: NewSubtaskInput
): Promise<Task | null> {
  const task = await base.findById(taskId);
  if (!task) return null;
  const siblings = findSiblingArray(task.subtasks, parentSubtaskId);
  if (!siblings) return null;
  const newNode: Subtask = {
    _id: new ObjectId(),
    title: subtask.title,
    completed: subtask.completed ?? false,
    order: subtask.order ?? siblings.length * ORDER_GAP,
    children: [],
  };
  siblings.push(newNode);
  return base.updateById(taskId, { subtasks: task.subtasks });
}

async function updateSubtask(
  taskId: ObjectId,
  subtaskId: ObjectId,
  patch: Partial<Pick<Subtask, 'title' | 'completed' | 'order'>>
): Promise<Task | null> {
  const task = await base.findById(taskId);
  if (!task) return null;
  return base.updateById(taskId, {
    subtasks: updateSubtaskRecursive(task.subtasks, subtaskId, patch),
  });
}

async function removeSubtask(taskId: ObjectId, subtaskId: ObjectId): Promise<Task | null> {
  const task = await base.findById(taskId);
  if (!task) return null;
  return base.updateById(taskId, { subtasks: removeSubtaskRecursive(task.subtasks, subtaskId) });
}

async function reorderSubtasks(
  taskId: ObjectId,
  parentSubtaskId: ObjectId | null,
  orderedIds: ObjectId[]
): Promise<Task | null> {
  const task = await base.findById(taskId);
  if (!task) return null;
  const siblings = findSiblingArray(task.subtasks, parentSubtaskId);
  if (!siblings) return null;
  const orderIndex = new Map(orderedIds.map((id, index) => [id.toHexString(), index]));
  for (const node of siblings) {
    const index = orderIndex.get(node._id.toHexString());
    if (index !== undefined) node.order = (index + 1) * ORDER_GAP;
  }
  return base.updateById(taskId, { subtasks: task.subtasks });
}

export const tasksRepository = {
  ...base,
  create,
  listByWorkspace,
  listByProject,
  listByGoal,
  countByGoal,
  listByStatus,
  search,
  updateStatus,
  listTrash,
  restore,
  listFiltered,
  nextOrderValue,
  renumberOrders,
  reorder,
  moveToStatus,
  archive,
  unarchive,
  bulkUpdate,
  bulkSoftDelete,
  bulkArchive,
  incrementActualMinutes,
  addSubtask,
  updateSubtask,
  removeSubtask,
  reorderSubtasks,
};

export const TASK_ORDER_GAP = ORDER_GAP;
export const TASK_ORDER_EPSILON = ORDER_EPSILON;
