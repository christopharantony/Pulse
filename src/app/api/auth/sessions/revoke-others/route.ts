import { revokeAllOtherSessions } from '@/features/auth/services/auth.service';
import { requireAuth } from '@/lib/auth/require-auth';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function POST() {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return fail('Not authenticated', 401);
    }
    await revokeAllOtherSessions(auth.userId, auth.sessionId);
    return ok(null, 'Other sessions signed out');
  } catch (error) {
    return handleRouteError(error);
  }
}
