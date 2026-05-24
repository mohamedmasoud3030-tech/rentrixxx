import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/format';
import type { AccountingAccountType, AccountingEntryStatus } from '@/services/accountingService';
import { useAccountingAccounts, useCreateAccount, useCreateJournalEntry, useJournalEntries, useLedgerLines, useTrialBalance } from './use-accounting';

const accountTypes: AccountingAccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const accountTypeLabels: Record<AccountingAccountType, string> = {
  asset: 'أصل',
  liability: 'التزام',
  equity: 'حقوق ملكية',
  revenue: 'إيراد',
  expense: 'مصروف',
};
const entryStatusLabels: Record<AccountingEntryStatus, string> = {
  draft: 'مسودة',
  posted: 'مرحل',
};

type JournalLineForm = { account_id: string; debit: string; credit: string };

function toAmount(value: string) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function AccountingPage() {
  const accounts = useAccountingAccounts();
  const entries = useJournalEntries();
  const ledger = useLedgerLines();
  const trial = useTrialBalance();
  const createAccount = useCreateAccount();
  const createEntry = useCreateJournalEntry();

  const [accountForm, setAccountForm] = useState<{ code: string; name_ar: string; name_en: string; account_type: AccountingAccountType }>({ code: '', name_ar: '', name_en: '', account_type: 'asset' });
  const [line1, setLine1] = useState<JournalLineForm>({ account_id: '', debit: '0', credit: '0' });
  const [line2, setLine2] = useState<JournalLineForm>({ account_id: '', debit: '0', credit: '0' });
  const [entryForm, setEntryForm] = useState<{ entry_date: string; reference: string; description: string; status: AccountingEntryStatus }>({ entry_date: new Date().toISOString().slice(0, 10), reference: '', description: '', status: 'posted' });

  const totals = useMemo(() => {
    const debit = toAmount(line1.debit) + toAmount(line2.debit);
    const credit = toAmount(line1.credit) + toAmount(line2.credit);
    return { debit, credit };
  }, [line1, line2]);

  const accountFormInvalid = !accountForm.code.trim() || !accountForm.name_ar.trim();
  const journalLines = [line1, line2].map((line) => ({ account_id: line.account_id, debit: toAmount(line.debit), credit: toAmount(line.credit) }));
  const journalInvalid =
    !entryForm.entry_date ||
    journalLines.some((line) => !line.account_id) ||
    journalLines.some((line) => (line.debit === 0 && line.credit === 0) || (line.debit > 0 && line.credit > 0)) ||
    Math.abs(totals.debit - totals.credit) > 0.0001;

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-3xl font-black">المحاسبة</h2>

      <Card>
        <CardHeader><CardTitle>دليل الحسابات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="رمز الحساب" value={accountForm.code} onChange={(event) => setAccountForm((state) => ({ ...state, code: event.target.value }))} />
            <Input placeholder="الاسم العربي" value={accountForm.name_ar} onChange={(event) => setAccountForm((state) => ({ ...state, name_ar: event.target.value }))} />
            <Input placeholder="الاسم الإنجليزي" value={accountForm.name_en} onChange={(event) => setAccountForm((state) => ({ ...state, name_en: event.target.value }))} />
            <select className="h-10 rounded-md border px-3" value={accountForm.account_type} onChange={(event) => setAccountForm((state) => ({ ...state, account_type: event.target.value as AccountingAccountType }))}>
              {accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabels[type]}</option>)}
            </select>
          </div>
          <Button disabled={accountFormInvalid || createAccount.isPending} onClick={() => createAccount.mutate({ ...accountForm, name_en: accountForm.name_en || null })}>إضافة حساب</Button>
          {createAccount.isError ? <p className="text-sm text-destructive">{getErrorMessage(createAccount.error, 'تعذر حفظ الحساب')}</p> : null}
          <Table><TableHeader><TableRow><TableHead>الرمز</TableHead><TableHead>الاسم</TableHead><TableHead>النوع</TableHead></TableRow></TableHeader><TableBody>{(accounts.data ?? []).map((account) => <TableRow key={account.id}><TableCell>{account.code}</TableCell><TableCell>{account.name_ar}</TableCell><TableCell>{accountTypeLabels[account.account_type]}</TableCell></TableRow>)}</TableBody></Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قيد يومية يدوي</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <Input type="date" value={entryForm.entry_date} onChange={(event) => setEntryForm((state) => ({ ...state, entry_date: event.target.value }))} />
            <Input placeholder="مرجع" value={entryForm.reference} onChange={(event) => setEntryForm((state) => ({ ...state, reference: event.target.value }))} />
            <Input placeholder="وصف" value={entryForm.description} onChange={(event) => setEntryForm((state) => ({ ...state, description: event.target.value }))} />
            <select className="h-10 rounded-md border px-3" value={entryForm.status} onChange={(event) => setEntryForm((state) => ({ ...state, status: event.target.value as AccountingEntryStatus }))}>
              <option value="posted">مرحل</option>
              <option value="draft">مسودة</option>
            </select>
          </div>
          {[line1, line2].map((line, index) => (
            <div className="grid gap-2 md:grid-cols-3" key={index === 0 ? 'debit-line' : 'credit-line'}>
              <select className="h-10 rounded-md border px-3" value={line.account_id} onChange={(event) => (index === 0 ? setLine1 : setLine2)((state) => ({ ...state, account_id: event.target.value }))}>
                <option value="">اختر الحساب</option>
                {(accounts.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name_ar}</option>)}
              </select>
              <Input type="number" min="0" value={line.debit} onChange={(event) => (index === 0 ? setLine1 : setLine2)((state) => ({ ...state, debit: event.target.value }))} placeholder="مدين" />
              <Input type="number" min="0" value={line.credit} onChange={(event) => (index === 0 ? setLine1 : setLine2)((state) => ({ ...state, credit: event.target.value }))} placeholder="دائن" />
            </div>
          ))}
          <p className="text-sm">إجمالي المدين: {totals.debit.toFixed(2)} | إجمالي الدائن: {totals.credit.toFixed(2)}</p>
          <Button disabled={journalInvalid || createEntry.isPending} onClick={() => createEntry.mutate({ payload: { ...entryForm, reference: entryForm.reference || null, description: entryForm.description || null, source_module: 'manual' }, lines: journalLines })}>حفظ القيد</Button>
          {journalInvalid ? <p className="text-xs text-muted-foreground">اختر حسابين وأدخل مدين/دائن متوازن قبل الحفظ.</p> : null}
          {createEntry.isError ? <p className="text-sm text-destructive">{getErrorMessage(createEntry.error, 'تعذر حفظ القيد')}</p> : null}
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>القيود</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>مرجع</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader><TableBody>{(entries.data ?? []).map((entry) => <TableRow key={entry.id}><TableCell>{entry.entry_date}</TableCell><TableCell>{entry.reference ?? '-'}</TableCell><TableCell>{entryStatusLabels[entry.status]}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

      <Card><CardHeader><CardTitle>دفتر الأستاذ</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>الحساب</TableHead><TableHead>مدين</TableHead><TableHead>دائن</TableHead></TableRow></TableHeader><TableBody>{(ledger.data ?? []).map((line) => <TableRow key={line.id}><TableCell>{line.account_code} - {line.account_name_ar}</TableCell><TableCell>{Number(line.debit).toFixed(2)}</TableCell><TableCell>{Number(line.credit).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

      <Card><CardHeader><CardTitle>ميزان المراجعة</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>الحساب</TableHead><TableHead>المدين</TableHead><TableHead>الدائن</TableHead></TableRow></TableHeader><TableBody>{(trial.data ?? []).map((row) => <TableRow key={row.account_id}><TableCell>{row.code} - {row.name_ar}</TableCell><TableCell>{row.debit.toFixed(2)}</TableCell><TableCell>{row.credit.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

      {[accounts, entries, ledger, trial].some((query) => query.isError) ? <p className="text-destructive text-sm">{getErrorMessage(accounts.error ?? entries.error ?? ledger.error ?? trial.error, 'تعذر تحميل بيانات المحاسبة')}</p> : null}
    </div>
  );
}
