# State Management Guide

## الهدف
تنظيم state بحيث يكون واضحًا: ما هو state محلي للمكوّن، وما هو state مشترك، وما هو state مصدره الخادم.

## State categories

1. **Server state**
   - يأتي من services عبر hooks.
   - يتم التعامل معه كـ source of truth من backend.
2. **Global client state**
   - داخل `contexts/` للحالات المشتركة (auth/session/current tenant).
3. **Local UI state**
   - داخل component أو hook خاص بالشاشة (modal open, selected tab).

## Recommended pattern

- hooks في `src/hooks` تستدعي services في `src/services`.
- context لا ينفّذ calls مباشرة إلا في bootstrapping البسيط؛ الأفضل الاعتماد على hooks مخصصة.
- domain types من `src/domain` تُستخدم في hook signatures لتقليل أي `any`.

## Coding conventions

- سمِّ hooks بصيغة `useXxx`.
- سمِّ services بصيغة فعل واضحة: `create...`, `fetch...`, `update...`.
- لا تضع JSX داخل services أو domain.
- لا تضع استدعاءات Supabase/API داخل components مباشرة.
- أي state مشترك بين أكثر من route يجب تقييمه أولاً في context.

## Anti-patterns to avoid

- نقل أخطاء الخدمة raw إلى UI بدون normalization.
- ازدواجية state لنفس البيانات في context وcomponent بدون سبب.
- خلط validation business داخل component handlers.
