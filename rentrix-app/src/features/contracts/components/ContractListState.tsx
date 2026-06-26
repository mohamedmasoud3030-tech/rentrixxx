import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ContractListState({
  error,
  hasContracts,
  isError,
  isLoading,
  onCreate,
  onRetry,
  resultsCount,
}: {
  error: unknown;
  hasContracts: boolean;
  isError: boolean;
  isLoading: boolean;
  onCreate: () => void;
  onRetry: () => void;
  resultsCount: number;
}) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="overflow-hidden">
        <div className="p-6">
          <EmptyState
            title="تعذر تحميل العقود"
            description={error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'}
            action={<Button onClick={onRetry}>إعادة المحاولة</Button>}
          />
        </div>
      </Card>
    );
  }

  if (resultsCount > 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        {hasContracts ? (
          <EmptyState title="لا توجد عقود مطابقة" description="جرّب تغيير عبارة البحث أو فلتر الحالة لعرض عقود أخرى." />
        ) : (
          <EmptyState
            title="لا توجد عقود"
            description="ابدأ بإنشاء أول عقد وربطه بالعقار والوحدة والمستأجر."
            action={
              <Button onClick={onCreate}>
                <FileText className="me-2 size-4" />إنشاء عقد
              </Button>
            }
          />
        )}
      </div>
    </Card>
  );
}
