# Rentrix

Rentrix is an Arabic-first, mobile-first, single-office property operations system for managing the operational property lifecycle: office, owners, owner agreements, properties, units, tenants, lease contracts, invoices, payments/receipts, expenses, owner settlements, and operational reporting.

Rentrix is not a legal-title registry, property marketplace, multi-tenant SaaS product, sale/purchase valuation system, or a general ledger.

## Start here

**Canonical documents:**

1. `docs/FINAL_PRODUCT_BLUEPRINT.md` — canonical product and business blueprint
2. `docs/RENTRIX_MASTER_PLAN.md` — official execution roadmap and phase gates
3. `docs/RUNTIME_TRUTH_AND_GAPS.md` — source-of-truth hierarchy, verified runtime snapshot, and known contradictions
4. `docs/ai/CURRENT_EXECUTION_CONTEXT.md` — current execution state and next phase context

**Then read in this order:**

1. `AGENTS.md`
2. `README.md`
3. `docs/ai/ONBOARDING.md`
4. `docs/ai/AGENT_OPERATING_PROTOCOL.md` or `docs/ai/CLAUDE_AGENT_GUIDE.md`

## Documentation authority

Use this hierarchy when documents, code, generated types, and prior audits disagree:

1. Verified live Supabase metadata, timestamped and treated as runtime truth.
2. Current remote `main` code and migration history.
3. Generated TypeScript database contract.
4. Older product documents, previous audits, and agent reports.

If sources conflict, do not invent a resolution. Record the contradiction and defer its fix to the owning phase in `docs/RUNTIME_TRUTH_AND_GAPS.md` and `docs/RENTRIX_MASTER_PLAN.md`.

## Docs map

**Authoritative sources:**

- `docs/FINAL_PRODUCT_BLUEPRINT.md`
- `docs/RENTRIX_MASTER_PLAN.md`
- `docs/RUNTIME_TRUTH_AND_GAPS.md`
- `docs/ai/CURRENT_EXECUTION_CONTEXT.md`

**Navigation & reference:**

- `docs/INDEX.md`
- `docs/ROADMAP.md`
- `docs/ROOT_LAYOUT.md`
- `docs/ai/ONBOARDING.md`
- `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`
- `docs/ai/V05_COMMERCIAL_HARDENING_PREP.md`
- `docs/ai/REPORTING_DEFINITIONS.md`
- `docs/ai/GIT_TOOLING_POLICY.md`
- `docs/ai/domain-rules.md`
- `docs/ai/engineering-policy.md`
- `docs/ai/security-policy.md`
- `docs/ai/release-policy.md`
- `docs/ai/testing-guide.md`

Historical material remains useful, but it is lower authority than verified runtime truth, current `main`, and the generated database contract. Where older documentation said owner settlement, payout, or office profitability were permanently out of scope or awaiting a product decision, those statements are now superseded by the Phase 1 product decision: settlement and profitability are part of the target product, though not yet fully implemented.

## Canonical runtime

```text
rentrix-app/
```

Shared workspace libraries live under `lib/`, and canonical database assets live under `supabase/`.

Do not treat recovery notes, promotional artifacts, generated analysis, or agent-tooling folders as active application code.

## Root map

```text
rentrixxx/
├── rentrix-app/                # Active React application
├── lib/                        # Shared workspace libraries
├── supabase/                   # Canonical migrations and backend assets
├── docs/                       # Active product, engineering, policy, and technical references
├── scripts/                    # Repository automation helpers
├── .github/                    # CI and pull-request governance
├── .ai/                        # Rentrix-specific agent workflows
├── .agent-skills/              # Rentrix-owned reusable agent skills
├── .agents/                    # Installed/shared agent tooling and plugin metadata
└── .codex/vendor/              # Source-locked upstream skills and plugins
```

See `docs/ROOT_LAYOUT.md` for retention rules, dependency direction, and root-folder ownership.

## Product boundary summary

Approved target lifecycle:

```text
Office + Owner + Property Operating Agreement -> Property -> Unit -> Tenant -> Lease Contract -> Invoice -> Payment/Receipt -> Expense -> Owner Settlement -> Reports / Office Profitability
```

Current product decisions include:

- one operational owner per property at a time;
- time-bound owner agreements with historical retention;
- two operating models: `property_management` and `master_lease`;
- future financial support for fixed fee, rate, or combined terms; invoiced-versus-collected basis; expense responsibility; settlement cadence; amendments, renewal, and audit history;
- manager approval for sensitive actions;
- current live role enum remains `ADMIN`, `MANAGER`, `USER`.

These are approved product decisions. They are not all fully implemented yet.

## Local setup

Use pnpm only:

```bash
pnpm install --frozen-lockfile
```

Run the application:

```bash
pnpm --filter ./rentrix-app run dev
```

## Verification

For runtime pull requests, use the current GitHub Actions gate from `.github/workflows/ci.yml`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./rentrix-app run typecheck:test
pnpm --filter ./rentrix-app test
pnpm --filter ./rentrix-app run test:financials
```

For schema or RLS changes, also run the repository-approved Supabase validation flow when a required local or preview Supabase environment is available.

## Product boundaries

- Keep Rentrix single-office.
- Preserve Arabic RTL and English LTR behavior.
- Do not restore legacy `react-router-dom`, `AppContext`, `useApp`, `dataService`, or local database flows into the active app.
- Do not turn `/accounting` into a general ledger.
- Reuse historical code only after deliberate adaptation to the active TanStack Router, React Query, and Supabase architecture.

## Current documentation note

This Phase 1 task is documentation-only. It does not change application behavior, migrations, generated types, Supabase SQL/RLS/functions, tests, CI, dependencies, or runtime product behavior.

## Historical references

Old reports, audits, and previous agent notes remain available through git history. Do not silently copy their conclusions forward when they conflict with verified runtime truth or current product decisions.
