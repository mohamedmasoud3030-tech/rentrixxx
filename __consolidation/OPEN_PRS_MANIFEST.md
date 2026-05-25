# Rentrix Open PR Consolidation Manifest

Created: 2026-05-25
Base branch: main
Base commit: e1987c93a4edfc196d42b0ad84f905e82a751f91
Purpose: collect and preserve all currently open PR heads before any cleanup/deduplication work.

Important rule: this branch is an index/raw-consolidation branch. It must not be deployed as production. The clean branch should be built from main and should selectively re-apply non-duplicate, validated changes.

## Open PR heads captured

| PR | Head SHA | Head branch | Base branch | Title |
|---:|---|---|---|---|
| 741 | 28e2971bdd454fd805dc567b6416d6e1c708dd63 | codex/organize-claude-code-plugin-list | main | Add Claude Code marketplace manifest |
| 738 | d12ee6b100dfaf8eedfca5f87e520135e1fb4b71 | codex/fix-high-priority-issues-from-codex-review-0p74bu | document-template-engine-foundation | Fix template engine download MouseEvent type-check regression |
| 737 | 80365567cf19bb756f0f7b51f4c709aa817861bd | codex/fix-issues-from-codex-review-#657 | codex/restore-ui-only-pdf/print-workflows | Fix invoice preview context hydration |
| 736 | 89efd3635eacc3076bcc4a930a57f288d12db9e8 | codex/fix-high-priority-bug-in-contractservice | codex/stabilize-rentrix-runtime-after-schema-repair | support contract tenant FK compatibility |
| 735 | d15e2a421a39d372891574bf5174df0559ae1400 | codex/fix-codex-review-issues-from-pr-#730 | codex/fix-high-priority-bug-in-report-totals | invalidate full-list contract cache |
| 734 | 193c819f0f8ae540df344656511d53b0d6ff42df | codex/fix-invoice-search-semantics-in-query | codex/fix-high-priority-bug-in-invoices-page | align invoice server search |
| 733 | 0cc0613d5c80e17fe98043e6969b590f62661d4b | codex/fix-codex-review-issues-for-pr-#728 | codex/fix-codex-review-issues-in-pr-#717 | use UPDATE rollback |
| 732 | 0dd642d1d5f396f9b28109cb77bac998b4d2bf6e | codex/fix-codex-review-issues-in-pr-#727 | codex/fix-high-priority-bugs-from-codex-review-m6h6pu | migration safety for rent sync and duplicate invoices |
| 731 | ba04b228bdf4c79366e12d3eea1b67ee317eb2da | codex/fix-high-priority-migration-issues | codex/fix-codex-review-issues-in-tests | owner relationship migration ordering |
| 730 | a52ab35fa00982ac70c64fdf7eb20590e458771b | codex/fix-high-priority-bug-in-report-totals | codex/fix-high-priority-bug-in-reports-recovery-module | remove report dataset caps |
| 729 | 43d95db38daba7a623fd3fdb5f5b17dacf64972e | codex/fix-atomicity-issue-and-rollback-handling | codex/fix-high-priority-bugs-in-pr-#698 | failed journal rollback handling |
| 728 | 000f56fcdf68f6f57ebe1d28488411e32e1de3bf | codex/fix-codex-review-issues-in-pr-#717 | codex/fix-codex-review-blockers-in-accountingservice | hard delete journal rollback |
| 727 | 36de299ecd3af13d00eee8eafc85678dbd2551b7 | codex/fix-high-priority-bugs-from-codex-review-m6h6pu | codex/perform-database-completeness-audit | tenant FK compatibility and invoice RPC safety |
| 726 | 66920630bd502056a0ffe08cdf80418071fedc83 | codex/fix-high-priority-bugs-in-contractslistpage | codex/implement-invoices-and-contracts-improvements-8iy8e1 | contracts error handling and renewal date serialization |
| 725 | 57bb14c38c4af69f339b8c644b0d2363009de6ee | codex/fix-high-priority-bug-in-invoices-page | codex/implement-invoices-and-contracts-improvements | pass invoice search term |
| 724 | d3112c77481c536130af682dbc0b51d6279a8813 | codex/fix-codex-review-issues-in-pr-#639 | codex/implement-rentrix-foundation-phase-features | bulk selection and CSV formula injection |
| 723 | 31e8a018519b9f0fa52d21c1e73500070e266b76 | codex/fix-export-issues-in-filters-and-csv | codex/implement-batch-8-filters-and-export | cross-page selection exports |
| 722 | c2a2142e48fa25db0698e57d8c2b25934acac943 | codex/fix-merge-review-blockers-from-codex-review | codex/deep-review-fix-last-10-prs | PR 667 migration blockers |
| 721 | be5cc127a3e54aebf91a679fa64266ccf1c4f890 | codex/fix-data-loss-in-paginated-bulk-export | codex/fix-bulk-export-data-loss-bugs | remove lossy caps from exports |
| 720 | f671d5e1af0543b71245e4c5045c3e940a9e66b7 | codex/fix-high-priority-codex-review-issues-in-pr-#708 | codex/fix-codex-review-issues-in-migration-sql | normalize people.type casing |
| 719 | 9c98127ce430a76d3ef06aa51416de6274fff181 | codex/fix-high-priority-csv-export-bugs | codex/fix-csv-export-security-issues | preserve negative numbers in CSV |
| 718 | 3114b72c57397a0ff3cc2360002318192e77b2c6 | codex/fix-formula-detection-in-csv-export | codex/fix-csv-export-security-issues-hfojbt | control-character CSV formula prefixes |
| 717 | f01332e1674a31d3bc94d6b46ab9ea3c556a85f9 | codex/fix-codex-review-blockers-in-accountingservice | codex/fix-high-priority-bugs-from-codex-review | soft-delete accounting rollback |
| 716 | 1507326e4c126394f92116bb0b80eadc4ae5052e | codex/fix-high-priority-bugs-in-pr-#698 | codex/complete-rentrix-production-modules-bt4jh0 | accounting atomicity and WhatsApp security |
| 715 | e8250ac50789d9b5f34f194d12ddc89c9e058996 | codex/fix-codex-review-issues-in-tests | codex/run-rentrix-core-flow-smoke-audit | flaky test and owner migration validation |
| 714 | fd75b6c1ff8c1e75cd244e1827d5edf60b7c5ee6 | codex/fix-high-priority-issues-from-codex-review-0j30ss | codex/complete-rentrix-production-modules-nn2hti | hook-order, journal atomicity, CORS |
| 713 | a861824f73c4d76eaa5ff07437cf898082f6438e | codex/fix-high-priority-issues-in-ai-assistant-backend | codex/implement-read-only-ai-assistant-backend | ai-assistant CORS and response parsing |
| 712 | 8ebcf56cb265def95eb95c19d515661976ec63cf | codex/fix-high-priority-bugs-from-codex-review-caiszp | codex/complete-rentrix-production-modules-peurl4 | accounting writes, trial balance, send-whatsapp CORS |
| 711 | 29f657a26fb66fcda4c8dbe22832f18094d4c2bf | codex/fix-shared-units-cache-invalidation-issue | codex/stabilize-rentrix-units-flow-and-ui | shared units cache invalidation |
| 710 | 21f9956d7369758cefe10dfda665c4c455b2ddf9 | codex/fix-csv-export-security-issues-hfojbt | batch3-csv-compat-tests | CSV formula-like cells in properties export |
| 709 | 7baed8a74a1f6c2ebf926d6d42014160f2b5a6a7 | codex/fix-csv-export-security-issues | batch3-csv-export-infra | CSV formula neutralization |
| 708 | 2422e93579aa9acb63ac312b0ad6b54f8a308eb9 | codex/fix-codex-review-issues-in-migration-sql | codex/deep-review-and-fix-last-10-merged-prs | harden people compatibility backfills |
| 707 | 29fcec009ed54bd76fa411b854148b79264260af | codex/fix-supabase-runtime-config-issues | codex/remove-invalid-supabase-env-fallbacks | prevent eager Supabase proxy crashes |
| 706 | a16ae92ebb9a93c7b1bf74f9b77773bbbb8fa413 | codex/fix-codex-review-issues-for-pr-#664 | codex/implement-owner-management-agreement-phase-1 | owner agreement overlap and RLS |
| 705 | 18a02e6898b36956abf95b06b28b85df1136d48b | codex/fix-high-priority-bug-in-reports-recovery-module | codex/harden-reports-recovery-module-in-phase-3a | report totals use full datasets |
| 704 | 926b55ec206b5bb70a4b101ebba91372ad2a5e67 | codex/fix-high-priority-bugs-from-codex-review-9zedxp | codex/implement-phase-2-recovery-modules | restore people nav and leads grants |
| 703 | 635f99379642cad0b21ec3b2eed50382c69970da | codex/fix-high-priority-bugs-from-codex-review | codex/complete-rentrix-production-modules-nn2hti | map/accounting/edge function blockers |
| 702 | a8a706c4f35150cae1ca28179112e263cd8d3241 | codex/fix-json-content-type-in-supabase-functions | codex/complete-rentrix-production-modules-nn2hti | JSON Content-Type edge functions |
| 699 | e3200c663744171c3de4b7cc274611f702a04ea7 | codex/complete-rentrix-production-modules-nn2hti | main | real property map and modules |
| 698 | 25a19627ab038aca45fd15490278e0f7b86f780b | codex/complete-rentrix-production-modules-bt4jh0 | main | accounting, commissions, communications, lands, assistant |
| 615 | c1fb87b9444450dd8b935a5e1670a0019422f409 | mohamedmasoud3030-tech-patch-1 | main | Legacy |

## Cleanup rules for the clean branch

1. Start from current main, not from this raw branch.
2. Prefer latest follow-up in a chain over older conflicting fixes.
3. Never merge contradictory accounting rollback variants together without reading final DB grants.
4. Treat migration PRs as high risk and replay-safe only after review.
5. Preserve legacy PR #615 as source material, not as directly mergeable app code.
6. Run pnpm --filter ./artifacts/rentrix run typecheck, build, lint after each accepted batch.
