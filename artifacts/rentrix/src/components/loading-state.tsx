import { translateSharedLabel } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';

export function RouteLoadingState() {
  return (
    <div className="space-y-6 p-6" aria-label={translateSharedLabel('routeLoadingAria')}>
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
