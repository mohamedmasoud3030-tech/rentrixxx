# Rentrix Agent Operating Playbook

This playbook summarizes repository-specific operating guidance for Codex agents working on Rentrix. It supplements `docs/RENTRIX_MASTER_PLAN.md`, which remains the source of truth for product direction, phase order, architecture constraints, and definition of done.

## Build Web Apps Skill

Use `.agent-skills/rentrix-build-web-apps/SKILL.md` whenever Codex is asked to build, modify, or review Rentrix web UI or application surfaces, including landing pages, dashboard screens, settings screens, properties and units screens, tenant/person screens, contracts screens, financial UI surfaces, shared UI components, responsive layout fixes, and Vercel preview readiness work.

The skill must be used before coding so the agent confirms the active phase, checks the request against `docs/RENTRIX_MASTER_PLAN.md`, inspects existing routes/components/services, reuses established UI and data-access patterns, and avoids forbidden runtime areas or legacy architecture regressions.

The Rentrix build-web-apps skill is inspired structurally by OpenAI's build-web-apps plugin organization, but it is written from scratch for Rentrix. It does not copy plugin content, vendor external repository files, or add runtime dependencies.

The skill is documentation and agent-instruction material only. It is not runtime app code and must not be imported by `artifacts/rentrix`.
