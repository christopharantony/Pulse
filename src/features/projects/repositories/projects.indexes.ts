import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Project indexes (architecture doc Section 9). */
export async function ensureProjectIndexes(db: Db): Promise<void> {
  const projects = db.collection(COLLECTIONS.projects);
  // Project list view: filtered by tenant + archive state.
  await projects.createIndex({ workspaceId: 1, isArchived: 1 });
}
