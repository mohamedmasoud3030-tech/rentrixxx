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

### Data Layer (Supabase — fully migrated from Dexie.js)
- **Database**: Supabase PostgreSQL as the primary cloud database
- **Data Service**: `src/services/supabaseDataService.ts` — full CRUD layer with camelCase↔snake_case auto-conversion
- **Field Mapping**: `SPECIAL_FIELD_MAP` handles contracts (start→start_date, end→end_date, rent→rent_amount) and units (rentDefault→rent_default)
- **Table Mapping**: JS table names (e.g. `receiptAllocations`) auto-mapped to SQL names (`receipt_allocations`)
- **Special Tables**: Settings (JSONB single row), Governance, Serials — all have dedicated getter/setter methods
- **AppContext**: All data is fetched into React state via `refreshData()` and accessed as `db.tableName` from `useApp()`
- **Audit Trail**: All data mutations are logged with user, timestamp, and action details
- **Migration SQL**: `supabase_migration_v3.sql` must be run AFTER the base schema to add missing columns

### Financial Engine
- **Double-Entry Accounting**: Journal entries with debit/credit pairs for all financial transactions
- **Chart of Accounts**: Configurable accounts (assets, liabilities, revenue, expenses)
- **Automated Invoicing**: Monthly invoice generation with late fee support
- **Receipt Allocation**: Link payments to specific invoices
- **Owner Settlements**: Track owner balances and commission calculations

### Service Layer Architecture
- **supabaseDataService.ts**: Core Supabase CRUD operations with field/table name mapping
- **accountingService.ts**: Report generation (income statement, balance sheet, trial balance)
- **auditEngine.ts**: Data integrity validation and issue detection
- **pdfService.ts**: PDF generation using jsPDF with Arabic font support
- **integrationService.ts**: WhatsApp messaging and cloud sync utilities
- **automationService.ts**: Automated invoicing, late fees, notifications — all via Supabase

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
- **@supabase/supabase-js**: Supabase client for Auth + database
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

### Cloud Backend (Supabase)
- **Supabase URL**: `https://nnggcnpcuomwfuupupwg.supabase.co`
- **SQL Schema**: `supabase_schema.sql` — all 31 tables with UUID primary keys; run in Supabase SQL Editor
- **Migration v3**: `supabase_migration_v3.sql` — ALTER TABLE statements for missing columns (run AFTER base schema)
- **Drop Script**: `supabase_drop_all.sql` — run first if re-creating tables from an older schema version
- **Dexie.js**: DEPRECATED — `src/services/db.ts` and `src/services/financialEngine.ts` remain as dead code but are not imported

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

### Unified Document Letterhead
- **DocumentHeader component** (`src/components/shared/DocumentHeader.tsx`): Shared header for all printed documents
- **Layout**: Company name centered, contact info (address/phone/CR/tax/postal) on the right, logo on the left (RTL)
- **Used in**: PrintReceipt, PrintContract, Reports printable content, PrintTemplate
- **DocumentHeaderInline**: Variant for use without AppContext (accepts company/logo as props)
- **CompanyInfo fields**: name, address, phone, phone2, email, postalCode, crNumber, taxNumber

### Settings Page (10 sections)
- General (company info, operational settings, late fees, document numbering)
- Financial (account mappings for payment methods, revenue, receivables, expenses)
- Appearance (theme, primary color, logo upload, company stamp upload)
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

### Unit & Tenant Enhancements (v5)
- **Expanded Unit Form**: Full property management fields — type (apartment/shop/office/studio/villa/warehouse/other), floor selection (ground through 5th + roof/basement), status (available/rented/maintenance/on-hold), area, bedrooms, bathrooms, kitchens, living rooms, water meter number, electricity meter number, additional features
- **Floor-Based Unit Grouping**: Units view groups units by floor with per-floor counts when floors are assigned; shows flat grid when no floors set
- **Unit KPI Cards**: 4 stat cards (total units, rented, available, on-hold) at top of units view
- **Unit Status Badges**: Color-coded status badges (green=available, blue=rented, yellow=maintenance, gray=on-hold) on each unit card
- **Expanded Tenant Form**: Type (individual/company), email, nationality, commercial register (shown for companies), address, postal code, PO box — in addition to existing name, phone, ID, status, notes, attachments
- **Company Stamp**: Upload stamp image in Appearance settings; stamp appears in printed receipts and documents (replaces empty circle placeholder)

### Financial Automation & Enhancements (v4)
- **Auto WhatsApp Invoice Notifications**: When monthly invoices are generated, the system automatically creates WhatsApp notification entries for each tenant with invoice details (amount, due date, unit name). Notifications appear in CommunicationHub with one-click WhatsApp send.
- **Check/Electronic Payment Management**: Receipts now support CHECK payment channel with dedicated fields: check number, bank name, due date, and check status (Pending/Deposited/Cleared/Bounced). Check details display in receipts table with color-coded status badges.
- **Contract Renewal Workflow**: Active contracts have a "Renew" action button that automatically: ends the current contract, creates a new ACTIVE contract with same terms for the next year, preserving tenant, unit, rent, deposit, and sponsor information.
- **Maintenance KPI Dashboard**: 5 stat cards at top of Maintenance page showing: total requests, new requests, in-progress, completed, and total costs.
- **Enhanced Receipt Form**: Payment method dropdown includes Cash, Bank Transfer, POS, Check, and Other options. Check selection reveals dedicated check tracking form.

### External Services (Optional)
- **Google OAuth**: For Google Drive backup sync (optional, requires Client ID configuration)
- **WhatsApp Web API**: Direct messaging links for tenant/owner communication and automated invoice notifications