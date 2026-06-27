# Rentrix — خطة نقل المحركات من ERPNext

**النوع:** وثيقة تطوير استراتيجية  
**تاريخ الإنشاء:** 2026-06-28  
**المرجع:** تحليل GAP بين ERPNext Accounts Module و Rentrix  
**الحالة:** قيد المراجعة — لم تُعتمد بعد

---

## 1. المبدأ التوجيهي

Rentrix **ليست** نسخة من ERPNext. الهدف هو نقل **المفاهيم** التي تخدم إدارة العقارات العربية، وليس نقل الكود أو البنية. كل محرك يُضاف يجب أن:

- يخدم سيناريو حقيقي في مكتب العقارات الخليجي
- لا يتعارض مع قيد `single-office` / `no-general-ledger`
- يمر عبر migration + RLS + atomic RPC بنفس نمط Rentrix الحالي

---

## 2. ما تملكه Rentrix (لا يحتاج نقل)

| المحرك | ERPNext المكافئ | حالة Rentrix |
|---|---|---|
| دفتر الأستاذ (GL) | `GL Entry` | ✅ `journal_entries` + `accounts` + `account_balances` |
| الفواتير | `Sales Invoice` | ✅ `invoices` مع status lifecycle كامل |
| الإيصالات | `Payment Entry` | ✅ `receipts` + `receipt_allocations` atomic |
| ميزان المراجعة | `Trial Balance` | ✅ `rpt_trial_balance` RPC |
| قائمة الدخل | `Profit and Loss Statement` | ✅ `rpt_income_statement` RPC |
| الميزانية العمومية | `Balance Sheet` | ✅ `rpt_balance_sheet` RPC |
| كشف المستأجر | `Customer Statement` | ✅ `rpt_tenant_statement` RPC |
| كشف المالك | `Supplier Statement` | ✅ `rpt_owner_statement` RPC |
| المديونيات المتأخرة | `Accounts Receivable Aging` | ✅ `rpt_aged_receivables` RPC |
| التحصيل اليومي | لا مكافئ مباشر | ✅ `rpt_daily_collection` RPC |
| Rent Roll | `Lease Management` | ✅ `rpt_rent_roll` RPC |
| الميزانية التقديرية | `Budget` | ✅ `budgets` جدول |
| المصروفات | `Expense Claim` | ✅ `expenses` مع owner_balance |
| سجل المراجعة | `Activity Log` | ✅ `audit_log` مع RLS |

---

## 3. المحركات المطلوب نقلها — مُرتَّبة حسب الأولوية

---

### P0 — حاجز وظيفي (يمنع الإطلاق)

#### P0-A: إصلاح `record_invoice_payment_atomic`

**المشكلة:**
- `find_payment_account_id` يُخطئ في cast حسابات `1111`/`1201` إلى UUID
- cash-role regex يُطابق أكثر من حساب واحد
- إصلاح سابق أُعيد كتابته بهجرة لاحقة

**الحل:**
```sql
-- Migration: fix_find_payment_account_id
CREATE OR REPLACE FUNCTION find_payment_account_id(
  p_org_id uuid,
  p_role text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM accounts
  WHERE org_id = p_org_id
    AND role = p_role
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Account not found for role: %', p_role;
  END IF;
  
  RETURN v_id;
END;
$$;
```

**ملاحظة ERPNext:** ERPNext يستخدم `account_for_payment` lookup بنفس المنطق — اسم الحساب بدلاً من UUID مباشرة.

**المكونات المطلوبة:**
- [ ] Migration SQL لإصلاح الدالة
- [ ] اختبار `findPaymentAccountId.test.ts`
- [ ] تحديث `CURRENT_EXECUTION_CONTEXT.md` بالدليل

---

#### P0-B: Cost Centers (مراكز التكلفة)

**لماذا P0؟** بدون مراكز تكلفة لا يمكن معرفة ربحية كل عقار على حدة.

**ERPNext المقابل:** `Cost Center` doctype مع شجرة هرمية.

**مقترح Rentrix (مبسَّط):**
```sql
-- جدول جديد
CREATE TABLE cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES company_settings NOT NULL,
  name text NOT NULL,
  property_id uuid REFERENCES properties,  -- اختياري: ربط بعقار
  parent_id uuid REFERENCES cost_centers,  -- للتسلسل الهرمي
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- إضافة FK إلى expenses
ALTER TABLE expenses ADD COLUMN cost_center_id uuid REFERENCES cost_centers;

-- إضافة FK إلى journal_entries
ALTER TABLE journal_entries ADD COLUMN cost_center_id uuid REFERENCES cost_centers;
```

**المكونات المطلوبة:**
- [ ] Migration: `add_cost_centers`
- [ ] RLS policies بنمط `is_app_user()`
- [ ] `costCenterService.ts`
- [ ] `useCostCenters.ts`
- [ ] صفحة CRUD بسيطة في Settings
- [ ] ربط `cost_center_id` في نموذج المصروفات
- [ ] تحديث `rpt_income_statement` لتصفية حسب cost center

---

### P1 — مهم للإطلاق الكامل

