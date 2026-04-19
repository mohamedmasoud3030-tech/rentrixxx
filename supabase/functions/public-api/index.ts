import { createClient } from 'npm:@supabase/supabase-js@2';

type ApiError = { error: { code: string; message: string; details?: unknown } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, x-request-id, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const apiError = (code: string, message: string, status = 400, details?: unknown): Response =>
  json({ error: { code, message, details } satisfies ApiError['error'] }, status);

const normalizePath = (url: URL): string => {
  const marker = '/public-api';
  const index = url.pathname.indexOf(marker);
  if (index === -1) return url.pathname;
  const path = url.pathname.slice(index + marker.length);
  return path.startsWith('/') ? path : `/${path}`;
};

const requiredScopeByEndpoint = (path: string, method: string): string | null => {
  if (method === 'GET' && path.startsWith('/reports')) return 'reports:read';
  if (method === 'GET' && path === '/ledger') return 'ledger:read';
  if (method === 'POST' && path === '/receipts') return 'receipts:write';
  if (method === 'POST' && path === '/invoices') return 'invoices:write';
  if (method === 'POST' && path === '/contracts') return 'contracts:write';
  if (method === 'POST' && path === '/journal-entries') return 'ledger:write';
  return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRole) {
    return apiError('config_error', 'Missing Supabase service configuration', 500);
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const url = new URL(req.url);
  const path = normalizePath(url);
  const method = req.method.toUpperCase();
  const requiredScope = requiredScopeByEndpoint(path, method);

  if (!requiredScope) return apiError('not_found', 'Endpoint not found', 404);

  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const { data: authData, error: authError } = await supabase.rpc('platform_authenticate_api_key', {
    p_api_key: apiKey,
    p_required_scope: requiredScope,
  });

  if (authError) return apiError('auth_failed', authError.message, 401);
  const authPayload = (authData || {}) as { ok?: boolean; error?: string; tenant_id?: string; role?: string; api_key_id?: string };
  if (!authPayload.ok || !authPayload.tenant_id) {
    return apiError('auth_failed', authPayload.error || 'Invalid API key', 401);
  }

  const requestId = req.headers.get('x-request-id') || '';
  const body = method === 'GET' ? {} : await req.json().catch(() => ({}));
  const finalRequestId = requestId || String((body as Record<string, unknown>).request_id || '');

  if (method === 'POST' && !finalRequestId) {
    return apiError('validation_error', 'request_id is required for write operations', 422);
  }

  const tenantId = authPayload.tenant_id;
  const startAt = Date.now();

  const logApi = async (statusCode: number, metadata: Record<string, unknown> = {}) => {
    await supabase.from('platform_api_request_log').insert({
      tenant_id: tenantId,
      api_key_id: authPayload.api_key_id,
      request_method: method,
      request_path: path,
      request_id: finalRequestId || null,
      status_code: statusCode,
      duration_ms: Date.now() - startAt,
      metadata,
    });
  };

  try {
    if (method === 'POST' && path === '/receipts') {
      const payload = body as Record<string, unknown>;
      payload.request_id = finalRequestId;

      const { data, error } = await supabase.rpc('post_receipt_atomic', { payload });
      if (error) {
        await logApi(400, { error: error.message });
        return apiError('receipt_post_failed', error.message, 400);
      }

      const receiptId = (data as Record<string, unknown>)?.receipt_id as string | undefined;
      await supabase.rpc('platform_record_usage', {
        p_tenant_id: tenantId,
        p_metric_code: 'transactions',
        p_quantity: 1,
        p_reference_type: 'RECEIPT',
        p_reference_id: receiptId || null,
      });

      const { data: auditRow } = await supabase
        .from('financial_audit_log')
        .select('id')
        .eq('request_id', finalRequestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      await logApi(200, { receipt_id: receiptId });
      return json({ data, audit_reference: auditRow?.id || null });
    }

    if (method === 'POST' && path === '/contracts') {
      const payload = body as Record<string, unknown>;
      const record = {
        id: payload.id,
        no: payload.no,
        unit_id: payload.unit_id,
        tenant_id: payload.tenant_id,
        rent_amount: payload.rent_amount,
        due_day: payload.due_day,
        start_date: payload.start_date,
        end_date: payload.end_date,
        deposit: payload.deposit ?? 0,
        status: payload.status ?? 'ACTIVE',
        sponsor_name: payload.sponsor_name ?? '',
        sponsor_id: payload.sponsor_id ?? '',
        sponsor_phone: payload.sponsor_phone ?? '',
        created_at: payload.created_at ?? Date.now(),
        tenant_id: tenantId,
      };

      const { data, error } = await supabase.from('contracts').insert(record).select('id').single();
      if (error) {
        await logApi(400, { error: error.message });
        return apiError('contract_create_failed', error.message, 400);
      }

      await supabase.rpc('platform_record_usage', {
        p_tenant_id: tenantId,
        p_metric_code: 'transactions',
        p_quantity: 1,
        p_reference_type: 'CONTRACT',
        p_reference_id: data.id,
      });

      await logApi(200, { contract_id: data.id });
      return json({ data: { success: true, contract_id: data.id }, audit_reference: null });
    }

    if (method === 'POST' && path === '/invoices') {
      const payload = body as Record<string, unknown>;
      const record = {
        id: payload.id,
        no: payload.no,
        contract_id: payload.contract_id,
        due_date: payload.due_date,
        amount: payload.amount,
        tax_amount: payload.tax_amount ?? 0,
        paid_amount: payload.paid_amount ?? 0,
        status: payload.status ?? 'UNPAID',
        type: payload.type ?? 'RENT',
        notes: payload.notes ?? '',
        created_at: payload.created_at ?? Date.now(),
        tenant_id: tenantId,
      };

      const { data, error } = await supabase.from('invoices').insert(record).select('id').single();
      if (error) {
        await logApi(400, { error: error.message });
        return apiError('invoice_create_failed', error.message, 400);
      }

      await supabase.rpc('append_financial_event', {
        p_event_type: 'INVOICE_CREATED',
        p_tenant_id: tenantId,
        p_request_id: finalRequestId,
        p_entity_type: 'INVOICE',
        p_entity_id: data.id,
        p_payload: { invoice_id: data.id, request_id: finalRequestId },
      });

      await supabase.rpc('platform_record_usage', {
        p_tenant_id: tenantId,
        p_metric_code: 'transactions',
        p_quantity: 1,
        p_reference_type: 'INVOICE',
        p_reference_id: data.id,
      });

      await logApi(200, { invoice_id: data.id });
      return json({ data: { success: true, invoice_id: data.id }, audit_reference: null });
    }

    if (method === 'POST' && path === '/journal-entries') {
      if (authPayload.role !== 'ADMIN') {
        await logApi(403, { error: 'role_denied' });
        return apiError('forbidden', 'Only ADMIN role can post raw journal entries', 403);
      }

      const payload = body as { entries?: Record<string, unknown>[]; batch_id?: string };
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      if (!entries.length) {
        await logApi(422, { error: 'missing_entries' });
        return apiError('validation_error', 'entries are required', 422);
      }

      const batchId = payload.batch_id || finalRequestId;
      const enriched = entries.map((entry) => ({
        ...entry,
        tenant_id: tenantId,
        batch_id: batchId,
        request_id: finalRequestId,
        source_module: 'PUBLIC_API',
      }));

      const { error } = await supabase.from('journal_entries').insert(enriched);
      if (error) {
        await logApi(400, { error: error.message });
        return apiError('journal_post_failed', error.message, 400);
      }

      await supabase.rpc('seal_ledger_batch', { p_batch_id: batchId, p_tenant_id: tenantId });
      await supabase.rpc('platform_record_usage', {
        p_tenant_id: tenantId,
        p_metric_code: 'transactions',
        p_quantity: entries.length,
        p_reference_type: 'JOURNAL_BATCH',
        p_reference_id: batchId,
      });

      await logApi(200, { batch_id: batchId, entries: entries.length });
      return json({ data: { success: true, batch_id: batchId, entries: entries.length }, audit_reference: null });
    }

    if (method === 'GET' && path === '/ledger') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      let query = supabase
        .from('journal_entries')
        .select('id,no,date,account_id,amount,type,source_id,entity_type,entity_id,batch_id,request_id,created_at')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .limit(500);

      if (from) query = query.gte('date', from);
      if (to) query = query.lte('date', to);

      const { data, error } = await query;
      if (error) {
        await logApi(400, { error: error.message });
        return apiError('ledger_fetch_failed', error.message, 400);
      }

      await logApi(200, { count: data?.length || 0 });
      return json({ data: data || [] });
    }

    if (method === 'GET' && path.startsWith('/reports/')) {
      const reportName = path.replace('/reports/', '');
      const reportMap: Record<string, string> = {
        income: 'rpt_income_statement',
        trial_balance: 'rpt_trial_balance',
        balance_sheet: 'rpt_balance_sheet',
        reconciliation: 'run_financial_reconciliation',
      };
      const rpcName = reportMap[reportName];
      if (!rpcName) {
        await logApi(404, { error: 'unknown_report' });
        return apiError('not_found', 'Unknown report endpoint', 404);
      }

      const rpcParams: Record<string, unknown> = {};
      if (rpcName === 'rpt_income_statement') {
        rpcParams.p_from = url.searchParams.get('from') || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
        rpcParams.p_to = url.searchParams.get('to') || new Date().toISOString().slice(0, 10);
      } else if (rpcName === 'rpt_trial_balance' || rpcName === 'rpt_balance_sheet') {
        rpcParams.p_as_of = url.searchParams.get('as_of') || new Date().toISOString().slice(0, 10);
      } else if (rpcName === 'run_financial_reconciliation') {
        rpcParams.p_as_of = url.searchParams.get('as_of') || new Date().toISOString().slice(0, 10);
        rpcParams.p_actor_id = null;
      }

      const { data, error } = await supabase.rpc(rpcName, rpcParams);
      if (error) {
        await logApi(400, { error: error.message, report: reportName });
        return apiError('report_failed', error.message, 400);
      }

      if (reportName !== 'reconciliation') {
        await supabase.rpc('platform_enqueue_webhook', {
          p_tenant_id: tenantId,
          p_event_type: 'report.generated',
          p_event_id: null,
          p_payload: { report: reportName, generated_at: new Date().toISOString() },
        });
      }

      await logApi(200, { report: reportName });
      return json({ data });
    }

    await logApi(404, { error: 'unknown_route' });
    return apiError('not_found', 'Endpoint not found', 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await supabase.from('platform_api_request_log').insert({
      tenant_id: tenantId,
      api_key_id: authPayload.api_key_id,
      request_method: method,
      request_path: path,
      request_id: finalRequestId || null,
      status_code: 500,
      duration_ms: Date.now() - startAt,
      metadata: { error: message },
    });
    return apiError('internal_error', message, 500);
  }
});
