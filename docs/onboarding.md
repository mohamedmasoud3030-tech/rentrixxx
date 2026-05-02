# Developer Onboarding

## Quick start

1. Node.js 22+ و npm 10+.
2. تثبيت الاعتماديات:

```bash
npm install --legacy-peer-deps
```

3. تشغيل التطبيق محليًا:

```bash
npm run dev
```

4. تحقق أساسي قبل أي PR:

```bash
npm run typecheck
npm run test
npm run build
```

## Architecture mental model

- ابدأ من `src/app` لفهم entry points.
- راقب `contexts/` لمعرفة global state.
- اتبع hooks لمعرفة orchestration.
- افتح services لفهم التكاملات الخارجية.
- ارجع إلى `domain/` لمعرفة قواعد العمل.
- استخدم `design-system/` بدل إنشاء UI patterns جديدة كل مرة.

## Where to put new files

- API/DB integration ➜ `src/services/`
- Business rule/model ➜ `src/domain/`
- Reusable stateful logic ➜ `src/hooks/`
- Cross-app state provider ➜ `src/contexts/`
- Shared visual primitive/token ➜ `src/design-system/`

## Team conventions (summary)

- Types أولاً: عرّف type/interface قبل التنفيذ عند أي flow جديد.
- منطق التمويل والمصادقة لا يوضع داخل components مباشرة.
- التغييرات في auth/finance يجب أن تتضمن اختبارًا أو تحديثًا واضحًا في استراتيجية الاختبار.
- حافظ على boundaries بين layers ولا تتجاوزها shortcut.
