import type { NextRequest } from 'next/server';
import { requestPasswordReset } from '@/features/auth/services/auth.service';
import { forgotPasswordSchema } from '@/features/auth/validators/auth.schema';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseDurationMs } from '@/lib/duration';
import { serverEnv } from '@/lib/env.server';
import { ok, fail, handleRouteError } from '@/lib/api-response';

const GENERIC_MESSAGE = 'If an account exists for that email, a reset link has been sent.';

export async function POST(request: NextRequest) {
  try {
    const body = forgotPasswordSchema.parse(await request.json());
    const ipAddress = request.headers.get('x-forwarded-for');

    const rateLimit = await checkRateLimit(
      `forgot-password:${ipAddress ?? 'unknown'}:${body.email}`,
      5,
      parseDurationMs(serverEnv.RATE_LIMIT_WINDOW)
    );
    if (!rateLimit.allowed) {
      return fail('Too many requests. Please try again later.', 429);
    }

    // Always resolves and returns the same generic message regardless of outcome — no
    // account-existence leak (see requestPasswordReset in auth.service.ts).
    await requestPasswordReset(body.email);
    return ok(null, GENERIC_MESSAGE);
  } catch (error) {
    return handleRouteError(error);
  }
}
