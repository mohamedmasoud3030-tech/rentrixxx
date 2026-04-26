import { createClient } from 'npm:@supabase/supabase-js@2';

type ApiError = { error: { code: string; message: string; details?: unknown } };
type JsonObject = Record<string, unknown>;

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

const camelToSnake = (key: string): string => key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

const mapCamelToSnakeDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(mapCamelToSnakeDeep);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.entries(value as JsonObject).reduce<JsonObject>((acc, [k, v]) => {
      acc[camelToSnake(k)] = mapCamelToSnakeDeep(v);
      return acc;
    }, {});
  }
  return value;
};

const blockSnakeCaseInput = (payload: JsonObject): string[] => {
  const disallowed = [
    'request_id',
    'tenant_id',
    'unit_id',
    'rent_amount',
    'due_day',
    'start_date',
    'end_date',
    'tax_amount',
    'paid_amount',
    'source_module',
  ];

  return disallowed.filter((key) => Object.prototype.hasOwnProperty.call(payload, key));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const strictMode = envFlag(Deno.env.get('PUBLIC_API_STRICT_MODE'));

  if (!supabaseUrl || !serviceRole) {
    console.error('[public-api] missing supabase env', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRole: Boolean(serviceRole),
    });
    return apiError('config_error', 'Missing Supabase service configuration', 500);
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const url = new URL(req.url);
  const path = normalizePath(url);
  const method = req.method.toUpperCase();
  const requiredScope = requiredScopeByEndpoint(path, method);

  if (!requiredScope) return apiError('not_found', 'Endpoint not found', 404);

  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!apiKey) {
    return apiError('auth_failed', 'Missing API key', 401);
  }

  const { data: authData, error: authError } = await supabase.rpc('platform_authenticate_api_key', {
    p_api_key: apiKey,
    p_required_scope: requiredScope,
  });

  if (authError) {
    console.error('[public-api] authentication rpc failed', { path, method, error: authError.message });
    return apiError('auth_failed', authError.message, 401);
  }

  const authPayload = (authData || {}) as { ok?: boolean; error?: string; tenant_id?: string; role?: string; api_key_id?: string };
  if (!authPayload.ok || !authPayload.tenant_id) {
    return apiError('auth_failed', authPayload.error || 'Invalid API key', 401);
  }

  const rawBody = method === 'GET' ? {} : await req.json().catch(() => ({}));
  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as JsonObject;
  const snakeCaseViolations = blockSnakeCaseInput(body);

  if (snakeCaseViolations.length > 0) {
    return apiError(
      'validation_error',
      'Use camelCase API fields only. snake_case fields are internal and not accepted from client payloads.',
      422,
      { fields: snakeCaseViolations },
    );
  }

  const mappedPayload = mapCamelToSnakeDeep(body) as JsonObject;
  const requestIdHeader = req.headers.get('x-request-id') || '';
  const requestIdBody = String(mappedPayload.request_id || '').trim();
  const finalRequestId = requestIdHeader || requestIdBody;

  if (method === 'POST' && !finalRequestId) {
    return apiError('validation_error', 'requestId is required for write operations', 422);
  }

  const tenantId = authPayload.tenant_id;
  const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  const startAt = Date.now();

  const logApi = async (statusCode: number, metadata: Record<string, unknown> = {}) => {
    const { error } = await supabase.from('platform_api_request_log').insert({
      tenant_id: tenantId,
      api_key_id: authPayload.api_key_id,
      request_method: method,
      request_path: path,
      request_id: finalRequestId || null,
      status_code: statusCode,
      duration_ms: Date.now() - startAt,
      metadata,
    });

    if (error) {
      console.error('[public-api] failed to log api request', { path, method, statusCode, error: error.message });
    }
  };

  try {
    const contractResponse = await enforceOrWarnContract();
    if (contractResponse) return contractResponse;

    if (method === 'POST' && path === '/receipts') {
      const { data: cachedResponse, error: idempotencyLookupError } = await supabase
        .from('financial_operation_idempotency')
        .select('response_payload')
        .eq('operation_name', 'post_receipt_atomic')
        .eq('request_id', finalRequestId)
        .maybeSingle();

      if (idempotencyLookupError) {
        await logApi(500, { error: idempotencyLookupError.message, stage: 'idempotency_lookup' });
        return apiError('idempotency_lookup_failed', idempotencyLookupError.message, 500);
      }

      if (cachedResponse?.response_payload) {
        await logApi(200, { idempotent: true, request_id: finalRequestId });
        return json({ data: cachedResponse.response_payload, idempotent: true, audit_reference: null });
      }

      mappedPayload.request_id = finalRequestId;
      const { data, error } = await supabase.rpc('post_receipt_atomic', { payload: mappedPayload });
      if (error) {
        await logApi(400, { error: error.message });
        return apiError('receipt_post_failed', error.message, 400);
      }

      const receiptId = (data as JsonObject)?.receipt_id as string | undefined;
      const responsePayload = {
        ...(typeof data === 'object' && data ? (data as JsonObject) : {}),
      } as JsonObject;
      await storeIdempotencyResult(operationName, responsePayload);

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
      return json({ data, idempotent: false, audit_reference: auditRow?.id || null });
    }

    if (method === 'POST' && (path === '/contracts' || path === '/invoices' || path === '/journal-entries')) {
      await logApi(409, { blocked: true, reason: 'direct_db_write_disabled' });
      return apiError(
        'write_path_disabled',
        'Direct table writes are disabled for this endpoint. Use an approved atomic RPC workflow instead.',
        409,
      );
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
    console.error('[public-api] unhandled error', { message, path, method, tenantId, requestId: finalRequestId || null });
    await logApi(500, { error: message });
    return apiError('internal_error', message, 500);
  }
});
