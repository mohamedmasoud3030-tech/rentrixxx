CREATE OR REPLACE FUNCTION public.update_tenant_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into tenant_balances (tenant_id, balance_due, updated_at)
  select t.id, coalesce(sum(cb.balance_due), 0), extract(epoch from now()) * 1000
  from tenants t
  left join contracts c on c.tenant_id = t.id and c.status = 'ACTIVE'
  left join contract_balances cb on cb.contract_id = c.id
  where t.id in (
    select tenant_id from contracts where id in (
      select contract_id from invoices where id = coalesce(NEW.contract_id, OLD.contract_id)
      union
      select contract_id from receipt_allocations where invoice_id = coalesce(NEW.invoice_id, OLD.invoice_id)
    )
  )
  group by t.id
  on conflict (tenant_id) do update set
    balance_due = excluded.balance_due, updated_at = excluded.updated_at;
  return coalesce(NEW, OLD);
end;
$$;
