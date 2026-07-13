import type { ObjectId } from 'mongodb';

/**
 * Roles within a workspace. Only `owner` is used while Pulse is personal-only; `admin`/`member`/
 * `viewer` exist now so enabling team collaboration later is a value addition, not a schema change.
 */
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Join document linking a user to a workspace with a role. Referenced (not embedded in Workspace)
 * so membership changes never contend on the workspace document. Removed by hard delete, so this
 * collection is not soft-deletable.
 */
export interface WorkspaceMember {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}
