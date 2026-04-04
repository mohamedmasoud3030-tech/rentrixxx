-- =================================================================
-- Rentrix — Secure Row Level Security (RLS) Policies
-- Migration: supabase_migration_v9_secure_rls_policies.sql
--
-- هذا الملف يقوم بتطبيق سياسات أمان محكمة (RLS) لضمان
-- أن المستخدمين يمكنهم الوصول فقط إلى البيانات الخاصة بهم.
-- =================================================================

-- ──────────────────────────────────────────────────────────────
-- الخطوة 1: ربط الملاك والمستأجرين بحسابات المستخدمين
-- ──────────────────────────────────────────────────────────────
-- إضافة عمود user_id لربط كل مالك بحساب مستخدم
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON public.owners(user_id);

-- إضافة عمود user_id لربط كل مستأجر بحساب مستخدم
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);


-- ──────────────────────────────────────────────────────────────
-- الخطوة 2: إنشاء دوال مساعدة للتحقق من الصلاحيات
-- ──────────────────────────────────────────────────────────────

-- دالة للتحقق مما إذا كان المستخدم الحالي هو مدير (ADMIN)
create or replace function is_admin()
returns boolean
language sql security definer as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'USER'
  ) = 'ADMIN';
$$;

-- دالة للتحقق مما إذا كان المستخدم الحالي هو مالك لسجل معين
create or replace function is_owner(p_owner_id uuid)
returns boolean
language sql security definer as $$
  select exists (
    select 1 from public.owners
    where id = p_owner_id and user_id = auth.uid()
  );
$$;

-- دالة للتحقق مما إذا كان المستخدم الحالي هو مستأجر لسجل معين
create or replace function is_tenant(p_tenant_id uuid)
returns boolean
language sql security definer as $$
  select exists (
    select 1 from public.tenants
    where id = p_tenant_id and user_id = auth.uid()
  );
$$;


-- ──────────────────────────────────────────────────────────────
-- الخطوة 3: حذف السياسات القديمة وتطبيق سياسات جديدة وآمنة
-- ──────────────────────────────────────────────────────────────

-- ملاحظة: سيتم تقييد الوصول لمعظم الجداول للمدراء فقط بشكل افتراضي.
-- سيتم منح صلاحيات محددة للملاك والمستأجرين للجداول التي يحتاجونها.

-- Table: owners
DROP POLICY IF EXISTS "owners_all_auth" ON public.owners;
CREATE POLICY "owners_admin_full_access" ON public.owners FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "owners_select_own" ON public.owners FOR SELECT USING (user_id = auth.uid());

-- Table: tenants
DROP POLICY IF EXISTS "tenants_all_auth" ON public.tenants;
CREATE POLICY "tenants_admin_full_access" ON public.tenants FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "tenants_select_own" ON public.tenants FOR SELECT USING (user_id = auth.uid());

-- Table: properties
DROP POLICY IF EXISTS "properties_all_auth" ON public.properties;
CREATE POLICY "properties_admin_full_access" ON public.properties FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "properties_select_owner" ON public.properties FOR SELECT USING (is_owner(owner_id));

-- Table: units
DROP POLICY IF EXISTS "units_all_auth" ON public.units;
CREATE POLICY "units_admin_full_access" ON public.units FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "units_select_public" ON public.units FOR SELECT USING (
  is_owner((select owner_id from properties where id = property_id)) OR
  exists (select 1 from contracts where unit_id = units.id and is_tenant(tenant_id))
);

-- Table: contracts
DROP POLICY IF EXISTS "contracts_all_auth" ON public.contracts;
CREATE POLICY "contracts_admin_full_access" ON public.contracts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "contracts_select_owner_tenant" ON public.contracts FOR SELECT USING (
  is_tenant(tenant_id) OR
  is_owner((select p.owner_id from units u join properties p on u.property_id = p.id where u.id = unit_id))
);

-- Table: invoices
DROP POLICY IF EXISTS "invoices_all_auth" ON public.invoices;
CREATE POLICY "invoices_admin_full_access" ON public.invoices FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "invoices_select_owner_tenant" ON public.invoices FOR SELECT USING (
  exists (select 1 from contracts where id = contract_id and is_tenant(tenant_id)) OR
  exists (select 1 from contracts c join units u on c.unit_id = u.id join properties p on u.property_id = p.id where c.id = invoices.contract_id and is_owner(p.owner_id))
);

-- Table: receipts
DROP POLICY IF EXISTS "receipts_all_auth" ON public.receipts;
CREATE POLICY "receipts_admin_full_access" ON public.receipts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "receipts_select_owner_tenant" ON public.receipts FOR SELECT USING (
  exists (select 1 from contracts where id = contract_id and is_tenant(tenant_id)) OR
  exists (select 1 from contracts c join units u on c.unit_id = u.id join properties p on u.property_id = p.id where c.id = receipts.contract_id and is_owner(p.owner_id))
);

