# Rentrix Codebase Audit — 2026-06-29

**النوع:** تدقيق شامل مطابقة كود/وثائق — ما بعد PRs #1021–#1025  
**SHA المرجعي:** 857d3b6 (HEAD/main)  
**الحالة:** مرجع نشط — يحل محل `CODEBASE_AUDIT_2026-06-27.md` (مؤرشف)

---

## 1. ملخص التنفيذ الفعلي

### ما تحقق منذ الـ audit السابق

| PR | الوصف | الحالة |
|---|---|---|
| #1013 | Phase 1 — Domain Foundation | ✅ مدموج |
| #1021 | Phase 2 — Local Data Foundation (mock repos + Zustand) | ✅ مدموج |
| #1022 | Phase 3 — Arabic Owner Hub + mock repo expansion | ✅ مدموج |
| #1023 | Phase 3 — Owner Agreement Form | ✅ مدموج |
| #1024 | Phase 3 — Property Onboarding Form | ✅ مدموج |
| #1025 | Phase 3.5 — EntityCard موحد (ADR-008 Phase B) | ✅ مدموج |

---

## 2. خريطة الطبقات الكاملة (2026-06-29)

```
rentrix-app/src/
├── app/               — bootstrapping + dashboard + login + router
├── components/
│   ├── layout/        — AppShell, ListPage, PageLayout, PageHeader, EntityDetailHeader
│   ├── shared/        — FormActions فقط (DataTable محذوف ✅)
│   └── ui/            — primitives + EntityTable + EntityCard (موحدان)
├── domain/            — [جديد] Pure TS domain types + validators + i18n
│   ├── types.ts       — Owner, Property, Unit, Tenant, LeaseContract, ...
│   ├── validators.ts  — Zod schemas للـ domain
│   └── i18n.ts        — Arabic keys
├── features/          — domain modules (17+ feature)
├── hooks/
│   ├── use-auth.tsx   — global auth hook
│   ├── use-mock-repositories.ts  — [جديد] hooks للـ mock data layer
│   └── useDebounce.ts
├── layouts/           — ✅ محذوف (لم يعد موجوداً)
├── lib/               — formatters، supabase client، i18n، utils
├── routes/            — TanStack Router file-based routes
├── services/
│   ├── documents/     — DocumentEngine، DocumentController، ...
│   ├── mock-repos/    — [جديد] CRUD repositories (base + per-entity)
│   │   ├── base.ts
│   │   ├── owner-repo.ts, property-repo.ts, unit-repo.ts
│   │   ├── tenant-repo.ts, contract-repo.ts
│   │   ├── invoice-repo.ts, receipt-repo.ts, expense-repo.ts
│   │   ├── agreement-repo.ts
│   │   └── index.ts
│   ├── auth-service.ts
│   └── pdfService.ts
├── store/
│   ├── ui-store.ts
│   └── mock-db-store.ts  — [جديد] Zustand store مع localStorage persist
└── types/
    ├── database.ts    — Supabase-generated types
    └── domain.ts      — Supabase-mapped types (للـ features القديمة)
```

---

## 3. تدقيق المكونات (2026-06-29)

### 3.1 مكونات الجداول

