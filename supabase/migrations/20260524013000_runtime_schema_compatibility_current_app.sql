-- Runtime schema compatibility for current Rentrix app flows.
-- Purpose: align the live older Supabase schema with the current frontend contract.
-- Idempotent/additive only: no destructive drops, no primary-key rewrites.

-- 0) Harden legacy trigger that may run while backfilling units.
create or replace function public.update_unit_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_unit_id uuid;
  v_active_count int;
begin
  if tg_op = 'DELETE' then
    v_unit_id := old.unit_id;
  else
    v_unit_id := new.unit_id;
  end if;

  if v_unit_id is null then
    return coalesce(new, old);
  end if;

  select count(*) into v_active_count
  from public.contracts
  where unit_id = v_unit_id
    and status = 'ACTIVE'
    and deleted_at is null;

  if v_active_count > 0 then
    update public.units set status = 'OCCUPIED' where id = v_unit_id;
  elsif exists (
    select 1
    from public.maintenance_records
    where unit_id = v_unit_id
      and status in ('REPORTED','ASSIGNED','IN_PROGRESS')
      and deleted_at is null
  ) then
    update public.units set status = 'MAINTENANCE' where id = v_unit_id;
  else
    update public.units set status = 'AVAILABLE' where id = v_unit_id;
  end if;

  return coalesce(new, old);
end;
$$;

-- 1) People compatibility table expected by current People/Tenants/Contracts pages.
create table if not exists public.people (
  id text primary key,
  full_name text not null,
  phone text,
  email text,
  national_id text,
  type text not null default 'contact' check (type in ('tenant','owner','contact')),
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.people add column if not exists full_name text;
alter table public.people add column if not exists phone text;
alter table public.people add column if not exists email text;
alter table public.people add column if not exists national_id text;
alter table public.people add column if not exists type text;
alter table public.people add column if not exists address text;
alter table public.people add column if not exists notes text;
alter table public.people add column if not exists created_at timestamptz default now();
alter table public.people add column if not exists updated_at timestamptz default now();
alter table public.people add column if not exists deleted_at timestamptz;

update public.people
set full_name = coalesce(nullif(btrim(full_name), ''), id, 'Unknown Person')
where full_name is null or btrim(full_name) = '';

update public.people
set type = case
  when type is null then 'contact'
  when btrim(type) = '' then 'contact'
  when lower(btrim(type)) in ('tenant','owner','contact') then lower(btrim(type))
  else 'contact'
end
where type is null
   or btrim(type) = ''
   or lower(btrim(type)) not in ('tenant','owner','contact')
   or type <> lower(btrim(type));

alter table public.people alter column full_name set not null;
alter table public.people alter column type set default 'contact';

do $$
begin
  alter table public.people
    add constraint people_type_check
    check (type in ('tenant','owner','contact'));
exception when duplicate_object then null;
end $$;

alter table public.people enable row level security;
alter table public.people force row level security;

do $$
begin
  create policy app_user_people on public.people
    for all to authenticated
    using (public.is_app_user())
    with check (public.is_app_user());
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.people to authenticated;

insert into public.people (id, full_name, phone, email, national_id, type, address, notes, created_at, updated_at, deleted_at)
select
  t.id::text,
  coalesce(nullif(t.name, ''), 'Tenant'),
  t.phone,
  t.email,
  t.id_no,
  'tenant',
  t.address,
  t.notes,
  t.created_at,
  t.updated_at,
  t.archived_at
from public.tenants t
on conflict (id) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  national_id = excluded.national_id,
  type = excluded.type,
  address = excluded.address,
  notes = excluded.notes,
  updated_at = excluded.updated_at,
  deleted_at = excluded.deleted_at;

insert into public.people (id, full_name, phone, email, national_id, type, address, notes, created_at, updated_at, deleted_at)
select
  o.id::text,
  coalesce(nullif(o.name, ''), 'Owner'),
  o.phone,
  o.email,
  o.id_no,
  'owner',
  o.address,
  o.notes,
  o.created_at,
  o.updated_at,
  o.archived_at
from public.owners o
on conflict (id) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  national_id = excluded.national_id,
  type = excluded.type,
  address = excluded.address,
  notes = excluded.notes,
  updated_at = excluded.updated_at,
  deleted_at = excluded.deleted_at;

-- 2) Owner aliases expected by current owners workspace.
alter table public.owners add column if not exists person_id text;
alter table public.owners add column if not exists full_name text;
alter table public.owners add column if not exists display_name text;
alter table public.owners add column if not exists national_id text;
alter table public.owners add column if not exists tax_number text;
alter table public.owners add column if not exists is_active boolean not null default true;
alter table public.owners add column if not exists deleted_at timestamptz;

update public.owners
set
  person_id = coalesce(person_id, id::text),
  full_name = coalesce(full_name, name, 'Owner'),
  display_name = coalesce(display_name, name),
  national_id = coalesce(national_id, id_no),
  deleted_at = coalesce(deleted_at, archived_at),
  is_active = coalesce(is_active, archived_at is null)
where person_id is null
   or full_name is null
   or display_name is null
   or national_id is null
   or deleted_at is null;

-- 3) Property aliases expected by current property/contracts/owners pages.
alter table public.properties add column if not exists title text;
alter table public.properties add column if not exists owner_name text;
alter table public.properties add column if not exists purchase_value numeric;
alter table public.properties add column if not exists current_value numeric;
alter table public.properties add column if not exists status text default 'active';
alter table public.properties add column if not exists latitude numeric;
alter table public.properties add column if not exists longitude numeric;
alter table public.properties add column if not exists deleted_at timestamptz;

