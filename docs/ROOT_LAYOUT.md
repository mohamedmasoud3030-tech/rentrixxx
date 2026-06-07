# Rentrix Root Layout

Use this map before creating, moving, or deleting top-level files.

## Canonical runtime

```text
artifacts/rentrix/
lib/
supabase/
```

These paths define the shipped product.

## Optional support artifacts

```text
artifacts/mockup-sandbox/
artifacts/rentrix-promo/
```

These paths support preview or promotional work. They are not production architecture and are intentionally outside the root workspace.

## Governance

```text
README.md
AGENTS.md
CLAUDE.md
docs/
.github/
.ai/
```

These paths contain policy, decisions, workflows, audits, and CI configuration.

## Agent tooling

```text
.agent-skills/    # Rentrix-owned reusable skills
.agents/          # Installed or shared helpers and plugin metadata
.codex/vendor/    # Source-locked upstream references
```

Do not import agent-tooling files into the production app. Keep Rentrix-specific policy in `AGENTS.md`, `docs/ai/`, and `.ai/workflows/`.

## Historical recovery sources

```text
.migration-backup/
artifacts/rentrix/legacy-src/
```

These paths are retained for selective recovery only. They are not deployed code. Adapt useful parts deliberately; never restore entire legacy modules blindly.

## Analysis artifacts

```text
understand-anything/
```

Generated repository-understanding output. Treat it as support material, not source of truth.

## Root configuration

```text
package.json
pnpm-workspace.yaml
tsconfig.json
tsconfig.base.json
vercel.json
sonar-project.properties
.replit
.gitignore
```

`vercel.json` is authoritative for root deployment. `.replit` is a local launcher only.

## Adding a new root folder

Create a new top-level folder only when it clearly belongs to one category above and the change is reviewed.
