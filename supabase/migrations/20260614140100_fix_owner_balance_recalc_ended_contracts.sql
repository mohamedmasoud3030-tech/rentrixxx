-- =============================================================================
-- Migration: 20260614140100_fix_owner_balance_recalc_ended_contracts
-- Priority: P2 (CRITICAL-1)
-- Date: 2026-06-13
--
-- ISSUE: update_owner_balance_on_expense() joins contracts with
--   "c.status = 'ACTIVE'", which excludes receipts and contract-linked
--   expenses belonging to ENDED (renewed/terminated) contracts from the
--   owner's lifetime total_income / total_expenses / commission /
--   net_balance. This silently understates historical owner revenue
--   the moment any contract is renewed and any new receipt/expense
--   triggers a recalculation.
--
-- FIX: include all non-deleted contracts regardless of status, so
--   lifetime totals reflect full history. Re-run for all owners after
--   deploying the fix.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.update_owner_balance_on_expense()') IS NULL THEN
    RAISE EXCEPTION 'update_owner_balance_on_expense() not found — cannot proceed';
  END IF;
  IF to_regprocedure('public.recalculate_all_balances()') IS NULL THEN
    RAISE EXCEPTION 'recalculate_all_balances() not found — cannot proceed';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_owner_balance_on_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
begin
  insert into owner_balances (owner_id, total_income, total_expenses, commission, net_balance, updated_at)
  select o.id,
    coalesce(sum(case when r.status = 'POSTED' then r.amount else 0 end), 0),
    coalesce(sum(case when e.status = 'POSTED' and e.charged_to in ('OWNER', 'OFFICE') then e.amount else 0 end), 0),
    coalesce(sum(case when r.status = 'POSTED' then r.amount * coalesce(o.commission_value / 100, 0.05) else 0 end), 0),
    0,
    now()
  from owners o
  left join properties p on p.owner_id = o.id
  left join units u on u.property_id = p.id
  -- Removed "and c.status = 'ACTIVE'" filter: lifetime totals must include
  -- receipts/expenses from ENDED (renewed/terminated) contracts, not just
  -- the currently-active one.
  left join contracts c on c.unit_id = u.id and c.deleted_at is null
  left join receipts r on r.contract_id = c.id
  left join expenses e on (e.contract_id = c.id or e.property_id = p.id)
  where o.id = coalesce(
    (select owner_id from properties where id = coalesce(NEW.property_id, OLD.property_id)),
    (select p2.owner_id from contracts c2 join properties p2 on p2.id = c2.property_id where c2.id = coalesce(NEW.contract_id, OLD.contract_id))
  )
  group by o.id, o.commission_value
  on conflict (owner_id) do update set
    total_income = excluded.total_income,
    total_expenses = excluded.total_expenses,
    commission = excluded.commission,
    net_balance = excluded.total_income - excluded.total_expenses - excluded.commission,
    updated_at = now();
  return coalesce(NEW, OLD);
end;
$$;

-- One-time global recalculation so existing owner_balances rows reflect
-- the corrected lifetime totals immediately (do not wait for the next
-- receipt/expense insert to trigger a per-owner recompute).
SELECT public.recalculate_all_balances();

COMMIT;
