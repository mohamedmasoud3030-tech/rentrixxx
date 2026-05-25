-- Align the live V2 database with the active Rentrix frontend contract queries.
-- The canonical relation remains properties -> units -> contracts, but the current
-- contract and invoice Supabase selects also read contracts.property_id directly.

alter table public.contracts
  add column if not exists property_id uuid;

update public.contracts c
set property_id = u.property_id
from public.units u
where c.unit_id = u.id
  and c.property_id is null;

create index if not exists contracts_property_id_idx
  on public.contracts(property_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contracts_property_id_fkey'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_property_id_fkey
      foreign key (property_id)
      references public.properties(id)
      on delete restrict
      not valid;
  end if;
end $$;

alter table public.contracts
  validate constraint contracts_property_id_fkey;
