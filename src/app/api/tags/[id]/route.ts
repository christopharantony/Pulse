import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { deleteTag, renameTag } from '@/features/tags/services/tags.service';
import { updateTagSchema } from '@/features/tags/validators/tags.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

function serializeTag(tag: { _id: { toHexString(): string }; name: string; color: string | null }) {
  return { id: tag._id.toHexString(), name: tag.name, color: tag.color };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid tag id', 400);

    const input = updateTagSchema.parse(await request.json());
    const tag = await renameTag(ctx, new ObjectId(id), input);
    return ok(serializeTag(tag), 'Tag updated');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid tag id', 400);

    await deleteTag(ctx, new ObjectId(id));
    return ok(null, 'Tag deleted');
  } catch (error) {
    return handleRouteError(error);
  }
}
