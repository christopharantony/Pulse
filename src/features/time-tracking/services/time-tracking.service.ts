import 'server-only';
import { type ObjectId, type Filter } from 'mongodb';
import { getCollection } from '@/db/client';
import { COLLECTIONS } from '@/db/collections';
import { withTransaction } from '@/db/transaction';
import { translateMongoError } from '@/db/errors';
import { activityRepository } from '@/features/activity/repositories/activity.repository';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import type { Activity, LinkedActivitySourceType, StandaloneActivitySourceType } from '@/features/activity/types/activity';
import type { TimeSession } from '@/features/time-tracking/types/time-session';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';

export class TimeTrackingError extends AppError {
  constructor(message: string, code: 'SESSION_NOT_FOUND' | 'ACTIVITY_NOT_FOUND', status: number) {
    super(message, code, status);
  }
}

export interface StartTimerInput {
  sourceType: LinkedActivitySourceType;
  sourceId: ObjectId;
  title: string;
  color?: string | null;
  note?: string | null;
}

export interface StartTimerResult {
  session: TimeSession;
  activity: Activity;
  /** The session that was auto-stopped to make room for this one, if any. */
  stoppedPrevious: TimeSession | null;
}

/**
 * Stop whatever session the user currently has running (if any), then start a new one against
 * `activity`. Shared by every "start a timer" entry point — source-linked (goal/habit), an
 * existing standalone activity, or a brand-new standalone one — so the "only one timer at a time"
 * behaviour lives in exactly one place.
 */
async function stopRunningThenStart(
  ctx: WorkspaceContext,
  activity: Activity,
  note?: string | null
): Promise<StartTimerResult> {
  const running = await timeSessionRepository.findRunningForUser(ctx.userId);
  let stoppedPrevious: TimeSession | null = null;
  if (running) {
    stoppedPrevious = (await stopTimer(ctx, running._id)).session;
  }

  const session = await timeSessionRepository.startSession({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    activityId: activity._id,
    note: note ?? null,
  });

  return { session, activity, stoppedPrevious };
}

/**
 * Start a timer against a source (task/habit/goal/calendar event), resolving/creating its Activity
 * lazily via `findOrCreateBySource` — this is the one place Task/Habit/Goal/CalendarEvent are
 * mapped onto the Activity model (architecture doc Section 5). If the caller already has a running
 * session (from any source), it is stopped first — friendlier than rejecting the new start; the
 * partial unique index on `time_sessions` still guarantees correctness if two requests race.
 */
export async function startTimerForSource(
  ctx: WorkspaceContext,
  input: StartTimerInput
): Promise<StartTimerResult> {
  const activity = await activityRepository.findOrCreateBySource({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    title: input.title,
    color: input.color ?? null,
  });

  return stopRunningThenStart(ctx, activity, input.note);
}

export interface StartStandaloneTimerInput {
  sourceType: StandaloneActivitySourceType;
  title: string;
  color?: string | null;
  note?: string | null;
}

/**
 * Start a timer against a brand-new standalone activity (quick focus / custom) — the Time Tracker
 * page's "start something ad-hoc" entry point. Unlike `startTimerForSource`, this always creates a
 * new Activity (never de-duplicated — see `activityRepository.createStandalone`), since a standalone
 * activity has no source document to key an idempotent lookup on.
 */
export async function startStandaloneTimer(
  ctx: WorkspaceContext,
  input: StartStandaloneTimerInput
): Promise<StartTimerResult> {
  const activity = await activityRepository.createStandalone({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    sourceType: input.sourceType,
    title: input.title,
    color: input.color ?? null,
  });

  return stopRunningThenStart(ctx, activity, input.note);
}

/**
 * Start a timer against an already-existing Activity (e.g. "resume" from the Time Tracker page's
 * recently-tracked list) — reused regardless of whether that Activity is linked (task/habit/goal)
 * or standalone.
 */
export async function startTimerForActivity(
  ctx: WorkspaceContext,
  activityId: ObjectId,
  note?: string | null
): Promise<StartTimerResult> {
  const activity = await activityRepository.findById(activityId);
  if (!activity || !activity.workspaceId.equals(ctx.workspaceId) || !activity.userId.equals(ctx.userId)) {
    throw new TimeTrackingError('Activity not found', 'ACTIVITY_NOT_FOUND', 404);
  }

  return stopRunningThenStart(ctx, activity, note);
}

export interface StopTimerResult {
  session: TimeSession;
  activity: Activity;
}

/**
 * Stop a running session and roll its duration into the activity's `totalTrackedSeconds`. Wrapped
 * in a multi-document transaction (architecture doc Section 10) — the session's `endedAt`/
 * `durationSeconds` and the activity's rollup must never be observed out of sync, since a wrong
 * timer total is a trust-breaking bug in a time-tracking product. Bypasses both repositories' base
 * helpers for the transactional part (mirrors `workspace.repository.ts#createWithOwner`) since
 * `createRepository` cannot thread a `ClientSession` through the driver call. Idempotent: stopping
 * an already-stopped session (a double-click/race) returns the existing state without re-incrementing.
 */
export async function stopTimer(ctx: WorkspaceContext, sessionId: ObjectId): Promise<StopTimerResult> {
  const existing = await timeSessionRepository.findById(sessionId);
  if (!existing || !existing.workspaceId.equals(ctx.workspaceId) || !existing.userId.equals(ctx.userId)) {
    throw new TimeTrackingError('Time session not found', 'SESSION_NOT_FOUND', 404);
  }

  if (existing.endedAt != null) {
    const activity = await activityRepository.findById(existing.activityId);
    if (!activity) throw new TimeTrackingError('Activity not found', 'ACTIVITY_NOT_FOUND', 404);
    return { session: existing, activity };
  }

  const endedAt = new Date();
  try {
    return await withTransaction(async (mongoSession) => {
      const sessions = await getCollection<TimeSession>(COLLECTIONS.timeSessions);
      const activities = await getCollection<Activity>(COLLECTIONS.activities);

      const stopped = (await sessions.findOneAndUpdate(
        { _id: sessionId, endedAt: null } as Filter<TimeSession>,
        [
          {
            $set: {
              endedAt,
              updatedAt: new Date(),
              durationSeconds: {
                $dateDiff: { startDate: '$startedAt', endDate: endedAt, unit: 'second' },
              },
            },
          },
        ],
        { returnDocument: 'after', session: mongoSession }
      )) as TimeSession | null;
      if (!stopped) {
        throw new TimeTrackingError('Time session already stopped', 'SESSION_NOT_FOUND', 409);
      }

      const durationSeconds = stopped.durationSeconds ?? 0;
      const updatedActivity = (await activities.findOneAndUpdate(
        { _id: existing.activityId } as Filter<Activity>,
        {
          $inc: { totalTrackedSeconds: durationSeconds },
          $set: { lastTrackedAt: endedAt, updatedAt: new Date() },
        },
        { returnDocument: 'after', session: mongoSession }
      )) as Activity | null;
      if (!updatedActivity) {
        throw new TimeTrackingError('Activity not found', 'ACTIVITY_NOT_FOUND', 404);
      }

      return { session: stopped, activity: updatedActivity };
    });
  } catch (error) {
    if (error instanceof TimeTrackingError) throw error;
    translateMongoError(error, COLLECTIONS.timeSessions);
  }
}
