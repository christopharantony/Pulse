import 'server-only';
import { type ObjectId, type Filter, type UpdateFilter } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope, buildFilter } from '@/lib/query/filter';
import { buildTextSearch } from '@/lib/query/search';
import { buildSort, type SortDirection } from '@/lib/query/sort';
import { buildOffset, toOffsetResult, type OffsetResult } from '@/lib/query/offset';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Recurrence } from '@/schemas/schedulable.schema';
import type { Habit, HabitChecklistItem, HabitReminder, HabitType } from '@/features/habits/types/habit';
import { initialStreakCache } from '@/features/habits/services/streak';

const base = createRepository<Habit>({ collectionName: COLLECTIONS.habits });

/** Fields a client is allowed to sort the habit list by — enforced via `buildSort`'s allow-list. */
const HABIT_SORT_ALLOW_LIST = ['name', 'createdAt', 'updatedAt', 'currentStreak', 'longestStreak'] as const;

export interface CreateHabitData {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  category?: string | null;
  type: HabitType;
  recurrence: Recurrence;
  specificDates?: Date[] | null;
  startDate?: Date | null;
  endDate?: Date | null;
  targetPerPeriod?: number | null;
  targetValue?: number | null;
  unit?: string | null;
  checklistItems?: HabitChecklistItem[] | null;
  reminders?: HabitReminder[];
}

async function create(workspaceId: ObjectId, createdBy: ObjectId, input: CreateHabitData): Promise<Habit> {
  return base.insertOne({
    workspaceId,
    createdBy,
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    category: input.category ?? null,
    type: input.type,
    recurrence: input.recurrence,
    specificDates: input.specificDates ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    targetPerPeriod: input.targetPerPeriod ?? null,
    targetValue: input.targetValue ?? null,
    unit: input.unit ?? null,
    checklistItems: input.checklistItems ?? null,
    reminders: input.reminders ?? [],
    ...initialStreakCache(),
    graceDaysAllowed: 0,
    graceDaysUsedInCurrentStreak: 0,
    archivedAt: null,
  });
}

async function listByWorkspace(
  workspaceId: ObjectId,
  opts?: FindManyOptions & { includeArchived?: boolean }
): Promise<PaginatedResult<Habit>> {
  const filter = opts?.includeArchived ? {} : { archivedAt: null };
  return base.findMany(withWorkspaceScope(filter, workspaceId), opts);
}

async function setArchived(id: ObjectId, archived: boolean): Promise<Habit | null> {
  return base.updateById(id, { archivedAt: archived ? new Date() : null });
}

export interface HabitListFilter {
  type?: HabitType[];
  category?: string[];
  q?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
}

/**
 * The main habit-list query — filters/sort/offset-pagination composed from the shared `lib/query`
 * helpers, mirroring `tasksRepository.listFiltered`. Offset pagination (not cursor) for the same
 * reason as Task: this view needs arbitrary sort fields (streak, name), not the cursor's fixed shape.
 */
async function listFiltered(
  workspaceId: ObjectId,
  filter: HabitListFilter,
  sort: { field?: string; direction?: SortDirection },
  page: { page?: number; limit?: number }
): Promise<OffsetResult<Habit>> {
  const collection = await base.collection();

  const clauses: Filter<Habit>[] = [{ workspaceId } as Filter<Habit>];
  if (!filter.includeDeleted) clauses.push({ deletedAt: null } as Filter<Habit>);
  if (!filter.includeArchived) clauses.push({ archivedAt: null } as Filter<Habit>);
  if (filter.type?.length) clauses.push({ type: { $in: filter.type } } as Filter<Habit>);
  if (filter.category?.length) clauses.push({ category: { $in: filter.category } } as Filter<Habit>);
  const textSearch = buildTextSearch<Habit>(filter.q);
  if (Object.keys(textSearch).length) clauses.push(textSearch);

  const finalFilter = { $and: clauses } as Filter<Habit>;
  const mongoSort = buildSort(sort.field, sort.direction, HABIT_SORT_ALLOW_LIST, {
    createdAt: -1,
    _id: -1,
  });
  const { skip, limit, page: safePage, pageSize } = buildOffset(page.page, page.limit);

  const [items, total] = await Promise.all([
    collection.find(finalFilter).sort(mongoSort).skip(skip).limit(limit).toArray() as Promise<Habit[]>,
    collection.countDocuments(finalFilter),
  ]);

  return toOffsetResult(items, total, safePage, pageSize);
}

/** Full-text search over name/description within a workspace (requires the `$text` index). */
async function search(workspaceId: ObjectId, term: string, opts?: FindManyOptions): Promise<PaginatedResult<Habit>> {
  const filter = { ...withWorkspaceScope({}, workspaceId), ...buildTextSearch<Habit>(term) };
  return base.findMany(filter as Filter<Habit>, opts);
}

/** Trashed (soft-deleted) habits for a workspace, newest first. */
async function listTrash(workspaceId: ObjectId): Promise<Habit[]> {
  const collection = await base.collection();
  return collection
    .find({ workspaceId, deletedAt: { $ne: null } } as Filter<Habit>)
    .sort({ deletedAt: -1 })
    .toArray() as Promise<Habit[]>;
}

/** Restore a trashed habit. Bypasses the soft-delete read scope, which would hide the target. */
async function restore(id: ObjectId): Promise<Habit | null> {
  const collection = await base.collection();
  const doc = await collection.findOneAndUpdate(
    { _id: id } as Filter<Habit>,
    { $set: { deletedAt: null, updatedAt: new Date() } } as UpdateFilter<Habit>,
    { returnDocument: 'after' }
  );
  return doc as Habit | null;
}

/**
 * Persist a streak-cache patch computed by `streak.ts`'s pure functions. A thin, explicitly-named
 * write so call sites read as "apply this streak recompute result," not a generic partial update.
 */
async function applyStreakCache(
  id: ObjectId,
  patch: Pick<
    Habit,
    'currentStreak' | 'longestStreak' | 'streakUnit' | 'consistencyScore' | 'lastLoggedDayKey' | 'streakAnchorDayKey'
  >
): Promise<Habit | null> {
  return base.updateById(id, patch);
}

export const habitsRepository = {
  ...base,
  create,
  listByWorkspace,
  setArchived,
  listFiltered,
  search,
  listTrash,
  restore,
  applyStreakCache,
};
