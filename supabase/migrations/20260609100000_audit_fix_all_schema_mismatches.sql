-- =============================================================================
-- AUDIT FIX: Comprehensive schema mismatch resolution
-- Discovered via full code↔DB audit on 2026-06-09
-- Fixes ALL blocking mismatches found between frontend services and live schema
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. RECEIPTS: add missing columns used by post_receipt_atomic
-- ---------------------------------------------------------------------------
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS check_number  text,
  ADD COLUMN IF NOT EXISTS check_bank    text,
  ADD COLUMN IF NOT EXISTS check_date    text,
  ADD COLUMN IF NOT EXISTS check_status  text,
  ADD COLUMN IF NOT EXISTS tenant_id     text;

-- ---------------------------------------------------------------------------
-- 2. RECEIPT_ALLOCATIONS: add tenant_id (referenced in database.ts types)
-- ---------------------------------------------------------------------------
ALTER TABLE public.receipt_allocations
  ADD COLUMN IF NOT EXISTS tenant_id text;

-- ---------------------------------------------------------------------------
-- 3. MAINTENANCE_RECORDS: add columns expected by maintenance-service.ts
--    Code queries: property_id, title, assigned_to, resolved_at
-- ---------------------------------------------------------------------------
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS property_id  text,
  ADD COLUMN IF NOT EXISTS title        text,
  ADD COLUMN IF NOT EXISTS assigned_to  text,
  ADD COLUMN IF NOT EXISTS resolved_at  timestamptz;

-- Back-fill title from description where title is null (graceful migration)
UPDATE public.maintenance_records
   SET title = left(description, 120)
 WHERE title IS NULL AND description IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. UNITS: make name nullable so frontend inserts with unit_number only work
--    units.name is NOT NULL with no default → every new unit insert fails
-- ---------------------------------------------------------------------------
ALTER TABLE public.units
  ALTER COLUMN name DROP NOT NULL;

