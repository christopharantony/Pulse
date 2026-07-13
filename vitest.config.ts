import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Repository tests run against a real in-memory MongoDB replica set (mongodb-memory-server), not
 * driver mocks — the correctness guarantees of this layer are index-enforced (unique keys, the
 * partial unique "one running timer" index, TTL) and only a real server exercises them. A replica
 * set (not a single node) is required so `withTransaction` works.
 *
 * `isolate: false` + `fileParallelism: false` keep one shared module graph and connection across
 * files run sequentially, so the mongod binary boots once per run rather than per file.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    isolate: false,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The real `server-only` package throws when imported outside an RSC; stub it for node tests.
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
    },
  },
});
