import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { isValidObjectId } from '@/lib/mongo/object-id';

/**
 * Reusable Zod pieces for ObjectId-valued fields crossing the untrusted (JSON) boundary.
 *
 * `objectIdStringSchema` validates but leaves the value as a string (use in API request schemas
 * where the string is echoed back). `objectIdSchema` additionally transforms into an ObjectId
 * (use where the parsed value flows straight into a repository call).
 */
export const objectIdStringSchema = z
  .string()
  .refine(isValidObjectId, { message: 'Must be a valid id' });

export const objectIdSchema = objectIdStringSchema.transform((value) => new ObjectId(value));
