import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import { buildDateRange } from '@/lib/query/date-range';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { TimeSession } from '@/features/time-tracking/types/time-session';

const base = createRepository<TimeSession>({
  collectionName: COLLECTIONS.timeSessions,
  softDelete: false,
});

/** The user's currently-running session, or null if no timer is running. */
async function findRunningForUser(userId: ObjectId): Promise<TimeSession | null> {
  return base.findOne({ userId, endedAt: null } as Filter<TimeSession>);
}

/**
 * Start a session. The "one running timer per user, from any source" invariant is enforced by the
 * partial unique index on `{userId}` where `endedAt: null` — a second concurrent start surfaces as
 * a DuplicateKeyError (the base repository translates the driver's E11000). Callers that want the
 * friendlier "stop the old one first" behaviour orchestrate that in the service layer.
 */
async function startSession(input: {
  workspaceId: ObjectId;
  userId: ObjectId;
  activityId: ObjectId;
  startedAt?: Date;
  note?: string | null;
}): Promise<TimeSession> {
  return base.insertOne({
    workspaceId: input.workspaceId,
    userId: input.userId,
    activityId: input.activityId,
    startedAt: input.startedAt ?? new Date(),
    endedAt: null,
    durationSeconds: null,
    note: input.note ?? null,
  });
}

/**
 * Stop a running session: set `endedAt` and compute `durationSeconds` from `startedAt` in a single
 * atomic update (a pipeline update, so the duration is derived server-side without a read-back).
 * Only matches a session that is still running. Returns null if no running session with that id
 * exists.
 */
async function stopSession(
  sessionId: ObjectId,
  endedAt: Date = new Date(),
  note?: string | null
): Promise<TimeSession | null> {
  const collection = await base.collection();
  const setNote = note === undefined ? {} : { note };
  const doc = await collection.findOneAndUpdate(
    { _id: sessionId, endedAt: null } as Filter<TimeSession>,
    [
      {
        $set: {
          endedAt,
          updatedAt: new Date(),
          ...setNote,
          durationSeconds: {
            $dateDiff: { startDate: '$startedAt', endDate: endedAt, unit: 'second' },
          },
        },
      },
    ],
    { returnDocument: 'after' }
  );
  return doc as TimeSession | null;
}

/** Sessions recorded against an activity, cursor-paginated (newest first). */
async function listForActivity(
  workspaceId: ObjectId,
  activityId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<TimeSession>> {
  return base.findMany(withWorkspaceScope({ activityId }, workspaceId), opts);
}

/** A user's timesheet across all activities within a date range (by start time), newest first. */
async function listForUserRange(
  workspaceId: ObjectId,
  userId: ObjectId,
  from?: Date | null,
  to?: Date | null
): Promise<TimeSession[]> {
  const collection = await base.collection();
  const filter = {
    ...withWorkspaceScope({ userId }, workspaceId),
    ...buildDateRange<TimeSession>('startedAt', from, to),
  } as Filter<TimeSession>;
  return collection.find(filter).sort({ startedAt: -1 }).toArray() as Promise<TimeSession[]>;
}

export const timeSessionRepository = {
  ...base,
  findRunningForUser,
  startSession,
  stopSession,
  listForActivity,
  listForUserRange,
};
