import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/**
 * Tag indexes. The uniqueness constraint is partial (live docs only) so that soft-deleting a tag
 * frees its name to be reused — a plain unique index would keep a trashed tag's name reserved
 * forever.
 */
export async function ensureTagIndexes(db: Db): Promise<void> {
  const tags = db.collection(COLLECTIONS.tags);
  await tags.createIndex(
    { workspaceId: 1, name: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
  );
}
