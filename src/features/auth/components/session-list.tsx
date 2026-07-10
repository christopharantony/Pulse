'use client';

import { GlobeIcon, LoaderCircleIcon, ShieldXIcon, Trash2Icon } from '@animateicons/react/lucide';
import { useSessions } from '@/features/auth/hooks/use-sessions';
import { useRevokeSession } from '@/features/auth/hooks/use-revoke-session';
import { extractApiErrorMessage } from '@/features/auth/utils/extract-api-error';
import type { SessionDto } from '@/features/auth/types';

// No UA-parser dependency — just enough string sniffing to give a friendly device/browser label.
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Browser';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Mac OS/.test(userAgent)
      ? 'macOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad/.test(userAgent)
          ? 'iOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}`;
}

function SessionRow({ session }: { session: SessionDto }) {
  const revokeSession = useRevokeSession();

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
          <GlobeIcon size={16} />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
            {describeDevice(session.userAgent)}
            {session.isCurrent && (
              <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-300">
                This device
              </span>
            )}
          </p>
          <p className="truncate text-xs text-slate-500">
            {session.ipAddress ?? 'Unknown IP'} · last active{' '}
            {new Date(session.lastUsedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {!session.isCurrent && (
        <button
          type="button"
          onClick={() => revokeSession.mutate(session.id)}
          disabled={revokeSession.isPending}
          aria-label="Sign out this device"
          className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60"
        >
          <Trash2Icon size={16} />
        </button>
      )}
    </div>
  );
}

export function SessionList() {
  const { data: sessions, isLoading, isError, error } = useSessions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoaderCircleIcon size={24} className="animate-spin text-cyan-400" isAnimated={false} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
        <ShieldXIcon size={18} className="shrink-0" />
        <span>{extractApiErrorMessage(error, 'Unable to load sessions')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions?.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </div>
  );
}
