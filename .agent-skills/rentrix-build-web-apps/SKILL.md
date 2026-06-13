---
name: rentrix-build-web-apps
description: >
  Canonical operating skill for all Rentrix coding agents. Use this skill for
  ANY task touching the Rentrix codebase: UI pages, Supabase migrations, RLS,
  RPCs, routing, forms, modals, sidebar, mobile layout, print, file upload,
  design system, reports, settings, or owner pages. Load this skill before
  reading any other file. It defines the repo layout, the active bug list,
  the product backlog, and the execution rules that replace all old PHASE_*.md
  and audit documents.
---

# Rentrix Agent Skill

**Version:** 2.0 — 13 June 2026  
**Canonical source:** `.agent-skills/rentrix-build-web-apps/SKILL.md`  
Read `AGENTS.md` first, then this file, then `docs/RENTRIX_MASTER_PLAN.md`.

---

## 1. Repo layout (runtime boundary)

```
artifacts/rentrix/src/     ← Active React 19 / TypeScript / Vite app
  features/                ← One folder per domain
  layouts/                 ← app-shell.tsx, layout-navigation-view.tsx
  routes/                  ← TanStack Router route files
  components/ui/           ← Shared primitives (button, dialog, card …)
  services/                ← PDF, documents
lib/                       ← Shared workspace packages
supabase/migrations/       ← 44 canonical migrations (sequential)
```

Never import anything from `.agents/`, `.codex/`, `.agent-skills/` into `src/`.

---

## 2. Active confirmed bugs (P0 — blocks real usage)

These were confirmed by the product owner through mobile testing on the live app.
Fix these before any new feature work.

### 2.1 Cannot write to the database from any page
**Symptom:** Forms submit but no row is saved; no visible error to the user.  
**Likely causes:**
- RLS `INSERT` / `UPDATE` policies missing or using `auth.uid() IS NOT NULL` instead of `app_private.is_app_user()`
- Service functions calling Supabase without `await` or swallowing errors silently
- Missing `.select()` after `.insert()` causing silent Supabase no-op  
**Files to inspect first:**
- `artifacts/rentrix/src/features/*/services/*.ts` — check all `.insert()` / `.update()` calls
- Supabase Dashboard → Table Editor → RLS policies for tables: `contracts`, `invoices`, `receipts`, `expenses`, `maintenance_requests`, `people`, `units`, `properties`, `owners`
**Fix rule:** every service mutation must `await`, `.select()`, check `.error`, and `throw` on failure.

### 2.2 Owners page not visible in sidebar
**Symptom:** User navigates to `/owners` but the link is absent or the page is blank.  
**Root cause:** `app-nav-items.ts` has `/owners` and `/owners-hub` as separate entries both requiring `owners.hub.view` permission. On mobile the drawer may not render the full group.  
**Fix:** Consolidate into a single `/owners` entry. Remove `/owners-hub` from visible nav (keep route registered). Confirm `permissions.ts` grants `owners.hub.view` to `ADMIN` and `MANAGER`.

### 2.3 No input modals — forms open as full pages
**Symptom:** Adding a property, person, contract etc. navigates away instead of opening a modal/drawer.  
**Expected UX:** Tapping "Add" opens a `<Dialog>` or `<BottomSheet>` overlay. User fills form, saves, and stays on the list page.  
**Affected flows:** Properties, People, Tenants, Owners, Units, Expenses, Maintenance requests  
**Implementation:** Use existing `components/ui/dialog.tsx` and `components/ui/bottom-sheet.tsx`. Extract form into `*-form-modal.tsx` component. Connect to existing mutation hooks.

---

## 3. P1 backlog (important — do in order)

### 3.1 Sidebar refactor
- Remove `/owners-hub` duplicate entry
- Add missing pages: `/maintenance`, `/audit-log`, `/data-integrity`, `/system` (already registered, hidden — add to nav with ADMIN-only guard)
- Group order: Overview → Property Ops → Finance → Governance
- Mobile drawer: ensure all groups render; currently truncates on small screens

### 3.2 Financial pages polish
**Status:** `IN PROGRESS` after PR #864.

Completed:
- `FinancialsPage` (`/financials`): hub tabs and direct page links added
- `ExpensesPage` (`/expenses`): category filter labels, empty state, and CSV export added

Remaining:
- `InvoicesPage` (`/invoices`): add "Generate Invoice" modal polish
- `ReceiptsPage` (`/receipts`): polish void action (ADMIN/MANAGER only), receipt number search, and print button per row

### 3.3 Reports page — complete content
- Currently shows charts but some sections return empty arrays
- Wire `useAgedReceivablesReport`, `useDailyCollectionReport`, `useFinancialCashflowReport` to real data
- Add date-range picker that updates all reports simultaneously
- Add "Export CSV" per report section
- Add loading skeletons per section (not one global spinner)

### 3.4 Owner pages — build missing content
- `/owners` list: confirm `OwnersPage.tsx` loads; add search, summary cards (total owners, linked properties)
- `/owners/:ownerId` detail: `owner-detail-view.tsx` — add linked properties list, active contracts count, outstanding balance
- Owner form modal: Add / Edit owner in a `<Dialog>`, not a full page navigation

### 3.5 Settings page — complete content
- Currently has: currency, locale, timezone, date format, company name
- Missing: company logo upload, contract serial prefix, default VAT rate, notification preferences
- Add "Save" confirmation toast, unsaved-changes guard on navigation

---

## 4. P2 polish backlog

