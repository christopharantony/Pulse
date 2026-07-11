import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';

export const alertVariants = cva('flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm', {
  variants: {
    variant: {
      info: 'border-accent/30 bg-accent/10 text-accent',
      success: 'border-success/30 bg-success/10 text-success',
      warning: 'border-warning/30 bg-warning/10 text-warning',
      destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: { variant: 'info' },
});

const iconMap = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  destructive: TriangleAlertIcon,
} as const;

interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', title, children, ...props }, ref) => {
    const Icon = iconMap[variant ?? 'info'];

    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
        <Icon size={18} isAnimated={false} className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-0.5">
          {title && <p className="font-medium">{title}</p>}
          {children && <div className="text-muted-foreground">{children}</div>}
        </div>
      </div>
    );
  }
);
Alert.displayName = 'Alert';
