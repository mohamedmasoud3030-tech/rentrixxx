# API & Edge Functions Documentation

## Overview
Rentrix utilizes a hybrid API approach:
1. **Supabase RPC**: For atomic database operations and complex business logic.
2. **Edge Functions**: For external integrations (AI, WhatsApp), scheduled tasks, and public API endpoints.
3. **Public REST API**: A secure gateway for third-party integrations.

## Core RPC Functions (Database API)

### Financial Operations
| Function | Description | Key Parameters |
|----------|-------------|----------------|
| `post_receipt_atomic` | Processes a payment, updates invoices, and generates ledger entries. | `p_contract_id`, `p_amount`, `p_date` |
| `renew_contract_atomic` | Handles contract renewal, including deposit carry-over and new invoice generation. | `p_contract_id`, `p_new_end_date` |
| `recalculate_all_balances` | Forces a full sync of tenant, owner, and account balances. | N/A |
| `get_financial_summary` | Returns high-level KPIs (Income, Expenses, AR) for a specific period. | `p_start_date`, `p_end_date` |

### Security & Identity
| Function | Description |
|----------|-------------|
| `platform_authenticate_api_key` | Validates an external API key and returns the associated tenant context. |
| `enforce_api_rate_limit` | Checks and increments rate limit counters for a given actor. |

## Edge Functions

### 1. `automation-scheduler`
The heartbeat of the system. Usually triggered by a CRON job.
- **Tasks**:
  - Generates monthly rent invoices.
  - Calculates and posts late fees.
  - Sends notifications for expiring contracts.
  - Rebuilds reporting snapshots.
- **Endpoint**: `POST /functions/v1/automation-scheduler`

### 2. `assistant-proxy`
The AI integration layer.
- **Provider**: Google Gemini 2.0 Flash.
- **Capabilities**: Real-estate advice, financial analysis, and document summarization.
- **Security**: Gated by `USE_SMART_ASSISTANT` capability and per-user rate limits.

### 3. `public-api`
A RESTful gateway for external systems.
- **Base URL**: `https://<project>.supabase.co/functions/v1/public-api`
- **Authentication**: `X-API-KEY` header.
- **Endpoints**:
  - `POST /receipts`: Submit a new payment.
  - `GET /reports`: Fetch financial reports.
  - `POST /contracts`: Create or update lease agreements.

### 4. `owner-access-token`
Manages secure, passwordless access for property owners.
- **Actions**: `issue` (create token), `verify` (validate token and return portal data).
- **Security**: HMAC-SHA256 signed tokens with configurable TTL.

## Integration Services (Frontend)
The frontend communicates with these APIs via dedicated services in `src/services/`:
- `supabaseDataService.ts`: Generic CRUD operations with snake_to_camel mapping.
- `edgeFunctions.ts`: Typed wrappers for Edge Function calls.
- `accountingService.ts`: High-level wrappers for financial RPCs.
