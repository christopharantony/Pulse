import 'server-only';
import { ObjectId } from 'mongodb';
import { getPasswordResetTokensCollection } from '@/db/client';
import { generateOpaqueToken, hashOpaqueToken } from '@/lib/auth/tokens';
import { serverEnv } from '@/lib/env.server';
import { parseDurationMs } from '@/lib/duration';

export async function createPasswordResetToken(userId: ObjectId): Promise<string> {
  const tokens = await getPasswordResetTokensCollection();
  // Invalidate any prior outstanding reset link for this user before issuing a fresh one.
  await tokens.deleteMany({ userId });

  const rawToken = generateOpaqueToken();
  await tokens.insertOne({
    _id: new ObjectId(),
    userId,
    tokenHash: hashOpaqueToken(rawToken),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + parseDurationMs(serverEnv.PASSWORD_RESET_TOKEN_EXPIRES)),
  });
  return rawToken;
}

// Single-use: the token doc is deleted on consumption, whether valid or expired.
export async function consumePasswordResetToken(rawToken: string): Promise<ObjectId | null> {
  const tokens = await getPasswordResetTokensCollection();
  const hash = hashOpaqueToken(rawToken);
  const doc = await tokens.findOneAndDelete({ tokenHash: hash });
  if (!doc || doc.expiresAt < new Date()) return null;
  return doc.userId;
}
