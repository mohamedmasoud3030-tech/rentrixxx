# Rentrix — نظام إدارة الممتلكات العقارية

[![Build](https://github.com/mohamedmasoud3030-tech/rentrixxx/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mohamedmasoud3030-tech/rentrixxx/actions/workflows/ci.yml)
[![Test](https://github.com/mohamedmasoud3030-tech/rentrixxx/actions/workflows/ci.yml/badge.svg?branch=main&event=pull_request)](https://github.com/mohamedmasoud3030-tech/rentrixxx/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/mohamedmasoud3030-tech/rentrixxx/branch/main/graph/badge.svg)](https://codecov.io/gh/mohamedmasoud3030-tech/rentrixxx)

نظام SaaS متكامل لإدارة الممتلكات العقارية باللغة العربية.

## ⚠️ متطلبات النظام

- **Node.js:** v22 أو أحدث (مطلوب)
- **pnpm:** v10 أو npm 10+
- **Git:** لاستنساخ المستودع

> **ملاحظة مهمة:** المشروع يتطلب Node.js 22+ بسبب استخدام Vite 5 و Rollup. الإصدارات الأقدم من Node ستفشل في البناء.

## 🚀 البدء السريع

### التثبيت المحلي

```bash
# استنساخ المستودع
git clone https://github.com/mohamedmasoud3030-tech/rentrixxx.git
cd rentrixxx

# التحقق من إصدار Node
node --version  # يجب أن يكون v22 أو أحدث

# تثبيت الاعتماديات
pnpm install
```

### متغيرات البيئة

أنشئ ملف `.env.local` في المجلد الجذر:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_NAME=Rentrix
VITE_APP_VERSION=2.0.0
```

### تشغيل البيئة التطويرية

```bash
pnpm dev
```

التطبيق سيكون متاحاً على `http://localhost:5000`.

## 📦 البناء للإنتاج

```bash
pnpm build
```

سيُنشئ مجلد `dist` جاهز للنشر على Vercel.

## 🏗️ البنية المعمارية

```
src/
├── app/                      # صفحات وتوجيه
├── components/               # مكونات واجهة المستخدم
├── domain/                   # منطق الأعمال
├── services/                 # خدمات البنية التحتية
├── hooks/                    # React hooks مخصصة
├── types/                    # تعريفات TypeScript
└── utils/                    # دوال مساعدة

supabase/
├── migrations/               # ترحيلات قاعدة البيانات
└── functions/                # Edge Functions
```

## 🔧 البيئات المدعومة

| البيئة | Node | متصفح | حالة |
|-------|------|-------|------|
| التطوير | 22+ | آخر 2 إصدار | ✅ |
| الإنتاج | 22+ | آخر 2 إصدار | ✅ |
| الاختبار | 22+ | - | ⚠️ (محدود) |

## 🧪 الاختبارات

```bash
pnpm test        # تشغيل الاختبارات
pnpm test:watch  # مراقبة التغييرات
```

## 📝 التوثيق

- [دليل النشر](./docs/DEPLOYMENT.md)
- [دليل المطور](./docs/DEVELOPER-GUIDE.md)
- [بنية البنية المعمارية](./docs/ARCHITECTURE.md)
- [تقرير جاهزية البيع](./docs/SALE-READINESS-REPORT.md)

## 🔐 الأمان

- جميع بيانات الاعتماد يجب أن تُعيّن عبر متغيرات البيئة فقط
- لا تُرفع أبداً `.env.local` أو ملفات سر إلى Git
- راجع [SECURITY.md](./docs/SECURITY.md) لسياسة الأمان الكاملة

## 📄 الترخيص

هذا المشروع تحت ترخيص ملكية حصرية. راجع [LICENSE](./LICENSE) للتفاصيل.

## 📞 الدعم

للأسئلة أو الدعم، تواصل عبر: support@rentrix.app

---

**الإصدار:** 2.0.0  
**آخر تحديث:** 30 أبريل 2026

## 🛡️ حماية الفرع (Branch Protection)

لمنع الدمج عند فشل الفحوصات، فعّل **Branch protection rule** على فرع `main` مع الإعدادات التالية:

- تفعيل **Require a pull request before merging**
- تفعيل **Require status checks to pass before merging**
- إضافة الفحوصات المطلوبة:
  - `install-typecheck-lint-test-build`
  - `validate-commits`
  - `typecheck`
- تفعيل **Require branches to be up to date before merging**

يمكنك اتباع الخطوات التفصيلية في: `./.github/branch-protection.md`.
