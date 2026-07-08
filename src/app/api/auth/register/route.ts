import type { NextRequest } from 'next/server';
import { registerUser } from '@/features/auth/services/auth.service';
import { registerSchema } from '@/features/auth/validators/auth.schema';
import { setAuthCookies } from '@/lib/auth/cookies';
import { ok, handleRouteError } from '@/lib/api-response';

// Extension point: an OAuth callback route (/api/auth/callback/[provider]/route.ts) would live
// alongside this one, calling into a provider-aware variant of registerUser/loginUser.

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    const result = await registerUser(body, {
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });
    await setAuthCookies(result.accessToken, result.refreshToken);
    return ok(result.user, 'Registered successfully', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
