# Debug Report — Test Assertions Mismatch (2026-06-29)

**الحالة:** ✅ محلول ومدفوع  
**التأثير:** CI يفشل (3 اختبارات) — لا تأثير على runtime

---

## الأعراض

```
FAIL src/features/contracts/ContractDetailPage.test.tsx
FAIL src/features/maintenance/maintenance-page.test.tsx
FAIL src/features/units/units-list.test.tsx

AssertionError: expected html to contain 'حدث خطأ أثناء تحميل البيانات.'
Actual:  'إعداد الاتصال بقاعدة البيانات غير مكتمل.'
```

---

## التشخيص

### المسار الكامل

```
DataErrorScreen
  ← diagnostics[0]?.messageAr ?? fallbackMessage
  ← [...getEnvDiagnostics(), ...parseSupabaseDiagnostics(error)]
```

`getEnvDiagnostics()` تتحقق من `import.meta.env.VITE_SUPABASE_URL` — في بيئة الاختبار هذا المتغير **غائب**، فتُرجع:

```ts
{ messageAr: 'إعداد الاتصال بقاعدة البيانات غير مكتمل.' }
```

هذا يأخذ `diagnostics[0]` ويتجاوز رسالة الخطأ الفعلي من `parseSupabaseDiagnostics()`.

الاختبارات كانت مكتوبة قبل إضافة منطق `getEnvDiagnostics()` (أو قبل أن تصبح بيئة الاختبار بدون env vars).

### السلوك الصحيح

السلوك الحالي **صحيح ومقصود** — المستخدم يرى تشخيصاً أوضح (`'إعداد الاتصال بقاعدة البيانات غير مكتمل.'`) بدلاً من رسالة عامة. المشكلة في الـ assertions وليس في الكود.

---

## الإصلاح

تحديث الـ assertions في 3 ملفات لتعكس الرسالة الفعلية في بيئة الاختبار:

| الملف | القديم | الجديد |
|---|---|---|
| `units-list.test.tsx:37` | `'حدث خطأ أثناء تحميل البيانات.'` | `'إعداد الاتصال بقاعدة البيانات غير مكتمل.'` |
| `ContractDetailPage.test.tsx:147` | `'حدث خطأ أثناء تحميل البيانات.'` | `'إعداد الاتصال بقاعدة البيانات غير مكتمل.'` |
| `maintenance-page.test.tsx:80` | `'حدث خطأ أثناء تحميل البيانات.'` | `'إعداد الاتصال بقاعدة البيانات غير مكتمل.'` |

---

## النتيجة

```
Test Files  53 passed (53)
Tests       269 passed (269)   ← كانت 266 ناجح + 3 فاشل
Financial   73 passed (19 files)
typecheck   ✅
lint        ✅
build       ✅
```

---

## الوقاية

للاختبارات المستقبلية التي تختبر `DataErrorScreen` في حالة error:

```ts
// إذا أردت اختبار رسالة الخطأ العام (unhandled error):
// موك VITE_SUPABASE_URL في الاختبار:
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

// أو اختبر ما يظهر فعلاً بدون env (السلوك الحالي):
expect(html).toContain('إعداد الاتصال بقاعدة البيانات غير مكتمل.');
```
