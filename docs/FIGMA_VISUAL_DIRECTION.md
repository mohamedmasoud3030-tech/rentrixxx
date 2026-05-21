# Rentrix old-but-gold — P1-B Figma Visual Direction

## Status

**Phase:** P1-B  
**Status:** active design target  
**Reference:** `https://www.figma.com/design/qjQCQbj2ZVyKADJIztdRcr/Property-Management-Dashboard-UI-Kit---Paperpillar--Community-?m=auto&is-community-duplicate=1&fuid=1441938369831861052`

## Decision

The final Rentrix visual identity should follow the provided **Property Management Dashboard UI Kit — Paperpillar** direction.

The legacy source is still useful for feature/code recovery, but it is **not** the final visual identity.

```txt
current architecture + legacy feature slices + Figma visual direction
```

## Non-negotiable rules

1. Keep `artifacts/rentrix/src` as the production base.
2. Do not rebuild the app from scratch.
3. Do not import from `legacy-src` at runtime.
4. Do not copy legacy visual styling blindly.
5. Do not replace TanStack Router, Supabase Auth, RLS, or the current financial core.
6. Any ported legacy component/page must be adapted to the Figma dashboard style.
7. Arabic/RTL and mobile/PWA responsiveness are first-class requirements.
8. The current sidebar/mobile bottom navigation must remain usable unless replaced by a tested equivalent.

## Current app surfaces inspected

- `artifacts/rentrix/src/layouts/app-shell.tsx`
- `artifacts/rentrix/src/app/dashboard-page.tsx`
- Existing route shell, desktop sidebar, mobile drawer, mobile bottom navigation, dashboard KPI cards, operational panels, tables, and quick actions.

## Target visual language

The Figma target should be translated into Rentrix as:

- clean property-management dashboard layout
- modern sidebar-first desktop shell
- compact mobile navigation
- soft neutral background
- white elevated cards
- rounded large cards and buttons
- clear KPI cards with icon blocks
- strong dashboard hierarchy
- clean table rows with generous spacing
- property/contract/finance data grouped into cards
- restrained accent colors
- consistent Arabic RTL spacing
- responsive grid behavior on mobile/tablet/desktop

## Visual tokens to enforce

### Layout

| Token | Direction |
|---|---|
| App background | soft neutral canvas, not flat pure white |
| Shell | fixed sidebar on desktop, drawer/bottom nav on mobile |
| Page max rhythm | consistent 24px desktop spacing, 12–16px mobile spacing |
| Main cards | large rounded corners, subtle border, soft shadow |
| Dashboard grid | responsive cards, no cramped mobile tables |

### Color intent

| Use | Direction |
|---|---|
| Primary | professional property-management blue/indigo |
| Accent | warm highlight for key actions/alerts |
| Success | green/emerald for paid/active/healthy states |
| Warning | amber/orange for expiring/attention states |
| Danger | rose/red for arrears/blocked/error states |
| Sidebar | deep navy/slate with high contrast text |
| Background | off-white/slate-50 style canvas |

### Typography

| Use | Direction |
|---|---|
| Page title | bold, large, clear Arabic support |
| KPI values | very bold, high contrast |
| Labels | smaller, muted, readable |
| Tables | medium-weight labels, clear action column |

### Components

| Component | Direction |
|---|---|
| Sidebar item | rounded pill/large radius, icon + label, strong active state |
| Button | rounded, clear primary/secondary variants, no cramped actions |
| Card | rounded-2xl/3xl, border, soft shadow, generous padding |
| KPI card | icon block + title + value + short description |
| Table | clean row height, nowrap where needed, horizontal scroll on mobile |
| Empty state | dashed card or soft muted block |
| Status badge | small rounded badge with semantic tone |

## Page redesign priority

### P1-B.1 — Visual Direction Audit

Deliverables:
- this file
- Figma visual target locked as the design source
- current shell/dashboard inspected
- legacy design explicitly demoted to code/feature source only

### P1-C — UI Components Foundation

Port only missing `legacy-src` UI primitives into `src/components/ui`, then restyle them toward this Figma direction.

Priority components:
- tabs
- sheet
- accordion
- tooltip
- dropdown-menu
- popover
- calendar
- command
- scroll-area
- select
- separator

Rules:
- do not duplicate existing primitives
- do not copy legacy styling blindly
- keep shadcn/Tailwind conventions
- keep RTL/mobile behavior

### P2-A — App Shell visual refinement

Refine:
- sidebar spacing and active item polish
- header hierarchy
- mobile drawer polish
- bottom navigation polish
- background canvas

Do not break mobile navigation fixed in earlier PRs.

### P2-B — Dashboard redesign toward Figma

Refine:
- hero summary block
- KPI cards
- arrears panel
- expiring contracts table
- quick actions
- monthly financial panel

No fake data. Use existing dashboard services only.

### P2-C — Core page visual pass

Apply the same system to:
- Properties / Units
- Contracts
- Contract detail
- Financials
- Invoices
- Owners / Tenants
- Settings

### P3 — Branding / Theming

Add or normalize:
- design tokens
- theme presets
- branding config
- appearance settings
- tenant/company theme hooks if safe

## Codex instruction for all future UI work

```txt
Visual design rule:
The final UI must follow the provided Figma reference: Property Management Dashboard UI Kit — Paperpillar.

Use legacy-src only as a code/feature source, not as the final visual identity.
When porting any component/page from legacy, adapt its styling, layout, spacing, cards, sidebar, tables, and visual hierarchy to match the Figma dashboard style.

Do not blindly copy legacy visual design.
Keep current architecture, but move the app visually toward the Figma UI kit.
```

## Completion criteria for P1-B

- Figma visual target documented.
- Legacy visual design explicitly rejected as the target.
- Current shell/dashboard inspected.
- Next implementation stages defined.
- No runtime behavior changed.
- No Supabase/auth/RLS/financial logic changed.
