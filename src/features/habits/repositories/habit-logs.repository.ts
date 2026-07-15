import 'server-only';
import { ObjectId, type Filter } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { translateMongoError } from '@/db/errors';
import { withWorkspaceScope } from '@/lib/query/filter';
import { buildDateRange } from '@/lib/query/date-range';
import type { HabitLog, HabitLogStatus } from '@/features/habits/types/habit-log';

const base = createRepository<HabitLog>({
  collectionName: COLLECTIONS.habitLogs,
  softDelete: false,
});

/** Normalise a date to midnight UTC — the canonical day-key for a habit log. */
function toDayKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Record (or update) a habit's status for a day. Idempotent per `{habitId, date}` via upsert on
 * the unique index — logging the same day twice updates the status rather than creating a second
 * row. Used by boolean habits (complete/skip) and any type's explicit status override.
 */
async function upsertForDay(input: {
  workspaceId: ObjectId;
  habitId: ObjectId;
  userId: ObjectId;
  date: Date;
  status: HabitLogStatus;
  value?: number | null;
  checkedItemIds?: string[] | null;
}): Promise<HabitLog> {
  const collection = await base.collection();
  const now = new Date();
  const day = toDayKey(input.date);
  try {
    const doc = await collection.findOneAndUpdate(
      { habitId: input.habitId, date: day } as Filter<HabitLog>,
      {
        $set: {
          status: input.status,
          updatedAt: now,
          ...(input.value !== undefined ? { value: input.value } : {}),
          ...(input.checkedItemIds !== undefined ? { checkedItemIds: input.checkedItemIds } : {}),
        },
        $setOnInsert: {
          _id: new ObjectId(),
          workspaceId: input.workspaceId,
          userId: input.userId,
          createdAt: now,
          ...(input.value === undefined ? { value: null } : {}),
          ...(input.checkedItemIds === undefined ? { checkedItemIds: null } : {}),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return doc as HabitLog;
  } catch (error) {
    translateMongoError(error, COLLECTIONS.habitLogs);
  }
}

/**
 * Atomically add `deltaValue` to today's logged quantity (numeric/duration habits) — the single
 * code path for both a timer-stop and a manual "+1" tap, so the two sources can never drift.
 * `status` is derived from the post-increment value against `targetValue` in a follow-up `$set`;
 * this is a denormalised convenience field, not the money-precision case that needs a hard
 * transaction (that's the session/activity pair in time-tracking.service.ts).
 */
async function incrementValueForDay(input: {
  workspaceId: ObjectId;
  habitId: ObjectId;
  userId: ObjectId;
  date: Date;
  deltaValue: number;
  targetValue: number;
}): Promise<HabitLog> {
  const collection = await base.collection();
  const now = new Date();
  const day = toDayKey(input.date);
  try {
    await collection.findOneAndUpdate(
      { habitId: input.habitId, date: day } as Filter<HabitLog>,
      {
        $inc: { value: input.deltaValue },
        $set: { updatedAt: now },
        $setOnInsert: {
          _id: new ObjectId(),
          workspaceId: input.workspaceId,
          userId: input.userId,
          status: 'partial',
          checkedItemIds: null,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    // Clamp negative values (a decrement underflow) and derive status in one follow-up write —
    // two steps because the post-increment value has to be read to know which status it implies.
    const clamped = await collection.findOneAndUpdate(
      { habitId: input.habitId, date: day, value: { $lt: 0 } } as Filter<HabitLog>,
      { $set: { value: 0 } },
      { returnDocument: 'after' }
    );
    const current = (clamped ??
      (await collection.findOne({ habitId: input.habitId, date: day } as Filter<HabitLog>))) as HabitLog;
    const status: HabitLogStatus =
      current.value != null && current.value >= input.targetValue
        ? 'completed'
        : (current.value ?? 0) > 0
          ? 'partial'
          : current.status === 'skipped'
            ? 'skipped'
            : 'partial';
    const final = await collection.findOneAndUpdate(
      { habitId: input.habitId, date: day } as Filter<HabitLog>,
      { $set: { status, updatedAt: now } },
      { returnDocument: 'after' }
    );
    return final as HabitLog;
  } catch (error) {
    translateMongoError(error, COLLECTIONS.habitLogs);
  }
}

/** Set (not increment) today's logged quantity — for correcting a mistaken entry. */
async function setValueForDay(input: {
  workspaceId: ObjectId;
  habitId: ObjectId;
  userId: ObjectId;
  date: Date;
  value: number;
  targetValue: number;
}): Promise<HabitLog> {
  const collection = await base.collection();
  const now = new Date();
  const day = toDayKey(input.date);
  const value = Math.max(0, input.value);
  const status: HabitLogStatus = value >= input.targetValue ? 'completed' : value > 0 ? 'partial' : 'partial';
  try {
    const doc = await collection.findOneAndUpdate(
      { habitId: input.habitId, date: day } as Filter<HabitLog>,
      {
        $set: { value, status, updatedAt: now },
        $setOnInsert: {
          _id: new ObjectId(),
          workspaceId: input.workspaceId,
          userId: input.userId,
          checkedItemIds: null,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return doc as HabitLog;
  } catch (error) {
    translateMongoError(error, COLLECTIONS.habitLogs);
  }
}

/**
 * Set the full checked-item-id set for a checklist habit's day. An empty result deletes the log
 * row rather than persisting an empty one — "no log" already means "not started" for the other
 * types, so a fully-unchecked checklist day should collapse back to that same absence-state rather
 * than introducing a fourth meaning. Returns `null` when the row was deleted.
 */
async function setCheckedItemsForDay(input: {
  workspaceId: ObjectId;
  habitId: ObjectId;
  userId: ObjectId;
  date: Date;
  checkedItemIds: string[];
  totalItems: number;
}): Promise<HabitLog | null> {
  const collection = await base.collection();
  const day = toDayKey(input.date);
  if (input.checkedItemIds.length === 0) {
    await collection.deleteOne({ habitId: input.habitId, date: day } as Filter<HabitLog>);
    return null;
  }
  const now = new Date();
  const status: HabitLogStatus =
    input.checkedItemIds.length >= input.totalItems ? 'completed' : 'partial';
  try {
    const doc = await collection.findOneAndUpdate(
      { habitId: input.habitId, date: day } as Filter<HabitLog>,
      {
        $set: { checkedItemIds: input.checkedItemIds, status, updatedAt: now },
        $setOnInsert: {
          _id: new ObjectId(),
          workspaceId: input.workspaceId,
          userId: input.userId,
          value: null,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return doc as HabitLog;
  } catch (error) {
    translateMongoError(error, COLLECTIONS.habitLogs);
  }
}

/** Delete a single day's log (undo). Append-only collection, so this is a real delete, not a soft one. */
async function deleteForDay(habitId: ObjectId, date: Date): Promise<boolean> {
  const collection = await base.collection();
  const result = await collection.deleteOne({
    habitId,
    date: toDayKey(date),
  } as Filter<HabitLog>);
  return result.deletedCount > 0;
}

/** The single day's log for a habit, or null. */
async function findForDay(habitId: ObjectId, date: Date): Promise<HabitLog | null> {
  const collection = await base.collection();
  return collection.findOne({ habitId, date: toDayKey(date) } as Filter<HabitLog>) as Promise<HabitLog | null>;
}

/** Logs for a habit within an inclusive day range, ordered oldest-first (for streak/calendar UI). */
async function listForRange(habitId: ObjectId, from: Date, to: Date): Promise<HabitLog[]> {
  const collection = await base.collection();
  return collection
    .find({ habitId, date: { $gte: toDayKey(from), $lte: toDayKey(to) } } as Filter<HabitLog>)
    .sort({ date: 1 })
    .toArray() as Promise<HabitLog[]>;
}

/** Logs for every habit in a workspace within an inclusive day range — the multi-habit calendar/stat view. */
async function listForWorkspaceRange(workspaceId: ObjectId, from: Date, to: Date): Promise<HabitLog[]> {
  const collection = await base.collection();
  return collection
    .find(
      withWorkspaceScope(
        { date: { $gte: toDayKey(from), $lte: toDayKey(to) } },
        workspaceId
      ) as Filter<HabitLog>
    )
    .sort({ date: 1 })
    .toArray() as Promise<HabitLog[]>;
}

/** A user's logs across a date range (by `startedAt`-equivalent `date`) — used by lifetime stats. */
async function listForUserRange(
  workspaceId: ObjectId,
  userId: ObjectId,
  from?: Date | null,
  to?: Date | null
): Promise<HabitLog[]> {
  const collection = await base.collection();
  const filter = {
    ...withWorkspaceScope({ userId }, workspaceId),
    ...buildDateRange<HabitLog>('date', from, to),
  } as Filter<HabitLog>;
  return collection.find(filter).sort({ date: 1 }).toArray() as Promise<HabitLog[]>;
}

export const habitLogsRepository = {
  ...base,
  toDayKey,
  upsertForDay,
  incrementValueForDay,
  setValueForDay,
  setCheckedItemsForDay,
  deleteForDay,
  findForDay,
  listForRange,
  listForWorkspaceRange,
  listForUserRange,
};
