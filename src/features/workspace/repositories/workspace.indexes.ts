import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/**
 * Indexes for the tenancy collections (architecture doc Section 9). Idempotent — safe to run on
 * every boot.
 */
export async function ensureWorkspaceIndexes(db: Db): Promise<void> {
  const workspaces = db.collection(COLLECTIONS.workspaces);
  // Slugs are globally unique handles.
  await workspaces.createIndex({ slug: 1 }, { unique: true });
  await workspaces.createIndex({ ownerId: 1 });

  const members = db.collection(COLLECTIONS.workspaceMembers);
  // A user belongs to a workspace at most once; also the membership-check lookup.
  await members.createIndex({ workspaceId: 1, userId: 1 }, { unique: true });
  // "Which workspaces am I in" — runs on every authenticated request once tenancy is live.
  await members.createIndex({ userId: 1 });

  const invitations = db.collection(COLLECTIONS.workspaceInvitations);
  await invitations.createIndex({ tokenHash: 1 }, { unique: true });
  await invitations.createIndex({ workspaceId: 1 });
  // TTL: Mongo auto-removes an invitation once it expires.
  await invitations.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
