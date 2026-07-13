import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Note indexes (architecture doc Section 9). */
export async function ensureNoteIndexes(db: Db): Promise<void> {
  const notes = db.collection(COLLECTIONS.notes);
  // Search over title + extracted plain text.
  await notes.createIndex({ title: 'text', plainText: 'text' });
  // "Notes for this project" (only present when linked).
  await notes.createIndex({ workspaceId: 1, projectId: 1 }, { sparse: true });
}
