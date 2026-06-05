# Native Engine Recovery Handoff

This folder prepares a plan-first Codex task for selectively rebuilding strong engine concepts from an uploaded ERPNext/Frappe source archive inside Rentrix.

## Run Codex with this task

Use:

```text
docs/engine-recovery/CODEX_NATIVE_ENGINE_RECOVERY_PLAN_FIRST_TASK.md
```

The first Codex task is intentionally docs-only. It must inspect the current runtime and write `docs/engine-recovery/NATIVE_ENGINE_RECOVERY_PLAN.md` before any implementation begins.

## Why plan-first

The uploaded archive contains valuable domain behavior but also large amounts of framework-specific and out-of-scope ERP code. Direct imports or bulk restoration would violate the current Rentrix architecture and expand product scope unsafely.
