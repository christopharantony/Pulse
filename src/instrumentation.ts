export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/env.server');
    // Composes index creation across the auth collections and every domain (idempotent).
    const { ensureAllIndexes } = await import('@/db/indexes');
    await ensureAllIndexes();
  }
}
