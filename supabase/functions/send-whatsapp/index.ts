// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const apiVersion = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v20.0';

  if (!token || !phoneNumberId) {
    return jsonResponse(
      {
        ok: false,
        error: 'الإعدادات غير مكتملة',
        missing: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'].filter((k) => !Deno.env.get(k)),
      },
      400,
    );
  }

  const body = await req.json();
  if (!body?.to || !body?.message) {
    return jsonResponse({ ok: false, error: 'رقم الهاتف أو نص الرسالة غير متوفر' }, 400);
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: body.to, type: 'text', text: { body: body.message } }),
  });
  const payload = await response.json();

  if (!response.ok) {
    return jsonResponse({ ok: false, error: payload?.error?.message ?? 'WhatsApp provider error', payload }, response.status);
  }

  return jsonResponse({ ok: true, payload }, 200);
});
