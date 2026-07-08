import { logoutUser } from '@/features/auth/services/auth.service';
import { getRefreshTokenFromCookies, clearAuthCookies } from '@/lib/auth/cookies';
import { ok, handleRouteError } from '@/lib/api-response';

export async function POST() {
  try {
    const refreshToken = await getRefreshTokenFromCookies();
    // Idempotent: succeeds even if there's no matching session (already logged out/expired).
    await logoutUser(refreshToken);
    await clearAuthCookies();
    return ok(null, 'Logged out successfully');
  } catch (error) {
    return handleRouteError(error);
  }
}
