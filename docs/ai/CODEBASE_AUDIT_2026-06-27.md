# Rentrix Codebase Audit — 2026-06-27

**النوع:** تدقيق شامل للمكونات والمحركات والديون التقنية  
**الحالة:** مرجع نشط — يُحدَّث مع كل مرحلة

---

## 1. خريطة الطبقات الكاملة

```
rentrix-app/src/
├── app/               — bootstrapping + dashboard + login + router
├── components/
│   ├── layout/        — AppShell, ListPage, PageLayout, PageHeader, EntityDetailHeader
│   ├── shared/        — DataTable (محذوف)، EntityTable (مخطط)
│   └── ui/            — primitives: Button, Card, Table, StatusBadge, إلخ
├── features/          — domain modules (17 feature)
├── hooks/             — useAuth، useDebounce (global shared hooks فقط)
├── layouts/           — re-export shims فقط (→ components/layout)
├── lib/               — formatters، supabase client، i18n، moneyNormalization، utils
├── routes/            — TanStack Router file-based routes
├── services/
│   ├── documents/     — DocumentEngine، DocumentController، TableGenerator، DocumentRenderer
│   └── pdfService.ts  — facade لـ documents engine
├── store/             — ui-store.ts (Zustand)
└── types/             — database.ts (Supabase-generated)، domain.ts
```

---

## 2. تدقيق المكونات

### 2.1 مكونات الجداول — الحالة الكاملة

| المكون | الموقع | الحالة | ملاحظة |
|---|---|---|---|
| `DataTable` | `components/shared/DataTable.tsx` | ❌ **ميت — يُحذف** | لا يستخدمه أحد |
| `Table` primitives | `components/ui/table.tsx` | ✅ سليم | أساس لكل الجداول |
| `EntityTable` | `components/shared/EntityTable.tsx` | 🔴 **غير موجود — يُبنى** | ADR-008 |

**الصفحات التي تبني جداول يدوياً (13 موقع — كل واحد مختلف):**

| الصفحة | الجدول | mobile-adapted؟ |
|---|---|---|
| `people-list-page.tsx` | يدوي + PersonCard | ✅ نعم |
| `OwnersPage.tsx` | يدوي + OwnerCard | ✅ نعم |
| `maintenance-page.tsx` | يدوي فقط | ⚠️ جزئي |
| `properties-list-page.tsx` | يدوي فقط | ⚠️ جزئي |
| `receipts-page.tsx` | يدوي + ReceiptCard | ✅ نعم |
| `units-list.tsx` | يدوي + UnitCard | ✅ نعم |
| `ContractTable.tsx` | يدوي — ContractCardList منفصل | ✅ نعم |
| `contractPaymentsTab.tsx` | يدوي — لا mobile card | ❌ لا |
| `overdue-invoices-table.tsx` | يدوي + hidden classes | ✅ نعم |
| `CollectionsSection.tsx` | يدوي + hidden classes | ✅ نعم |
| `OverdueSection.tsx` | يدوي + hidden classes | ✅ نعم |
| `owner-detail-view.tsx` | يدوي — لا mobile card | ❌ لا |
| `audit-log-view.tsx` | يدوي + hidden classes | ✅ جزئي |

### 2.2 مكونات البطاقات — الحالة الكاملة

| المكون | الموقع | الحالة | جودة التصميم |
|---|---|---|---|
| `PersonCard` | `components/ui/person-card.tsx` | ⚠️ **يُستبدل بـ EntityCard** | بدائي — لا avatar |
| `OwnerCard` | `components/ui/owner-card.tsx` | ⚠️ **يُستبدل بـ EntityCard** | بدائي — لا avatar |
| `EntityCard` | `components/ui/entity-card.tsx` | 🔴 **غير موجود — يُبنى** | ADR-008 |
| `PropertyCard` | `components/ui/property-card.tsx` | ✅ يبقى | سياق مختلف |
| `UnitCard` | `components/ui/unit-card.tsx` | ✅ يبقى | سياق مختلف |
| `ContractCard` | `components/ui/contract-card.tsx` | ✅ يبقى | سياق مختلف |
| `ReceiptCard` | `components/ui/receipt-card.tsx` | ✅ يبقى | سياق مختلف |

