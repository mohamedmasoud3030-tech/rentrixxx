-- ============================================================
-- Rentrix — Automatic Balance Updates & Triggers
-- Migration: supabase_migration_v8_automatic_balance_updates.sql
--
-- يضيف triggers تلقائية لتحديث جداول الأرصدة المحسوبة
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Trigger لتحديث contract_balances عند تغيير الفواتير
-- ─────────────────────────────────────────────────────────────
create or replace function update_contract_balance_on_invoice()
returns trigger
language plpgsql security definer as $$
begin
  -- إعادة حساب رصيد العقد
  insert into contract_balances (contract_id, tenant_id, unit_id, total_invoiced, total_paid, balance_due, updated_at)
  select
    c.id,
    c.tenant_id,
    c.unit_id,
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0)), 0),
    coalesce(sum(i.paid_amount), 0),
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0) - i.paid_amount), 0),
    extract(epoch from now()) * 1000
  from contracts c
  left join invoices i on i.contract_id = c.id and i.status != 'VOID'
  where c.id = coalesce(NEW.contract_id, OLD.contract_id)
  group by c.id, c.tenant_id, c.unit_id
  on conflict (contract_id) do update set
    total_invoiced = excluded.total_invoiced,
    total_paid = excluded.total_paid,
    balance_due = excluded.balance_due,
    updated_at = excluded.updated_at;

  return coalesce(NEW, OLD);
end;
$$;

create trigger trigger_update_contract_balance_on_invoice
  after insert or update or delete on invoices
  for each row execute function update_contract_balance_on_invoice();

-- ─────────────────────────────────────────────────────────────
-- 2. Trigger لتحديث contract_balances عند تغيير المدفوعات
-- ─────────────────────────────────────────────────────────────
create or replace function update_contract_balance_on_receipt_allocation()
returns trigger
language plpgsql security definer as $$
begin
  -- إعادة حساب رصيد العقد المؤثر عليه
  insert into contract_balances (contract_id, tenant_id, unit_id, total_invoiced, total_paid, balance_due, updated_at)
  select
    c.id,
    c.tenant_id,
    c.unit_id,
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0)), 0),
    coalesce(sum(i.paid_amount), 0),
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0) - i.paid_amount), 0),
    extract(epoch from now()) * 1000
  from contracts c
  left join invoices i on i.contract_id = c.id and i.status != 'VOID'
  where c.id in (
    select distinct contract_id from invoices
    where id = coalesce(NEW.invoice_id, OLD.invoice_id)
  )
  group by c.id, c.tenant_id, c.unit_id
  on conflict (contract_id) do update set
    total_invoiced = excluded.total_invoiced,
    total_paid = excluded.total_paid,
    balance_due = excluded.balance_due,
    updated_at = excluded.updated_at;

  return coalesce(NEW, OLD);
end;
$$;

create trigger trigger_update_contract_balance_on_receipt_allocation
  after insert or update or delete on receipt_allocations
  for each row execute function update_contract_balance_on_receipt_allocation();

