CREATE OR REPLACE FUNCTION public.rpt_rent_roll(p_as_of date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_rows jsonb;
begin
  select jsonb_agg(jsonb_build_object('property_name',pr.name,'unit_name',u.name,'unit_type',u.type,
    'status',u.status,'tenant_name',t.name,'tenant_phone',t.phone,'contract_start',c.start_date,
    'contract_end',c.end_date,'rent_amount',c.rent_amount,'deposit',c.deposit,
    'days_to_expiry',(_safe_date(c.end_date)-p_as_of)::int,
    'overdue_balance',_r3(coalesce((select sum(i.amount+coalesce(i.tax_amount,0)-i.paid_amount)
      from invoices i where i.contract_id=c.id and i.status not in ('PAID','VOID')
        and _safe_date(i.due_date)<p_as_of),0))) order by pr.name,u.name)
  into v_rows from units u join properties pr on pr.id=u.property_id
  left join contracts c on c.unit_id=u.id and c.status='ACTIVE'
  left join tenants t on t.id=c.tenant_id;
  return jsonb_build_object('rows',coalesce(v_rows,'[]'::jsonb),'as_of',p_as_of);
end;
$$;
