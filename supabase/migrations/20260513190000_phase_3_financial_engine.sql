create or replace function public.post_receipt_atomic(p_invoice_id uuid, p_amount numeric, p_method public.payment_method, p_date date, p_reference text)
returns text
language plpgsql
security definer
as $$
declare v_invoice public.invoices%rowtype;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id and deleted_at is null for update;
  if v_invoice.id is null then raise exception 'Invoice not found'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if v_invoice.paid_amount + p_amount > v_invoice.amount then raise exception 'Payment exceeds remaining balance'; end if;

  insert into public.payments(invoice_id, amount, payment_method, payment_date, reference_number)
  values (p_invoice_id, round(p_amount::numeric,2), p_method, p_date, p_reference);

  update public.invoices
    set paid_amount = round((paid_amount + p_amount)::numeric,2),
        status = case
          when (paid_amount + p_amount) >= v_invoice.amount then 'paid'
          when (paid_amount + p_amount) > 0 then 'partial'
          else status
        end
  where id = p_invoice_id;

  return 'ok';
end; $$;

create or replace function public.generate_invoices_from_active_contracts()
returns integer
language sql
security definer
as $$
  with generated as (
    insert into public.invoices (contract_id, issue_date, due_date, amount, paid_amount, status)
    select c.id, current_date, current_date + interval '10 day', round(c.rent_amount::numeric,2), 0, 'issued'
    from public.contracts c
    where c.status = 'active' and c.deleted_at is null
      and not exists (
        select 1
        from public.invoices i
        where i.contract_id = c.id
          and i.deleted_at is null
          and date_trunc('month', i.issue_date) = date_trunc('month', current_date)
      )
    returning id
  )
  select count(*)::integer from generated;
$$;

create or replace function public.rpt_financial_summary(month int, year int)
returns table(total_collected numeric, total_overdue_invoices numeric, total_expenses numeric, net_revenue numeric)
language sql
security definer
as $$
  with c as (
    select coalesce(sum(amount),0)::numeric(12,2) v from public.payments where deleted_at is null and extract(month from payment_date)=month and extract(year from payment_date)=year
  ), o as (
    select coalesce(sum(amount-paid_amount),0)::numeric(12,2) v from public.invoices where deleted_at is null and status='overdue'
  ), e as (
    select coalesce(sum(amount),0)::numeric(12,2) v from public.expenses where deleted_at is null and extract(month from expense_date)=month and extract(year from expense_date)=year
  )
  select c.v, o.v, e.v, (c.v-e.v)::numeric(12,2) from c,o,e;
$$;
