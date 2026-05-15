-- Owner relationship schema foundation.
-- Keeps properties.owner_name intact for compatibility; no backfill is performed here.

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  display_name text,
  phone text,
  email text,
  national_id text,
  tax_number text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint owners_full_name_not_blank check (length(btrim(full_name)) > 0)
);

create table if not exists public.property_owners (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete restrict,
  ownership_percentage numeric(5,2) not null default 100,
  is_primary boolean not null default true,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint property_owners_percentage_valid check (ownership_percentage > 0 and ownership_percentage <= 100),
  constraint property_owners_date_range_valid check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists owners_active_full_name_idx
on public.owners (is_active, full_name);

create index if not exists property_owners_property_id_idx
on public.property_owners (property_id);

create index if not exists property_owners_owner_id_idx
on public.property_owners (owner_id);

create unique index if not exists property_owners_active_unique_idx
on public.property_owners (property_id, owner_id)
where ends_on is null;

drop trigger if exists owners_set_updated_at on public.owners;
create trigger owners_set_updated_at
before update on public.owners
for each row
execute function public.set_updated_at();

drop trigger if exists property_owners_set_updated_at on public.property_owners;
create trigger property_owners_set_updated_at
before update on public.property_owners
for each row
execute function public.set_updated_at();

alter table public.owners enable row level security;
alter table public.owners force row level security;

alter table public.property_owners enable row level security;
alter table public.property_owners force row level security;

drop policy if exists authenticated_manage_owners on public.owners;
create policy authenticated_manage_owners
on public.owners
for all
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists authenticated_manage_property_owners on public.property_owners;
create policy authenticated_manage_property_owners
on public.property_owners
for all
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);
