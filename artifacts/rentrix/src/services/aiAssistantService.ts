import { supabase } from '@/integrations/supabase/client';

export const AI_ACTIONS = [
  'summarize_overdue_invoices',
  'summarize_contract_renewals',
  'draft_arabic_tenant_payment_reminder',
  'explain_property_financial_snapshot',
] as const;

export type AiAssistantAction = (typeof AI_ACTIONS)[number];

export type AiAssistantResponse = {
  message: string;
};

type AiAssistantFunctionResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

export async function requestAiAssistant(action: AiAssistantAction, prompt: string): Promise<AiAssistantResponse> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error('اكتب السؤال أو السياق المطلوب أولاً');
  }

  const { data, error } = await supabase.functions.invoke<AiAssistantFunctionResponse>('ai-assistant', {
    body: {
      action,
      prompt: trimmedPrompt,
    },
  });

  if (error) {
    throw new Error(error.message || 'تعذر الاتصال بخدمة المساعد الذكي');
  }

  if (!data) {
    throw new Error('لم يتم استلام استجابة صالحة من خدمة المساعد الذكي');
  }

  if (!data.ok) {
    throw new Error(data.error || 'تعذر تنفيذ طلب المساعد الذكي');
  }

  if (!data.message) {
    throw new Error('لم يتم استلام استجابة صالحة من خدمة المساعد الذكي');
  }

  return { message: data.message };
}