### 4.1 Visual consistency (design system)
- All pages must use: `<Card>` wrapper, `<EmptyState>` for zero-data, `<Skeleton>` during load, `<StatusBadge>` for status values
- Buttons: primary actions use `variant="default"`, destructive use `variant="destructive"`, secondary use `variant="outline"`
- Typography: page titles `text-2xl font-black`, section headers `text-sm font-black tracking-wide text-muted-foreground`
- RTL-first: all `flex` containers use `gap-*` not `mr-*`/`ml-*`; all icons before text in LTR, after text in RTL

### 4.2 Magic touches & micro-interactions
- Sidebar nav items: active state highlight already works; add hover tooltip showing description when collapsed
- Dashboard KPI cards: add trend arrow (up/down vs last month) — calculate from existing report data
- Receipt cards: add "tap to expand" for allocation details
- Form fields: auto-focus first field on modal open; Tab key cycles correctly in RTL

### 4.3 Print support
- `ReceiptDetailPage` — already has `createReceiptPrintHref`; wire to `<button onClick={() => window.print()}>` with print-specific CSS class `print:block`
- Add `@media print` styles in `globals.css`: hide sidebar, hide nav, show document content only
- Invoice print: same pattern as receipt

### 4.4 File upload & attachments
- Add `<input type="file">` to: Maintenance requests (attach photo), Contract form (attach signed PDF), Expense form (attach receipt image)
- Upload to Supabase Storage bucket `attachments` (create if missing)
- Show thumbnail preview after upload; store `storage_path` in respective table column
- Add column `attachment_url text` to `maintenance_requests`, `contracts`, `expenses` via migration if missing

### 4.5 Mobile-specific issues
- Bottom nav: 5 items — Dashboard, Properties, Contracts, Financials, Arrears (current). Consider swapping Arrears for Owners or a "+" quick-add FAB
- Forms on mobile: all `<Input>` fields must be `min-h-12` for touch targets; `<Select>` must use native picker on mobile
- Tables on mobile: convert to card list view below `sm:` breakpoint (use `hidden sm:table` / `sm:hidden` pattern)
- Modals on mobile: use `<BottomSheet>` instead of centered `<Dialog>` for all forms

---

## 5. Execution rules for agents

### Before ANY change
1. Read `AGENTS.md` → this file → `docs/RENTRIX_MASTER_PLAN.md`
2. Run `rg --files artifacts/rentrix/src` to understand current file layout
3. Load only task-relevant skills from `docs/ai/AGENT_CAPABILITIES.md`
4. Check open PRs before creating a branch

### Branch & PR discipline
- One branch = one backlog item (e.g. `fix/database-write-rls`, `feat/owner-form-modal`)
- Branch from latest `main`
- PR title format: `fix(scope): description` or `feat(scope): description`
- PR must state: files changed, behavior changed, what was NOT changed, test evidence

### Database change rules
- All schema changes go through `supabase/migrations/` — never edit tables directly
- Migration name format: `YYYYMMDDHHMMSS_description.sql`
- Every new RLS policy must use `app_private.is_app_user()` not `auth.uid() IS NOT NULL`
- Every SECURITY DEFINER function must have `SET search_path = public, pg_temp`
- Test RPC calls from the browser console before closing a migration PR

### Code quality gates (must pass before PR merge)
```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix test
```

### Domain invariants (never break)
- Unit → Property (required)
- Contract → Unit + Tenant (required, no overlap for same unit)
- Payment → Contract (required, no orphan payments)
- Receipt → Posted Payment (required)
- Posted payments are immutable; corrections = void + new
- Outstanding balance: one calculation path only

---

## 6. Component patterns

### Modal form pattern (use for all Add/Edit actions)
```tsx
// features/properties/property-form-modal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function PropertyFormModal({ open, onOpenChange, property }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{property ? 'تعديل العقار' : 'إضافة عقار'}</DialogTitle>
        </DialogHeader>
        {/* form fields */}
      </DialogContent>
    </Dialog>
  );
}
```

### Service mutation pattern (use for all writes)
```ts
// Always: await + .select() + error check
const { data, error } = await supabase
  .from('properties')
  .insert(payload)
  .select()
  .single();

if (error) throw new Error(error.message);
return data;
```

### Empty state pattern
```tsx
import { EmptyState } from '@/components/empty-state';
if (!rows.length) return <EmptyState title="لا توجد عقارات" description="أضف عقارك الأول" />;
```

---

## 7. Key file map

| What you need | File |
|---------------|------|
| Sidebar nav items | `src/layouts/app-nav-items.ts` |
| Sidebar shell | `src/layouts/app-shell.tsx` |
| Route tree | `src/routeTree.ts` |
| Permissions | `src/features/auth/permissions.ts` |
| Supabase client | `src/integrations/supabase/client.ts` |
| DB types | `src/types/database.ts` |
| Domain types | `src/types/domain.ts` |
| Money formatting | `src/lib/formatters.ts` |
| i18n labels | `src/lib/i18n.ts` |
| UI store | `src/store/ui-store.ts` |

---

## 8. Supabase project reference

```
Live project:      RENTRIX EGY — nnggcnpcuomwfuupupwg
Prohibited:        rentrix (V2) — ktmizdznbdwvalmmfvfc  ← NEVER touch
```

All 4 atomic RPCs are now `SECURITY DEFINER` with `search_path = public, pg_temp`:
- `post_receipt_atomic` ✅
- `record_invoice_payment_atomic` ✅  
- `renew_contract_atomic` ✅
- `void_receipt_atomic` ✅
