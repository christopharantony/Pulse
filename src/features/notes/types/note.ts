import type { ObjectId } from 'mongodb';

/**
 * Freeform rich-text content. Can stand alone (a journal entry) or link to a Project/Task/Goal —
 * all links optional, never required. `body` holds the rich representation; `plainText` is a
 * denormalised plain-text extraction that the `$text` index searches (indexing rich markup
 * directly would pollute search with formatting tokens).
 */
export interface Note {
  _id: ObjectId;
  workspaceId: ObjectId;
  title: string;
  body: string;
  plainText: string;
  projectId: ObjectId | null;
  taskId: ObjectId | null;
  goalId: ObjectId | null;
  tagIds: ObjectId[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
