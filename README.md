<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Rentrix — نظام إدارة العقارات

نظام ERP متكامل لإدارة العقارات والعقود والمستأجرين والمالية.

## الإعداد المحلي

**المتطلبات**
- Node.js 20+
- npm 10+

### 1. تثبيت الحزم
```bash
npm install
```

### 2. إعداد متغيرات البيئة
```bash
cp .env.example .env.local
```

افتح `.env.local` وضع البيانات التالية:
```
VITE_SUPABASE_URL=https://nnggcnpcuomwfuupupwg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZ2djbnBjdW9td2Z1dXB1cHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTcyMjQsImV4cCI6MjA4OTM5MzIyNH0.i_3dknmkEjUONYx0bF_6CujPsBKMH4zfrC_qPz-XxZE
```

### 3. تطبيق migrations على Supabase
```bash
npx supabase login
npx supabase link --project-ref nnggcnpcuomwfuupupwg
npx supabase db push
```

### 4. تشغيل التطبيق
```bash
npm run dev
```

---

## النشر على Vercel

1. اربط الـ repo بـ Vercel
2. في **Settings → Environment Variables** أضف:
   - `VITE_SUPABASE_URL` = `https://nnggcnpcuomwfuupupwg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Deploy

---

## هيكل قاعدة البيانات

```bash
# لتطبيق جميع الـ migrations:
npx supabase db push

# للاتصال المباشر بقاعدة البيانات:
postgresql://postgres:PASSWORD@db.nnggcnpcuomwfuupupwg.supabase.co:5432/postgres
```

---

## الأوامر المتاحة

```bash
npm run dev        # تشغيل محلي
npm run build      # بناء للإنتاج
npm run typecheck  # فحص TypeScript
```
