# WhatsApp and Communications Schema Design

## Purpose

This design covers recovery-plan step **12. WhatsApp/communications schema design**. It defines the minimum durable data model needed before adding WhatsApp composer UI, templates, communication logs, bulk reminders, or external messaging integrations.

This is a design-only PR. It does not add migrations, routes, UI, Supabase services, or outbound messaging behavior.

## Scope confirmation

In scope:

- Define the v1 communications schema direction.
- Keep WhatsApp click-to-chat and future provider sends auditable.
- Preserve Rentrix v1 project-level customer isolation.
- Identify blockers for the next service/hooks/UI foundation PR.

Out of scope:

- Supabase migrations.
- WhatsApp Business API integration.
- Bulk-send execution.
- Report, arrears, invoice, receipt, PDF, or ledger changes.
- Phone-number normalization implementation.

## Current state

Current app code does not expose a communications feature. Recovery audits identify legacy references for:

- WhatsApp reminder service behavior.
- WhatsApp composer modal behavior.
- A communication hub surface.

Those legacy files remain reference-only because they depend on legacy architecture. Current implementation should use TanStack Router, React Query, Supabase service modules, and current UI components.

## Recommended v1 tables

### `communication_templates`

Stores reusable message templates for Arabic/English reminders and operational messages.

Recommended columns:

```text
id uuid primary key
name text not null
channel text not null default 'whatsapp'
language text not null default 'ar'
category text not null
subject text null
body text not null
variables jsonb not null default '[]'
is_active boolean not null default true
created_at timestamptz not null
updated_at timestamptz not null
```

Recommended constraints:

- `channel in ('whatsapp', 'sms', 'email', 'phone', 'note')`.
- `language in ('ar', 'en')`.
- `category` should use a small controlled set such as `arrears_reminder`, `invoice_notice`, `receipt_notice`, `contract_notice`, `maintenance_notice`, and `general`.
- `body` must be non-blank.

### `communication_logs`

Stores one durable communication event per attempted contact or internal note.

Recommended columns:

```text
id uuid primary key
channel text not null
status text not null default 'draft'
direction text not null default 'outbound'
recipient_name text null
recipient_phone text null
recipient_email text null
message_body text not null
template_id uuid null references communication_templates(id)
related_entity_type text null
related_entity_id uuid null
provider text null
provider_message_id text null
sent_at timestamptz null
failed_at timestamptz null
failure_reason text null
created_at timestamptz not null
updated_at timestamptz not null
```

Recommended constraints:

- `channel in ('whatsapp', 'sms', 'email', 'phone', 'note')`.
- `status in ('draft', 'queued', 'sent', 'failed', 'cancelled')`.
- `direction in ('outbound', 'inbound', 'internal')`.
- `message_body` must be non-blank.
- `related_entity_type` should be nullable and controlled by services initially: `person`, `tenant`, `contract`, `invoice`, `payment`, `receipt`, `property`, `unit`, `maintenance_request`, `arrears_case`, or `owner`.

## Isolation and RLS

Rentrix v1 customer isolation remains physical/project-level through dedicated Supabase projects/environments. Do not add `company_id` as the primary communications isolation mechanism for v1.

Recommended RLS for v1 should match the current authenticated-per-project pattern used by nearby feature tables until a broader membership model is introduced.

## Phone and template rules

1. Do not send or log WhatsApp messages without a recipient phone value.
2. Normalize phone numbers in services before generating external `wa.me` URLs.
3. Allow only safe `https://wa.me/` outbound links for click-to-chat UI.
4. Store the rendered message body in `communication_logs` so logs remain auditable if a template changes later.
5. Keep templates language-aware; Arabic should be the default, English must remain possible.
6. Do not put balance calculations inside the communications module. Arrears, invoice, or statement services should provide already-calculated values.

## First implementation slice after this design

Recovery-plan step **13. Communication logs/templates service/hooks/UI foundation** should be the next implementation PR and should remain small:

- Add the approved migration for `communication_templates` and `communication_logs` only if explicitly proceeding from this design.
- Update handwritten database types if migrations are added.
- Add Supabase service helpers for listing templates and inserting logs.
- Add React Query hooks for templates/logs.
- Add a read-only/safe foundation UI or route placeholder that does not send messages.

## Deferred work

- WhatsApp Business API provider integration.
- Bulk sending and throttling.
- Message delivery webhooks.
- Per-user communication permissions.
- Rich document/PDF attachments.
- Owner/tenant statements as message attachments.
- Global cross-company communication dashboards.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Sending messages with incorrect balances. | Communications consume calculated report rows; they do not calculate balances. |
| Template edits changing historical meaning. | Store rendered `message_body` on every log. |
| Unsafe external URLs. | Services should generate only validated `https://wa.me/` links. |
| Duplicate architecture from legacy code. | Use legacy only as reference; implement through current Supabase services and React Query hooks. |
