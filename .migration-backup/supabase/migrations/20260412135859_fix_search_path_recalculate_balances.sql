CREATE OR REPLACE FUNCTION public.recalculate_all_balances()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  truncate table owner_balances, contract_balances, tenant_balances;
  insert into contract_balances (contract_id, tenant_id, unit_id, total_invoiced, total_paid, balance_due, updated_at)
  select c.id, c.tenant_id, c.unit_id,
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0)), 0),
    coalesce(sum(i.paid_amount), 0),
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0) - i.paid_amount), 0),
    extract(epoch from now()) * 1000
  from contracts c left join invoices i on i.contract_id = c.id and i.status != 'VOID'
  group by c.id, c.tenant_id, c.unit_id;
  insert into owner_balances (owner_id, total_income, total_expenses, commission, net_balance, updated_at)
  select o.id,
    coalesce(sum(case when r.status = 'POSTED' then r.amount else 0 end), 0),
    coalesce(sum(case when e.status = 'POSTED' and e.charged_to in ('OWNER','OFFICE') then e.amount else 0 end), 0),
    coalesce(sum(case when r.status = 'POSTED' then r.amount * coalesce(o.commission_value / 100, 0.05) else 0 end), 0),
    0, extract(epoch from now()) * 1000
  from owners o
  left join properties p on p.owner_id = o.id
  left join units u on u.property_id = p.id
  left join contracts c on c.unit_id = u.id and c.status = 'ACTIVE'
  left join receipts r on r.contract_id = c.id
  left join expenses e on (e.contract_id = c.id or e.property_id = p.id)
  group by o.id, o.commission_value;
  update owner_balances set net_balance = total_income - total_expenses - commission;
  insert into tenant_balances (tenant_id, balance_due, updated_at)
  select t.id, coalesce(sum(cb.balance_due), 0), extract(epoch from now()) * 1000
  from tenants t
  left join contracts c on c.tenant_id = t.id and c.status = 'ACTIVE'
  left join contract_balances cb on cb.contract_id = c.id
  group by t.id;
end;
$$;
