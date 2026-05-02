-- إصلاح خطأ nested aggregate في rpt_income_statement
CREATE OR REPLACE FUNCTION public.rpt_income_statement(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_revenues  jsonb;
  v_expenses  jsonb;
  v_total_rev numeric;
  v_total_exp numeric;
begin
  select jsonb_agg(jsonb_build_object('id',a.id,'no',a.no,'name',a.name,'balance',a.bal) order by a.no), sum(a.bal)
  into v_revenues, v_total_rev
  from (
    select a.id, a.no, a.name,
      _r3(coalesce(sum(case when je.type='CREDIT' then je.amount else -je.amount end),0)) as bal
    from accounts a
    left join journal_entries je on je.account_id=a.id and _safe_date(je.date) between p_from and p_to
    where a.type='REVENUE' group by a.id,a.no,a.name
    having abs(coalesce(sum(case when je.type='CREDIT' then je.amount else -je.amount end),0))>0.0001
  ) a;

  select jsonb_agg(jsonb_build_object('id',a.id,'no',a.no,'name',a.name,'balance',a.bal) order by a.no), sum(a.bal)
  into v_expenses, v_total_exp
  from (
    select a.id, a.no, a.name,
      _r3(coalesce(sum(case when je.type='DEBIT' then je.amount else -je.amount end),0)) as bal
    from accounts a
    left join journal_entries je on je.account_id=a.id and _safe_date(je.date) between p_from and p_to
    where a.type='EXPENSE' group by a.id,a.no,a.name
    having abs(coalesce(sum(case when je.type='DEBIT' then je.amount else -je.amount end),0))>0.0001
  ) a;

  return jsonb_build_object(
    'revenues', coalesce(v_revenues,'[]'::jsonb), 'expenses', coalesce(v_expenses,'[]'::jsonb),
    'total_revenue', coalesce(v_total_rev,0), 'total_expense', coalesce(v_total_exp,0),
    'net_income', _r3(coalesce(v_total_rev,0)-coalesce(v_total_exp,0)),
    'period_from', p_from, 'period_to', p_to
  );
end;
$$;
