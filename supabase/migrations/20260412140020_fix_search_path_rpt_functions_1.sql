CREATE OR REPLACE FUNCTION public.rpt_financial_summary(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_collected numeric; v_expenses numeric; v_overdue_amount numeric;
  v_overdue_count bigint; v_active_contracts bigint; v_total_units bigint;
  v_occupied_units bigint; v_occupancy_rate numeric; v_pending_invoices numeric;
begin
  select _r3(coalesce(sum(r.amount),0)) into v_collected
  from receipts r where r.status='POSTED' and _safe_date(r.date_time) between p_from and p_to;
  select _r3(coalesce(sum(e.amount),0)) into v_expenses
  from expenses e where e.status='POSTED' and _safe_date(e.date_time) between p_from and p_to;
  select _r3(coalesce(sum(i.amount+coalesce(i.tax_amount,0)-i.paid_amount),0)), count(*)
  into v_overdue_amount, v_overdue_count from invoices i
  where i.status not in ('PAID','VOID') and _safe_date(i.due_date)<current_date
    and (i.amount+coalesce(i.tax_amount,0)-i.paid_amount)>0.001;
  select count(*) into v_active_contracts from contracts where status='ACTIVE';
  select count(*) into v_total_units from units;
  select count(*) into v_occupied_units from contracts where status='ACTIVE';
  v_occupancy_rate := case when v_total_units>0 then _r3(v_occupied_units::numeric/v_total_units*100) else 0 end;
  select _r3(coalesce(sum(i.amount+coalesce(i.tax_amount,0)-i.paid_amount),0)) into v_pending_invoices
  from invoices i where i.status in ('UNPAID','PARTIALLY_PAID');
  return jsonb_build_object(
    'collected',v_collected,'expenses',v_expenses,'net',_r3(v_collected-v_expenses),
    'overdue_amount',v_overdue_amount,'overdue_count',v_overdue_count,
    'active_contracts',v_active_contracts,'total_units',v_total_units,
    'occupied_units',v_occupied_units,'occupancy_rate',v_occupancy_rate,
    'pending_invoices',v_pending_invoices,'period_from',p_from,'period_to',p_to
  );
end;
$$;
