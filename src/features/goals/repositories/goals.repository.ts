import 'server-only';
import { type ObjectId, type Filter, type UpdateFilter } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import { buildTextSearch } from '@/lib/query/search';
import { buildSort, type SortDirection } from '@/lib/query/sort';
import { buildOffset, toOffsetResult, type OffsetResult } from '@/lib/query/offset';
import type { PaginatedResult } from '@/lib/query/pagination';
import type {
  Goal,
  GoalCategory,
  GoalPriority,
  GoalProgressMethod,
  GoalStatus,
  GoalVisibility,
} from '@/features/goals/types/goal';

const base = createRepository<Goal>({ collectionName: COLLECTIONS.goals });

/** Fields a client is allowed to sort the goal list by — enforced via `buildSort`'s allow-list. */
const GOAL_SORT_ALLOW_LIST = ['title', 'createdAt', 'updatedAt', 'targetDate', 'priority', 'currentValue'] as const;

export interface CreateGoalData {
  title: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  category?: GoalCategory;
  customCategoryLabel?: string | null;
  status?: GoalStatus;
  priority?: GoalPriority;
  progressMethod?: GoalProgressMethod;
  startDate?: Date | null;
  targetDate?: Date | null;
  targetValue?: number | null;
  visibility?: GoalVisibility;
  tagIds?: ObjectId[];
}

async function create(workspaceId: ObjectId, createdBy: ObjectId, input: CreateGoalData): Promise<Goal> {
  return base.insertOne({
    workspaceId,
    createdBy,
    title: input.title,
    description: input.description ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    category: input.category ?? 'personal',
    customCategoryLabel: input.customCategoryLabel ?? null,
    status: input.status ?? 'not_started',
    priority: input.priority ?? 'medium',
    progressMethod: input.progressMethod ?? 'manual',
    startDate: input.startDate ?? null,
    targetDate: input.targetDate ?? null,
    completionDate: null,
    targetValue: input.targetValue ?? null,
    currentValue: 0,
    visibility: input.visibility ?? 'workspace',
    tagIds: input.tagIds ?? [],
    archivedAt: null,
  });
}

async function listByWorkspace(
  workspaceId: ObjectId,
  opts?: FindManyOptions & { status?: GoalStatus }
): Promise<PaginatedResult<Goal>> {
  const filter = opts?.status ? { status: opts.status } : {};
  return base.findMany(withWorkspaceScope(filter, workspaceId), opts);
}

async function setStatus(id: ObjectId, status: GoalStatus): Promise<Goal | null> {
  return base.updateById(id, { status });
}

async function setArchived(id: ObjectId, archived: boolean): Promise<Goal | null> {
  return base.updateById(id, {
    status: archived ? 'archived' : 'active',
    archivedAt: archived ? new Date() : null,
  });
}

async function setProgress(id: ObjectId, patch: { currentValue: number }): Promise<Goal | null> {
  return base.updateById(id, { currentValue: patch.currentValue });
}

export interface GoalListFilter {
  status?: GoalStatus[];
  priority?: GoalPriority[];
  category?: GoalCategory[];
  progressMin?: number;
  progressMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  q?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
}

/**
 * The main goal-list query — filters/sort/offset-pagination composed from the shared `lib/query`
 * helpers, mirroring `habitsRepository.listFiltered`/`tasksRepository.listFiltered`. Offset
 * pagination (not cursor) since this view needs arbitrary sort fields (targetDate, priority,
 * currentValue), not the cursor's fixed shape.
 */
async function listFiltered(
  workspaceId: ObjectId,
  filter: GoalListFilter,
  sort: { field?: string; direction?: SortDirection },
  page: { page?: number; limit?: number }
): Promise<OffsetResult<Goal>> {
  const collection = await base.collection();

  const clauses: Filter<Goal>[] = [{ workspaceId } as Filter<Goal>];
  if (!filter.includeDeleted) clauses.push({ deletedAt: null } as Filter<Goal>);
  if (!filter.includeArchived) clauses.push({ archivedAt: null } as Filter<Goal>);
  if (filter.status?.length) clauses.push({ status: { $in: filter.status } } as Filter<Goal>);
  if (filter.priority?.length) clauses.push({ priority: { $in: filter.priority } } as Filter<Goal>);
  if (filter.category?.length) clauses.push({ category: { $in: filter.category } } as Filter<Goal>);
  if (filter.progressMin !== undefined) clauses.push({ currentValue: { $gte: filter.progressMin } } as Filter<Goal>);
  if (filter.progressMax !== undefined) clauses.push({ currentValue: { $lte: filter.progressMax } } as Filter<Goal>);
  if (filter.dateFrom) clauses.push({ targetDate: { $gte: filter.dateFrom } } as Filter<Goal>);
  if (filter.dateTo) clauses.push({ targetDate: { $lte: filter.dateTo } } as Filter<Goal>);
  const textSearch = buildTextSearch<Goal>(filter.q);
  if (Object.keys(textSearch).length) clauses.push(textSearch);

  const finalFilter = { $and: clauses } as Filter<Goal>;
  const mongoSort = buildSort(sort.field, sort.direction, GOAL_SORT_ALLOW_LIST, {
    createdAt: -1,
    _id: -1,
  });
  const { skip, limit, page: safePage, pageSize } = buildOffset(page.page, page.limit);

  const [items, total] = await Promise.all([
    collection.find(finalFilter).sort(mongoSort).skip(skip).limit(limit).toArray() as Promise<Goal[]>,
    collection.countDocuments(finalFilter),
  ]);

  return toOffsetResult(items, total, safePage, pageSize);
}

/** Full-text search over title/description within a workspace (requires the `$text` index). */
async function search(workspaceId: ObjectId, term: string, opts?: FindManyOptions): Promise<PaginatedResult<Goal>> {
  const filter = { ...withWorkspaceScope({}, workspaceId), ...buildTextSearch<Goal>(term) };
  return base.findMany(filter as Filter<Goal>, opts);
}

/** Trashed (soft-deleted) goals for a workspace, newest first. */
async function listTrash(workspaceId: ObjectId): Promise<Goal[]> {
  const collection = await base.collection();
  return collection
    .find({ workspaceId, deletedAt: { $ne: null } } as Filter<Goal>)
    .sort({ deletedAt: -1 })
    .toArray() as Promise<Goal[]>;
}

/** Restore a trashed goal. Bypasses the soft-delete read scope, which would hide the target. */
async function restore(id: ObjectId): Promise<Goal | null> {
  const collection = await base.collection();
  const doc = await collection.findOneAndUpdate(
    { _id: id } as Filter<Goal>,
    { $set: { deletedAt: null, updatedAt: new Date() } } as UpdateFilter<Goal>,
    { returnDocument: 'after' }
  );
  return doc as Goal | null;
}

export const goalsRepository = {
  ...base,
  create,
  listByWorkspace,
  setStatus,
  setArchived,
  setProgress,
  listFiltered,
  search,
  listTrash,
  restore,
};
