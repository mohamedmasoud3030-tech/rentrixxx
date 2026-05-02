CREATE OR REPLACE FUNCTION public.rpt_daily_collection(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_rows jsonb; v_total numeric;
begin
  select jsonb_agg(jsonb_build_object('date',day,'total',_r3(day_total),'cash',_r3(cash),
    'bank',_r3(bank),'pos',_r3(pos),'other',_r3(other),'count',cnt) order by day),
    _r3(sum(day_total)) into v_rows, v_total
  from (
    select _safe_date(date_time)::text as day, sum(amount) as day_total,
      sum(case when channel='CASH' then amount else 0 end) as cash,
      sum(case when channel='BANK' then amount else 0 end) as bank,
      sum(case when channel='POS' then amount else 0 end) as pos,
      sum(case when channel not in ('CASH','BANK','POS') then amount else 0 end) as other,
      count(*) as cnt
    from receipts where status='POSTED' and _safe_date(date_time) between p_from and p_to
    group by _safe_date(date_time)
  ) d;
  return jsonb_build_object('rows',coalesce(v_rows,'[]'::jsonb),'total',coalesce(v_total,0),'from',p_from,'to',p_to);
end;
$$;
