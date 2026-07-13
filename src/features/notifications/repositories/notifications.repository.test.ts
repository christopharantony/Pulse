import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { notificationsRepository } from '@/features/notifications/repositories/notifications.repository';

function make(workspaceId: ObjectId, userId: ObjectId, title: string) {
  return notificationsRepository.create({ workspaceId, userId, type: 'system', title });
}

describe('notificationsRepository', () => {
  it('creates unread notifications and lists a user feed', async () => {
    const workspaceId = new ObjectId();
    const userId = new ObjectId();
    await make(workspaceId, userId, 'one');
    await make(workspaceId, userId, 'two');
    // Another user's notification must not appear.
    await make(workspaceId, new ObjectId(), 'other');

    const feed = await notificationsRepository.listForUser(userId);
    expect(feed.items).toHaveLength(2);
    expect(await notificationsRepository.countUnread(userId)).toBe(2);
  });

  it('marks one and all as read', async () => {
    const workspaceId = new ObjectId();
    const userId = new ObjectId();
    const first = await make(workspaceId, userId, 'one');
    await make(workspaceId, userId, 'two');

    const read = await notificationsRepository.markRead(first._id);
    expect(read?.readAt).toBeInstanceOf(Date);
    expect(await notificationsRepository.countUnread(userId)).toBe(1);

    const updated = await notificationsRepository.markAllRead(userId);
    expect(updated).toBe(1);
    expect(await notificationsRepository.countUnread(userId)).toBe(0);
  });
});
