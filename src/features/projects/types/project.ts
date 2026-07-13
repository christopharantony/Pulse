import type { ObjectId } from 'mongodb';

/**
 * A named container that groups Tasks toward an outcome. Pure organisation — no scheduling or
 * status logic of its own. Archiving hides a project without deleting its tasks; soft delete
 * (trash) is separate and reversible.
 */
export interface Project {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  description: string | null;
  color: string | null;
  isArchived: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
