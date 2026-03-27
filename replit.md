# Rentrix - Property Management System

## Overview

Rentrix is a comprehensive property management system for real estate. It is an Arabic-first hybrid desktop/web application built with React, Vite, and Electron. The system streamlines property, unit, tenant, contract, and financial management, including maintenance records, and offers AI-assisted analytics via Google's Gemini API. It aims to provide a robust solution for real estate management with capabilities like double-entry accounting, automated invoicing, and detailed reporting.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Fixes & Improvements

**Add Tenant/Owner Bug Fixes (Mar 27, 2026):**
- ✅ Improved error handling in `supabaseDataService.ts`: `insert()` and `update()` now return detailed error messages
- ✅ Enhanced error reporting in `AppContext.tsx`: User sees specific error reasons instead of generic "failed" messages
- ✅ Added `isSaving` state to TenantForm & OwnerForm for better UX (button disabled during save, shows "جاري الحفظ...")
- ✅ Added try-catch blocks in form submit handlers for graceful error handling
- ✅ Added `.trim()` to all input fields to prevent whitespace-only entries
- ✅ Form fields with empty/undefined values now properly handled (converted to `undefined` instead of empty strings)

**Unified Print System & DocumentTemplates Enhancement (Mar 27, 2026):**
- ✅ Created `PrintPageLayout.tsx` - موحّد ترويسة (Header) لجميع المستندات المطبوعة مع بيانات الشركة كاملة
- ✅ Created `SignatureBlock.tsx` - مكون موحّد للتوقيعات (3 توقيع: مُصدِر، مستقبِل، ختم)
- ✅ Enhanced `PrintPreviewModal.tsx` - طباعة ذكية (A4 بـ 15ملم هوامش، بدون العناصر الإضافية للتطبيق)
- ✅ All numbers display in Arabic numerals (٠-٩) in print using `toArabicDigits()` function
- ✅ Significantly improved `DocumentTemplatesSettings.tsx`:
  - إضافة إعدادات الهوامش (A4: 15ملم افتراضي)
  - إدارة عدد مربعات التوقيع (2 أو 3 أو 4)
  - تفعيل/تعطيل منطقة التوقيعات
  - معاينة حية لترقيم البنود
- ✅ Print system properly detects multiple pages (يطبع ورقتين إذا احتاج ورقتين)
- ✅ Unified header with company info (الاسم، الهاتف، العنوان، السجل التجاري، الرقم الضريبي)

## System Architecture

### Frontend
- **Framework**: React 19 with TypeScript and Vite.
- **Routing**: React Router DOM v7 for single-page application navigation.
- **State Management**: React Context API (`AppContext`) for global state.
- **Styling**: Tailwind CSS with a custom design system supporting light/dark themes, focusing on Arabic (RTL) internationalization with Cairo font.
- **UI Components**: Custom reusable components including Cards, Modals, Action Menus, and form elements.

### Desktop Integration
- **Electron**: Used to wrap the React application for desktop deployment, featuring secure IPC communication and a hardened Content Security Policy.

### Data Layer
- **Database**: Supabase PostgreSQL is the primary cloud database.
- **Data Service**: A dedicated service (`supabaseDataService.ts`) handles CRUD operations, including automatic camelCase to snake_case conversion for field and table names.
- **Data Access**: All data is fetched into React state via `refreshData()` and accessed globally through `useApp()`.
- **Audit Trail**: All data modifications are logged for auditing purposes.
- **Schema**: Utilizes a comprehensive SQL schema with 31 tables, UUID primary keys, and RLS enabled.

### Financial Engine
- **Accounting**: Implements a double-entry accounting system with a configurable Chart of Accounts.
- **Automation**: Features automated monthly invoice generation with late fee support and receipt allocation.
- **Reporting**: Supports owner settlements and various financial reports (income statement, balance sheet, trial balance, etc.).

### Service Layer
- **Core Services**: `supabaseDataService.ts` for data operations, `accountingService.ts` for financial reports, `auditEngine.ts` for data integrity, `pdfService.ts` for PDF generation, `integrationService.ts` for external integrations, and `automationService.ts` for automated tasks.

### Authentication & Security
- **Authentication**: Supabase Auth manages user authentication (email/password) and session persistence.
- **User Management**: `profiles` table stores user roles (ADMIN/USER) for role-based access control enforced within the application.

### UI/UX and Features
- **Theming**: Configurable themes, primary colors, and logo/company stamp uploads.
- **Internationalization**: Full Arabic (RTL) support throughout the application, including date formatting and chart labels.
- **Reports**: A comprehensive reports section with 16 tabs including Overview, Income Statement, Rent Roll, Aged Receivables, Utilities Report, Overdue Tenants, and Vacant Units. Each report includes summary KPIs, filtering options, and printable views.
- **Dashboards**: Redesigned dashboards with key performance indicators (KPIs), financial summaries, alert cards, and quick action buttons.
- **Detail Views**: Enhanced detail views for units, tenants, and properties, displaying related contracts, payments, maintenance, and utility records.
- **Document Generation**: Unified `DocumentHeader` component for all printed documents (receipts, contracts, reports) with company information and logo.
- **Smart Features**: Sidebar notification badges for important alerts (expiring contracts, overdue invoices), and various KPI cards across different modules.
- **Automation**: Automated WhatsApp invoice notifications, check/electronic payment management, and a contract renewal workflow.
- **Settings**: A comprehensive settings page with sections for general, financial, appearance, users, notifications, security, backup, integrations, and automation.

## External Dependencies

- **React/ReactDOM 19**: UI development.
- **React Router DOM 7**: Client-side routing.
- **@supabase/supabase-js**: Supabase client for authentication and database interaction.
- **Lucide React**: Icon library.
- **Electron 28**: Desktop application wrapper.
- **Electron Builder**: Desktop packaging and distribution.
- **@google/genai**: Google Gemini API client for AI features.
- **jsPDF** and **jspdf-autotable**: PDF generation, with custom Arabic font embedding.
- **date-fns**: Date manipulation and formatting.
- **react-hot-toast**: Toast notifications.
- **Vite**: Build tool.
- **TypeScript**: Language.
- **Tailwind CSS**: Styling framework.
- **PostCSS/Autoprefixer**: CSS processing.
- **Supabase Cloud**: Backend-as-a-Service, including PostgreSQL database and Auth.
- **recharts**: Interactive charting library for data visualization.
- **Google OAuth**: For Google Drive backup sync (optional).
- **WhatsApp Web API**: For direct messaging and automated notifications.