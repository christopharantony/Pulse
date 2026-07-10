import { listSessions } from '@/features/auth/services/auth.service';
import { requireAuth } from '@/lib/auth/require-auth';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return fail('Not authenticated', 401);
    }
    const sessions = await listSessions(auth.userId, auth.sessionId);
    return ok(sessions, 'Sessions');
  } catch (error) {
    return handleRouteError(error);
  }
}
