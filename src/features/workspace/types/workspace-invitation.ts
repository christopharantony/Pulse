import type { ObjectId } from 'mongodb';
import type { WorkspaceRole } from '@/features/workspace/types/workspace-member';

/**
 * A pending invitation for an email address to join a workspace at a given role. Self-expiring via
 * a TTL index on `expiresAt`. Only a hash of the invite token is stored, mirroring the auth token
 * pattern — the raw token is emailed and never persisted.
 */
export interface WorkspaceInvitation {
  _id: ObjectId;
  workspaceId: ObjectId;
  email: string;
  role: WorkspaceRole;
  tokenHash: string;
  invitedBy: ObjectId;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}
