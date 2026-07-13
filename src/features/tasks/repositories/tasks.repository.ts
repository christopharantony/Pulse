import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import { buildTextSearch } from '@/lib/query/search';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Recurrence, Reminder } from '@/schemas/schedulable.schema';
import type {
  ChecklistItem,
  Task,
  TaskPriority,
  TaskStatus,
} from '@/features/tasks/types/task';

const base = createRepository<Task>({ collectionName: COLLECTIONS.tasks });

/** Domain-typed create payload — all ids are already ObjectIds (converted at the caller boundary). */
export interface CreateTaskData {
  projectId?: ObjectId | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  recurrence?: Recurrence | null;
  reminders?: Reminder[];
  tagIds?: ObjectId[];
  checklist?: ChecklistItem[];
  assigneeId?: ObjectId | null;
}

async function create(
  workspaceId: ObjectId,
  createdBy: ObjectId,
  input: CreateTaskData
): Promise<Task> {
  const status = input.status ?? 'todo';
  return base.insertOne({
    workspaceId,
    createdBy,
    projectId: input.projectId ?? null,
    title: input.title,
    description: input.description ?? null,
    status,
    priority: input.priority ?? 'none',
    dueDate: input.dueDate ?? null,
    recurrence: input.recurrence ?? null,
    reminders: input.reminders ?? [],
    tagIds: input.tagIds ?? [],
    checklist: input.checklist ?? [],
    assigneeId: input.assigneeId ?? null,
    completedAt: status === 'done' ? new Date() : null,
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

async function listByStatus(
  workspaceId: ObjectId,
  status: TaskStatus,
  opts?: FindManyOptions
): Promise<PaginatedResult<Task>> {
  return base.findMany(withWorkspaceScope({ status }, workspaceId), opts);
}

/** Full-text search over title/description within a workspace (requires the `$text` index). */
async function search(
  workspaceId: ObjectId,
  term: string,
  opts?: FindManyOptions
): Promise<PaginatedResult<Task>> {
  const filter = { ...withWorkspaceScope({}, workspaceId), ...buildTextSearch<Task>(term) };
  return base.findMany(filter as Filter<Task>, opts);
}

/**
 * Set task status, maintaining the `completedAt` invariant (set when done, cleared otherwise).
 * This is a thin data-integrity rule, not business orchestration — recurrence roll-forward and
 * notifications live in the service layer.
 */
async function updateStatus(id: ObjectId, status: TaskStatus): Promise<Task | null> {
  return base.updateById(id, { status, completedAt: status === 'done' ? new Date() : null });
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

export const tasksRepository = {
  ...base,
  create,
  listByWorkspace,
  listByProject,
  listByStatus,
  search,
  updateStatus,
  listTrash,
  restore,
};
