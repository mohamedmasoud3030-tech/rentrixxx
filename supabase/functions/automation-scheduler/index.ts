import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type AutomationResult = {
  success: boolean;
  errors: string[];
  snapshotsRebuilt: number;
  lateFeesApplied: number;
  notificationsSent: number;
  ts: string;
};

type AutomationRunsRow = {
  id: string;
  ts: number;
  invoices_created: number;
  late_fees_applied: number;
  notifications_created: number;
  snapshots_rebuilt: boolean;
  error: string | null;
};

type AutomationTaskConfig = {
  invoices: boolean;
  lateFees: boolean;
  notifications: boolean;
  snapshots: boolean;
};

const defaultAutomationConfig: AutomationTaskConfig = {
  invoices: true,
  lateFees: true,
  notifications: true,
  snapshots: true,
};

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
  request_id?: string | null;
};

type AppNotificationRow = {
  id: string;
  link: string;
  title: string;
  type: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

const getAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey);
};

const authorizeRequest = (req: Request): void => {
  const requiredSecret = Deno.env.get('AUTOMATION_CRON_SECRET');
  if (!requiredSecret) return;

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== requiredSecret) {
    throw new Error('Unauthorized automation execution request');
  }
};

const getSettings = async (adminClient: ReturnType<typeof createClient>): Promise<Record<string, unknown>> => {
  const { data, error } = await adminClient.from('settings').select('data').eq('id', 1).single();
  if (error || !data?.data) throw new Error('تعذر تحميل إعدادات النظام');
  return data.data as Record<string, unknown>;
};

const isRentOverdue = (invoice: InvoiceRow): boolean => {
  if (invoice.type !== 'RENT') return false;
  if (invoice.status === 'OVERDUE') return true;
  return invoice.status === 'UNPAID' && new Date(invoice.due_date) < new Date();
};

const autoGenerateMonthlyInvoices = async (adminClient: ReturnType<typeof createClient>): Promise<number> => {
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
    .select('contract_id,due_date,type,request_id')
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

    const requestId = `auto:invoice:rent:${contract.id}:${monthKey}`;
    const { error: insertError } = await adminClient
      .from('invoices')
      .upsert(
        {
          id: crypto.randomUUID(),
          no: String(serialValue),
          contract_id: contract.id,
          due_date: dueDate,
          amount: contract.rent_amount,
          paid_amount: 0,
          status: 'UNPAID',
          type: 'RENT',
          notes: `فاتورة إيجار شهر ${monthKey}`,
          request_id: requestId,
          created_at: Date.now(),
        },
        { onConflict: 'request_id', ignoreDuplicates: true },
      );
    if (insertError) throw insertError;
    count += 1;
  }

  return count;
};

const autoApplyLateFees = async (adminClient: ReturnType<typeof createClient>): Promise<number> => {
  const settings = await getSettings(adminClient);
  const operational = (settings.operational || {}) as Record<string, unknown>;
  const lateFee = (operational.lateFee || {}) as Record<string, unknown>;
  if (!lateFee.isEnabled) return 0;

  const { data: invoices, error } = await adminClient
    .from('invoices')
    .select('id,no,contract_id,due_date,amount,paid_amount,status,type,related_invoice_id,request_id');
  if (error) throw error;

  const allInvoices = (invoices || []) as InvoiceRow[];
  const overdueInvoices = allInvoices.filter(isRentOverdue);
  const existingLateFeeSourceIds = new Set(
    allInvoices.filter((inv) => inv.type === 'LATE_FEE' && !!inv.related_invoice_id).map((inv) => inv.related_invoice_id as string),
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

    const requestId = `auto:invoice:late_fee:${inv.id}:${today.toISOString().slice(0, 10)}`;
    const { error: insertError } = await adminClient
      .from('invoices')
      .upsert(
        {
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
          request_id: requestId,
          created_at: Date.now(),
        },
        { onConflict: 'request_id', ignoreDuplicates: true },
      );
    if (insertError) throw insertError;
    count += 1;
  }

  return count;
};

