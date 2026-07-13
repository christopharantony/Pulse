import { ObjectId } from 'mongodb';
import { InvalidObjectIdError } from '@/db/errors';

/**
 * ObjectId conversion helpers.
 *
 * The repository layer receives untrusted string ids far more often than the auth layer did
 * (route params, request bodies), so this is the first shared place that conversion lives.
 * We validate against a strict 24-char-hex pattern rather than the driver's looser
 * `ObjectId.isValid`, which also accepts 12-byte strings and would let malformed ids through.
 */
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

/** True when `value` is an ObjectId instance or a strict 24-char hex string. */
export function isValidObjectId(value: unknown): boolean {
  if (value instanceof ObjectId) return true;
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

/**
 * Convert a string (or pass through an existing ObjectId) to an ObjectId, throwing
 * {@link InvalidObjectIdError} on anything invalid. Use at every untrusted string boundary.
 */
export function toObjectId(value: string | ObjectId): ObjectId {
  if (value instanceof ObjectId) return value;
  if (isValidObjectId(value)) return new ObjectId(value);
  throw new InvalidObjectIdError(value);
}

/** Non-throwing variant: returns `null` instead of throwing when `value` is invalid. */
export function toObjectIdOrNull(value: unknown): ObjectId | null {
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string' && isValidObjectId(value)) return new ObjectId(value);
  return null;
}
