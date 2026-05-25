import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/format';
import { useAccountingAccounts, useCreateAccount, useCreateJournalEntry, useJournalEntries, useLedgerLines, useTrialBalance } from './use-accounting';

const accountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;

export function AccountingPage() {
  const accounts = useAccountingAccounts();
  const entries = useJournalEntries();
  const ledger = useLedgerLines();
  const trial = useTrialBalance();
  const createAccount = useCreateAccount();
  const createEntry = useCreateJournalEntry();

  const [accountForm, setAccountForm] = useState<{ code: string; name_ar: string; name_en: string; account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }>({ code: '', name_ar: '', name_en: '', account_type: 'asset' });
  const [line1, setLine1] = useState({ account_id: '', debit: '0', credit: '0' });
  const [line2, setLine2] = useState({ account_id: '', debit: '0', credit: '0' });
  const [entryForm, setEntryForm] = useState<{ entry_date: string; reference: string; description: string; status: 'draft' | 'posted' }>({ entry_date: new Date().toISOString().slice(0, 10), reference: '', description: '', status: 'posted' });

  const totals = useMemo(() => {
    const debit = Number(line1.debit || 0) + Number(line2.debit || 0);
    const credit = Number(line1.credit || 0) + Number(line2.credit || 0);
    return { debit, credit };
  }, [line1, line2]);

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-3xl font-black">المحاسبة</h2>

      <Card>
        <CardHeader><CardTitle>دليل الحسابات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="رمز الحساب" value={accountForm.code} onChange={(e) => setAccountForm((s) => ({ ...s, code: e.target.value }))} />
            <Input placeholder="الاسم العربي" value={accountForm.name_ar} onChange={(e) => setAccountForm((s) => ({ ...s, name_ar: e.target.value }))} />
            <Input placeholder="الاسم الإنجليزي" value={accountForm.name_en} onChange={(e) => setAccountForm((s) => ({ ...s, name_en: e.target.value }))} />
            <select className="h-10 rounded-md border px-3" value={accountForm.account_type} onChange={(e) => setAccountForm((s) => ({ ...s, account_type: e.target.value as typeof accountTypes[number] }))}>{accountTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <Button onClick={() => createAccount.mutate(accountForm)}>إضافة حساب</Button>
          {createAccount.isError ? <p className="text-sm text-destructive">{getErrorMessage(createAccount.error, 'تعذر حفظ الحساب')}</p> : null}
          <Table><TableHeader><TableRow><TableHead>الرمز</TableHead><TableHead>الاسم</TableHead><TableHead>النوع</TableHead></TableRow></TableHeader><TableBody>{(accounts.data ?? []).map((a) => <TableRow key={a.id}><TableCell>{a.code}</TableCell><TableCell>{a.name_ar}</TableCell><TableCell>{a.account_type}</TableCell></TableRow>)}</TableBody></Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قيد يومية يدوي</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <Input type="date" value={entryForm.entry_date} onChange={(e) => setEntryForm((s) => ({ ...s, entry_date: e.target.value }))} />
            <Input placeholder="مرجع" value={entryForm.reference} onChange={(e) => setEntryForm((s) => ({ ...s, reference: e.target.value }))} />
            <Input placeholder="وصف" value={entryForm.description} onChange={(e) => setEntryForm((s) => ({ ...s, description: e.target.value }))} />
            <select className="h-10 rounded-md border px-3" value={entryForm.status} onChange={(e) => setEntryForm((s) => ({ ...s, status: e.target.value as 'draft' | 'posted' }))}><option value="posted">posted</option><option value="draft">draft</option></select>
          </div>
          {[line1, line2].map((line, idx) => (
            <div className="grid gap-2 md:grid-cols-3" key={idx}>
              <select className="h-10 rounded-md border px-3" value={line.account_id} onChange={(e) => (idx === 0 ? setLine1 : setLine2)((s) => ({ ...s, account_id: e.target.value }))}>
                <option value="">اختر الحساب</option>
                {(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name_ar}</option>)}
              </select>
              <Input type="number" min="0" value={line.debit} onChange={(e) => (idx === 0 ? setLine1 : setLine2)((s) => ({ ...s, debit: e.target.value }))} placeholder="مدين" />
              <Input type="number" min="0" value={line.credit} onChange={(e) => (idx === 0 ? setLine1 : setLine2)((s) => ({ ...s, credit: e.target.value }))} placeholder="دائن" />
            </div>
          ))}
          <p className="text-sm">إجمالي المدين: {totals.debit.toFixed(2)} | إجمالي الدائن: {totals.credit.toFixed(2)}</p>
          <Button onClick={() => createEntry.mutate({ payload: { ...entryForm, source_module: 'manual' }, lines: [
            { account_id: line1.account_id, debit: Number(line1.debit), credit: Number(line1.credit) },
            { account_id: line2.account_id, debit: Number(line2.debit), credit: Number(line2.credit) },
          ] })}>حفظ القيد</Button>
          {createEntry.isError ? <p className="text-sm text-destructive">{getErrorMessage(createEntry.error, 'تعذر حفظ القيد')}</p> : null}
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>القيود</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>مرجع</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader><TableBody>{(entries.data ?? []).map((e) => <TableRow key={e.id}><TableCell>{e.entry_date}</TableCell><TableCell>{e.reference ?? '-'}</TableCell><TableCell>{e.status}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

      <Card><CardHeader><CardTitle>دفتر الأستاذ</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>الحساب</TableHead><TableHead>مدين</TableHead><TableHead>دائن</TableHead></TableRow></TableHeader><TableBody>{(ledger.data ?? []).map((l: any) => <TableRow key={l.id}><TableCell>{l.accounting_accounts?.code} - {l.accounting_accounts?.name_ar}</TableCell><TableCell>{Number(l.debit).toFixed(2)}</TableCell><TableCell>{Number(l.credit).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

      <Card><CardHeader><CardTitle>ميزان المراجعة</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>الحساب</TableHead><TableHead>المدين</TableHead><TableHead>الدائن</TableHead></TableRow></TableHeader><TableBody>{(trial.data ?? []).map((t) => <TableRow key={t.account_id}><TableCell>{t.code} - {t.name_ar}</TableCell><TableCell>{t.debit.toFixed(2)}</TableCell><TableCell>{t.credit.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

      {[accounts, entries, ledger, trial].some((q) => q.isError) ? <p className="text-destructive text-sm">{getErrorMessage(accounts.error ?? entries.error ?? ledger.error ?? trial.error, 'تعذر تحميل بيانات المحاسبة')}</p> : null}
    </div>
  );
}
