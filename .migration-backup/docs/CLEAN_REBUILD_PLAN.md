# 🏗️ RENTRIX CLEAN REBUILD PLAN

**Document Version:** 1.0  
**Date:** 30 April 2026  
**Purpose:** Define a simplified, clean architecture for rebuilding Rentrix  
**Audience:** Architects, Senior Developers

---

## 1. CURRENT STATE ANALYSIS

### Codebase Metrics
- **Total Source Files:** 192 TypeScript/TSX files
- **Source Size:** 1.2 MB
- **Services:** 17 business logic modules
- **Hooks:** 13 custom React hooks
- **Types Definition Files:** 5 files
- **Database Migrations:** 56+ migrations

### Current Architecture Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| **Over-layered facade pattern** | 🔴 | Services wrap services wrap services |
| **Duplicate data fetching logic** | 🟠 | Multiple hooks doing same queries |
| **Complex AppContext** | 🟠 | 11,754 lines in useAppCoreImpl.tsx |
| **26KB supabaseDataService** | 🔴 | Monolithic data layer |
| **Scattered business logic** | 🟠 | Finance/accounting logic split across 5 files |
| **Premature abstraction** | 🔴 | Design system for MVP is overkill |
| **RLS + Security layers** | 🟠 | 56 migrations for soft deletes, cascades |
| **37 console.log statements** | 🟡 | No unified logging |

---

## 2. COMPLEXITY AUDIT

### Files Over 5KB (Candidates for Simplification)

| File | Size | Complexity |
|------|------|-----------|
| `supabaseDataService.ts` | 26 KB | 🔴 Monolithic CRUD factory |
| `useAppCoreImpl.tsx` | 11.7 KB | 🔴 State + all business logic |
| `accountingService.ts` | 17.7 KB | 🔴 Financial + ledger + snapshots |
| `financeService.ts` | 6.9 KB | 🟠 Receipts + invoices + reconciliation |
| `App.tsx` | ~6 KB | 🟠 All routes + error boundaries |

### Over-Engineering Areas

1. **Facade Pattern (3 layers)**
   - UI → Context → Services → Supabase
   - **Better:** UI → Services → Supabase (direct)

2. **Query Hooks vs Custom Hooks**
   - `useDataQueries/` + `useContractQueries` + custom hooks
   - **Better:** Single `useData()` hook

3. **Financial Logic Spread**
   - `accountingService` (ledger entries)
   - `financeService` (receipts/invoices)
   - `snapshotService` (monthly snapshots)
   - **Better:** Single `useFinance()` module

4. **Type Definition Split**
   - `src/types.ts` (777 lines) + `src/types/*`
   - **Better:** Single `types.ts` file (under 500 lines)

---

## 3. CLEAN ARCHITECTURE TARGET

### Simplified Structure

```
src/
├── modules/                    # Core business logic only
│   ├── auth/                  # Authentication + session
│   │   ├── auth.ts            # Login, logout, signup
│   │   └── auth.types.ts      # User, Session types
│   │
│   ├── properties/            # Properties + Units + Owners
│   │   ├── properties.ts
│   │   ├── units.ts
│   │   └── types.ts           # Single types file per module
│   │
│   ├── contracts/             # Contracts + Tenants
│   │   ├── contracts.ts
│   │   └── types.ts
│   │
│   ├── finance/               # All financial logic
│   │   ├── ledger.ts          # Journal entries
│   │   ├── receipts.ts        # Receipt posting
│   │   ├── invoices.ts        # Invoice generation
│   │   ├── accounting.ts      # GL + reconciliation
│   │   └── types.ts           # Unified finance types
│   │
│   └── maintenance/           # Maintenance requests
│       └── maintenance.ts
│
├── lib/                       # Shared utilities (NO abstraction)
│   ├── supabase.ts           # Single Supabase client
│   ├── format.ts             # Date, currency formatting
│   ├── validate.ts           # Input validation
│   └── logger.ts             # Unified logging
│
├── hooks/                     # React hooks (state + fetching)
│   ├── useAuth.ts            # Auth state
│   ├── useData.ts            # Data fetching (replaces all query hooks)
│   ├── useForm.ts            # Form state
│   └── useUI.ts              # UI state (modals, notifications)
│
├── ui/                        # Simple UI components
│   ├── pages/                # Page components (lazy loaded)
│   │   ├── Dashboard.tsx
│   │   ├── Properties.tsx
│   │   ├── Contracts.tsx
│   │   ├── Finance.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   │
│   └── components/           # Reusable UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Table.tsx
│       ├── Modal.tsx
│       └── ... (15 basic components)
│
├── types/                     # Global types
│   └── index.ts              # Single unified types file
│
└── App.tsx                   # Root + routing only
```

