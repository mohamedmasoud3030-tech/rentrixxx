# Rentrix Agent Workflows

Choose one primary workflow before editing. Keep each task narrow and map it to `docs/RENTRIX_MASTER_PLAN.md`.

Read first:

```text
AGENTS.md
docs/ai/ONBOARDING.md
docs/RENTRIX_MASTER_PLAN.md
docs/ai/AGENT_CAPABILITIES.md
```

Use `.codex/vendor/addy-agent-skills/skills/using-agent-skills/SKILL.md` to select only the task-relevant skills.

## Roadmap continuation

Use when the user expresses an intent to continue, resume, proceed, or finish the next step. Do not depend on one literal keyword.

1. Inspect current `main`, open roadmap PRs, and latest verification evidence.
2. Find the earliest release in `docs/RENTRIX_MASTER_PLAN.md` that is not closed.
3. Select the first `READY` item in that release.
4. Load the applicable skills from `docs/ai/AGENT_CAPABILITIES.md`.
5. Implement one narrow PR slice.
6. Run fresh verification appropriate to that slice.
7. Review the final diff for unrelated changes.
8. Update roadmap evidence and state the next item.
9. After a release gate closes, advance to the next release on the next continuation cycle.

Stop and report the exact blocker when a product decision, explicit environment approval, access boundary, or unresolved verification failure prevents safe progress.

## Repository audit

Use for broad inspection without feature work.

1. Inspect the root with `rg --files` when available.
2. Map runtime, legacy, migrations, RLS, routes, services, tests, environment handling, build scripts, skills, and generated support.
3. Classify findings as blocker, safe cleanup, restore candidate, deferred item, verified area, or product decision.
4. Read `docs/ROOT_LAYOUT.md` and `docs/reconciliation/02-root-cleanup-candidates.md` before proposing removal.
5. Do not delete risky files or add features.

## Safe bug fix

1. Reproduce or trace the defect from actual code.
2. Identify the smallest root cause.
3. Modify the narrowest safe surface.
4. Add or update a targeted regression test.
5. Run targeted verification and the relevant full gate.
6. Review the final diff.

Use Matt `diagnose`, Addy debugging and test workflows, and Superpowers `verification-before-completion` when available locally.

## Frontend page completion

1. Confirm the route is active or explicitly approved for recovery.
2. Read `.agent-skills/rentrix-build-web-apps/SKILL.md`.
3. Read `.agents/skills/ui-ux-pro-max/SKILL.md` for visual or interaction changes.
4. Read `.agents/skills/vercel-react-best-practices/SKILL.md` for React work.
5. Use current TanStack Router, React Query, Supabase services, i18n, RTL, and component patterns.
6. Check Arabic RTL, English LTR, mobile layout, loading, empty, error, retry, and null-relation states.
7. Run targeted tests and the full gate.

## Supabase migration or RLS review

1. Read the active migration chain and affected domain rules.
2. Read `.agents/skills/connector-operator/SKILL.md` before connector actions.
3. Map affected tables, RPCs, auth boundaries, grants, and policies.
4. Keep changes conservative, versioned, and preview-first.
5. Add business-rule coverage.
6. Run approved validation when the required environment is available.

## Safe root cleanup

Use only for `safe-delete-proven` items listed in `docs/reconciliation/02-root-cleanup-candidates.md`.

1. Prove the item is not a runtime import, build input, workspace package, migration dependency, deployment input, script dependency, or required documentation target.
2. Remove only the approved safe candidate set.
3. Update ignore rules for generated metadata.
4. Do not combine deletion with archive moves, feature work, or broad refactors.
5. Run search verification, `git diff --check`, and the full CI gate.

## Release check

1. Read `docs/ai/release-policy.md` and the active gate in `docs/RENTRIX_MASTER_PLAN.md`.
2. Read Superpowers `verification-before-completion` before claiming success.
3. Run the full GitHub Actions-equivalent gate.
4. Review routes, visible pages, hidden registered routes, database boundaries, mobile, RTL, LTR, receipt printing, and PWA evidence relevant to the release.
5. Use `.agents/skills/connector-operator/SKILL.md` for connector checks.
6. Report exact results, blockers, changed files, environment impact, residual risks, and commit SHA.
