import { logoutAllDevices } from '@/features/auth/services/auth.service';
import { requireAuth } from '@/lib/auth/require-auth';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function POST() {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return fail('Not authenticated', 401);
    }
    await logoutAllDevices(auth.userId);
    await clearAuthCookies();
    return ok(null, 'Logged out of all devices');
  } catch (error) {
    return handleRouteError(error);
  }
}
