/**
 * Domain-specific database error hierarchy.
 *
 * Repositories translate raw MongoDB driver failures into these typed errors so that callers
 * (services, and later route handlers) can branch on `error.code` without depending on the
 * driver's error shapes. The hierarchy is intentionally self-contained: it does not import
 * from the auth layer, so wiring it into a shared HTTP error mapper later is additive and
 * cannot break the existing AuthError handling.
 */
export class DatabaseError extends Error {
  /** Stable, machine-readable discriminator (never localise or reuse for display copy). */
  readonly code: string;

  constructor(message: string, code = 'DATABASE_ERROR', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

/**
 * Raised when a write violates a unique index (MongoDB error 11000). `keyPattern` echoes the
 * offending index so callers can produce a field-specific message (e.g. "email already taken").
 */
export class DuplicateKeyError extends DatabaseError {
  readonly keyPattern?: Record<string, unknown>;
  readonly collectionName?: string;

  constructor(
    message = 'A document with these values already exists',
    keyPattern?: Record<string, unknown>,
    collectionName?: string,
    options?: { cause?: unknown }
  ) {
    super(message, 'DUPLICATE_KEY', options);
    this.name = 'DuplicateKeyError';
    this.keyPattern = keyPattern;
    this.collectionName = collectionName;
  }
}

/** Raised by the ObjectId helpers when an untrusted string is not a valid 24-char hex id. */
export class InvalidObjectIdError extends DatabaseError {
  constructor(value: unknown) {
    super(`Invalid ObjectId: ${JSON.stringify(value)}`, 'INVALID_OBJECT_ID');
    this.name = 'InvalidObjectIdError';
  }
}

/**
 * Raised only by operations that semantically require a document to exist (e.g. a mutation that
 * must target a known row). Plain `find*` reads never throw this — they return `null`, matching
 * the driver's own semantics and the existing auth data-access convention.
 */
export class DocumentNotFoundError extends DatabaseError {
  constructor(entity: string, id?: unknown) {
    super(id ? `${entity} not found: ${JSON.stringify(id)}` : `${entity} not found`, 'NOT_FOUND');
    this.name = 'DocumentNotFoundError';
  }
}

/** Narrow an unknown driver error to a MongoDB duplicate-key (E11000) error. */
function isDuplicateKeyError(
  error: unknown
): error is { code: number; keyPattern?: Record<string, unknown>; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Translate a raw driver error thrown during a write into the typed hierarchy. Always throws —
 * the `never` return lets call sites write `catch (e) { translateMongoError(e); }` and have the
 * compiler understand control never falls through. Duplicate-key errors become
 * {@link DuplicateKeyError}; everything else is wrapped as a {@link DatabaseError} (preserving
 * the original via `cause`), unless it is already a {@link DatabaseError}, in which case it
 * propagates unchanged.
 */
export function translateMongoError(error: unknown, collectionName?: string): never {
  if (error instanceof DatabaseError) throw error;
  if (isDuplicateKeyError(error)) {
    throw new DuplicateKeyError(undefined, error.keyPattern, collectionName, { cause: error });
  }
  throw new DatabaseError('Database operation failed', 'DATABASE_ERROR', { cause: error });
}