### 2.3 مكونات الـ scaffold

| المكون | الموقع | اعتُمد في | المتبقي |
|---|---|---|---|
| `ListPage` | `components/layout/list-page.tsx` | properties، contracts، people | owners، maintenance، units، lands، leads، commissions، reports |
| `PageLayout` | `components/layout/page-layout.tsx` | ✅ عام | — |
| `PageHeader` | `components/layout/page-header.tsx` | ✅ عام | — |
| `EntityDetailHeader` | `components/layout/entity-detail-header.tsx` | ✅ صفحات التفاصيل | — |

### 2.4 مكونات مفقودة من `components/ui/index.ts`

الملفات موجودة لكن غير مُصدَّرة من barrel index:

```
entity-cell         ← يُستخدم كثيراً لكن يستورد مباشرة
person-card         ← يُستخدم في people-list
owner-card          ← يُستخدم في OwnersPage
property-card       ← يُستخدم في properties
unit-card           ← يُستخدم في units
contract-card       ← يُستخدم في contracts
receipt-card        ← يُستخدم في receipts
section-tabs        ← يُستخدم في financials
bottom-sheet        ← يُستخدم لكن غير مُصدَّر
responsive-form-overlay
file-attachment-field
```

---

## 3. تدقيق المحركات (Engines & Services)

### 3.1 محرك الوثائق والـ PDF ✅ موجود وسليم

```
services/documents/
├── types.ts              — UnifiedDocumentModel, DocumentHeader, DocumentTable
├── DocumentEngine.ts     — يحوّل domain data → UnifiedDocumentModel
├── TableGenerator.ts     — يبني جداول الوثائق
├── DocumentController.ts — يستدعي jsPDF ويطبع
├── DocumentRenderer.ts   — rendering layer
└── index.ts              — يصدّر DocumentController + types

services/pdfService.ts    — facade: exportInvoiceToPdf, exportContractToPdf, إلخ
```

**المستخدمون:**
- `invoice-workspace-section.tsx` → `exportInvoiceToPdf`
- `expenses-section.tsx` → `exportExpenseToPdf`
- `ContractDetailPage.tsx` → `exportContractToPdf`

**مشاكل موجودة:**
- `DocumentEngine.ts:28` — `value.toISOString()` بدون locale (date bug)
- `pdfService.ts` يحتوي على `exportTrialBalanceToPdf`, `exportBalanceSheetToPdf` — وهذه OUT OF SCOPE (general ledger) لكن الكود موجود

### 3.2 محرك البيانات — React Query + Supabase ✅ سليم

النمط الموحد: `service.ts` → `useXxx.ts` → component

```
feature/
├── xxx-service.ts    — Supabase queries مباشرة
├── useXxx.ts         — React Query wrappers (useQuery, useMutation)
└── xxx-page.tsx      — component يستهلك الـ hook
```

**اتساق التسمية — مشكلة:** نصف الـ hooks بـ `use-kebab-case.ts` والنصف الآخر `useCamelCase.ts`:

| النمط الجديد (kebab) | النمط القديم (camelCase) |
|---|---|
| `use-people.ts` | `useOwners.ts` |
| `use-maintenance.ts` | `useContracts.ts` |
| `use-lands.ts` | `useExpenses.ts` |
| `use-commissions.ts` | `useInvoices.ts` |

**القرار:** كلاهما يعمل. التوحيد إلى kebab يصير في مرحلة cleanup مستقلة.

### 3.3 محرك الـ Auth ✅ سليم

```
hooks/use-auth.tsx          — useAuth hook (Supabase session + permissions)
services/auth-service.ts    — login/logout/password-change
features/auth/permissions.ts — AuthorizationContext، requirePermission
```

### 3.4 Zustand Store ✅ سليم (بسيط ومحدود)

```
store/ui-store.ts — sidebarCollapsed، theme، syncStatus، lastSyncedAt
```

يُستخدم فقط في `app-shell.tsx` و`settings-page.tsx`.

