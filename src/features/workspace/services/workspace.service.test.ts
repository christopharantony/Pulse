import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { getUsersCollection } from '@/db/client';
import { workspaceMemberRepository } from '@/features/workspace/repositories/workspace-member.repository';
import {
  getActiveWorkspace,
  getActiveWorkspaceId,
  provisionPersonalWorkspace,
  WorkspaceError,
} from '@/features/workspace/services/workspace.service';
import type { User } from '@/types/user';

/** Insert a minimal user row so the lazy-provision path (which reads the name) has something real. */
async function seedUser(name: string): Promise<User> {
  const now = new Date();
  const user: User = {
    _id: new ObjectId(),
    name,
    email: `${new ObjectId().toHexString()}@example.com`,
    passwordHash: 'x',
    avatar: null,
    emailVerified: false,
    provider: 'credentials',
    providerId: null,
    createdAt: now,
    updatedAt: now,
  };
  const users = await getUsersCollection();
  await users.insertOne(user);
  return user;
}

describe('workspace.service', () => {
  it('provisions a personal workspace with an owner membership', async () => {
    const userId = new ObjectId();
    const workspace = await provisionPersonalWorkspace({ userId, name: 'Ada Lovelace' });

    expect(workspace.ownerId).toEqual(userId);
    expect(workspace.plan).toBe('personal');
    expect(workspace.name).toBe("Ada Lovelace's Workspace");
    expect(workspace.slug).toMatch(/^ada-lovelace-[0-9a-f]{6}$/);

    const membership = await workspaceMemberRepository.findMembership(workspace._id, userId);
    expect(membership?.role).toBe('owner');
  });

  it('is idempotent — a second provision returns the same workspace', async () => {
    const userId = new ObjectId();
    const first = await provisionPersonalWorkspace({ userId, name: 'Grace' });
    const second = await provisionPersonalWorkspace({ userId, name: 'Grace' });

    expect(second._id.toHexString()).toBe(first._id.toHexString());

    // Exactly one membership exists for the user.
    const count = await workspaceMemberRepository.count({ userId } as never);
    expect(count).toBe(1);
  });

  it('falls back to a generic slug base when the name has no slug-able characters', async () => {
    const userId = new ObjectId();
    const workspace = await provisionPersonalWorkspace({ userId, name: '日本語' });
    expect(workspace.slug).toMatch(/^workspace-[0-9a-f]{6}$/);
  });

  it('getActiveWorkspace lazily provisions for a user who has none', async () => {
    const user = await seedUser('Legacy User');

    const workspace = await getActiveWorkspace(user._id);
    expect(workspace.ownerId).toEqual(user._id);

    // A follow-up resolve returns the same workspace, not a new one.
    const again = await getActiveWorkspaceId(user._id);
    expect(again.toHexString()).toBe(workspace._id.toHexString());
  });

  it('getActiveWorkspace returns the existing workspace without re-provisioning', async () => {
    const userId = new ObjectId();
    const provisioned = await provisionPersonalWorkspace({ userId, name: 'Existing' });

    const resolved = await getActiveWorkspace(userId);
    expect(resolved._id.toHexString()).toBe(provisioned._id.toHexString());
  });

  it('throws USER_NOT_FOUND when resolving a workspace for an unknown user', async () => {
    await expect(getActiveWorkspace(new ObjectId())).rejects.toBeInstanceOf(WorkspaceError);
  });
});
