import { supabase } from './supabase';
import type { Contract, MaintenanceRecord } from '../types';


export interface AutomationSummary {
  invoicesCreated: number;
  lateFeesApplied: number;
  notificationsCreated: number;
  errors: string[];
}

export const buildAutomationSummary = (
  invoicesCreated: number,
  lateFeesApplied: number,
  notificationsCreated: number,
): AutomationSummary => ({
  invoicesCreated,
  lateFeesApplied,
  notificationsCreated,
  errors: [],
});

export const renewContractState = (contract: Contract, nextEndDate: string): Contract => ({
  ...contract,
  end: nextEndDate,
  status: 'ACTIVE',
  updatedAt: Date.now(),
});

export const suspendContractState = (contract: Contract): Contract => ({
  ...contract,
  status: 'SUSPENDED',
  updatedAt: Date.now(),
});

export const terminateContractState = (contract: Contract, endDate: string): Contract => ({
  ...contract,
  end: endDate,
  status: 'ENDED',
  updatedAt: Date.now(),
});

export interface RenewContractAtomicResult {
  success: boolean;
  oldContractId?: string;
  newContractId?: string;
  error?: string;
}

type RenewContractAtomicRpcResponse = {
  success?: boolean;
  old_contract_id?: string;
  new_contract_id?: string;
  error?: string;
};

export async function renewContractAtomic(
  oldContractId: string,
  newContract: Record<string, unknown>,
): Promise<RenewContractAtomicResult> {
  const { data, error } = await supabase.rpc('renew_contract_atomic', {
    p_old_contract_id: oldContractId,
    p_new_contract: newContract,
  });

  if (error) {
    return {
      success: false,
      oldContractId,
      error: error.message || 'فشل تنفيذ تجديد العقد.',
    };
  }

  const payload = (data || {}) as RenewContractAtomicRpcResponse;
  if (!payload.success) {
    return {
      success: false,
      oldContractId: payload.old_contract_id || oldContractId,
      newContractId: payload.new_contract_id,
      error: payload.error || 'فشل تنفيذ تجديد العقد.',
    };
  }

  return {
    success: true,
    oldContractId: payload.old_contract_id || oldContractId,
    newContractId: payload.new_contract_id,
  };
}

export const transitionMaintenanceStatus = (
  current: MaintenanceRecord['status'],
  next: MaintenanceRecord['status'],
): MaintenanceRecord['status'] => {
  const allowed: Record<MaintenanceRecord['status'], MaintenanceRecord['status'][]> = {
    PENDING: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: ['COMPLETED'],
    CANCELLED: ['CANCELLED'],
  };

  return allowed[current]?.includes(next) ? next : current;
};

export interface UpdateMaintenanceStatusExtra {
  currentStatus: MaintenanceRecord['status'];
  cancellationReason?: string;
  actor?: {
    userId: string;
    username: string;
  };
}

export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceRecord['status'],
  extra?: UpdateMaintenanceStatusExtra,
): Promise<{ success: boolean; error?: string }> {
  const currentStatus = extra?.currentStatus;
  if (!currentStatus) {
    return { success: false, error: 'الحالة الحالية مطلوبة للتحقق من انتقال الحالة.' };
  }

  const transitioned = transitionMaintenanceStatus(currentStatus, status);
  if (transitioned !== status) {
    return { success: false, error: 'انتقال حالة الصيانة غير مسموح.' };
  }

  const updates: Partial<MaintenanceRecord> = { status };
  if (status === 'COMPLETED') {
    updates.completedAt = Date.now();
    updates.cancelledAt = undefined;
    updates.cancellationReason = undefined;
  } else if (status === 'CANCELLED') {
    updates.cancelledAt = new Date().toISOString();
    updates.cancellationReason = (extra?.cancellationReason || '').trim() || 'تم الإلغاء بدون سبب محدد';
  }

  const { error } = await supabase.from('maintenance_records').update(updates).eq('id', id);
  if (error) {
    return { success: false, error: error.message || 'تعذر تحديث حالة الصيانة.' };
  }

  const actor = extra?.actor;
  const { error: auditError } = await supabase.from('audit_log').insert({
    id: crypto.randomUUID(),
    ts: Date.now(),
    user_id: actor?.userId || 'system',
    username: actor?.username || 'system',
    action: 'MAINTENANCE_STATUS_UPDATED',
    entity: 'maintenance',
    entity_id: id,
    note: `Maintenance status changed from ${currentStatus} to ${status}`,
  });

  if (auditError) {
    return { success: false, error: auditError.message || 'تم تحديث الحالة ولكن فشل تسجيل الأثر.' };
  }

  return { success: true };
}

