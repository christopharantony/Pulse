import 'server-only';
import { randomBytes, createHmac } from 'node:crypto';
import { serverEnv } from '@/lib/env.server';

/**
 * Refresh tokens are opaque, high-entropy random strings — NOT JWTs. This makes them
 * revocable via the sessions collection (a JWT can't be un-issued before its exp without
 * a blocklist). Only a hash of the token is ever persisted.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * HMAC-SHA256 keyed with JWT_REFRESH_SECRET (not a plain SHA-256 digest). The token already
 * has 384 bits of entropy so this isn't defending against brute force — it's defense-in-depth
 * against a DB-only breach being sufficient to forge a valid session lookup.
 */
export function hashRefreshToken(token: string): string {
  return createHmac('sha256', serverEnv.JWT_REFRESH_SECRET).update(token).digest('hex');
}

/**
 * Generic opaque-token helpers for single-use links (email verification, password reset) that
 * follow the same pattern as refresh tokens: a high-entropy random string is emailed to the user,
 * and only its HMAC digest is ever persisted, so a DB read alone can't forge a valid token.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHmac('sha256', serverEnv.JWT_REFRESH_SECRET).update(token).digest('hex');
}
