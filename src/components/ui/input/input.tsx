import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, trailing, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-label text-muted-foreground">
          {label}
        </label>
        <div className="relative flex items-center">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 flex text-muted [&_svg]:size-[18px]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-11 w-full rounded-md border border-border bg-surface/60 px-3.5 text-sm text-foreground placeholder:text-muted transition-colors duration-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30',
              icon && 'pl-10',
              trailing && 'pr-11',
              error && 'border-destructive-strong/60 focus:border-destructive focus:ring-destructive/20',
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
          {trailing && <span className="absolute right-3 flex items-center">{trailing}</span>}
        </div>
        {error && <p className="animate-fade-in-up text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
