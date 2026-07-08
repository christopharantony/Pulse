import { refreshSession } from '@/features/auth/services/auth.service';
import { getRefreshTokenFromCookies, setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    return fail('Not authenticated', 401);
  }

  try {
    const result = await refreshSession(refreshToken);
    await setAuthCookies(result.accessToken, result.refreshToken);
    return ok(result.user, 'Session refreshed');
  } catch (error) {
    // Clear cookies so a stale/invalid refresh token doesn't linger client-side.
    await clearAuthCookies();
    return handleRouteError(error);
  }
}
