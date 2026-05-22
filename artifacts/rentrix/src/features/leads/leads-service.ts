import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';

export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).returns<Lead[]>();
  if (error) throw error;
  return data ?? [];
}

export async function createLead(payload: LeadInsert): Promise<Lead> {
  const { data, error } = await supabase.from('leads').insert(payload).select('*').single().returns<Lead>();
  if (error) throw error;
  return data;
}

export async function updateLead(leadId: string, payload: LeadUpdate): Promise<Lead> {
  const { data, error } = await supabase.from('leads').update(payload).eq('id', leadId).select('*').single().returns<Lead>();
  if (error) throw error;
  return data;
}
