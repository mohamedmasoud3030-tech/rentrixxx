import type { ReactNode } from 'react';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';

interface ListFilterBarProps {
  readonly search?: {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly placeholder?: string;
    readonly className?: string;
  };
  readonly filters?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}

export function ListFilterBar({ search, filters, actions, className }: Readonly<ListFilterBarProps>) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {search && (
          <SearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder ?? 'بحث...'}
            className={cn('flex-1 max-w-md', search.className)}
          />
        )}
        {filters && <div className="flex flex-wrap gap-2">{filters}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
