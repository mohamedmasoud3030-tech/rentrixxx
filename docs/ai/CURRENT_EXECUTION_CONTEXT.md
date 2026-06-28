# Current Execution Context

**آخر تحديث:** 2026-06-29 — تدقيق شامل مطابقة كود/وثائق  
**حالة التحقق:** مطابق للكود الفعلي في `main` (SHA: 857d3b6)

---

## الحالة الفعلية للمراحل

| المرحلة | الوصف | الحالة |
|---|---|---|
| Phase 0 | Runtime truth audit | ✅ مكتملة |
| Phase 1 | Domain Foundation — TypeScript types + i18n keys | ✅ مكتملة (PR #1013) |
| Phase 2 | Local Data Foundation — mock repos + Zustand store | ✅ مكتملة (PR #1021) |
| Phase 3 | Owner Hub — Owner onboarding + Agreement forms | ✅ مكتملة (PRs #1022، #1023، #1024) |
| Phase 3.5 | EntityCard — unified entity card (ADR-008 Phase B) | ✅ مكتملة (PR #1025) |
| Phase 4 | Tenant and Contract Lifecycle | 🔜 التالية |
| Phase 5 | Financial Workflows | 📋 مخططة |
| Phase 6 | Roles and Audit Behavior | 📋 مخططة |
| Phase 7 | Reports, Print/Export, Tests, CI | 📋 مخططة |
| Phase 8 | Supabase Integration (live) | ⏸️ مؤجلة — قرار مالك |
| Phase 9 | Secondary Module Hardening | 📋 Backlog |

---

## ما أُنجز حديثاً (Phase 3 — PRs #1021–#1025)

### Phase 2 (PR #1021): Local Data Foundation
- `services/mock-repos/` — مستودعات محلية كاملة: owner, property, unit, tenant, contract, invoice, receipt, expense, agreement
- `store/mock-db-store.ts` — Zustand store مع persist (localStorage) وبيانات seed
- `hooks/use-mock-repositories.ts` — hooks موحدة للتفاعل مع المستودعات
- نمط `useMockOwners()`, `useMockProperties()`, `useMockContracts()` إلخ

### Phase 3 (PRs #1022–#1024): Owner Hub
- `features/owners/phase3-owner-hub.tsx` — Arabic Owner Hub كامل
- نماذج إضافة عقد مالك (owner agreement form)
- نموذج إدارة عقارات المالك (property onboarding)
- Route: `routes/_protected.owners.tsx` — Owner Hub كـ tab مدمج
- اختبارات: `phase3-owner-hub.test.tsx`

### Phase 3.5 (PR #1025): EntityCard Unified
- `components/ui/entity-card.tsx` — EntityCard موحد مع:
  - دعم أنواع: `tenant | owner | contact | string`
  - avatar دائري بأول حرفين عربي
  - `entityCardTypeMap` للألوان والأيقونات
  - `entityCardContactMeta` helper للـ phone/email
- استُبدل `OwnerCard` و`PersonCard` بـ `EntityCard` في:
  - `features/owners/OwnersPage.tsx`
  - `features/owners/phase3-owner-hub.tsx`
  - `features/people/people-list-page.tsx`
- تحديث `components/ui/index.ts` — EntityCard مصدَّر رسمياً

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
| `EntityCard` | `components/ui/entity-card.tsx` | ✅ موجود ومصدَّر (PR #1025) |
| `ListPage` | `components/layout/list-page.tsx` | ✅ موجود — معتمد جزئياً |
| `DataTable` | — | ✅ محذوف (لم يعد موجوداً) |
| `layouts/` shims | — | ✅ محذوف (لم يعد موجوداً) |

### ملفات domain الجديدة

```
rentrix-app/src/domain/
├── types.ts         ← Pure TS interfaces (Owner, Property, Unit, Tenant, LeaseContract, ...)
├── validators.ts    ← Zod schemas للـ domain types
└── i18n.ts          ← Arabic translation keys
```

**تنبه:** `types/domain.ts` (Supabase-generated) لا يزال موجوداً للـ features التي تستخدم Supabase مباشرة. لا تخلط بين `domain/types.ts` (pure frontend) و `types/domain.ts` (Supabase types).

---

## الأولويات التالية (Phase 4)

**المهمة:** Tenant and Contract Lifecycle — بناء على pattern المستودعات الموجودة

### Phase 4 — المطلوب

1. **Tenant CRUD mock** — نماذج إضافة/تعديل/أرشفة مستأجر عبر mock repos
2. **Contract create flow** — نموذج عقد جديد (unit + tenant + agreement + dates + amount)
3. **Contract lifecycle** — تنشيط / إنهاء / انتهاء مدة العقد
4. **ContractsListPage** — تحديث لاستخدام `useMockContracts()` + `EntityTable` + `EntityCard`
5. **TenantsPage** — تحديث لاستخدام mock repos + EntityCard

### Phase 4 — القيود

- لا تضف Supabase calls جديدة — كل شيء عبر mock repos
- لا تكسر `contractSchema.ts` الموجودة (Zod)
- الـ domain invariants من `AGENTS.md` §Domain invariants ملزمة
- العقد يرتبط بـ unit واحد + tenant واحد فقط، لا تداخل زمني

---

## مصادر الحقيقة المعتمدة

بهذا الترتيب:

1. الكود الفعلي في `main` + migrations
2. `docs/ai/CURRENT_EXECUTION_CONTEXT.md` (هذا الملف)
3. `domain/types.ts` — عقود الـ domain
4. `types/database.ts` — عقود Supabase
5. الوثائق الأخرى (تُراجع عند التعارض مع الكود)

---

## قواعد التنفيذ

- اقرأ `AGENTS.md` أولاً دائماً
- تحقق من `main` الفعلي قبل الفرع
- لا تُرجع `useApp`, `AppContext`, `dataService`, `react-router-dom`
- لا تستخدم `types/domain.ts` (Supabase) في الـ mock layer — استخدم `domain/types.ts`
- لا تنشئ Supabase calls جديدة في Phases 1–7
- حافظ على RTL + Arabic-first في كل component جديد

---

## بوابة التسليم النهائية

**Production GO لم يُعلَن بعد.** ينتظر:

- B-1: Browser QA مع ADMIN مصادق (RTL، mobile، receipt print)
- B-2: Invoice → Payment → Receipt → Refresh فعلي live
- B-3: Mobile/physical-device print
- B-4: RLS write confirmation live

راجع `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` للتفاصيل.
