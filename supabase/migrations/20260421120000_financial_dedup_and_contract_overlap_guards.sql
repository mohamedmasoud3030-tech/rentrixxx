-- Financial deduplication + contract overlap safety guards.

alter table if exists public.invoices
  add column if not exists request_id text;

-- Normalize existing duplicate request IDs (if any) before unique index creation.
with ranked as (
  select id, request_id,
         row_number() over (partition by request_id order by created_at asc, id asc) as rn
  from public.invoices
  where request_id is not null
)
update public.invoices i
set request_id = null
from ranked r
where i.id = r.id
  and r.rn > 1;

create unique index if not exists invoices_request_id_unique_idx
  on public.invoices (request_id)
  where request_id is not null;

create extension if not exists btree_gist;

-- Enforce no overlapping active/suspended contracts on same unit.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contracts_no_overlap_active_unit_excl'
  ) then
    alter table public.contracts
      add constraint contracts_no_overlap_active_unit_excl
      exclude using gist (
        unit_id with =,
        daterange(start_date, end_date, '[]') with &&
      )
      where (deleted_at is null and status in ('ACTIVE', 'SUSPENDED'));
  end if;
end $$;
