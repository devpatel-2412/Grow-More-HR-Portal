import { cn } from '../../utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-[var(--muted)]', className)} />;
}

export function PageLoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
      <div className="w-full max-w-md space-y-4 p-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
