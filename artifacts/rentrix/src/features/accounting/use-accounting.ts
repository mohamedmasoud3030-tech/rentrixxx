import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createAccount, createJournalEntry, getTrialBalance, listAccounts, listJournalEntries, listLedgerLines, updateAccount } from '@/services/accountingService';

const keys = {
  accounts: ['accounting', 'accounts'] as const,
  entries: ['accounting', 'entries'] as const,
  ledger: ['accounting', 'ledger'] as const,
  trial: ['accounting', 'trial'] as const,
};

export const useAccountingAccounts = () => useQuery({ queryKey: keys.accounts, queryFn: () => listAccounts(supabase) });
export const useJournalEntries = () => useQuery({ queryKey: keys.entries, queryFn: () => listJournalEntries(supabase) });
export const useLedgerLines = () => useQuery({ queryKey: keys.ledger, queryFn: () => listLedgerLines(supabase) });
export const useTrialBalance = () => useQuery({ queryKey: keys.trial, queryFn: () => getTrialBalance(supabase) });

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (payload: Parameters<typeof createAccount>[1]) => createAccount(supabase, payload), onSuccess: () => qc.invalidateQueries({ queryKey: keys.accounts }) });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateAccount>[2] }) => updateAccount(supabase, id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: keys.accounts }) });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, lines }: { payload: Parameters<typeof createJournalEntry>[1]; lines: Parameters<typeof createJournalEntry>[2] }) => createJournalEntry(supabase, payload, lines),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.entries });
      qc.invalidateQueries({ queryKey: keys.ledger });
      qc.invalidateQueries({ queryKey: keys.trial });
    },
  });
}
