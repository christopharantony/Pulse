import type { ReactNode } from 'react';
import { TriangleAlertIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  code?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({ code, title, description, action, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-6 py-16 text-center animate-fade-in-up',
        className
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlertIcon size={26} isAnimated={false} />
      </span>
      {code && <p className="text-label text-muted-foreground">{code}</p>}
      <p className="text-h2 text-foreground">{title}</p>
      {description && <p className="max-w-sm text-small text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
