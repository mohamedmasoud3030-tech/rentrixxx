# ADR-008 — Unified Table and Entity Card System

**Status:** Accepted  
**Date:** 2026-06-27  
**Deciders:** Product Owner (Mohamed)

---

## Context

### المشكلة الحالية

التدقيق في الكود أظهر ثلاث مشكلات رئيسية في طبقة الـ UI:

#### 1. تعددية الجداول بدون توحيد

يوجد مكونان للجداول حالياً:
- `components/shared/DataTable.tsx` — مكون generic لكن **لا يستخدمه أحد** في الـ pages الفعلية
- `components/ui/table.tsx` — primitives خام (`Table`, `TableHeader`, `TableRow`, إلخ)

الـ 13 صفحة التي تعرض جداول تبني الجدول يدوياً من الـ primitives مباشرة في كل مرة:

| الصفحة | طريقة بناء الجدول |
|---|---|
| `people-list-page.tsx` | يدوي من primitives |
| `OwnersPage.tsx` | يدوي من primitives |
| `maintenance-page.tsx` | يدوي من primitives |
| `properties-list-page.tsx` | يدوي من primitives |
| `receipts-page.tsx` | يدوي من primitives |
| `units-list.tsx` | يدوي من primitives |
| `ContractTable.tsx` | يدوي من primitives |
| `contractPaymentsTab.tsx` | يدوي من primitives |
| `overdue-invoices-table.tsx` | يدوي من primitives |
| `CollectionsSection.tsx` | يدوي من primitives |
| `OverdueSection.tsx` | يدوي من primitives |
| `owner-detail-view.tsx` | يدوي من primitives |
| `audit-log-view.tsx` | يدوي من primitives |

**النتيجة:** كل جدول له spacing مختلف، responsive behavior مختلف، empty state مختلف، loading state مختلف.

#### 2. عدم اتساق عرض الأشخاص (بدائي وغير متقدم)

`PersonCard` (`components/ui/person-card.tsx`) يعرض الشخص كـ button بسيط مع أيقونة وبيانات. المشكلة:
- لا يوجد avatar / initials — فقط أيقونة generic
- لا يوجد تدرج بصري واضح بين المعلومات الأساسية والثانوية
- لا يوجد action buttons inline (تعديل/حذف) — يتطلب النقر للوصول إليهم
- التصميم لا يختلف بصرياً بين المستأجر والمالك وجهة الاتصال إلا بلون صغير

نفس المشكلة موجودة في:
- `OwnerCard` — لا يستخدم avatar
- `UnitCard` — عرض بسيط جداً
- `PropertyCard` — مقبول نسبياً

#### 3. عدم اتساق `ListPage` scaffold

`ListPage` (`components/layout/list-page.tsx`) موجود كـ wrapper موحد لكن فقط 3 صفحات تستخدمه:
- `properties-list-page.tsx` ✅
- `ContractsListPage.tsx` ✅
- `people-list-page.tsx` ✅

بينما `OwnersPage`, `maintenance-page`, `units-list`, وغيرها تبني scaffold الصفحة يدوياً.

---

## Decision

### القرار الرسمي

**نوحّد طبقة الـ UI بالكامل عبر ثلاث محاور:**

#### المحور الأول: `EntityTable` — مكون جدول موحد

إنشاء `components/shared/EntityTable.tsx` ليحل محل `DataTable.tsx` ويكون المكون الوحيد المسموح باستخدامه لبناء الجداول. يجب أن يتضمن:
- Column definitions بشكل declarative
- Built-in responsive: `hidden` classes على الأعمدة الثانوية في موبايل
- Built-in loading skeleton (عدد rows محدد)
- Built-in empty state slot
- Built-in `mobile-scroll-x` wrapper
- Consistent padding وspacing من `table.tsx` primitives
- دعم `onRowClick` اختياري لجعل الصف كله قابلاً للنقر

**ملاحظة:** `DataTable.tsx` الحالي يُحذف لأنه غير مستخدم ويسبب إرباكاً.

#### المحور الثاني: `EntityCard` — مكون بطاقة شخص/كيان موحد ومتقدم

إنشاء `components/ui/entity-card.tsx` كمكون موحد وراقٍ بصرياً يستبدل `PersonCard` و`OwnerCard` بتصميم أفضل:
- **Avatar دائري** مع أحرف الاسم الأولى (مثل: "م.أ" للاسم محمد أحمد) وخلفية ملونة حسب النوع
- **تدرج بصري واضح:** اسم كبير > نوع كـ badge > بيانات تواصل صغيرة
- **Actions مدمجة:** أزرار تعديل/حذف/عرض تظهر على hover أو دائمة حسب السياق
- **Props موحدة** تقبل أي كيان (شخص، مالك، وحدة، عقار) عبر interface محدد

#### المحور الثالث: إلزامية `ListPage`

`ListPage` يصبح **إلزامياً** لكل صفحة قائمة. الصفحات التي لا تستخدمه تُعاد كتابتها تدريجياً.

---

## Scope وترتيب التنفيذ

### المرحلة الأولى (الأهم)
1. بناء `EntityTable` الجديد مع الـ features الكاملة
2. إزالة `DataTable.tsx` (مكون ميت بدون استخدام)
3. تحويل أول 3 صفحات للاستخدام: `people-list-page`, `maintenance-page`, `receipts-page`

### المرحلة الثانية
4. بناء `EntityCard` المطوّر مع avatar + actions
5. تحديث `PeopleListPage` و`OwnersPage` لاستخدامه
6. تحويل باقي الصفحات لـ `EntityTable`

### المرحلة الثالثة
7. إلزام `ListPage` في الصفحات المتبقية
8. توثيق component API في `docs/ai/UI_COMPONENT_GUIDE.md`

---

## ما لا يتغير (Out of Scope)

- لا تغيير في أي data logic أو service layer
- لا تغيير في Supabase queries أو schemas
- `components/ui/table.tsx` primitives تبقى كما هي (أساس `EntityTable`)
- `contract-card.tsx`, `unit-card.tsx`, `property-card.tsx`, `receipt-card.tsx` تبقى لأنها سياقات مختلفة
- اللغة العربية والـ RTL تبقى first-class في كل مكون جديد

---

## Consequences

### إيجابي
- تعديل شكل الجدول في مكان واحد يؤثر على كل الصفحات
- loading/empty states موحدة بصرياً عبر التطبيق
- عرض الأشخاص يصبح احترافياً ومتقدماً
- جديد المطورين يعرف مكون واحد فقط للجدول

### سلبي (مقبول)
- تكلفة تحويل الصفحات القائمة (تُفعل تدريجياً)
- `EntityCard` API يحتاج تصميم دقيق لاستيعاب أنواع مختلفة

---

## مرجع تقني

**الملفات المتأثرة بالحذف:**
- `rentrix-app/src/components/shared/DataTable.tsx` — يُحذف

**الملفات الجديدة:**
- `rentrix-app/src/components/shared/EntityTable.tsx`
- `rentrix-app/src/components/ui/entity-card.tsx`
- `docs/ai/UI_COMPONENT_GUIDE.md`

**الملفات التي تُحوَّل:**
- جميع الـ 13 صفحة المذكورة في قسم Context
