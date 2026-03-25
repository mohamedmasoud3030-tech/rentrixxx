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
- **SQL Schema**: `supabase_schema.sql` — run in Supabase SQL Editor to create all 31 tables

### External Services (Optional)
- **Google OAuth**: For Google Drive backup sync (optional, requires Client ID configuration)
- **WhatsApp Web API**: Direct messaging links for tenant/owner communication