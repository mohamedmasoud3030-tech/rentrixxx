import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function BulkActionsBar({
  selectedCount,
  selectionLabel,
  actions,
  onClear,
}: Readonly<{
  selectedCount: number;
  selectionLabel: string;
  actions?: ReactNode;
  onClear?: () => void;
}>) {
  if (selectedCount <= 0) return null;

  return (
    <div className="surface-card sticky bottom-20 z-20 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between lg:bottom-6">
      <p className="text-sm font-bold text-foreground">{selectionLabel}</p>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {onClear ? (
          <Button variant="ghost" onClick={onClear}>
            إلغاء التحديد
          </Button>
        ) : null}
      </div>
    </div>
  );
}
