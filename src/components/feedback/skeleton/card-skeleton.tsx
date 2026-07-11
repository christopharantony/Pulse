import { Skeleton } from './skeleton';

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface/50 p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
