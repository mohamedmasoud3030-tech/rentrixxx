import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AutomationResult } from '../../../src/types/automation.ts';
import type { AutomationRunsRow } from '../../../src/types/database.ts';
import {
  defaultAutomationConfig,
  executeAutomationTasks,
  type AutomationTaskConfig,
} from '../../../src/services/automationCore.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type ContractRow = {
  id: string;
  status: string;
  end_date: string;
  due_day: number | null;
  rent_amount: number;
};

type InvoiceRow = {
  id: string;
  no: string;
  contract_id: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  type: string;
  related_invoice_id: string | null;
};

type AppNotificationRow = {
  id: string;
  link: string;
  title: string;
  type: string;
};

const getSettings = async (): Promise<Record<string, unknown>> => {
  const { data, error } = await adminClient.from('settings').select('data').eq('id', 1).single();
  if (error || !data?.data) throw new Error('تعذر تحميل إعدادات النظام');
  return data.data as Record<string, unknown>;
};

const isRentOverdue = (invoice: InvoiceRow): boolean => {
  if (invoice.type !== 'RENT') return false;
  if (invoice.status === 'OVERDUE') return true;
  return invoice.status === 'UNPAID' && new Date(invoice.due_date) < new Date();
};

const autoGenerateMonthlyInvoices = async (): Promise<number> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const today = now.toISOString().slice(0, 10);

  const { data: contracts, error: contractsError } = await adminClient
    .from('contracts')
    .select('id,status,end_date,due_day,rent_amount')
    .eq('status', 'ACTIVE');
  if (contractsError) throw contractsError;

  const activeContracts = (contracts || []).filter((c: ContractRow) => c.end_date >= today);
  if (activeContracts.length === 0) return 0;

  const { data: invoices, error: invoicesError } = await adminClient
    .from('invoices')
    .select('contract_id,due_date,type')
    .eq('type', 'RENT')
    .like('due_date', `${monthKey}%`);
  if (invoicesError) throw invoicesError;

  const existingContractIds = new Set((invoices || []).map((inv: { contract_id: string }) => inv.contract_id));

  let count = 0;
  for (const contract of activeContracts) {
    if (existingContractIds.has(contract.id)) continue;

    const { data: serialValue, error: serialError } = await adminClient.rpc('increment_serial', { serial_column: 'invoice' });
    if (serialError) throw serialError;

    const dueDay = contract.due_day || 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay, daysInMonth);
    const dueDate = `${monthKey}-${String(safeDay).padStart(2, '0')}`;

    const { error: insertError } = await adminClient.from('invoices').insert({
      id: crypto.randomUUID(),
      no: String(serialValue),
      contract_id: contract.id,
      due_date: dueDate,
      amount: contract.rent_amount,
      paid_amount: 0,
      status: 'UNPAID',
      type: 'RENT',
      notes: `فاتورة إيجار شهر ${monthKey}`,
      created_at: Date.now(),
    });
    if (insertError) throw insertError;
    count += 1;
  }

  return count;
};

const autoApplyLateFees = async (): Promise<number> => {
  const settings = await getSettings();
  const operational = (settings.operational || {}) as Record<string, unknown>;
  const lateFee = (operational.lateFee || {}) as Record<string, unknown>;
  if (!lateFee.isEnabled) return 0;

  const { data: invoices, error } = await adminClient
    .from('invoices')
    .select('id,no,contract_id,due_date,amount,paid_amount,status,type,related_invoice_id');
  if (error) throw error;

  const allInvoices = (invoices || []) as InvoiceRow[];
  const overdueInvoices = allInvoices.filter(isRentOverdue);
  const existingLateFeeSourceIds = new Set(
    allInvoices.filter(inv => inv.type === 'LATE_FEE' && !!inv.related_invoice_id).map(inv => inv.related_invoice_id as string),
  );

  let count = 0;
  const today = new Date();
  const graceDays = Number(lateFee.graceDays || 0);
  const feeType = String(lateFee.type || 'FIXED_AMOUNT');
  const feeValue = Number(lateFee.value || 0);

  for (const inv of overdueInvoices) {
    if (existingLateFeeSourceIds.has(inv.id)) continue;

    const dueDate = new Date(inv.due_date);
    const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLate <= graceDays) continue;

    const feeAmount = feeType === 'PERCENTAGE_OF_RENT' ? (inv.amount * feeValue) / 100 : feeValue;
    const { data: serialValue, error: serialError } = await adminClient.rpc('increment_serial', { serial_column: 'invoice' });
    if (serialError) throw serialError;

    const { error: insertError } = await adminClient.from('invoices').insert({
      id: crypto.randomUUID(),
      no: String(serialValue),
      contract_id: inv.contract_id,
      due_date: today.toISOString().slice(0, 10),
      amount: feeAmount,
      paid_amount: 0,
      status: 'UNPAID',
      type: 'LATE_FEE',
      notes: `رسوم تأخير على الفاتورة رقم ${inv.no}`,
      related_invoice_id: inv.id,
      created_at: Date.now(),
    });
    if (insertError) throw insertError;
    count += 1;
  }

  return count;
};

