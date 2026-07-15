import 'server-only';
import { type ObjectId, type Filter, type AnyBulkWriteOperation } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Milestone, MilestoneStatus } from '@/features/goals/types/milestone';

const base = createRepository<Milestone>({ collectionName: COLLECTIONS.milestones });

export interface CreateMilestoneData {
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  order: number;
}

async function create(workspaceId: ObjectId, goalId: ObjectId, input: CreateMilestoneData): Promise<Milestone> {
  return base.insertOne({
    workspaceId,
    goalId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    completedDate: null,
    order: input.order,
    status: 'pending',
  });
}

/** All (non-deleted) milestones for a goal, ordered. */
async function listByGoal(goalId: ObjectId, opts?: FindManyOptions): Promise<PaginatedResult<Milestone>> {
  return base.findMany({ goalId } as Filter<Milestone>, opts);
}

/** Next dense `order` value for a new milestone appended to the end of a goal's list. */
async function nextOrderValue(goalId: ObjectId): Promise<number> {
  const collection = await base.collection();
  const last = await collection
    .find({ goalId, deletedAt: null } as Filter<Milestone>)
    .sort({ order: -1 })
    .limit(1)
    .toArray();
  return (last[0]?.order ?? -1) + 1;
}

/** Recompute the full dense order sequence for a goal's milestones in one bulk write. */
async function reorder(goalId: ObjectId, orderedIds: ObjectId[]): Promise<void> {
  const collection = await base.collection();
  const ops: AnyBulkWriteOperation<Milestone>[] = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, goalId } as Filter<Milestone>,
      update: { $set: { order: index, updatedAt: new Date() } },
    },
  }));
  if (ops.length) await collection.bulkWrite(ops);
}

async function setStatus(id: ObjectId, status: MilestoneStatus): Promise<Milestone | null> {
  return base.updateById(id, {
    status,
    completedDate: status === 'completed' ? new Date() : null,
  });
}

/** Completed/total counts for a goal's milestones — the milestone-based progress method's input. */
async function countByGoal(goalId: ObjectId): Promise<{ completed: number; total: number }> {
  const collection = await base.collection();
  const [completed, total] = await Promise.all([
    collection.countDocuments({ goalId, status: 'completed' } as Filter<Milestone>),
    collection.countDocuments({ goalId } as Filter<Milestone>),
  ]);
  return { completed, total };
}

/** Completed/total milestone counts across every goal in the workspace — the statistics rollup's input. */
async function countByWorkspace(workspaceId: ObjectId): Promise<{ completed: number; total: number }> {
  const collection = await base.collection();
  const [completed, total] = await Promise.all([
    collection.countDocuments({ workspaceId, status: 'completed' } as Filter<Milestone>),
    collection.countDocuments({ workspaceId } as Filter<Milestone>),
  ]);
  return { completed, total };
}

/** Milestones due within a range, across every goal in the workspace — the dashboard widget's query. */
async function listUpcoming(workspaceId: ObjectId, range: { from: Date; to: Date }): Promise<Milestone[]> {
  const collection = await base.collection();
  return collection
    .find(
      withWorkspaceScope(
        { status: 'pending', dueDate: { $gte: range.from, $lte: range.to } },
        workspaceId
      ) as Filter<Milestone>
    )
    .sort({ dueDate: 1 })
    .toArray() as Promise<Milestone[]>;
}

/** Hard-delete every milestone for a goal — used by the goal's permanent-delete cascade. */
async function deleteAllForGoal(goalId: ObjectId): Promise<void> {
  const collection = await base.collection();
  await collection.deleteMany({ goalId } as Filter<Milestone>);
}

export const milestonesRepository = {
  ...base,
  create,
  listByGoal,
  nextOrderValue,
  reorder,
  setStatus,
  countByGoal,
  countByWorkspace,
  listUpcoming,
  deleteAllForGoal,
};
