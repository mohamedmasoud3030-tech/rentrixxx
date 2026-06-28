# Rentrix Phases 1-7 Detailed Execution Plan

This document outlines the detailed architectural blueprint, workflow designs, and actionable TODO lists for **Phases 1 through 7** of the Rentrix platform. 

In accordance with the new product strategy, **all direct Supabase database interactions, migrations, RPCs, auth, generated types, and RLS are postponed to Phase 8**. This decouples the core Arabic-first domain logic, workflows, and calculations from database integration, ensuring rapid iteration and perfect mobile UX polish before persistence is frozen.

---

## 1. Architectural Strategy: Local-First Domain Model

To support development without live database constraints, the application will operate on a **Local-First, Mock-Driven Architecture**.

```
+-----------------------------------------------------------------+
|                       React UI Components                       |
|          (Arabic-First, Mobile-First, Responsive Views)          |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                     Domain Hooks & Services                     |
|          (useMockOwners, useMockContracts, useMockFinancials)   |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                    Mock Repositories Layer                      |
|         (Simulates Latency, Errors, Relational Checks)          |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                   Centralized Mock DB Store                     |
|             (Zustand / LocalStorage Persistent State)           |
+-----------------------------------------------------------------+
```

### 1.1 The Repository & Hook Abstraction
Instead of importing the Supabase client directly in UI components, all queries and mutations are routed through **hooks and services**. 
- In **Phases 1-7**, these hooks communicate with the in-memory/localStorage-backed mock repositories.
- In **Phase 8**, the mock repositories are swapped with live Supabase client calls. The use of repository abstractions should **reduce, not eliminate**, Phase 8 integration changes.

### 1.2 Reference Entity Archival & Immutability Rules
Because the mock database is in-memory/localStorage, relational constraints and archival rules must be handled by JavaScript service logic:
- **Reference Entity Archival**: Deleting or destructive removal of data is strictly forbidden. Setup/reference entities (Owners, Properties, Units, Tenants, Agreements) support archival (`isArchived: true`) or deactivation.
- **Relational Archival Checks**: To prevent orphan records, archiving a reference entity must be blocked if there are active related agreements or contracts in the system (e.g., cannot archive an Owner with active Agreements, cannot archive a Tenant with active Contracts).
- **Immutable Financial/Operational Records**: Contracts, Invoices, Payments, Receipts, Settlements, and Audit Events form the immutable operational and financial history of the office. They **must never support archival or deletion**, ensuring absolute audit integrity.
- **State Preservation**: The local database state is loaded from and saved to the browser's `localStorage` on every mutation to preserve user entries across page reloads.

---

## 2. Core Operational Workflow

Rentrix operates on a unified, single-office real-estate onboarding model. The relationship model must always flow in this valid order:

```text
Owner (المالك) 
  └── Property (العقار)
        └── Owner Agreement (اتفاقية التشغيل)
              └── Unit (الوحدة)
                    └── Tenant (المستأجر)
                          └── Lease Contract (عقد الإيجار)
                                ├── Invoice (فاتورة المطالبة)
                                ├── Payment/Receipt (سند القبض)
                                └── Expense (مصروفات تشغيلية)
```

An Operating Agreement cannot exist in isolation before its associated Property is established. An onboarding wizard may optionally consolidate the **Owner → Property → Owner Agreement** onboarding into one unified flow.

### 2.1 Configurable Operating Models
- `property_management` (إدارة أملاك): The property belongs to the owner, and the office earns an agreed fee or commission according to the agreement.
- `master_lease` (استئجار رئيسي): The office leases the property from the owner for a fixed obligation and subleases individual units to tenants, keeping the sublease margins.

---

## 3. Detailed Phase Breakdown & TODO List

---

### Phase 1: Domain Foundation (Current)

**Objective**: Establish clean, strict TypeScript types, Arabic metadata dictionary, and validation invariants in pure code. Decouple components from direct database type dependency.

#### Architecture details:
- Define pure interfaces in `rentrix-app/src/domain/types.ts` covering core entities.
- Store static Arabic term dictionaries, helper labels, and validation messages in `i18n.ts`.
- Create helper functions for strict calendar date math and positive finite values in `validators.ts`.

#### TODO Tasks (Phase 1):
1. [ ] **Define Pure TypeScript Interfaces**: Write distinct TypeScript types for all 11 core entities in `rentrix-app/src/domain/types.ts` without relying on Supabase autogenerated types. Keep financial and historical entities free of archival flags.
2. [ ] **Implement Arabic Translation Dictionary**: Define a centralized metadata dictionary (`rentrix-app/src/domain/i18n.ts`) containing Arabic labels and error string constants, without forcing Arabic-only owner or tenant names.
3. [ ] **Create Strict Date Validators**: Implement strict calendar checker `isValidISODateString(dateStr)` that rejects impossible dates (e.g., February 30th) and leap year violations.
4. [ ] **Implement Finite Money Validators**: Create `validatePositiveAmount` rejecting `NaN`, `Infinity`, and negative values.
5. [ ] **Create Entity-Specific Archival/Deactivation Rules**: Define explicit functions to archive Owner, Property, Unit, Tenant, and Agreement, enforcing that no active related records exist and blocking archival of immutable financial/historical records.

