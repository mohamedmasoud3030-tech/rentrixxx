# Rentrix Agent Capabilities

This file inventories the agent skills, workflows, and support tools currently present in the repository and defines when they must be used.

Use this file together with:

```text
AGENTS.md
docs/ai/ONBOARDING.md
docs/RENTRIX_MASTER_PLAN.md
.ai/workflows/README.md
```

The active application code remains the source of truth. Agent tooling is guidance only and must never be imported into the production bundle.

## 1. Mandatory skill-selection rule

Before every non-trivial task:

1. read `.codex/vendor/addy-agent-skills/skills/using-agent-skills/SKILL.md`;
2. identify the current roadmap version and the next incomplete roadmap item;
3. choose the applicable local workflow from `.ai/workflows/README.md`;
4. load only the task-relevant skills listed below;
5. run fresh verification before claiming completion;
6. update roadmap evidence after a reviewed PR changes status.

Do not inject every skill into every task. Use the smallest set that matches the requested work.

## 2. Rentrix-owned skills

### `.agent-skills/rentrix-build-web-apps/SKILL.md`

**Use when:** implementing, modifying, reviewing, or completing Rentrix UI or web application surfaces.

**Mandatory for:** dashboard, properties, units, people, tenants, owners, contracts, financial pages, reports, maintenance, routing, shared UI, responsive fixes, RTL/LTR fixes, and Vercel-ready frontend PRs.

**Key boundary:** preserve TanStack Router, React Query, Supabase service modules, current app shell, Arabic-first UX, and commercial screen readiness. Do not restore legacy `useApp`, `AppContext`, `dataService`, local DB flows, or `react-router-dom`.

### `.agents/skills/connector-operator/SKILL.md`

**Use when:** working with GitHub, Supabase, Vercel, MCP, or any external connector.

**Mandatory behavior:** inspect documented action schemas first, classify errors, stop on auth or permission boundaries, and retry only the same documented action once for temporary transport failures.

### `.agents/skills/ui-ux-pro-max/SKILL.md`

**Use when:** a task changes how a page looks, feels, moves, or is interacted with.

**Mandatory for:** new pages, UI refactors, tables, forms, navigation, mobile layouts, accessibility review, typography, spacing, colors, dashboards, and pre-launch UI polish.

### `.agents/skills/vercel-react-best-practices/SKILL.md`

**Use when:** writing, reviewing, or refactoring React components, hooks, data fetching, rendering behavior, bundle boundaries, or performance-sensitive UI.

**Mandatory for:** React performance work and recommended for every non-trivial React PR.

### `.agents/skills/audit-website/SKILL.md`

**Use when:** a live or preview web audit is explicitly in scope and the `squirrel` CLI is available.

**Do not assume availability:** verify `squirrel --version` first. This skill is optional and environment-dependent.

## 3. Project workflows

### `.ai/workflows/README.md`

Choose one primary workflow before editing:

```text
Roadmap continuation
Repository audit
Safe bug fix
Frontend page completion
Supabase migration or RLS review
Release check
```

A task may load additional skills, but it should still have one primary workflow and one narrow PR objective.

## 4. Source-locked vendor packs

### `.codex/vendor/openai-build-web-apps/`

Source lock: `.codex/vendor/source-lock.json`

Available plugin references include:

```text
frontend-app-builder
frontend-testing-debugging
react-best-practices
shadcn-best-practices
stripe-best-practices
supabase-best-practices
```

Use only the task-relevant reference. Do not edit vendored files directly.

### `.codex/vendor/anthropic-skills/skills/`

Source lock: `.codex/vendor/source-lock.json`

Use task-relevant upstream skills only. Preserve upstream files unchanged. Do not assume a skill path exists until it is verified locally.

### `.codex/vendor/addy-agent-skills/`

Source lock: `.codex/vendor/source-lock.json`

Start every non-trivial task with:

```text
.codex/vendor/addy-agent-skills/skills/using-agent-skills/SKILL.md
```

Then load only the task-relevant workflow, such as:

```text
spec-driven-development
planning-and-task-breakdown
incremental-implementation
frontend-ui-engineering
test-driven-development
browser-testing-with-devtools
debugging-and-error-recovery
code-review-and-quality
security-and-hardening
performance-optimization
git-workflow-and-versioning
ci-cd-and-automation
documentation-and-adrs
shipping-and-launch
```

