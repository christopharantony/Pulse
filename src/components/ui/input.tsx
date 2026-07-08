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
        <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
          {label}
        </label>
        <div className="relative flex items-center">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 flex text-slate-500 [&_svg]:size-[18px]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-11 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors duration-200 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30',
              icon && 'pl-10',
              trailing && 'pr-11',
              error && 'border-red-500/60 focus:border-red-400 focus:ring-red-400/20',
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
          {trailing && <span className="absolute right-3 flex items-center">{trailing}</span>}
        </div>
        {error && (
          <p className="animate-fade-in-up text-xs font-medium text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
