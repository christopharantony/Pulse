'use client';

import { useDeferredValue, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchInput } from '@/components/ui/search-input';
import { useSearchHabits } from '@/features/habits/hooks/use-search-habits';
import { HabitTypeBadge } from '@/features/habits/components/habit-type-badge';

/** Debounced (via `useDeferredValue`) search-as-you-type with a results overlay. */
export function HabitSearch() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const { data: results = [], isFetching } = useSearchHabits(deferredQuery);
  const router = useRouter();
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search habits…"
        aria-label="Search habits"
      />
      {focused && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-popover mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-surface-elevated p-1 shadow-glow">
          {isFetching && <p className="p-3 text-caption text-muted-foreground">Searching…</p>}
          {!isFetching && results.length === 0 && (
            <p className="p-3 text-caption text-muted-foreground">No matching habits.</p>
          )}
          {results.map((habit) => (
            <button
              key={habit.id}
              type="button"
              onClick={() => router.push(`/habits/${habit.id}`)}
              className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-surface"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">
                {habit.icon ? `${habit.icon} ` : ''}
                {habit.name}
              </span>
              <HabitTypeBadge type={habit.type} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
