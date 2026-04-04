import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAppEnv, maskSecret } from '../config/env';
import { logger } from './logger';

type QueryResult = { data: any; error: { message: string } | null; count?: number | null };
const disabledResult = (): QueryResult => ({ data: null, error: { message: 'Supabase client unavailable' }, count: null });

class DisabledQueryBuilder {
  select(): this { return this; }
  insert(): this { return this; }
  update(): this { return this; }
  upsert(): this { return this; }
  delete(): this { return this; }
  eq(): this { return this; }
  neq(): this { return this; }
  not(): this { return this; }
  is(): this { return this; }
  like(): this { return this; }
  in(): this { return this; }
  order(): this { return this; }
  limit(): this { return this; }
  single = async (): Promise<QueryResult> => disabledResult();
  maybeSingle = async (): Promise<QueryResult> => disabledResult();
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(disabledResult()).then(onfulfilled, onrejected);
  }
}

const createDisabledSupabaseClient = (): SupabaseClient => {
  const query = () => new DisabledQueryBuilder();

  return {
    from: () => query() as any,
    rpc: async () => disabledResult() as any,
    auth: {
      getSession: async () => ({ data: { session: null }, error: { message: 'Supabase client unavailable' } }),
      getUser: async () => ({ data: { user: null }, error: { message: 'Supabase client unavailable' } }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase client unavailable' } }),
      updateUser: async () => ({ data: { user: null }, error: { message: 'Supabase client unavailable' } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
    } as any,
    functions: {
      invoke: async () => ({ data: null, error: { message: 'Supabase client unavailable' } }),
    } as any,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: 'Supabase client unavailable' } }),
        remove: async () => ({ data: null, error: { message: 'Supabase client unavailable' } }),
        createSignedUrl: async () => ({ data: null, error: { message: 'Supabase client unavailable' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    } as any,
  } as unknown as SupabaseClient;
};

let supabaseClient: SupabaseClient | null = null;

const initializeSupabase = (): SupabaseClient | null => {
  if (supabaseClient) return supabaseClient;

  try {
    const env = getAppEnv();
    supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    logger.info('[Supabase] Client initialized', {
      url: env.supabaseUrl,
      anonKeyMasked: maskSecret(env.supabaseAnonKey),
    });

    return supabaseClient;
  } catch (error) {
    logger.error('[Supabase] Missing/invalid environment configuration. Supabase client disabled.', error);
    return null;
  }
};

export const getSupabaseClient = (): SupabaseClient | null => initializeSupabase();
export const isSupabaseEnabled = (): boolean => getSupabaseClient() !== null;
export const supabase: SupabaseClient = initializeSupabase() ?? createDisabledSupabaseClient();
