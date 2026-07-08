import Link from 'next/link';
import { ActivityIcon } from '@animateicons/react/lucide';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"
        />

        <Link href="/" className="relative z-10 flex items-center gap-2 text-slate-100">
          <ActivityIcon size={22} className="text-cyan-400" />
          <span className="text-lg font-semibold tracking-tight">Pulse</span>
        </Link>

        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="text-3xl font-semibold leading-tight text-slate-100">
            Build momentum with a scalable productivity foundation.
          </h2>
          <p className="text-base text-slate-400">
            A feature-first architecture with production-ready authentication, built to grow with
            every phase of Pulse.
          </p>
        </div>

        <p className="relative z-10 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Pulse. All rights reserved.
        </p>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in-up">
          <Link href="/" className="mb-10 flex items-center gap-2 text-slate-100 lg:hidden">
            <ActivityIcon size={22} className="text-cyan-400" />
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