| المكون | الموقع | الحالة |
|---|---|---|
| `DataTable` | — | ✅ محذوف نهائياً (PR #1025) |
| `Table` primitives | `components/ui/table.tsx` | ✅ سليم — أساس لكل الجداول |
| `EntityTable` | `components/ui/entity-table.tsx` | ✅ موجود ومصدَّر |

**ملاحظة:** الـ 13 جدول يدوي لا يزال بعضها موجوداً. التحويل الكامل لـ EntityTable هو Phase 4+ scope.

### 3.2 مكونات البطاقات

| المكون | الموقع | الحالة |
|---|---|---|
| `PersonCard` | — | ✅ محذوف (PR #1025) — استُبدل بـ EntityCard |
| `OwnerCard` | — | ✅ محذوف (PR #1025) — استُبدل بـ EntityCard |
| `EntityCard` | `components/ui/entity-card.tsx` | ✅ موجود ومصدَّر ومُستخدَم |
| `PropertyCard` | `components/ui/property-card.tsx` | ✅ يبقى (سياق مختلف) |
| `UnitCard` | `components/ui/unit-card.tsx` | ✅ يبقى |
| `ContractCard` | `components/ui/contract-card.tsx` | ✅ يبقى |
| `ReceiptCard` | `components/ui/receipt-card.tsx` | ✅ يبقى |

### 3.3 EntityCard — مواصفات التنفيذ الفعلي

```typescript
// entityCardTypeMap — الأنواع المدعومة:
{
  tenant: { label: 'مستأجر', bg: 'bg-primary/10', text: 'text-primary', icon: User }
  owner:  { label: 'مالك', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Briefcase }
  contact: { label: 'جهة اتصال', bg: 'bg-slate-100', text: 'text-slate-600', icon: Contact }
}

// entityCardContactMeta — helper لـ phone/email meta items

// EntityCardProps:
{
  id, name, subtitle?, supportingText?, type?, badge?, meta?, stats?, actions?, onClick?, className?, avatarIcon?
}
```

الصفحات التي تستخدم EntityCard بعد PR #1025:
- `features/owners/OwnersPage.tsx` ✅
- `features/owners/phase3-owner-hub.tsx` ✅
- `features/people/people-list-page.tsx` ✅

### 3.4 `components/ui/index.ts` — الحالة الحالية

الملفات الموجودة **وغير مُصدَّرة** من barrel index:
```
bottom-sheet          ← يُستخدم لكن غير مُصدَّر
responsive-form-overlay ← غير مُصدَّر
file-attachment-field   ← غير مُصدَّر
entity-actions          ← غير مُصدَّر
entity-cell             ← يُستخدم كثيراً بـ direct import
section-tabs            ← يُستخدم في financials
```

الأولوية: متوسطة — لا تسبب bug لكن تُربك الـ agents.

---

## 4. تدقيق طبقة البيانات الجديدة

### 4.1 Mock Data Architecture (Phase 2–3)

```
domain/types.ts → pure interfaces
       ↓
store/mock-db-store.ts → Zustand + localStorage persist + seed data
       ↓
services/mock-repos/ → CRUD repositories (base pattern)
       ↓
hooks/use-mock-repositories.ts → useQuery-like hooks
       ↓
features/owners/phase3-owner-hub.tsx → UI (مثال التطبيق الكامل)
```

**نقطة مهمة:** معظم الـ features الأخرى (contracts, financials, properties...) لا تزال تستخدم Supabase مباشرة عبر `types/domain.ts`. فقط `phase3-owner-hub.tsx` يستخدم المسار الجديد كاملاً.

### 4.2 تضارب النوعين — تحذير

| المسار | المصدر | يُستخدم في |
|---|---|---|
| `domain/types.ts` | Pure TS (Phase 1) | mock-repos, phase3-owner-hub, mock-db-store |
| `types/domain.ts` | Supabase-mapped | app-shell, pdfService, features/units, features/financials, ... |

**القاعدة:** لا تخلط النوعين. الـ mock layer يستخدم `domain/types.ts` فقط.

### 4.3 Mock Repos — القواعد والنمط

```typescript
// base.ts — النمط الأساسي
class BaseRepo<T extends { id: string }> {
  create(data: Omit<T, 'id' | 'createdAt'>): T
  update(id: string, data: Partial<T>): T | null
  delete(id: string): boolean
  findById(id: string): T | undefined
  findAll(): T[]
}
```

الـ repos الموجودة: owner, property, unit, tenant, contract, invoice, receipt, expense, agreement

---

## 5. تدقيق الديون التقنية (2026-06-29)

| الأولوية | الدين | النوع | الخطر |
|---|---|---|---|
| 🔴 1 | **date bug: `toISOString()` في `DocumentEngine.ts:28`** | Bug | تاريخ خاطئ بيوم لمستخدمي UTC+2/+4 |
| 🟠 2 | **`pdfService.ts` يحتوي على `exportTrialBalanceToPdf` + `exportBalanceSheetToPdf`** | Dead code | out-of-scope لكن لا يُستخدم من أي مكان |
| 🟠 3 | **6 مكونات UI غير مُصدَّرة من `index.ts`** | Code debt | imports مباشرة بطول المسار |
| 🟠 4 | **`ListPage` لم يُعتمد في 7 صفحات** | Architecture debt | inconsistency |
| 🟡 5 | **Hook naming: kebab vs camelCase** (use-people vs useOwners) | Code debt | يُربك الـ agents |
| 🟡 6 | **لا Zod schemas لـ lands/leads/commissions/communication/maintenance في `domain/`** | Test debt | لا validation |
| 🟢 7 | **معظم features لا تزال تستخدم Supabase مباشرة** | Architecture debt | Phase 8 integration debt |

**تم حل الديون السابقة:**
- ✅ `DataTable.tsx` ميت — محذوف
- ✅ `layouts/` shims — محذوفة
- ✅ `PersonCard`/`OwnerCard` بدائية — محذوفة واستُبدلت
- ✅ `lib/db` و`lib/api-client-react` — غير موجودين في active app (pnpm workspace يتجاهلهما)

---

## 6. أمان الكود (Security Audit)

### 6.1 RLS و Authentication
- Auth يمر عبر `hooks/use-auth.tsx` + `services/auth-service.ts` ✅
- `features/auth/route-guards.ts` + `permissions.ts` تحمي الـ routes ✅
- الـ mock layer لا يتجاوز RLS — يعمل محلياً فقط ✅

### 6.2 نقاط تحتاج انتباه
- **`mock-db-store.ts` يستخدم `localStorage`** — البيانات مرئية في DevTools. هذا متوقع ومقبول في Phases 1–7، لكن يجب عدم تخزين بيانات حساسة حقيقية فيه
- **`contractSchema.ts`** — الـ validation يضيف `T00:00:00Z` للتاريخ (صح) لكن `DocumentEngine.ts` لا يستخدم locale (bug مفتوح)

### 6.3 Environment Safety
- `lib/env.ts` يتحقق من المتغيرات البيئية ✅
- لا secrets في الكود ✅

---

## 7. اختبارات الكود

### 7.1 الحالة العامة

| الإحصائية | القيمة |
|---|---|
| ملفات الاختبار | 70 ملف |
| ملفات المصدر | 290 ملف |
| نسبة التغطية التقريبية | ~24% |

### 7.2 اختبارات Phase 3 الجديدة
- `features/owners/phase3-owner-hub.test.tsx` ✅
- `features/owners/owners-crm-bundle.test.tsx` ✅
- `store/mock-db-store.test.ts` ✅

### 7.3 فجوات الاختبار
- `services/mock-repos/` — لا اختبارات على الـ repos مباشرة (يُختبر عبر stores)
- `domain/validators.ts` — `validators.test.ts` موجود ✅
- `features/lands/`, `features/leads/`, `features/commissions/` — لا اختبارات

---

## 8. تسلسل الأولويات للمرحلة التالية

| الترتيب | المهمة | المرحلة |
|---|---|---|
| 1 | بناء Tenant CRUD flow عبر mock repos | Phase 4 |
| 2 | بناء Contract create/activate/terminate flow | Phase 4 |
| 3 | تحديث ContractsListPage لـ mock repos + EntityTable | Phase 4 |
| 4 | تحديث TenantsPage لـ mock repos + EntityCard | Phase 4 |
| 5 | إصلاح date bug في `DocumentEngine.ts:28` | Bug fix — أي مرحلة |
| 6 | حذف dead exports من `pdfService.ts` | Cleanup |
| 7 | إضافة 6 مكونات لـ `components/ui/index.ts` | Cleanup |
| 8 | توحيد hook naming إلى kebab-case | Cleanup |

---

## 9. مراجعة حالة الوثائق

| الوثيقة | الحالة بعد التدقيق |
|---|---|
| `docs/ai/CURRENT_EXECUTION_CONTEXT.md` | ✅ محدَّث (2026-06-29) |
| `QUICK_STATUS.md` | ✅ محدَّث (2026-06-29) |
| `AGENTS.md` | ✅ دقيق |
| `docs/ai/ONBOARDING.md` | ✅ دقيق في معظمه |
| `docs/ai/CODEBASE_AUDIT_2026-06-27.md` | 🗄️ مؤرشف في `docs/archive/` |
| `docs/decisions/README.md` | يحتاج إضافة ADR-009 (Mock Data Architecture) |

