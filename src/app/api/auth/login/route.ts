import type { NextRequest } from 'next/server';
import { loginUser } from '@/features/auth/services/auth.service';
import { loginSchema } from '@/features/auth/validators/auth.schema';
import { setAuthCookies } from '@/lib/auth/cookies';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseDurationMs } from '@/lib/duration';
import { serverEnv } from '@/lib/env.server';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const ipAddress = request.headers.get('x-forwarded-for');

    const rateLimit = await checkRateLimit(
      `login:${ipAddress ?? 'unknown'}:${body.email}`,
      5,
      parseDurationMs(serverEnv.RATE_LIMIT_WINDOW)
    );
    if (!rateLimit.allowed) {
      return fail('Too many login attempts. Please try again later.', 429);
    }

    const result = await loginUser(body, {
      ipAddress,
      userAgent: request.headers.get('user-agent'),
    });
    await setAuthCookies(result.accessToken, result.refreshToken, {
      rememberMe: result.rememberMe,
    });
    return ok(result.user, 'Logged in successfully');
  } catch (error) {
    return handleRouteError(error);
  }
}
