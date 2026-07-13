import type { ObjectId } from 'mongodb';

/**
 * A workspace-scoped label shared across Tasks, Notes, Habits, and Goals. Referenced by id from
 * those entities (not embedded by value) so renaming a tag doesn't require rewriting every
 * document that uses it.
 */
export interface Tag {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  /** Hex colour for UI, or null for the default. */
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
