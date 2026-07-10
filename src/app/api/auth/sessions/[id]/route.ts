import { revokeSession } from '@/features/auth/services/auth.service';
import { requireAuth } from '@/lib/auth/require-auth';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return fail('Not authenticated', 401);
    }

    const { id } = await params;
    await revokeSession(auth.userId, id);

    if (id === auth.sessionId) {
      await clearAuthCookies();
    }

    return ok(null, 'Session revoked');
  } catch (error) {
    return handleRouteError(error);
  }
}
