-- Supabase schema compatibility pass (idempotent/replay-safe).

create or replace function pg_temp.rentrix_add_column_if_missing(
  p_table_name text,
  p_column_name text,
  p_column_definition text
) returns void
language plpgsql
as $$
begin
  if to_regclass(format('public.%I', p_table_name)) is not null
     and not exists (
       select 1
       from information_schema.columns c
       where c.table_schema = 'public'
         and c.table_name = p_table_name
         and c.column_name = p_column_name
     ) then
    execute format(
      'alter table public.%I add column %I %s',
      p_table_name,
      p_column_name,
      p_column_definition
    );
  end if;
end;
$$;

-- 1) property_owners compatibility + active duplicate guard.
create table if not exists public.property_owners (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  ownership_percentage numeric(5,2) not null default 100 check (ownership_percentage > 0 and ownership_percentage <= 100),
  is_primary boolean not null default false,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, owner_id, starts_on)
);

create index if not exists property_owners_property_id_idx on public.property_owners(property_id);
create index if not exists property_owners_owner_id_idx on public.property_owners(owner_id);
create unique index if not exists property_owners_active_owner_unique_idx
  on public.property_owners(property_id, owner_id)
  where ends_on is null;

alter table public.property_owners enable row level security;
alter table public.property_owners force row level security;
grant select, insert, update, delete on public.property_owners to authenticated;

-- 2) receipts payer_tenant_id compatibility with contracts.tenant_id -> people.id alignment.
create or replace function public.post_receipt_atomic(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_invoice_id uuid;
  v_amount numeric;
  v_method public.payment_method;
  v_date date;
  v_reference text;
  v_invoice record;
  v_receipt_id uuid;
  v_payment_id uuid;
  v_payer_tenant_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED: user must be authenticated'; end if;
  select role into v_role from public.users where id = v_uid and status = 'ACTIVE' and deleted_at is null;
  if v_role is null then raise exception 'USER_NOT_FOUND_OR_INACTIVE: caller must exist in public.users and be active'; end if;
  if v_role not in ('ADMIN','MANAGER') then raise exception 'FORBIDDEN: ADMIN or MANAGER role required'; end if;

  v_invoice_id := (payload->>'invoice_id')::uuid;
  v_amount := (payload->>'amount')::numeric;
  v_method := coalesce((payload->>'method')::public.payment_method,'cash'::public.payment_method);
  v_date := coalesce((payload->>'date')::date,current_date);
  v_reference := payload->>'reference';

  if v_invoice_id is null then raise exception 'VALIDATION_ERROR: invoice_id is required'; end if;
  if v_amount is null or v_amount <= 0 then raise exception 'VALIDATION_ERROR: amount must be positive'; end if;

  select * into v_invoice from public.invoices where id=v_invoice_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND: invoice not found'; end if;
  if (v_invoice.amount - v_invoice.paid_amount) < v_amount then raise exception 'VALIDATION_ERROR: overpayment not allowed'; end if;

  select t.id into v_payer_tenant_id
  from public.contracts c
  left join public.tenants t on t.person_id = c.tenant_id and t.deleted_at is null
  where c.id = v_invoice.contract_id;

  insert into public.receipts(receipt_date,payer_tenant_id,amount_total,method,reference,status,created_by)
  values(v_date,v_payer_tenant_id,v_amount,v_method,v_reference,'posted',v_uid)
  returning id into v_receipt_id;

  insert into public.payments(contract_id,invoice_id,receipt_id,amount,payment_date,payment_method,status,created_by)
  values(v_invoice.contract_id,v_invoice_id,v_receipt_id,v_amount,v_date,v_method,'posted',v_uid)
  returning id into v_payment_id;

  insert into public.receipt_allocations(receipt_id,invoice_id,amount)
  values(v_receipt_id,v_invoice_id,v_amount);

  update public.invoices
     set paid_amount = paid_amount + v_amount,
         status = case
           when paid_amount + v_amount >= amount then 'paid'::public.invoice_status
           when paid_amount + v_amount > 0 then 'partial'::public.invoice_status
           else status
         end,
         updated_at = now()
   where id = v_invoice_id;

  return jsonb_build_object('payment_id', v_payment_id::text, 'receipt_id', v_receipt_id::text);
end;
$$;

-- 3 + 9) contracts compatibility & rent sync.
select pg_temp.rentrix_add_column_if_missing('people', 'type', 'text not null default ''tenant'' check (type in (''tenant'',''owner'',''contact''))');
select pg_temp.rentrix_add_column_if_missing('people', 'national_id', 'text');

