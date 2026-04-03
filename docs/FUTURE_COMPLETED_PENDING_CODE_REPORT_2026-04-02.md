# تقرير البحث في المشروع: Future / Completed / Pending

**تاريخ التقرير:** 2026-04-02  
**النطاق:** ملفات `src/` (صفحات + مكونات + خدمات + أنواع)

---

## 1) أين يظهر "Future" (المستقبلي) في المشروع؟

### أ) تنبيهات العقود القريبة من الانتهاء
- `src/pages/Contracts.tsx`
  - يتم حساب `futureDate` بناءً على `alertDays`.
  - يتم احتساب العقود التي ستنتهي بين اليوم و `futureDate`.

### ب) عدادات الشريط الجانبي
- `src/components/print/layout/Sidebar.tsx`
  - نفس منطق `futureDate` لحساب عدد العقود القريبة من الانتهاء (`expiringContracts`).

---

## 2) أين يظهر "Pending" (معلّق) في المشروع؟

### أ) تعريفات الأنواع (Type Definitions)
- `src/types.ts`
  - `Receipt.checkStatus` يحتوي `PENDING`.
  - `OutgoingNotification.status` يحتوي `PENDING`.

### ب) واجهات المستخدم
- `src/pages/CommunicationHub.tsx`
  - حالة الإشعارات الصادرة (`PENDING` مقابل `SENT`) مع زر إرسال فقط عند `PENDING`.
- `src/pages/Dashboard.tsx`
  - `pendingMaintenance` مبني من حالات الصيانة `NEW` و `IN_PROGRESS`.
- `src/pages/Financials.tsx`
  - عرض `pendingSettlements`.
  - قيمة افتراضية `checkStatus = 'PENDING'`.
  - اختيار حالة الشيك يتضمن `PENDING`.
- `src/components/print/layout/Sidebar.tsx`
  - `pendingNotifications` مبني من الإشعارات ذات الحالة `PENDING`.
- `src/components/reports/ReportsDashboard.tsx` و `src/pages/reportsdashboard.txt`
  - KPI للفواتير المعلّقة.

### ج) ألوان/ستايل الحالة
- `src/utils/helpers.ts`
  - `getStatusBadgeClass` يدعم حالة `PENDING`.

---

## 3) أين يظهر "Completed" (مكتمل) في المشروع؟

### أ) تعريفات الأنواع
- `src/types.ts`
  - `MaintenanceRecord.status` يحتوي `COMPLETED`.
  - `MaintenanceRecord.completedAt` موجود.
  - `Mission.status` يحتوي `COMPLETED`.

### ب) صفحة الصيانة (النقطة الأكثر كثافة)
- `src/pages/Maintenance.tsx`
  - فلترة الحالة تشمل `COMPLETED`.
  - إحصاء `completed`.
  - ترجمة الحالة "مكتمل".
  - إدارة `completionDate` و `completedAt` عند اكتمال المهمة.
  - إظهار حقل تاريخ الإكمال عندما تكون الحالة `COMPLETED` أو `CLOSED`.

### ج) التقارير
- `src/components/reports/views/MaintenanceReport.tsx`
  - تحويل `COMPLETED` إلى "مكتمل" في العرض والتصدير.

### د) قواعد التدقيق
- `src/services/auditEngine.ts`
  - فحص سجلات الصيانة المكتملة/المغلقة للتأكد من وجود قيد مالي مرتبط.

---

## 4) ملاحظات هندسية (Refactor Opportunities)

1. **توحيد قاموس الحالات (Status Dictionary)**
   - حاليًا توجد حالات متناثرة في ملفات متعددة (Maintenance/Communication/Financials/Sidebar).
   - الأفضل إنشاء ملف مركزي (مثلاً `src/constants/status.ts`) يحتوي:
     - القيم المسموحة.
     - الترجمة العربية.
     - ألوان الـ badge.

2. **توحيد منطق "Future Date Window"**
   - منطق `futureDate` مكرر في:
     - `Contracts.tsx`
     - `Sidebar.tsx`
   - الأفضل نقله إلى helper موحد مثل:
     - `src/utils/dateWindows.ts`
     - دالة: `getFutureWindowEnd(alertDays: number): Date`

3. **تقليل الـ "Magic Strings" للحالات**
   - الاعتماد الحالي على نصوص مباشرة (`'PENDING'`, `'COMPLETED'`...) يزيد احتمال الأخطاء الإملائية.
   - يفضّل استخدام constants/enums مشتقة من `types.ts`.

4. **توحيد تعريف "Pending" عبر الوحدات**
   - في الصيانة: pending = `NEW` + `IN_PROGRESS`.
   - في الإشعارات: pending = `PENDING`.
   - في الشيكات: pending = `PENDING`.
   - يُفضّل توثيق تعريف "pending" لكل domain في طبقة واحدة لسهولة الصيانة.

---

## 5) خلاصة تنفيذ طلبك

- تم فحص ملفات المشروع (كود + أنواع + صفحات + مكونات) لاستخراج مواضع:
  - **Future**
  - **Pending**
  - **Completed**
- وتم تجهيز **تقرير منظم** مع نقاط **refactor** عملية يمكن تنفيذها لاحقًا.
