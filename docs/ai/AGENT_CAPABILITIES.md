# Rentrix Agent Capabilities

This file inventories the skills, workflows, and support tools currently present in the repository and defines when they should be used.

Read together with:

```text
AGENTS.md
docs/ai/ONBOARDING.md
docs/RENTRIX_MASTER_PLAN.md
docs/ai/GIT_TOOLING_POLICY.md
.ai/workflows/README.md
```

The active application code remains the source of truth. Agent tooling must never be imported into the production bundle.

## 1. Mandatory selection rule

Before every non-trivial task:

1. read `.codex/vendor/addy-agent-skills/skills/using-agent-skills/SKILL.md`;
2. identify the active roadmap release and first ready item;
3. choose one primary workflow from `.ai/workflows/README.md`;
4. load only the task-relevant skills;
5. follow `GIT_TOOLING_POLICY.md` for branch, PR, CI, and merge work;
6. run fresh verification before claiming completion;
7. update roadmap evidence after reviewed work changes status.

Do not inject every skill into every task.

## 2. Rentrix-owned and installed skills

### `.agent-skills/rentrix-build-web-apps/SKILL.md`

Use for Rentrix UI, routing, responsive, RTL/LTR, and hosted-preview work.

### `.agents/skills/connector-operator/SKILL.md`

Use for GitHub, Supabase, Vercel, MCP, or external connector work. Inspect documented schemas first, classify errors, and stop at access boundaries.

### `.agents/skills/ui-ux-pro-max/SKILL.md`

Use for visual design, interaction patterns, navigation, forms, tables, dashboards, mobile layouts, accessibility, and pre-launch UI polish.

### `.agents/skills/vercel-react-best-practices/SKILL.md`

Use for React implementation, hooks, data fetching, rendering behavior, bundle boundaries, and performance-sensitive refactoring.

### `.agents/skills/audit-website/SKILL.md`

Use only when a live or preview website audit is in scope and the required CLI is available.

## 3. Project workflows

Choose one primary workflow:

```text
Roadmap continuation
Repository audit
Safe bug fix
Frontend page completion
Supabase migration or RLS review
Safe root cleanup
Release check
```

A task may load extra skills, but it should still have one primary workflow and one narrow PR objective.

## 4. Source-locked vendor packs

### `.codex/vendor/openai-build-web-apps/`

Source lock: `.codex/vendor/source-lock.json`

Available references include frontend app building, frontend debugging, React, shadcn, Stripe, and Supabase guidance.

### `.codex/vendor/anthropic-skills/`

Source lock: `.codex/vendor/source-lock.json`

Use only task-relevant upstream references that are verified locally.

### `.codex/vendor/addy-agent-skills/`

Source lock: `.codex/vendor/source-lock.json`

Start with:

```text
.codex/vendor/addy-agent-skills/skills/using-agent-skills/SKILL.md
```

Then load only the needed workflow, such as planning, incremental implementation, frontend UI engineering, test-driven development, debugging, code review, security, performance, Git workflow, CI, documentation, or shipping.

## 5. Selected additive bundle

Source lock: `.codex/vendor/selected-source-lock.json`

### Superpowers selected

```text
.codex/vendor/selected-agent-skills/superpowers-selected/skills/verification-before-completion/SKILL.md
.codex/vendor/selected-agent-skills/superpowers-selected/skills/using-git-worktrees/SKILL.md
.codex/vendor/selected-agent-skills/superpowers-selected/skills/finishing-a-development-branch/SKILL.md
```

Use verification-before-completion before any completion claim. Use worktrees when local checkout is available. Use finishing-a-development-branch before PR handoff or merge.

### Matt Pocock selected

```text
.codex/vendor/selected-agent-skills/mattpocock-selected/skills/engineering/diagnose/SKILL.md
.codex/vendor/selected-agent-skills/mattpocock-selected/skills/engineering/zoom-out/SKILL.md
.codex/vendor/selected-agent-skills/mattpocock-selected/skills/productivity/handoff/SKILL.md
.codex/vendor/selected-agent-skills/mattpocock-selected/skills/productivity/write-a-skill/SKILL.md
```

Use diagnose for defects, zoom-out for architecture review, handoff when unfinished work remains, and write-a-skill only for repeated workflows.

### Agent Almanac selected

```text
.codex/vendor/selected-agent-skills/agent-almanac-selected/skills/troubleshoot-mcp-connection/SKILL.md
```

Use only for MCP troubleshooting together with connector-operator.

## 6. Sync scripts

```text
scripts/sync-codex-vendor-skills.sh
scripts/sync-selected-agent-skills.sh
```

Run a sync script only when files are missing or an explicit refresh is approved.

## 7. Analysis support

```text
understand-anything/knowledge-graph.json
```

Use as orientation support only. Verify conclusions against active code, migrations, tests, and configuration.

Repository search did not find active `ui-audit` or `coze-agent` paths in the current snapshot. Do not depend on them unless restored through a reviewed change.

## 8. Task-to-skill matrix

| Task type | Primary workflow | Required references |
| --- | --- | --- |
| Continue roadmap work | Roadmap continuation | master plan, Addy `using-agent-skills`, task-specific skills |
| Git branch, PR, CI, or merge work | Relevant workflow | `GIT_TOOLING_POLICY.md`, connector-operator, verification-before-completion |
| UI page completion | Frontend page completion | rentrix-build-web-apps, ui-ux-pro-max, vercel-react-best-practices |
| React refactor or performance fix | Safe bug fix | vercel-react-best-practices, relevant performance guidance |
| Bug diagnosis | Safe bug fix | Matt diagnose, debugging workflow, targeted tests |
| Supabase migration or RLS review | Supabase migration or RLS review | connector-operator, security guidance, preview validation |
| Safe file removal | Safe root cleanup | root layout, cleanup inventory, Git policy, full verification |
| Architecture review | Repository audit | Matt zoom-out, context engineering, code review |
| PR handoff or merge | Release check | finishing-a-development-branch, verification-before-completion |

## 9. Runtime boundary

All files listed here are guidance, source locks, sync helpers, or generated analysis support. Never import them into `artifacts/rentrix/src/` or the shipped production bundle.
