import { Archive, ContactRound, Edit, Plus, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import type { LeadFilters, LeadFormValues, LeadRecord } from '../types';

const statusLabels: Record<string, string> = { new: 'جديد', contacted: 'تم التواصل', qualified: 'مؤهل', converted: 'تم التحويل', lost: 'مغلق', archived: 'مؤرشف' };
const sourceLabels: Record<string, string> = { walk_in: 'زيارة المكتب', phone: 'اتصال', referral: 'ترشيح', social: 'منصات اجتماعية', website: 'الموقع' };
const statusTone: Record<string, 'blue' | 'green' | 'red' | 'gray' | 'gold'> = { new: 'blue', contacted: 'gold', qualified: 'green', converted: 'green', lost: 'red', archived: 'gray' };

type Props = Readonly<{
  rows: LeadRecord[];
  filters: LeadFilters;
  draft: LeadFormValues;
  editingLead: LeadRecord | null;
  formOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isArchiving: boolean;
  error: unknown;
  onFiltersChange: (filters: LeadFilters) => void;
  onDraftChange: (draft: LeadFormValues) => void;
  onCreate: () => void;
  onEdit: (lead: LeadRecord) => void;
  onFormOpenChange: (open: boolean) => void;
  onSubmit: (values: LeadFormValues) => void;
  onArchive: (id: string) => void;
  onRetry: () => void;
}>;

export function LeadsView(props: Props) {
  const { rows, filters, draft, editingLead, formOpen, isLoading, isSaving, isArchiving, error, onFiltersChange, onDraftChange, onCreate, onEdit, onFormOpenChange, onSubmit, onArchive, onRetry } = props;
  const openLeads = rows.filter((row) => !['converted', 'lost', 'archived'].includes(row.status ?? '')).length;

  return (
    <section className="space-y-5">
      <Card className="border-primary/10 bg-gradient-to-l from-primary/10 via-card to-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="flex items-center gap-2"><ContactRound className="size-5" /> العملاء المحتملون</CardTitle><CardDescription>تسجيل مصادر العملاء وحالة المتابعة وربط التحويل لاحقاً بجهات التعامل المناسبة.</CardDescription></div>
          <Button onClick={onCreate}><Plus className="me-2 size-4" />إضافة عميل محتمل</Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3"><Summary label="إجمالي العملاء" value={String(rows.length)} /><Summary label="قيد المتابعة" value={String(openLeads)} /><Summary label="محولون" value={String(rows.filter((row) => row.status === 'converted').length)} /></CardContent>
      </Card>

      <Card><CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_12rem_12rem]"><Input value={filters.query} onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })} placeholder="بحث بالاسم، الهاتف، البريد، نوع الوحدة" aria-label="بحث العملاء المحتملين" /><Select value={filters.status} onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}><option value="all">كل الحالات</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Select value={filters.source} onChange={(event) => onFiltersChange({ ...filters, source: event.target.value })}><option value="all">كل المصادر</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></CardContent></Card>

      {error ? <ErrorCard message="تعذر تحميل العملاء المحتملين" onRetry={onRetry} /> : null}
      {isLoading ? <StateCard title="جارٍ تحميل العملاء المحتملين..." /> : null}
      {!isLoading && !error && rows.length === 0 ? <StateCard title="لا يوجد عملاء محتملون ضمن الفلاتر الحالية" description="أضف عميلاً محتملاً عند توفر بياناته، أو غيّر البحث والحالة والمصدر." /> : null}
      {rows.length > 0 ? <LeadRows rows={rows} isArchiving={isArchiving} onEdit={onEdit} onArchive={onArchive} /> : null}

      <Dialog open={formOpen} onOpenChange={onFormOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingLead ? 'تعديل عميل محتمل' : 'إضافة عميل محتمل'}</DialogTitle><DialogDescription>لا يتم إنشاء مستأجر أو مالك تلقائياً؛ التحويل يبقى قراراً تشغيلياً منظماً.</DialogDescription></DialogHeader>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit(draft); }}>
            <Field label="الاسم"><Input required value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} /></Field>
            <Field label="الهاتف"><Input value={draft.phone} onChange={(event) => onDraftChange({ ...draft, phone: event.target.value })} /></Field>
            <Field label="البريد الإلكتروني"><Input type="email" value={draft.email} onChange={(event) => onDraftChange({ ...draft, email: event.target.value })} /></Field>
            <Field label="نوع الوحدة المطلوب"><Input value={draft.desired_unit_type} onChange={(event) => onDraftChange({ ...draft, desired_unit_type: event.target.value })} /></Field>
            <Field label="المصدر"><Select value={draft.source} onChange={(event) => onDraftChange({ ...draft, source: event.target.value })}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
            <Field label="الحالة"><Select value={draft.status} onChange={(event) => onDraftChange({ ...draft, status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
            <Field label="أقل ميزانية"><Input type="number" min="0" value={draft.min_budget} onChange={(event) => onDraftChange({ ...draft, min_budget: event.target.value })} /></Field>
            <Field label="أعلى ميزانية"><Input type="number" min="0" value={draft.max_budget} onChange={(event) => onDraftChange({ ...draft, max_budget: event.target.value })} /></Field>
            <label className="grid gap-2 text-sm font-bold md:col-span-2">ملاحظات<Textarea value={draft.notes} onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })} /></label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2"><Button variant="secondary" onClick={() => onFormOpenChange(false)}>إلغاء</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'جارٍ الحفظ...' : 'حفظ'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Summary({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-2xl border bg-background/70 p-4"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>;
}

