import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  rows?: number;
  className?: string;
}

/**
 * Full-page skeleton loader — used while a page's primary data is fetching.
 * Shows a header bar + configurable number of row skeletons.
 *
 * @example
 * if (isLoading) return <LoadingScreen rows={6} />;
 */
export function LoadingScreen({ rows = 5, className }: LoadingScreenProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
