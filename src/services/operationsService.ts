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
    OPEN: ['IN_PROGRESS', 'DONE', 'CANCELED'],
    IN_PROGRESS: ['DONE', 'CANCELED'],
    DONE: ['DONE'],
    CANCELED: ['CANCELED'],
  };

  return allowed[current]?.includes(next) ? next : current;
};


export interface SoftDeleteResult {
  success: boolean;
  error?: string;
  blockedBy?: 'invoices' | 'receipts' | 'both';
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
