CREATE OR REPLACE FUNCTION public.update_owner_balance_on_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into owner_balances (owner_id, total_income, total_expenses, commission, net_balance, updated_at)
  select o.id,
    coalesce(sum(case when r.status='POSTED' then r.amount else 0 end), 0),
    coalesce(sum(case when e.status='POSTED' and e.charged_to in ('OWNER','OFFICE') then e.amount else 0 end), 0),
    coalesce(sum(case when r.status='POSTED' then r.amount * coalesce(o.commission_value/100, 0.05) else 0 end), 0),
    0, extract(epoch from now()) * 1000
  from owners o
  left join properties p on p.owner_id = o.id
  left join units u on u.property_id = p.id
  left join contracts c on c.unit_id = u.id and c.status = 'ACTIVE'
  left join receipts r on r.contract_id = c.id
  left join expenses e on (e.contract_id = c.id or e.property_id = p.id)
  where o.id = coalesce(
    (select owner_id from properties where id = coalesce(NEW.property_id, OLD.property_id)),
    (select p2.owner_id from contracts c2 join properties p2 on p2.id = c2.property_id where c2.id = coalesce(NEW.contract_id, OLD.contract_id))
  )
  group by o.id, o.commission_value
  on conflict (owner_id) do update set
    total_income = excluded.total_income, total_expenses = excluded.total_expenses,
    commission = excluded.commission,
    net_balance = excluded.total_income - excluded.total_expenses - excluded.commission,
    updated_at = excluded.updated_at;
  return coalesce(NEW, OLD);
end;
$$;
