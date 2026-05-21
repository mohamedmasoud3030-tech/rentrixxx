import { useParams } from '@tanstack/react-router';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { useCompanySettingsContract } from '../settings/useCompanySettings';
import { ContractDetailView } from './components/ContractDetailView';
import { useContract } from './useContracts';

function getContractDetailErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل العقد.';
}

export function ContractDetailPage() {
  const { contractId } = useParams({ strict: false }) as { contractId: string };
  const contractQuery = useContract(contractId);
  const companySettings = useCompanySettingsContract();

  if (contractQuery.isLoading) return <RouteLoadingState />;
  if (contractQuery.isError) return <EmptyState title="تعذر تحميل العقد" description={getContractDetailErrorMessage(contractQuery.error)} action={<Button type="button" onClick={() => contractQuery.refetch()}>إعادة المحاولة</Button>} />;
  if (!contractQuery.data) return <EmptyState title="العقد غير موجود" description="ربما تم حذف العقد أو لا تملك صلاحية الوصول إليه." />;

  return <ContractDetailView contract={contractQuery.data} companySettings={companySettings} />;
}
