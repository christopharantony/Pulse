import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label
        htmlFor={inputId}
        className="group flex w-fit cursor-pointer select-none items-center gap-2.5 text-sm text-muted-foreground"
      >
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            role="switch"
            className={cn(
              'peer absolute inset-0 m-0 size-full appearance-none rounded-full border border-border bg-surface-elevated transition-colors duration-base checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              className
            )}
            {...props}
          />
          <span className="pointer-events-none absolute left-1 size-4 rounded-full bg-foreground transition-transform duration-base peer-checked:translate-x-5" />
        </span>
        {label}
      </label>
    );
  }
);
Toggle.displayName = 'Toggle';
