import type { ObjectId } from 'mongodb';

/** Billing/feature tier. Starts `personal`; `team` unlocks collaboration features later. */
export type WorkspacePlan = 'personal' | 'team';

/** Small, bounded, always-read-with-the-workspace config — embedded rather than referenced. */
export interface WorkspaceSettings {
  timezone: string;
  /** 0=Sunday .. 6=Saturday. */
  weekStartsOn: number;
}

/**
 * A Workspace is the tenancy boundary: every domain document carries a `workspaceId` pointing here.
 * Auto-provisioned at user registration (one "Personal Workspace" per user). Soft-deleted only —
 * deleting a workspace cascades to every domain collection and must be a reviewable async job.
 */
export interface Workspace {
  _id: ObjectId;
  name: string;
  /** URL-safe unique handle (unique across all workspaces). */
  slug: string;
  ownerId: ObjectId;
  plan: WorkspacePlan;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Default settings applied when a workspace is created without explicit ones. */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  timezone: 'UTC',
  weekStartsOn: 1,
};
