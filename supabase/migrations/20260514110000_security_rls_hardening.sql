-- Phase 5 security and RLS hardening.

-- 1) Normalize permissive RLS policies to deterministic authenticated checks.
do $$
declare
  t text;
  tables text[] := array[
    'properties','units','people','contracts','invoices','payments','expenses','maintenance_requests'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "Authenticated users can manage %s" on public.%I',
      case when t = 'maintenance_requests' then 'maintenance' else t end,
      t
    );

    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
      'authenticated_manage_' || t,
      t
    );
  end loop;
end
$$;

-- 2) Force RLS on tenant-facing tables to prevent owner bypass.
alter table public.properties force row level security;
alter table public.units force row level security;
alter table public.people force row level security;
alter table public.contracts force row level security;
alter table public.invoices force row level security;
alter table public.payments force row level security;
alter table public.expenses force row level security;
alter table public.maintenance_requests force row level security;

-- 3) SECURITY DEFINER hardening: lock down search_path and grants.
create or replace function public.post_receipt_atomic(p_invoice_id uuid, p_amount numeric, p_method public.payment_method, p_date date, p_reference text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_invoice public.invoices%rowtype;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id and deleted_at is null for update;
  if v_invoice.id is null then raise exception 'Invoice not found'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if v_invoice.paid_amount + p_amount > v_invoice.amount then raise exception 'Payment exceeds remaining balance'; end if;

  insert into public.payments(invoice_id, amount, payment_method, payment_date, reference_number)
  values (p_invoice_id, round(p_amount::numeric,2), p_method, p_date, p_reference);

  update public.invoices
    set paid_amount = round((paid_amount + p_amount)::numeric,2),
        status = case
          when (paid_amount + p_amount) >= v_invoice.amount then 'paid'
          when (paid_amount + p_amount) > 0 then 'partial'
          else status
        end
  where id = p_invoice_id;

  return 'ok';
end; $$;

create or replace function public.generate_invoices_from_active_contracts()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with generated as (
    insert into public.invoices (contract_id, issue_date, due_date, amount, paid_amount, status)
    select c.id, current_date, current_date + interval '10 day', round(c.rent_amount::numeric,2), 0, 'issued'
    from public.contracts c
    where c.status = 'active' and c.deleted_at is null
      and not exists (
        select 1
        from public.invoices i
        where i.contract_id = c.id
          and i.deleted_at is null
          and date_trunc('month', i.issue_date) = date_trunc('month', current_date)
      )
    returning id
  )
  select count(*)::integer from generated;
$$;

create or replace function public.rpt_financial_summary(month int, year int)
returns table(total_collected numeric, total_overdue_invoices numeric, total_expenses numeric, net_revenue numeric)
language sql
security definer
set search_path = public, pg_temp
as $$
  with c as (
    select coalesce(sum(amount),0)::numeric(12,2) v from public.payments where deleted_at is null and extract(month from payment_date)=month and extract(year from payment_date)=year
  ), o as (
    select coalesce(sum(amount-paid_amount),0)::numeric(12,2) v from public.invoices where deleted_at is null and status='overdue'
  ), e as (
    select coalesce(sum(amount),0)::numeric(12,2) v from public.expenses where deleted_at is null and extract(month from expense_date)=month and extract(year from expense_date)=year
  )
  select c.v, o.v, e.v, (c.v-e.v)::numeric(12,2) from c,o,e;
$$;

create or replace function public.renew_contract_atomic(contract_id uuid, new_start date, new_end date, new_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  original_contract public.contracts%rowtype;
  new_contract_id uuid;
begin
  if new_end < new_start then
    raise exception 'new_end must be greater than or equal to new_start';
  end if;

  if new_amount < 0 then
    raise exception 'new_amount must be greater than or equal to zero';
  end if;

  select * into original_contract
  from public.contracts
  where id = contract_id and deleted_at is null
  for update;

  if not found then
    raise exception 'contract not found';
  end if;

  update public.contracts
  set status = 'expired', updated_at = timezone('utc', now())
  where id = original_contract.id;

  insert into public.contracts (
    property_id, unit_id, tenant_id, start_date, end_date,
    rent_amount, payment_cycle, status, notes, renewed_from_id
  ) values (
    original_contract.property_id, original_contract.unit_id, original_contract.tenant_id,
    new_start, new_end, new_amount, original_contract.payment_cycle, 'draft',
    original_contract.notes, original_contract.id
  )
  returning id into new_contract_id;

  return new_contract_id;
end;
$$;

revoke execute on function public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text) from public, anon;
revoke execute on function public.generate_invoices_from_active_contracts() from public, anon;
revoke execute on function public.rpt_financial_summary(int, int) from public, anon;
revoke execute on function public.renew_contract_atomic(uuid, date, date, numeric) from public, anon;

grant execute on function public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text) to authenticated;
grant execute on function public.generate_invoices_from_active_contracts() to authenticated;
grant execute on function public.rpt_financial_summary(int, int) to authenticated;
grant execute on function public.renew_contract_atomic(uuid, date, date, numeric) to authenticated;

-- 4) Foreign-key index coverage for frequently joined rows.
create index if not exists payments_invoice_id_full_idx on public.payments(invoice_id);
create index if not exists expenses_property_id_full_idx on public.expenses(property_id);
create index if not exists invoices_contract_id_full_idx on public.invoices(contract_id);
create index if not exists contracts_property_id_full_idx on public.contracts(property_id);
create index if not exists contracts_tenant_id_full_idx on public.contracts(tenant_id);

