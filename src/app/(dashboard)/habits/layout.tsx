'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { HabitSearch } from '@/features/habits/components/habit-search';

const VIEWS = [
  { label: 'Today', href: '/habits' },
  { label: 'All', href: '/habits/all' },
  { label: 'Archived', href: '/habits/archived' },
  { label: 'Trash', href: '/habits/trash' },
];

export default function HabitsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Habit views"
          className="flex flex-wrap items-center gap-1 rounded-md border border-border-subtle bg-surface/40 p-1"
        >
          {VIEWS.map((view) => {
            const active = pathname === view.href;
            return (
              <Link
                key={view.href}
                href={view.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-base',
                  active
                    ? 'bg-surface-elevated text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {view.label}
              </Link>
            );
          })}
        </nav>
        <div className="w-64">
          <HabitSearch />
        </div>
      </div>
      {children}
    </div>
  );
}
