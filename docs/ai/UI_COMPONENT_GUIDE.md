# دليل مكونات الـ UI — Rentrix

هذا الدليل هو المرجع الرسمي لمكونات الـ UI المشتركة. كل مكون له استخدام محدد. لا تُبنى جداول أو بطاقات كيانات بدون استخدام هذه المكونات.

---

## مكونات الجداول

### `EntityTable` ✅ المكون الرسمي للجداول

**الموقع:** `components/shared/EntityTable.tsx`  
**الاستخدام:** كل صفحة تعرض قائمة بيانات جدولية

```tsx
import { EntityTable } from '@/components/shared/EntityTable';

<EntityTable
  rows={people}
  keyOf={(p) => p.id}
  columns={[
    { key: 'name', header: 'الاسم', render: (p) => p.full_name },
    { key: 'phone', header: 'الهاتف', responsive: 'sm', render: (p) => p.phone ?? '—' },
    { key: 'actions', header: '', render: (p) => <ActionButtons id={p.id} /> },
  ]}
  loading={isLoading}
  skeletonRows={5}
  empty={<EmptyState title="لا يوجد أشخاص" />}
/>
```

**الـ Props:**

| Prop | النوع | الوصف |
|---|---|---|
| `rows` | `T[]` | البيانات |
| `keyOf` | `(row: T) => string` | مفتاح فريد لكل صف |
| `columns` | `Column<T>[]` | تعريف الأعمدة |
| `loading` | `boolean` | يظهر skeleton |
| `skeletonRows` | `number` | عدد صفوف الـ skeleton (default: 5) |
| `empty` | `ReactNode` | يظهر لما rows فارغة |
| `onRowClick` | `(row: T) => void` | يجعل الصف كله clickable |

**Column definition:**

```ts
type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  responsive?: 'sm' | 'md' | 'lg'; // يُخفي العمود تحت هذا الـ breakpoint
  className?: string;
};
```

**قاعدة:** إذا كنت تستخدم `<Table>` + `<TableHeader>` + `<TableBody>` مباشرة في صفحة — هذا خطأ. استخدم `EntityTable` بدلاً منه.

---

### `DataTable` ❌ محذوف

`components/shared/DataTable.tsx` تم حذفه. لم يكن يُستخدم في أي صفحة. استخدم `EntityTable`.

---

### `Table`, `TableHeader`, `TableBody`, إلخ

**الموقع:** `components/ui/table.tsx`  
**الاستخدام:** داخل `EntityTable` فقط — لا تستخدمها مباشرة في الصفحات.

---

## مكونات البطاقات

### `EntityCard` ✅ المكون الرسمي لعرض الأشخاص والكيانات

**الموقع:** `components/ui/entity-card.tsx`  
**الاستخدام:** عرض شخص أو مالك أو أي كيان في grid view على الموبايل

```tsx
import { EntityCard } from '@/components/ui/entity-card';

<EntityCard
  id={person.id}
  name={person.full_name}
  type="tenant"          // يحدد اللون والأيقونة
  meta={[
    { icon: Phone, value: person.phone },
    { icon: Mail, value: person.email },
  ]}
  actions={[
    { label: 'تعديل', onClick: () => openEdit(person.id) },
    { label: 'حذف', variant: 'danger', onClick: () => openDelete(person.id) },
  ]}
  onClick={() => openDetail(person.id)}
/>
```

**الـ Props:**

| Prop | النوع | الوصف |
|---|---|---|
| `id` | `string` | معرّف الكيان |
| `name` | `string` | الاسم الرئيسي (يُستخدم لتوليد الـ avatar) |
| `subtitle` | `string?` | نص ثانوي تحت الاسم |
| `type` | `string` | النوع — يحدد لون الـ avatar والـ badge |
| `badge` | `ReactNode?` | badge مخصص بدل الـ type الافتراضي |
| `meta` | `MetaItem[]?` | بيانات تواصل أو معلومات إضافية |
| `actions` | `Action[]?` | أزرار داخل البطاقة |
| `onClick` | `() => void?` | النقر على البطاقة كاملة |

