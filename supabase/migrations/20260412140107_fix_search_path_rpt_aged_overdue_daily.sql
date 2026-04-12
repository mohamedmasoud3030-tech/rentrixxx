CREATE OR REPLACE FUNCTION public.rpt_aged_receivables(p_as_of date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_lines jsonb; v_totals jsonb;
begin
  with aged as (
    select t.id as tenant_id, t.name as tenant_name, t.phone as tenant_phone,
      pr.name as property_name, u.name as unit_name,
      _r3(i.amount+coalesce(i.tax_amount,0)-i.paid_amount) as remaining,
      (p_as_of-_safe_date(i.due_date))::int as days_overdue, i.due_date
    from invoices i join contracts c on c.id=i.contract_id join tenants t on t.id=c.tenant_id
    join units u on u.id=c.unit_id join properties pr on pr.id=u.property_id
    where i.status not in ('PAID','VOID') and _safe_date(i.due_date)<=p_as_of
      and (i.amount+coalesce(i.tax_amount,0)-i.paid_amount)>0.001
  ), bucketed as (
    select tenant_id,tenant_name,tenant_phone,property_name,unit_name,
      _r3(sum(remaining)) as total,
      _r3(sum(case when days_overdue<=0 then remaining else 0 end)) as bucket_current,
      _r3(sum(case when days_overdue between 1 and 30 then remaining else 0 end)) as bucket_1_30,
      _r3(sum(case when days_overdue between 31 and 60 then remaining else 0 end)) as bucket_31_60,
      _r3(sum(case when days_overdue between 61 and 90 then remaining else 0 end)) as bucket_61_90,
      _r3(sum(case when days_overdue>90 then remaining else 0 end)) as bucket_90plus
    from aged group by tenant_id,tenant_name,tenant_phone,property_name,unit_name having sum(remaining)>0
  )
  select jsonb_agg(jsonb_build_object('tenant_id',tenant_id,'tenant_name',tenant_name,'tenant_phone',tenant_phone,
    'property_name',property_name,'unit_name',unit_name,'total',total,'current',bucket_current,
    '1_30',bucket_1_30,'31_60',bucket_31_60,'61_90',bucket_61_90,'90plus',bucket_90plus) order by total desc),
    jsonb_build_object('total',_r3(sum(total)),'current',_r3(sum(bucket_current)),
    '1_30',_r3(sum(bucket_1_30)),'31_60',_r3(sum(bucket_31_60)),
    '61_90',_r3(sum(bucket_61_90)),'90plus',_r3(sum(bucket_90plus)))
  into v_lines, v_totals from bucketed;
  return jsonb_build_object('lines',coalesce(v_lines,'[]'::jsonb),
    'totals',coalesce(v_totals,'{"total":0,"current":0,"1_30":0,"31_60":0,"61_90":0,"90plus":0}'::jsonb),'as_of',p_as_of);
end;
$$;
