-- Fix: rpt_financial_summary used SET search_path TO '' (empty) but referenced
-- unqualified table names (receipts, invoices, contracts, units, expenses) and
-- helper functions (_r3, _safe_date) which live in the public schema.
-- With empty search_path, PostgreSQL cannot resolve these unqualified names,
-- causing every dashboard data load to fail with a relation-not-found error.
--
-- Correct fix: set search_path = public, pg_temp so unqualified names resolve.
-- This does not reintroduce a Security Advisor warning because the path is fixed.

CREATE OR REPLACE FUNCTION public.rpt_financial_summary(p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collected        numeric := 0;
  v_expenses         numeric := 0;
  v_overdue_amount   numeric := 0;
  v_overdue_count    bigint  := 0;
  v_active_contracts bigint  := 0;
  v_total_units      bigint  := 0;
  v_occupied_units   bigint  := 0;
  v_occupancy_rate   numeric := 0;
  v_pending_invoices numeric := 0;
BEGIN
  SELECT _r3(coalesce(sum(r.amount), 0))
  INTO v_collected
  FROM receipts r
  WHERE r.status = 'POSTED'
    AND _safe_date(r.date_time) BETWEEN p_from AND p_to;

  SELECT _r3(coalesce(sum(e.amount), 0))
  INTO v_expenses
  FROM expenses e
  WHERE e.status = 'POSTED'
    AND _safe_date(e.date_time) BETWEEN p_from AND p_to;

  SELECT
    _r3(coalesce(sum(i.amount + coalesce(i.tax_amount, 0) - i.paid_amount), 0)),
    count(*)
  INTO v_overdue_amount, v_overdue_count
  FROM invoices i
  WHERE i.status NOT IN ('PAID', 'VOID')
    AND _safe_date(i.due_date) < current_date
    AND (i.amount + coalesce(i.tax_amount, 0) - i.paid_amount) > 0.001;

  SELECT count(*) INTO v_active_contracts FROM contracts WHERE status = 'ACTIVE';
  SELECT count(*) INTO v_total_units      FROM units;
  SELECT count(*) INTO v_occupied_units   FROM contracts WHERE status = 'ACTIVE';

  v_occupancy_rate := CASE
    WHEN v_total_units > 0
      THEN _r3(v_occupied_units::numeric / v_total_units * 100)
    ELSE 0
  END;

  SELECT _r3(coalesce(sum(i.amount + coalesce(i.tax_amount, 0) - i.paid_amount), 0))
  INTO v_pending_invoices
  FROM invoices i
  WHERE i.status IN ('UNPAID', 'PARTIALLY_PAID');

  RETURN jsonb_build_object(
    'collected',        v_collected,
    'expenses',         v_expenses,
    'net',              _r3(v_collected - v_expenses),
    'revenue',          v_collected,
    'net_income',       _r3(v_collected - v_expenses),
    'overdue_amount',   coalesce(v_overdue_amount,   0),
    'overdue_count',    coalesce(v_overdue_count,    0),
    'active_contracts', coalesce(v_active_contracts, 0),
    'total_units',      coalesce(v_total_units,      0),
    'occupied_units',   coalesce(v_occupied_units,   0),
    'occupancy_rate',   coalesce(v_occupancy_rate,   0),
    'pending_invoices', coalesce(v_pending_invoices, 0),
    'period_from',      p_from,
    'period_to',        p_to
  );
END;
$$;
