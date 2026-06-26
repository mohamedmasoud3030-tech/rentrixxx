import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Reusable page header — title + optional subtitle + optional action button.
 * Replaces the repeated "flex items-center justify-between" pattern on every page.
 *
 * @example
 * <PageHeader
 *   title="العقارات"
 *   description="إدارة جميع العقارات والوحدات"
 *   action={<Button onClick={openForm}><Plus /> إضافة عقار</Button>}
 * />
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-xl font-black tracking-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
