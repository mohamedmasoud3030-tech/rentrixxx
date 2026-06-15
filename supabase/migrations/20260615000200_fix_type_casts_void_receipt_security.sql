-- =============================================================================
-- Migration: 20260615000200_fix_type_casts_void_receipt_security
-- Date: 2026-06-15
-- Summary: Consolidates all DB fixes applied in the current session:
--   1. renew_contract_atomic: bigint → now() for contracts.updated_at
--   2. update_contract_balance_on_receipt_allocation: bigint → now()
--   3. update_owner_balance_on_expense: bigint → now() + remove ACTIVE filter
--   4. void_receipt_atomic(uuid,bigint,...): created_at cast bigint→timestamptz
--   5. void_receipt_atomic(jsonb): single-payload wrapper for frontend
--   6. invoices/receipts/expenses/app_notifications/outgoing_notifications
--      deleted_at: bigint → timestamptz
--   7. v_balance_reconciliation: recreated after column type change
--   8. record_invoice_payment_atomic: uses deleted_at IS NULL (safe after #6)
--   9. Security: REVOKE anon from void_receipt_atomic
-- =============================================================================

BEGIN;

-- ── 1. renew_contract_atomic ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.renew_contract_atomic(old_contract_id uuid, new_contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_id uuid;
  v_unit_id uuid;
  v_active_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'MANAGER')
  ) THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية متاحة فقط للمدير أو المسؤول';
  END IF;

  SELECT unit_id INTO v_unit_id
  FROM public.contracts
  WHERE id = old_contract_id AND status = 'ACTIVE' AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original contract is not ACTIVE';
  END IF;

  SELECT count(*) INTO v_active_count
  FROM public.contracts
  WHERE unit_id = v_unit_id AND status = 'ACTIVE' AND deleted_at IS NULL
    AND id::text <> old_contract_id::text;

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'Unit already has another ACTIVE contract';
  END IF;

  UPDATE public.contracts
  SET status = 'ENDED', ended_at = now(), updated_at = now()
  WHERE id = old_contract_id;

  INSERT INTO public.contracts (
    id, no, unit_id, tenant_id, rent_amount, due_day,
    start_date, end_date, deposit, status,
    sponsor_name, sponsor_id, sponsor_phone,
    is_demo, created_at, updated_at, deleted_at
  )
  SELECT
    coalesce(r.id, gen_random_uuid()),
    r.no, r.unit_id, r.tenant_id, r.rent_amount, r.due_day,
    r.start_date, r.end_date, coalesce(r.deposit, 0), 'ACTIVE',
    r.sponsor_name, r.sponsor_id, r.sponsor_phone,
    coalesce(r.is_demo, false),
    now(), now(), null
  FROM jsonb_populate_record(null::public.contracts, new_contract_data) AS r
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'old_contract_id', old_contract_id,
    'new_contract_id', v_new_id
  );
END;
$$;

-- ── 2. update_contract_balance_on_receipt_allocation ────────────────────────
CREATE OR REPLACE FUNCTION public.update_contract_balance_on_receipt_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO contract_balances (contract_id, tenant_id, unit_id, total_invoiced, total_paid, balance_due, updated_at)
  SELECT c.id, c.tenant_id, c.unit_id,
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0)), 0),
    coalesce(sum(i.paid_amount), 0),
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0) - i.paid_amount), 0),
    now()
  FROM contracts c
  LEFT JOIN invoices i ON i.contract_id = c.id AND i.status != 'VOID'
  WHERE c.id IN (
    SELECT DISTINCT contract_id FROM invoices
    WHERE id = coalesce(NEW.invoice_id, OLD.invoice_id)
  )
  GROUP BY c.id, c.tenant_id, c.unit_id
  ON CONFLICT (contract_id) DO UPDATE SET
    total_invoiced = excluded.total_invoiced,
    total_paid     = excluded.total_paid,
    balance_due    = excluded.balance_due,
    updated_at     = now();
  RETURN coalesce(NEW, OLD);
END;
$$;

