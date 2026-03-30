import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const OWNER_TOKEN_SECRET = Deno.env.get('OWNER_TOKEN_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const encoder = new TextEncoder();

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const logEvent = (level: 'info' | 'warn' | 'error', message: string, meta: Record<string, unknown> = {}) => {
  console[level](JSON.stringify({ level, message, ...meta, ts: Date.now() }));
};

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(OWNER_TOKEN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return b64;
}

async function verify(payload: string, signature: string): Promise<boolean> {
  const expected = await sign(payload);
  if (expected.length !== signature.length) return false;
  let out = 0;
  for (let i = 0; i < expected.length; i += 1) out |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return out === 0;
}

function createToken(ownerId: string) {
  const exp = Date.now() + 1000 * 60 * 60 * 24;
  const payload = `${ownerId}.${exp}`;
  return { payload, exp };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = String(body?.action || '');
    const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (action === 'issue') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new HttpError('Unauthorized', 401);

      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: authData } = await userClient.auth.getUser();
      const caller = authData.user;
      if (!caller) throw new HttpError('Unauthorized', 401);

      const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', caller.id).single();
      if (profileError || !profile) throw new HttpError('Forbidden', 403);

      const ownerId = String(body.ownerId || '');
      if (!ownerId) throw new HttpError('ownerId required', 400);

      const ownerFromMetadata = String(caller.user_metadata?.ownerId || caller.app_metadata?.ownerId || '');
      const isAdmin = profile.role === 'ADMIN';
      const isOwner = ownerFromMetadata && ownerFromMetadata === ownerId;

      if (!isAdmin && !isOwner) {
        logEvent('warn', 'owner token issuance denied', { callerId: caller.id, ownerId });
        throw new HttpError('Forbidden', 403);
      }

      const { payload } = createToken(ownerId);
      const signature = await sign(payload);
      return new Response(JSON.stringify({ token: `${payload}.${signature}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      const ownerId = String(body.ownerId || '');
      const token = String(body.token || '');
      const parts = token.split('.');
      if (parts.length < 3) throw new HttpError('invalid token', 400);
      const payload = `${parts[0]}.${parts[1]}`;
      const signature = parts[2];
      const [tokenOwnerId, expRaw] = payload.split('.');
      const exp = Number(expRaw);
      if (tokenOwnerId !== ownerId || Number.isNaN(exp) || Date.now() > exp) throw new HttpError('token expired', 401);
      const valid = await verify(payload, signature);
      if (!valid) throw new HttpError('invalid signature', 401);

      const [{ data: owner }, { data: stats }, { data: settings }] = await Promise.all([
        client.from('owners').select('id,name').eq('id', ownerId).single(),
        client.from('owner_balances').select('total_income,total_expenses,commission,net_balance').eq('owner_id', ownerId).single(),
        client.from('settings').select('data').eq('id', 1).single(),
      ]);
      if (!owner || !stats) throw new HttpError('owner not found', 404);
      const currency = settings?.data?.operational?.currency || 'OMR';

      return new Response(JSON.stringify({
        owner: { id: owner.id, name: owner.name },
        stats: {
          collections: Number(stats.total_income || 0),
          expenses: Number(stats.total_expenses || 0),
          officeShare: Number(stats.commission || 0),
          net: Number(stats.net_balance || 0),
        },
        currency,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new HttpError('unsupported action', 400);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'unknown error' }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
