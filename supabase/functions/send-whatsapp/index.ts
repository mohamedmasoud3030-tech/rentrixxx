// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const ALLOWED_ROLES = new Set(['ADMIN', 'MANAGER']);

serve(async (req) => {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const apiVersion = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v20.0';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!token || !phoneNumberId) {
    return new Response(JSON.stringify({ ok: false, error: 'الإعدادات غير مكتملة', missing: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'].filter((k) => !Deno.env.get(k)) }), { status: 400 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'إعدادات Supabase غير مكتملة' }), { status: 500 });
  }

  const authHeader = req.headers.get('Authorization');
  const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!jwt) {
    return new Response(JSON.stringify({ ok: false, error: 'غير مصرح' }), { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: authData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !authData?.user) {
    return new Response(JSON.stringify({ ok: false, error: 'رمز الجلسة غير صالح' }), { status: 401 });
  }

  const { data: dbUser, error: dbUserError } = await supabase
    .from('users')
    .select('role,is_active,deleted_at')
    .eq('id', authData.user.id)
    .single();

  if (dbUserError || !dbUser || !dbUser.is_active || dbUser.deleted_at || !ALLOWED_ROLES.has(dbUser.role)) {
    return new Response(JSON.stringify({ ok: false, error: 'ليس لديك صلاحية لإرسال رسائل واتساب' }), { status: 403 });
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