## 5. Selected additive skill bundle

Source lock: `.codex/vendor/selected-source-lock.json`

The selected bundle is additive and must not overwrite existing vendor files.

### Superpowers selected

```text
.codex/vendor/selected-agent-skills/superpowers-selected/skills/verification-before-completion/SKILL.md
.codex/vendor/selected-agent-skills/superpowers-selected/skills/using-git-worktrees/SKILL.md
.codex/vendor/selected-agent-skills/superpowers-selected/skills/finishing-a-development-branch/SKILL.md
```

**Mandatory before any completion claim:** `verification-before-completion`.

**Use when local checkout is available:** `using-git-worktrees` for isolated branch work.

**Use before PR handoff or merge:** `finishing-a-development-branch`.

### Matt Pocock selected

```text
.codex/vendor/selected-agent-skills/mattpocock-selected/skills/engineering/diagnose/SKILL.md
.codex/vendor/selected-agent-skills/mattpocock-selected/skills/engineering/zoom-out/SKILL.md
.codex/vendor/selected-agent-skills/mattpocock-selected/skills/productivity/handoff/SKILL.md
.codex/vendor/selected-agent-skills/mattpocock-selected/skills/productivity/write-a-skill/SKILL.md
```

Use `diagnose` for defects, `zoom-out` for architecture review, `handoff` when a session ends with unfinished work, and `write-a-skill` only when a repeated workflow deserves a reusable local skill.

### Agent Almanac selected

```text
.codex/vendor/selected-agent-skills/agent-almanac-selected/skills/troubleshoot-mcp-connection/SKILL.md
```

Use only for connector or MCP troubleshooting together with `connector-operator`. It does not authorize random alternate retries.

## 6. Sync scripts

### `scripts/sync-codex-vendor-skills.sh`

Refreshes the full source-locked OpenAI, Anthropic, and Addy vendor mirrors.

### `scripts/sync-selected-agent-skills.sh`

Materializes the selected additive bundle. It stops on differing existing files instead of overwriting them.

Run a sync script only when the corresponding files are missing or an explicit refresh is approved and GitHub network access is available. Do not run sync scripts blindly during normal application work.

## 7. Analysis support

### `understand-anything/knowledge-graph.json`

Generated local knowledge-graph seed for the Understand Anything plugin.

Use it as orientation support only. Verify every conclusion against active code, migrations, tests, and runtime configuration before editing.

## 8. Tools not active in the current repository snapshot

Repository search did not find an active `ui-audit` harness path or a `coze-agent` CLI path in the current branch. Do not claim or depend on those tools unless they are restored through an explicit reviewed PR and their paths are verified.

## 9. Task-to-skill matrix

| Task type | Required local workflow | Required skills or references |
| --- | --- | --- |
| Continue roadmap work | Roadmap continuation | Addy `using-agent-skills`, this file, master plan, task-specific skills |
| UI page completion | Frontend page completion | `rentrix-build-web-apps`, `ui-ux-pro-max`, `vercel-react-best-practices`, Addy `frontend-ui-engineering`, verification-before-completion |
| React refactor or performance fix | Safe bug fix | `vercel-react-best-practices`, Addy `performance-optimization` when relevant, verification-before-completion |
| Bug diagnosis | Safe bug fix | Matt `diagnose`, Addy `debugging-and-error-recovery`, test-driven-development, verification-before-completion |
| Supabase migration or RLS review | Supabase migration or RLS review | `connector-operator`, OpenAI `supabase-best-practices` when available locally, Addy `security-and-hardening`, verification-before-completion |
| GitHub, Supabase, Vercel, or MCP connector work | Relevant workflow | `connector-operator`, Agent Almanac MCP reference only when needed |
| PR handoff or merge | Release check | Superpowers `finishing-a-development-branch`, `verification-before-completion` |
| Live or preview website quality audit | Release check | `audit-website` only after confirming `squirrel` CLI availability |
| Architecture review | Repository audit | Matt `zoom-out`, Addy `context-engineering`, code-review-and-quality |
| Session handoff | Roadmap continuation | Matt `handoff`, update master plan evidence and next item |

## 10. Runtime boundary

All files listed in this document are agent guidance, workflow references, source locks, sync scripts, or generated analysis support. Never import them into `artifacts/rentrix/src/` or the shipped production bundle.
