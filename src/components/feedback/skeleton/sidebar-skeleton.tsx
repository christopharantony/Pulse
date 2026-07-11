import { Skeleton } from './skeleton';

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="size-5 shrink-0 rounded-md" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}
