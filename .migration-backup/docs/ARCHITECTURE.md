# Rentrix Architecture Documentation

## Overview
Rentrix is a modern, enterprise-grade Property Management System (PMS) built as a multi-tenant SaaS platform. It leverages a serverless, event-driven architecture to provide high scalability, bank-grade financial integrity, and a seamless user experience.

## Tech Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Backend-as-a-Service** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **State Management** | Context API with Facade Pattern |
| **Database** | PostgreSQL with Row Level Security (RLS) |
| **AI Integration** | Google Gemini 2.0 via Supabase Edge Functions |
| **Monitoring** | Custom Audit Engine & Error Tracker |

## Architectural Patterns

### 1. Layered Architecture
The application follows a strict layered approach to separate concerns:
- **UI Layer (`src/app/`, `src/components/`)**: Pure React components and page layouts.
- **Domain Layer (`src/domain/`)**: Business logic encapsulated in entities and facades.
- **Service Layer (`src/services/`)**: Infrastructure concerns like API clients, logging, and external integrations.
- **Data Layer (Supabase/SQL)**: Database schema, RLS policies, and atomic RPC functions.

### 2. Facade Pattern
The application uses the **Facade Pattern** in `src/domain/` to provide a simplified interface to complex subsystems. This ensures that the UI components don't interact directly with the database or complex logic, making the code more maintainable and testable.

### 3. Atomic Financial Posting
To ensure financial integrity, Rentrix uses **Atomic Posting**. Critical operations like "Post Receipt" or "Renew Contract" are handled via PostgreSQL RPC functions that wrap multiple table updates (Invoices, Receipts, Ledger, Balances) in a single database transaction.

### 4. Immutable Ledger & Event Sourcing
The system implements an immutable ledger model for financial transactions:
- **Financial Events**: Every financial change is recorded in an append-only `financial_events` table.
- **Hash Chaining**: Events are cryptographically hashed and chained to prevent tampering.
- **Materialized Projections**: Complex reports (like Trial Balance) are projected from these events for performance.

## System Flows

### Authentication & Authorization
1. User logs in via Supabase Auth (JWT).
2. The `profiles` table stores extended user data (roles, permissions).
3. **RLS (Row Level Security)** enforces data isolation at the database level using `auth.uid()` and `tenant_id`.

### Financial Transaction Flow
1. **Trigger**: User submits a receipt.
2. **Validation**: Frontend validates input; Backend RPC checks for closed accounting periods.
3. **Execution**: RPC `post_receipt_atomic` executes:
   - Updates Invoice status.
   - Creates Receipt record.
   - Allocates funds to invoices.
   - Generates double-entry Journal records.
   - Updates Tenant/Owner balances.
4. **Audit**: The operation is logged in the `audit_log` and hashed in the `financial_events` chain.

## Scalability & Multi-tenancy
- **Tenant Isolation**: Every table includes an `organization_id` or `tenant_id`. RLS policies ensure users only see data belonging to their organization.
- **Edge Functions**: Heavy logic (AI, Automations, PDF generation) is offloaded to Supabase Edge Functions to keep the frontend lightweight.
- **Database Performance**: Materialized views and optimized indexes are used for real-time financial reporting across large datasets.
