import 'server-only';
import { ObjectId } from 'mongodb';
import { getSessionsCollection } from '@/db/client';
import { serverEnv } from '@/lib/env.server';
import { parseDurationMs } from '@/lib/duration';
import type { Session } from '@/types/session';

function expiryDate(rememberMe: boolean): Date {
  const duration = rememberMe
    ? serverEnv.REMEMBER_ME_REFRESH_EXPIRES
    : serverEnv.REFRESH_TOKEN_EXPIRES;
  return new Date(Date.now() + parseDurationMs(duration));
}

export async function createSession(
  userId: ObjectId,
  refreshTokenHash: string,
  ipAddress: string | null,
  userAgent: string | null,
  rememberMe: boolean
): Promise<Session> {
  const sessions = await getSessionsCollection();
  const now = new Date();
  const doc: Session = {
    _id: new ObjectId(),
    userId,
    refreshTokenHash,
    rotatedFrom: null,
    rememberMe,
    ipAddress,
    userAgent,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: expiryDate(rememberMe),
  };
  await sessions.insertOne(doc);
  return doc;
}

export async function findSessionByRefreshTokenHash(hash: string): Promise<Session | null> {
  const sessions = await getSessionsCollection();
  return sessions.findOne({ refreshTokenHash: hash });
}

// Reuse-detection lookup: a match here means a refresh token that was already rotated out is
// being replayed — a strong signal of token theft (see auth.service.ts refreshSession()).
export async function findSessionByRotatedFromHash(hash: string): Promise<Session | null> {
  const sessions = await getSessionsCollection();
  return sessions.findOne({ rotatedFrom: hash });
}

export async function findSessionById(sessionId: ObjectId): Promise<Session | null> {
  const sessions = await getSessionsCollection();
  return sessions.findOne({ _id: sessionId });
}

export async function listSessionsForUser(userId: ObjectId): Promise<Session[]> {
  const sessions = await getSessionsCollection();
  return sessions.find({ userId }).sort({ lastUsedAt: -1 }).toArray();
}

export async function deleteSessionById(sessionId: ObjectId): Promise<void> {
  const sessions = await getSessionsCollection();
  await sessions.deleteOne({ _id: sessionId });
}

// Ownership-scoped delete for user-facing "revoke this session" actions — returns whether a
// doc was actually deleted so the caller can distinguish "not found"/"not yours" from success.
export async function deleteSessionForUser(sessionId: ObjectId, userId: ObjectId): Promise<boolean> {
  const sessions = await getSessionsCollection();
  const result = await sessions.deleteOne({ _id: sessionId, userId });
  return result.deletedCount > 0;
}

/**
 * Refresh token rotation: atomically updates the existing session doc in place (rather than
 * delete+insert) so a concurrent refresh request never sees a momentary gap with no matching doc.
 * Records the prior refreshTokenHash as `rotatedFrom` so a later replay of that stale token can
 * be detected as reuse (see findSessionByRotatedFromHash / auth.service.ts refreshSession()).
 */
export async function rotateSession(
  sessionId: ObjectId,
  newRefreshTokenHash: string
): Promise<Session | null> {
  const sessions = await getSessionsCollection();
  const current = await sessions.findOne({ _id: sessionId });
  if (!current) return null;

  const now = new Date();
  return sessions.findOneAndUpdate(
    { _id: sessionId },
    {
      $set: {
        refreshTokenHash: newRefreshTokenHash,
        rotatedFrom: current.refreshTokenHash,
        lastUsedAt: now,
        expiresAt: expiryDate(current.rememberMe),
      },
    },
    { returnDocument: 'after' }
  );
}

export async function deleteAllSessionsForUser(
  userId: ObjectId,
  options?: { exceptSessionId?: ObjectId }
): Promise<void> {
  const sessions = await getSessionsCollection();
  const filter = options?.exceptSessionId
    ? { userId, _id: { $ne: options.exceptSessionId } }
    : { userId };
  await sessions.deleteMany(filter);
}
