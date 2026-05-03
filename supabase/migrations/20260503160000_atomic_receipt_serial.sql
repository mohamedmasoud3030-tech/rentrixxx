-- =============================================================================
-- 20260503160000_atomic_receipt_serial.sql
--
-- Make receipt serial assignment part of the post_receipt_atomic transaction.
--
-- Before this change the application called increment_serial separately (before
-- or as a wrapper), which meant the serial counter could advance even if the
-- RPC rolled back, producing permanent gaps in the receipt number sequence.
--
-- After this change:
--   • The serials.receipt column is incremented with FOR UPDATE inside the
--     same PL/pgSQL body, before the receipt INSERT.  If anything raises an
--     exception the whole function rolls back — serial included.
--   • The atomically assigned receipt number is stored in the receipts.no
--     column and returned to the caller as receipt_no.
--   • The application no longer calls incrementSerial for receipts.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.post_receipt_atomic(
  payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt          jsonb;
  v_allocations      jsonb;
  v_journal_entries  jsonb;
  v_request_id       text;
  v_receipt_id       uuid;
  v_existing_receipt_id uuid;
  v_existing_result  jsonb;
  v_receipt_contract_id uuid;
  v_receipt_amount   numeric;
  v_total_allocations numeric := 0;
  v_receipt_date     date;
  v_tenant_id        uuid;
  v_batch_id         text;
  v_invoice_id       uuid;
  v_invoice_contract_id uuid;
  v_invoice_total    numeric;
  v_invoice_paid     numeric;
  v_allocation_amount numeric;
  v_duplicate_count  integer;
  v_journal_debits   numeric := 0;
  v_journal_credits  numeric := 0;
  -- Atomically-assigned human-readable receipt number
  v_receipt_no       text;
BEGIN
  v_receipt             := COALESCE(payload->'receipt', '{}'::jsonb);
  v_allocations         := COALESCE(payload->'allocations', '[]'::jsonb);
  v_journal_entries     := COALESCE(payload->'journal_entries', '[]'::jsonb);
  v_request_id          := NULLIF(COALESCE(payload->>'request_id', v_receipt->>'request_id'), '');
  v_receipt_contract_id := (v_receipt->>'contract_id')::uuid;
  v_receipt_amount      := COALESCE((v_receipt->>'amount')::numeric, 0);
  v_receipt_date        := (v_receipt->>'date_time')::date;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'معرّف الطلب مطلوب لضمان عدم التكرار.';
  END IF;

  -- ── Idempotency check ───────────────────────────────────────────────────────
  SELECT response_payload
    INTO v_existing_result
  FROM public.financial_operation_idempotency
  WHERE operation_name = 'post_receipt_atomic'
    AND request_id = v_request_id
  FOR UPDATE;

  IF v_existing_result IS NOT NULL THEN
    RETURN v_existing_result;
  END IF;

  -- ── Validation ──────────────────────────────────────────────────────────────
  IF v_receipt_contract_id IS NULL THEN
    RAISE EXCEPTION 'العقد المرتبط بسند القبض مطلوب.';
  END IF;
  IF v_receipt_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ سند القبض يجب أن يكون أكبر من صفر.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = v_receipt_contract_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'العقد غير موجود أو محذوف.';
  END IF;

  SELECT c.organization_id INTO v_tenant_id
  FROM public.contracts c
  WHERE c.id = v_receipt_contract_id;

  v_batch_id := COALESCE(v_request_id, v_receipt->>'id');

  IF EXISTS (
    SELECT 1
    FROM public.accounting_periods p
    WHERE p.status = 'CLOSED'
      AND p.start_date <= v_receipt_date
      AND p.end_date   >= v_receipt_date
  ) THEN
    RAISE EXCEPTION 'الفترة المحاسبية مغلقة ولا تسمح بترحيل قيود جديدة.';
  END IF;

  -- Check for a previously inserted receipt with the same request_id
  SELECT r.id, r.no
    INTO v_existing_receipt_id, v_receipt_no
  FROM public.receipts r
  WHERE r.request_id = v_request_id
  LIMIT 1;

  IF v_existing_receipt_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success',     true,
      'idempotent',  true,
      'request_id',  v_request_id,
      'receipt_id',  v_existing_receipt_id,
      'receipt_no',  v_receipt_no
    );
  END IF;

  -- Duplicate-invoice guard
  SELECT COUNT(*)
    INTO v_duplicate_count
  FROM (
    SELECT (value->>'invoice_id')::uuid AS invoice_id
    FROM jsonb_array_elements(v_allocations)
    GROUP BY 1
    HAVING COUNT(*) > 1
  ) duplicates;
  IF COALESCE(v_duplicate_count, 0) > 0 THEN
    RAISE EXCEPTION 'لا يمكن تكرار نفس الفاتورة داخل نفس سند القبض.';
  END IF;

  -- Per-allocation integrity checks
  FOR v_invoice_id, v_allocation_amount IN
    SELECT (value->>'invoice_id')::uuid, COALESCE((value->>'amount')::numeric, 0)
    FROM jsonb_array_elements(v_allocations)
  LOOP
    IF v_allocation_amount <= 0 THEN
      RAISE EXCEPTION 'مبلغ التخصيص يجب أن يكون أكبر من صفر.';
    END IF;
    SELECT i.contract_id,
           (COALESCE(i.amount, 0) + COALESCE(i.tax_amount, 0)),
           COALESCE(i.paid_amount, 0)
      INTO v_invoice_contract_id, v_invoice_total, v_invoice_paid
    FROM public.invoices i
    WHERE i.id = v_invoice_id
    FOR UPDATE;
    IF v_invoice_contract_id IS NULL THEN
      RAISE EXCEPTION 'فاتورة غير موجودة: %', v_invoice_id;
    END IF;
    IF v_invoice_contract_id <> v_receipt_contract_id THEN
      RAISE EXCEPTION 'الفاتورة % لا تتبع نفس العقد.', v_invoice_id;
    END IF;
    IF (v_invoice_paid + v_allocation_amount) > (v_invoice_total + 0.001) THEN
      RAISE EXCEPTION 'قيمة التخصيص تتجاوز رصيد الفاتورة %.', v_invoice_id;
    END IF;
    v_total_allocations := v_total_allocations + v_allocation_amount;
  END LOOP;

  IF ABS(v_total_allocations - v_receipt_amount) > 0.001 THEN
    RAISE EXCEPTION 'مجموع التخصيصات يجب أن يساوي مبلغ السند.';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN (j->>'type') = 'DEBIT'  THEN (j->>'amount')::numeric ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (j->>'type') = 'CREDIT' THEN (j->>'amount')::numeric ELSE 0 END), 0)
  INTO v_journal_debits, v_journal_credits
  FROM jsonb_array_elements(v_journal_entries) AS j;

  IF ABS(v_journal_debits - v_journal_credits) > 0.001 THEN
    RAISE EXCEPTION 'القيود المحاسبية غير متوازنة.';
  END IF;

  -- ── Atomically increment the receipt serial ─────────────────────────────────
  -- Lock the row first so concurrent calls don't race on the counter.
  PERFORM 1 FROM public.serials WHERE id = 1 FOR UPDATE;

  UPDATE public.serials
     SET receipt = receipt + 1
   WHERE id = 1
  RETURNING receipt::text INTO v_receipt_no;

  IF v_receipt_no IS NULL THEN
    RAISE EXCEPTION 'فشل توليد رقم السند: صف serials غير موجود.';
  END IF;

  -- ── Insert receipt (using the atomically assigned serial) ───────────────────
  INSERT INTO public.receipts (
    id,
    no,
    contract_id,
    date_time,
    channel,
    amount,
    ref,
    notes,
    status,
    check_number,
    check_bank,
    check_date,
    check_status,
    created_at,
    request_id,
    tenant_id
  )
  VALUES (
    (v_receipt->>'id')::uuid,
    v_receipt_no,
    (v_receipt->>'contract_id')::uuid,
    v_receipt->>'date_time',
    v_receipt->>'channel',
    (v_receipt->>'amount')::numeric,
    COALESCE(v_receipt->>'ref', ''),
    COALESCE(v_receipt->>'notes', ''),
    v_receipt->>'status',
    NULLIF(v_receipt->>'check_number', ''),
    NULLIF(v_receipt->>'check_bank', ''),
    NULLIF(v_receipt->>'check_date', ''),
    NULLIF(v_receipt->>'check_status', ''),
    (v_receipt->>'created_at')::timestamptz,
    v_request_id,
    v_tenant_id
  )
  RETURNING id INTO v_receipt_id;

  -- ── Receipt allocations ─────────────────────────────────────────────────────
  INSERT INTO public.receipt_allocations (id, receipt_id, invoice_id, amount, created_at, tenant_id)
  SELECT
    (a->>'id')::uuid,
    v_receipt_id,
    (a->>'invoice_id')::uuid,
    (a->>'amount')::numeric,
    (a->>'created_at')::timestamptz,
    v_tenant_id
  FROM jsonb_array_elements(v_allocations) AS a;

  -- ── Update invoice balances ─────────────────────────────────────────────────
  WITH alloc_totals AS (
    SELECT
      (a->>'invoice_id')::uuid AS invoice_id,
      SUM((a->>'amount')::numeric) AS total_allocated
    FROM jsonb_array_elements(v_allocations) AS a
    GROUP BY 1
  )
  UPDATE public.invoices i
     SET
       paid_amount = COALESCE(i.paid_amount, 0) + alloc_totals.total_allocated,
       status = CASE
         WHEN (COALESCE(i.paid_amount, 0) + alloc_totals.total_allocated) >= (COALESCE(i.amount, 0) + COALESCE(i.tax_amount, 0)) - 0.001 THEN 'PAID'
         WHEN (COALESCE(i.paid_amount, 0) + alloc_totals.total_allocated) > 0 THEN 'PARTIALLY_PAID'
         ELSE i.status
       END
  FROM alloc_totals
  WHERE i.id = alloc_totals.invoice_id;

  -- ── Journal entries ─────────────────────────────────────────────────────────
  INSERT INTO public.journal_entries (
    id,
    no,
    date,
    account_id,
    amount,
    type,
    source_id,
    entity_type,
    entity_id,
    created_at,
    tenant_id,
    batch_id,
    request_id,
    source_module
  )
  SELECT
    (j->>'id')::uuid,
    j->>'no',
    j->>'date',
    j->>'account_id',
    (j->>'amount')::numeric,
    j->>'type',
    j->>'source_id',
    NULLIF(j->>'entity_type', ''),
    NULLIF(j->>'entity_id', ''),
    (j->>'created_at')::timestamptz,
    v_tenant_id,
    v_batch_id,
    v_request_id,
    'RECEIPTS'
  FROM jsonb_array_elements(v_journal_entries) AS j;

  PERFORM public.seal_ledger_batch(v_batch_id, v_tenant_id);

  -- ── Build and persist result (idempotency store) ────────────────────────────
  v_existing_result := jsonb_build_object(
    'success',    true,
    'idempotent', false,
    'request_id', v_request_id,
    'receipt_id', v_receipt_id,
    'receipt_no', v_receipt_no
  );

  INSERT INTO public.financial_operation_idempotency (operation_name, request_id, response_payload)
  VALUES ('post_receipt_atomic', v_request_id, v_existing_result)
  ON CONFLICT (operation_name, request_id) DO NOTHING;

  -- ── Audit and event log ─────────────────────────────────────────────────────
  INSERT INTO public.financial_audit_log (
    action,
    actor_id,
    source_module,
    request_id,
    entity_type,
    entity_id,
    before_state,
    after_state,
    metadata
  ) VALUES (
    'POST_RECEIPT',
    NULL,
    'RECEIPTS',
    v_request_id,
    'RECEIPT',
    v_receipt_id,
    NULL,
    jsonb_build_object('receipt_id', v_receipt_id, 'contract_id', v_receipt_contract_id, 'receipt_no', v_receipt_no),
    jsonb_build_object('allocations_count', jsonb_array_length(v_allocations), 'tenant_id', v_tenant_id, 'batch_id', v_batch_id)
  );

  PERFORM public.append_financial_event(
    'RECEIPT_POSTED',
    v_tenant_id,
    v_request_id,
    'RECEIPT',
    v_receipt_id,
    jsonb_build_object('batch_id', v_batch_id, 'contract_id', v_receipt_contract_id, 'amount', v_receipt_amount, 'receipt_no', v_receipt_no)
  );

  RETURN v_existing_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_receipt_atomic(jsonb) TO authenticated;
