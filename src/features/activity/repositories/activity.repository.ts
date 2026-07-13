import 'server-only';
import { ObjectId, type Filter } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import type {
  Activity,
  LinkedActivitySourceType,
  StandaloneActivitySourceType,
} from '@/features/activity/types/activity';

const base = createRepository<Activity>({ collectionName: COLLECTIONS.activities });

/**
 * Get the Activity for a source, creating it lazily if it doesn't exist. This is the single point
 * in the whole system where Task/Habit/Goal/CalendarEvent are mapped onto the Activity model — the
 * "switch over source type" exists here and nowhere else. The upsert is atomic and idempotent; the
 * partial unique index on `{workspaceId, sourceType, sourceId}` guarantees a concurrent double-call
 * can't create two.
 */
async function findOrCreateBySource(input: {
  workspaceId: ObjectId;
  userId: ObjectId;
  sourceType: LinkedActivitySourceType;
  sourceId: ObjectId;
  title: string;
  color?: string | null;
}): Promise<Activity> {
  const collection = await base.collection();
  const now = new Date();
  const doc = await collection.findOneAndUpdate(
    {
      workspaceId: input.workspaceId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    } as Filter<Activity>,
    {
      $setOnInsert: {
        _id: new ObjectId(),
        userId: input.userId,
        title: input.title,
        color: input.color ?? null,
        totalTrackedSeconds: 0,
        lastTrackedAt: null,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
  // With upsert + returnDocument: 'after', a document is always returned.
  return doc as Activity;
}

/**
 * Create a standalone Activity (quick focus / custom). Never de-duplicated — each call is a new,
 * distinct activity, since these have no backing source document to key on.
 */
async function createStandalone(input: {
  workspaceId: ObjectId;
  userId: ObjectId;
  sourceType: StandaloneActivitySourceType;
  title: string;
  color?: string | null;
}): Promise<Activity> {
  return base.insertOne({
    workspaceId: input.workspaceId,
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: null,
    title: input.title,
    color: input.color ?? null,
    totalTrackedSeconds: 0,
    lastTrackedAt: null,
    isArchived: false,
  });
}

/**
 * Atomically add tracked time to an activity's rollup. Uses `$inc` (never read-modify-write) so
 * concurrent stops from multiple devices can't lose an update.
 */
async function incrementTracked(
  activityId: ObjectId,
  seconds: number,
  lastTrackedAt: Date
): Promise<void> {
  const collection = await base.collection();
  await collection.updateOne({ _id: activityId } as Filter<Activity>, {
    $inc: { totalTrackedSeconds: seconds },
    $set: { lastTrackedAt, updatedAt: new Date() },
  });
}

/** Refresh the denormalised snapshot when the source is renamed/recoloured. */
async function refreshSnapshot(
  activityId: ObjectId,
  snapshot: { title?: string; color?: string | null }
): Promise<Activity | null> {
  return base.updateById(activityId, snapshot);
}

/** Recently-tracked activities for the timer quick-start list. */
async function listRecent(
  workspaceId: ObjectId,
  userId: ObjectId,
  limit = 10
): Promise<Activity[]> {
  const collection = await base.collection();
  return collection
    .find({ workspaceId, userId, deletedAt: null } as Filter<Activity>)
    .sort({ lastTrackedAt: -1 })
    .limit(limit)
    .toArray() as Promise<Activity[]>;
}

export const activityRepository = {
  ...base,
  findOrCreateBySource,
  createStandalone,
  incrementTracked,
  refreshSnapshot,
  listRecent,
};
