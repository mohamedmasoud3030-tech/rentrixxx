CREATE OR REPLACE FUNCTION public.rpt_trial_balance(p_as_of date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_lines jsonb; v_total_dr numeric; v_total_cr numeric; v_balanced boolean;
begin
  select jsonb_agg(row_data order by (row_data->>'no')),
    _r3(sum((row_data->>'total_debit')::numeric)), _r3(sum((row_data->>'total_credit')::numeric))
  into v_lines, v_total_dr, v_total_cr
  from (select jsonb_build_object('id',a.id,'no',a.no,'name',a.name,'type',a.type,
    'total_debit',_r3(coalesce(sum(case when je.type='DEBIT' then je.amount else 0 end),0)),
    'total_credit',_r3(coalesce(sum(case when je.type='CREDIT' then je.amount else 0 end),0)),
    'net_balance',_r3(coalesce(case
      when a.type in ('ASSET','EXPENSE') then sum(case when je.type='DEBIT' then je.amount else -je.amount end)
      else sum(case when je.type='CREDIT' then je.amount else -je.amount end) end,0))) as row_data
  from accounts a join journal_entries je on je.account_id=a.id and _safe_date(je.date)<=p_as_of
  group by a.id,a.no,a.name,a.type
  having (abs(coalesce(sum(case when je.type='DEBIT' then je.amount else 0 end),0))>0.0001
    or abs(coalesce(sum(case when je.type='CREDIT' then je.amount else 0 end),0))>0.0001)) sub;
  v_balanced := abs(coalesce(v_total_dr,0)-coalesce(v_total_cr,0))<0.001;
  return jsonb_build_object('lines',coalesce(v_lines,'[]'::jsonb),
    'total_debit',coalesce(v_total_dr,0),'total_credit',coalesce(v_total_cr,0),
    'is_balanced',v_balanced,'discrepancy',_r3(coalesce(v_total_dr,0)-coalesce(v_total_cr,0)),'as_of',p_as_of);
end;
$$;
