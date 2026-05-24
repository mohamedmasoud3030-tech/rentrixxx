// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'إعدادات الذكاء الاصطناعي غير مكتملة', missing: ['OPENAI_API_KEY'] }), { status: 400 });
  }

  const payload = await req.json();
  const prompt = payload?.prompt as string;
  const context = payload?.context ?? {};
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ ok: false, error: 'النص المطلوب غير متوفر' }), { status: 400 });
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [
            { type: 'text', text: 'أنت مساعد لإدارة العقارات. استخدم السياق المتاح فقط. لا تنفّذ SQL ولا تعدّل البيانات.' },
            { type: 'text', text: `السياق: ${JSON.stringify(context)}` },
          ],
        },
        { role: 'user', content: [{ type: 'text', text: prompt }] },
      ],
      temperature: 0.2,
    }),
  });

  const result = await response.json();
  if (!response.ok) return new Response(JSON.stringify({ ok: false, error: result?.error?.message ?? 'AI provider error', provider: result }), { status: response.status });

  const text = result?.output_text ?? result?.output?.[0]?.content?.[0]?.text ?? '';
  return new Response(JSON.stringify({ ok: true, answer: text, provider: { id: result?.id } }), { status: 200 });
});
