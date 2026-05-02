CREATE OR REPLACE FUNCTION public.rpt_overdue_invoices(p_as_of date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_rows jsonb; v_total numeric; v_count bigint;
begin
  select jsonb_agg(jsonb_build_object(
    'invoice_id',i.id,'invoice_no',i.no,'due_date',i.due_date,
    'days_overdue',(p_as_of-_safe_date(i.due_date))::int,
    'amount',_r3(i.amount+coalesce(i.tax_amount,0)),'paid',_r3(i.paid_amount),
    'remaining',_r3(i.amount+coalesce(i.tax_amount,0)-i.paid_amount),
    'tenant_name',t.name,'tenant_phone',t.phone,'unit_name',u.name,
    'property_name',pr.name,'contract_id',c.id) order by (p_as_of-_safe_date(i.due_date)) desc),
    _r3(sum(i.amount+coalesce(i.tax_amount,0)-i.paid_amount)), count(*)
  into v_rows, v_total, v_count
  from invoices i join contracts c on c.id=i.contract_id join tenants t on t.id=c.tenant_id
  join units u on u.id=c.unit_id join properties pr on pr.id=u.property_id
  where i.status not in ('PAID','VOID') and _safe_date(i.due_date)<p_as_of
    and (i.amount+coalesce(i.tax_amount,0)-i.paid_amount)>0.001;
  return jsonb_build_object('rows',coalesce(v_rows,'[]'::jsonb),
    'total',coalesce(v_total,0),'count',coalesce(v_count,0),'as_of',p_as_of);
end;
$$;
