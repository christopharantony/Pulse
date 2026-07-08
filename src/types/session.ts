import type { ObjectId } from 'mongodb';

export interface Session {
  _id: ObjectId;
  userId: ObjectId;
  // Never store the raw refresh token — only its HMAC-SHA256 digest (see lib/auth/tokens.ts).
  refreshTokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}
