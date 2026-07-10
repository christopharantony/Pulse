import 'server-only';
import { ObjectId } from 'mongodb';
import { getAccessTokenFromCookies } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';

export interface AuthContext {
  userId: ObjectId;
  sessionId: string;
}

// Shared by any authenticated route beyond /api/auth/me — verifies the access token cookie and
// returns the caller's user/session ids, or null if unauthenticated.
export async function requireAuth(): Promise<AuthContext | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return { userId: new ObjectId(payload.sub), sessionId: payload.sessionId };
}
