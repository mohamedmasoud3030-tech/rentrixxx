import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const OWNER_TOKEN_SECRET = Deno.env.get('OWNER_TOKEN_SECRET')!;
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || '';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

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

const base64UrlEncode = (value: string | Uint8Array): string => {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (value: string): string => {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
};

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(OWNER_TOKEN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(sig));
}

async function issueJwt(ownerId: string): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + 60 * 60 * 24;
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ sub: ownerId, owner_id: ownerId, iat: nowSeconds, exp }));
  const unsigned = `${header}.${payload}`;
  const signature = await sign(unsigned);
  return `${unsigned}.${signature}`;
}

async function verifyJwt(token: string, ownerId: string): Promise<void> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError('invalid token', 400);

  const [headerPart, payloadPart, signature] = parts;
  const expectedSignature = await sign(`${headerPart}.${payloadPart}`);
  if (signature.length !== expectedSignature.length) throw new HttpError('invalid signature', 401);

  let mismatch = 0;
  for (let i = 0; i < signature.length; i += 1) mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  if (mismatch !== 0) throw new HttpError('invalid signature', 401);

  let payload: { owner_id?: string; sub?: string; exp?: number };
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart));
  } catch {
    throw new HttpError('invalid token payload', 400);
  }

  const tokenOwnerId = String(payload.owner_id || payload.sub || '');
  const exp = Number(payload.exp || 0);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!tokenOwnerId || tokenOwnerId !== ownerId) throw new HttpError('owner mismatch', 403);
  if (!Number.isFinite(exp) || exp <= nowSeconds) throw new HttpError('token expired', 401);
}

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
};

const resolveBaseUrl = (req: Request): string => {
  if (APP_BASE_URL) return APP_BASE_URL.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin.replace(/\/$/, '');
  throw new HttpError('APP_BASE_URL is not configured', 500);
};

Deno.serve(async req => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = String(body?.action || '');
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (action === 'issue') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new HttpError('Unauthorized', 401);

      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: authData } = await userClient.auth.getUser();
      const caller = authData.user;
      if (!caller) throw new HttpError('Unauthorized', 401);

      const { data: profile, error: profileError } = await adminClient.from('profiles').select('role').eq('id', caller.id).single();
      if (profileError || !profile) throw new HttpError('Forbidden', 403);

      const ownerId = String(body.ownerId || '');
      if (!ownerId) throw new HttpError('ownerId required', 400);

      const ownerFromMetadata = String(caller.user_metadata?.ownerId || caller.app_metadata?.ownerId || '');
      const isAdmin = profile.role === 'ADMIN';
      const isOwner = ownerFromMetadata !== '' && ownerFromMetadata === ownerId;
      if (!isAdmin && !isOwner) {
        logEvent('warn', 'owner token issuance denied', { callerId: caller.id, ownerId });
        throw new HttpError('Forbidden', 403);
      }

      const token = await issueJwt(ownerId);
      const baseUrl = resolveBaseUrl(req);
      const url = `${baseUrl}#/owner-view/${ownerId}?auth=${encodeURIComponent(token)}`;

      return new Response(JSON.stringify({ url, expiresInSeconds: 60 * 60 * 24 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      const ownerId = String(body.ownerId || '');
      const token = String(body.token || '');
      if (!ownerId || !token) throw new HttpError('ownerId and token required', 400);
      await verifyJwt(token, ownerId);

      const [{ data: owner }, { data: stats }, { data: settings }] = await Promise.all([
        adminClient.from('owners').select('id,name').eq('id', ownerId).single(),
        adminClient.from('owner_balances').select('total_income,total_expenses,commission,net_balance').eq('owner_id', ownerId).single(),
        adminClient.from('settings').select('data').eq('id', 1).single(),
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
    const message = error instanceof Error ? error.message : 'unknown error';
    const status = error instanceof HttpError ? error.status : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
