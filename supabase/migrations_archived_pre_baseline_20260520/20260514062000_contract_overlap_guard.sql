create or replace function public.prevent_active_contract_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null or new.status <> 'active' or new.unit_id is null then
    return new;
  end if;

  if exists (
    select 1
      from public.contracts existing
     where existing.id <> new.id
       and existing.deleted_at is null
       and existing.status = 'active'
       and existing.unit_id = new.unit_id
       and daterange(existing.start_date, existing.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'Unit already has an overlapping active contract';
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_prevent_active_overlap on public.contracts;

create trigger contracts_prevent_active_overlap
before insert or update of unit_id, start_date, end_date, status, deleted_at
on public.contracts
for each row
execute function public.prevent_active_contract_overlap();
