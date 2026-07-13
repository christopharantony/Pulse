import 'server-only';
import { ObjectId, type Filter } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import type {
  AnalyticsDailyRollup,
  DailyMetrics,
} from '@/features/analytics/types/analytics-daily-rollup';

const base = createRepository<AnalyticsDailyRollup>({
  collectionName: COLLECTIONS.analyticsDailyRollups,
  softDelete: false,
});

/** Normalise a date to midnight UTC — the canonical day-key for a rollup. */
function toDayKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Write (or overwrite) the metrics for a user/day. Idempotent per `{workspaceId, userId, date}`
 * via upsert on the unique index, so the rollup job can safely re-run for a day without creating
 * duplicates.
 */
async function upsertForDay(input: {
  workspaceId: ObjectId;
  userId: ObjectId;
  date: Date;
  metrics: DailyMetrics;
}): Promise<AnalyticsDailyRollup> {
  const collection = await base.collection();
  const now = new Date();
  const day = toDayKey(input.date);
  const doc = await collection.findOneAndUpdate(
    { workspaceId: input.workspaceId, userId: input.userId, date: day } as Filter<AnalyticsDailyRollup>,
    {
      $set: { metrics: input.metrics, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), createdAt: now },
    },
    { upsert: true, returnDocument: 'after' }
  );
  return doc as AnalyticsDailyRollup;
}

/** Rollups for a user within an inclusive day range, oldest-first (for dashboard charts). */
async function listForRange(
  workspaceId: ObjectId,
  userId: ObjectId,
  from: Date,
  to: Date
): Promise<AnalyticsDailyRollup[]> {
  const collection = await base.collection();
  return collection
    .find({
      workspaceId,
      userId,
      date: { $gte: toDayKey(from), $lte: toDayKey(to) },
    } as Filter<AnalyticsDailyRollup>)
    .sort({ date: 1 })
    .toArray() as Promise<AnalyticsDailyRollup[]>;
}

export const analyticsRepository = {
  ...base,
  toDayKey,
  upsertForDay,
  listForRange,
};
