import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import type { WorkspaceInvitation } from '@/features/workspace/types/workspace-invitation';
import type { WorkspaceRole } from '@/features/workspace/types/workspace-member';

const base = createRepository<WorkspaceInvitation>({
  collectionName: COLLECTIONS.workspaceInvitations,
  softDelete: false,
});

async function createInvitation(input: {
  workspaceId: ObjectId;
  email: string;
  role: WorkspaceRole;
  tokenHash: string;
  invitedBy: ObjectId;
  expiresAt: Date;
}): Promise<WorkspaceInvitation> {
  return base.insertOne({ ...input, acceptedAt: null });
}

/** Look up an invitation by its token hash (the acceptance path). */
async function findByTokenHash(tokenHash: string): Promise<WorkspaceInvitation | null> {
  return base.findOne({ tokenHash } as Filter<WorkspaceInvitation>);
}

/** Mark an invitation accepted; returns the updated doc or null if it no longer exists. */
async function markAccepted(id: ObjectId): Promise<WorkspaceInvitation | null> {
  return base.updateById(id, { acceptedAt: new Date() });
}

export const workspaceInvitationRepository = {
  ...base,
  createInvitation,
  findByTokenHash,
  markAccepted,
};
