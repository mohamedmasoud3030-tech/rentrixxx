# Architecture Overview

هذا المستند يشرح خريطة المشروع الحالية وكيف تتدفق البيانات بين الطبقات الرئيسية.

## Folder map (actual)

```text
src/
  app/              # application shells and route-level composition
  contexts/         # React Context providers for cross-cutting state
  hooks/            # reusable hooks (queries, mutations, UI behavior)
  services/         # I/O boundaries (Supabase/API/storage integrations)
  domain/           # business entities, rules, value objects, use-cases
  design-system/    # tokens, shared UI primitives, and component variants
```

> المرجع العملي: أي feature جديدة تمر غالبًا عبر hook -> service -> domain (validation/normalization) -> UI rendering.

## Data flow examples

### 1) Auth flow (Login)
1. شاشة تسجيل الدخول في `src/app` أو `src/components` تستدعي hook مثل `useAuth...`.
2. الـ hook يدير loading/error ويستدعي service في `src/services`.
3. service تنفذ طلب Supabase Auth وتعيد raw result.
4. domain layer (عند الحاجة) تطبق قواعد مثل التحقق من الدور/حالة الحساب.
5. contexts layer تحدّث حالة المستخدم الحالية ليستهلكها باقي التطبيق.

### 2) Finance flow (Transaction/Invoice)
1. UI يرسل action (إضافة/تعديل حركة مالية).
2. hook يبني payload واضح typed ويستدعي service مخصص للتمويل.
3. service تتواصل مع DB/API وتعيد record.
4. domain يطبق invariants (currency, amount sign, required references).
5. context أو query cache يتم تحديثه ثم تنعكس البيانات في جداول ولوحات المؤشرات.

## Layer responsibilities

- **contexts/**: state عالمي مشترك عبر الشاشات (session, tenant, preferences...).
- **hooks/**: orchestration محلي قابل لإعادة الاستخدام؛ لا يحتوي business rules معقدة.
- **services/**: مسؤول عن الاتصال الخارجي فقط، بدون UI concerns.
- **domain/**: المصدر الأساسي لقواعد العمل والتحقق من سلامة البيانات.
- **design-system/**: مكونات وتوكنز موحّدة لضمان تناسق الواجهة.

## File placement decision rules

عند إنشاء ملف جديد:

1. **هل الملف يتعامل مع API/DB مباشرة؟** ضعه في `src/services`.
2. **هل هو قاعدة عمل أو type/domain model؟** ضعه في `src/domain`.
3. **هل هو تنسيق state reusable مربوط بواجهة React؟** ضعه في `src/hooks`.
4. **هل هو state cross-feature؟** ضعه في `src/contexts`.
5. **هل هو UI primitive أو style token؟** ضعه في `src/design-system`.

إذا تداخلت المسؤوليات، افصل المنطق إلى أكثر من ملف بدل تحميل ملف واحد بكل الأدوار.