export const getMaintenanceSummary = (records: MaintenanceRecord[]) => {
  return records.reduce(
    (summary, record) => {
      const amount = record.actualCost ?? record.cost ?? record.estimatedCost ?? 0;
      if (record.status === 'PENDING') summary.pending += 1;
      if (record.status === 'IN_PROGRESS') summary.inProgress += 1;
      if (record.status === 'COMPLETED') summary.completed += 1;
      if (record.status === 'CANCELLED') summary.cancelled += 1;
      summary.totalCost += amount;
      if (record.chargedTo === 'OWNER') summary.ownerCost += amount;
      if (record.chargedTo === 'TENANT') summary.tenantCost += amount;
      if (record.chargedTo === 'OFFICE') summary.officeCost += amount;
      return summary;
    },
    {
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalCost: 0,
      ownerCost: 0,
      tenantCost: 0,
      officeCost: 0,
    },
  );
};

export interface MaintenanceBlockResult {
  blocked: boolean;
  count: number;
  requests: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
  }>;
}

export async function checkUnitMaintenanceBlock(unitId: string): Promise<MaintenanceBlockResult> {
  if (!supabase) {
    return { blocked: false, count: 0, requests: [] };
  }

  const { data, error } = await supabase.rpc('check_unit_maintenance_block', {
    p_unit_id: unitId,
  });

  if (error) {
    throw new Error(error.message || 'تعذر التحقق من طلبات الصيانة.');
  }

  const payload = (data || {}) as Partial<MaintenanceBlockResult>;
  return {
    blocked: payload.blocked === true,
    count: Number(payload.count || 0),
    requests: Array.isArray(payload.requests) ? payload.requests : [],
  };
}


export interface SoftDeleteResult {
  success: boolean;
  error?: string;
  blockedBy?: 'invoices' | 'receipts' | 'both';
}

export interface TerminateContractResult {
  success: boolean;
  error?: string;
}

export async function terminateContract(contractId: string, reason: string): Promise<TerminateContractResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase client unavailable.' };
  }

  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    return { success: false, error: 'سبب الإنهاء مطلوب.' };
  }

  const { count: unpaidInvoices, error: unpaidInvoicesError } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('contract_id', contractId)
    .neq('status', 'PAID');

  if (unpaidInvoicesError) {
    return { success: false, error: unpaidInvoicesError.message || 'تعذر التحقق من الفواتير.' };
  }

  if ((unpaidInvoices ?? 0) > 0) {
    return { success: false, error: 'لا يمكن إنهاء العقد لوجود فواتير غير مسددة.' };
  }

  const terminatedAt = new Date().toISOString();
  const updatePayload = {
    status: 'TERMINATED',
    terminated_at: terminatedAt,
    termination_reason: normalizedReason,
    updated_at: Date.now(),
  };

  const { error: updateError } = await supabase
    .from('contracts')
    .update(updatePayload)
    .eq('id', contractId);

  if (updateError) {
    return { success: false, error: updateError.message || 'تعذر إنهاء العقد.' };
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    id: crypto.randomUUID(),
    ts: Date.now(),
    user_id: 'system',
    username: 'system',
    action: 'TERMINATE_CONTRACT',
    entity: 'contracts',
    entity_id: contractId,
    note: normalizedReason,
  });

  if (auditError) {
    return {
      success: false,
      error: auditError.message || 'تم إنهاء العقد ولكن فشل تسجيل السجل الرقابي.',
    };
  }

  return { success: true };
}

export async function softDeleteContract(contractId: string): Promise<SoftDeleteResult> {
  const [{ count: invoiceCount, error: invoicesError }, { count: receiptCount, error: receiptsError }] = await Promise.all([
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('contract_id', contractId),
    supabase.from('receipts').select('id', { count: 'exact', head: true }).eq('contract_id', contractId),
  ]);

  if (invoicesError || receiptsError) {
    return {
      success: false,
      error: invoicesError?.message || receiptsError?.message || 'تعذر التحقق من ارتباطات العقد.',
    };
  }

  const hasInvoices = (invoiceCount ?? 0) > 0;
  const hasReceipts = (receiptCount ?? 0) > 0;

  if (hasInvoices || hasReceipts) {
    const blockedBy: SoftDeleteResult['blockedBy'] = hasInvoices && hasReceipts
      ? 'both'
      : hasInvoices
        ? 'invoices'
        : 'receipts';

    return {
      success: false,
      blockedBy,
      error: 'لا يمكن حذف العقد — يوجد فواتير أو مدفوعات مرتبطة.',
    };
  }

  const { error } = await supabase
    .from('contracts')
    .update({ deleted_at: new Date().toISOString(), updated_at: Date.now() })
    .eq('id', contractId)
    .is('deleted_at', null);

  if (error) {
    return { success: false, error: error.message || 'تعذر حذف العقد.' };
  }

  return { success: true };
}
