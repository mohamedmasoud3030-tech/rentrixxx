CREATE OR REPLACE FUNCTION public.update_unit_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  update units set status =
    case
      when exists (select 1 from contracts where unit_id = coalesce(NEW.unit_id, OLD.unit_id) and status = 'ACTIVE') then 'RENTED'
      when exists (select 1 from maintenance_records where unit_id = coalesce(NEW.unit_id, OLD.unit_id) and status in ('NEW','IN_PROGRESS')) then 'MAINTENANCE'
      else 'AVAILABLE'
    end
  where id = coalesce(NEW.unit_id, OLD.unit_id);
  return coalesce(NEW, OLD);
end;
$$;
