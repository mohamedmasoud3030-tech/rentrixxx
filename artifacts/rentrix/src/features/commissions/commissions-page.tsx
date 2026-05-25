import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/format';
import { useCommissionRules, useCommissions, useCreateCommission, useCreateRule, useUpdateCommissionStatus, useUpdateRule } from './use-commissions';

export function CommissionsPage() {
  const rules = useCommissionRules();
  const commissions = useCommissions();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const createCommission = useCreateCommission();
  const updateStatus = useUpdateCommissionStatus();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'cancelled'>('all');
  const [rule, setRule] = useState<{ name: string; basis: 'contract'|'invoice'|'payment'|'property'|'manual'; calc_type: 'percentage'|'fixed'; percentage: string; fixed_amount: string; recipient_person_id: string }>({ name: '', basis: 'payment', calc_type: 'percentage', percentage: '5', fixed_amount: '', recipient_person_id: '' });
  const [form, setForm] = useState({ amount: '', source_type: 'manual' as const, notes: '', due_date: '', recipient_person_id: '' });

  const filtered = useMemo(() => (commissions.data ?? []).filter((c: any) => statusFilter === 'all' || c.status === statusFilter), [commissions.data, statusFilter]);
  const totals = useMemo(() => filtered.reduce((acc: any, c: any) => { acc[c.status] = (acc[c.status] ?? 0) + Number(c.amount); return acc; }, {}), [filtered]);

  return <div className="space-y-6" dir="rtl">
    <h2 className="text-3xl font-black">العمولات</h2>
    <Card><CardHeader><CardTitle>قواعد العمولة</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-2 md:grid-cols-6">
        <Input placeholder="اسم القاعدة" value={rule.name} onChange={(e) => setRule((s) => ({ ...s, name: e.target.value }))} />
        <select className="h-10 rounded-md border px-3" value={rule.basis} onChange={(e) => setRule((s) => ({ ...s, basis: e.target.value as any }))}><option value="contract">contract</option><option value="invoice">invoice</option><option value="payment">payment</option><option value="property">property</option><option value="manual">manual</option></select>
        <select className="h-10 rounded-md border px-3" value={rule.calc_type} onChange={(e) => setRule((s) => ({ ...s, calc_type: e.target.value as any }))}><option value="percentage">percentage</option><option value="fixed">fixed</option></select>
        {rule.calc_type === 'percentage' ? <Input type="number" min="0" max="100" value={rule.percentage} onChange={(e) => setRule((s) => ({ ...s, percentage: e.target.value }))} placeholder="النسبة" /> : <Input type="number" min="0.01" value={rule.fixed_amount} onChange={(e) => setRule((s) => ({ ...s, fixed_amount: e.target.value }))} placeholder="المبلغ" />}
        <Input placeholder="معرف المستلم (اختياري)" value={rule.recipient_person_id} onChange={(e) => setRule((s) => ({ ...s, recipient_person_id: e.target.value }))} />
        <Button onClick={() => createRule.mutate({ name: rule.name, basis: rule.basis, calc_type: rule.calc_type, percentage: rule.calc_type === 'percentage' ? Number(rule.percentage) : null, fixed_amount: rule.calc_type === 'fixed' ? Number(rule.fixed_amount) : null, recipient_person_id: rule.recipient_person_id || null })}>إضافة قاعدة</Button>
      </div>
      <Table><TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الأساس</TableHead><TableHead>الاحتساب</TableHead><TableHead>نشطة</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader><TableBody>{(rules.data ?? []).map((r: any) => <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.basis}</TableCell><TableCell>{r.calc_type === 'percentage' ? `${r.percentage}%` : r.fixed_amount}</TableCell><TableCell>{r.is_active ? 'نعم' : 'لا'}</TableCell><TableCell><Button variant="secondary" onClick={() => updateRule.mutate({ id: r.id, payload: { is_active: !r.is_active } })}>{r.is_active ? 'تعطيل' : 'تفعيل'}</Button></TableCell></TableRow>)}</TableBody></Table>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>تسجيل عمولة</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-2 md:grid-cols-5">
        <Input type="number" min="0.01" placeholder="القيمة" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
        <select className="h-10 rounded-md border px-3" value={form.source_type} onChange={(e) => setForm((s) => ({ ...s, source_type: e.target.value as any }))}><option value="manual">manual</option><option value="contract">contract</option><option value="invoice">invoice</option><option value="payment">payment</option><option value="property">property</option></select>
        <Input type="date" value={form.due_date} onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))} />
        <Input placeholder="معرف المستلم" value={form.recipient_person_id} onChange={(e) => setForm((s) => ({ ...s, recipient_person_id: e.target.value }))} />
        <Input placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
      </div>
      <Button onClick={() => createCommission.mutate({ amount: Number(form.amount), source_type: form.source_type, due_date: form.due_date || null, recipient_person_id: form.recipient_person_id || null, notes: form.notes || null })}>إضافة عمولة</Button>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><p>قيد الانتظار: {Number(totals.pending ?? 0).toFixed(2)}</p><p>معتمدة: {Number(totals.approved ?? 0).toFixed(2)}</p><p>مدفوعة: {Number(totals.paid ?? 0).toFixed(2)}</p><p>ملغاة: {Number(totals.cancelled ?? 0).toFixed(2)}</p></div>
      <div className="flex items-center gap-2"><span className="text-sm">تصفية الحالة</span><select className="h-10 rounded-md border px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}><option value="all">الكل</option><option value="pending">pending</option><option value="approved">approved</option><option value="paid">paid</option><option value="cancelled">cancelled</option></select></div>
      <Table><TableHeader><TableRow><TableHead>القيمة</TableHead><TableHead>الحالة</TableHead><TableHead>الاستحقاق</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{filtered.map((c: any) => <TableRow key={c.id}><TableCell>{Number(c.amount).toFixed(2)}</TableCell><TableCell>{c.status}</TableCell><TableCell>{c.due_date ?? '-'}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => updateStatus.mutate({ id: c.id, status: 'approved' })}>اعتماد</Button><Button variant="secondary" onClick={() => updateStatus.mutate({ id: c.id, status: 'paid' })}>تحويل إلى مدفوع</Button><Button variant="secondary" onClick={() => updateStatus.mutate({ id: c.id, status: 'cancelled' })}>إلغاء</Button></div></TableCell></TableRow>)}</TableBody></Table>
    </CardContent></Card>

    {[rules, commissions].some((q) => q.isError) ? <p className="text-sm text-destructive">{getErrorMessage(rules.error ?? commissions.error, 'تعذر تحميل بيانات العمولات')}</p> : null}
  </div>;
}
