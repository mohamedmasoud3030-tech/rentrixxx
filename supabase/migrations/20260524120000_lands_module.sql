set check_function_bodies = off;

create table if not exists public.lands (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  address text null,
  city text null,
  area numeric(14,2) null check (area is null or area >= 0),
  area_unit text not null default 'sqm',
  ownership_status text not null default 'owned' check (ownership_status in ('owned','leased','disputed','other')),
  zoning_type text null,
  value_amount numeric(14,2) null check (value_amount is null or value_amount >= 0),
  latitude double precision null,
  longitude double precision null,
  notes text null,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_lands_city on public.lands(city) where deleted_at is null;
create index if not exists idx_lands_status on public.lands(status) where deleted_at is null;

alter table public.lands enable row level security;

drop policy if exists lands_read on public.lands;
create policy lands_read on public.lands for select to authenticated using (public.is_admin_or_manager());
drop policy if exists lands_write on public.lands;
create policy lands_write on public.lands for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

grant select,insert,update on public.lands to authenticated;
