import 'server-only';
import { ObjectId } from 'mongodb';
import { getEmailVerificationTokensCollection } from '@/db/client';
import { generateOpaqueToken, hashOpaqueToken } from '@/lib/auth/tokens';
import { serverEnv } from '@/lib/env.server';
import { parseDurationMs } from '@/lib/duration';

export async function createEmailVerificationToken(userId: ObjectId): Promise<string> {
  const tokens = await getEmailVerificationTokensCollection();
  // Invalidate any prior outstanding token for this user before issuing a fresh one.
  await tokens.deleteMany({ userId });

  const rawToken = generateOpaqueToken();
  await tokens.insertOne({
    _id: new ObjectId(),
    userId,
    tokenHash: hashOpaqueToken(rawToken),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + parseDurationMs(serverEnv.EMAIL_VERIFICATION_TOKEN_EXPIRES)),
  });
  return rawToken;
}

// Single-use: the token doc is deleted on consumption, whether valid or expired.
export async function consumeEmailVerificationToken(rawToken: string): Promise<ObjectId | null> {
  const tokens = await getEmailVerificationTokensCollection();
  const hash = hashOpaqueToken(rawToken);
  const doc = await tokens.findOneAndDelete({ tokenHash: hash });
  if (!doc || doc.expiresAt < new Date()) return null;
  return doc.userId;
}