-- ─────────────────────────────────────────────────────────────
-- 3. Trigger لتحديث owner_balances عند تغيير المصروفات
-- ─────────────────────────────────────────────────────────────
create or replace function update_owner_balance_on_expense()
returns trigger
language plpgsql security definer as $$
begin
  -- إعادة حساب رصيد المالك
  insert into owner_balances (owner_id, total_income, total_expenses, commission, net_balance, updated_at)
  select
    o.id,
    coalesce(sum(
      case when r.status = 'POSTED' then r.amount else 0 end
    ), 0) as total_income,
    coalesce(sum(
      case when e.status = 'POSTED' and e.charged_to in ('OWNER', 'OFFICE') then e.amount else 0 end
    ), 0) as total_expenses,
    coalesce(sum(
      case when r.status = 'POSTED' then r.amount * coalesce(o.commission_value / 100, 0.05) else 0 end
    ), 0) as commission,
    0, -- سيتم حسابه لاحقاً
    extract(epoch from now()) * 1000
  from owners o
  left join properties p on p.owner_id = o.id
  left join units u on u.property_id = p.id
  left join contracts c on c.unit_id = u.id and c.status = 'ACTIVE'
  left join receipts r on r.contract_id = c.id
  left join expenses e on (e.contract_id = c.id or e.property_id = p.id)
  where o.id = coalesce(
    (select owner_id from properties where id = coalesce(NEW.property_id, OLD.property_id)),
    (select p2.owner_id from contracts c2 join properties p2 on p2.id = c2.property_id where c2.id = coalesce(NEW.contract_id, OLD.contract_id))
  )
  group by o.id, o.commission_value
  on conflict (owner_id) do update set
    total_income = excluded.total_income,
    total_expenses = excluded.total_expenses,
    commission = excluded.commission,
    net_balance = excluded.total_income - excluded.total_expenses - excluded.commission,
    updated_at = excluded.updated_at;

  return coalesce(NEW, OLD);
end;
$$;

create trigger trigger_update_owner_balance_on_expense
  after insert or update or delete on expenses
  for each row execute function update_owner_balance_on_expense();

-- ─────────────────────────────────────────────────────────────
-- 4. Trigger لتحديث owner_balances عند تغيير المدفوعات
-- ─────────────────────────────────────────────────────────────
create trigger trigger_update_owner_balance_on_receipt
  after insert or update or delete on receipts
  for each row execute function update_owner_balance_on_expense();

-- ─────────────────────────────────────────────────────────────
-- 5. Trigger لتحديث tenant_balances
-- ─────────────────────────────────────────────────────────────
create or replace function update_tenant_balance()
returns trigger
language plpgsql security definer as $$
begin
  insert into tenant_balances (tenant_id, balance_due, updated_at)
  select
    t.id,
    coalesce(sum(cb.balance_due), 0),
    extract(epoch from now()) * 1000
  from tenants t
  left join contracts c on c.tenant_id = t.id and c.status = 'ACTIVE'
  left join contract_balances cb on cb.contract_id = c.id
  where t.id in (
    select tenant_id from contracts where id in (
      select contract_id from invoices where id = coalesce(NEW.contract_id, OLD.contract_id)
      union
      select contract_id from receipt_allocations where invoice_id = coalesce(NEW.invoice_id, OLD.invoice_id)
    )
  )
  group by t.id
  on conflict (tenant_id) do update set
    balance_due = excluded.balance_due,
    updated_at = excluded.updated_at;

  return coalesce(NEW, OLD);
end;
$$;

create trigger trigger_update_tenant_balance_on_invoice
  after insert or update or delete on invoices
  for each row execute function update_tenant_balance();

create trigger trigger_update_tenant_balance_on_receipt_allocation
  after insert or update or delete on receipt_allocations
  for each row execute function update_tenant_balance();

-- ─────────────────────────────────────────────────────────────
-- 6. Trigger لتحديث حالة الوحدة تلقائياً
-- ─────────────────────────────────────────────────────────────
create or replace function update_unit_status()
returns trigger
language plpgsql security definer as $$
begin
  -- تحديث حالة الوحدة بناءً على العقود النشطة
  update units set status =
    case
      when exists (select 1 from contracts where unit_id = coalesce(NEW.unit_id, OLD.unit_id) and status = 'ACTIVE') then 'RENTED'
      when exists (select 1 from maintenance_records where unit_id = coalesce(NEW.unit_id, OLD.unit_id) and status in ('NEW', 'IN_PROGRESS')) then 'MAINTENANCE'
      else 'AVAILABLE'
    end
  where id = coalesce(NEW.unit_id, OLD.unit_id);

  return coalesce(NEW, OLD);
end;
$$;

create trigger trigger_update_unit_status_on_contract
  after insert or update or delete on contracts
  for each row execute function update_unit_status();

create trigger trigger_update_unit_status_on_maintenance
  after insert or update or delete on maintenance_records
  for each row execute function update_unit_status();

