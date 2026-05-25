-- P0 schema-contract alignment for active app flows (idempotent/replay-safe).

-- A) Owners / property ownership
alter table if exists public.owners
  add column if not exists full_name text,
  add column if not exists display_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists national_id text,
  add column if not exists tax_number text,
  add column if not exists address text,
  add column if not exists is_active boolean not null default true;

alter table if exists public.owners
  alter column person_id drop not null;

update public.owners o
set full_name = coalesce(o.full_name, p.full_name, 'Owner')
from public.people p
where o.person_id = p.id
  and o.full_name is null;

update public.owners
set full_name = 'Owner'
where full_name is null;

alter table if exists public.owners
  alter column full_name set not null;

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
create index if not exists property_owners_active_idx on public.property_owners(property_id, is_primary) where ends_on is null;

do $$ begin
  create trigger property_owners_set_updated_at before update on public.property_owners
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.property_owners enable row level security;
alter table public.property_owners force row level security;

do $$ begin
  create policy property_owners_read_app_users on public.property_owners
    for select to authenticated using (public.is_app_user());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy property_owners_write_admin_manager on public.property_owners
    for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on public.property_owners to authenticated;

-- B/C) Tenant/person + contracts alignment
-- Current active app uses people.id in contracts.tenant_id.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'contracts_tenant_id_fkey'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts drop constraint contracts_tenant_id_fkey;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contracts_tenant_id_fkey'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_tenant_id_fkey
      foreign key (tenant_id) references public.people(id) on delete restrict;
  end if;
end $$;

alter table if exists public.contracts
  alter column unit_id drop not null,
  add column if not exists rent_amount numeric(12,2),
  add column if not exists payment_cycle text not null default 'monthly' check (payment_cycle in ('monthly','quarterly','semi_annual','annual')),
  add column if not exists renewed_from_id uuid,
  add column if not exists cancellation_reason text,
  add column if not exists notes text;

update public.contracts
set rent_amount = coalesce(rent_amount, monthly_rent)
where rent_amount is null;

alter table if exists public.contracts
  alter column rent_amount set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contracts_renewed_from_id_fkey'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_renewed_from_id_fkey
      foreign key (renewed_from_id) references public.contracts(id) on delete set null;
  end if;
end $$;

create index if not exists contracts_property_status_idx on public.contracts(property_id, status);
create index if not exists contracts_tenant_status_idx on public.contracts(tenant_id, status);

create or replace function public.contracts_sync_rent_columns()
returns trigger
language plpgsql
as $$
begin
  if new.rent_amount is null and new.monthly_rent is not null then
    new.rent_amount = new.monthly_rent;
  end if;
  if new.monthly_rent is null and new.rent_amount is not null then
    new.monthly_rent = new.rent_amount;
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger contracts_sync_rent_columns before insert or update on public.contracts
  for each row execute function public.contracts_sync_rent_columns();
exception when duplicate_object then null; end $$;

-- D) Invoices/Payments/RPC
alter table if exists public.invoices
  add column if not exists notes text;

alter table if exists public.payments
  add column if not exists reference_number text,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create index if not exists payments_invoice_date_idx on public.payments(invoice_id, payment_date desc);
create index if not exists invoices_due_status_idx on public.invoices(due_date, status);

create or replace function public.generate_invoices_from_active_contracts()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint := 0;
begin
  insert into public.invoices (contract_id, issue_date, due_date, amount, paid_amount, status, notes)
  select c.id,
         current_date,
         (date_trunc('month', current_date) + interval '1 month - 1 day')::date,
         coalesce(c.rent_amount, c.monthly_rent, 0),
         0,
         'issued'::public.invoice_status,
         null
  from public.contracts c
  where c.deleted_at is null
    and c.status = 'active'
    and not exists (
      select 1
      from public.invoices i
      where i.deleted_at is null
        and i.contract_id = c.id
        and date_trunc('month', i.issue_date) = date_trunc('month', current_date)
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.generate_invoices_from_active_contracts() from public;
grant execute on function public.generate_invoices_from_active_contracts() to authenticated;

-- E) Maintenance alignment
alter table if exists public.maintenance_requests
  add column if not exists priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  add column if not exists assigned_to uuid references public.users(id) on delete set null,
  add column if not exists resolved_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'maintenance_status'
      and e.enumlabel = 'resolved'
  ) = false then
    alter type public.maintenance_status add value 'resolved';
  end if;
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'maintenance_status'
      and e.enumlabel = 'closed'
  ) = false then
    alter type public.maintenance_status add value 'closed';
  end if;
end $$;

-- NOTE: Do not update rows to newly added enum values in the same migration transaction.
-- PostgreSQL raises SQLSTATE 55P04 for unsafe enum use in this case.
-- Existing rows remain on already-valid statuses; future writes may use resolved/closed.

-- F) Company settings alignment
alter table if exists public.company_settings
  add column if not exists legal_name text,
  add column if not exists tax_number text,
  add column if not exists registration_number text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists date_format text not null default 'dd/MM/yyyy',
  add column if not exists number_format text not null default 'en-US',
  add column if not exists logo_url text,
  add column if not exists invoice_prefix text not null default 'INV',
  add column if not exists receipt_prefix text not null default 'REC';
