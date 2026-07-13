import 'server-only';
import { ObjectId } from 'mongodb';
import { getUsersCollection } from '@/db/client';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateRefreshToken, hashRefreshToken } from '@/lib/auth/tokens';
import { signAccessToken, verifyAccessToken } from '@/lib/auth/jwt';
import {
  createSession,
  findSessionByRefreshTokenHash,
  findSessionByRotatedFromHash,
  findSessionById,
  listSessionsForUser,
  rotateSession,
  deleteSessionById,
  deleteSessionForUser,
  deleteAllSessionsForUser,
} from '@/lib/auth/session';
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
} from '@/lib/auth/email-verification';
import { createPasswordResetToken, consumePasswordResetToken } from '@/lib/auth/password-reset';
import { sendEmail } from '@/lib/email/send';
import {
  verificationEmail,
  passwordResetEmail,
  passwordChangedEmail,
} from '@/lib/email/templates';
import { serverEnv } from '@/lib/env.server';
import { provisionPersonalWorkspace } from '@/features/workspace/services/workspace.service';
import { toSafeUser, type SafeUser, type User } from '@/types/user';
import type { RegisterInput, LoginInput } from '@/features/auth/validators/auth.schema';

/**
 * Explicitly NOT implemented in this phase (extension points only):
 * - OAuth provider callbacks (Google/GitHub/Apple) — see User.provider/providerId
 * - Two-factor authentication
 * - Roles & permissions, team workspaces, organizations, subscriptions
 */

export class AuthError extends Error {
  code:
    | 'INVALID_CREDENTIALS'
    | 'EMAIL_TAKEN'
    | 'UNAUTHENTICATED'
    | 'INVALID_SESSION'
    | 'INVALID_TOKEN'
    | 'TOKEN_REUSE';

  constructor(message: string, code: AuthError['code']) {
    super(message);
    this.code = code;
  }
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
}

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

async function issueSessionAndTokens(
  user: User,
  meta: RequestMeta,
  rememberMe: boolean
): Promise<AuthResult> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const session = await createSession(
    user._id,
    refreshTokenHash,
    meta.ipAddress,
    meta.userAgent,
    rememberMe
  );
  const accessToken = await signAccessToken({
    sub: user._id.toString(),
    sessionId: session._id.toString(),
    type: 'access',
  });
  return { user: toSafeUser(user), accessToken, refreshToken, rememberMe };
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

  // Auto-provision the user's personal workspace so every subsequent domain write has a tenancy
  // boundary from the first request. Best-effort: a failure here must not abort a successful signup
  // — `getActiveWorkspace()` lazily provisions on the first authenticated request as a backstop.
  try {
    await provisionPersonalWorkspace({ userId: user._id, name: user.name });
  } catch (error) {
    console.error('Failed to provision personal workspace at registration:', error);
  }

  const rawToken = await createEmailVerificationToken(user._id);
  const link = `${serverEnv.APP_URL}/verify-email?token=${rawToken}`;
  const { subject, html } = verificationEmail(link);
  await sendEmail({ to: user.email, subject, html });

  return issueSessionAndTokens(user, meta, false);
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

  return issueSessionAndTokens(user, meta, input.rememberMe);
}

