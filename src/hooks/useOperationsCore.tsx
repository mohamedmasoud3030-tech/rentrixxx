import { useCallback } from 'react';
import { Database, Settings, AppNotification, NotificationType } from '../types';
import { supabaseData } from '../services/supabaseDataService';
import { renewContractAtomic } from '../services/operationsService';
import { softDeleteContract } from '../services/operationsService';
import { mapContractPayload } from '../mappers/contractMapper';
import { toast } from 'react-hot-toast';
import { logger } from '../services/logger';

/**
 * useOperationsCore Hook
 * 
 * Manages all operations-related logic including:
 * - Contract management (add, update, renew, delete)
 * - Notifications generation
 */
export const useOperationsCore = (
  db: Database,
  settings: Settings | null,
  refreshData: () => Promise<void>,
  onAudit: (action: string, entity: string, entityId: string, note?: string) => Promise<void>,
  logOperationTime: (op: string, time: number) => void,
  setIsDataStale: (stale: boolean) => void
) => {

  const toUtcDayMs = (value?: string): number | null => {
    if (!value) return null;
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const toNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const addContract = useCallback(async (contract: any) => {
    const startTime = performance.now();
    try {
      const id = crypto.randomUUID();
      const mapped = mapContractPayload(contract as Record<string, unknown>);
      
      await supabaseData.insert('contracts', {
        id,
        ...mapped,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      await onAudit('CREATE', 'contracts', id, `Created contract`);
      const endTime = performance.now();
      logOperationTime('gateChecks', endTime - startTime); // Using gateChecks as placeholder
      
      setIsDataStale(true);
      await refreshData();
      toast.success('تم إنشاء العقد بنجاح.');
      return id;
    } catch (err: unknown) {
      logger.error('[useOperationsCore] addContract error', err);
      toast.error('حدث خطأ أثناء إنشاء العقد');
      throw err;
    }
  }, [onAudit, logOperationTime, setIsDataStale, refreshData]);

  const updateContract = useCallback(async (id: string, updates: any) => {
    const startTime = performance.now();
    try {
      const mappedUpdates = mapContractPayload(typeof updates === 'string' ? JSON.parse(updates) : updates as Record<string, unknown>);
      const current = db?.contracts?.find(c => c.id === id);
      
      const nextTenantId = mappedUpdates.tenant_id ?? (current as any)?.tenantId;
      const nextUnitId = mappedUpdates.unit_id ?? (current as any)?.unitId;
      const nextStart = mappedUpdates.start_date ?? current?.start;
      const nextEnd = mappedUpdates.end_date ?? current?.end;

      if (!nextTenantId || !nextUnitId) {
        toast.error('بيانات غير مكتملة.');
        return;
      }

      await supabaseData.update('contracts', id, {
        ...mappedUpdates,
        updated_at: Date.now(),
      });

      await onAudit('UPDATE', 'contracts', id, 'Updated contract');
      const endTime = performance.now();
      logOperationTime('gateChecks', endTime - startTime);
      
      setIsDataStale(true);
      await refreshData();
      toast.success('تم تحديث العقد بنجاح.');
    } catch (err: unknown) {
      logger.error('[useOperationsCore] updateContract error', err);
    }
  }, [db, onAudit, logOperationTime, setIsDataStale, refreshData]);

  const renewContract = useCallback(async (contractId: string, newEnd: string) => {
    const startTime = performance.now();
    try {
      const result = await renewContractAtomic(contractId, { end_date: newEnd });
      if (!(result as any).ok) throw new Error('renewal failed');

      await onAudit('RENEW', 'contracts', contractId, `Renewed until ${newEnd}`);
      const endTime = performance.now();
      logOperationTime('gateChecks', endTime - startTime);
      
      setIsDataStale(true);
      await refreshData();
      toast.success('تم تجديد العقد بنجاح.');
    } catch (err: unknown) {
      logger.error('[useOperationsCore] renewContract error', err);
    }
  }, [onAudit, logOperationTime, setIsDataStale, refreshData]);

  const deleteContract = useCallback(async (id: string) => {
    const startTime = performance.now();
    try {
      await softDeleteContract(id);
      await onAudit('DELETE', 'contracts', id, 'Soft deleted contract');
      
      const endTime = performance.now();
      logOperationTime('gateChecks', endTime - startTime);
      
      setIsDataStale(true);
      await refreshData();
      toast.success('تم حذف العقد بنجاح.');
    } catch (err: unknown) {
      logger.error('[useOperationsCore] deleteContract error', err);
    }
  }, [onAudit, logOperationTime, setIsDataStale, refreshData]);

  const generateNotifications = useCallback(async (): Promise<number> => {
    const startTime = performance.now();
    try {
      if (!db?.invoices || !db?.contracts) return 0;
      let count = 0;
      const now = new Date();
      const contractAlertDays = settings?.operational?.contractAlertDays || 30;

      for (const invoice of db.invoices) {
        if (invoice.status === 'OVERDUE' && invoice.paidAmount < invoice.amount) {
          count++;
        }
      }

      for (const contract of db.contracts) {
        const endDate = new Date(contract.end);
        const daysUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilEnd > 0 && daysUntilEnd <= contractAlertDays) {
          count++;
        }
      }

      const endTime = performance.now();
      logOperationTime('gateChecks', endTime - startTime);
      return count;
    } catch (err) {
      logger.error('[useOperationsCore] generateNotifications error', err);
      return 0;
    }
  }, [db, settings, logOperationTime]);

  return {
    addContract,
    updateContract,
    renewContract,
    deleteContract,
    generateNotifications,
  };
};
