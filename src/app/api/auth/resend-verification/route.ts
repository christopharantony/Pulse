import { resendVerificationEmail } from '@/features/auth/services/auth.service';
import { requireAuth } from '@/lib/auth/require-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseDurationMs } from '@/lib/duration';
import { serverEnv } from '@/lib/env.server';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function POST() {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return fail('Not authenticated', 401);
    }

    const rateLimit = await checkRateLimit(
      `resend-verification:${auth.userId.toString()}`,
      3,
      parseDurationMs('1h')
    );
    if (!rateLimit.allowed) {
      return fail('Too many requests. Please try again later.', 429);
    }

    await resendVerificationEmail(auth.userId);
    return ok(null, 'Verification email sent');
  } catch (error) {
    return handleRouteError(error);
  }
}
