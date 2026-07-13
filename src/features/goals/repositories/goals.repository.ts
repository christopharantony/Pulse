import 'server-only';
import type { ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Goal, GoalStatus } from '@/features/goals/types/goal';

const base = createRepository<Goal>({ collectionName: COLLECTIONS.goals });

async function create(
  workspaceId: ObjectId,
  createdBy: ObjectId,
  input: {
    name: string;
    description?: string | null;
    status?: GoalStatus;
    targetDate?: Date | null;
    targetValue?: number | null;
    tagIds?: ObjectId[];
  }
): Promise<Goal> {
  return base.insertOne({
    workspaceId,
    createdBy,
    name: input.name,
    description: input.description ?? null,
    status: input.status ?? 'active',
    targetDate: input.targetDate ?? null,
    targetValue: input.targetValue ?? null,
    currentValue: 0,
    tagIds: input.tagIds ?? [],
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

export const goalsRepository = {
  ...base,
  create,
  listByWorkspace,
  setStatus,
};
