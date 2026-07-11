import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircleIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground shadow-glow hover:bg-accent-strong',
        secondary: 'bg-surface-elevated text-foreground hover:bg-surface-elevated/80',
        outline: 'border border-border bg-transparent text-foreground hover:border-muted',
        ghost: 'border border-border text-foreground hover:border-muted hover:bg-surface/50',
        destructive: 'bg-destructive-strong text-foreground hover:bg-destructive-strong/90',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 w-full px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11 shrink-0 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading = false, disabled, asChild = false, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {isLoading && <LoaderCircleIcon size={16} isAnimated={false} className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
