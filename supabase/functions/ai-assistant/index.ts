import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type AssistantAction =
  | 'summarize_overdue_invoices'
  | 'summarize_contract_renewals'
  | 'draft_arabic_tenant_payment_reminder'
  | 'explain_property_financial_snapshot';

type AssistantRequest = {
  action: AssistantAction;
  prompt: string;
};

type AssistantResult =
  | { ok: true; message: string }
  | { ok: false; error: string; details?: string };

const actionPrompts: Record<AssistantAction, string> = {
  summarize_overdue_invoices: 'قم بتلخيص الفواتير المتأخرة بناءً على البيانات النصية المرفقة.',
  summarize_contract_renewals: 'قم بتلخيص العقود القابلة للتجديد حسب المعطيات المرسلة.',
  draft_arabic_tenant_payment_reminder: 'اكتب رسالة تذكير دفع احترافية باللغة العربية للمستأجر اعتماداً على السياق المرسل.',
  explain_property_financial_snapshot: 'اشرح اللقطة المالية للعقار بلغة عربية واضحة مع نقاط عملية.',
};
const MAX_PROMPT_LENGTH = 4_000;

const json = (payload: AssistantResult, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

function isAssistantAction(value: unknown): value is AssistantAction {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(actionPrompts, value);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'طريقة الطلب غير مدعومة' }, 405);
  }
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return json({ ok: false, error: 'نوع المحتوى غير مدعوم' }, 415);
  }

  const apiKey = Deno.env.get('AI_PROVIDER_API_KEY')?.trim();
  const model = Deno.env.get('AI_PROVIDER_MODEL')?.trim() || 'gpt-4o-mini';

  if (!apiKey) {
    return json({ ok: false, error: 'إعدادات الذكاء الاصطناعي غير مكتملة' });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'صيغة الطلب غير صالحة' }, 400);
  }

  if (typeof body !== 'object' || body === null) {
    return json({ ok: false, error: 'المدخلات المطلوبة غير مكتملة' }, 400);
  }
  const payload = body as Partial<AssistantRequest>;

  if (!isAssistantAction(payload.action) || typeof payload.prompt !== 'string') {
    return json({ ok: false, error: 'المدخلات المطلوبة غير مكتملة' }, 400);
  }
  const trimmedPrompt = payload.prompt.trim();
  if (!trimmedPrompt) {
    return json({ ok: false, error: 'المدخلات المطلوبة غير مكتملة' }, 400);
  }
  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return json({ ok: false, error: `نص الطلب طويل جداً. الحد الأقصى هو ${MAX_PROMPT_LENGTH} حرفاً.` }, 400);
  }

  const systemInstruction = `${actionPrompts[payload.action]} لا تنفذ أي أوامر تعديل، ولا تستخدم SQL، وتعامل مع الرد كناتج قراءة فقط. إذا كان السياق غير كافٍ، وضّح ما ينقص بدلاً من اختلاق بيانات.`;

  let providerResponse: Response;
  try {
    providerResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: systemInstruction }] },
          { role: 'user', content: [{ type: 'input_text', text: trimmedPrompt }] },
        ],
      }),
    });
  } catch (error) {
    console.error('AI provider request failed', error);
    return json({ ok: false, error: 'تعذر الاتصال بخدمة الذكاء الاصطناعي حالياً' }, 502);
  }

  if (!providerResponse.ok) {
    const errorPayload = await providerResponse.text();
    console.error('AI provider returned non-200 response', { status: providerResponse.status, body: errorPayload });
    return json({ ok: false, error: 'تعذر الحصول على استجابة من مزود الذكاء الاصطناعي' }, 502);
  }

  let responsePayload: { output_text?: string };
  try {
    responsePayload = (await providerResponse.json()) as {
      output_text?: string;
    };
  } catch (error) {
    console.error('AI provider returned invalid JSON response', error);
    return json({ ok: false, error: 'تعذر توليد رد من مزود الذكاء الاصطناعي' }, 502);
  }

  const message = responsePayload.output_text?.trim();

  if (!message) {
    return json({ ok: false, error: 'تعذر توليد رد من مزود الذكاء الاصطناعي' });
  }

  return json({ ok: true, message });
});
