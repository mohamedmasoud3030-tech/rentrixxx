import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: authData } = await userClient.auth.getUser();
    const requesterId = authData.user?.id;
    if (!requesterId) throw new Error('Unauthorized');

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', requesterId).single();
    if (!profile || profile.role !== 'ADMIN') throw new Error('Forbidden');

    const body = await req.json();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    const username = String(body.username || '').trim();
    const role = body.role === 'ADMIN' ? 'ADMIN' : 'USER';

    if (!email || !password || !username) throw new Error('Missing required fields');

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (createError || !created.user) throw new Error(createError?.message || 'Failed to create user');

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: created.user.id,
      username,
      role,
      must_change_password: true,
      created_at: Date.now(),
      is_disabled: false,
    });
    if (profileError) throw new Error(profileError.message);

    return new Response(JSON.stringify({ id: created.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
