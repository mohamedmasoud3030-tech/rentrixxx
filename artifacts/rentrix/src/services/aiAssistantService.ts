import type { SupabaseClient } from '@supabase/supabase-js';

export async function buildAssistantContext(supabase: SupabaseClient) {
  const today = new Date().toISOString().slice(0, 10);
  const [properties, contracts, overdueInvoices, upcomingContracts, arrears, maintenance] = await Promise.all([
    supabase.from('properties').select('id,title,status,type,address').is('deleted_at', null).limit(20),
    supabase.from('contracts').select('id,start_date,end_date,status,rent_amount').is('deleted_at', null).limit(20),
    supabase.from('invoices').select('id,due_date,amount,paid_amount,status').is('deleted_at', null).or('status.eq.overdue,due_date.lt.' + today).limit(20),
    supabase.from('contracts').select('id,end_date,status').is('deleted_at', null).gte('end_date', today).lte('end_date', new Date(Date.now() + 1000*60*60*24*60).toISOString().slice(0,10)).limit(20),
    supabase.from('invoices').select('amount,paid_amount,status').is('deleted_at', null).limit(100),
    supabase.from('maintenance_requests').select('id,title,status,cost').is('deleted_at', null).limit(20),
  ]);

  const arrearsTotal = (arrears.data ?? []).reduce((sum, inv: any) => sum + Math.max(0, Number(inv.amount ?? 0) - Number(inv.paid_amount ?? 0)), 0);
  return {
    properties: properties.data ?? [],
    contracts: contracts.data ?? [],
    overdueInvoices: overdueInvoices.data ?? [],
    renewals: upcomingContracts.data ?? [],
    arrearsSummary: { totalOutstanding: arrearsTotal, invoicesCount: (arrears.data ?? []).length },
    maintenance: maintenance.data ?? [],
  };
}

export async function askAssistant(supabase: SupabaseClient, prompt: string) {
  const context = await buildAssistantContext(supabase);
  const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { prompt, context } });
  if (error) throw error;
  return data as { ok: boolean; answer?: string; error?: string; missing?: string[] };
}
