import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

type ApiError = { error: { code: string; message: string; details?: unknown } };
type JsonObject = Record<string, unknown>;

type AuthPayload = {
  ok?: boolean;
  error?: string;
  tenant_id?: string;
  role?: string;
  api_key_id?: string;
};

type SupabaseErrorLike = {
  code?: string;
  message: string;
};

type IdempotencyRow = {
  response_payload: JsonObject | null;
  source_table?: string | null;
  source_record_id?: string | null;
  tenant_id?: string | null;
};

type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';



const json = (body: unknown, status = 200, origin: string | null = null): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });

const apiError = (code: string, message: string, status = 400, details?: unknown, origin: string | null = null): Response =>
  json({ error: { code, message, details } satisfies ApiError['error'] }, status, origin);

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
  if (req.method === 'OPTIONS') return handleOptions(req);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const strictMode = envFlag(Deno.env.get('PUBLIC_API_STRICT_MODE'));

  if (!supabaseUrl || !serviceRole) {
    console.error('[public-api] missing supabase env', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRole: Boolean(serviceRole),
    });
    return apiError('config_error', 'Missing Supabase service configuration', 500, undefined, req.headers.get('Origin'));
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const url = new URL(req.url);
  const path = normalizePath(url);
  const method = req.method.toUpperCase();
  const requiredScope = requiredScopeByEndpoint(path, method);

  if (!requiredScope) return apiError('not_found', 'Endpoint not found', 404, undefined, req.headers.get('Origin'));

  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!apiKey) {
    return apiError('auth_failed', 'Missing API key', 401, undefined, req.headers.get('Origin'));
  }

  const { data: authData, error: authError } = await supabase.rpc('platform_authenticate_api_key', {
    p_api_key: apiKey,
    p_required_scope: requiredScope,
  });

  if (authError) {
    console.error('[public-api] authentication rpc failed', { path, method, error: authError.message });
    return apiError('auth_failed', authError.message, 401, undefined, req.headers.get('Origin'));
  }

  const authPayload = (authData || {}) as { ok?: boolean; error?: string; tenant_id?: string; role?: string; api_key_id?: string };
  if (!authPayload.ok || !authPayload.tenant_id) {
    return apiError('auth_failed', authPayload.error || 'Invalid API key', 401, undefined, req.headers.get('Origin'));
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
      req.headers.get('Origin'),
    );
  }

  const mappedPayload = mapCamelToSnakeDeep(body) as JsonObject;
  const requestIdHeader = req.headers.get('x-request-id') || '';
  const requestIdBody = String(mappedPayload.request_id || '').trim();
  const finalRequestId = requestIdHeader || requestIdBody;

  if (method === 'POST' && !finalRequestId) {
    return apiError('validation_error', 'requestId is required for write operations', 422, undefined, req.headers.get('Origin'));
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

  const emitAlert = async (
    alertType: string,
    severity: AlertSeverity,
    message: string,
    details: Record<string, unknown> = {},
  ): Promise<void> => {
    const payload = {
      alert_type: alertType,
      severity,
      message,
      tenant_id: tenantId,
      request_id: finalRequestId || null,
      details,
      dedup_key: `${tenantId}:${alertType}:${path}`,
      dedup_window_start: new Date(Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000)).toISOString(),
    };

    const { error: insertError } = await supabase.from('operational_alerts').insert(payload);
    if (insertError) {
      console.error('[public-api] failed to persist alert', { alertType, error: insertError.message });
    }

    if (severity !== 'CRITICAL') return;

    const webhook = Deno.env.get('ALERT_WEBHOOK_URL');
    if (!webhook) {
      await supabase.from('operational_alert_delivery_queue').insert({
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
      const webhookError = error instanceof Error ? error.message : 'unknown webhook error';
      await supabase.from('operational_alert_delivery_queue').insert({
        alert_type: alertType,
        payload,
        status: 'pending',
        last_error: webhookError,
      });
    }
  };

  const lookupIdempotencyResult = async (operationName: string): Promise<IdempotencyRow | null> => {
    const { data, error } = await supabase
      .from('financial_operation_idempotency')
      .select('response_payload,source_table,source_record_id,tenant_id')
      .eq('tenant_id', tenantId)
      .eq('operation_name', operationName)
      .eq('request_id', finalRequestId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new Error(`Idempotency lookup failed for ${operationName}: ${error.message}`);
    }

    return (data as IdempotencyRow | null) ?? null;
  };

  const verifySourceRecord = async (sourceTable: string, sourceRecordId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from(sourceTable)
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', sourceRecordId)
      .limit(1)
      .maybeSingle();
    if (error) {
      await emitAlert('idempotency_source_validation_failed', 'CRITICAL', `Failed to verify ${sourceTable}:${sourceRecordId}`, {
        error: error.message,
      });
      return false;
    }
    return Boolean(data?.id);
  };

  const lookupDeterministicIdempotencyResult = async (operationName: string): Promise<JsonObject | null> => {
    const row = await lookupIdempotencyResult(operationName);
    if (!row?.response_payload) return null;
    if (!row.source_table || !row.source_record_id) {
      await emitAlert('legacy_idempotency_row_without_source', 'WARNING', 'Idempotency row missing source references', {
        operation_name: operationName,
      });
      return null;
    }

    const sourceExists = await verifySourceRecord(row.source_table, row.source_record_id);
    if (!sourceExists) {
      await emitAlert('orphaned_idempotency_row', 'CRITICAL', 'Idempotency row points to missing source record', {
        operation_name: operationName,
        source_table: row.source_table,
        source_record_id: row.source_record_id,
      });
      return null;
    }

    return row.response_payload;
  };

  const storeIdempotencyResult = async (
    operationName: string,
    responsePayload: JsonObject,
    sourceTable: string,
    sourceRecordId: string,
  ): Promise<void> => {
    const { error } = await supabase.from('financial_operation_idempotency').upsert(
      {
        tenant_id: tenantId,
        operation_name: operationName,
        request_id: finalRequestId,
        response_payload: responsePayload,
        source_table: sourceTable,
        source_record_id: sourceRecordId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'tenant_id,operation_name,request_id', ignoreDuplicates: true },
    );

    if (error) {
      await emitAlert('idempotency_store_failed', 'CRITICAL', `Failed to persist idempotency for ${operationName}`, {
        error: error.message,
      });
    }
  };

  const enforceOrWarnContract = async (): Promise<Response | null> => {
    if (snakeCaseViolations.length === 0) return null;

    await logApi(strictMode ? 422 : 202, {
      violation: 'snake_case_input',
      strict_mode: strictMode,
      fields: snakeCaseViolations,
    });

    if (strictMode) {
      return apiError(
        'validation_error',
        'Use camelCase API fields only. snake_case fields are internal and not accepted from client payloads.',
        422,
        { fields: snakeCaseViolations },
      );
    }

    console.warn('[public-api] backward compatibility mode accepted snake_case payload', {
      path,
      method,
      fields: snakeCaseViolations,
    });

    return null;
  };

  const detectRetryAnomaly = async (): Promise<void> => {
    if (method !== 'POST' || !finalRequestId) return;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('platform_api_request_log')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('request_id', finalRequestId)
      .gte('created_at', since);

    if (error) {
      console.error('[public-api] anomaly query failed', { error: error.message });
      return;
    }

    if ((count || 0) >= 5) {
      await emitAlert('excessive_retry_pattern', 'CRITICAL', 'Excessive retry pattern detected', {
        request_id: finalRequestId,
        count_last_hour: count,
      });
    }
  };

  const enforceRateLimits = async (): Promise<Response | null> => {
    if (method !== 'POST') return null;
    const { data, error } = await supabase.rpc('enforce_api_rate_limit', {
      p_api_key_id: authPayload.api_key_id || 'unknown',
      p_source_ip: sourceIp,
      p_request_id: finalRequestId || 'missing_request_id',
    });

    if (error) {
      await emitAlert('rate_limit_evaluation_failed', 'CRITICAL', 'Failed to evaluate API rate limit', {
        error: error.message,
      });
      return apiError('rate_limit_check_failed', 'Unable to validate request rate limits', 503);
    }

    const decision = (data || {}) as { exceeded?: boolean; scope?: string; limit?: number; current?: number };
    if (decision.exceeded === true) {
      await emitAlert('rate_limit_blocked', 'WARNING', 'Request blocked by API/IP/requestId limiter', {
        scope: decision.scope || 'unknown',
        limit: decision.limit ?? null,
        current: decision.current ?? null,
        source_ip: sourceIp,
      });
      return apiError('rate_limited', 'Too many requests', 429, {
        scope: decision.scope || 'unknown',
        limit: decision.limit ?? null,
        current: decision.current ?? null,
      });
    }

    return null;
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
        return json({ data: cachedResponse.response_payload, idempotent: true, audit_reference: null }, 200, req.headers.get('Origin'));
      }

      mappedPayload.request_id = finalRequestId;
      const { data, error } = await supabase.rpc('post_receipt_atomic', { payload: mappedPayload });
      if (error) {
        await logApi(400, { error: error.message });
        return apiError('receipt_post_failed', error.message, 400, undefined, req.headers.get('Origin'));
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
return json({ data: data, idempotent: false, audit_reference: auditRow?.id || null }, 200, req.headers.get('Origin'));
    }

    if (method === 'POST' && (path === '/contracts' || path === '/invoices' || path === '/journal-entries')) {
      await logApi(409, { blocked: true, reason: 'direct_db_write_disabled' });
      return apiError(
        'write_path_disabled',
        'Direct table writes are disabled for this endpoint. Use an approved atomic RPC workflow instead.',
        409,
        undefined,
        req.headers.get('Origin'),
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
        return apiError('ledger_fetch_failed', error.message, 400, undefined, req.headers.get('Origin'));
      }

      await logApi(200, { count: data?.length || 0 });
      return json({ data: data || [] }, 200, req.headers.get('Origin'));
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
        return apiError('not_found', 'Unknown report endpoint', 404, undefined, req.headers.get('Origin'));
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
        return apiError('report_failed', error.message, 400, undefined, req.headers.get('Origin'));
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
      return json({ data }, 200, req.headers.get('Origin'));
    }

    await logApi(404, { error: 'unknown_route' });
    return apiError('not_found', 'Endpoint not found', 404, undefined, req.headers.get('Origin'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[public-api] unhandled error', { message, path, method, tenantId, requestId: finalRequestId || null });
    await logApi(500, { error: message });
    return apiError('internal_error', message, 500, undefined, req.headers.get('Origin'));
  }
});
