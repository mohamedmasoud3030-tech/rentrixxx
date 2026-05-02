import { useCallback } from 'react';
import { AppContextType, Contract, Database, Settings, AppNotification } from '../types';
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
 * - Tenant and owner operations
 */
export const useOperationsCore = (
  db: Database,
  settings: Settings | null,
  refreshData: () => Promise<void>,
  onAudit: (action: string, entity: string, entityId: string, note?: string) => Promise<void>,
  logOperationTime: (op: string, time: number) => void,
  setIsDataStale: (stale: boolean) => void
) => {

  /**
   * Helper to convert string to UTC day milliseconds
   */
  const toUtcDayMs = (value?: string): number | null => {
    if (!value) return null;
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(parsed) ? parsed : null;
  };

  /**
   * Helper to convert value to number
   */
  const toNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  /**
   * Add a new contract
   */
  const addContract: AppContextType['operationsService']['addContract'] = useCallback(async (contract) => {
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

      await onAudit('CREATE', 'contracts', id, `Created contract for tenant`);
      const endTime = performance.now();
      logOperationTime('addContract', endTime - startTime);
      
      setIsDataStale(true);
      await refreshData();
      toast.success('تم إنشاء العقد بنجاح.');
      return id;
    } catch (err: unknown) {
      logger.error('[useOperationsCore] addContract error', err);
      toast.error('حدث خطأ أثناء إنشاء العقد: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
      throw err;
    }
  }, [onAudit, logOperationTime, setIsDataStale, refreshData]);

  /**
   * Update an existing contract
   */
  const updateContract: AppContextType['operationsService']['updateContract'] = useCallback(async (id, updates) => {
    const startTime = performance.now();
    try {
      const mappedUpdates = mapContractPayload(updates as Record<string, unknown>);
      const current = db?.contracts?.find(c => c.id === id);
      
      const nextTenantId = mappedUpdates.tenant_id ?? current?.tenantId;
      const nextUnitId = mappedUpdates.unit_id ?? current?.unitId;
      const nextStart = mappedUpdates.start_date ?? current?.start;
      const nextEnd = mappedUpdates.end_date ?? current?.end;

      if (!nextTenantId || !nextUnitId) {
        toast.error('لا يمكن تحديث العقد: بيانات المستأجر أو الوحدة غير مكتملة.');
        return;
      }

      const startMs = toUtcDayMs(nextStart);
      const endMs = toUtcDayMs(nextEnd);
      if (startMs === null || endMs === null || startMs > endMs) {
        toast.error('لا يمكن تحديث العقد: تاريخ البداية/النهاية غير صالح.');
        return;
      }

      const nextDueDay = mappedUpdates.due_day ?? current?.dueDay;
      if (!Number.isInteger(toNumber(nextDueDay)) || toNumber(nextDueDay) < 1 || toNumber(nextDueDay) > 31) {
        toast.error('لا يمكن تحديث العقد: يوم الاستحقاق يجب أن يكون بين 1 و 31.');
        return;
      }

      await supabaseData.update('contracts', id, {
        ...mappedUpdates,
        updated_at: Date.now(),
      });

      await onAudit('UPDATE', 'contracts', id, 'Updated contract details');
      const endTime = performance.now();
      logOperationTime('updateContract', endTime - startTime);
      
      setIsDataStale(true);
      await refreshData();
      toast.success('تم تحديث العقد بنجاح.');
    } catch (err: unknown) {
      logger.error('[useOperationsCore] updateContract error', err);
      toast.error('حدث خطأ أثناء تحديث العقد: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
    }
  }, [db, onAudit, logOperationTime, setIsDataStale, refreshData]);

  /**
   * Renew an existing contract
   */
  const renewContract: AppContextType['operationsService']['renewContract'] = useCallback(async (contractId, newEnd) => {
    const startTime = performance.now();
    try {
      const result = await renewContractAtomic(contractId, newEnd);
      if (!result.ok) throw new Error(String(result.details?.message || 'renewal failed'));

      await onAudit('RENEW', 'contracts', contractId, `Renewed until ${newEnd}`);
      const endTime = performance.now();
      logOperationTime('renewContract', endTime - startTime);
      
      setIsDataStale(true);
      await refreshData();
      toast.success('تم تجديد العقد بنجاح.');
    } catch (err: unknown) {
      logger.error('[useOperationsCore] renewContract error', err);
      toast.error('حدث خطأ أثناء تجديد العقد: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
    }
  }, [onAudit, logOperationTime, setIsDataStale, refreshData]);

  /**
   * Soft delete a contract
   */
  const deleteContract: AppContextType['operationsService']['deleteContract'] = useCallback(async (id) => {
    const startTime = performance.now();
    try {
      await softDeleteContract(id);
      await onAudit('DELETE', 'contracts', id, 'Soft deleted contract');
      
      const endTime = performance.now();
      logOperationTime('deleteContract', endTime - startTime);
      
      setIsDataStale(true);
      await refreshData();
      toast.success('تم حذف العقد بنجاح.');
    } catch (err: unknown) {
      logger.error('[useOperationsCore] deleteContract error', err);
      toast.error('حدث خطأ أثناء حذف العقد: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
    }
  }, [onAudit, logOperationTime, setIsDataStale, refreshData]);

  /**
   * Generate notifications for overdue invoices and expiring contracts
   */
  const generateNotifications = useCallback(async (): Promise<AppNotification[]> => {
    const startTime = performance.now();
    try {
      const notifications: AppNotification[] = [];

      if (!db?.invoices || !db?.contracts) {
        return notifications;
      }

      const now = new Date();
      const contractAlertDays = settings?.operational?.contractAlertDays || 30;

      // Check for overdue invoices
      for (const invoice of db.invoices) {
        if (invoice.status === 'OVERDUE' && invoice.paidAmount < invoice.amount) {
          const tenant = db.tenants?.find(t => t.id === invoice.tenantId);
          notifications.push({
            id: crypto.randomUUID(),
            type: 'INVOICE_OVERDUE',
            title: 'فاتورة متأخرة',
            message: `الفاتورة #${invoice.no} مستحقة للسيد/ة ${tenant?.name || 'المستأجر'}`,
            entityType: 'INVOICE',
            entityId: invoice.id,
            createdAt: Date.now(),
            isRead: false,
          });
        }
      }

      // Check for expiring contracts
      for (const contract of db.contracts) {
        const endDate = new Date(contract.end);
        const daysUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilEnd > 0 && daysUntilEnd <= contractAlertDays) {
          const tenant = db.tenants?.find(t => t.id === contract.tenantId);
          notifications.push({
            id: crypto.randomUUID(),
            type: 'CONTRACT_EXPIRING',
            title: 'عقد قريب الانتهاء',
            message: `عقد السيد/ة ${tenant?.name || 'المستأجر'} سينتهي خلال ${daysUntilEnd} يوم`,
            entityType: 'CONTRACT',
            entityId: contract.id,
            createdAt: Date.now(),
            isRead: false,
          });
        }
      }

      const endTime = performance.now();
      logOperationTime('generateNotifications', endTime - startTime);

      return notifications;
    } catch (err) {
      logger.error('[useOperationsCore] generateNotifications error', err);
      return [];
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
