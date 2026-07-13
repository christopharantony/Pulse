import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import type { Recurrence, Reminder } from '@/schemas/schedulable.schema';
import type { CalendarEvent } from '@/features/calendar/types/calendar-event';

const base = createRepository<CalendarEvent>({ collectionName: COLLECTIONS.calendarEvents });

async function create(
  workspaceId: ObjectId,
  createdBy: ObjectId,
  input: {
    title: string;
    description?: string | null;
    startsAt: Date;
    endsAt: Date;
    allDay?: boolean;
    taskId?: ObjectId | null;
    recurrence?: Recurrence | null;
    reminders?: Reminder[];
  }
): Promise<CalendarEvent> {
  return base.insertOne({
    workspaceId,
    createdBy,
    title: input.title,
    description: input.description ?? null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    allDay: input.allDay ?? false,
    taskId: input.taskId ?? null,
    recurrence: input.recurrence ?? null,
    reminders: input.reminders ?? [],
  });
}

/**
 * Events overlapping a date range (an event overlaps when it starts before the window ends and
 * ends after the window begins). Ordered by start time for grid rendering.
 */
async function listByRange(
  workspaceId: ObjectId,
  from: Date,
  to: Date
): Promise<CalendarEvent[]> {
  const collection = await base.collection();
  return collection
    .find({
      workspaceId,
      deletedAt: null,
      startsAt: { $lte: to },
      endsAt: { $gte: from },
    } as Filter<CalendarEvent>)
    .sort({ startsAt: 1 })
    .toArray() as Promise<CalendarEvent[]>;
}

export const calendarRepository = {
  ...base,
  create,
  listByRange,
};
