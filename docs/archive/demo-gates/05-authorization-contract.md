# Authorization Contract

Evidence level: CODE_PRESENT for runtime and migration evidence; LIVE_DATA_VERIFIED is UNKNOWN.

## Runtime conclusion

The current runtime has session authentication but no verified canonical role/capability authorization contract wired into route guards or auth context. The protected route guard checks only `supabase.auth.getSession()` and session existence. `artifacts/rentrix/src/routeTree.ts:50-58` The auth context does not expose `role`, `permissions`, `capabilities`, `profile`, or `mustChange`. `artifacts/rentrix/src/hooks/use-auth.tsx:6-13`

Conclusion: AUTHORIZATION_CONTRACT_PARTIAL.

## Search evidence

Targeted searches over `artifacts/rentrix/src/**` and `supabase/migrations/**` for `role`, `roles`, `permission`, `permissions`, `capability`, `capabilities`, `profile`, `profiles`, `user_roles`, `app_metadata`, `user_metadata`, `is_admin`, `admin`, `finance`, `RLS`, `policy`, and `policies` found schema-side role evidence but no current runtime route-guard usage beyond session checks. Command evidence: `rg -n "profiles|public\.users|user_role|is_app_user|is_admin_or_manager|permissions|capabilities|user_roles|..." artifacts/rentrix/src/types artifacts/rentrix/src supabase/migrations --glob '!**/*.test.*' --glob '!**/*.spec.*'` returned migration hits and no runtime authorization-helper hits.

## Decision table

| Candidate source | Exists in current runtime? | Exists in schema evidence? | Used by route guards? | Suitable canonical source? | Evidence | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| `auth.users.app_metadata.user_role` | No runtime read found | Migration hook writes `app_metadata.user_role` from `public.profiles.role`. `supabase/migrations/20260503140000_custom_access_token_hook.sql:5-16`; `supabase/migrations/20260503140000_custom_access_token_hook.sql:60-66` | No | BLOCKED pending runtime contract and live hook verification | Search found migration comments/functions but no runtime reads. | Candidate only |
| `auth.users.user_metadata` | No runtime read found | No authoritative schema evidence found in targeted search | No | No | Targeted search returned no current runtime authorization usage. | Reject for now |
| `public.profiles.role` | No runtime read found | Custom access-token hook reads `public.profiles.role`. `supabase/migrations/20260503140000_custom_access_token_hook.sql:44-50` | No | Partial only | Profiles table baseline exists, but live application/hook status is UNKNOWN. `supabase/migrations/20260503120000_consolidate_schema_integrity.sql:753` | Candidate only |
| `public.users.role/status` | No runtime read found | RLS helpers use `public.users.status` and `public.users.role`. `supabase/migrations/20260519120000_p0_harden_rls_user_scoped.sql:31-39`; `supabase/migrations/20260519120000_p0_harden_rls_user_scoped.sql:46-87` | No | Partial only | Schema-side RLS helpers exist, but runtime does not expose canonical role/capabilities. | Candidate only |
| `public.user_roles` | No | No current migration evidence found | No | No | Targeted search returned no `public.user_roles` source. | Reject |
| `public.roles` | No | No current migration evidence found | No | No | Targeted search returned no authoritative `public.roles` table source. | Reject |
| RPC-based permission lookup | No | RLS helper functions exist for app user and admin/manager, not a capability RPC | No | Partial only | `public.is_app_user()` and `public.is_admin_or_manager()` exist in migrations. `supabase/migrations/20260519120000_p0_harden_rls_user_scoped.sql:46-87` | Candidate only |
| RLS-only enforcement | Runtime relies on Supabase calls, so RLS may enforce data access | RLS hardening policies exist in migrations. `supabase/migrations/20260519120000_p0_harden_rls_user_scoped.sql:90-124` | No route guard usage | Insufficient for UI route/capability contract | RLS may protect data, but does not give route/UI permission semantics. | Partial backend guard only |

## Next implication

Do not implement Audit Log yet. A narrow authorization helper PR should first select and verify the canonical role/capability source, including live environment evidence where available.
