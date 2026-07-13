import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Calendar-event indexes (architecture doc Section 9). */
export async function ensureCalendarIndexes(db: Db): Promise<void> {
  const events = db.collection(COLLECTIONS.calendarEvents);
  // Calendar grid queries scan by workspace + start time (date-range).
  await events.createIndex({ workspaceId: 1, startsAt: 1 });
}