### 3.5 الـ document layer محرك ميت في workspace

```
lib/db/             — Drizzle ORM — ❌ لا يستورده أحد
lib/api-client-react/ — HTTP client — ❌ لا يستورده أحد
```

هذان المجلدان موجودان في `pnpm-workspace.yaml` لكن لا أي import من الـ app. **قرار: يُحذفان** بعد تأكيد `pnpm build` يعمل بدونهما.

---

## 4. تدقيق الديون التقنية — مُرتَّب حسب الأولوية

| الأولوية | Priority Score | الدين | النوع | الخطر لو ما اتصلح |
|---|---|---|---|---|
| 🔴 1 | 40 | **`DataTable.tsx` ميت موجود ويُربك** | Code debt | تضليل الـ agents — يبنون عليه بدل EntityTable |
| 🔴 2 | 36 | **`layouts/` شيم فقط — routes تستورد منه** | Architecture debt | لو اتمسح يتكسر app-shell وauth layout |
| 🔴 3 | 35 | **`lib/db` و`lib/api-client-react` أوركفانز** | Code debt | يزيد build size، يُربك agents |
| 🟠 4 | 30 | **date bug: `toISOString()` في contractSchema + DocumentEngine** | Code debt | خطأ تاريخ للمستخدمين UTC+2/+4 |
| 🟠 5 | 28 | **13 جدول يدوي بدون توحيد** | Architecture debt | inconsistency بصري، صعوبة تعديل |
| 🟠 6 | 25 | **PersonCard/OwnerCard تصميم بدائي** | Code debt | تجربة مستخدم ضعيفة |
| 🟡 7 | 20 | **`ListPage` مش معتمد في 7 صفحات** | Architecture debt | inconsistency في scaffold |
| 🟡 8 | 18 | **11 مكون UI مش في `index.ts`** | Code debt | imports مباشرة بطول المسار |
| 🟡 9 | 15 | **Hook naming: kebab vs camelCase** | Code debt | confusing للـ agents |
| 🟡 10 | 12 | **لا zod schemas لـ lands/leads/commissions/communication/maintenance** | Test debt | لا validation على forms هذه الصفحات |
| 🟢 11 | 10 | **`contractPaymentsTab` لا mobile card** | Code debt | سوء UX موبايل في صفحة العقد |
| 🟢 12 | 8 | **`pdfService.ts` يحتوي exports OUT OF SCOPE** | Architecture debt | dead code (trial balance, balance sheet) |

**Priority Score = (Impact + Risk) × (6 - Effort)**

---

## 5. الـ Missing Components المطلوب بناؤهم

### المستوى الأول — مطلوبون الآن (ADR-008)

#### `EntityTable` — مكون الجدول الموحد
```
components/shared/EntityTable.tsx

Props:
  rows: T[]
  keyOf: (row: T) => string
  columns: Column<T>[]         — { key, header, render, responsive?, className? }
  loading?: boolean             — skeleton rows
  skeletonRows?: number         — default 5
  empty?: ReactNode             — empty state slot
  onRowClick?: (row: T) => void — يجعل كل صف clickable

Features:
  - auto scroll wrapper (mobile-scroll-x)
  - consistent padding من table.tsx primitives
  - loading skeleton بعدد skeletonRows
  - responsive column hiding: responsive='sm' يخفي تحت sm
  - empty state مدمج
  - RTL-first
```

#### `EntityCard` — مكون البطاقة الموحد
```
components/ui/entity-card.tsx

Props:
  id: string
  name: string                  — يُستخدم لتوليد الـ avatar (أول حرفين)
  subtitle?: string
  type: 'tenant'|'owner'|'contact'|string
  badge?: ReactNode             — بدل type badge الافتراضي
  meta?: MetaItem[]             — [{ icon, value }]
  actions?: Action[]            — [{ label, onClick, variant? }]
  onClick?: () => void          — النقر على البطاقة

Design:
  - Avatar دائري مع أول حرفين بالعربي
  - خلفية ملونة حسب النوع: tenant=أزرق، owner=أخضر، contact=رمادي
  - تدرج بصري: name كبير > badge > meta صغير
  - Actions: أزرار صغيرة في أسفل البطاقة
  - hover state واضح
  - RTL-first
```