function StateCard({ title, description }: Readonly<{ title: string; description?: string }>) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}</CardHeader></Card>;
}

function ErrorCard({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return <Card role="alert"><CardHeader><CardTitle>{message}</CardTitle><CardDescription>راجع الاتصال والصلاحيات ثم أعد المحاولة.</CardDescription><Button variant="secondary" onClick={onRetry}><RotateCcw className="me-2 size-4" />إعادة المحاولة</Button></CardHeader></Card>;
}

function LeadRows({ rows, isArchiving, onEdit, onArchive }: Readonly<{ rows: LeadRecord[]; isArchiving: boolean; onEdit: (row: LeadRecord) => void; onArchive: (id: string) => void }>) {
  return <Card className="overflow-hidden"><div className="grid gap-3 p-4 md:hidden">{rows.map((row) => <LeadCard key={row.id} row={row} isArchiving={isArchiving} onEdit={onEdit} onArchive={onArchive} />)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="p-3 text-right">العميل</th><th className="p-3 text-right">المصدر</th><th className="p-3 text-right">الميزانية</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="max-w-56 whitespace-normal break-words p-3 font-bold">{row.name}<p className="text-xs text-muted-foreground">{row.phone ?? row.email ?? 'بدون بيانات اتصال'}</p></td><td className="p-3">{sourceLabels[row.source ?? ''] ?? row.source ?? '—'}</td><td className="p-3">{row.min_budget ?? '—'} - {row.max_budget ?? '—'}</td><td className="p-3"><StatusBadge tone={statusTone[row.status ?? ''] ?? 'gray'}>{statusLabels[row.status ?? ''] ?? row.status ?? '—'}</StatusBadge></td><td className="p-3"><RowActions id={row.id} disabled={isArchiving} onEdit={() => onEdit(row)} onArchive={onArchive} /></td></tr>)}</tbody></table></div></Card>;
}

function LeadCard({ row, isArchiving, onEdit, onArchive }: Readonly<{ row: LeadRecord; isArchiving: boolean; onEdit: (row: LeadRecord) => void; onArchive: (id: string) => void }>) {
  return <div className="rounded-2xl border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{row.name}</p><p className="text-sm text-muted-foreground">{row.phone ?? row.email ?? 'بدون بيانات اتصال'}</p></div><StatusBadge tone={statusTone[row.status ?? ''] ?? 'gray'}>{statusLabels[row.status ?? ''] ?? row.status ?? '—'}</StatusBadge></div><p className="mt-3 text-sm">المصدر: {sourceLabels[row.source ?? ''] ?? row.source ?? '—'}</p><RowActions id={row.id} disabled={isArchiving} onEdit={() => onEdit(row)} onArchive={onArchive} /></div>;
}

function RowActions({ id, disabled, onEdit, onArchive }: Readonly<{ id: string; disabled: boolean; onEdit: () => void; onArchive: (id: string) => void }>) {
  return <div className="mt-3 flex flex-wrap gap-2"><Button className="min-h-11" variant="secondary" onClick={onEdit}><Edit className="me-2 size-4" />تعديل</Button><Button className="min-h-11" variant="danger" disabled={disabled} onClick={() => onArchive(id)}><Archive className="me-2 size-4" />أرشفة</Button></div>;
}
