import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { LoaderCircleIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60',
          variant === 'primary' &&
            'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 active:scale-[0.98]',
          variant === 'ghost' &&
            'border border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800/50 active:scale-[0.98]',
          className
        )}
        {...props}
      >
        {isLoading && (
          <LoaderCircleIcon size={16} isAnimated={false} className="animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
