import { Archive, Edit, MapPinned, Plus, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { PageStateCard, WriteErrorCard } from '@/components/page-state-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import type { LandFilters, LandFormValues, LandRecord } from '../types';

const statusLabels: Record<string, string> = { available: 'متاحة', reserved: 'محجوزة', sold: 'مباعة', archived: 'مؤرشفة' };
const categoryLabels: Record<string, string> = { residential: 'سكني', commercial: 'تجاري', agricultural: 'زراعي', investment: 'استثماري' };

function money(value: number | null) {
  return value == null ? '—' : new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value);
}

function tone(status: string | null) {
  if (status === 'available') return 'green';
  if (status === 'reserved') return 'gold';
  if (status === 'sold') return 'blue';
  return 'gray';
}

type Props = Readonly<{
  rows: LandRecord[];
  filters: LandFilters;
  draft: LandFormValues;
  editingLand: LandRecord | null;
  formOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isArchiving: boolean;
  error: unknown;
  writeError: unknown;
  onFiltersChange: (filters: LandFilters) => void;
  onDraftChange: (draft: LandFormValues) => void;
  onCreate: () => void;
  onEdit: (land: LandRecord) => void;
  onFormOpenChange: (open: boolean) => void;
  onSubmit: (values: LandFormValues) => void;
  onArchive: (id: string) => void;
  onRetry: () => void;
}>;

