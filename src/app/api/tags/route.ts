import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { createTag, listTags } from '@/features/tags/services/tags.service';
import { createTagSchema } from '@/features/tags/validators/tags.schema';

function serializeTag(tag: { _id: { toHexString(): string }; name: string; color: string | null }) {
  return { id: tag._id.toHexString(), name: tag.name, color: tag.color };
}

export async function GET() {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const tags = await listTags(ctx);
    return ok(tags.map(serializeTag), 'Tags');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const input = createTagSchema.parse(await request.json());
    const tag = await createTag(ctx, input);
    return ok(serializeTag(tag), 'Tag created', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