select pg_temp.rentrix_add_column_if_missing('units', 'floor', 'text');

select pg_temp.rentrix_add_column_if_missing('contracts', 'rent_amount', 'numeric(12,2)');
select pg_temp.rentrix_add_column_if_missing('contracts', 'payment_cycle', 'text not null default ''monthly'' check (payment_cycle in (''monthly'',''quarterly'',''semi_annual'',''semiannual'',''annual'',''yearly''))');
select pg_temp.rentrix_add_column_if_missing('contracts', 'renewed_from_id', 'uuid');

update public.contracts
set rent_amount = coalesce(rent_amount, monthly_rent)
where rent_amount is null;

alter table if exists public.contracts
  alter column rent_amount set not null;

create or replace function public.contracts_sync_rent_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.rent_amount is null and new.monthly_rent is not null then
      new.rent_amount = new.monthly_rent;
    elsif new.monthly_rent is null and new.rent_amount is not null then
      new.monthly_rent = new.rent_amount;
    elsif new.rent_amount is not null then
      new.monthly_rent = new.rent_amount;
    end if;
  else
    if new.rent_amount is distinct from old.rent_amount and new.rent_amount is not null then
      new.monthly_rent = new.rent_amount;
    elsif new.monthly_rent is distinct from old.monthly_rent and new.monthly_rent is not null then
      new.rent_amount = new.monthly_rent;
    elsif new.rent_amount is null and new.monthly_rent is not null then
      new.rent_amount = new.monthly_rent;
    elsif new.monthly_rent is null and new.rent_amount is not null then
      new.monthly_rent = new.rent_amount;
    end if;
  end if;
  return new;
end;
$$;

-- 4,5,6) invoice generation cycle handling, authorization gate, and duplicate race guard.
create unique index if not exists invoices_contract_due_date_active_unique_idx
  on public.invoices(contract_id, due_date)
  where deleted_at is null;

create or replace function public.generate_invoices_from_active_contracts()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint := 0;
  v_today date := current_date;
begin
  if not public.is_admin_or_manager() then
    raise exception 'FORBIDDEN: ADMIN or MANAGER role required';
  end if;

  insert into public.invoices (contract_id, issue_date, due_date, amount, paid_amount, status, notes)
  select c.id,
         v_today,
         (date_trunc('month', v_today) + interval '1 month - 1 day')::date,
         coalesce(c.rent_amount, c.monthly_rent, 0),
         0,
         'issued'::public.invoice_status,
         null
  from public.contracts c
  where c.deleted_at is null
    and c.status = 'active'
    and (
      c.payment_cycle = 'monthly'
      or (c.payment_cycle = 'quarterly' and extract(month from v_today)::int in (1,4,7,10))
      or (c.payment_cycle in ('semi_annual', 'semiannual') and extract(month from v_today)::int in (1,7))
      or (c.payment_cycle in ('annual', 'yearly') and extract(month from v_today)::int = 1)
    )
  on conflict (contract_id, due_date) where (deleted_at is null) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.generate_invoices_from_active_contracts() from public;
grant execute on function public.generate_invoices_from_active_contracts() to authenticated;

-- 10) company settings compatibility.
select pg_temp.rentrix_add_column_if_missing('company_settings', 'legal_name', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'tax_number', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'registration_number', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'phone', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'email', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'address', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'city', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'country', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'date_format', 'text not null default ''dd/MM/yyyy''');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'number_format', 'text not null default ''en-US''');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'logo_url', 'text');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'invoice_prefix', 'text not null default ''INV''');
select pg_temp.rentrix_add_column_if_missing('company_settings', 'receipt_prefix', 'text not null default ''REC''');

-- 11) expenses description compatibility.
select pg_temp.rentrix_add_column_if_missing('expenses', 'description', 'text');

update public.expenses
set description = coalesce(description, notes)
where description is null and notes is not null;

-- 13) leads replay/grants hardening.
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
for each row execute function public.set_updated_at();

grant select, insert, update on public.leads to authenticated;

-- 14) RLS helper security + recursion hardening.
create or replace function public.is_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (select 1 from public.users u where u.id = auth.uid() and u.status = 'ACTIVE' and u.deleted_at is null);
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.users u
       where u.id = auth.uid()
         and u.status = 'ACTIVE'
         and u.deleted_at is null
         and u.role in ('ADMIN', 'MANAGER')
     );
$$;

revoke all on function public.is_app_user() from public;
revoke all on function public.is_admin_or_manager() from public;
grant execute on function public.is_app_user() to authenticated;
grant execute on function public.is_admin_or_manager() to authenticated;