#### P1-A: تقرير Cash Flow (التدفق النقدي)

**ERPNext المقابل:** `Cash Flow Statement` مع 3 أقسام.

**لماذا مهم؟** القائمة المالية الثالثة الأساسية — مطلوبة لأي مراجعة مالية.

**مقترح Rentrix:**
```sql
CREATE OR REPLACE FUNCTION rpt_cash_flow(
  p_org_id uuid,
  p_from_date date,
  p_to_date date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_operating jsonb;
  v_investing jsonb;
  v_financing jsonb;
BEGIN
  -- Operating: مقبوضات الإيجار - مدفوعات المصروفات
  SELECT jsonb_build_object(
    'receipts', COALESCE(SUM(p.amount), 0),
    'expenses', COALESCE((SELECT SUM(e.amount) FROM expenses e 
                          WHERE e.org_id = p_org_id 
                          AND e.expense_date BETWEEN p_from_date AND p_to_date
                          AND e.deleted_at IS NULL), 0)
  ) INTO v_operating
  FROM payments p
  WHERE p.org_id = p_org_id
    AND p.payment_date BETWEEN p_from_date AND p_to_date
    AND p.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'period', jsonb_build_object('from', p_from_date, 'to', p_to_date),
    'operating', v_operating,
    'investing', jsonb_build_object('note', 'not_applicable_single_office'),
    'financing', jsonb_build_object('note', 'not_applicable_single_office'),
    'net_change', (v_operating->>'receipts')::numeric - (v_operating->>'expenses')::numeric
  );
END;
$$;
```

**المكونات المطلوبة:**
- [ ] Migration: `add_rpt_cash_flow`
- [ ] `financialReportsService.ts` — إضافة `getCashFlowReport()`
- [ ] مكون `CashFlowSection.tsx` في صفحة التقارير
- [ ] CSV export للتقرير

---

#### P1-B: Bank Reconciliation (تسوية البنك)

**ERPNext المقابل:** `Bank Transaction` + `Bank Account` + auto-matching.

**لماذا مهم؟** بدون تسوية بنكية لا يمكن تأكيد أن المدفوعات المسجلة وصلت فعلاً للبنك.

**مقترح Rentrix (نسخة مبسطة):**
```sql
-- حسابات بنكية
CREATE TABLE bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  account_name text NOT NULL,
  bank_name text,
  iban text,
  account_number text,
  currency text DEFAULT 'OMR',
  linked_account_id uuid REFERENCES accounts,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- حركات بنكية (من كشف البنك)
CREATE TABLE bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  bank_account_id uuid REFERENCES bank_accounts NOT NULL,
  transaction_date date NOT NULL,
  amount numeric(15,3) NOT NULL,
  description text,
  reference text,
  matched_payment_id uuid REFERENCES payments,  -- للتسوية
  status text DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'reconciled')),
  created_at timestamptz DEFAULT now()
);
```

**المكونات المطلوبة:**
- [ ] Migration: `add_bank_reconciliation`
- [ ] RLS policies
- [ ] `bankService.ts` + `useBankAccounts.ts`
- [ ] صفحة استيراد كشف بنكي (CSV/Excel)
- [ ] واجهة مطابقة يدوية (payment ↔ bank_transaction)
- [ ] تقرير تسوية

---

#### P1-C: Payment Terms (شروط الدفع)

**ERPNext المقابل:** `Payment Terms Template` + `Payment Schedule`.

**لماذا مهم؟** في عقارات الخليج: دفع 4 شيكات سنوياً، أو 2، أو دفعة واحدة.

**مقترح Rentrix:**
```sql
-- قوالب شروط الدفع
CREATE TABLE payment_terms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,  -- "ربع سنوي"، "نصف سنوي"، "سنوي"
  installments integer DEFAULT 1,
  interval_type text CHECK (interval_type IN ('monthly', 'quarterly', 'biannual', 'annual', 'custom')),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- إضافة FK إلى contracts
ALTER TABLE contracts ADD COLUMN payment_terms_id uuid REFERENCES payment_terms_templates;
```

**المكونات المطلوبة:**
- [ ] Migration: `add_payment_terms`
- [ ] CRUD في Settings
- [ ] ربط في نموذج العقد
- [ ] `generate_invoices_from_active_contracts` يحترم جدول الدفعات

---

#### P1-D: VAT Support (ضريبة القيمة المضافة)

**ERPNext المقابل:** `GST/VAT Settings` + `tax_amount` في الفواتير.

**لماذا مهم؟** الخليج يطبق VAT 5% — متطلب قانوني.

**ملاحظة:** `tax_amount` موجود في SQL قديم لكن مفقود من `database.ts` — تحتاج إلى توحيد.

**مقترح Rentrix:**
```sql
-- إعدادات الضريبة في company_settings
ALTER TABLE company_settings 
  ADD COLUMN IF NOT EXISTS vat_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS vat_registration_number text;

-- التأكد من وجود tax_amount في invoices
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(15,3) DEFAULT 0;
```