-- ── 3. update_owner_balance_on_expense (remove ACTIVE filter) ────────────────
CREATE OR REPLACE FUNCTION public.update_owner_balance_on_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO owner_balances (owner_id, total_income, total_expenses, commission, net_balance, updated_at)
  SELECT o.id,
    coalesce(sum(CASE WHEN r.status = 'POSTED' THEN r.amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN e.status = 'POSTED' AND e.charged_to IN ('OWNER','OFFICE') THEN e.amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN r.status = 'POSTED' THEN r.amount * coalesce(o.commission_value / 100, 0.05) ELSE 0 END), 0),
    0,
    now()
  FROM owners o
  LEFT JOIN properties p   ON p.owner_id = o.id
  LEFT JOIN units u        ON u.property_id = p.id
  -- FIXED: removed c.status = 'ACTIVE' — lifetime totals include ENDED contracts
  LEFT JOIN contracts c    ON c.unit_id = u.id AND c.deleted_at IS NULL
  LEFT JOIN receipts r     ON r.contract_id = c.id
  LEFT JOIN expenses e     ON (e.contract_id = c.id OR e.property_id = p.id)
  WHERE o.id = coalesce(
    (SELECT owner_id FROM properties WHERE id = coalesce(NEW.property_id, OLD.property_id)),
    (SELECT p2.owner_id FROM contracts c2 JOIN properties p2 ON p2.id = c2.property_id WHERE c2.id = coalesce(NEW.contract_id, OLD.contract_id))
  )
  GROUP BY o.id, o.commission_value
  ON CONFLICT (owner_id) DO UPDATE SET
    total_income   = excluded.total_income,
    total_expenses = excluded.total_expenses,
    commission     = excluded.commission,
    net_balance    = excluded.total_income - excluded.total_expenses - excluded.commission,
    updated_at     = now();
  RETURN coalesce(NEW, OLD);
END;
$$;

-- ── 4+5. void_receipt_atomic — both overloads ────────────────────────────────
-- Drop old 4-arg overload first, then recreate cleanly
DROP FUNCTION IF EXISTS public.void_receipt_atomic(uuid, bigint, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.void_receipt_atomic(
  p_receipt_id uuid,
  p_voided_at  bigint,
  p_invoice_updates  jsonb DEFAULT '[]'::jsonb,
  p_reverse_entries  jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_receipt record;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'MANAGER')
  ) THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية متاحة فقط للمدير أو المسؤول';
  END IF;

  SELECT * INTO v_receipt FROM public.receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'سند القبض غير موجود: %', p_receipt_id;
  END IF;

  IF v_receipt.status = 'VOID' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'receipt_id', p_receipt_id);
  END IF;

  UPDATE public.receipts SET status = 'VOID', updated_at = now() WHERE id = p_receipt_id;

  UPDATE public.invoices i
  SET
    paid_amount = GREATEST(0, coalesce(i.paid_amount, 0) - ra.amount),
    status = CASE
      WHEN GREATEST(0, coalesce(i.paid_amount, 0) - ra.amount) <= 0
        THEN 'UNPAID'
      WHEN GREATEST(0, coalesce(i.paid_amount, 0) - ra.amount) < (i.amount + coalesce(i.tax_amount, 0))
        THEN 'PARTIALLY_PAID'
      ELSE i.status
    END
  FROM public.receipt_allocations ra
  WHERE ra.receipt_id = p_receipt_id AND i.id = ra.invoice_id;

  DELETE FROM public.receipt_allocations WHERE receipt_id = p_receipt_id;

  IF jsonb_array_length(p_reverse_entries) > 0 THEN
    INSERT INTO public.journal_entries (id, no, date, account_id, amount, type, source_id, entity_type, entity_id, created_at)
    SELECT
      coalesce(nullif(j->>'id','')::uuid, gen_random_uuid()),
      j->>'no', j->>'date', j->>'account_id',
      (j->>'amount')::numeric, j->>'type', j->>'source_id',
      nullif(j->>'entity_type',''), nullif(j->>'entity_id',''),
      -- FIXED: was (j->>'created_at')::bigint — now safe cast via to_timestamp
      CASE
        WHEN j->>'created_at' IS NOT NULL AND j->>'created_at' != ''
          THEN to_timestamp((j->>'created_at')::bigint / 1000.0)
        ELSE now()
      END
    FROM jsonb_array_elements(p_reverse_entries) AS j;
  END IF;

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'receipt_id', p_receipt_id);
END;
$$;