-- Table: receipt_allocations
DROP POLICY IF EXISTS "receipt_allocations_all_auth" ON public.receipt_allocations;
CREATE POLICY "receipt_allocations_admin_full_access" ON public.receipt_allocations FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "receipt_allocations_select_owner_tenant" ON public.receipt_allocations FOR SELECT USING (
  exists (select 1 from invoices i join contracts c on i.contract_id = c.id where i.id = receipt_allocations.invoice_id and is_tenant(c.tenant_id)) OR
  exists (select 1 from invoices i join contracts c on i.contract_id = c.id join units u on c.unit_id = u.id join properties p on u.property_id = p.id where i.id = receipt_allocations.invoice_id and is_owner(p.owner_id))
);

-- Table: expenses
DROP POLICY IF EXISTS "expenses_all_auth" ON public.expenses;
CREATE POLICY "expenses_admin_full_access" ON public.expenses FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "expenses_select_owner" ON public.expenses FOR SELECT USING (
  is_owner((select p.owner_id from properties p where p.id = expenses.property_id)) OR
  exists (select 1 from contracts c join units u on c.unit_id = u.id join properties p on u.property_id = p.id where c.id = expenses.contract_id and is_owner(p.owner_id))
);

-- Table: maintenance_records
DROP POLICY IF EXISTS "maintenance_records_all_auth" ON public.maintenance_records;
CREATE POLICY "maintenance_admin_full_access" ON public.maintenance_records FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "maintenance_select_owner_tenant" ON public.maintenance_records FOR SELECT USING (
  is_owner((select p.owner_id from units u join properties p on u.property_id = p.id where u.id = unit_id)) OR
  exists (select 1 from contracts where unit_id = maintenance_records.unit_id and is_tenant(tenant_id))
);

-- Table: utility_records
DROP POLICY IF EXISTS "Authenticated users can manage utility records" ON public.utility_records;
CREATE POLICY "utility_records_admin_full_access" ON public.utility_records FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "utility_records_select_owner_tenant" ON public.utility_records FOR SELECT USING (
  is_owner((select owner_id from properties where id = property_id)) OR
  exists (select 1 from contracts c where c.unit_id = utility_records.unit_id and is_tenant(c.tenant_id))
);

-- Table: contract_balances
DROP POLICY IF EXISTS "contract_balances_all_auth" ON public.contract_balances;
CREATE POLICY "contract_balances_select" ON public.contract_balances FOR SELECT USING (
  is_admin() OR
  is_tenant(tenant_id) OR
  is_owner((select p.owner_id from contracts c join units u on c.unit_id = u.id join properties p on u.property_id = p.id where c.id = contract_id))
);

-- Table: owner_balances
DROP POLICY IF EXISTS "owner_balances_all_auth" ON public.owner_balances;
CREATE POLICY "owner_balances_select" ON public.owner_balances FOR SELECT USING (is_admin() OR is_owner(owner_id));

-- Table: tenant_balances
DROP POLICY IF EXISTS "tenant_balances_all_auth" ON public.tenant_balances;
CREATE POLICY "tenant_balances_select" ON public.tenant_balances FOR SELECT USING (is_admin() OR is_tenant(tenant_id));


-- ──────────────────────────────────────────────────────────────
-- الخطوة 4: تأمين الجداول الإدارية الأخرى (وصول للمدير فقط)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "settings_all_auth" ON public.settings; CREATE POLICY "settings_admin_only" ON public.settings FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "deposit_txs_all_auth" ON public.deposit_txs; CREATE POLICY "deposit_txs_admin_only" ON public.deposit_txs FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "audit_log_all_auth" ON public.audit_log; CREATE POLICY "audit_log_admin_only" ON public.audit_log FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "accounts_all_auth" ON public.accounts; CREATE POLICY "accounts_admin_only" ON public.accounts FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "journal_entries_all_auth" ON public.journal_entries; CREATE POLICY "journal_entries_admin_only" ON public.journal_entries FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "owner_settlements_all_auth" ON public.owner_settlements; CREATE POLICY "owner_settlements_admin_only" ON public.owner_settlements FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "serials_all_auth" ON public.serials; CREATE POLICY "serials_admin_only" ON public.serials FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "governance_all_auth" ON public.governance; CREATE POLICY "governance_admin_only" ON public.governance FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "notification_templates_all_auth" ON public.notification_templates; CREATE POLICY "notification_templates_admin_only" ON public.notification_templates FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "outgoing_notifications_all_auth" ON public.outgoing_notifications; CREATE POLICY "outgoing_notifications_admin_only" ON public.outgoing_notifications FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "leads_all_auth" ON public.leads; CREATE POLICY "leads_admin_only" ON public.leads FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "lands_all_auth" ON public.lands; CREATE POLICY "lands_admin_only" ON public.lands FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "missions_all_auth" ON public.missions; CREATE POLICY "missions_admin_only" ON public.missions FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "budgets_all_auth" ON public.budgets; CREATE POLICY "budgets_admin_only" ON public.budgets FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "attachments_all_auth" ON public.attachments; CREATE POLICY "attachments_admin_only" ON public.attachments FOR ALL USING (is_admin());


-- ──────────────────────────────────────────────────────────────
-- DONE – paste into Supabase SQL Editor and click Run
-- ──────────────────────────────────────────────────────────────