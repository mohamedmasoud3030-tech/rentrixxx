-- ============================================================
-- Rentrix — Reporting & Accounting RPCs
-- Migration: supabase_migration_v7_reporting_rpcs.sql
--
-- يشغّل هذا الملف مرة واحدة في Supabase SQL Editor.
-- يستبدل كل حسابات JavaScript في الـ frontend بـ SQL فعلي
-- يعمل داخل قاعدة البيانات مباشرة — أسرع وأدق.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- HELPERS
-- ─────────────────────────────────────────────────────────────

-- تحويل TEXT date آمن (كل التواريخ مخزّنة كـ TEXT في المشروع)
create or replace function _safe_date(v text)
returns date language sql immutable as $$
  select case when v ~ '^\d{4}-\d{2}-\d{2}' then (v::date) else null end
$$;

-- round إلى 3 خانات عشرية لتجنب drift
create or replace function _r3(v numeric)
returns numeric language sql immutable as $$
  select round(coalesce(v,0), 3)
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. rpt_financial_summary
--    ملخص مالي شامل لفترة محددة — يُستخدم في أعلى لوحة التقارير
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_financial_summary(
  p_from date,
  p_to   date
)
returns jsonb
language plpgsql security definer as $$
declare
  v_collected        numeric;
  v_expenses         numeric;
  v_overdue_amount   numeric;
  v_overdue_count    bigint;
  v_active_contracts bigint;
  v_total_units      bigint;
  v_occupied_units   bigint;
  v_occupancy_rate   numeric;
  v_pending_invoices numeric;
