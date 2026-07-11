'use client';

import { cn } from '@/lib/utils';

export interface DocsNavItem {
  id: string;
  label: string;
}

interface DocsNavProps {
  groups: { label: string; items: DocsNavItem[] }[];
}

export function DocsNav({ groups }: DocsNavProps) {
  return (
    <nav className="sticky top-24 hidden w-52 shrink-0 flex-col gap-6 self-start lg:flex">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <p className="px-2 text-caption font-medium uppercase tracking-[0.1em] text-muted">
            {group.label}
          </p>
          {group.items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                'rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-base hover:bg-surface/60 hover:text-foreground'
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
