'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { SearchIcon, XIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <SearchIcon
          size={16}
          isAnimated={false}
          className="pointer-events-none absolute left-3 text-muted"
        />
        <input
          ref={ref}
          type="search"
          value={value}
          className={cn(
            'h-9 w-full rounded-md border border-border bg-surface/60 pl-9 pr-8 text-sm text-foreground placeholder:text-muted transition-colors duration-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 [&::-webkit-search-cancel-button]:appearance-none',
            className
          )}
          {...props}
        />
        {onClear && typeof value === 'string' && value.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2.5 flex text-muted transition-colors hover:text-muted-foreground"
          >
            <XIcon size={14} isAnimated={false} />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';
