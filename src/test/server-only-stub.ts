/**
 * Empty stub aliased in place of the `server-only` package during tests. The real package throws
 * at import time outside a React Server Component; our repositories legitimately import it, so
 * tests substitute this no-op (see vitest.config.ts). Production builds are unaffected.
 */
export {};
