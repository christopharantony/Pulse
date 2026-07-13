import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Analytics rollup indexes (architecture doc Section 9). */
export async function ensureAnalyticsIndexes(db: Db): Promise<void> {
  const rollups = db.collection(COLLECTIONS.analyticsDailyRollups);
  // One row per user per day; also the dashboard chart query.
  await rollups.createIndex({ workspaceId: 1, userId: 1, date: -1 }, { unique: true });
}