const autoGenerateNotifications = async (adminClient: ReturnType<typeof createClient>): Promise<number> => {
  const settings = await getSettings(adminClient);
  const operational = (settings.operational || {}) as Record<string, unknown>;
  const alertDays = Number(operational.contractAlertDays ?? 30);
  const thresholds = [alertDays, 7, 1];
  const now = Date.now();

  const [{ data: contracts, error: contractsError }, { data: invoices, error: invoicesError }, { data: notifs, error: notifsError }] =
    await Promise.all([
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
          (n) => n.link === `/contracts?contractId=${contract.id}` && n.title.includes(String(threshold)),
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
      (n) => n.link === `/finance/invoices?invoiceId=${invoice.id}` && n.type === 'OVERDUE_BALANCE',
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

const persistAutomationRun = async (adminClient: ReturnType<typeof createClient>, result: AutomationResult): Promise<void> => {
  const row: AutomationRunsRow = {
    id: crypto.randomUUID(),
    ts: new Date(result.ts).getTime(),
    invoices_created: 0,
    late_fees_applied: result.lateFeesApplied,
    notifications_created: result.notificationsSent,
    snapshots_rebuilt: result.snapshotsRebuilt > 0,
    error: result.errors.length > 0 ? result.errors.join(' | ') : null,
    status: result.success ? 'success' : 'failed',
    task_name: 'automation_summary',
    error_message: result.errors.length > 0 ? result.errors.join(' | ') : null,
    executed_at: result.ts,
  };

  const { error } = await adminClient.from('automation_runs').insert(row);
  if (error) {
    console.error('[automation-scheduler] failed to persist run summary', { error: error.message });
  }
};

const executeAutomationTasks = async (
  config: AutomationTaskConfig,
  runners: {
    runInvoices: () => Promise<number>;
    runLateFees: () => Promise<number>;
    runNotifications: () => Promise<number>;
    runSnapshots: () => Promise<boolean>;
  },
): Promise<AutomationResult> => {
  const errors: string[] = [];
  let lateFeesApplied = 0;
  let notificationsSent = 0;
  let snapshotsRebuilt = 0;

  if (config.invoices) {
    try {
      await runners.runInvoices();
    } catch (error) {
      errors.push(`invoices: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  if (config.lateFees) {
    try {
      lateFeesApplied = await runners.runLateFees();
    } catch (error) {
      errors.push(`lateFees: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  if (config.notifications) {
    try {
      notificationsSent = await runners.runNotifications();
    } catch (error) {
      errors.push(`notifications: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  if (config.snapshots) {
    try {
      snapshotsRebuilt = (await runners.runSnapshots()) ? 1 : 0;
    } catch (error) {
      errors.push(`snapshots: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    snapshotsRebuilt,
    lateFeesApplied,
    notificationsSent,
    ts: new Date().toISOString(),
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { code: 'method_not_allowed', message: 'Only POST is supported' } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  let adminClient: ReturnType<typeof createClient> | null = null;

  try {
    authorizeRequest(req);
    adminClient = getAdminClient();

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean((body as Record<string, unknown>)?.dryRun);
    const config: AutomationTaskConfig = {
      invoices:
        typeof (body as Record<string, unknown>)?.invoices === 'boolean'
          ? Boolean((body as Record<string, unknown>).invoices)
          : defaultAutomationConfig.invoices,
      lateFees:
        typeof (body as Record<string, unknown>)?.lateFees === 'boolean'
          ? Boolean((body as Record<string, unknown>).lateFees)
          : defaultAutomationConfig.lateFees,
      notifications:
        typeof (body as Record<string, unknown>)?.notifications === 'boolean'
          ? Boolean((body as Record<string, unknown>).notifications)
          : defaultAutomationConfig.notifications,
      snapshots:
        typeof (body as Record<string, unknown>)?.snapshots === 'boolean'
          ? Boolean((body as Record<string, unknown>).snapshots)
          : defaultAutomationConfig.snapshots,
    };

    const result = await executeAutomationTasks(config, {
      runInvoices: dryRun ? async () => 0 : () => autoGenerateMonthlyInvoices(adminClient!),
      runLateFees: dryRun ? async () => 0 : () => autoApplyLateFees(adminClient!),
      runNotifications: dryRun ? async () => 0 : () => autoGenerateNotifications(adminClient!),
      runSnapshots: dryRun ? async () => false : autoRebuildSnapshots,
    });

    if (!dryRun) {
      await persistAutomationRun(adminClient, result);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[automation-scheduler] execution failed', {
      message,
      method: req.method,
      url: req.url,
      hasAuthHeader: Boolean(req.headers.get('authorization')),
    });

    const failedResult: AutomationResult = {
      success: false,
      errors: [message],
      snapshotsRebuilt: 0,
      lateFeesApplied: 0,
      notificationsSent: 0,
      ts: new Date().toISOString(),
    };

    if (adminClient) {
      try {
        await persistAutomationRun(adminClient, failedResult);
      } catch (persistError) {
        console.error('[automation-scheduler] failed to persist failed run', persistError);
      }
    }

    return new Response(JSON.stringify(failedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