### Key Principles

1. **Flat Services** — No nested dependencies
   ```
   ✅ UI → Service → Supabase
   ❌ UI → Service → Facade → Service → Supabase
   ```

2. **Single Hook per Domain**
   ```
   ✅ useAuth(), useData(), useForm(), useUI()
   ❌ useAuthCore + useAuthQueries + useAuthState
   ```

3. **No Abstraction for MVP**
   ```
   ✅ Button, Input, Modal (basic HTML5 + Tailwind)
   ❌ Design system + Atomic design + Storybook
   ```

4. **Unified Types**
   ```
   ✅ /src/types/index.ts (all types in one file, <500 LOC)
   ❌ /src/types/* scattered across folders
   ```

---

## 4. MODULE MAPPING (OLD → NEW)

| Old Path | New Path | Action | Complexity |
|----------|----------|--------|-----------|
| `src/services/authService.ts` | `src/modules/auth/auth.ts` | Simplify (remove Facade) | 🟢 |
| `src/hooks/useAuthCore.tsx` | `src/hooks/useAuth.ts` | Consolidate | 🟢 |
| `src/services/supabaseDataService.ts` | Delete (move to individual modules) | Decompose (26KB → 4 modules) | 🔴 |
| `src/services/financeService.ts` | `src/modules/finance/` | Split into: ledger, receipts, invoices, accounting | 🔴 |
| `src/services/accountingService.ts` | `src/modules/finance/accounting.ts` | Merge with financeService | 🟠 |
| `src/services/snapshotService.ts` | `src/modules/finance/snapshots.ts` | Keep (KPI snapshots) | 🟢 |
| `src/hooks/useAppCoreImpl.tsx` | Delete | Move logic to useData + module services | 🔴 |
| `src/services/operationsService.ts` | `src/modules/contracts/operations.ts` | Keep (contract renewal) | 🟢 |
| `src/services/reportsService.ts` | `src/modules/finance/reports.ts` | Simplify reporting | 🟡 |
| `src/types.ts` (777 LOC) | `src/types/index.ts` (400 LOC) | Consolidate + remove unused | 🟠 |
| `src/contexts/AppContext.tsx` | Delete | Use React hooks directly | 🔴 |
| `src/domain/facades/*` | Delete | Move logic to module services | 🔴 |
| `src/design-system/` | `src/ui/components/` (10 basic components) | Remove: marketplace, themes, atoms system | 🔴 |

---

## 5. SIMPLIFIED DATA MODEL

### Current DB: 56 migrations, complex RLS

### Target DB: 15 essential tables

```sql
-- Core Tables
users                    -- Auth users (Supabase managed)
profiles                 -- User profiles + settings
organizations            -- Multi-tenant support

-- Property Management
properties               -- Buildings/complexes
units                    -- Apartments/units
owners                   -- Property owners
tenants                  -- Renters

-- Contracts & Agreements
contracts                -- Lease agreements
contract_items           -- Rent, utilities, deposits

-- Financial
invoices                 -- Monthly invoices to tenants
payments/receipts        -- Payment records
general_ledger           -- Accounting entries
account_chart            -- Chart of accounts

-- Operations
maintenance_requests     -- Maintenance tickets
audit_log               -- Activity tracking
```

### Removed Complexity

| Feature | Current | Reason to Remove |
|---------|---------|-----------------|
| Soft deletes (16 migrations) | Multiple triggers + is_deleted columns | Replace with logical delete in UI |
| Ledger snapshots | Complex monthly rebuild | Simplify: calculate on-demand |
| Commission tracking | Separate module + RPC | Include in contract line items |
| Advanced RLS policies | 20+ policies per table | Simplify: org_id + user_role (2 policies) |
| Multi-tenant themes | Design-system marketplace | Remove: one theme, one brand |

---

## 6. BUSINESS LOGIC EXTRACTION

### Core Logic to Keep (Nothing Else)

#### Auth Module
```typescript
// src/modules/auth/auth.ts
export async function loginUser(email: string, password: string) { }
export async function logoutUser() { }
export async function getCurrentUser() { }
export async function resetPassword(email: string) { }
```

#### Finance Module
```typescript
// src/modules/finance/ledger.ts
export async function postJournalEntry(entry: JournalEntry) { }
export async function getAccountBalance(accountId: string, date: Date) { }

// src/modules/finance/receipts.ts
export async function postReceipt(receipt: Receipt) { }
export async function voidReceipt(receiptId: string) { }

// src/modules/finance/invoices.ts
export async function generateMonthlyInvoices(month: Date) { }
export async function getInvoiceDetail(invoiceId: string) { }

// src/modules/finance/accounting.ts
export async function reconcileAccounts(period: Date) { }
export async function getTrialBalance(date: Date) { }
```

