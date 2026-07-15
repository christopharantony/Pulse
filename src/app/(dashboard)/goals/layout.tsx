'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GoalSearch } from '@/features/goals/components/goal-search';

const VIEWS = [
  { label: 'Active', href: '/goals' },
  { label: 'All', href: '/goals/all' },
  { label: 'Archived', href: '/goals/archived' },
  { label: 'Trash', href: '/goals/trash' },
];

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Goal views"
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
                  active ? 'bg-surface-elevated text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {view.label}
              </Link>
            );
          })}
        </nav>
        <div className="w-64">
          <GoalSearch />
        </div>
      </div>
      {children}
    </div>
  );
}