-- ─────────────────────────────────────────────────────────────
-- 7. Trigger لتحديث حالة الفاتورة تلقائياً
-- ─────────────────────────────────────────────────────────────
create or replace function update_invoice_status()
returns trigger
language plpgsql security definer as $$
begin
  update invoices set status =
    case
      when paid_amount >= amount + coalesce(tax_amount, 0) then 'PAID'
      when paid_amount > 0 then 'PARTIALLY_PAID'
      else 'UNPAID'
    end
  where id = coalesce(NEW.invoice_id, OLD.invoice_id);

  return coalesce(NEW, OLD);
end;
$$;

create trigger trigger_update_invoice_status
  after insert or update or delete on receipt_allocations
  for each row execute function update_invoice_status();

-- ─────────────────────────────────────────────────────────────
-- 8. إضافة فهارس للأداء
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_contracts_status on contracts(status);
create index if not exists idx_contracts_tenant_unit on contracts(tenant_id, unit_id);
create index if not exists idx_invoices_contract_status on invoices(contract_id, status);
create index if not exists idx_invoices_due_date on invoices(due_date);
create index if not exists idx_receipts_status_date on receipts(status, date_time);
create index if not exists idx_expenses_status_date on expenses(status, date_time);
create index if not exists idx_journal_entries_date on journal_entries(date);
create index if not exists idx_maintenance_unit_status on maintenance_records(unit_id, status);

-- ─────────────────────────────────────────────────────────────
-- 9. دالة لإعادة حساب جميع الأرصدة (للتهيئة الأولية)
-- ─────────────────────────────────────────────────────────────
create or replace function public.recalculate_all_balances()
returns void
language plpgsql security definer as $$
begin
  -- حذف الأرصدة الحالية
  truncate table owner_balances, contract_balances, tenant_balances;

  -- إعادة حساب contract_balances
  insert into contract_balances (contract_id, tenant_id, unit_id, total_invoiced, total_paid, balance_due, updated_at)
  select
    c.id,
    c.tenant_id,
    c.unit_id,
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0)), 0),
    coalesce(sum(i.paid_amount), 0),
    coalesce(sum(i.amount + coalesce(i.tax_amount, 0) - i.paid_amount), 0),
    extract(epoch from now()) * 1000
  from contracts c
  left join invoices i on i.contract_id = c.id and i.status != 'VOID'
  group by c.id, c.tenant_id, c.unit_id;

  -- إعادة حساب owner_balances
  insert into owner_balances (owner_id, total_income, total_expenses, commission, net_balance, updated_at)
  select
    o.id,
    coalesce(sum(case when r.status = 'POSTED' then r.amount else 0 end), 0),
    coalesce(sum(case when e.status = 'POSTED' and e.charged_to in ('OWNER', 'OFFICE') then e.amount else 0 end), 0),
    coalesce(sum(case when r.status = 'POSTED' then r.amount * coalesce(o.commission_value / 100, 0.05) else 0 end), 0),
    0, -- سيتم تحديثه
    extract(epoch from now()) * 1000
  from owners o
  left join properties p on p.owner_id = o.id
  left join units u on u.property_id = p.id
  left join contracts c on c.unit_id = u.id and c.status = 'ACTIVE'
  left join receipts r on r.contract_id = c.id
  left join expenses e on (e.contract_id = c.id or e.property_id = p.id)
  group by o.id, o.commission_value;

  -- تحديث net_balance في owner_balances
  update owner_balances set net_balance = total_income - total_expenses - commission;

  -- إعادة حساب tenant_balances
  insert into tenant_balances (tenant_id, balance_due, updated_at)
  select
    t.id,
    coalesce(sum(cb.balance_due), 0),
    extract(epoch from now()) * 1000
  from tenants t
  left join contracts c on c.tenant_id = t.id and c.status = 'ACTIVE'
  left join contract_balances cb on cb.contract_id = c.id
  group by t.id;

end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 10. تم - تشغيل هذا الملف في Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────