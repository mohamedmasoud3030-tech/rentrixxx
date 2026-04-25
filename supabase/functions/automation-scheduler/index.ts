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
  status?: 'success' | 'failed';
  task_name?: string;
  error_message?: string | null;
  executed_at?: string;
};

type AutomationTaskConfig = {
  invoices: boolean;
  lateFees: boolean;
  notifications: boolean;
  snapshots: boolean;
};

type ReplayQueueRow = {
  id: string;
  task_name: string;
  replay_key: string;
  payload: Record<string, unknown>;
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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const emitAlert = async (
  adminClient: ReturnType<typeof createClient>,
  alertType: string,
  severity: 'INFO' | 'WARNING' | 'CRITICAL',
  message: string,
  details: Record<string, unknown> = {},
): Promise<void> => {
  const payload = {
    alert_type: alertType,
    severity,
    task_name: 'automation_scheduler',
    message,
    details,
    dedup_key: `automation:${alertType}`,
    dedup_window_start: new Date(Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000)).toISOString(),
  };

  await adminClient.from('operational_alerts').insert(payload);

  if (severity !== 'CRITICAL') return;
  const webhook = Deno.env.get('ALERT_WEBHOOK_URL');
  if (!webhook) {
    await adminClient.from('operational_alert_delivery_queue').insert({
      alert_type: alertType,
      payload,
      status: 'pending',
      last_error: 'missing ALERT_WEBHOOK_URL',
    });
    return;
  }

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    await adminClient.from('operational_alert_delivery_queue').insert({
      alert_type: alertType,
      payload,
      status: 'pending',
      last_error: error instanceof Error ? error.message : 'unknown webhook error',
    });
  }
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

const persistTaskExecution = async (
  adminClient: ReturnType<typeof createClient>,
  taskName: string,
  status: 'success' | 'failed',
  errorMessage: string | null,
): Promise<void> => {
  const row: AutomationRunsRow = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    invoices_created: 0,
    late_fees_applied: 0,
    notifications_created: 0,
    snapshots_rebuilt: false,
    error: errorMessage,
    status,
    task_name: taskName,
    error_message: errorMessage,
    executed_at: new Date().toISOString(),
  };

  const { error } = await adminClient.from('automation_runs').insert(row);
  if (error) {
    console.error('[automation-scheduler] failed to persist task execution log', {
      taskName,
      status,
      error: error.message,
    });
  }
};

const runTaskWithObservation = async <T>(
  adminClient: ReturnType<typeof createClient>,
  taskName: string,
  runner: () => Promise<T>,
): Promise<T> => {
  try {
    const result = await runner();
    await persistTaskExecution(adminClient, taskName, 'success', null);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unknown error in ${taskName}`;
    await persistTaskExecution(adminClient, taskName, 'failed', message);
    await adminClient.from('automation_replay_queue').upsert(
      {
        id: crypto.randomUUID(),
        task_name: taskName,
        replay_key: `${taskName}:${new Date().toISOString().slice(0, 13)}`,
        payload: {},
        processing_mode: 'isolated',
        status: 'pending',
        error_message: message,
      },
      { onConflict: 'replay_key' },
    );
    await emitAlert(adminClient, 'automation_task_failed', 'CRITICAL', message, { task: taskName });
    throw error;
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

const persistAutomationSummary = async (adminClient: ReturnType<typeof createClient>, result: AutomationResult): Promise<void> => {
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
  adminClient: ReturnType<typeof createClient>,
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
      await runTaskWithObservation(adminClient, 'invoices', runners.runInvoices);
    } catch (error) {
      errors.push(`invoices: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  } else {
    await persistTaskExecution(adminClient, 'invoices', 'success', 'skipped_by_config');
  }

  if (config.lateFees) {
    try {
      lateFeesApplied = await runTaskWithObservation(adminClient, 'late_fees', runners.runLateFees);
    } catch (error) {
      errors.push(`lateFees: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  } else {
    await persistTaskExecution(adminClient, 'late_fees', 'success', 'skipped_by_config');
  }

  if (config.notifications) {
    try {
      notificationsSent = await runTaskWithObservation(adminClient, 'notifications', runners.runNotifications);
    } catch (error) {
      errors.push(`notifications: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  } else {
    await persistTaskExecution(adminClient, 'notifications', 'success', 'skipped_by_config');
  }

  if (config.snapshots) {
    try {
      snapshotsRebuilt = (await runTaskWithObservation(adminClient, 'snapshots', runners.runSnapshots)) ? 1 : 0;
    } catch (error) {
      errors.push(`snapshots: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  } else {
    await persistTaskExecution(adminClient, 'snapshots', 'success', 'skipped_by_config');
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
    const replayFailures = Boolean((body as Record<string, unknown>)?.replayFailures);
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

    const result = await executeAutomationTasks(adminClient, config, {
      runInvoices: dryRun ? async () => 0 : () => autoGenerateMonthlyInvoices(adminClient!),
      runLateFees: dryRun ? async () => 0 : () => autoApplyLateFees(adminClient!),
      runNotifications: dryRun ? async () => 0 : () => autoGenerateNotifications(adminClient!),
      runSnapshots: dryRun ? async () => false : autoRebuildSnapshots,
    });

    await persistAutomationSummary(adminClient, result);

    if (replayFailures && !dryRun) {
      const { data: replayRows, error: replayError } = await adminClient
        .from('automation_replay_queue')
        .select('id,task_name,replay_key,payload')
        .eq('processing_mode', 'isolated')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (replayError) {
        await emitAlert(adminClient, 'automation_replay_load_failed', 'CRITICAL', replayError.message);
      } else {
        const rows = (replayRows || []) as ReplayQueueRow[];
        for (const row of rows) {
          try {
            if (row.task_name === 'invoices') await autoGenerateMonthlyInvoices(adminClient);
            if (row.task_name === 'late_fees') await autoApplyLateFees(adminClient);
            if (row.task_name === 'notifications') await autoGenerateNotifications(adminClient);
            if (row.task_name === 'snapshots') await autoRebuildSnapshots();

            await adminClient
              .from('automation_replay_queue')
              .update({ status: 'replayed', replayed_at: new Date().toISOString(), error_message: null })
              .eq('id', row.id);
          } catch (replayTaskError) {
            const replayMessage = replayTaskError instanceof Error ? replayTaskError.message : 'unknown replay failure';
            await adminClient
              .from('automation_replay_queue')
              .update({ status: 'failed', error_message: replayMessage })
              .eq('id', row.id);
            await emitAlert(adminClient, 'automation_replay_failed', 'CRITICAL', replayMessage, { task: row.task_name });
          }

          await sleep(250);
        }
      }
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
      await persistTaskExecution(adminClient, 'scheduler', 'failed', message);
      await persistAutomationSummary(adminClient, failedResult);
      await emitAlert(adminClient, 'automation_scheduler_failed', 'CRITICAL', message);
    }

    return new Response(JSON.stringify(failedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
