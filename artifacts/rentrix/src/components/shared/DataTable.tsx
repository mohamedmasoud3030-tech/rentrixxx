import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Column<T> = Readonly<{
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}>;

type DataTableProps<T> = Readonly<{
  rows: readonly T[];
  columns: ReadonlyArray<Column<T>>;
  keyOf: (row: T) => string;
  empty?: ReactNode;
  caption?: string;
  isLoading?: boolean;
  loadingLabel?: string;
  className?: string;
  tableClassName?: string;
  rowClassName?: (row: T) => string | undefined;
}>;

export function DataTable<T>({
  rows,
  columns,
  keyOf,
  empty,
  caption,
  isLoading = false,
  loadingLabel = 'جارٍ تحميل البيانات...',
  className,
  tableClassName,
  rowClassName,
}: DataTableProps<T>) {
  if (isLoading) {
    return <div className={cn('rounded border border-dashed p-6 text-center text-sm text-muted-foreground', className)}>{loadingLabel}</div>;
  }

  if (!rows.length) return <>{empty ?? null}</>;

  return (
    <div className={cn('overflow-x-auto rounded border', className)}>
      <table className={cn('w-full min-w-max text-start', tableClassName)}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>{columns.map((column) => <th key={column.key} className={cn('whitespace-nowrap border-b px-3 py-2 text-sm font-bold', column.className)}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => <tr key={keyOf(row)} className={rowClassName?.(row)}>{columns.map((column) => <td key={column.key} className={cn('border-b px-3 py-2 text-sm', column.className)}>{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
