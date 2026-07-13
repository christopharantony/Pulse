import type { ObjectId } from 'mongodb';
import type { Recurrence, Reminder } from '@/schemas/schedulable.schema';

/**
 * A time-boxed event on the calendar grid. May optionally link to a Task (`taskId`) — e.g. a
 * scheduled work block — but is independent of the Activity/timer system: like everything else,
 * timing a calendar event happens through the Activity Engine, not a field here.
 */
export interface CalendarEvent {
  _id: ObjectId;
  workspaceId: ObjectId;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  taskId: ObjectId | null;
  recurrence: Recurrence | null;
  reminders: Reminder[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
