# Database Documentation

## Overview
Rentrix uses PostgreSQL hosted on Supabase. The schema is designed for multi-tenant property management with a focus on financial integrity, auditability, and performance.

## Core Schema Entities

### 1. Identity & Access
| Table | Description |
|-------|-------------|
| `profiles` | Extended user profiles linked to Supabase Auth. |
| `organizations` | The top-level tenant entity. |
| `memberships` | Maps users to organizations with specific roles. |
| `roles` & `permissions` | RBAC (Role-Based Access Control) substrate. |

### 2. Property Management
| Table | Description |
|-------|-------------|
| `owners` | Property owners with commission settings and portal access. |
| `properties` | Physical buildings or land assets. |
| `units` | Individual rentable units within a property. |
| `tenants` | Customer entities (individuals or companies). |
| `contracts` | Lease agreements linking tenants to units. |

### 3. Financial Core
| Table | Description |
|-------|-------------|
| `accounts` | Chart of Accounts (Assets, Liabilities, Income, Expenses). |
| `journal_entries` | Double-entry bookkeeping records. |
| `invoices` | Billing records for rent and other charges. |
| `receipts` | Payment records from tenants. |
| `receipt_allocations` | Links receipts to specific invoices. |
| `owner_settlements` | Periodic payouts to property owners. |

### 4. Enterprise & Security
| Table | Description |
|-------|-------------|
| `financial_events` | Immutable log of all financial mutations. |
| `ledger_hash_chain` | Cryptographic integrity chain for the ledger. |
| `audit_log` | Detailed tracking of user actions and system changes. |
| `platform_api_keys` | Management of external API access. |

## Key Database Features

### Row Level Security (RLS)
Security is enforced at the database level. Most tables have policies similar to:
```sql
CREATE POLICY "Tenant Isolation" ON public.contracts
FOR ALL USING (organization_id = (SELECT current_setting('app.current_tenant_id')::uuid));
```
*Note: The actual implementation uses JWT claims for `tenant_id` for maximum security.*

### Automated Triggers
- **Balance Recalculation**: Triggers on `invoices` and `receipts` automatically update `tenant_balances` and `owner_balances`.
- **Status Management**: Units automatically switch to 'OCCUPIED' when a contract becomes active and 'VACANT' when it expires.
- **Audit Triggers**: Most tables have `after insert/update/delete` triggers that log changes to the `audit_log`.

### Financial Integrity
- **Closed Periods**: The `governance` table stores locked accounting periods. Database functions prevent any back-dated entries into locked months.
- **Idempotency**: RPC functions use `request_id` or `batch_id` to prevent duplicate postings of the same transaction.

## Materialized Views
For high-performance reporting, the system uses Materialized Views:
- `mv_financial_daily_tenant_account`: Aggregated daily balances per tenant.
- `platform_usage_summary`: Monthly API and resource usage metrics.