-- Single-payload wrapper for frontend (supabase.rpc('void_receipt_atomic', { payload }))
CREATE OR REPLACE FUNCTION public.void_receipt_atomic(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_receipt_id uuid := nullif(payload->>'receipt_id','')::uuid;
  v_voided_at  bigint := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_result     jsonb;
BEGIN
  IF v_receipt_id IS NULL THEN
    RAISE EXCEPTION 'receipt_id is required';
  END IF;
  v_result := public.void_receipt_atomic(v_receipt_id, v_voided_at, '[]'::jsonb, '[]'::jsonb);
  RETURN coalesce(v_result, '{}'::jsonb) || jsonb_build_object('voided_at', v_voided_at::text);
END;
$$;

-- ── 6. deleted_at column types: bigint → timestamptz ────────────────────────
DROP VIEW IF EXISTS public.v_balance_reconciliation;

ALTER TABLE public.invoices
  ALTER COLUMN deleted_at TYPE timestamptz
  USING CASE WHEN deleted_at IS NULL THEN NULL ELSE to_timestamp(deleted_at::bigint / 1000.0) END;

ALTER TABLE public.receipts
  ALTER COLUMN deleted_at TYPE timestamptz
  USING CASE WHEN deleted_at IS NULL THEN NULL ELSE to_timestamp(deleted_at::bigint / 1000.0) END;

ALTER TABLE public.expenses
  ALTER COLUMN deleted_at TYPE timestamptz
  USING CASE WHEN deleted_at IS NULL THEN NULL ELSE to_timestamp(deleted_at::bigint / 1000.0) END;

ALTER TABLE public.app_notifications
  ALTER COLUMN deleted_at TYPE timestamptz
  USING CASE WHEN deleted_at IS NULL THEN NULL ELSE to_timestamp(deleted_at::bigint / 1000.0) END;

ALTER TABLE public.outgoing_notifications
  ALTER COLUMN deleted_at TYPE timestamptz
  USING CASE WHEN deleted_at IS NULL THEN NULL ELSE to_timestamp(deleted_at::bigint / 1000.0) END;

-- ── 7. v_balance_reconciliation: recreate after type fix ────────────────────
CREATE OR REPLACE VIEW public.v_balance_reconciliation AS
SELECT
  c.id     AS contract_id,
  c.no     AS contract_no,
  c.tenant_id,
  c.unit_id,
  c.status,
  coalesce(sum((i.amount + coalesce(i.tax_amount,0)))     FILTER (WHERE i.deleted_at IS NULL), 0) AS total_invoiced,
  coalesce(sum(r.amount) FILTER (WHERE r.status='POSTED' AND r.deleted_at IS NULL), 0)            AS total_collected,
  coalesce(sum((i.amount + coalesce(i.tax_amount,0)))     FILTER (WHERE i.deleted_at IS NULL), 0)
  - coalesce(sum(r.amount) FILTER (WHERE r.status='POSTED' AND r.deleted_at IS NULL), 0)          AS balance_due
FROM contracts c
LEFT JOIN invoices i ON i.contract_id = c.id
LEFT JOIN receipts r ON r.contract_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.no, c.tenant_id, c.unit_id, c.status;

ALTER VIEW public.v_balance_reconciliation OWNER TO postgres;

-- ── 8. updated_at triggers (idempotent) ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema='public' AND event_object_table='receipts' AND trigger_name='set_receipts_updated_at'
  ) THEN
    CREATE TRIGGER set_receipts_updated_at
    BEFORE UPDATE ON public.receipts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema='public' AND event_object_table='invoices' AND trigger_name='set_invoices_updated_at'
  ) THEN
    CREATE TRIGGER set_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END;
$$;

-- ── 9. Security hardening ────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.void_receipt_atomic(jsonb)             FROM anon;
REVOKE ALL ON FUNCTION public.void_receipt_atomic(uuid,bigint,jsonb,jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.void_receipt_atomic(jsonb)         TO authenticated;

COMMIT;
