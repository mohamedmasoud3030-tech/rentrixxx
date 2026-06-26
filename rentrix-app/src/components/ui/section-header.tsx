import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Small header used inside cards and sections — title + optional link/action.
 * Replaces the repeated `mb-3 flex items-center justify-between` pattern.
 *
 * @example
 * <SectionHeader
 *   title="العقود المنتهية قريباً"
 *   action={<Link to="/contracts">عرض الكل</Link>}
 * />
 */
export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-2', className)}>
      <p className="text-sm font-bold">{title}</p>
      {action && <div className="text-xs font-bold text-primary">{action}</div>}
    </div>
  );
}