#### Contracts Module
```typescript
// src/modules/contracts/contracts.ts
export async function createContract(contract: Contract) { }
export async function renewContract(contractId: string) { }
export async function terminateContract(contractId: string) { }
```

---

## 7. UI STRATEGY

### Pages (20 CRUD screens max)

```
Dashboard                 -- KPIs, quick links
Properties                -- List, add, edit properties
Units                      -- List units per property
Tenants                    -- List, add, edit tenants
Contracts                  -- List, renew, terminate
Invoices                   -- List, generate, send
Payments                   -- Record payments, track AR
Ledger                     -- GL entries, audit trail
Reports                    -- Trial balance, income statement
Maintenance               -- Requests, assign, close
Settings                  -- App config, integrations
Users                      -- Admin user management
```

### Components (15 simple ones)

No design system. Just HTML5 + Tailwind.

```
Button              -- Primary, secondary, danger
Input               -- Text, email, number, date
Select              -- Dropdown, multi-select
Textarea            -- Long text input
Table               -- Basic table with sorting
Modal               -- Dialog for confirmations
Toast               -- Notifications
Sidebar             -- Navigation
Navbar              -- Top header
Card                -- Section container
Form                -- Helper for form state
Loading             -- Spinner
Error               -- Error message
Empty               -- Empty state
Pagination          -- List pagination
```

---

## 8. REBUILD EXECUTION PLAN

### Phase 0: Setup (Day 1)

- [ ] Create new branch `clean-rebuild`
- [ ] Initialize `/src/modules/` structure
- [ ] Create unified types file
- [ ] Setup logger + utilities

**Deliverable:** Folder structure + types

### Phase 1: Core Services (Days 2–3)

- [ ] Auth module
- [ ] Data access layer (replace supabaseDataService)
- [ ] Finance module (ledger + receipts + invoices)
- [ ] Properties + Units + Owners modules

**Deliverable:** All services implemented + tested

### Phase 2: React Hooks (Day 4)

- [ ] `useAuth()` — User state + login
- [ ] `useData()` — CRUD operations (replaces useDataQueries + all query hooks)
- [ ] `useForm()` — Form validation + submission
- [ ] `useUI()` — Modals, notifications, loading states

**Deliverable:** All hooks functional

### Phase 3: UI Components (Day 5)

- [ ] Build 15 basic components
- [ ] Remove design-system folder
- [ ] Update Tailwind config (no CSS-in-JS)

**Deliverable:** Component library ready

### Phase 4: Page Components (Days 6–7)

- [ ] Build 20 page components
- [ ] Implement routing (React Router)
- [ ] Connect services to UI

**Deliverable:** All pages functional

### Phase 5: Testing & Polish (Day 8)

- [ ] Unit tests (20+ test files)
- [ ] E2E tests
- [ ] Performance audit
- [ ] Accessibility audit

**Deliverable:** Production-ready

---

## 9. QUICK REFERENCE: What to Delete

```
❌ REMOVE COMPLETELY:
   src/contexts/              -- AppContext (use React hooks)
   src/domain/                -- Facades (move to modules)
   src/design-system/         -- Remove marketplace, themes
   src/services/supabaseDataService.ts  -- Decompose
   src/services/appCore*      -- Move to modules
   src/app/layouts/           -- Simplify routing
   supabase/functions/ (non-essential)  -- Keep only: payments, automation

❌ CONSOLIDATE:
   src/hooks/useAppCoreImpl (11KB) → useData + module services
   src/hooks/use*Queries/*    → Single useData() hook
   src/types/* → src/types/index.ts
   src/services/finance* (3 files) → src/modules/finance/

✅ KEEP:
   src/modules/             -- Core business logic
   src/lib/                 -- Utilities
   src/hooks/              -- React hooks (simplified)
   src/ui/                 -- Components + pages
   supabase/migrations/    -- Essential migrations only
```

---

## 10. NAMING CONVENTIONS & CODING STYLE

### Module Organization

```
src/modules/{name}/
  ├── {name}.ts          # Main module exports
  ├── {name}.types.ts    # Types for module
  └── {name}.test.ts     # Unit tests
```

### Naming Rules

