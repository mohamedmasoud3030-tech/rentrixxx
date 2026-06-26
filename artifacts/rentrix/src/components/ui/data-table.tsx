import { LoaderCircle } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type DataTableProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyState?: ReactNode;
};

/**
 * Standard table surface for the application.
 * It keeps wide tables usable on narrow screens without constraining columns.
 */
export function DataTable({
  children,
  className,
  isLoading = false,
  isEmpty = false,
  emptyState = 'لا توجد بيانات لعرضها.',
  role = 'region',
  'aria-label': ariaLabel = 'جدول البيانات',
  ...props
}: DataTableProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      aria-busy={isLoading || undefined}
      className={cn('overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    >
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 px-4 text-sm font-bold text-muted-foreground" aria-live="polite">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          جارٍ تحميل البيانات…
        </div>
      ) : isEmpty ? (
        <div className="flex min-h-40 items-center justify-center px-4 text-center text-sm font-bold text-muted-foreground">
          {emptyState}
        </div>
      ) : (
        <div className="mobile-scroll-x">{children}</div>
      )}
    </div>
  );
}
