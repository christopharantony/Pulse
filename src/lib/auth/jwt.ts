import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { serverEnv } from '@/lib/env.server';

// No Node-only imports in this file — it must be safe to import from the Edge middleware runtime.
const accessSecret = new TextEncoder().encode(serverEnv.JWT_ACCESS_SECRET);

export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
  type: 'access';
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(serverEnv.ACCESS_TOKEN_EXPIRES)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (
      payload.type !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sessionId !== 'string'
    ) {
      return null;
    }
    return { sub: payload.sub, sessionId: payload.sessionId, type: 'access' };
  } catch {
    // Expired, malformed, or bad signature — all treated the same, generic failure.
    return null;
  }
}
