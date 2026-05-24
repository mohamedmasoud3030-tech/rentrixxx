create unique index if not exists property_owners_active_primary_unique_idx
  on public.property_owners(property_id)
  where ends_on is null and is_primary;

comment on index property_owners_active_primary_unique_idx is 'Only one active primary owner is allowed per property.';

create or replace function public.validate_property_owner_active_totals()
returns trigger as $$
declare
  v_other_active_percentage_total numeric := 0;
begin
  if v_other_active_percentage_total + new.ownership_percentage > 100 then
    raise exception 'Active ownership percentages for a property cannot exceed 100.';
  end if;
  return new;
end;
$$ language plpgsql;
