import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Database, Settings, Contract, AppContextType } from '../../types';
import { softDeleteContract, renewContractAtomic } from '../../services/operationsService';
import { operationsFacade } from '@/domain/operations/operations.facade';
import { confirmDialog } from '../../components/shared/confirmDialog';
import { supabaseData } from '../../services/supabaseDataService';
import { runManualAutomation as runManualAutomationService } from '../../services/automationService';

export const useOperationsHook = (
  db: Database | null,
  settings: Settings | null,
  isReadOnly: boolean,
  refreshData: () => Promise<void>,
  audit: (action: string, table: string, id: string, details?: string) => Promise<void>,
  setIsDataStale: (stale: boolean) => void,
  logOperationTime: (op: string, time: number) => void
) => {

  const generateMonthlyInvoices = useCallback(async () => {
    if (!settings || !db) return 0;
    const startTime = performance.now();
    const result = await runManualAutomationService(db, settings, {
      invoices: true,
      lateFees: false,
      notifications: false,
      snapshots: false,
    });

    const endTime = performance.now();
    if (result.success) {
      logOperationTime('generateInvoices', endTime - startTime);
      await refreshData();
      return 0;
    }
    throw new Error(result.errors.join(' | ') || 'تعذر توليد الفواتير تلقائياً.');
  }, [db, logOperationTime, settings, refreshData]);

  const removeContract = useCallback(async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف العقد؟ سيتم إخفاؤه فقط (حذف منطقي) ولا يمكن استرجاعه من الواجهة.',
      confirmLabel: 'حذف العقد',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      const result = await softDeleteContract(id);
      if (!result.success) {
        const blockedMessage = result.blockedBy
          ? 'لا يمكن حذف العقد — يوجد فواتير أو مدفوعات مرتبطة.'
          : (result.error || 'تعذر حذف العقد.');
        toast.error(blockedMessage);
        return;
      }

      await audit('SOFT_DELETE', 'contracts', id);
      await refreshData();
      toast.success('تم حذف العقد بنجاح (حذف منطقي).');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء محاولة الحذف.';
      console.error('Delete error:', error);
      toast.error(message);
    }
  }, [audit, refreshData]);

  const renewContract = useCallback(async (oldContractId: string, newContract: Partial<Contract>) => {
    try {
      const result = await renewContractAtomic(oldContractId, newContract as Contract);
      if (!result.success) throw new Error(result.error || 'فشل تجديد العقد');
      
      await audit('RENEW', 'contracts', oldContractId, `Renewed to ${result.oldContractId}`);
      await refreshData();
      toast.success('تم تجديد العقد بنجاح.');
      return result.oldContractId;
    } catch (err: any) {
      toast.error(err.message || 'فشل تجديد العقد');
      return null;
    }
  }, [audit, refreshData]);

  return {
    generateMonthlyInvoices,
    removeContract,
    renewContract,
  };
};