const autoGenerateNotifications = async (): Promise<number> => {
  const settings = await getSettings();
  const operational = (settings.operational || {}) as Record<string, unknown>;
  const alertDays = Number(operational.contractAlertDays ?? 30);
  const thresholds = [alertDays, 7, 1];
  const now = Date.now();

  const [{ data: contracts, error: contractsError }, { data: invoices, error: invoicesError }, { data: notifs, error: notifsError }] = await Promise.all([
    adminClient.from('contracts').select('id,status,end_date').eq('status', 'ACTIVE'),
    adminClient.from('invoices').select('id,no,due_date,amount,paid_amount,status,type'),
    adminClient.from('app_notifications').select('id,link,title,type'),
  ]);

  if (contractsError) throw contractsError;
  if (invoicesError) throw invoicesError;
  if (notifsError) throw notifsError;

  const activeContracts = (contracts || []) as Array<{ id: string; end_date: string }>;
  const existingNotifs = (notifs || []) as AppNotificationRow[];
  const allInvoices = (invoices || []) as InvoiceRow[];

  let count = 0;

  for (const contract of activeContracts) {
    const endDate = new Date(contract.end_date).getTime();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    for (const threshold of thresholds) {
      if (daysLeft <= threshold && daysLeft > 0) {
        const alreadyExists = existingNotifs.some(
          n => n.link === `/contracts?contractId=${contract.id}` && n.title.includes(String(threshold)),
        );
        if (!alreadyExists) {
          const { error: insertError } = await adminClient.from('app_notifications').insert({
            id: crypto.randomUUID(),
            created_at: now,
            is_read: false,
            role: 'ADMIN',
            type: 'CONTRACT_EXPIRING',
            title: `عقد ينتهي خلال ${threshold} يوم`,
            message: `عقد المستأجر سينتهي خلال ${daysLeft} يوم`,
            link: `/contracts?contractId=${contract.id}`,
          });
          if (insertError) throw insertError;
          count += 1;
        }
        break;
      }
    }
  }

  const overdueInvoices = allInvoices.filter(isRentOverdue);
  for (const invoice of overdueInvoices) {
    const alreadyExists = existingNotifs.some(
      n => n.link === `/finance/invoices?invoiceId=${invoice.id}` && n.type === 'OVERDUE_BALANCE',
    );
    if (alreadyExists) continue;

    const { error: insertError } = await adminClient.from('app_notifications').insert({
      id: crypto.randomUUID(),
      created_at: now,
      is_read: false,
      role: 'ADMIN',
      type: 'OVERDUE_BALANCE',
      title: 'فاتورة إيجار متأخرة',
      message: `الفاتورة رقم ${invoice.no} متأخرة بمبلغ ${invoice.amount - invoice.paid_amount}`,
      link: `/finance/invoices?invoiceId=${invoice.id}`,
    });
    if (insertError) throw insertError;
    count += 1;
  }

  return count;
};

const autoRebuildSnapshots = async (): Promise<boolean> => true;

const persistAutomationRun = async (result: AutomationResult): Promise<void> => {
  const row: AutomationRunsRow = {
    id: crypto.randomUUID(),
    ts: new Date(result.ts).getTime(),
    invoices_created: 0,
    late_fees_applied: result.lateFeesApplied,
    notifications_created: result.notificationsSent,
    snapshots_rebuilt: result.snapshotsRebuilt > 0,
    error: result.errors.length > 0 ? result.errors.join(' | ') : null,
  };

  const { error } = await adminClient.from('automation_runs').insert(row);
  if (error) throw error;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const dryRun = Boolean(body?.dryRun);
    const config = { ...defaultAutomationConfig } as AutomationTaskConfig;

    const result = await executeAutomationTasks(config, {
      runInvoices: dryRun ? async () => 0 : autoGenerateMonthlyInvoices,
      runLateFees: dryRun ? async () => 0 : autoApplyLateFees,
      runNotifications: dryRun ? async () => 0 : autoGenerateNotifications,
      runSnapshots: dryRun ? async () => false : autoRebuildSnapshots,
    });

    if (!dryRun) {
      await persistAutomationRun(result);
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const failedResult: AutomationResult = {
      success: false,
      errors: [message],
      snapshotsRebuilt: 0,
      lateFeesApplied: 0,
      notificationsSent: 0,
      ts: new Date().toISOString(),
    };

    try {
      await persistAutomationRun(failedResult);
    } catch {
      // best effort
    }

    return new Response(JSON.stringify(failedResult), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});
