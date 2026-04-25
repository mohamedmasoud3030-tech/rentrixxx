import { createClient } from 'npm:@supabase/supabase-js@2';

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

const snakeCaseContractFields = [
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

const findSnakeCaseContractViolations = (payload: JsonObject): string[] =>
  snakeCaseContractFields.filter((key) => Object.prototype.hasOwnProperty.call(payload, key));

const envFlag = (value: string | undefined): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const isUniqueViolation = (error: SupabaseErrorLike | null | undefined): boolean => error?.code === '23505';

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

  const authPayload = (authData || {}) as AuthPayload;
  if (!authPayload.ok || !authPayload.tenant_id) {
    return apiError('auth_failed', authPayload.error || 'Invalid API key', 401);
  }

  const rawBody = method === 'GET' ? {} : await req.json().catch(() => ({}));
  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as JsonObject;
  const snakeCaseViolations = findSnakeCaseContractViolations(body);
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
    await detectRetryAnomaly();
    const rateLimitResponse = await enforceRateLimits();
    if (rateLimitResponse) return rateLimitResponse;
    const contractResponse = await enforceOrWarnContract();
    if (contractResponse) return contractResponse;

    if (method === 'POST' && path === '/receipts') {
      const operationName = 'post_receipt_atomic';
      const cachedResponse = await lookupDeterministicIdempotencyResult(operationName);

      if (cachedResponse) {
        await logApi(200, { idempotent: true, request_id: finalRequestId, operation: operationName });
        return json({ data: cachedResponse, idempotent: true, audit_reference: null });
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
      if (receiptId) {
        await storeIdempotencyResult(operationName, responsePayload, 'receipts', receiptId);
      }

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

      await logApi(200, { receipt_id: receiptId, operation: operationName });
      return json({ data, idempotent: false, audit_reference: auditRow?.id || null });
    }

    if (method === 'POST' && path === '/contracts') {
      const operationName = 'public_api_contract_create';
      const cachedResponse = await lookupDeterministicIdempotencyResult(operationName);
      if (cachedResponse) {
        await logApi(200, { idempotent: true, operation: operationName });
        return json({ data: cachedResponse, idempotent: true });
      }

      if (strictMode) {
        await logApi(409, { blocked: true, reason: 'direct_db_write_disabled', strict_mode: true });
        return apiError(
          'write_path_disabled',
          'Direct table writes are disabled in strict mode. Use an approved atomic RPC workflow instead.',
          409,
        );
      }

      const record: JsonObject = {
        id: mappedPayload.id,
        no: mappedPayload.no,
        unit_id: mappedPayload.unit_id,
        tenant_id: tenantId,
        rent_amount: mappedPayload.rent_amount,
        due_day: mappedPayload.due_day,
        start_date: mappedPayload.start_date,
        end_date: mappedPayload.end_date,
        deposit: mappedPayload.deposit ?? 0,
        status: mappedPayload.status ?? 'ACTIVE',
        sponsor_name: mappedPayload.sponsor_name ?? '',
        sponsor_id: mappedPayload.sponsor_id ?? '',
        sponsor_phone: mappedPayload.sponsor_phone ?? '',
        request_id: finalRequestId,
        created_at: mappedPayload.created_at ?? Date.now(),
      };

      const { data, error } = await supabase.from('contracts').insert(record).select('id,no,unit_id').single();

      if (error) {
        if (isUniqueViolation(error as SupabaseErrorLike)) {
          const idFilter = typeof record.id === 'string' ? String(record.id) : null;
          const noFilter = typeof record.no === 'string' ? String(record.no) : null;
          let existingQuery = supabase
            .from('contracts')
            .select('id,no,unit_id,status,start_date,end_date,created_at')
            .eq('tenant_id', tenantId)
            .eq('request_id', finalRequestId)
            .limit(1);

          if (idFilter && !finalRequestId) {
            existingQuery = existingQuery.eq('id', idFilter);
          } else if (noFilter && !finalRequestId) {
            existingQuery = existingQuery.eq('no', noFilter);
          }

          const { data: existing, error: existingError } = await existingQuery.maybeSingle();
          if (existingError) {
            await logApi(500, { error: existingError.message, stage: 'duplicate_contract_lookup' });
            return apiError('contract_create_failed', existingError.message, 500);
          }

          if (existing) {
            const responsePayload = { success: true, contract_id: existing.id, reused: true };
            await emitAlert('duplicate_contract_request', 'WARNING', 'Duplicate contract request was resolved deterministically', {
              contract_id: existing.id,
            });
            await storeIdempotencyResult(operationName, responsePayload, 'contracts', existing.id);
            await logApi(200, { idempotent: true, operation: operationName, via: 'unique_violation' });
            return json({ data: responsePayload, idempotent: true });
          }
        }

        await logApi(400, { error: error.message, operation: operationName });
        return apiError('contract_create_failed', error.message, 400);
      }

      const responsePayload = { success: true, contract_id: data.id, no: data.no };
      await storeIdempotencyResult(operationName, responsePayload, 'contracts', data.id);

      await supabase.rpc('platform_record_usage', {
        p_tenant_id: tenantId,
        p_metric_code: 'transactions',
        p_quantity: 1,
        p_reference_type: 'CONTRACT',
        p_reference_id: data.id,
      });

      await logApi(200, { contract_id: data.id, operation: operationName });
      return json({ data: responsePayload, idempotent: false });
    }

    if (method === 'POST' && path === '/invoices') {
      const operationName = 'public_api_invoice_create';
      const cachedResponse = await lookupDeterministicIdempotencyResult(operationName);
      if (cachedResponse) {
        await logApi(200, { idempotent: true, operation: operationName });
        return json({ data: cachedResponse, idempotent: true });
      }

      if (strictMode) {
        await logApi(409, { blocked: true, reason: 'direct_db_write_disabled', strict_mode: true });
        return apiError(
          'write_path_disabled',
          'Direct table writes are disabled in strict mode. Use an approved atomic RPC workflow instead.',
          409,
        );
      }

      const record: JsonObject = {
        id: mappedPayload.id,
        no: mappedPayload.no,
        contract_id: mappedPayload.contract_id,
        due_date: mappedPayload.due_date,
        amount: mappedPayload.amount,
        tax_amount: mappedPayload.tax_amount ?? 0,
        paid_amount: mappedPayload.paid_amount ?? 0,
        status: mappedPayload.status ?? 'UNPAID',
        type: mappedPayload.type ?? 'RENT',
        notes: mappedPayload.notes ?? '',
        request_id: finalRequestId,
        created_at: mappedPayload.created_at ?? Date.now(),
        tenant_id: tenantId,
      };

      const { data, error } = await supabase.from('invoices').insert(record).select('id,request_id').single();

      if (error) {
        if (isUniqueViolation(error as SupabaseErrorLike)) {
          const { data: existing, error: existingError } = await supabase
            .from('invoices')
            .select('id,request_id,status,amount,created_at')
            .eq('tenant_id', tenantId)
            .eq('request_id', finalRequestId)
            .limit(1)
            .maybeSingle();

          if (existingError) {
            await logApi(500, { error: existingError.message, stage: 'duplicate_invoice_lookup' });
            return apiError('invoice_create_failed', existingError.message, 500);
          }

          if (existing) {
            const responsePayload = { success: true, invoice_id: existing.id, reused: true };
            await emitAlert('duplicate_invoice_request', 'WARNING', 'Duplicate invoice request was resolved deterministically', {
              invoice_id: existing.id,
            });
            await storeIdempotencyResult(operationName, responsePayload, 'invoices', existing.id);
            await logApi(200, { idempotent: true, operation: operationName, via: 'unique_violation' });
            return json({ data: responsePayload, idempotent: true });
          }
        }

        await logApi(400, { error: error.message, operation: operationName });
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

      const responsePayload = { success: true, invoice_id: data.id };
      await storeIdempotencyResult(operationName, responsePayload, 'invoices', data.id);
      await logApi(200, { invoice_id: data.id, operation: operationName });
      return json({ data: responsePayload, idempotent: false });
    }

    if (method === 'POST' && path === '/journal-entries') {
      const operationName = 'public_api_journal_entries_create';
      const cachedResponse = await lookupDeterministicIdempotencyResult(operationName);
      if (cachedResponse) {
        await logApi(200, { idempotent: true, operation: operationName });
        return json({ data: cachedResponse, idempotent: true });
      }

      if (strictMode) {
        await logApi(409, { blocked: true, reason: 'direct_db_write_disabled', strict_mode: true });
        return apiError(
          'write_path_disabled',
          'Direct table writes are disabled in strict mode. Use an approved atomic RPC workflow instead.',
          409,
        );
      }

      if (authPayload.role !== 'ADMIN') {
        await logApi(403, { error: 'role_denied', operation: operationName });
        return apiError('forbidden', 'Only ADMIN role can post raw journal entries', 403);
      }

      const payload = mappedPayload as { entries?: JsonObject[]; batch_id?: string };
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      if (entries.length < 2) {
        await logApi(422, { error: 'missing_entries', operation: operationName });
        return apiError('validation_error', 'At least two journal entries are required per transaction group', 422);
      }

      const batchId = (payload.batch_id as string | undefined) || finalRequestId;
      const transactionGroupId = typeof mappedPayload.transaction_group_id === 'string'
        ? String(mappedPayload.transaction_group_id)
        : crypto.randomUUID();
      const enriched = entries.map((entry) => ({
        id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
        ...entry,
        tenant_id: tenantId,
        batch_id: batchId,
        transaction_group_id: transactionGroupId,
        request_id: finalRequestId,
        source_module: 'PUBLIC_API',
      }));

      const { error } = await supabase.from('journal_entries').insert(enriched);
      if (error) {
        if (isUniqueViolation(error as SupabaseErrorLike)) {
          const { data: existing, error: existingError } = await supabase
            .from('journal_entries')
            .select('id,batch_id,request_id,created_at')
            .eq('tenant_id', tenantId)
            .eq('request_id', finalRequestId)
            .order('created_at', { ascending: false })
            .limit(200);

          if (existingError) {
            await logApi(500, { error: existingError.message, stage: 'duplicate_journal_lookup' });
            return apiError('journal_post_failed', existingError.message, 500);
          }

          const responsePayload = {
            success: true,
            batch_id: batchId,
            entries: existing?.length || 0,
            reused: true,
          };
          const existingId = existing?.[0]?.id ? String(existing[0].id) : null;
          await emitAlert('duplicate_journal_request', 'WARNING', 'Duplicate journal request was resolved deterministically', {
            entries: existing?.length || 0,
          });
          if (existingId) {
            await storeIdempotencyResult(operationName, responsePayload, 'journal_entries', existingId);
          }
          await logApi(200, { idempotent: true, operation: operationName, via: 'unique_violation' });
          return json({ data: responsePayload, idempotent: true });
        }

        await logApi(400, { error: error.message, operation: operationName });
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

      const responsePayload = { success: true, batch_id: batchId, entries: entries.length };
      const firstInsertedId = typeof enriched[0]?.id === 'string' ? String(enriched[0].id) : null;
      if (firstInsertedId) {
        await storeIdempotencyResult(operationName, responsePayload, 'journal_entries', firstInsertedId);
      }
      await logApi(200, { batch_id: batchId, entries: entries.length, operation: operationName });
      return json({ data: responsePayload, idempotent: false });
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
