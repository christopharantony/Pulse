export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/env.server');
    const { ensureIndexes } = await import('@/db/client');
    await ensureIndexes();
  }
}
