'use client';

import { useDeferredValue, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchInput } from '@/components/ui/search-input';
import { useSearchGoals } from '@/features/goals/hooks/use-search-goals';
import { GoalCategoryBadge } from '@/features/goals/components/goal-category-badge';

/** Debounced (via `useDeferredValue`) search-as-you-type with a results overlay. Mirrors `HabitSearch`. */
export function GoalSearch() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const { data: results = [], isFetching } = useSearchGoals(deferredQuery);
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
        placeholder="Search goals…"
        aria-label="Search goals"
      />
      {focused && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-popover mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-surface-elevated p-1 shadow-glow">
          {isFetching && <p className="p-3 text-caption text-muted-foreground">Searching…</p>}
          {!isFetching && results.length === 0 && (
            <p className="p-3 text-caption text-muted-foreground">No matching goals.</p>
          )}
          {results.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => router.push(`/goals/${goal.id}`)}
              className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-surface"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">
                {goal.icon ? `${goal.icon} ` : ''}
                {goal.title}
              </span>
              <GoalCategoryBadge category={goal.category} customLabel={goal.customCategoryLabel} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
