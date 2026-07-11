import { forwardRef, type InputHTMLAttributes } from 'react';
import { CheckIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
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
            type="checkbox"
            className={cn(
              'peer size-[18px] appearance-none rounded-md border border-border bg-surface/60 transition-colors duration-base checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              className
            )}
            {...props}
          />
          <CheckIcon
            size={13}
            isAnimated={false}
            className="pointer-events-none absolute text-accent-foreground opacity-0 peer-checked:opacity-100"
          />
        </span>
        {label}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
