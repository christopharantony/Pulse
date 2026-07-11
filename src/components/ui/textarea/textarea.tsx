import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, rows = 4, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-label text-muted-foreground">
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            'w-full resize-y rounded-md border border-border bg-surface/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors duration-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30',
            error && 'border-destructive-strong/60 focus:border-destructive focus:ring-destructive/20',
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <p className="animate-fade-in-up text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
