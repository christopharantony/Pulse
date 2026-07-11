import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-subtle px-6 py-12 text-center',
        className
      )}
    >
      {icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-elevated text-muted [&_svg]:size-6">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-h3 text-foreground">{title}</p>
        {description && <p className="text-small text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
