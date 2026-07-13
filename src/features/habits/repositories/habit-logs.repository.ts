import 'server-only';
import { ObjectId, type Filter } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { translateMongoError } from '@/db/errors';
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
 * row.
 */
async function upsertForDay(input: {
  workspaceId: ObjectId;
  habitId: ObjectId;
  userId: ObjectId;
  date: Date;
  status: HabitLogStatus;
}): Promise<HabitLog> {
  const collection = await base.collection();
  const now = new Date();
  const day = toDayKey(input.date);
  try {
    const doc = await collection.findOneAndUpdate(
      { habitId: input.habitId, date: day } as Filter<HabitLog>,
      {
        $set: { status: input.status, updatedAt: now },
        $setOnInsert: {
          _id: new ObjectId(),
          workspaceId: input.workspaceId,
          userId: input.userId,
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

/** Logs for a habit within an inclusive day range, ordered oldest-first (for streak/calendar UI). */
async function listForRange(habitId: ObjectId, from: Date, to: Date): Promise<HabitLog[]> {
  const collection = await base.collection();
  return collection
    .find({ habitId, date: { $gte: toDayKey(from), $lte: toDayKey(to) } } as Filter<HabitLog>)
    .sort({ date: 1 })
    .toArray() as Promise<HabitLog[]>;
}

/** All completed logs for a habit, oldest-first — the input to streak recomputation. */
async function listCompleted(habitId: ObjectId): Promise<HabitLog[]> {
  const collection = await base.collection();
  return collection
    .find({ habitId, status: 'completed' } as Filter<HabitLog>)
    .sort({ date: 1 })
    .toArray() as Promise<HabitLog[]>;
}

export const habitLogsRepository = {
  ...base,
  toDayKey,
  upsertForDay,
  listForRange,
  listCompleted,
};
