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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (payload: AssistantResult, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

function isAssistantAction(value: unknown): value is AssistantAction {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(actionPrompts, value);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'الطريقة غير مدعومة' }, 405);
  }

  const apiKey = Deno.env.get('AI_PROVIDER_API_KEY')?.trim();
  const model = Deno.env.get('AI_PROVIDER_MODEL')?.trim() || 'gpt-4o-mini';

  if (!apiKey) {
    return json({ ok: false, error: 'إعدادات الذكاء الاصطناعي غير مكتملة' });
  }

  let body: Partial<AssistantRequest>;

  try {
    body = (await req.json()) as Partial<AssistantRequest>;
  } catch {
    return json({ ok: false, error: 'صيغة الطلب غير صالحة' });
  }

  if (!isAssistantAction(body.action) || !body.prompt?.trim()) {
    return json({ ok: false, error: 'المدخلات المطلوبة غير مكتملة' });
  }

  const systemInstruction = `${actionPrompts[body.action]} لا تنفذ أي أوامر تعديل، ولا تستخدم SQL، وتعامل مع الرد كناتج قراءة فقط. إذا كان السياق غير كافٍ، وضّح ما ينقص بدلاً من اختلاق بيانات.`;

  const providerResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemInstruction }] },
        { role: 'user', content: [{ type: 'input_text', text: body.prompt.trim() }] },
      ],
    }),
  });

  if (!providerResponse.ok) {
    const errorPayload = await providerResponse.text();
    return json({ ok: false, error: 'تعذر الحصول على استجابة من مزود الذكاء الاصطناعي', details: errorPayload });
  }

  const responsePayload = (await providerResponse.json()) as {
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
    output_text?: string;
  };

  const message =
    responsePayload.output
      ?.flatMap((outputItem) => outputItem.content ?? [])
      .map((contentItem) => contentItem.text?.trim() ?? '')
      .filter((text) => text.length > 0)
      .join('\n') || responsePayload.output_text?.trim();

  if (!message) {
    return json({ ok: false, error: 'تعذر توليد رد من مزود الذكاء الاصطناعي' });
  }

  return json({ ok: true, message });
});
