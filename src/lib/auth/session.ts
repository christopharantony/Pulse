import 'server-only';
import { ObjectId } from 'mongodb';
import { getSessionsCollection } from '@/db/client';
import { serverEnv } from '@/lib/env.server';
import type { Session } from '@/types/session';

function parseDurationMs(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input);
  if (!match) throw new Error(`Invalid duration string: ${input}`);
  const value = Number(match[1]);
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return value * multipliers[match[2] as keyof typeof multipliers];
}

function expiryDate(): Date {
  return new Date(Date.now() + parseDurationMs(serverEnv.REFRESH_TOKEN_EXPIRES));
}

export async function createSession(
  userId: ObjectId,
  refreshTokenHash: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<Session> {
  const sessions = await getSessionsCollection();
  const doc: Session = {
    _id: new ObjectId(),
    userId,
    refreshTokenHash,
    ipAddress,
    userAgent,
    createdAt: new Date(),
    expiresAt: expiryDate(),
  };
  await sessions.insertOne(doc);
  return doc;
}

export async function findSessionByRefreshTokenHash(hash: string): Promise<Session | null> {
  const sessions = await getSessionsCollection();
  return sessions.findOne({ refreshTokenHash: hash });
}

export async function deleteSessionById(sessionId: ObjectId): Promise<void> {
  const sessions = await getSessionsCollection();
  await sessions.deleteOne({ _id: sessionId });
}

/**
 * Refresh token rotation: atomically updates the existing session doc in place (rather than
 * delete+insert) so a concurrent refresh request never sees a momentary gap with no matching doc.
 */
export async function rotateSession(
  sessionId: ObjectId,
  newRefreshTokenHash: string
): Promise<Session | null> {
  const sessions = await getSessionsCollection();
  return sessions.findOneAndUpdate(
    { _id: sessionId },
    { $set: { refreshTokenHash: newRefreshTokenHash, createdAt: new Date(), expiresAt: expiryDate() } },
    { returnDocument: 'after' }
  );
}

// Reserved for a future "log out everywhere" feature — not wired to any route yet.
export async function deleteAllSessionsForUser(userId: ObjectId): Promise<void> {
  const sessions = await getSessionsCollection();
  await sessions.deleteMany({ userId });
}
