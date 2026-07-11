import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label
        htmlFor={inputId}
        className="group flex w-fit cursor-pointer select-none items-center gap-2.5 text-sm text-muted-foreground"
      >
        <span className="relative flex size-[18px] shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            className={cn(
              'peer size-[18px] appearance-none rounded-full border border-border bg-surface/60 transition-colors duration-base checked:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              className
            )}
            {...props}
          />
          <span className="pointer-events-none absolute size-2 scale-0 rounded-full bg-accent transition-transform duration-base peer-checked:scale-100" />
        </span>
        {label}
      </label>
    );
  }
);
Radio.displayName = 'Radio';