### المستوى الثاني — مطلوبون لاحقاً

#### Zod Schemas المفقودة
```
features/lands/land-schema.ts
features/leads/lead-schema.ts
features/commissions/commission-schema.ts
features/communication/communication-schema.ts
features/maintenance/maintenance-schema.ts
```

---

## 6. مراجعة حالة الوثائق الحالية

### 6.1 وثائق لا تزال دقيقة ✅

| الوثيقة | الحالة |
|---|---|
| `docs/RENTRIX_MASTER_PLAN.md` | ✅ محدثة — ADR-008 مضاف |
| `docs/ai/CURRENT_EXECUTION_CONTEXT.md` | ✅ محدثة — UI phase مضاف |
| `docs/decisions/README.md` | ✅ محدثة — ADR-008 مسجل |
| `docs/ai/UI_COMPONENT_GUIDE.md` | ✅ جديدة |
| `docs/decisions/ADR-008-unified-ui-components.md` | ✅ جديدة |
| `docs/ai/SECURE_OPERATOR_RUNBOOK.md` | ✅ سليمة |
| `docs/ai/GIT_TOOLING_POLICY.md` | ✅ سليمة |
| `docs/ai/domain-rules.md` | ✅ سليمة |
| `docs/ai/engineering-policy.md` | ✅ سليمة |
| `docs/ai/PRINT_AND_EXPORT_READINESS.md` | ✅ سليمة |

### 6.2 وثائق تحتاج تحديث 🔴

| الوثيقة | المشكلة |
|---|---|
| `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` | تقول "25 test files" — الواقع 62 ملف |
| `docs/ai/V05_COMMERCIAL_HARDENING_PREP.md` | لا تذكر UI Consistency Phase |
| `docs/FIRST_CLIENT_DELIVERY_PLAN.md` | لا تذكر UI Consistency Phase |

### 6.3 وثائق قابلة للحذف 🗑️

لا يوجد حالياً وثائق يجب حذفها — كل الموجود له غرض نشط.

---

## 7. حالة الـ `layouts/` folder (دين معماري)

```
layouts/app-shell.tsx    → export { AppShell } from '@/components/layout/app-shell'
layouts/auth-layout.tsx  → export { AuthLayout } from '@/components/layout/auth-layout'
```

هذه الملفات shims فقط — موجودة لأن:
- `routes/_protected.tsx` يستورد من `@/layouts/app-shell`
- `routes/_auth.tsx` يستورد من `@/layouts/auth-layout`

**الإصلاح:** تحديث الـ routes لتستورد من `@/components/layout/` مباشرة ثم حذف `layouts/`.

---

## 8. ملخص ما يُبنى بالترتيب

### الأولويات الفعلية (مرتبة):

| الترتيب | المهمة | النوع | الأثر |
|---|---|---|---|
| 1 | حذف `DataTable.tsx` + `layouts/` shims + `lib/db` + `lib/api-client-react` | Cleanup | يزيل confusion من الـ agents |
| 2 | بناء `EntityTable` + تحويل أول 3 صفحات | Feature | توحيد الجداول يبدأ |
| 3 | بناء `EntityCard` + تحديث people + owners | Feature | تحسين UX فوري |
| 4 | إضافة 11 مكون لـ `components/ui/index.ts` | Cleanup | imports نظيفة |
| 5 | تحويل باقي 10 صفحات لـ EntityTable + ListPage | Migration | اكتمال ADR-008 |
| 6 | إصلاح date bug في contractSchema + DocumentEngine | Bug fix | دقة تواريخ |
| 7 | إصلاح `routes/` imports من `layouts/` | Cleanup | حذف shims |
| 8 | Zod schemas لـ lands/leads/commissions/communication/maintenance | Quality | validation |
| 9 | توحيد hook naming إلى kebab-case | Cleanup | consistency |
| 10 | حذف dead exports من `pdfService.ts` | Cleanup | less confusion |
