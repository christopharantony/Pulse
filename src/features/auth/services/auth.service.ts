import 'server-only';
import { ObjectId } from 'mongodb';
import { getUsersCollection } from '@/db/client';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateRefreshToken, hashRefreshToken } from '@/lib/auth/tokens';
import { signAccessToken, verifyAccessToken } from '@/lib/auth/jwt';
import {
  createSession,
  findSessionByRefreshTokenHash,
  rotateSession,
  deleteSessionById,
} from '@/lib/auth/session';
import { toSafeUser, type SafeUser, type User } from '@/types/user';
import type { RegisterInput, LoginInput } from '@/features/auth/validators/auth.schema';

/**
 * Explicitly NOT implemented in this phase (extension points only):
 * - OAuth provider callbacks (Google/GitHub/Apple) — see User.provider/providerId
 * - Email verification (no emailVerified gating on login)
 * - Forgot/reset password flow
 * - Two-factor authentication
 * - Roles & permissions, team workspaces, organizations, subscriptions
 */

export class AuthError extends Error {
  code: 'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'UNAUTHENTICATED' | 'INVALID_SESSION';

  constructor(
    message: string,
    code: 'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'UNAUTHENTICATED' | 'INVALID_SESSION'
  ) {
    super(message);
    this.code = code;
  }
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

async function issueSessionAndTokens(user: User, meta: RequestMeta): Promise<AuthResult> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const session = await createSession(user._id, refreshTokenHash, meta.ipAddress, meta.userAgent);
  const accessToken = await signAccessToken({
    sub: user._id.toString(),
    sessionId: session._id.toString(),
    type: 'access',
  });
  return { user: toSafeUser(user), accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
  const users = await getUsersCollection();
  const existing = await users.findOne({ email: input.email });
  if (existing) {
    throw new AuthError('An account with this email already exists', 'EMAIL_TAKEN');
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const user: User = {
    _id: new ObjectId(),
    name: input.name,
    email: input.email,
    passwordHash,
    avatar: null,
    emailVerified: false,
    provider: 'credentials',
    providerId: null,
    createdAt: now,
    updatedAt: now,
  };
  await users.insertOne(user);

  return issueSessionAndTokens(user, meta);
}

export async function loginUser(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
  const users = await getUsersCollection();
  const user = await users.findOne({ email: input.email });

  // Generic message regardless of whether the account doesn't exist, is OAuth-only
  // (passwordHash === null), or the password is simply wrong — no user-existence leakage.
  if (!user || !user.passwordHash) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  return issueSessionAndTokens(user, meta);
}

export async function refreshSession(rawRefreshToken: string): Promise<AuthResult> {
  const hash = hashRefreshToken(rawRefreshToken);
  const session = await findSessionByRefreshTokenHash(hash);
  if (!session || session.expiresAt < new Date()) {
    throw new AuthError('Session expired, please log in again', 'INVALID_SESSION');
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ _id: session.userId });
  if (!user) {
    throw new AuthError('Session expired, please log in again', 'INVALID_SESSION');
  }

  const newRefreshToken = generateRefreshToken();
  const newHash = hashRefreshToken(newRefreshToken);
  const rotated = await rotateSession(session._id, newHash);
  if (!rotated) {
    throw new AuthError('Session expired, please log in again', 'INVALID_SESSION');
  }

  const accessToken = await signAccessToken({
    sub: user._id.toString(),
    sessionId: rotated._id.toString(),
    type: 'access',
  });

  return { user: toSafeUser(user), accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  const hash = hashRefreshToken(rawRefreshToken);
  const session = await findSessionByRefreshTokenHash(hash);
  if (session) {
    await deleteSessionById(session._id);
  }
}

export async function getCurrentUser(accessToken: string | undefined): Promise<SafeUser | null> {
  if (!accessToken) return null;
  const payload = await verifyAccessToken(accessToken);
  if (!payload) return null;

  const users = await getUsersCollection();
  const user = await users.findOne({ _id: new ObjectId(payload.sub) });
  if (!user) return null;

  return toSafeUser(user);
}
