# Rentrix Agent Onboarding Cleanup — Execution Checklist

This checklist records every requirement requested during the current cleanup sequence. Keep it updated until the Agent Onboarding cleanup PR is ready for review.

## A. Merge sequence requested before onboarding cleanup

- [x] Rebase, verify, and merge the contract-integrity reconciliation originally requested as PR #795.
  - Merged into `main` as squash commit `a585a118f5a28ba3bbcb277c89dbc9eb74277e2b`.
- [x] Review and merge the financial-posting reconciliation originally requested as PR #796.
  - The clean rebase automatically closed #796 while its branch briefly matched `main`.
  - Replacement PR #801 preserved the same documentation-only scope and was merged into `main` as squash commit `0c16f382`.
- [x] Fix the stale auth/RLS document and merge PR #797.
  - Updated live read-only connector evidence and merged into `main` as squash commit `b98f50149c1424d1f2f7171fb58b6dc986dd8b9b`.
- [x] Rebase, fix tests, verify, and merge the constrained-beta navigation cut originally requested as PR #799.
  - The clean rebase automatically closed #799 while its branch briefly matched `main`.
  - Replacement PR #802 preserved the intended scope, updated stale navigation tests, added route-parity coverage to CI, passed the full gate, and merged into `main` as squash commit `ea6b79e6eeb9e5168e73c20ccc990efbc862e85b`.
- [x] Start a separate Agent Onboarding cleanup PR branch.
  - Active branch: `docs/agent-onboarding-cleanup`.

## B. Current application snapshot and onboarding requirements

- [x] Base onboarding documentation on the latest merged application state after #802.
- [x] Add one canonical onboarding file: `docs/ai/ONBOARDING.md`.
- [x] Document the active runtime boundary: `artifacts/rentrix/`, `lib/`, and `supabase/`.
- [x] Document visible constrained-beta desktop navigation.
- [x] Document visible mobile bottom navigation.
- [x] Document registered-but-hidden deferred routes.
- [x] Document `/accounting` as a redirect to `/financials`, not a ledger surface.
- [x] Document the current auth role source and fail-closed behavior.
- [x] Convert `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/README.md`, and `docs/ai/README.md` into short entry points that reference the canonical snapshot instead of duplicating stale reading lists.
- [x] Align `docs/ai/product-scope.md` with the latest constrained-beta visibility decision.
- [x] Record the durable constrained-beta navigation decision in ADR-005.

## C. Final product shape and versioned autonomous execution plan

- [ ] Replace stale `docs/RENTRIX_MASTER_PLAN.md` with one current, versioned execution roadmap.
- [ ] Define the final intended Rentrix product shape clearly.
- [ ] Record the verified current baseline after the latest merged PRs.
- [ ] Define the active release and the exact work required to close it.
- [ ] Define the next release and its scope.
- [ ] Define later ordered releases through the commercial target.
- [ ] Add acceptance gates for every release.
- [ ] Add a continuation protocol: when the user says `اكمل` or `continue`, the agent selects the first incomplete item automatically, loads the relevant skills, implements one narrow PR slice, verifies it, updates roadmap evidence, and advances to the next release when the current release gate is complete.
- [ ] State explicit stop conditions: product decision, live mutation approval, connector/permission blocker, or unresolved failing verification.

## D. Skills, workflows, and project additions

- [x] Inventory the repository-local Rentrix skill: `.agent-skills/rentrix-build-web-apps/SKILL.md`.
- [x] Inventory connector operations skill: `.agents/skills/connector-operator/SKILL.md`.
- [x] Inventory UI/UX skill: `.agents/skills/ui-ux-pro-max/SKILL.md`.
- [x] Inventory React performance skill: `.agents/skills/vercel-react-best-practices/SKILL.md`.
- [x] Inventory optional website audit skill: `.agents/skills/audit-website/SKILL.md`.
- [x] Inventory source-locked OpenAI, Anthropic, and Addy vendor packs.
- [x] Inventory selected additive skills: Superpowers, Matt Pocock, and Agent Almanac references.
- [x] Inventory source-lock files and sync scripts.
- [x] Inventory Understand Anything knowledge-graph support as analysis-only.
- [x] Record that repository search did not find active `ui-audit` or `coze-agent` paths in the current snapshot.
- [x] Add `docs/ai/AGENT_CAPABILITIES.md` with the task-to-skill matrix and mandatory selection rule.
- [ ] Link the capabilities inventory from onboarding, the master plan, and workflow entry points.
- [ ] Add a roadmap-continuation workflow to `.ai/workflows/README.md`.

## E. Overall architectural tree and repository organization

- [ ] Review the actual root structure against `docs/ROOT_LAYOUT.md` and the repository inventory.
- [ ] Update the architectural tree so a new agent can distinguish:
  - active runtime;
  - shared libraries;
  - Supabase assets;
  - governance docs and workflows;
  - project-owned skills;
  - installed/shared skills;
  - source-locked vendor references;
  - optional support artifacts;
  - historical recovery sources;
  - generated analysis artifacts;
  - scripts and root configuration.
- [ ] Document folder ownership and allowed dependency direction.
- [ ] Document where new files should be added and where they must not be added.
- [ ] Keep runtime code isolated from agent tooling, recovery sources, and generated analysis output.

## F. Files and folders to delete, retain, archive, or review

- [ ] Build a deletion-candidate inventory from actual repository evidence.
- [ ] Classify each candidate as one of:
  - `retain-runtime`;
  - `retain-governance`;
  - `retain-recovery-source`;
  - `retain-generated-support`;
  - `safe-delete-proven`;
  - `review-before-delete`;
  - `move-or-archive`.
- [ ] Record exact evidence required before deletion: imports, routes, build inputs, scripts, docs links, migration references, runtime references, and recovery value.
- [ ] Separate immediate safe deletes from risky cleanup candidates.
- [ ] Do not delete risky files in this documentation PR.
- [ ] Prepare a follow-up cleanup PR plan for proven safe removals only.

## G. Documentation consistency and verification

- [ ] Update `docs/ai/testing-guide.md` to match the actual GitHub Actions gate.
- [ ] Update `docs/ai/release-policy.md` to match the actual GitHub Actions gate and roadmap evidence requirements.
- [ ] Link the canonical roadmap and capabilities files from `docs/README.md` and `docs/ai/README.md`.
- [ ] Review the full documentation diff for contradictions, stale phase references, and duplicate instruction paths.
- [ ] Confirm this PR remains docs-only and agent-guidance-only.
- [ ] Run available documentation checks and report any environment limitation honestly.
- [ ] Open the Agent Onboarding cleanup PR with a complete summary, changed files, verification evidence, known limits, and the next roadmap item.

## H. Non-negotiable safety boundary for this PR

- [x] No runtime application code changes.
- [x] No Supabase migration application.
- [x] No production data mutation.
- [x] No live Supabase or Vercel setting change.
- [x] No risky deletion.
