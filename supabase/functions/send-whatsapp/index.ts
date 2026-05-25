// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const apiVersion = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v20.0';

  if (!token || !phoneNumberId) {
    return new Response(JSON.stringify({ ok: false, error: 'الإعدادات غير مكتملة', missing: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'].filter((k) => !Deno.env.get(k)) }), { status: 400 });
  }

  const body = await req.json();
  if (!body?.to || !body?.message) {
    return new Response(JSON.stringify({ ok: false, error: 'رقم الهاتف أو نص الرسالة غير متوفر' }), { status: 400 });
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: body.to, type: 'text', text: { body: body.message } }),
  });
  const payload = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ ok: false, error: payload?.error?.message ?? 'WhatsApp provider error', payload }), { status: response.status });
  }

  return new Response(JSON.stringify({ ok: true, payload }), { status: 200 });
});
