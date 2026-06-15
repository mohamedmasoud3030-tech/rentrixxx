-- =============================================================================
-- Migration: 20260615000100_fix_invoice_payment_account_resolution
-- Priority: v0.1 BLOCKER
-- Date: 2026-06-15
--
-- record_invoice_payment_atomic previously called find_payment_account_id(text),
-- which cast public.accounts.id to uuid. The live chart of accounts stores text
-- account codes such as 1111 and 1201, so every payment attempt failed before
-- receipt/allocation posting could occur.
--
-- Keep the v0.1 operational payment path intact while matching the real schema:
-- - resolve cash and receivable accounts by explicit chart-of-accounts codes;
-- - return text account IDs for journal_entries.account_id;
-- - preserve the browser-facing record_invoice_payment_atomic(jsonb) contract.
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.find_payment_account_id(text);

CREATE OR REPLACE FUNCTION public.find_payment_account_id(account_role text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_no text;
  v_target_name_pattern text;
  v_matched_count bigint;
  v_matched_account_id text;
BEGIN
  IF to_regclass('public.accounts') IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'accounts'
      AND column_name = 'id'
  ) THEN
    RETURN NULL;
  END IF;

  CASE account_role
    WHEN 'cash' THEN
      v_target_no := '1111';
      v_target_name_pattern := '(cash|صندوق|الصندوق)';
    WHEN 'receivable' THEN
      v_target_no := '1201';
      v_target_name_pattern := '(receivable|tenant|ذمم المستأجرين)';
    ELSE
      RETURN NULL;
  END CASE;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'accounts'
      AND column_name = 'no'
  ) THEN
    EXECUTE
      'SELECT count(*)::bigint, min(id::text) FROM public.accounts WHERE no::text = $1'
      INTO v_matched_count, v_matched_account_id
      USING v_target_no;

    IF coalesce(v_matched_count, 0) = 1 THEN
      RETURN v_matched_account_id;
    END IF;

    IF v_matched_count > 1 THEN
      RAISE EXCEPTION 'Multiple % payment accounts matched by account number %', account_role, v_target_no;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'accounts'
      AND column_name = 'name'
  ) THEN
    RETURN NULL;
  END IF;

  EXECUTE
    'SELECT count(*)::bigint, min(id::text)
       FROM public.accounts
      WHERE lower(coalesce(name::text, '''')) ~ $1'
    INTO v_matched_count, v_matched_account_id
    USING v_target_name_pattern;

  IF coalesce(v_matched_count, 0) = 0 THEN
    RETURN NULL;
  END IF;

  IF v_matched_count > 1 THEN
    RAISE EXCEPTION 'Multiple % payment accounts matched; configure accounting accounts unambiguously', account_role;
  END IF;

  RETURN v_matched_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_invoice_payment_atomic(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid;
  v_invoice_id uuid;
  v_amount numeric;
  v_method text;
  v_date date;
  v_reference text;
  v_request_id text;
  v_invoice jsonb;
  v_contract jsonb;
  v_total_due numeric;
  v_paid_amount numeric;
  v_outstanding numeric;
  v_receipt_id uuid := gen_random_uuid();
  v_allocation_id uuid := gen_random_uuid();
  v_payment_id uuid := gen_random_uuid();
  v_debit_account_id text;
  v_credit_account_id text;
  v_internal_payload jsonb;
  v_internal_result jsonb;
  v_existing_result jsonb;
  v_payment_columns text[];
  v_payment_insert_columns text;
  v_payment_insert_values text;
  v_result jsonb;
BEGIN
  actor_id := auth.uid();
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to record invoice payments';
  END IF;

  IF NOT coalesce(public.is_admin_or_manager(), false) THEN
    RAISE EXCEPTION 'ADMIN or MANAGER role is required to record invoice payments'
      USING errcode = '42501';
  END IF;

  v_request_id := nullif(payload->>'request_id', '');
  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'request_id is required for idempotent payment recording';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'record_invoice_payment_atomic:' || v_request_id,
      0
    )
  );

  SELECT response_payload
    INTO v_existing_result
  FROM public.financial_operation_idempotency
  WHERE operation_name = 'record_invoice_payment_atomic'
    AND request_id = v_request_id
  FOR UPDATE;

  IF v_existing_result IS NOT NULL THEN
    RETURN v_existing_result;
  END IF;

  v_invoice_id := nullif(payload->>'invoice_id', '')::uuid;
  v_amount := coalesce((payload->>'amount')::numeric, 0);
  v_method := nullif(payload->>'method', '');
  v_date := coalesce(nullif(payload->>'date', '')::date, current_date);
  v_reference := nullif(payload->>'reference', '');

  IF v_invoice_id IS NULL THEN
    RAISE EXCEPTION 'invoice_id is required';
  END IF;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT to_jsonb(i)
    INTO v_invoice
  FROM public.invoices i
  WHERE i.id = v_invoice_id
    AND coalesce((to_jsonb(i)->>'deleted_at')::timestamptz, NULL) IS NULL
  FOR UPDATE;

  IF v_invoice IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  SELECT to_jsonb(c)
    INTO v_contract
  FROM public.contracts c
  WHERE c.id = (v_invoice->>'contract_id')::uuid
    AND coalesce((to_jsonb(c)->>'deleted_at')::timestamptz, NULL) IS NULL
  FOR UPDATE;

  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract for invoice not found';
  END IF;

  v_total_due := coalesce((v_invoice->>'amount')::numeric, 0) + coalesce((v_invoice->>'tax_amount')::numeric, 0);
  v_paid_amount := coalesce((v_invoice->>'paid_amount')::numeric, 0);
  v_outstanding := v_total_due - v_paid_amount;

  IF v_amount > v_outstanding + 0.001 THEN
    RAISE EXCEPTION 'Payment amount exceeds outstanding invoice balance';
  END IF;

  v_debit_account_id := public.find_payment_account_id('cash');
  v_credit_account_id := public.find_payment_account_id('receivable');

  IF v_debit_account_id IS NULL OR v_credit_account_id IS NULL THEN
    RAISE EXCEPTION 'Payment accounting accounts are not configured';
  END IF;

  v_internal_payload := jsonb_build_object(
    'request_id', v_request_id,
    'receipt', jsonb_build_object(
      'id', v_receipt_id,
      'contract_id', v_invoice->>'contract_id',
      'date_time', v_date::text,
      'channel', v_method,
      'amount', v_amount,
      'ref', coalesce(v_reference, v_request_id),
      'notes', 'Invoice payment ' || v_invoice_id::text,
      'status', 'POSTED',
      'created_at', timezone('utc', now()),
      'request_id', v_request_id
    ),
    'allocations', jsonb_build_array(jsonb_build_object(
      'id', v_allocation_id,
      'invoice_id', v_invoice_id,
      'amount', v_amount,
      'created_at', timezone('utc', now())
    )),
    'journal_entries', jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'no', 'PAY-' || left(replace(v_request_id, '-', ''), 12) || '-D',
        'date', v_date::text,
        'account_id', v_debit_account_id,
        'amount', v_amount,
        'type', 'DEBIT',
        'source_id', v_receipt_id,
        'entity_type', 'contract',
        'entity_id', v_invoice->>'contract_id',
        'created_at', timezone('utc', now())
      ),
      jsonb_build_object(
        'id', gen_random_uuid(),
        'no', 'PAY-' || left(replace(v_request_id, '-', ''), 12) || '-C',
        'date', v_date::text,
        'account_id', v_credit_account_id,
        'amount', v_amount,
        'type', 'CREDIT',
        'source_id', v_receipt_id,
        'entity_type', 'contract',
        'entity_id', v_invoice->>'contract_id',
        'created_at', timezone('utc', now())
      )
    )
  );

  v_internal_result := public.post_receipt_atomic(v_internal_payload);
  v_payment_id := coalesce(nullif(v_internal_result->>'payment_id', '')::uuid, v_payment_id);

  IF v_internal_result ? 'payment_id' THEN
    v_payment_id := (v_internal_result->>'payment_id')::uuid;
  ELSE
    SELECT array_agg(column_name ORDER BY ordinal_position)
      INTO v_payment_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name IN ('id', 'invoice_id', 'amount', 'payment_method', 'payment_date', 'reference_number', 'payment_reference');

    v_payment_insert_columns := array_to_string(v_payment_columns, ', ');
    v_payment_insert_values := array_to_string(array(
      SELECT CASE column_name
        WHEN 'id' THEN quote_literal(v_payment_id)
        WHEN 'invoice_id' THEN quote_literal(v_invoice_id)
        WHEN 'amount' THEN quote_literal(round(v_amount, 2))
        WHEN 'payment_method' THEN quote_literal(v_method)
        WHEN 'payment_date' THEN quote_literal(v_date)
        WHEN 'reference_number' THEN quote_nullable(v_reference)
        WHEN 'payment_reference' THEN quote_nullable(v_reference)
      END
      FROM unnest(v_payment_columns) AS column_name
    ), ', ');

    EXECUTE format('INSERT INTO public.payments (%s) VALUES (%s)', v_payment_insert_columns, v_payment_insert_values);
  END IF;

  v_result := coalesce(v_internal_result, '{}'::jsonb)
    || jsonb_build_object(
      'status', 'recorded',
      'request_id', v_request_id,
      'invoice_id', v_invoice_id,
      'payment_id', v_payment_id,
      'receipt_id', coalesce(nullif(v_internal_result->>'receipt_id', '')::uuid, v_receipt_id)
    );

  INSERT INTO public.financial_operation_idempotency(operation_name, request_id, response_payload)
  VALUES ('record_invoice_payment_atomic', v_request_id, v_result)
  ON CONFLICT (operation_name, request_id) DO NOTHING;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.find_payment_account_id(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_invoice_payment_atomic(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment_atomic(jsonb) TO authenticated;

COMMIT;