---

### Phase 2: Mock/Local Data Layer

**Objective**: Build a reactive central state database and robust mock services imitating asynchronous backend behavior.

#### Architecture details:
- Create `mock-db-store.ts` representing a relational database in JSON.
- Implement localStorage sync to prevent loss of data on refresh.
- Create Mock Repositories that simulate network latency and handle errors cleanly.

#### TODO Tasks (Phase 2):
1. [ ] **Set Up Reactive Local Database Store**: Implement a centralized reactive store (using Zustand or React Context) in `rentrix-app/src/store/mock-db-store.ts` that manages the local state of all entities.
2. [ ] **Create Rich Local Seed Data**: Populate the mock database with realistic, connected Arabic seed data (2 owners, 2 agreements, 3 properties, 5 units, 2 tenants, 1 active lease contract, and 3 invoices).
3. [ ] **Implement LocalStorage Synchronization**: Write persistent sync middleware so every mutation is automatically saved to the browser's `localStorage` and reloaded on startup.
4. [ ] **Develop Mock CRUD Repositories**: Build repository functions in `rentrix-app/src/services/mock-repos/` with standard asynchronous interfaces (e.g., `ownerRepo.create()`, `contractRepo.getById()`) that mimic database operations.
5. [ ] **Create Signature-Compatible React Hooks**: Write custom React hooks (`useMockOwners`, `useMockProperties`, `useMockContracts`) that export `data`, `isLoading`, `error`, and `execute` methods to perfectly mirror React Query signatures, reducing future integration changes.

---

### Phase 3: Owner, Agreement, Property, and Unit Workflows

**Objective**: Build the full Arabic-first, mobile-first user interfaces and workflows for property and owner management.

#### Architecture details:
- Standardized UI using the Unified Components (cards for mobile, compact tables for desktop).
- Setup flow in correct order: Owner → Property → Owner Agreement → Unit, or a unified onboarding wizard.
- Double-operating model selection (`property_management` vs `master_lease`) in the Agreement form.

#### TODO Tasks (Phase 3):
1. [ ] **Build Owner Hub View & Card Grid**: Create the responsive mobile Card Grid and desktop compact table for Owners, displaying owner names, active properties, and summary counts in Arabic.
2. [ ] **Build Owner Registration Form**: Create a wizard/form to register new Owners with complete validation.
3. [ ] **Build Owner Agreement Form**: Implement the operating agreement interface supporting model switching (`property_management` vs `master_lease`) and inputs for commission rates or lease obligations.
4. [ ] **Build Property Onboarding Wizard**: Create Property registration, linking each property to an active Owner in the correct workflow sequence.
5. [ ] **Build Unit Setup Flow**: Create Unit registration form (belonging to a property) with standard selectors (rent value, number of rooms, unit status: `vacant` / `occupied` / `maintenance`).

---

### Phase 4: Tenant and Contract Lifecycle

**Objective**: Implement tenant management and secure contract wizards with rigorous frontend date and vacancy validation.

#### Architecture details:
- Tenants list and creation forms.
- Lease Contract Wizard validating: Unit status is `vacant`, Contract dates reside fully within the covering Owner Agreement dates, and Contract dates do not overlap with existing active/draft contracts.
- Lifecycle actions: Renew (creates a new contract chain) and Terminate (updates contract status and unit vacancy).

#### TODO Tasks (Phase 4):
1. [ ] **Build Tenant Hub & Onboarding**: Build Arabic card-based mobile interfaces to create and list Tenants (name, phone, email).
2. [ ] **Create Lease Contract Wizard**: Build the step-by-step contract creation flow (Selecting Tenant, Property, Unit, active Owner Agreement, start date, end date, and installment frequency).
3. [ ] **Enforce Date & Vacancy Invariants**: Write strict form validators that check:
   - Selected unit is currently `vacant` (not occupied by another active contract).
   - Contract date range fits fully inside the covering Agreement's start/end dates.
   - Zero overlap with any past active/draft contracts on the same unit. (Expired/terminated contracts are ignored).
4. [ ] **Implement Contract Renewal Workflow**: Add a "جدد العقد" (Renew Contract) action modal that duplicates the contract, prompts for a new date range and price, and establishes a historical relation chain.
5. [ ] **Implement Contract Termination Workflow**: Add an "إنهاء العقد" (Terminate Contract) modal that prompts for termination date and reason, updates unit state back to `vacant`, and logs the termination status. *Pro-rated final due calculation policy is deferred as a future owner decision.*

---

### Phase 5: Financial Workflows

**Objective**: Implement invoicing, collection recordings, receipts, expense logs, and owner settlements.

#### Architecture details:
- Invoices, payments, and receipts generated in local state.
- Physical print and PDF layout for Receipts (RTL, clear lines, Arabic formatting).
- Owner Settlement Engine calculates payouts depending on the agreement model.

