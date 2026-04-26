-- 002_refactors.sql
-- Non-destructive refactor helpers and documentation artifacts.
-- No drops, no data rewrites, no destructive alters.

-- ============================================================
-- Naming/compatibility bridge views
-- ============================================================
-- Historical migrations referenced `maintenance`; app code uses `maintenance_records`.
-- Bridge this naming gap without moving data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' and table_name = 'maintenance_records'
  ) THEN
    EXECUTE 'create or replace view public.maintenance as select * from public.maintenance_records';
  END IF;
END;
$$;

-- ============================================================
-- Reporting helpers
-- ============================================================
create or replace view public.vw_contract_financial_summary as
select
  c.id as contract_id,
  c.no as contract_no,
  c.status as contract_status,
  coalesce(sum(i.amount + coalesce(i.tax_amount, 0)), 0) as invoice_total,
  coalesce(sum(i.paid_amount), 0) as paid_total,
  coalesce(sum(i.amount + coalesce(i.tax_amount, 0)), 0) - coalesce(sum(i.paid_amount), 0) as outstanding_total
from public.contracts c
left join public.invoices i on i.contract_id = c.id
group by c.id, c.no, c.status;

create or replace view public.vw_owner_property_unit_counts as
select
  o.id as owner_id,
  o.name as owner_name,
  count(distinct p.id) as properties_count,
  count(distinct u.id) as units_count
from public.owners o
left join public.properties p on p.owner_id = o.id
left join public.units u on u.property_id = p.id
group by o.id, o.name;

-- ============================================================
-- Design issue tracker (flag only; do not auto-fix)
-- ============================================================
insert into public.schema_refactor_notes (category, note)
select x.category, x.note
from (
  values
    ('duplication', 'Potential overlap between app_notifications and outgoing_notifications; consider event-driven notification_outbox pattern.'),
    ('duplication', 'Multiple balance tables may drift (owner_balances, contract_balances, tenant_balances, account_balances); evaluate a unified ledger-derived materialization strategy.'),
    ('normalization', 'expenses can point to contract/owner/property simultaneously; consider explicit scope_type + scope_id model.'),
    ('naming', 'Mixed naming exists: maintenance_records vs maintenance, automation_runs vs automation_jobs semantics.'),
    ('typing', 'Mixed epoch bigint and timestamptz/date columns increase timezone and reporting complexity; define a standard. ')
) as x(category, note)
where exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'schema_refactor_notes')
and not exists (
  select 1
  from public.schema_refactor_notes n
  where n.category = x.category and n.note = x.note
);

-- ============================================================
-- Safe indexes for read-heavy dashboards
-- ============================================================
create index if not exists idx_invoices_contract_due_date on public.invoices (contract_id, due_date);
create index if not exists idx_contracts_status_dates on public.contracts (status, start_date, end_date);
create index if not exists idx_maintenance_records_unit_status on public.maintenance_records (unit_id, status);
create index if not exists idx_outgoing_notifications_status_created_at on public.outgoing_notifications (status, created_at);
