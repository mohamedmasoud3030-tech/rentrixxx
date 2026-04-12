CREATE OR REPLACE FUNCTION public.rpt_balance_sheet(p_as_of date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_assets jsonb; v_liabilities jsonb; v_equity jsonb;
  v_tot_assets numeric; v_tot_liab numeric; v_tot_equity numeric;
begin
  with sums as (
    select je.account_id,
      _r3(sum(case when je.type='DEBIT' then je.amount else 0 end)) as total_dr,
      _r3(sum(case when je.type='CREDIT' then je.amount else 0 end)) as total_cr
    from journal_entries je where _safe_date(je.date)<=p_as_of group by je.account_id
  ),
  balances as (
    select a.id,a.no,a.name,a.type,a.is_parent,
      _r3(case when a.type in ('ASSET','EXPENSE') then coalesce(s.total_dr,0)-coalesce(s.total_cr,0)
        else coalesce(s.total_cr,0)-coalesce(s.total_dr,0) end) as balance
    from accounts a left join sums s on s.account_id=a.id
  )
  select
    jsonb_agg(jsonb_build_object('no',b.no,'name',b.name,'balance',b.balance,'is_parent',b.is_parent) order by b.no) filter (where b.type='ASSET'),
    jsonb_agg(jsonb_build_object('no',b.no,'name',b.name,'balance',b.balance,'is_parent',b.is_parent) order by b.no) filter (where b.type='LIABILITY'),
    jsonb_agg(jsonb_build_object('no',b.no,'name',b.name,'balance',b.balance,'is_parent',b.is_parent) order by b.no) filter (where b.type='EQUITY'),
    _r3(sum(b.balance) filter (where b.type='ASSET')),
    _r3(sum(b.balance) filter (where b.type='LIABILITY')),
    _r3(sum(b.balance) filter (where b.type='EQUITY'))
  into v_assets,v_liabilities,v_equity,v_tot_assets,v_tot_liab,v_tot_equity
  from balances b where abs(b.balance)>0.0001;
  return jsonb_build_object('assets',coalesce(v_assets,'[]'::jsonb),'liabilities',coalesce(v_liabilities,'[]'::jsonb),
    'equity',coalesce(v_equity,'[]'::jsonb),'total_assets',coalesce(v_tot_assets,0),
    'total_liabilities',coalesce(v_tot_liab,0),'total_equity',coalesce(v_tot_equity,0),
    'is_balanced',abs(coalesce(v_tot_assets,0)-coalesce(v_tot_liab,0)-coalesce(v_tot_equity,0))<0.01,'as_of',p_as_of);
end;
$$;