**المكونات المطلوبة:**
- [ ] Migration: `add_vat_support`
- [ ] إعدادات VAT في Settings
- [ ] حساب VAT تلقائي عند إنشاء الفاتورة
- [ ] عرض VAT في الفاتورة المطبوعة
- [ ] تقرير `rpt_vat_return` (ملخص شهري/ربع سنوي)
- [ ] تحديث `database.ts` بعد Migration

---

### P2 — يعزز المنتج (مرحلة لاحقة)

#### P2-A: Security Deposit Management (إدارة تأمين الإيجار)

**ERPNext المقابل:** `Security Deposit` كـ `Liability Account`.

**الوضع الحالي:** `deposit_txs` موجود لكن بدائي.

**المطلوب:**
- [ ] منطق استقطاع من التأمين (للتلف/الديون)
- [ ] تقرير تأمينات مفصل (مدفوع، مُسترجع، مُستقطع)
- [ ] ربط تأمين الإيجار بإنهاء العقد

---

#### P2-B: Deferred Revenue (الإيراد المؤجل)

**ERPNext المقابل:** `Deferred Revenue` + جدول زمني للتوزيع.

**لماذا؟** إيجار سنة مقبوض مقدماً يجب توزيعه 12 شهراً — مطلوب لدقة قائمة الدخل.

**المطلوب:**
- [ ] جدول `revenue_recognition_schedule`
- [ ] trigger لتوزيع الإيراد شهرياً
- [ ] عرض في تقرير قائمة الدخل

---

#### P2-C: Payment Mode Reference (طرق الدفع المرجعية)

**الوضع الحالي:** `payment_method` نص حر في payments.

**المطلوب:**
```sql
CREATE TABLE payment_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,  -- كاش، تحويل بنكي، شيك، بطاقة
  code text,  -- cash, bank_transfer, check, card
  linked_bank_account_id uuid REFERENCES bank_accounts,
  is_active boolean DEFAULT true
);
```

---

#### P2-D: Currency / Multi-Currency (العملات المتعددة)

**لماذا؟** بعض عقود الخليج بالدولار أو اليورو.

**المطلوب:**
- [ ] جدول `currencies` مع أسعار الصرف
- [ ] `exchange_rate` في transactions
- [ ] تقارير بالعملة الأساسية (OMR) مع التحويل

---

## 4. ترتيب التنفيذ الموصى به

```
الأسبوع 1-2:
  [P0-A] إصلاح record_invoice_payment_atomic ← URGENT
  [P0-B] Cost Centers — schema + service + UI

الأسبوع 3-4:
  [P1-D] VAT Support — migration + settings + invoice display
  [P1-C] Payment Terms — template + contract link

الأسبوع 5-6:
  [P1-A] Cash Flow Report — RPC + UI component
  [P1-B] Bank Reconciliation — schema + import UI + matching

الأسبوع 7-8:
  [P2-A] Security Deposit Management
  [P2-C] Payment Mode Reference

مستقبلاً (بعد v1.0):
  [P2-B] Deferred Revenue
  [P2-D] Multi-Currency
```

---

## 5. قواعد النقل من ERPNext

### ما يُنقل:
- المفهوم والمنطق التجاري
- هيكل البيانات المبسط المناسب لـ single-office
- تعريفات التقارير والمعادلات المالية

### ما لا يُنقل:
- بنية ERPNext متعددة الشركات (`Company` doctype)
- نظام `Chart of Accounts` المعقد (Rentrix لديها `accounts` بالفعل)
- `Payroll` أو `HR` modules
- `Manufacturing` أو `Inventory` modules
- أي شيء يتعارض مع قيد `no-general-ledger`
- Python/Frappe code — كل شيء يُبنى بـ TypeScript + PostgreSQL

---

## 6. متطلبات كل محرك جديد

كل محرك يُضاف يجب أن يشمل:

```
□ Migration SQL (idempotent — DROP IF EXISTS / CREATE OR REPLACE)
□ RLS Policies (is_app_user() / is_admin_or_manager())
□ SECURITY DEFINER functions للعمليات الحساسة
□ xxxService.ts (Supabase queries)
□ useXxx.ts (React Query hooks)
□ صفحة أو قسم UI
□ اختبارات (xxx.test.ts)
□ تحديث CURRENT_EXECUTION_CONTEXT.md
□ تحديث ONBOARDING.md إذا تغير nav
□ تحديث CODEBASE_AUDIT_2026-06-27.md
```

---

## 7. الحدود الثابتة (لا تتغير)

- لا `organizations` table أو multi-tenancy
- لا journal-entry UI للمستخدم النهائي
- `/accounting` يظل redirect إلى `/financials`
- لا payroll أو HR
- لا external sending في Communication (لوج داخلي فقط)
- Owner settlements تحتاج قرار منتج منفصل

---

**آخر تحديث:** 2026-06-28  
**المراجع:** `docs/FINAL_PRODUCT_BLUEPRINT.md`, `docs/RENTRIX_MASTER_PLAN.md`, تحليل ERPNext GAP  
**الحالة:** قيد المراجعة — يحتاج موافقة المالك قبل بدء التنفيذ
