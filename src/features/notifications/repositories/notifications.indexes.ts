import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Notification indexes (architecture doc Section 9). */
export async function ensureNotificationIndexes(db: Db): Promise<void> {
  const notifications = db.collection(COLLECTIONS.notifications);
  // Notification feed, newest first.
  await notifications.createIndex({ userId: 1, createdAt: -1 });
  // Unread lookups / badge counts.
  await notifications.createIndex({ userId: 1, readAt: 1 });
}
