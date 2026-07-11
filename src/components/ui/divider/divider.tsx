import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        'border-border-subtle',
        orientation === 'horizontal' ? 'w-full border-t' : 'h-full border-l',
        className
      )}
      {...props}
    />
  )
);
Divider.displayName = 'Divider';
