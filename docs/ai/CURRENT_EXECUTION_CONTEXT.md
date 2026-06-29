# Current Execution Context

**آخر تحديث:** 2026-06-29 — إتمام المرحلة 5 (Financial Workflows & Settlements Engine)  
**حالة التحقق:** مطابق للكود الفعلي في `main`

---

## الحالة الفعلية للمراحل

| المرحلة | الوصف | الحالة |
|---|---|---|
| Phase 0 | Runtime truth audit | ✅ مكتملة |
| Phase 1 | Domain Foundation — TypeScript types + i18n keys | ✅ مكتملة (PR #1013) |
| Phase 2 | Local Data Foundation — mock repos + Zustand store | ✅ مكتملة (PR #1021) |
| Phase 3 | Owner Hub — Owner onboarding + Agreement forms | ✅ مكتملة (PRs #1022، #1023، #1024) |
| Phase 3.5 | EntityCard — unified entity card (ADR-008 Phase B) | ✅ مكتملة (PR #1025) |
| Phase 4 | Tenant and Contract Lifecycle | ✅ مكتملة (PR #1027) |
| Phase 5 | Financial Workflows | ✅ مكتملة |
| Phase 6 | Roles and Audit Behavior | 🔜 التالية |
| Phase 7 | Reports, Print/Export, Tests, CI | 📋 مخططة |
| Phase 8 | Supabase Integration (live) | ⏸️ مؤجلة — قرار مالك |
| Phase 9 | Secondary Module Hardening | 📋 Backlog |

---

## ما أُنجز حديثاً (Phase 5 — Financial Workflows)

### Phase 5: Financial Workflows & Settlements Engine
- `features/financials/phase5-invoices-hub.tsx` — مركز إصدار وعرض المطالبات المالية الإيجارية المرتبطة بالعقود السارية محلياً عبر `invoiceRepo`.
- `features/financials/phase5-receipts-hub.tsx` — مركز تسجيل عمليات القبض وتخصيص الدفعات للفواتير غير المدفوعة أو المدفوعة جزئياً مع تحديث حالة الفاتورة آلياً في `receiptRepo`.
- **سند القبض العربي للطباعة (Mobile-First RTL Receipt Print View):** تصميم سند قبض مالي رسمي بـ Tailwind `@media print` مع تفاصيل المرجع، الفاتورة، وختم المكتب والمستأجر.
- `features/financials/phase5-expenses-hub.tsx` — مركز تسجيل المصروفات التشغيلية للعقارات والوحدات وتحديد المسؤولية المالية (`owner | office | shared`) عبر `expenseRepo`.
- `domain/financial-settlements.ts` — محرك حساب تسويات الملاك (Owner Settlement Engine) وفق نموذج إدارة الأملاك أو الاستئجار الرئيسي، ومحرك حساب أرباح المكتب التشغيلية.
- تحديث المسارات المالية في `routes/_protected.invoices.tsx`, `receipts.tsx`, `expenses.tsx`, `financials.tsx`.

### Phase 4 (PR #1027): Tenant and Contract Lifecycle
- `features/tenants/phase4-tenant-hub.tsx` و `features/contracts/phase4-contract-hub.tsx`.

---

## الحالة البنيوية الحالية

### نمط البيانات المعتمد (Phases 1–7)

```
domain/types.ts          ← Pure TS domain entities
store/mock-db-store.ts   ← Zustand store (localStorage persist)
services/mock-repos/     ← CRUD repositories
hooks/use-mock-repositories.ts ← UI hooks
features/*/              ← Pages
```

**مهم:** في Phases 1–7 الكود يعمل بـ mock data كاملة.

---

## الأولويات التالية (Phase 6)

**المهمة:** Roles and Audit Behavior — محاكاة الصلاحيات وسلوك التدقيق

### Phase 6 — المطلوب

1. **Settings Role Simulator** — محاكي صلاحيات مدمج للتبديل بين أدوار `ADMIN`, `MANAGER`, `USER`.
2. **UI RBAC Rules** — تطبيق قيود الصلاحيات على الأزرار والإجراءات الحساسة.
3. **Manager Approval Workflow** — طابور موافقات للمديرين للعمليات الحساسة كفسخ العقود.
4. **Frontend Audit Logger** — تسجيل حركات المستخدمين في `audit_logs`.

---

## قواعد التنفيذ

- اقرأ `AGENTS.md` أولاً دائماً
- تحقق من `main` الفعلي قبل الفرع
- حافظ على RTL + Arabic-first في كل component جديد

---

## بوابة التسليم النهائية

**Production GO لم يُعلَن بعد.** ينتظر اختبارات القبول المباشرة (B-1 إلى B-4).
