# Auth Session Analysis

Evidence level: CODE_PRESENT plus LOCAL_VALIDATED for test/build diagnostics.

## Supabase client auth settings

The runtime creates a typed Supabase client and configures `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, and `storageKey: 'rentrix-auth-session'`. `artifacts/rentrix/src/integrations/supabase/client.ts:1-17`

## Environment fallback behavior

The environment helper reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, substitutes invalid placeholder values when missing, and exposes `isConfigured` instead of throwing at module load. `artifacts/rentrix/src/lib/env.ts:1-8` The client logs a recoverable diagnostic when the env is incomplete. `artifacts/rentrix/src/integrations/supabase/client.ts:5-7`

## Session restoration

`AuthProvider` initializes loading state, calls `getCurrentSession()`, stores any restored session, then stops loading when mounted. `artifacts/rentrix/src/hooks/use-auth.tsx:29-49` `getCurrentSession()` calls `supabase.auth.getSession()` and returns `data.session`. `artifacts/rentrix/src/services/auth-service.ts:4-8`

## Auth state changes, sign-in, and sign-out

`AuthProvider` subscribes to `supabase.auth.onAuthStateChange`; `SIGNED_OUT` clears session and redirects to `/login`, while `SIGNED_IN` and `USER_UPDATED` store the next session. `artifacts/rentrix/src/hooks/use-auth.tsx:50-75` Login delegates to `signInWithEmail`, which calls `supabase.auth.signInWithPassword`. `artifacts/rentrix/src/hooks/use-auth.tsx:77-90`; `artifacts/rentrix/src/services/auth-service.ts:10-14` Logout delegates to `supabase.auth.signOut()` and clears local session. `artifacts/rentrix/src/services/auth-service.ts:16-19`; `artifacts/rentrix/src/hooks/use-auth.tsx:86-89`

## Route redirect behavior

The protected route guard calls `supabase.auth.getSession()` and redirects to `/login` when no session exists. `artifacts/rentrix/src/routeTree.ts:50-58` The auth route guard redirects sessioned users from auth routes to `/`. `artifacts/rentrix/src/routeTree.ts:39-48`

## Auth context contract

| Field | Exposed? | Evidence |
| --- | --- | --- |
| `session` | yes | `AuthContextValue` includes `session`. `artifacts/rentrix/src/hooks/use-auth.tsx:6-13` |
| `user` | yes | `user` maps to `session?.user ?? null`. `artifacts/rentrix/src/hooks/use-auth.tsx:77-82` |
| `isLoading` | yes | `AuthContextValue` includes `isLoading`. `artifacts/rentrix/src/hooks/use-auth.tsx:6-13` |
| `isAuthenticated` | yes | Value is `Boolean(session)`. `artifacts/rentrix/src/hooks/use-auth.tsx:77-82` |
| `role` | no | Not present in `AuthContextValue`. `artifacts/rentrix/src/hooks/use-auth.tsx:6-13` |
| `permissions` | no | Not present in `AuthContextValue`. `artifacts/rentrix/src/hooks/use-auth.tsx:6-13` |
| `capabilities` | no | Not present in `AuthContextValue`. `artifacts/rentrix/src/hooks/use-auth.tsx:6-13` |
| `profile data` | no | Not present in `AuthContextValue`. `artifacts/rentrix/src/hooks/use-auth.tsx:6-13` |
| `mustChange` | no | Not present in `AuthContextValue`. `artifacts/rentrix/src/hooks/use-auth.tsx:6-13` |

## Provider placement

`AppProviders` wraps children with `QueryClientProvider` and `AuthProvider`. `artifacts/rentrix/src/app/providers.tsx:1-12`