update public.properties p
set
  title = coalesce(p.title, p.name, 'Property'),
  owner_name = coalesce(p.owner_name, o.name),
  deleted_at = coalesce(p.deleted_at, p.archived_at),
  status = coalesce(p.status, case when p.archived_at is null then 'active' else 'inactive' end)
from public.owners o
where p.owner_id = o.id
  and (p.title is null or p.owner_name is null or p.deleted_at is null or p.status is null);

update public.properties
set
  title = coalesce(title, name, 'Property'),
  deleted_at = coalesce(deleted_at, archived_at),
  status = coalesce(status, case when archived_at is null then 'active' else 'inactive' end)
where title is null or deleted_at is null or status is null;

-- 4) Unit aliases expected by current relation selects.
alter table public.units add column if not exists unit_number text;
alter table public.units add column if not exists deleted_at timestamptz;

update public.units
set
  unit_number = coalesce(unit_number, name, id::text),
  deleted_at = coalesce(deleted_at, archived_at),
  rent_amount = coalesce(rent_amount, rent, rent_default)
where unit_number is null or deleted_at is null or rent_amount is null;

-- 5) Contract compatibility for current list/detail selects.
alter table public.contracts add column if not exists property_id text;
alter table public.contracts add column if not exists monthly_rent numeric;
alter table public.contracts add column if not exists renewed_from_id text;
alter table public.contracts add column if not exists cancellation_reason text;

update public.contracts c
set
  property_id = coalesce(c.property_id, u.property_id),
  monthly_rent = coalesce(c.monthly_rent, c.rent_amount)
from public.units u
where c.unit_id = u.id
  and (c.property_id is null or c.monthly_rent is null);

update public.contracts
set monthly_rent = coalesce(monthly_rent, rent_amount)
where monthly_rent is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contracts_property_id_app_fkey'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_property_id_app_fkey
      foreign key (property_id) references public.properties(id) on delete set null;
  end if;
exception when others then
  raise notice 'Skipping contracts_property_id_app_fkey: %', sqlerrm;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contracts_tenant_id_people_app_fkey'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_tenant_id_people_app_fkey
      foreign key (tenant_id) references public.people(id) on delete restrict;
  end if;
exception when others then
  raise notice 'Skipping contracts_tenant_id_people_app_fkey: %', sqlerrm;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contracts_renewed_from_id_app_fkey'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_renewed_from_id_app_fkey
      foreign key (renewed_from_id) references public.contracts(id) on delete set null;
  end if;
exception when others then
  raise notice 'Skipping contracts_renewed_from_id_app_fkey: %', sqlerrm;
end $$;

-- 6) Property ownership compatibility table.
create table if not exists public.property_owners (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  ownership_percentage numeric(5,2) not null default 100 check (ownership_percentage > 0 and ownership_percentage <= 100),
  is_primary boolean not null default true,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, owner_id, starts_on)
);

create index if not exists property_owners_property_id_idx on public.property_owners(property_id);
create index if not exists property_owners_owner_id_idx on public.property_owners(owner_id);

alter table public.property_owners enable row level security;
alter table public.property_owners force row level security;

do $$
begin
  create policy app_user_property_owners on public.property_owners
    for all to authenticated
    using (public.is_app_user())
    with check (public.is_app_user());
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.property_owners to authenticated;

insert into public.property_owners (property_id, owner_id, ownership_percentage, is_primary, starts_on, ends_on, created_at, updated_at)
select p.id, p.owner_id, 100, true, null, null, coalesce(p.created_at, now()), coalesce(p.updated_at, now())
from public.properties p
where p.owner_id is not null
on conflict (property_id, owner_id, starts_on) do nothing;

-- 7) Company settings compatibility table expected by current settings service.
create table if not exists public.company_settings (
  id uuid primary key default '00000000-0000-4000-8000-000000000001'::uuid,
  singleton_key boolean not null default true unique,
  company_name text not null default 'Rentrix',
  legal_name text,
  tax_number text,
  registration_number text,
  phone text,
  email text,
  address text,
  city text,
  country text default 'OM',
  currency text not null default 'OMR',
  locale text not null default 'ar-OM',
  timezone text not null default 'Asia/Muscat',
  date_format text not null default 'dd/MM/yyyy',
  number_format text not null default 'ar-OM',
  logo_url text,
  invoice_prefix text not null default 'INV',
  receipt_prefix text not null default 'REC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;
alter table public.company_settings force row level security;

do $$
begin
  create policy app_user_company_settings on public.company_settings
    for all to authenticated
    using (public.is_app_user())
    with check (public.is_app_user());
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.company_settings to authenticated;

insert into public.company_settings (id, singleton_key, company_name, currency, locale, timezone, date_format, number_format, invoice_prefix, receipt_prefix)
values ('00000000-0000-4000-8000-000000000001'::uuid, true, 'Rentrix', 'OMR', 'ar-OM', 'Asia/Muscat', 'dd/MM/yyyy', 'ar-OM', 'INV', 'REC')
on conflict (id) do nothing;

-- 8) Payments/invoices compatibility columns used by current financial flows.
alter table public.invoices add column if not exists issue_date date;
update public.invoices set issue_date = coalesce(issue_date, created_at::date) where issue_date is null;

alter table public.payments add column if not exists invoice_id text;
alter table public.payments add column if not exists receipt_id text;
alter table public.payments add column if not exists created_by uuid;
alter table public.payments add column if not exists deleted_at timestamptz;

-- 9) Users compatibility aliases used by current type contract.
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists is_active boolean not null default true;
alter table public.users add column if not exists deleted_at timestamptz;

update public.users
set
  full_name = coalesce(full_name, name, email),
  is_active = coalesce(is_active, status = 'ACTIVE')
where full_name is null or is_active is null;
