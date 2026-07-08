import { getCurrentUser } from '@/features/auth/services/auth.service';
import { getAccessTokenFromCookies } from '@/lib/auth/cookies';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const accessToken = await getAccessTokenFromCookies();
    const user = await getCurrentUser(accessToken);
    if (!user) {
      return fail('Not authenticated', 401);
    }
    return ok(user, 'Current user');
  } catch (error) {
    return handleRouteError(error);
  }
}