-- Trigger: keep name in sync with unit_number when name not supplied
CREATE OR REPLACE FUNCTION public._sync_unit_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := COALESCE(NEW.unit_number, NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_unit_name ON public.units;
CREATE TRIGGER trg_sync_unit_name
  BEFORE INSERT OR UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public._sync_unit_name();

-- Back-fill existing nulls
UPDATE public.units
   SET name = COALESCE(unit_number, id::text)
 WHERE name IS NULL OR name = '';

-- ---------------------------------------------------------------------------
-- 5. EXPENSES: property_id is uuid but properties.id is text — fix to text
-- ---------------------------------------------------------------------------
ALTER TABLE public.expenses
  ALTER COLUMN property_id TYPE text USING property_id::text;

-- ---------------------------------------------------------------------------
-- 6. FIX post_receipt_atomic: search_path, bigint casts, uuid↔text mismatches
--    Current version has:
--      SET search_path TO '' but uses unqualified table names
--      created_at cast as bigint but columns are timestamptz
--      contract_id cast as uuid but receipts.contract_id is text
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_receipt_atomic(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_receipt         jsonb;
  v_allocations     jsonb;
  v_journal_entries jsonb;
  v_request_id      text;
  v_receipt_id      text;
  v_existing_id     text;
  v_invoice_id      text;
BEGIN
  -- Auth check: ADMIN or MANAGER only
  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'MANAGER')
      AND u.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية متاحة فقط للمدير أو المسؤول'
      USING ERRCODE = '42501';
  END IF;

  v_receipt         := COALESCE(payload -> 'receipt',         '{}'::jsonb);
  v_allocations     := COALESCE(payload -> 'allocations',     '[]'::jsonb);
  v_journal_entries := COALESCE(payload -> 'journal_entries', '[]'::jsonb);
  v_request_id      := nullif(COALESCE(payload->>'request_id', v_receipt->>'request_id'), '');

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'معرّف الطلب مطلوب لضمان عدم التكرار.';
  END IF;

  -- Idempotency check
  SELECT r.id INTO v_existing_id
  FROM receipts r
  WHERE r.request_id = v_request_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success',    true,
      'idempotent', true,
      'request_id', v_request_id,
      'receipt_id', v_existing_id
    );
  END IF;

  -- Validate invoices exist
  FOR v_invoice_id IN
    SELECT value->>'invoice_id' FROM jsonb_array_elements(v_allocations)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM invoices WHERE id = v_invoice_id) THEN
      RAISE EXCEPTION 'فاتورة غير موجودة: %', v_invoice_id;
    END IF;
  END LOOP;

  -- Insert receipt
  -- contract_id kept as TEXT (receipts.contract_id is text)
  -- created_at as timestamptz (no bigint cast)
  v_receipt_id := COALESCE(v_receipt->>'id', gen_random_uuid()::text);

  INSERT INTO receipts (
    id, no, contract_id, date_time, channel, amount,
    ref, notes, status,
    check_number, check_bank, check_date, check_status,
    created_at, request_id, tenant_id
  ) VALUES (
    v_receipt_id,
    v_receipt->>'no',
    v_receipt->>'contract_id',          -- text, not uuid cast
    v_receipt->>'date_time',
    v_receipt->>'channel',
    (v_receipt->>'amount')::numeric,
    COALESCE(v_receipt->>'ref', ''),
    COALESCE(v_receipt->>'notes', ''),
    COALESCE(v_receipt->>'status', 'POSTED'),
    nullif(v_receipt->>'check_number', ''),
    nullif(v_receipt->>'check_bank',   ''),
    nullif(v_receipt->>'check_date',   ''),
    nullif(v_receipt->>'check_status', ''),
    now(),                               -- timestamptz, not bigint
    v_request_id,
    nullif(v_receipt->>'tenant_id', '')
  );

  -- Insert allocations
  INSERT INTO receipt_allocations (id, receipt_id, invoice_id, amount, created_at, tenant_id)
  SELECT
    COALESCE(a->>'id', gen_random_uuid()::text),
    v_receipt_id,
    a->>'invoice_id',
    (a->>'amount')::numeric,
    now(),                               -- timestamptz, not bigint
    nullif(a->>'tenant_id', '')
  FROM jsonb_array_elements(v_allocations) AS a;

  -- Update invoice paid_amount and status
  WITH alloc_totals AS (
    SELECT
      a->>'invoice_id'              AS invoice_id,
      SUM((a->>'amount')::numeric)  AS total_allocated
    FROM jsonb_array_elements(v_allocations) AS a
    GROUP BY 1
  )
  UPDATE invoices i
     SET paid_amount = COALESCE(i.paid_amount, 0) + at.total_allocated,
         status = CASE
           WHEN (COALESCE(i.paid_amount, 0) + at.total_allocated)
                >= (COALESCE(i.amount, 0) + COALESCE(i.tax_amount, 0)) - 0.001
           THEN 'PAID'
           WHEN (COALESCE(i.paid_amount, 0) + at.total_allocated) > 0
           THEN 'PARTIALLY_PAID'
           ELSE i.status
         END
  FROM alloc_totals at
  WHERE i.id = at.invoice_id;

  -- Insert journal entries
  INSERT INTO journal_entries (
    id, no, date, account_id, amount, type,
    source_id, entity_type, entity_id, created_at
  )
  SELECT
    COALESCE(j->>'id', gen_random_uuid()::text),
    j->>'no',
    j->>'date',
    j->>'account_id',
    (j->>'amount')::numeric,
    j->>'type',
    j->>'source_id',
    nullif(j->>'entity_type', ''),
    nullif(j->>'entity_id',   ''),
    now()
  FROM jsonb_array_elements(v_journal_entries) AS j;

  RETURN jsonb_build_object(
    'success',    true,
    'idempotent', false,
    'request_id', v_request_id,
    'receipt_id', v_receipt_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.post_receipt_atomic(jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.post_receipt_atomic(jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. CREATE generate_invoices_from_active_contracts RPC
--    Used by invoiceService.ts to auto-generate monthly rent invoices
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invoices_from_active_contracts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract        RECORD;
  v_count           integer := 0;
  v_today           date    := current_date;
  v_due_date        text;
  v_due_day         integer;
  v_max_day         integer;
  v_invoice_exists  boolean;
  v_invoice_id      text;
BEGIN
  IF NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'ADMIN or MANAGER role required'
      USING ERRCODE = '42501';
  END IF;

  FOR v_contract IN
    SELECT
      c.id,
      c.rent_amount,
      c.due_day,
      c.start_date,
      c.end_date,
      c.tenant_id
    FROM contracts c
    WHERE c.status = 'ACTIVE'
      AND c.deleted_at IS NULL
  LOOP
    -- Compute due_day clamped to end of current month
    v_due_day := COALESCE(v_contract.due_day, 1);
    v_max_day := EXTRACT(DAY FROM
      (date_trunc('month', v_today) + interval '1 month - 1 day'))::integer;

    v_due_date := to_char(
      make_date(
        EXTRACT(YEAR  FROM v_today)::integer,
        EXTRACT(MONTH FROM v_today)::integer,
        LEAST(v_due_day, v_max_day)
      ),
      'YYYY-MM-DD'
    );

    -- Skip if invoice already exists for this contract + due_date
    SELECT EXISTS (
      SELECT 1 FROM invoices
      WHERE contract_id = v_contract.id
        AND due_date     = v_due_date
        AND status      NOT IN ('VOID')
        AND deleted_at  IS NULL
    ) INTO v_invoice_exists;

    IF v_invoice_exists THEN
      CONTINUE;
    END IF;

    v_invoice_id := gen_random_uuid()::text;

    INSERT INTO invoices (
      id, contract_id, due_date, amount, paid_amount,
      status, type, created_at, issue_date
    ) VALUES (
      v_invoice_id,
      v_contract.id,
      v_due_date,
      COALESCE(v_contract.rent_amount, 0),
      0,
      'UNPAID',
      'RENT',
      now(),
      v_today
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_invoices_from_active_contracts() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.generate_invoices_from_active_contracts() TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. PERFORMANCE INDEXES on frequently queried columns
-- ---------------------------------------------------------------------------

-- contracts
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at
  ON public.contracts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_property_id
  ON public.contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status
  ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id
  ON public.contracts(tenant_id);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at
  ON public.invoices(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id
  ON public.invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON public.invoices(status);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at
  ON public.payments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date
  ON public.payments(payment_date);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at
  ON public.expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id
  ON public.expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date
  ON public.expenses(expense_date);

-- receipts
CREATE INDEX IF NOT EXISTS idx_receipts_deleted_at
  ON public.receipts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_receipts_contract_id
  ON public.receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_receipts_request_id
  ON public.receipts(request_id) WHERE request_id IS NOT NULL;

-- maintenance_records
CREATE INDEX IF NOT EXISTS idx_maintenance_records_deleted_at
  ON public.maintenance_records(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_records_property_id
  ON public.maintenance_records(property_id) WHERE property_id IS NOT NULL;

-- properties
CREATE INDEX IF NOT EXISTS idx_properties_deleted_at
  ON public.properties(deleted_at) WHERE deleted_at IS NULL;

-- units
CREATE INDEX IF NOT EXISTS idx_units_deleted_at
  ON public.units(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_units_property_id
  ON public.units(property_id);

-- people
CREATE INDEX IF NOT EXISTS idx_people_deleted_at
  ON public.people(deleted_at) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 9. RLS: add maintenance_requests view policy for backward compat
--    (maintenance-service.ts will be updated to use maintenance_records directly)
-- ---------------------------------------------------------------------------

-- Ensure maintenance_records has proper RLS (it already has one, this is a guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'maintenance_records'
  ) THEN
    CREATE POLICY app_user_maintenance_records ON public.maintenance_records
      FOR ALL USING (app_private.is_app_user());
  END IF;
END;
$$;

COMMIT;
