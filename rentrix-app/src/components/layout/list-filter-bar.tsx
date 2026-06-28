import type { ReactNode } from 'react';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';

interface ListFilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
  };
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ListFilterBar({ search, filters, actions, className }: ListFilterBarProps) {
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