**أنواع محددة مسبقاً:**

| النوع | اللون | التسمية |
|---|---|---|
| `tenant` | أزرق/بنفسجي | مستأجر |
| `owner` | أخضر | مالك |
| `contact` | رمادي | جهة اتصال |

---

### مكونات البطاقات السياقية (تبقى كما هي)

هذه المكونات لها سياق محدد وتبقى منفصلة:

| المكون | الاستخدام |
|---|---|
| `PropertyCard` | عرض عقار في grid |
| `UnitCard` | عرض وحدة في grid |
| `ContractCard` (في `contract-card.tsx`) | ملخص عقد في قائمة |
| `ReceiptCard` | ملخص إيصال في موبايل |

---

## scaffold الصفحات

### `ListPage` ✅ إلزامي لكل صفحة قائمة

**الموقع:** `components/layout/list-page.tsx`  
**الاستخدام:** Wrapper لكل صفحة تعرض قائمة مع بحث وفلاتر

```tsx
import { ListPage } from '@/components/layout/list-page';

<ListPage
  title="الأشخاص"
  description="جدول موحد للمستأجرين والملاك وجهات الاتصال"
  action={<Button onClick={openCreate}><Plus />إضافة</Button>}
  search={{ value: q, onChange: setQ, placeholder: "ابحث..." }}
  filters={<FilterTabs ... />}
>
  {/* mobile: EntityCard grid */}
  {/* desktop: EntityTable */}
</ListPage>
```

**قاعدة:** الصفحات التي لا تستخدم `ListPage` تُعتبر دَيناً تقنياً ويجب تحويلها.

---

## نمط الـ Dual View (موبايل + ديسكتوب)

الباترن الرسمي لكل صفحة قائمة:

```tsx
{/* موبايل: grid من EntityCard */}
<div className="grid gap-3 sm:grid-cols-2 md:hidden">
  {rows.map((row) => (
    <EntityCard key={row.id} ... />
  ))}
</div>

{/* ديسكتوب: EntityTable */}
<div className="hidden md:block">
  <EntityTable rows={rows} columns={columns} ... />
</div>
```

---

## حالة التبني الحالية

| الصفحة | ListPage | EntityTable | EntityCard | الملاحظة |
|---|---|---|---|---|
| `properties-list-page` | ✅ | ⏳ تحتاج تحويل | — | جدول manual |
| `people-list-page` | ✅ | ⏳ تحتاج تحويل | ✅ PersonCard | PersonCard → EntityCard |
| `ContractsListPage` | ✅ | ✅ ContractTable موحد | ✅ ContractCardList | مكتملة |
| `OwnersPage` | ❌ | ⏳ تحتاج تحويل | ⏳ | يحتاج ListPage |
| `maintenance-page` | ❌ | ⏳ تحتاج تحويل | — | يحتاج ListPage |
| `units-list` | ❌ | ⏳ تحتاج تحويل | ✅ UnitCard | يحتاج ListPage |
| `receipts-page` | — | ⏳ تحتاج تحويل | ✅ ReceiptCard | |
| `audit-log-view` | — | ⏳ تحتاج تحويل | — | |
| `lands-view` | — | ⏳ تحتاج تحويل | — | |
| `leads-view` | — | ⏳ تحتاج تحويل | — | |
| `commissions-view` | — | ⏳ تحتاج تحويل | — | |
| `reports/*` | — | ⏳ تحتاج تحويل | — | 4 جداول |

---

## قواعد لا تُكسر

1. **لا جداول يدوية في الصفحات** — كل جدول يستخدم `EntityTable`
2. **لا بطاقات شخص/مالك بدون `EntityCard`** — `PersonCard` و`OwnerCard` القديمة تُستبدل تدريجياً
3. **كل صفحة قائمة تستخدم `ListPage`** كـ wrapper
4. **الـ dual view pattern موحد** — موبايل card + ديسكتوب table في كل صفحة
5. **RTL أولاً** — كل مكون جديد يختبر في RTL قبل اعتماده
