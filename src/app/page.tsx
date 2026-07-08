import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">Pulse</p>
          <h1 className="text-4xl font-semibold sm:text-6xl">
            Build momentum with a scalable productivity foundation.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Pulse is being structured for future growth with a feature-first architecture, clean
            boundaries, and production-ready infrastructure.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/register"
            className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
