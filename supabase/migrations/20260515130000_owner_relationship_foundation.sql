do $$
begin
  if to_regclass('public.property_owners') is not null then
    create unique index if not exists property_owners_active_primary_unique_idx
      on public.property_owners(property_id)
      where ends_on is null and is_primary;

    comment on index property_owners_active_primary_unique_idx is 'Only one active primary owner is allowed per property.';
  end if;
end $$;

create or replace function public.validate_property_owner_active_totals()
returns trigger as $$
declare
  v_other_active_percentage_total numeric := 0;
begin
  if new.ends_on is null then
    select coalesce(sum(po.ownership_percentage), 0)
      into v_other_active_percentage_total
    from public.property_owners po
    where po.property_id = new.property_id
      and po.ends_on is null
      and (tg_op <> 'UPDATE' or po.id <> new.id);

    if v_other_active_percentage_total + new.ownership_percentage > 100 then
      raise exception 'Active ownership percentages for a property cannot exceed 100.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;
