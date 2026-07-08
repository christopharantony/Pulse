import type { NextRequest } from 'next/server';
import { loginUser } from '@/features/auth/services/auth.service';
import { loginSchema } from '@/features/auth/validators/auth.schema';
import { setAuthCookies } from '@/lib/auth/cookies';
import { ok, handleRouteError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const result = await loginUser(body, {
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });
    await setAuthCookies(result.accessToken, result.refreshToken);
    return ok(result.user, 'Logged in successfully');
  } catch (error) {
    return handleRouteError(error);
  }
}
