create or replace function public.guard_contract_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_count integer;
begin
  select count(*) into v_invoice_count
  from public.invoices
  where contract_id = old.id;

  if v_invoice_count > 0 then
    raise exception 'لا يمكن حذف العقد لوجود فواتير مرتبطة به. استخدم الحذف الناعم.';
  end if;

  return old;
end;
$$;