begin
  -- إجمالي المحصّل (سندات قبض POSTED في الفترة)
  select _r3(coalesce(sum(r.amount),0))
  into   v_collected
  from   receipts r
  where  r.status = 'POSTED'
    and  _safe_date(r.date_time) between p_from and p_to;

  -- إجمالي المصروفات POSTED في الفترة
  select _r3(coalesce(sum(e.amount),0))
  into   v_expenses
  from   expenses e
  where  e.status = 'POSTED'
    and  _safe_date(e.date_time) between p_from and p_to;

  -- المتأخرات (فواتير غير مدفوعة كاملاً وتاريخها مضى)
  select
    _r3(coalesce(sum(i.amount + coalesce(i.tax_amount,0) - i.paid_amount),0)),
    count(*)
  into v_overdue_amount, v_overdue_count
  from invoices i
  where i.status not in ('PAID','VOID')
    and _safe_date(i.due_date) < current_date
    and (i.amount + coalesce(i.tax_amount,0) - i.paid_amount) > 0.001;

  -- عقود نشطة
  select count(*) into v_active_contracts
  from contracts where status = 'ACTIVE';

  -- نسبة الإشغال
  select count(*) into v_total_units from units;
  select count(*) into v_occupied_units
  from   contracts where status = 'ACTIVE';

  v_occupancy_rate := case when v_total_units > 0
    then _r3(v_occupied_units::numeric / v_total_units * 100)
    else 0 end;

  -- فواتير معلّقة (UNPAID + PARTIALLY_PAID)
  select _r3(coalesce(sum(i.amount + coalesce(i.tax_amount,0) - i.paid_amount),0))
  into   v_pending_invoices
  from   invoices i
  where  i.status in ('UNPAID','PARTIALLY_PAID');

  return jsonb_build_object(
    'collected',        v_collected,
    'expenses',         v_expenses,
    'net',              _r3(v_collected - v_expenses),
    'overdue_amount',   v_overdue_amount,
    'overdue_count',    v_overdue_count,
    'active_contracts', v_active_contracts,
    'total_units',      v_total_units,
    'occupied_units',   v_occupied_units,
    'occupancy_rate',   v_occupancy_rate,
    'pending_invoices', v_pending_invoices,
    'period_from',      p_from,
    'period_to',        p_to
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. rpt_income_statement
--    قائمة الدخل من journal_entries مباشرة
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_income_statement(
  p_from date,
  p_to   date
)
returns jsonb
language plpgsql security definer as $$
declare
  v_revenues  jsonb;
  v_expenses  jsonb;
  v_total_rev numeric;
  v_total_exp numeric;
begin
  -- إيرادات
  select
    jsonb_agg(jsonb_build_object(
      'id',      a.id,
      'no',      a.no,
      'name',    a.name,
      'balance', _r3(coalesce(sum(case when je.type='CREDIT' then je.amount else -je.amount end),0))
    ) order by a.no),
    _r3(coalesce(sum(case when je.type='CREDIT' then je.amount else -je.amount end),0))
  into v_revenues, v_total_rev
  from accounts a
  left join journal_entries je
    on  je.account_id = a.id
    and _safe_date(je.date) between p_from and p_to
  where a.type = 'REVENUE'
  group by a.id, a.no, a.name
  having abs(coalesce(sum(case when je.type='CREDIT' then je.amount else -je.amount end),0)) > 0.0001;

  -- مصروفات
  select
    jsonb_agg(jsonb_build_object(
      'id',      a.id,
      'no',      a.no,
      'name',    a.name,
      'balance', _r3(coalesce(sum(case when je.type='DEBIT' then je.amount else -je.amount end),0))
    ) order by a.no),
    _r3(coalesce(sum(case when je.type='DEBIT' then je.amount else -je.amount end),0))
  into v_expenses, v_total_exp
  from accounts a
  left join journal_entries je
    on  je.account_id = a.id
    and _safe_date(je.date) between p_from and p_to
  where a.type = 'EXPENSE'
  group by a.id, a.no, a.name
  having abs(coalesce(sum(case when je.type='DEBIT' then je.amount else -je.amount end),0)) > 0.0001;

  return jsonb_build_object(
    'revenues',      coalesce(v_revenues, '[]'::jsonb),
    'expenses',      coalesce(v_expenses, '[]'::jsonb),
    'total_revenue', coalesce(v_total_rev, 0),
    'total_expense', coalesce(v_total_exp, 0),
    'net_income',    _r3(coalesce(v_total_rev,0) - coalesce(v_total_exp,0)),
    'period_from',   p_from,
    'period_to',     p_to
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. rpt_trial_balance
--    ميزان المراجعة حتى تاريخ محدد
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_trial_balance(p_as_of date)
returns jsonb
language plpgsql security definer as $$
declare
  v_lines      jsonb;
  v_total_dr   numeric;
  v_total_cr   numeric;
  v_balanced   boolean;
begin
  select
    jsonb_agg(row_data order by (row_data->>'no')),
    _r3(sum((row_data->>'total_debit')::numeric)),
    _r3(sum((row_data->>'total_credit')::numeric))
  into v_lines, v_total_dr, v_total_cr
  from (
    select jsonb_build_object(
      'id',           a.id,
      'no',           a.no,
      'name',         a.name,
      'type',         a.type,
      'total_debit',  _r3(coalesce(sum(case when je.type='DEBIT'  then je.amount else 0 end),0)),
      'total_credit', _r3(coalesce(sum(case when je.type='CREDIT' then je.amount else 0 end),0)),
      'net_balance',  _r3(coalesce(
        case
          when a.type in ('ASSET','EXPENSE')
            then sum(case when je.type='DEBIT' then je.amount else -je.amount end)
          else
            sum(case when je.type='CREDIT' then je.amount else -je.amount end)
        end, 0))
    ) as row_data
    from accounts a
    join journal_entries je
      on  je.account_id = a.id
      and _safe_date(je.date) <= p_as_of
    group by a.id, a.no, a.name, a.type
    having (
      abs(coalesce(sum(case when je.type='DEBIT'  then je.amount else 0 end),0)) > 0.0001 or
      abs(coalesce(sum(case when je.type='CREDIT' then je.amount else 0 end),0)) > 0.0001
    )
  ) sub;

  v_balanced := abs(coalesce(v_total_dr,0) - coalesce(v_total_cr,0)) < 0.001;

  return jsonb_build_object(
    'lines',        coalesce(v_lines, '[]'::jsonb),
    'total_debit',  coalesce(v_total_dr, 0),
    'total_credit', coalesce(v_total_cr, 0),
    'is_balanced',  v_balanced,
    'discrepancy',  _r3(coalesce(v_total_dr,0) - coalesce(v_total_cr,0)),
    'as_of',        p_as_of
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. rpt_aged_receivables
--    أعمار الديون — أكثر تقرير طُلب يومياً
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_aged_receivables(p_as_of date)
returns jsonb
language plpgsql security definer as $$
declare
  v_lines jsonb;
  v_totals jsonb;
begin
  with aged as (
    select
      t.id                                          as tenant_id,
      t.name                                        as tenant_name,
      t.phone                                       as tenant_phone,
      pr.name                                       as property_name,
      u.name                                        as unit_name,
      _r3(i.amount + coalesce(i.tax_amount,0) - i.paid_amount) as remaining,
      (p_as_of - _safe_date(i.due_date))::int       as days_overdue,
      i.due_date
    from invoices i
    join contracts c  on c.id  = i.contract_id
    join tenants  t   on t.id  = c.tenant_id
    join units    u   on u.id  = c.unit_id
    join properties pr on pr.id = u.property_id
    where i.status not in ('PAID','VOID')
      and _safe_date(i.due_date) <= p_as_of
      and (i.amount + coalesce(i.tax_amount,0) - i.paid_amount) > 0.001
  ),
  bucketed as (
    select
      tenant_id,
      tenant_name,
      tenant_phone,
      property_name,
      unit_name,
      _r3(sum(remaining))                                                          as total,
      _r3(sum(case when days_overdue <= 0  then remaining else 0 end))            as bucket_current,
      _r3(sum(case when days_overdue between 1  and 30 then remaining else 0 end)) as bucket_1_30,
      _r3(sum(case when days_overdue between 31 and 60 then remaining else 0 end)) as bucket_31_60,
      _r3(sum(case when days_overdue between 61 and 90 then remaining else 0 end)) as bucket_61_90,
      _r3(sum(case when days_overdue > 90 then remaining else 0 end))             as bucket_90plus
    from aged
    group by tenant_id, tenant_name, tenant_phone, property_name, unit_name
    having sum(remaining) > 0
  )
  select
    jsonb_agg(jsonb_build_object(
      'tenant_id',    tenant_id,
      'tenant_name',  tenant_name,
      'tenant_phone', tenant_phone,
      'property_name',property_name,
      'unit_name',    unit_name,
      'total',        total,
      'current',      bucket_current,
      '1_30',         bucket_1_30,
      '31_60',        bucket_31_60,
      '61_90',        bucket_61_90,
      '90plus',       bucket_90plus
    ) order by total desc),
    jsonb_build_object(
      'total',   _r3(sum(total)),
      'current', _r3(sum(bucket_current)),
      '1_30',    _r3(sum(bucket_1_30)),
      '31_60',   _r3(sum(bucket_31_60)),
      '61_90',   _r3(sum(bucket_61_90)),
      '90plus',  _r3(sum(bucket_90plus))
    )
  into v_lines, v_totals
  from bucketed;

  return jsonb_build_object(
    'lines',  coalesce(v_lines, '[]'::jsonb),
    'totals', coalesce(v_totals, '{"total":0,"current":0,"1_30":0,"31_60":0,"61_90":0,"90plus":0}'::jsonb),
    'as_of',  p_as_of
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. rpt_owner_statement
--    كشف حساب المالك — إيرادات + مصروفات + تسويات + صافي
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_owner_statement(
  p_owner_id uuid,
  p_from     date,
  p_to       date
)
returns jsonb
language plpgsql security definer as $$
declare
  v_owner          record;
  v_transactions   jsonb;
  v_total_gross    numeric := 0;
  v_total_deductions numeric := 0;
  v_total_net      numeric := 0;
begin
  select name, commission_type, commission_value
  into   v_owner
  from   owners where id = p_owner_id;

  if not found then
    return jsonb_build_object('error', 'owner not found');
  end if;

  with owner_contracts as (
    select c.id as contract_id, u.id as unit_id, u.name as unit_name,
           pr.name as property_name
    from   contracts c
    join   units     u  on u.id  = c.unit_id
    join   properties pr on pr.id = u.property_id
    where  pr.owner_id = p_owner_id
  ),
  receipts_rows as (
    select
      r.date_time::text                          as tx_date,
      'تحصيل — ' || oc.property_name || ' / ' || oc.unit_name || ' (سند ' || r.no || ')' as details,
      'receipt'                                  as tx_type,
      oc.property_name,
      r.amount                                   as gross,
      case
        when v_owner.commission_type = 'RATE'
          then _r3(r.amount * v_owner.commission_value / 100)
        else 0
      end                                        as deduction,
      r.no
    from receipts r
    join owner_contracts oc on oc.contract_id = r.contract_id
    where r.status = 'POSTED'
      and _safe_date(r.date_time) between p_from and p_to
  ),
  expense_rows as (
    select
      e.date_time::text as tx_date,
      'مصروف — ' || coalesce(e.description, e.category) as details,
      'expense'         as tx_type,
      coalesce(pr.name,'') as property_name,
      -e.amount         as gross,
      0                 as deduction,
      e.no
    from expenses e
    left join contracts  c  on c.id  = e.contract_id
    left join units      u  on u.id  = c.unit_id
    left join properties pr on pr.id = coalesce(u.property_id, e.property_id)
    where e.status = 'POSTED'
      and e.charged_to = 'OWNER'
      and _safe_date(e.date_time) between p_from and p_to
      and (
        (c.id is not null and u.property_id in (select property_id from owner_contracts limit 1))
        or (e.property_id in (select id from properties where owner_id = p_owner_id))
      )
  ),
  settlement_rows as (
    select
      s.date::text      as tx_date,
      'تسوية مالية رقم ' || s.no as details,
      'settlement'      as tx_type,
      ''                as property_name,
      -s.amount         as gross,
      0                 as deduction,
      s.no
    from owner_settlements s
    where s.owner_id = p_owner_id
      and _safe_date(s.date) between p_from and p_to
  ),
  all_tx as (
    select * from receipts_rows
    union all
    select * from expense_rows
    union all
    select * from settlement_rows
  )
  select
    jsonb_agg(jsonb_build_object(
      'date',          tx_date,
      'details',       details,
      'type',          tx_type,
      'property_name', property_name,
      'gross',         _r3(gross),
      'deduction',     _r3(deduction),
      'net',           _r3(gross - deduction)
    ) order by tx_date, no),
    _r3(sum(gross)),
    _r3(sum(deduction)),
    _r3(sum(gross - deduction))
  into v_transactions, v_total_gross, v_total_deductions, v_total_net
  from all_tx;

  return jsonb_build_object(
    'owner_name',        v_owner.name,
    'commission_type',   v_owner.commission_type,
    'commission_value',  v_owner.commission_value,
    'transactions',      coalesce(v_transactions, '[]'::jsonb),
    'total_gross',       coalesce(v_total_gross, 0),
    'total_deductions',  coalesce(v_total_deductions, 0),
    'total_net',         coalesce(v_total_net, 0),
    'period_from',       p_from,
    'period_to',         p_to
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. rpt_tenant_statement
--    كشف حساب المستأجر — فواتير + مدفوعات + رصيد متراكم
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_tenant_statement(p_contract_id uuid)
returns jsonb
language plpgsql security definer as $$
declare
  v_contract record;
  v_tenant   record;
  v_unit     record;
  v_property record;
  v_lines    jsonb;
  v_balance  numeric;
begin
  select c.*, t.name as tenant_name, t.phone as tenant_phone,
         u.name as unit_name, pr.name as property_name
  into   v_contract
  from   contracts c
  join   tenants   t  on t.id  = c.tenant_id
  join   units     u  on u.id  = c.unit_id
  join   properties pr on pr.id = u.property_id
  where  c.id = p_contract_id;

  if not found then
    return jsonb_build_object('error', 'contract not found');
  end if;

  with tx as (
    -- فواتير (مدين على المستأجر)
    select
      i.due_date                                                   as tx_date,
      'فاتورة رقم ' || i.no ||
        case when i.type <> 'RENT' then ' (' || i.type || ')' else '' end as description,
      'invoice'                                                    as tx_type,
      i.amount + coalesce(i.tax_amount,0)                          as debit,
      0                                                            as credit,
      i.no                                                         as ref_no
    from invoices i
    where i.contract_id = p_contract_id

    union all

    -- سندات قبض (دائن — مدفوعات)
    select
      left(r.date_time, 10)                                       as tx_date,
      'سند قبض رقم ' || r.no || ' — ' || r.channel               as description,
      'receipt'                                                    as tx_type,
      0                                                            as debit,
      r.amount                                                     as credit,
      r.no                                                         as ref_no
    from receipts r
    where r.contract_id = p_contract_id
      and r.status = 'POSTED'
  ),
  with_balance as (
    select
      tx_date, description, tx_type, debit, credit, ref_no,
      sum(debit - credit) over (order by tx_date, ref_no rows unbounded preceding) as running_balance
    from tx
  )
  select jsonb_agg(jsonb_build_object(
    'date',            tx_date,
    'description',     description,
    'type',            tx_type,
    'debit',           _r3(debit),
    'credit',          _r3(credit),
    'balance',         _r3(running_balance)
  ) order by tx_date, ref_no),
  _r3(sum(debit - credit))
  into v_lines, v_balance
  from with_balance;

  return jsonb_build_object(
    'contract_id',   p_contract_id,
    'tenant_name',   v_contract.tenant_name,
    'tenant_phone',  v_contract.tenant_phone,
    'unit_name',     v_contract.unit_name,
    'property_name', v_contract.property_name,
    'start_date',    v_contract.start_date,
    'end_date',      v_contract.end_date,
    'lines',         coalesce(v_lines, '[]'::jsonb),
    'final_balance', coalesce(v_balance, 0)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. rpt_overdue_invoices
--    قائمة المتأخرين مع تفاصيل الاتصال
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_overdue_invoices(p_as_of date default current_date)
returns jsonb
language plpgsql security definer as $$
declare
  v_rows  jsonb;
  v_total numeric;
  v_count bigint;
begin
  select
    jsonb_agg(jsonb_build_object(
      'invoice_id',   i.id,
      'invoice_no',   i.no,
      'due_date',     i.due_date,
      'days_overdue', (p_as_of - _safe_date(i.due_date))::int,
      'amount',       _r3(i.amount + coalesce(i.tax_amount,0)),
      'paid',         _r3(i.paid_amount),
      'remaining',    _r3(i.amount + coalesce(i.tax_amount,0) - i.paid_amount),
      'tenant_name',  t.name,
      'tenant_phone', t.phone,
      'unit_name',    u.name,
      'property_name',pr.name,
      'contract_id',  c.id
    ) order by (p_as_of - _safe_date(i.due_date)) desc),
    _r3(sum(i.amount + coalesce(i.tax_amount,0) - i.paid_amount)),
    count(*)
  into v_rows, v_total, v_count
  from invoices i
  join contracts  c  on c.id  = i.contract_id
  join tenants    t  on t.id  = c.tenant_id
  join units      u  on u.id  = c.unit_id
  join properties pr on pr.id = u.property_id
  where i.status not in ('PAID','VOID')
    and _safe_date(i.due_date) < p_as_of
    and (i.amount + coalesce(i.tax_amount,0) - i.paid_amount) > 0.001;

  return jsonb_build_object(
    'rows',        coalesce(v_rows, '[]'::jsonb),
    'total',       coalesce(v_total, 0),
    'count',       coalesce(v_count, 0),
    'as_of',       p_as_of
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 8. rpt_daily_collection
--    كشف التحصيل اليومي — مجموعة حسب اليوم والقناة
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_daily_collection(p_from date, p_to date)
returns jsonb
language plpgsql security definer as $$
declare v_rows jsonb; v_total numeric; begin
  select
    jsonb_agg(jsonb_build_object(
      'date',         day,
      'total',        _r3(day_total),
      'cash',         _r3(cash),
      'bank',         _r3(bank),
      'pos',          _r3(pos),
      'other',        _r3(other),
      'count',        cnt
    ) order by day),
    _r3(sum(day_total))
  into v_rows, v_total
  from (
    select
      _safe_date(date_time)::text                                         as day,
      sum(amount)                                                         as day_total,
      sum(case when channel='CASH' then amount else 0 end)               as cash,
      sum(case when channel='BANK' then amount else 0 end)               as bank,
      sum(case when channel='POS'  then amount else 0 end)               as pos,
      sum(case when channel not in ('CASH','BANK','POS') then amount else 0 end) as other,
      count(*)                                                            as cnt
    from receipts
    where status = 'POSTED'
      and _safe_date(date_time) between p_from and p_to
    group by _safe_date(date_time)
  ) d;

  return jsonb_build_object(
    'rows',  coalesce(v_rows, '[]'::jsonb),
    'total', coalesce(v_total, 0),
    'from',  p_from,
    'to',    p_to
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. rpt_rent_roll
--    قائمة الإيجارات الحالية — كل وحدة + مستأجرها + حالتها
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_rent_roll(p_as_of date default current_date)
returns jsonb
language plpgsql security definer as $$
declare v_rows jsonb; begin
  select jsonb_agg(jsonb_build_object(
    'property_name',  pr.name,
    'unit_name',      u.name,
    'unit_type',      u.type,
    'status',         u.status,
    'tenant_name',    t.name,
    'tenant_phone',   t.phone,
    'contract_start', c.start_date,
    'contract_end',   c.end_date,
    'rent_amount',    c.rent_amount,
    'deposit',        c.deposit,
    'days_to_expiry', (_safe_date(c.end_date) - p_as_of)::int,
    'overdue_balance',_r3(coalesce(
      (select sum(i.amount + coalesce(i.tax_amount,0) - i.paid_amount)
       from   invoices i
       where  i.contract_id = c.id
         and  i.status not in ('PAID','VOID')
         and  _safe_date(i.due_date) < p_as_of
      ), 0))
  ) order by pr.name, u.name)
  into v_rows
  from units u
  join properties pr on pr.id = u.property_id
  left join contracts c on c.unit_id = u.id and c.status = 'ACTIVE'
  left join tenants   t on t.id = c.tenant_id;

  return jsonb_build_object(
    'rows',   coalesce(v_rows, '[]'::jsonb),
    'as_of',  p_as_of
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 10. rpt_balance_sheet
--     الميزانية العمومية الهرمية
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpt_balance_sheet(p_as_of date)
returns jsonb
language plpgsql security definer as $$
declare
  v_assets      jsonb;
  v_liabilities jsonb;
  v_equity      jsonb;
  v_tot_assets  numeric;
  v_tot_liab    numeric;
  v_tot_equity  numeric;
begin
  with sums as (
    select
      je.account_id,
      _r3(sum(case when je.type='DEBIT'  then je.amount else 0 end)) as total_dr,
      _r3(sum(case when je.type='CREDIT' then je.amount else 0 end)) as total_cr
    from journal_entries je
    where _safe_date(je.date) <= p_as_of
    group by je.account_id
  ),
  balances as (
    select
      a.id, a.no, a.name, a.type, a.is_parent, a.parent_id,
      _r3(case
        when a.type in ('ASSET','EXPENSE')
          then coalesce(s.total_dr,0) - coalesce(s.total_cr,0)
        else
          coalesce(s.total_cr,0) - coalesce(s.total_dr,0)
      end) as balance
    from accounts a
    left join sums s on s.account_id = a.id
  )
  select
    jsonb_agg(jsonb_build_object('no',b.no,'name',b.name,'balance',b.balance,'is_parent',b.is_parent) order by b.no) filter (where b.type='ASSET'),
    jsonb_agg(jsonb_build_object('no',b.no,'name',b.name,'balance',b.balance,'is_parent',b.is_parent) order by b.no) filter (where b.type='LIABILITY'),
    jsonb_agg(jsonb_build_object('no',b.no,'name',b.name,'balance',b.balance,'is_parent',b.is_parent) order by b.no) filter (where b.type='EQUITY'),
    _r3(sum(b.balance) filter (where b.type='ASSET')),
    _r3(sum(b.balance) filter (where b.type='LIABILITY')),
    _r3(sum(b.balance) filter (where b.type='EQUITY'))
  into v_assets, v_liabilities, v_equity, v_tot_assets, v_tot_liab, v_tot_equity
  from balances b
  where abs(b.balance) > 0.0001;

  return jsonb_build_object(
    'assets',            coalesce(v_assets, '[]'::jsonb),
    'liabilities',       coalesce(v_liabilities, '[]'::jsonb),
    'equity',            coalesce(v_equity, '[]'::jsonb),
    'total_assets',      coalesce(v_tot_assets, 0),
    'total_liabilities', coalesce(v_tot_liab, 0),
    'total_equity',      coalesce(v_tot_equity, 0),
    'is_balanced',       abs(coalesce(v_tot_assets,0) - coalesce(v_tot_liab,0) - coalesce(v_tot_equity,0)) < 0.01,
    'as_of',             p_as_of
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- GRANTS — السماح للمستخدمين المصادق عليهم باستدعاء الـ RPCs
-- ─────────────────────────────────────────────────────────────
grant execute on function public.rpt_financial_summary  to authenticated;
grant execute on function public.rpt_income_statement   to authenticated;
grant execute on function public.rpt_trial_balance      to authenticated;
grant execute on function public.rpt_aged_receivables   to authenticated;
grant execute on function public.rpt_owner_statement    to authenticated;
grant execute on function public.rpt_tenant_statement   to authenticated;
grant execute on function public.rpt_overdue_invoices   to authenticated;
grant execute on function public.rpt_daily_collection   to authenticated;
grant execute on function public.rpt_rent_roll          to authenticated;
grant execute on function public.rpt_balance_sheet      to authenticated;
grant execute on function public._safe_date             to authenticated;
grant execute on function public._r3                    to authenticated;