export async function refreshSession(rawRefreshToken: string): Promise<AuthResult> {
  const hash = hashRefreshToken(rawRefreshToken);
  const session = await findSessionByRefreshTokenHash(hash);

  if (!session) {
    // A stale, already-rotated-out refresh token being replayed is a strong signal of token
    // theft (OWASP refresh-token rotation guidance) — kill every session for this user.
    const staleMatch = await findSessionByRotatedFromHash(hash);
    if (staleMatch) {
      console.warn('Refresh token reuse detected', { userId: staleMatch.userId.toString() });
      await deleteAllSessionsForUser(staleMatch.userId);
      throw new AuthError(
        'Security alert: all sessions have been signed out. Please log in again.',
        'TOKEN_REUSE'
      );
    }
    throw new AuthError('Session expired, please log in again', 'INVALID_SESSION');
  }

  if (session.expiresAt < new Date()) {
    await deleteSessionById(session._id);
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

  return {
    user: toSafeUser(user),
    accessToken,
    refreshToken: newRefreshToken,
    rememberMe: rotated.rememberMe,
  };
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

// --- Email verification -----------------------------------------------------------------

export async function verifyEmail(rawToken: string): Promise<SafeUser> {
  const userId = await consumeEmailVerificationToken(rawToken);
  if (!userId) {
    throw new AuthError('Invalid or expired verification link', 'INVALID_TOKEN');
  }

  const users = await getUsersCollection();
  const result = await users.findOneAndUpdate(
    { _id: userId },
    { $set: { emailVerified: true, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!result) {
    throw new AuthError('Invalid or expired verification link', 'INVALID_TOKEN');
  }
  return toSafeUser(result);
}

export async function resendVerificationEmail(userId: ObjectId): Promise<void> {
  const users = await getUsersCollection();
  const user = await users.findOne({ _id: userId });
  if (!user || user.emailVerified) return;

  const rawToken = await createEmailVerificationToken(user._id);
  const link = `${serverEnv.APP_URL}/verify-email?token=${rawToken}`;
  const { subject, html } = verificationEmail(link);
  await sendEmail({ to: user.email, subject, html });
}

// --- Forgot / reset password -------------------------------------------------------------

export async function requestPasswordReset(email: string): Promise<void> {
  const users = await getUsersCollection();
  const user = await users.findOne({ email });
  // Silently no-op for missing accounts or OAuth-only accounts — the caller always returns the
  // same generic response regardless, so there's no account-existence leak either way.
  if (!user || !user.passwordHash) return;

  const rawToken = await createPasswordResetToken(user._id);
  const link = `${serverEnv.APP_URL}/reset-password?token=${rawToken}`;
  const { subject, html } = passwordResetEmail(link);
  await sendEmail({ to: user.email, subject, html });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const userId = await consumePasswordResetToken(rawToken);
  if (!userId) {
    throw new AuthError('Invalid or expired reset link', 'INVALID_TOKEN');
  }

  const users = await getUsersCollection();
  const passwordHash = await hashPassword(newPassword);
  const user = await users.findOneAndUpdate(
    { _id: userId },
    { $set: { passwordHash, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!user) {
    throw new AuthError('Invalid or expired reset link', 'INVALID_TOKEN');
  }

  // Force re-login everywhere after a reset — the old credential and any existing sessions
  // should not remain valid.
  await deleteAllSessionsForUser(userId);

  const { subject, html } = passwordChangedEmail();
  await sendEmail({ to: user.email, subject, html });
}

// --- Change password (authenticated) ------------------------------------------------------

export async function changePassword(
  userId: ObjectId,
  currentPassword: string,
  newPassword: string,
  currentSessionId: ObjectId
): Promise<void> {
  const users = await getUsersCollection();
  const user = await users.findOne({ _id: userId });
  if (!user || !user.passwordHash) {
    throw new AuthError('Unable to change password', 'UNAUTHENTICATED');
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AuthError('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  const passwordHash = await hashPassword(newPassword);
  await users.updateOne(
    { _id: userId },
    { $set: { passwordHash, updatedAt: new Date() } }
  );

  // Keep the current device signed in, sign every other device out.
  await deleteAllSessionsForUser(userId, { exceptSessionId: currentSessionId });

  const { subject, html } = passwordChangedEmail();
  await sendEmail({ to: user.email, subject, html });
}

// --- Session management --------------------------------------------------------------------

export interface SessionSummary {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  isCurrent: boolean;
}

export async function listSessions(
  userId: ObjectId,
  currentSessionId: string
): Promise<SessionSummary[]> {
  const sessions = await listSessionsForUser(userId);
  return sessions.map((session) => ({
    id: session._id.toString(),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    isCurrent: session._id.toString() === currentSessionId,
  }));
}

export async function revokeSession(userId: ObjectId, sessionId: string): Promise<void> {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(sessionId);
  } catch {
    throw new AuthError('Session not found', 'INVALID_SESSION');
  }
  const deleted = await deleteSessionForUser(objectId, userId);
  if (!deleted) {
    throw new AuthError('Session not found', 'INVALID_SESSION');
  }
}

export async function revokeAllOtherSessions(
  userId: ObjectId,
  currentSessionId: string
): Promise<void> {
  await deleteAllSessionsForUser(userId, { exceptSessionId: new ObjectId(currentSessionId) });
}

export async function logoutAllDevices(userId: ObjectId): Promise<void> {
  await deleteAllSessionsForUser(userId);
}

export { findSessionById };
