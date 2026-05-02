import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Security utilities
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS vectors
    .substring(0, 5000); // Limit input size
}

function validateInput(input: any): boolean {
  if (typeof input !== 'string') return false;
  if (input.length === 0 || input.length > 5000) return false;
  return true;
}



const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
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
    if (!ANTHROPIC_API_KEY) throw new Error('Claude Opus 4.5 is not configured (ANTHROPIC_API_KEY missing)');

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

    const systemPrompt = `أنت مساعد ذكي متطور للغاية متخصص في إدارة العقارات والمحاسبة العقارية لتطبيق Rentrix.
تستخدم الآن نموذج Claude Opus 4.5 مع تفعيل أقصى قدرات التفكير (High Effort).
يجب أن تكون إجاباتك دقيقة للغاية، احترافية، وباللغة العربية الفصحى.
لديك حق الوصول إلى السياق التالي للبيانات الحالية:\n\n${context}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'code-execution-2025-08-25,skills-2025-10-02'
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        extra_body: { effort: "high" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API request failed: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text;

    if (!text) throw new Error('No response text from Claude');

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
