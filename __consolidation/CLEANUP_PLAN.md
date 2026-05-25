# Rentrix Clean Consolidation Plan

Created: 2026-05-25
Branch: consolidation/clean-20260525
Base: main @ e1987c93a4edfc196d42b0ad84f905e82a751f91

Goal: build one clean branch from current main while preserving all open PR code through the raw consolidation branch and PR head SHAs.

Raw source branch: consolidation/prs-20260525
Raw manifest: __consolidation/OPEN_PRS_MANIFEST.md

## Rules

1. Do not merge open PRs directly into main.
2. Do not close or delete any PR branch until its code is represented in either the clean branch or the raw archive.
3. Treat the following as source material, not direct merge targets:
   - PR #615 Legacy
   - PR #698 broad modules
   - PR #699 property map/modules
4. Prefer latest follow-up PRs over older fixes in the same chain.
5. Accounting rollback variants must be resolved by checking DB grants before selecting implementation.
6. Migration changes must be replay-safe and reviewed independently.
7. After every accepted batch, run:
   - pnpm --filter ./artifacts/rentrix run typecheck
   - pnpm --filter ./artifacts/rentrix run build
   - pnpm --filter ./artifacts/rentrix run lint

## First clean batches

Batch A: low-risk frontend/runtime fixes
- #741 marketplace manifest if still desired
- #738 template engine MouseEvent fix
- #735 contract cache invalidation
- #734 invoice search semantics
- #726 contract list error handling and renewal date serialization
- #725 pass invoice search term
- #711 units cache invalidation
- #707 unconfigured Supabase client hardening

Batch B: export and CSV safety
- #724 bulk-selection staleness and CSV injection
- #723 cross-page selected exports
- #721 remove export caps
- #719 preserve negative numbers while neutralizing formulas
- #718 control-character CSV formula prefixes
- #710/#709 only if not superseded by #719/#718

Batch C: DB/migration safety
- #732 duplicate invoice/rent sync safety
- #731 owner relationship migration ordering
- #727 tenant FK compatibility and invoice RPC safety
- #722 owner agreement FK/RLS/people normalization
- #720/#708 only if not superseded by #722
- #706 owner agreement overlap/RLS, subject to policy review

Batch D: modules and legacy extraction
- #698 accounting, commissions, communications, lands, assistant
- #699 property map/modules
- #615 legacy pages as UI/source extraction only

## Final target

A new PR from consolidation/clean-20260525 into main after all selected batches pass validation.
