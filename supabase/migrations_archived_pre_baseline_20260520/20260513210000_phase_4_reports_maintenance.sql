create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  title text not null,
  description text,
  priority text not null check (priority in ('low','medium','high','urgent')),
  status text not null check (status in ('open','in_progress','resolved','closed')),
  assigned_to text,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);
create index if not exists maintenance_requests_property_id_idx on public.maintenance_requests(property_id) where deleted_at is null;
create index if not exists maintenance_requests_status_idx on public.maintenance_requests(status) where deleted_at is null;
create trigger maintenance_requests_set_updated_at before update on public.maintenance_requests for each row execute function public.set_updated_at();
alter table public.maintenance_requests enable row level security;
create policy "Authenticated users can manage maintenance" on public.maintenance_requests for all to authenticated using (true) with check (true);
