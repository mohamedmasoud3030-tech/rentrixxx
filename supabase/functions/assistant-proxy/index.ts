import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const WINDOW_MS = 60_000;
const WINDOW_MAX = 20;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logEvent = (level: 'info' | 'warn' | 'error', message: string, meta: Record<string, unknown> = {}) => {
  console[level](JSON.stringify({ level, message, ...meta, ts: Date.now() }));
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error('Assistant is not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logEvent('warn', 'assistant anonymous request blocked');
      throw new Error('Unauthorized');
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: authData } = await userClient.auth.getUser();
    const caller = authData.user;
    if (!caller) throw new Error('Unauthorized');

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', caller.id).single();
    if (!profile) throw new Error('Forbidden');

    const capabilityMap: Record<string, string[]> = {
      ADMIN: ['USE_SMART_ASSISTANT'],
      USER: ['USE_SMART_ASSISTANT'],
    };
    if (!capabilityMap[profile.role]?.includes('USE_SMART_ASSISTANT')) {
      logEvent('warn', 'assistant capability denied', { callerId: caller.id, role: profile.role });
      throw new Error('Forbidden');
    }

    const now = Date.now();
    const { data: recent, error: rateErr } = await adminClient
      .from('edge_rate_limits')
      .select('id')
      .eq('user_id', caller.id)
      .eq('endpoint', 'assistant-proxy')
      .gte('ts', now - WINDOW_MS);

    if (rateErr) throw new Error(rateErr.message);
    if ((recent?.length || 0) >= WINDOW_MAX) {
      logEvent('warn', 'assistant rate limit exceeded', { callerId: caller.id, count: recent?.length || 0 });
      throw new Error('Rate limit exceeded');
    }

    await adminClient.from('edge_rate_limits').insert({
      user_id: caller.id,
      endpoint: 'assistant-proxy',
      ts: now,
    });

    const body = await req.json();
    const prompt = String(body.prompt || '').trim();
    const context = typeof body.context === 'string' ? body.context : JSON.stringify(body.context || {});
    if (!prompt) throw new Error('Prompt is required');

    const fullPrompt = `أنت مساعد ذكي متخصص في إدارة العقارات. لديك البيانات التالية:\n\n${context}\n\nسؤال المستخدم: ${prompt}\n\nأجب بشكل واضح ومفيد باللغة العربية.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed: ${text}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response text from model');

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Rate limit') ? 429 : message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
