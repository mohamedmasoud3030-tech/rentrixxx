import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type AccountRow = Database['public']['Tables']['accounting_accounts']['Row'];
type EntryRow = Database['public']['Tables']['accounting_journal_entries']['Row'];
type LineRow = Database['public']['Tables']['accounting_journal_lines']['Row'];

type AccountInsert = Database['public']['Tables']['accounting_accounts']['Insert'];

type LineInput = { account_id: string; debit: number; credit: number; line_description?: string | null };

export async function listAccounts(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('accounting_accounts').select('*').is('deleted_at', null).order('code');
  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

export async function createAccount(supabase: SupabaseClient, payload: AccountInsert) {
  const { data, error } = await supabase.from('accounting_accounts').insert(payload).select('*').single();
  if (error) throw error;
  return data as AccountRow;
}

export async function updateAccount(supabase: SupabaseClient, id: string, payload: Partial<AccountInsert>) {
  const { data, error } = await supabase.from('accounting_accounts').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as AccountRow;
}

export async function listJournalEntries(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('accounting_journal_entries').select('*').is('deleted_at', null).order('entry_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EntryRow[];
}

export async function listLedgerLines(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('accounting_journal_lines')
    .select('*, accounting_accounts(code,name_ar), accounting_journal_entries(entry_date,reference,status)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function validateLines(lines: LineInput[]) {
  if (lines.length === 0) throw new Error('يجب إضافة سطر واحد على الأقل');
  const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (lines.some((l) => l.debit < 0 || l.credit < 0)) throw new Error('لا يمكن إدخال قيم سالبة');
  if (lines.some((l) => (l.debit === 0 && l.credit === 0) || (l.debit > 0 && l.credit > 0))) throw new Error('كل سطر يجب أن يحتوي على مدين أو دائن فقط');
  if (Math.abs(debit - credit) > 0.0001) throw new Error('يجب أن يتساوى مجموع المدين والدائن');
}

export async function createJournalEntry(
  supabase: SupabaseClient,
  payload: Pick<EntryRow, 'entry_date' | 'reference' | 'description' | 'status' | 'source_module'>,
  lines: LineInput[],
) {
  validateLines(lines);
  const { data: entry, error: entryError } = await supabase
    .from('accounting_journal_entries')
    .insert(payload)
    .select('*')
    .single();
  if (entryError) throw entryError;
  const rows = lines.map((line) => ({ ...line, journal_entry_id: entry.id }));
  const { error: lineError } = await supabase.from('accounting_journal_lines').insert(rows);
  if (lineError) throw lineError;
  return entry as EntryRow;
}

export async function getTrialBalance(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('accounting_journal_lines')
    .select('account_id,debit,credit,accounting_accounts(code,name_ar)')
    .is('deleted_at', null);
  if (error) throw error;
  const map = new Map<string, { account_id: string; code: string; name_ar: string; debit: number; credit: number }>();
  for (const row of data ?? []) {
    const key = row.account_id as string;
    const account = (row.accounting_accounts as unknown as { code: string; name_ar: string }[] | null)?.[0] ?? null;
    const current = map.get(key) ?? { account_id: key, code: account?.code ?? '-', name_ar: account?.name_ar ?? '-', debit: 0, credit: 0 };
    current.debit += Number(row.debit ?? 0);
    current.credit += Number(row.credit ?? 0);
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}
