# Testing Strategy

## Scope
الاختبارات المطلوبة محليًا وداخل CI لضمان عدم كسر auth/finance flows والبناء.

## Local test commands

1. تثبيت الاعتماديات:

```bash
npm install --legacy-peer-deps
```

2. فحص الأنواع:

```bash
npm run typecheck
```

3. تشغيل الاختبارات مرة واحدة:

```bash
npm run test
```

4. تشغيل build verification:

```bash
npm run build
```

## CI test path (GitHub Actions)

مطابق لما هو موجود في `.github/workflows/ci.yml` و `supabase-control-plane-ci.yml`:

1. Setup Node 22.x
2. `npm install --legacy-peer-deps`
3. `npm run typecheck`
4. `npm run test -- --run` (ضمن Job البناء)
5. `npm run build`

## Minimum gate before merge

- TypeScript typecheck يمر.
- Unit/integration tests (Vitest) تمر.
- Production build ينجح ويولّد `dist/`.

## Common pitfalls

### Auth flows
- نسيان إعادة تهيئة session state بعد login/logout يؤدي لواجهات stale.
- الاعتماد على role من local cache بدل القيمة المحدثة من backend.
- عدم توحيد رسائل الأخطاء بين service وUI يؤدي لتجربة استخدام مربكة.

### Finance flows
- حفظ `amount` بدون قاعدة واضحة للإشارة (debit/credit) يسبب تقارير خاطئة.
- التقريب العشري غير الموحد قبل التخزين/العرض ينتج فروقات مالية.
- تحديث الجداول دون invalidation/query refresh يترك dashboard بقيم قديمة.
