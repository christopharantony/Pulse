import 'server-only';
import { ObjectId, type Filter } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import type { GoalProgressSnapshot } from '@/features/goals/types/goal-progress-snapshot';
import type { GoalProgressMethod } from '@/features/goals/types/goal';

const base = createRepository<GoalProgressSnapshot>({
  collectionName: COLLECTIONS.goalProgressSnapshots,
  softDelete: false,
});

/** Normalise a date to midnight UTC — the canonical day-key for a snapshot. */
function toDayKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Write (or overwrite) a goal's snapshot for a day. Idempotent per `{goalId, date}` via upsert. */
async function upsertForDay(input: {
  workspaceId: ObjectId;
  goalId: ObjectId;
  date: Date;
  progressPct: number;
  currentValue: number;
  method: GoalProgressMethod;
}): Promise<GoalProgressSnapshot> {
  const collection = await base.collection();
  const now = new Date();
  const day = toDayKey(input.date);
  const doc = await collection.findOneAndUpdate(
    { goalId: input.goalId, date: day } as Filter<GoalProgressSnapshot>,
    {
      $set: {
        workspaceId: input.workspaceId,
        progressPct: input.progressPct,
        currentValue: input.currentValue,
        method: input.method,
        updatedAt: now,
      },
      $setOnInsert: { _id: new ObjectId(), createdAt: now },
    },
    { upsert: true, returnDocument: 'after' }
  );
  return doc as GoalProgressSnapshot;
}

/** Snapshots for a goal within an inclusive day range, oldest-first (for progress charts). */
async function listForRange(goalId: ObjectId, from: Date, to: Date): Promise<GoalProgressSnapshot[]> {
  const collection = await base.collection();
  return collection
    .find({ goalId, date: { $gte: toDayKey(from), $lte: toDayKey(to) } } as Filter<GoalProgressSnapshot>)
    .sort({ date: 1 })
    .toArray() as Promise<GoalProgressSnapshot[]>;
}

/** Snapshots for every goal in a workspace within an inclusive day range — the overview statistics' monthly/yearly chart input. */
async function listForWorkspaceRange(workspaceId: ObjectId, from: Date, to: Date): Promise<GoalProgressSnapshot[]> {
  const collection = await base.collection();
  return collection
    .find({ workspaceId, date: { $gte: toDayKey(from), $lte: toDayKey(to) } } as Filter<GoalProgressSnapshot>)
    .sort({ date: 1 })
    .toArray() as Promise<GoalProgressSnapshot[]>;
}

/**
 * Goal ids whose progress hasn't moved at all across every snapshot since `sinceDate` — the
 * "Goals at Risk" dashboard widget's query. Requires at least 2 snapshots in the window so a
 * brand-new goal (one snapshot) isn't flagged as stalled on day one.
 */
async function listAtRiskGoalIds(workspaceId: ObjectId, sinceDate: Date): Promise<ObjectId[]> {
  const collection = await base.collection();
  const results = (await collection
    .aggregate([
      { $match: { workspaceId, date: { $gte: toDayKey(sinceDate) } } },
      { $group: { _id: '$goalId', minPct: { $min: '$progressPct' }, maxPct: { $max: '$progressPct' }, count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 }, $expr: { $eq: ['$minPct', '$maxPct'] } } },
    ])
    .toArray()) as { _id: ObjectId }[];
  return results.map((r) => r._id);
}

/** Cascade used by a goal's permanent-delete. */
async function deleteAllForGoal(goalId: ObjectId): Promise<void> {
  const collection = await base.collection();
  await collection.deleteMany({ goalId } as Filter<GoalProgressSnapshot>);
}

export const goalProgressSnapshotsRepository = {
  ...base,
  toDayKey,
  upsertForDay,
  listForRange,
  listForWorkspaceRange,
  listAtRiskGoalIds,
  deleteAllForGoal,
};