export function LandsView(props: Props) {
  const { rows, filters, draft, editingLand, formOpen, isLoading, isSaving, isArchiving, error, writeError, onFiltersChange, onDraftChange, onCreate, onEdit, onFormOpenChange, onSubmit, onArchive, onRetry } = props;
  const activeRows = rows.filter((row) => row.status !== 'archived').length;
  const totalArea = rows.reduce((sum, row) => sum + (row.area ?? 0), 0);
  const hasFilters = filters.query.trim().length > 0 || filters.status !== 'all';

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-l from-primary/10 via-card to-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><MapPinned className="size-5" /> الأراضي</CardTitle>
            <CardDescription>إدارة قطع الأراضي والملكية التشغيلية بدون تحويلها إلى منتج عقاري منفصل.</CardDescription>
          </div>
          <Button onClick={onCreate}><Plus className="me-2 size-4" />إضافة سجل أرض</Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Summary label="إجمالي السجلات" value={String(rows.length)} />
          <Summary label="نشطة" value={String(activeRows)} />
          <Summary label="إجمالي المساحة" value={money(totalArea)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_12rem]">
          <Input value={filters.query} onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })} placeholder="بحث بالاسم، رقم القطعة، الموقع، التصنيف" aria-label="بحث الأراضي" />
          <Select value={filters.status} onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })} aria-label="حالة الأرض">
            <option value="all">كل الحالات</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </CardContent>
      </Card>

      {error ? <ErrorCard message="تعذر تحميل الأراضي" onRetry={onRetry} /> : null}
      {writeError ? <WriteErrorCard message={writeError instanceof Error ? writeError.message : 'تعذر حفظ التغيير على سجل الأرض. راجع الصلاحيات أو الاتصال ثم حاول مرة أخرى.'} /> : null}
      {isLoading ? <PageStateCard title="جارٍ تحميل الأراضي..." /> : null}
      {!isLoading && !error && rows.length === 0 ? <PageStateCard title={hasFilters ? 'لا توجد أراضٍ ضمن الفلاتر الحالية' : 'لا توجد سجلات أراضٍ بعد'} description={hasFilters ? 'غيّر البحث أو الحالة لعرض سجلات أراضٍ أخرى.' : 'أضف أول سجل أرض تشغيلي عند توفر بيانات قطعة أرض حقيقية.'} action={hasFilters ? undefined : <Button onClick={onCreate}>إضافة سجل أرض</Button>} /> : null}
      {rows.length > 0 ? <LandRows rows={rows} isArchiving={isArchiving} onEdit={onEdit} onArchive={onArchive} /> : null}

      <Dialog open={formOpen} onOpenChange={onFormOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLand ? 'تعديل أرض' : 'إضافة أرض'}</DialogTitle>
            <DialogDescription>الحقول تحفظ سجل أرض تشغيلي وتربطه بالمالك عند توفر معرفه.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit(draft); }}>
            <Field label="اسم الأرض"><Input required value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} /></Field>
            <Field label="رقم القطعة"><Input value={draft.plot_no} onChange={(event) => onDraftChange({ ...draft, plot_no: event.target.value })} /></Field>
            <Field label="الموقع"><Input value={draft.location} onChange={(event) => onDraftChange({ ...draft, location: event.target.value })} /></Field>
            <Field label="المساحة"><Input type="number" min="0" value={draft.area} onChange={(event) => onDraftChange({ ...draft, area: event.target.value })} /></Field>
            <Field label="التصنيف"><Select value={draft.category} onChange={(event) => onDraftChange({ ...draft, category: event.target.value })}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
            <Field label="الحالة"><Select value={draft.status} onChange={(event) => onDraftChange({ ...draft, status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
            <Field label="معرف المالك"><Input value={draft.owner_id} onChange={(event) => onDraftChange({ ...draft, owner_id: event.target.value })} placeholder="اختياري: معرف مالك موجود فقط" /></Field>
            <Field label="سعر المالك"><Input type="number" min="0" value={draft.owner_price} onChange={(event) => onDraftChange({ ...draft, owner_price: event.target.value })} /></Field>
            <Field label="سعر الشراء"><Input type="number" min="0" value={draft.purchase_price} onChange={(event) => onDraftChange({ ...draft, purchase_price: event.target.value })} /></Field>
            <Field label="عمولة تقديرية مسجلة"><Input type="number" min="0" value={draft.commission} onChange={(event) => onDraftChange({ ...draft, commission: event.target.value })} /></Field>
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

function ErrorCard({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return <Card role="alert"><CardHeader><CardTitle>{message}</CardTitle><CardDescription>راجع الاتصال والصلاحيات ثم أعد المحاولة.</CardDescription><Button variant="secondary" onClick={onRetry}><RotateCcw className="me-2 size-4" />إعادة المحاولة</Button></CardHeader></Card>;
}

function LandRows({ rows, isArchiving, onEdit, onArchive }: Readonly<{ rows: LandRecord[]; isArchiving: boolean; onEdit: (row: LandRecord) => void; onArchive: (id: string) => void }>) {
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-3 p-4 md:hidden">{rows.map((row) => <LandCard key={row.id} row={row} isArchiving={isArchiving} onEdit={onEdit} onArchive={onArchive} />)}</div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr><th className="p-3 text-right">الأرض</th><th className="p-3 text-right">الموقع</th><th className="p-3 text-right">القيمة</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="max-w-56 whitespace-normal break-words p-3 font-bold">{row.name ?? row.plot_no ?? 'بدون اسم'}<p className="text-xs text-muted-foreground">{categoryLabels[row.category ?? ''] ?? row.category}</p></td><td className="max-w-72 whitespace-normal break-words p-3">{row.location ?? '—'}</td><td className="p-3">{money(row.owner_price ?? row.purchase_price)}</td><td className="p-3"><StatusBadge tone={tone(row.status)}>{statusLabels[row.status ?? ''] ?? row.status ?? '—'}</StatusBadge></td><td className="p-3"><RowActions id={row.id} disabled={isArchiving} onEdit={() => onEdit(row)} onArchive={onArchive} /></td></tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function LandCard({ row, isArchiving, onEdit, onArchive }: Readonly<{ row: LandRecord; isArchiving: boolean; onEdit: (row: LandRecord) => void; onArchive: (id: string) => void }>) {
  return <div className="rounded-2xl border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{row.name ?? row.plot_no ?? 'بدون اسم'}</p><p className="text-sm text-muted-foreground">{row.location ?? 'بدون موقع'}</p></div><StatusBadge tone={tone(row.status)}>{statusLabels[row.status ?? ''] ?? row.status ?? '—'}</StatusBadge></div><p className="mt-3 text-sm">القيمة: {money(row.owner_price ?? row.purchase_price)}</p><RowActions id={row.id} disabled={isArchiving} onEdit={() => onEdit(row)} onArchive={onArchive} /></div>;
}

function RowActions({ id, disabled, onEdit, onArchive }: Readonly<{ id: string; disabled: boolean; onEdit: () => void; onArchive: (id: string) => void }>) {
  return <div className="mt-3 flex flex-wrap gap-2"><Button className="min-h-11" variant="secondary" onClick={onEdit}><Edit className="me-2 size-4" />تعديل</Button><Button className="min-h-11" variant="danger" disabled={disabled} onClick={() => onArchive(id)}><Archive className="me-2 size-4" />أرشفة</Button></div>;
}
