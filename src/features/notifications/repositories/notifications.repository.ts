import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Notification, NotificationType } from '@/features/notifications/types/notification';

const base = createRepository<Notification>({
  collectionName: COLLECTIONS.notifications,
  softDelete: false,
});

async function create(input: {
  workspaceId: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: ObjectId | null;
}): Promise<Notification> {
  return base.insertOne({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    readAt: null,
  });
}

/** A user's notification feed, cursor-paginated (newest first). */
async function listForUser(
  userId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<Notification>> {
  return base.findMany({ userId } as Filter<Notification>, opts);
}

async function markRead(id: ObjectId): Promise<Notification | null> {
  return base.updateById(id, { readAt: new Date() });
}

/** Mark every unread notification for a user as read; returns how many were updated. */
async function markAllRead(userId: ObjectId): Promise<number> {
  const collection = await base.collection();
  const result = await collection.updateMany(
    { userId, readAt: null } as Filter<Notification>,
    { $set: { readAt: new Date(), updatedAt: new Date() } }
  );
  return result.modifiedCount;
}

async function countUnread(userId: ObjectId): Promise<number> {
  return base.count({ userId, readAt: null } as Filter<Notification>);
}

export const notificationsRepository = {
  ...base,
  create,
  listForUser,
  markRead,
  markAllRead,
  countUnread,
};
