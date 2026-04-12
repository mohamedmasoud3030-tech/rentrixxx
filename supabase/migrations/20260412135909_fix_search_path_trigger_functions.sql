CREATE OR REPLACE FUNCTION public.update_contract_balance_on_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into contract_balances (contract_id, tenant_id, unit_id, total_invoiced, total_paid, balance_due, updated_at)
  select c.id, c.tenant_id, c.unit_id,
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0)), 0),
    coalesce(sum(i.paid_amount), 0),
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0) - i.paid_amount), 0),
    extract(epoch from now()) * 1000
  from contracts c left join invoices i on i.contract_id = c.id and i.status != 'VOID'
  where c.id = coalesce(NEW.contract_id, OLD.contract_id)
  group by c.id, c.tenant_id, c.unit_id
  on conflict (contract_id) do update set
    total_invoiced = excluded.total_invoiced, total_paid = excluded.total_paid,
    balance_due = excluded.balance_due, updated_at = excluded.updated_at;
  return coalesce(NEW, OLD);
end;
$$;
