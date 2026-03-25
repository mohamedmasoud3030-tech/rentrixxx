# Rentrix - Property Management System

## Overview

Rentrix is a comprehensive property management system (نظام إدارة مؤسسات شامل لإدارة العقارات) designed for real estate management. It's an Arabic-first application built as a hybrid desktop/web app using React with Vite for the frontend and Electron for desktop deployment. The system manages properties, units, tenants, contracts, financial transactions, maintenance records, and provides AI-assisted analytics via Google's Gemini API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Routing**: React Router DOM v7 for SPA navigation
- **State Management**: React Context API (`AppContext`) as the central state container
- **Styling**: Tailwind CSS with a custom design system supporting light/dark themes via CSS custom properties
- **UI Components**: Custom component library with Cards, Modals, Action Menus, and form elements
- **Internationalization**: Arabic (RTL) as primary language with Cairo font family

### Desktop Integration
- **Electron**: Wraps the React app for desktop deployment with secure IPC communication
- **Preload Scripts**: Expose limited APIs to renderer (file dialogs, Gemini queries)
- **Content Security Policy**: Hardened CSP configured for both development and production

### Data Layer
- **Database**: Dexie.js (IndexedDB wrapper) for client-side persistent storage
- **Schema**: Comprehensive schema including users, owners, properties, units, tenants, contracts, invoices, receipts, expenses, journal entries, and more
- **Live Queries**: `useLiveQuery` hook for reactive data binding
- **Audit Trail**: All data mutations are logged with user, timestamp, and action details

### Financial Engine
- **Double-Entry Accounting**: Journal entries with debit/credit pairs for all financial transactions
- **Chart of Accounts**: Configurable accounts (assets, liabilities, revenue, expenses)
- **Automated Invoicing**: Monthly invoice generation with late fee support
- **Receipt Allocation**: Link payments to specific invoices
- **Owner Settlements**: Track owner balances and commission calculations

### Service Layer Architecture
- **financialEngine.ts**: Core accounting calculations, journal posting, and snapshot rebuilding
- **accountingService.ts**: Report generation (income statement, balance sheet, trial balance)
- **auditEngine.ts**: Data integrity validation and issue detection
- **pdfService.ts**: PDF generation using jsPDF with Arabic font support
- **integrationService.ts**: WhatsApp messaging and cloud sync utilities

### Authentication & Security (Supabase Auth)
- **Auth Provider**: Supabase Auth — email + password login only
- **Session Persistence**: Supabase handles JWT tokens with auto-refresh
- **User Profiles**: `profiles` table in Supabase stores role (ADMIN/USER) and mustChange flag
- **Role-Based Access**: ADMIN and USER roles enforced in AppContext and Sidebar
- **Password Changes**: Via `supabase.auth.updateUser()` — no local hashing
- **Auth Client**: `src/services/supabase.ts` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars

## External Dependencies

### Core Runtime
- **React/ReactDOM 19**: UI framework
- **React Router DOM 7**: Client-side routing
- **Dexie 4**: IndexedDB abstraction for local persistence
- **Lucide React**: Icon library

### Desktop
- **Electron 28**: Desktop application wrapper
- **Electron Builder**: Packaging and distribution

### AI Integration
- **@google/genai**: Google Gemini API client for smart assistant features
- API key stored in settings and passed through Electron IPC for security

### PDF Generation
- **jsPDF**: PDF document generation
- **jspdf-autotable**: Table plugin for jsPDF
- Custom Cairo font embedded as base64 for Arabic text rendering

### Utilities
- **date-fns**: Date manipulation and formatting
- **react-hot-toast**: Toast notifications

### Build Tools
- **Vite**: Build tool and dev server
- **TypeScript**: Type checking
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS/Autoprefixer**: CSS processing

### Cloud Backend
- **@supabase/supabase-js**: Supabase client for Auth + SQL database
- **Supabase URL**: `https://nnggcnpcuomwfuupupwg.supabase.co`
- **SQL Schema**: `supabase_schema.sql` — all 31 tables with UUID primary keys; run in Supabase SQL Editor
- **Drop Script**: `supabase_drop_all.sql` — run first if re-creating tables from an older schema version

## Recent Audit & Polish (v3)

### Charts & Visualization (recharts)
- **recharts**: Interactive charts library used across Dashboard, Reports, and Properties pages
- **Dashboard**: 6-month revenue/expense AreaChart trend
- **Reports Overview**: AreaChart (revenue trend), PieChart (unit occupancy), BarChart (expense categories), net income bar chart, monthly collection LineChart
- **Income Statement**: Revenue and expense distribution PieCharts
- **Aged Receivables**: Aging distribution BarChart with color-coded severity
- **date-fns with Arabic locale**: Used for Arabic month names in chart labels

### Reports Page (Complete Rebuild)
- 8-tab navigation: Overview, Income Statement, Balance Sheet, Trial Balance, Rent Roll, Owner Ledger, Tenant Statement, Aged Receivables
- Each report has MiniKpi summary cards at top
- ActionBar with Print and PDF Export buttons
- Revenue/expense trend charts in Overview
- Pie charts for income/expense distribution in Income Statement
- Aging bar chart in Aged Receivables
- Clean table styling with borders, hover states, and color-coded values

### Smart Features
- **Sidebar notification badges**: Red badge counts on Contracts (expiring), Finance (overdue invoices), Leads (new), Communication (pending notifications)
- **Properties page KPIs**: 5 stat cards (properties count, total units, rented, vacant, occupancy %)
- **Contracts page KPIs**: 5 stat cards (total, active, expiring, ended, total receivables)
- **Dashboard revenue chart**: 6-month AreaChart with gradient fills for revenue vs expenses

### Dashboard Overhaul
- Complete redesign with 6 mini KPIs (properties, units, vacant, contracts, tenants, occupancy rate)
- 4 financial KPI cards (monthly revenue, expenses, net, treasury balance)
- 3 alert cards (overdue invoices, expiring contracts, pending maintenance)
- Receivables & payables summary panel
- Quick action buttons (new receipt, new contract, generate invoices, reports)
- Expiring contracts table with days-left badges
- Overdue invoices table with days-overdue severity badges
- Recent receipts feed with status badges

### Settings Page (10 sections)
- General (company info, operational settings, late fees, document numbering)
- Financial (account mappings for payment methods, revenue, receivables, expenses)
- Appearance (theme, primary color, logo upload)
- Users (Supabase-backed user management, role assignment)
- Notifications (template management with toggle enable/disable)
- Security (data integrity audit + audit log)
- Backup (JSON export/import with restore confirmation)
- Integrations (Gemini API key, Google Drive placeholder)
- Automation (toggle tasks, manual run, run history log)
- Data Integrity (separate audit page)

### Bug Fixes
- **Contract date logic**: End date auto-calculates as start + 1 year - 1 day (was start + 1 year exactly)
- **Async/await consistency**: All `dataService.add/update/remove` calls across all pages (Contracts, Properties, CommunicationHub, Maintenance, Leads, LandsAndCommissions, People, Invoices, Financials) now properly await async operations
- **SQL schema v2**: All IDs use UUID type (was TEXT causing FK conflicts); removed problematic foreign key constraints

### External Services (Optional)
- **Google OAuth**: For Google Drive backup sync (optional, requires Client ID configuration)
- **WhatsApp Web API**: Direct messaging links for tenant/owner communication