```typescript
// Services (functions, no classes)
export async function createProperty(data: PropertyInput): Promise<Property>
export async function updateProperty(id: string, data: Partial<PropertyInput>): Promise<Property>
export async function deleteProperty(id: string): Promise<void>

// Hooks (start with "use")
export function useAuth() { }
export function useData<T>() { }
export function useForm<T>(initialData: T) { }

// Types (PascalCase, -Input/-Output suffix for DTO)
interface Property { id: string; name: string }
interface PropertyInput { name: string; address: string }
type PropertyId = string & { readonly __brand: "PropertyId" }

// Constants (UPPER_SNAKE_CASE)
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const DEFAULT_SORT_ORDER = "DESC";

// Private functions (_prefix for internal utils)
function _formatCurrency(amount: number): string { }
```

### Code Style

```typescript
// ✅ Simple, functional, one responsibility
export async function postReceipt(receipt: Receipt) {
  const { error } = await supabase.from('receipts').insert(receipt);
  if (error) throw error;
  return receipt;
}

// ❌ Avoid: Over-abstraction
class ReceiptManager {
  constructor(private db: Database) { }
  async post(receipt: Receipt): Promise<ReceiptResponse> { }
}

// ✅ Direct module dependencies
import { postJournalEntry } from '@/modules/finance/ledger';

// ❌ Avoid: Through facades
import { financeFacade } from '@/domain/finance';
```

### Folder Rules

1. **One module per folder**
2. **One responsibility per file**
3. **All types in {name}.types.ts**
4. **All tests in {name}.test.ts**
5. **Index.ts only for barrel exports**

---

## 11. METRICS & SUCCESS CRITERIA

### Before → After Comparison

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Source Files | 192 | 85 | -56% |
| Source Size | 1.2 MB | 0.4 MB | -67% |
| Services | 17 | 8 | -53% |
| Hooks | 13 | 4 | -69% |
| Pages | 20 | 20 | Same |
| Components | 40+ | 15 | -63% |
| TypeScript Strict | ✅ | ✅ | 100% |
| Test Coverage | 1.6% | 30% | +1800% |
| Bundle Size (gzip) | ~180 KB | ~95 KB | -47% |
| Build Time | 45s | 20s | -56% |

### Success Criteria (All must pass)

- [ ] TypeScript `tsc --noEmit` passes with 0 errors
- [ ] All business logic tests pass (20+ test files)
- [ ] E2E tests pass (5 core user journeys)
- [ ] Bundle size < 100 KB gzip
- [ ] Lighthouse score > 90 (mobile)
- [ ] All 20 pages functional
- [ ] No console.log statements (use logger)
- [ ] Code coverage > 30% (core logic)

---

## 12. RISK MITIGATION

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Lose financial logic | 🟠 Medium | Keep all ledger logic, write unit tests |
| Forget edge cases | 🟠 Medium | Create test matrix (200+ test cases) |
| Performance regression | 🟡 Low | Benchmark before/after on 100K records |
| Data migration errors | 🔴 High | Test migration scripts on staging DB |
| User confusion (breaking UI) | 🟠 Medium | Keep similar UX, add help text |

---

## 13. ROLLBACK PLAN

If rebuild fails after Phase 4:

1. Keep current production deployment live
2. Test new build on staging for 1 week
3. Parallel deployment on Vercel preview
4. Gradual traffic migration (10% → 25% → 50% → 100%)
5. Monitor error rates, performance for 24 hours
6. Rollback to current version if issues detected

---

## 14. NEXT STEPS

### For Next Model (Implementation Phase)

1. **Read this document carefully**
2. **Follow Phase 0–5 in exact order**
3. **Do NOT deviate from structure**
4. **Use provided naming conventions**
5. **Write tests as you code**
6. **Commit after each phase**

---

## APPENDIX: File-by-File Action Items

### Delete Entirely
- `src/contexts/AppContext.tsx`
- `src/domain/` (all facades)
- `src/design-system/` (except basic components)
- `src/services/appCore*`
- `src/app/layouts/` (simplify)
- `src/hooks/useAppCoreImpl.tsx`

### Decompose & Distribute
- `src/services/supabaseDataService.ts` (26 KB) → Individual module files
- `src/services/financeService.ts` → `src/modules/finance/` (4 files)
- `src/types.ts` → `src/types/index.ts` (consolidate)

### Simplify & Keep
- `src/services/authService.ts` → `src/modules/auth/auth.ts` ✅
- `src/services/operationsService.ts` → `src/modules/contracts/` ✅
- `src/services/snapshotService.ts` → `src/modules/finance/snapshots.ts` ✅

---

**END OF PLAN**

---

*This document is a blueprint for simplifying Rentrix from 1.2 MB to 0.4 MB while keeping all critical business logic. The next model will use this plan to implement the clean rebuild.*

