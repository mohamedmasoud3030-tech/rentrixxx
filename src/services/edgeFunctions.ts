import { supabase } from './supabase';
import { logger } from './logger';

export interface OwnerPortalPayload {
  owner: { id: string; name: string };
  stats: { collections: number; expenses: number; officeShare: number; net: number };
  currency: string;
}

export async function createOwnerAccessToken(ownerId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('owner-access-token', {
    body: { ownerId, action: 'issue' },
  });
  if (error || !data?.token) {
    logger.error('[EdgeFunction] owner-access-token issue failed', error || data);
    throw new Error('تعذر إنشاء رابط البوابة الآمن.');
  }
  return data.token as string;
}

export async function verifyOwnerAccessToken(ownerId: string, token: string): Promise<OwnerPortalPayload> {
  const { data, error } = await supabase.functions.invoke('owner-access-token', {
    body: { ownerId, token, action: 'verify' },
  });
  if (error || !data?.owner) {
    logger.warn('[EdgeFunction] owner-access-token verify failed', error || data);
    throw new Error('الرابط غير صالح أو منتهي الصلاحية.');
  }
  return data as OwnerPortalPayload;
}

export async function adminCreateUser(payload: { email: string; password: string; username: string; role: 'ADMIN' | 'USER' }): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', { body: payload });
  if (error || !data?.id) {
    logger.error('[EdgeFunction] admin-create-user failed', error || data);
    throw new Error(data?.error || error?.message || 'فشل إنشاء المستخدم');
  }
  return data as { id: string };
}

export async function askAssistant(prompt: string, context: unknown): Promise<string> {
  const { data, error } = await supabase.functions.invoke('assistant-proxy', {
    body: { prompt, context },
  });
  if (error || !data?.text) {
    logger.error('[EdgeFunction] assistant-proxy failed', error || data);
    throw new Error('تعذر الاتصال بالمساعد الذكي.');
  }
  return data.text as string;
}
