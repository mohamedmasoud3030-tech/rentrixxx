-- =================================================================
-- Rentrix — Comprehensive Fixes & Improvements (v10)
-- Migration: supabase_migration_v10_comprehensive_fixes.sql
--
-- هذا الملف يقوم بتنفيذ إصلاحات شاملة للأمان، الأداء، والنزاهة.
-- =================================================================

-- ──────────────────────────────────────────────────────────────
-- المرحلة 1: النزاهة (Integrity)
-- ──────────────────────────────────────────────────────────────

-- 1.1: تحسين نظام الأرقام التسلسلية لمنع التكرار (Race Conditions)
-- نقوم بإنشاء دالة آمنة (atomic) لتحديث العدادات.

create or replace function public.increment_serial(p_key text)
returns int
language plpgsql
security definer
as $$
declare
  new_val int;
  col_name text;
begin
  -- تحويل اسم المفتاح من camelCase إلى snake_case
  col_name := case p_key
    when 'ownerSettlement' then 'owner_settlement'
    when 'journalEntry' then 'journal_entry'
    else p_key
  end;

  -- قفل الصف وتحديث القيمة في عملية واحدة لضمان عدم التضارب
  execute format(
    'update public.serials set %I = %I + 1 where id = 1 returning %I',
    col_name, col_name, col_name
  ) into new_val;

  return new_val;
end;
$$;

-- 1.2: إضافة قواعد تحقق للبيانات المالية
-- ضمان أن المبالغ المدخلة تكون دائماً إيجابية
alter table public.invoices add constraint check_positive_amount check (amount >= 0);
alter table public.receipts add constraint check_positive_amount check (amount >= 0);
alter table public.expenses add constraint check_positive_amount check (amount >= 0);
alter table public.owner_settlements add constraint check_positive_amount check (amount >= 0);


-- ──────────────────────────────────────────────────────────────
-- المرحلة 2: الأمان (Security)
-- ──────────────────────────────────────────────────────────────

-- 2.1: إضافة توقيعات رقمية (JWT) لبوابة المالك
-- هذه الدالة تنشئ توكن آمن ومؤقت للوصول إلى بوابة المالك
create or replace function public.generate_owner_portal_token(p_owner_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  token text;
begin
  -- JWT صالح لمدة 30 يوماً
  select sign(
    json_build_object(
      'sub', p_owner_id,
      'aud', 'authenticated',
      'role', 'owner_portal', -- دور مخصص للتحقق
      'exp', extract(epoch from now() + interval '30 days')
    ),
    current_setting('app.settings.jwt_secret')
  ) into token;

  return token;
end;
$$;


-- ──────────────────────────────────────────────────────────────
-- المرحلة 3: الأداء (Performance)
-- ──────────────────────────────────────────────────────────────

-- 3.1: إضافة فهارس إضافية لدعم الاستعلامات المقسمة (Pagination)
-- هذه الفهارس تساعد في تسريع فرز البيانات عند طلبها صفحة بصفحة
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);
create index if not exists idx_receipts_created_at on public.receipts(created_at desc);
create index if not exists idx_expenses_created_at on public.expenses(created_at desc);
create index if not exists idx_contracts_created_at on public.contracts(created_at desc);


-- ──────────────────────────────────────────────────────────────
-- DONE – paste into Supabase SQL Editor and click Run
-- ──────────────────────────────────────────────────────────────