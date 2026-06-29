# Current Execution Context

**آخر تحديث:** 2026-06-29 — إتمام المرحلة 4 (Tenant and Contract Lifecycle)  
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
| Phase 4 | Tenant and Contract Lifecycle | ✅ مكتملة |
| Phase 5 | Financial Workflows | 🔜 التالية |
| Phase 6 | Roles and Audit Behavior | 📋 مخططة |
| Phase 7 | Reports, Print/Export, Tests, CI | 📋 مخططة |
| Phase 8 | Supabase Integration (live) | ⏸️ مؤجلة — قرار مالك |
| Phase 9 | Secondary Module Hardening | 📋 Backlog |

---

## ما أُنجز حديثاً (Phase 4 — Tenant & Contract Lifecycle)

### Phase 4: Tenant and Contract Lifecycle
- `features/tenants/phase4-tenant-hub.tsx` — مركز إدارة المستأجرين محلياً مع التعديل والأرشفة المشروطة بعدم وجود عقود نشطة.
- `features/contracts/phase4-contract-hub.tsx` — مركز إدارة العقود محلياً مع معالج إنشاء عقد جديد وحجز الوحدة، وتجديد العقد وأرشفة القديم، وفسخ العقد وتحرير الوحدة.
- تحديث `tenantRepo` بإضافة `update` وتحديث `contractRepo` بإضافة `renew` و `terminate`.
- تحديث المسارات `routes/_protected.tenants.tsx` و `routes/_protected.contracts.tsx` لاعتماد المكونات المحلية الموحدة (`EntityCard` و `EntityTable`).

### Phase 3 (PRs #1022–#1024): Owner Hub
- `features/owners/phase3-owner-hub.tsx` — Arabic Owner Hub كامل
- نماذج إضافة عقد مالك (owner agreement form)
- نموذج إدارة عقارات المالك (property onboarding)
- Route: `routes/_protected.owners.tsx` — Owner Hub كـ tab مدمج

### Phase 3.5 (PR #1025): EntityCard Unified
- `components/ui/entity-card.tsx` — EntityCard موحد مصدَّر ومستخدم في كافة الصفحات.

---

## الحالة البنيوية الحالية

### نمط البيانات المعتمد (Phases 1–7)

```
domain/types.ts          ← Pure TS domain entities (Owner, Property, Unit, ...)
store/mock-db-store.ts   ← Zustand store (localStorage persist)
services/mock-repos/     ← CRUD repositories (base pattern + per-entity)
hooks/use-mock-repositories.ts ← useQuery-like hooks للـ UI
features/*/              ← Pages تستهلك mock hooks
```

**مهم:** في Phases 1–7 الكود يعمل بـ mock data كاملة. لا يوجد Supabase في الـ flow الرئيسي حالياً إلا في الـ auth فقط.

### مكونات UI الموحدة (ADR-008)

| المكون | الموقع | الحالة |
|---|---|---|
| `EntityTable` | `components/ui/entity-table.tsx` | ✅ موجود ومصدَّر |
| `EntityCard` | `components/ui/entity-card.tsx` | ✅ موجود ومصدَّر |
| `ListPage` | `components/layout/list-page.tsx` | ✅ موجود — معتمد جزئياً |

---

## الأولويات التالية (Phase 5)

**المهمة:** Financial Workflows — بناء على pattern المستودعات الموجودة

### Phase 5 — المطلوب

1. **Invoices Interface** — إنشاء وعرض المطالبات المالية محلياً في `invoiceRepo`.
2. **Record Payment & Allocation** — تسجيل السداد وتخصيص الدفعات للفواتير غير المدفوعة في `receiptRepo`.
3. **Mobile-First Receipt (RTL)** — تصميم سند القبض للطباعة والمشاركة بصيغة PDF.
4. **Expense Logger** — تسجيل المصروفات التشغيلية للعقارات والوحدات في `expenseRepo`.
5. **Owner Settlement Calculator** — حساب التسويات المالية للملاك بناءً على نموذج الاتفاقية (`property_management` أو `master_lease`).

### Phase 5 — القيود

- لا تضف Supabase calls جديدة — كل شيء عبر mock repos
- الـ domain invariants من `AGENTS.md` ملزمة (السند يُنشأ فقط من دفعة مسجلة، الدفعات غير قابلة للتعديل بل تُعكس وتستبدل).

---

## مصادر الحقيقة المعتمدة

بهذا الترتيب:

1. الكود الفعلي في `main` + migrations
2. `docs/ai/CURRENT_EXECUTION_CONTEXT.md` (هذا الملف)
3. `domain/types.ts` — عقود الـ domain
4. `types/database.ts` — عقود Supabase

---

## قواعد التنفيذ

- اقرأ `AGENTS.md` أولاً دائماً
- تحقق من `main` الفعلي قبل الفرع
- لا تُرجع `useApp`, `AppContext`, `dataService`, `react-router-dom`
- حافظ على RTL + Arabic-first في كل component جديد

---

## بوابة التسليم النهائية

**Production GO لم يُعلَن بعد.** ينتظر:

- B-1: Browser QA مع ADMIN مصادق (RTL، mobile، receipt print)
- B-2: Invoice → Payment → Receipt → Refresh فعلي live
- B-3: Mobile/physical-device print
- B-4: RLS write confirmation live

راجع `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` للتفاصيل.
