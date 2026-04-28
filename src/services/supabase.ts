/**
 * @deprecated Use `@/services/api/supabaseClient` directly.
 * Compatibility shim retained for staged migration.
 * TODO(release+1): remove this shim after all imports are migrated and CI enforces canonical path.
 */

const DEPRECATION_FLAG = '__rentrix_supabase_shim_warned__';

if (typeof globalThis !== 'undefined' && !(DEPRECATION_FLAG in globalThis)) {
  Object.defineProperty(globalThis, DEPRECATION_FLAG, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  console.warn('[DEPRECATION] Import from "@/services/api/supabaseClient" instead of "@/services/supabase".');
}

export { supabase, getSupabaseClient } from './api/supabaseClient';
