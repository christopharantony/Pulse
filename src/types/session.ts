import type { ObjectId } from 'mongodb';

export interface Session {
  _id: ObjectId;
  userId: ObjectId;
  // Never store the raw refresh token — only its HMAC-SHA256 digest (see lib/auth/tokens.ts).
  refreshTokenHash: string;
  // The refreshTokenHash valid immediately before the most recent rotation. Used to detect
  // replay of a stale, already-rotated-out token (see lib/auth/session.ts).
  rotatedFrom: string | null;
  // Determines this session's expiry duration (REMEMBER_ME_REFRESH_EXPIRES vs REFRESH_TOKEN_EXPIRES),
  // re-applied on every rotation so the choice stays sticky across the session's lifetime.
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}
