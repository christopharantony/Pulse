import type { NextRequest } from 'next/server';
import { verifyEmail } from '@/features/auth/services/auth.service';
import { verifyEmailSchema } from '@/features/auth/validators/auth.schema';
import { ok, handleRouteError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = verifyEmailSchema.parse(await request.json());
    const user = await verifyEmail(body.token);
    return ok(user, 'Email verified');
  } catch (error) {
    return handleRouteError(error);
  }
}
