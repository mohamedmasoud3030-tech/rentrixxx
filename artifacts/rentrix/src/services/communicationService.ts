import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type MsgInsert = Database['public']['Tables']['communication_messages']['Insert'];
type TplInsert = Database['public']['Tables']['communication_templates']['Insert'];

export async function listMessages(supabase: SupabaseClient, filter: { channel?: string; status?: string; search?: string }) {
  let q = supabase.from('communication_messages').select('*').order('created_at', { ascending: false });
  if (filter.channel && filter.channel !== 'all') q = q.eq('channel', filter.channel);
  if (filter.status && filter.status !== 'all') q = q.eq('status', filter.status);
  if (filter.search?.trim()) q = q.or(`recipient_name.ilike.%${filter.search}%,body.ilike.%${filter.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listTemplates(supabase: SupabaseClient, channel?: string) {
  let q = supabase.from('communication_templates').select('*').eq('active', true).order('name');
  if (channel && channel !== 'all') q = q.eq('channel', channel);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(supabase: SupabaseClient, payload: TplInsert) {
  const { data, error } = await supabase.from('communication_templates').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function createMessage(supabase: SupabaseClient, payload: MsgInsert) {
  const initialStatus = payload.channel === 'note' ? 'sent' : 'queued';
  const { data: inserted, error: insertError } = await supabase.from('communication_messages').insert({ ...payload, status: initialStatus, sent_at: payload.channel === 'note' ? new Date().toISOString() : null }).select('*').single();
  if (insertError) throw insertError;

  if (payload.channel === 'note') return { id: inserted.id, status: 'sent' as const, error: null, row: { data: inserted, error: null } };

  if (payload.channel === 'whatsapp') {
    if (!payload.recipient_phone) {
      await supabase.from('communication_messages').update({ status: 'failed', error_message: 'رقم الهاتف غير متوفر' }).eq('id', inserted.id);
      return { id: inserted.id, status: 'failed' as const, error: 'رقم الهاتف غير متوفر', row: { data: inserted, error: null } };
    }
    const { data: fnData, error: fnError } = await supabase.functions.invoke('send-whatsapp', { body: { to: payload.recipient_phone, message: payload.body } });
    if (fnError || !fnData?.ok) {
      const err = fnData?.error ?? fnError?.message ?? 'الإعدادات غير مكتملة';
      await supabase.from('communication_messages').update({ status: 'failed', error_message: err, provider_response: fnData ?? null }).eq('id', inserted.id);
      return { id: inserted.id, status: 'failed' as const, error: err, row: { data: inserted, error: null } };
    }
    await supabase.from('communication_messages').update({ status: 'sent', provider_name: 'whatsapp_cloud_api', provider_message_id: fnData?.payload?.messages?.[0]?.id ?? null, provider_response: fnData, sent_at: new Date().toISOString() }).eq('id', inserted.id);
    return { id: inserted.id, status: 'sent' as const, error: null, row: { data: inserted, error: null } };
  }

  await supabase.from('communication_messages').update({ status: 'failed', error_message: 'الإعدادات غير مكتملة' }).eq('id', inserted.id);
  return { id: inserted.id, status: 'failed' as const, error: 'الإعدادات غير مكتملة', row: { data: inserted, error: null } };
}

export async function updateMessageStatus(supabase: SupabaseClient, id: string, status: 'draft'|'queued'|'sent'|'failed', errorMessage?: string | null) {
  const { data, error } = await supabase.from('communication_messages').update({ status, error_message: errorMessage ?? null, sent_at: status === 'sent' ? new Date().toISOString() : null }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function listRecipients(supabase: SupabaseClient) {
  const [people, leads, owners, tenants] = await Promise.all([
    supabase.from('people').select('id,full_name,phone,email').is('deleted_at', null).limit(100),
    supabase.from('leads').select('id,full_name,phone,email').limit(100),
    supabase.from('owners').select('id,full_name,phone,email').is('deleted_at', null).limit(100),
    supabase.from('tenants').select('id,person_id').is('deleted_at', null).limit(100),
  ]);
  if (people.error) throw people.error;
  if (leads.error) throw leads.error;
  if (owners.error) throw owners.error;
  if (tenants.error) throw tenants.error;
  return { people: people.data ?? [], leads: leads.data ?? [], owners: owners.data ?? [], tenants: tenants.data ?? [] };
}