#### TODO Tasks (Phase 5):
1. [ ] **Implement Invoicing Interface**: Create the UI and services to record and view lease invoices. *Automatic invoice generation policy is deferred as a future owner decision.*
2. [ ] **Build Record Payment & Allocation Form**: Create the Arabic payment recording interface to match collections with unpaid invoices, supporting full or partial payment allocations.
3. [ ] **Design Mobile-First Receipt (RTL)**: Create a highly polished, print-optimized Arabic Receipt (سند قبض) view, using standard Tailwind `@media print` utilities, optimized for direct physical printing or mobile PDF sharing.
4. [ ] **Build Expense Logger**: Create the Property and Unit expense registration form with a dropdown for expense responsibility (`owner` / `office` / `shared`).
5. [ ] **Implement Owner Settlement Calculator**: Develop the calculations engine that prepares owner settlements depending on agreement type (`property_management` vs `master_lease`).
6. [ ] **Build Office Profitability Engine**: Develop calculations for the office's net revenue (fees collected + master lease sublease margins - office operational expenses).

---

### Phase 6: Roles and Audit Behavior

**Objective**: Apply client-side RBAC (ADMIN, MANAGER, USER), local logging of actions, and manager approval gates for sensitive operations.

#### Architecture details:
- Settings-based role simulator to easily inspect permission blocks.
- Action disabling and warning components on restricted actions.
- Local storage transaction ledger logging all changes.

#### TODO Tasks (Phase 6):
1. [ ] **Build Settings Role Simulator**: Create a simple toggle on the dashboard or settings page to shift the simulated logged-in user between `ADMIN`, `MANAGER`, and `USER` roles to audit authorization flows.
2. [ ] **Enforce UI RBAC Rules**: Apply role checks on critical UI actions (e.g., restricting sensitive operations to `ADMIN` or `MANAGER`). *Approval thresholds (such as 5,000 limits) are marked as future owner decisions.*
3. [ ] **Implement Manager Approval Workflow**: Create a queue for actions requiring approval (such as contract terminations or payment reversals), holding them in a "Pending Approval" state until a simulated `MANAGER` user clicks approve.
4. [ ] **Implement Frontend Audit Logger**: Write an audit log utility (`rentrix-app/src/domain/validators.ts` or custom service) that writes an entry to the local `audit_logs` store for every user action.
5. [ ] **Build Audit Log Viewer**: Create an Arabic "سجل العمليات" (Audit Log) list page accessible only to `MANAGER` and `ADMIN` with filters for entity types, actions, and actors.

---

### Phase 7: Reports, Print/Export, Tests, and CI

**Objective**: Complete the Arabized operational dashboards, physical exports, comprehensive test suites, and extend CI validation.

#### Architecture details:
- Reports display collections rate, arrears list, occupancy, and profitability.
- Exporter triggers CSV downloading in browser.
- Complete Vitest/Jest suites verifying date calculations, overlaps, and financial settlements.
- **Extend existing CI pipeline** on pull requests to run TypeScript typechecks and testing.

#### TODO Tasks (Phase 7):
1. [ ] **Build Operational Reports Dashboard**: Implement the Arabic Reports Page containing high-level cards and lists (occupancy rate, arrears, owner statement, and profitability).
2. [ ] **Create Universal CSV and PDF Exporters**: Build utilities to export the current view of any list page directly to CSV and print-friendly PDF.
3. [ ] **Implement Print-Preview for Financial Statements**: Create highly formatted print templates for Owner Settlement Statements and Tenant Account Statements.
4. [ ] **Write Core Calculation Tests**: Implement comprehensive unit tests (using Vitest) verifying lease calculations, overlapping contract validator, and agreement settlements (both management and lease models).
5. [ ] **Extend Existing CI Pipeline**: Update the existing `.github/workflows/` CI workflow to integrate and run Vitest test suites alongside typescript checks on every pull request, enforcing zero failures.

---

## 4. Phase 8: Supabase Integration (Deferred Milestone)

When the code is fully verified in Phase 7, Phase 8 will introduce the real database. Because of the repository abstractions implemented in Phases 1-7, Phase 8 is a structured sync to reduce integration changes:

1. **Schema Migration**: Write PostgreSQL migrations in `supabase/` based on the proven TypeScript domain types.
2. **Atomic RPCs**: Port local transactional logic (like atomic contract renewal or void receipts) to PostgreSQL RPC functions.
3. **RLS Policies**: Apply secure PostgreSQL RLS policies matching the RBAC structure audited in Phase 6.
4. **Auth Webhook**: Implement JWT hooks to attach `office_id` and custom roles (`ADMIN`/`MANAGER`/`USER`) directly to the session token.
5. **Types Generation**: Run `supabase gen types` to produce generated TypeScript database contracts.
6. **Live Data Hook Binding**: Refactor the custom React hooks (from Phase 2) to fetch and mutate live data via the Supabase client.

---

## 5. Later Backlog / Phase 9: Secondary Module Hardening

After the core operational lifecycle and financial models are validated on live Supabase data, secondary workflows will be hardened in a later backlog:

- Maintenance workflows, service logs, and contractor tracking.
- Document templates and electronic signature bindings.
- Automated alert triggers (expiring agreements, unpaid rents).
- Lands, leads, commissions, and operational communications sending.
