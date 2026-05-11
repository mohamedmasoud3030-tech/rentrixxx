# Fallback Review Workflow (File-by-File)

هذا المستند يوحّد طريقة مراجعة الـ fallback في المشروع بشكل منهجي، ويغطي النقاط التي كانت تتكرر في التعليقات القديمة.

## 1) `src/hooks/useAppCoreImpl.tsx`

### المسار الأساسي
- يتم تحميل الجداول الأساسية (`properties`, `units`, `contracts`, `invoices`) عبر `/api/*`.

### fallback الحالي
- عند `401` أو `404` يتم التحويل تلقائياً إلى `supabaseData.fetchAll(...)`.

### قائمة التحقق
1. تأكد أن `apiGet` يعيد `status` واضح في الخطأ.
2. حافظ على fallback فقط لأخطاء `401/404` (لا توسّعها لـ `500` إلا بقرار صريح).
3. لا تكسر تجربة المستخدم: اعرض toast واحدة فقط عند فشل كل المسارات.
4. سجّل رسالة تحذيرية عند fallback (`logger.warn`) مع endpoint والـ status.

---

## 2) `src/services/audit/AuditTrail.ts`

### المسار الأساسي
- إدراج سجل في `audit_log` مع `details` منظّم.

### fallback/compatibility
- `user_id` يتم إرساله فقط إذا كان UUID صالح، وإلا `null`.
- actor النصي يبقى داخل `details.actor` للحفاظ على التتبع.

### قائمة التحقق
1. تأكد من عدم إرسال حقول legacy (`id`, `ts`, `username`, `note`, `entity`) كأعمدة منفصلة.
2. ثبّت الوقت بصيغتين:
   - `timestamp_ms`
   - `occurred_at` (ISO UTC)
3. عند تغيير schema في Supabase، حدّث الاختبارات أولاً ثم الكود.

---

## 3) `src/services/supabaseDataService.ts`

### نقطة حساسة
- `insert` يرجع `{ data, error }` ولا يرمي Exception مباشرة.

### قائمة التحقق
1. أي fallback أعلى منه (مثل `useAppCoreImpl`) يجب أن يفحص `error` صراحة.
2. تجنب تمرير payloadات غير متوافقة مع نوع العمود (خصوصاً `uuid` و`jsonb`).
3. اجعل التحويل `camelCase -> snake_case` واضح ومختبر عند الجداول الحساسة.

---

## 4) `vercel.json` + `index.html`

### المسار الأساسي
- CSP مضبوط عبر header في `vercel.json`.
- manifest معطّل في preview المحمي لتقليل ضجيج `401`.

### قائمة التحقق
1. عند ظهور CSP block جديد، عدّل directive الأدق (`script-src` أو `script-src-elem`).
2. إذا احتجت PWA في production فقط، فعّل manifest عبر deploy step خاص بالإنتاج.
3. راقب Console بعد كل تعديل CSP للتأكد أن الخطأ انتهى فعلاً.

---

## 5) Workflow تشغيلي مقترح (PR Checklist)

1. **Reproduce**: خذ لقطة واضحة من Network (request + response body).
2. **Classify**: هل المشكلة auth / schema / type mismatch / CSP؟
3. **Patch Small**: عدّل أقل عدد ممكن من الملفات.
4. **Test Targeted**: شغّل الاختبار الأقرب للتغيير.
5. **Verify Runtime**: راقب console بعد التعديل.
6. **Document**: حدّث هذا الملف إذا أضفت fallback جديد.

---

## أوامر سريعة للمراجعة

```bash
pnpm --dir artifacts/rentrix exec vitest run src/services/audit/AuditTrail.test.ts
pnpm -r --filter "./artifacts/rentrix" --if-present run typecheck
```

