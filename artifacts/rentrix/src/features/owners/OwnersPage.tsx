import { Link } from '@tanstack/react-router';
import { Building2, Eye, LinkIcon, Pencil, Plus, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { OwnerCard } from '@/components/ui/owner-card';
import { ResponsiveFormOverlay } from '@/components/ui/responsive-form-overlay';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { OwnerCheckbox } from './OwnerCheckbox';
import { OwnerPropertySelect } from './OwnerPropertySelect';
import type { Owner, PropertyOwner, PropertyWithOwners } from './ownerService';
import {
  useCreateOwner,
  useLinkOwnerToProperty,
  useOwnerActiveContracts,
  useOwners,
  usePropertiesWithOwners,
  useUnlinkOwnerFromProperty,
  useUpdateOwner,
  useUpdatePropertyOwnerLink,
} from './useOwners';
import {
  buildOwnerWorkspaceRows,
  emptyOwnerFormValues,
  emptyPropertyOwnershipLinkFormValues,
  filterOwnerWorkspaceRows,
  getOwnerDisplayLabel,
  getOwnerPropertyOwnershipLabel,
  isActivePropertyOwnerLink,
  ownerToFormValues,
  propertyOwnerLinkToFormValues,
  propertyOwnershipLinkFormToPayload,
  summarizeOwners,
  validateOwnerForm,
  validatePropertyOwnershipLinkForm,
  type OwnerFormValues,
  type OwnerWorkspaceRow,
  type PropertyOwnershipLinkFormValues,
} from './ownerUiHelpers';

type FieldProps = Readonly<{ label: string; children: ReactNode }>;

function Field({ label, children }: FieldProps) {
  return <label className="space-y-2 text-sm font-bold"><span>{label}</span>{children}</label>;
}

type SummaryCardProps = Readonly<{ label: string; value: number; icon: typeof Users }>;
type EditingPropertyOwnerLink = Readonly<{ id: string; propertyId: string; ownerId: string }>;
type LinkedPropertyItem = Readonly<{ property: PropertyWithOwners; links: PropertyOwner[] }>;

function getOwnerPageErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function SummaryCard({ label, value, icon: Icon }: SummaryCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div><p className="text-sm font-bold text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-black">{value.toLocaleString('ar')}</p></div>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></div>
      </CardContent>
    </Card>
  );
}

type OwnerFormDialogProps = Readonly<{ owner: Owner | null; open: boolean; onOpenChange: (open: boolean) => void }>;

function OwnerFormDialog({ owner, open, onOpenChange }: OwnerFormDialogProps) {
  const [values, setValues] = useState<OwnerFormValues>(emptyOwnerFormValues);
  const [error, setError] = useState<string | null>(null);
  const createOwner = useCreateOwner();
  const updateOwner = useUpdateOwner(owner?.id ?? '');
  const isEditing = Boolean(owner);
  const isPending = createOwner.isPending || updateOwner.isPending;

  useEffect(() => {
    if (open) {
      setValues(ownerToFormValues(owner));
      setError(null);
    }
  }, [open, owner]);

  const setField = <FieldName extends keyof OwnerFormValues>(field: FieldName, value: OwnerFormValues[FieldName]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateOwnerForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      full_name: values.full_name,
      display_name: values.display_name,
      phone: values.phone,
      email: values.email,
      national_id: values.national_id,
      tax_number: values.tax_number,
      address: values.address,
      notes: values.notes,
      is_active: values.is_active,
    };

    try {
      if (owner) await updateOwner.mutateAsync(payload);
      else await createOwner.mutateAsync(payload);
      onOpenChange(false);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'تعذر حفظ بيانات المالك. تحقق من الصلاحيات وحاول مرة أخرى.');
    }
  };

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'تعديل بيانات المالك' : 'إضافة مالك'}
      description="بيانات تعريفية خفيفة للملاك بدون إضافة أرصدة أو تسويات مالية."
      className="max-w-2xl"
    >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive">{error}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم المالك *"><Input value={values.full_name} onChange={(event) => setField('full_name', event.target.value)} /></Field>
            <Field label="الاسم المختصر"><Input value={values.display_name} onChange={(event) => setField('display_name', event.target.value)} /></Field>
            <Field label="الهاتف"><Input value={values.phone} onChange={(event) => setField('phone', event.target.value)} /></Field>
            <Field label="البريد الإلكتروني"><Input dir="ltr" value={values.email} onChange={(event) => setField('email', event.target.value)} /></Field>
            <Field label="الرقم المدني"><Input value={values.national_id} onChange={(event) => setField('national_id', event.target.value)} /></Field>
            <Field label="الرقم الضريبي"><Input value={values.tax_number} onChange={(event) => setField('tax_number', event.target.value)} /></Field>
          </div>
          <Field label="العنوان"><Textarea value={values.address} onChange={(event) => setField('address', event.target.value)} /></Field>
          <Field label="ملاحظات"><Textarea value={values.notes} onChange={(event) => setField('notes', event.target.value)} /></Field>
          <OwnerCheckbox checked={values.is_active} label="مالك نشط" onCheckedChange={(checked) => setField('is_active', checked)} />
          <div className="safe-bottom-overlay -mx-4 flex flex-col-reverse gap-3 border-t border-border/60 px-4 pt-4 sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:px-0 sm:pb-0"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button><Button type="submit" disabled={isPending}>{isEditing ? 'حفظ التعديلات' : 'إنشاء المالك'}</Button></div>
        </form>
    </ResponsiveFormOverlay>
  );
}

type OwnerWorkspaceTableProps = Readonly<{
  rows: OwnerWorkspaceRow[];
  search: string;
  selectedOwner: Owner | null;
  onCreateOwner: () => void;
  onEditOwner: (owner: Owner) => void;
  onSearchChange: (search: string) => void;
  onSelectOwner: (ownerId: string) => void;
}>;

type OwnerWorkspaceRowProps = Readonly<{ row: OwnerWorkspaceRow; selectedOwnerId: string | null; onEditOwner: (owner: Owner) => void; onSelectOwner: (ownerId: string) => void }>;

function OwnerContact({ owner }: Readonly<{ owner: Owner }>) {
  return <div className="space-y-1 text-sm"><div dir="ltr" className="text-right">{owner.phone ?? '—'}</div><div dir="ltr" className="text-right text-muted-foreground">{owner.email ?? '—'}</div></div>;
}

function OwnerPropertyLinks({ row }: Readonly<{ row: OwnerWorkspaceRow }>) {
  if (!row.properties.length) return <span className="text-muted-foreground">—</span>;
  return <div className="flex flex-wrap gap-2">{row.properties.map((property) => <Button key={`${row.owner.id}-${property.id}`} variant="secondary" className="min-h-8 px-3 text-xs" asChild><Link to="/properties/$propertyId" params={{ propertyId: property.id }}>{property.title}</Link></Button>)}</div>;
}

function OwnershipSummary({ row }: Readonly<{ row: OwnerWorkspaceRow }>) {
  if (!row.properties.length) return <span className="text-muted-foreground">—</span>;
  return <div className="space-y-1 text-xs text-muted-foreground">{row.properties.map((property) => <div key={`${row.owner.id}-${property.id}-ownership`}>{getOwnerPropertyOwnershipLabel(property)}</div>)}</div>;
}

function OwnerWorkspaceRowView({ row, selectedOwnerId, onEditOwner, onSelectOwner }: OwnerWorkspaceRowProps) {
  const isSelected = row.owner.id === selectedOwnerId;
  return (
    <TableRow className={isSelected ? 'bg-primary/5' : undefined}>
      <TableCell><button type="button" className="text-right font-black hover:text-primary" onClick={() => onSelectOwner(row.owner.id)}>{getOwnerDisplayLabel(row.owner)}</button>{row.owner.display_name ? <div className="text-xs text-muted-foreground">{row.owner.full_name}</div> : null}</TableCell>
      <TableCell><OwnerContact owner={row.owner} /></TableCell>
      <TableCell>{row.propertyCount.toLocaleString('ar')}</TableCell>
      <TableCell><OwnerPropertyLinks row={row} /></TableCell>
      <TableCell><OwnershipSummary row={row} /></TableCell>
      <TableCell>{row.activeContractCount > 0 ? row.activeContractCount.toLocaleString('ar') : '—'}</TableCell>
      <TableCell><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => onSelectOwner(row.owner.id)}><Eye className="ml-1 size-4" />العلاقات</Button><Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => onEditOwner(row.owner)}><Pencil className="ml-1 size-4" />تعديل</Button></div></TableCell>
    </TableRow>
  );
}

function OwnerTableContent({ rows, selectedOwner, onEditOwner, onSelectOwner }: Omit<OwnerWorkspaceTableProps, 'search' | 'onCreateOwner' | 'onSearchChange'>) {
  return (
    <>
      {/* Mobile cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:hidden">
        {rows.map((row) => (
          <OwnerCard
            key={row.owner.id}
            id={row.owner.id}
            displayName={getOwnerDisplayLabel(row.owner)}
            fullName={row.owner.full_name}
            phone={row.owner.phone}
            email={row.owner.email}
            propertyCount={row.propertyCount}
            activeContractCount={row.activeContractCount}
            onClick={() => onSelectOwner(row.owner.id)}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader><TableRow><TableHead>اسم المالك</TableHead><TableHead>الهاتف والإيميل</TableHead><TableHead>عدد العقارات</TableHead><TableHead>أسماء العقارات</TableHead><TableHead>نسبة الملكية/الدور</TableHead><TableHead>العقود النشطة</TableHead><TableHead>روابط آمنة</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((row) => <OwnerWorkspaceRowView key={row.owner.id} row={row} selectedOwnerId={selectedOwner?.id ?? null} onEditOwner={onEditOwner} onSelectOwner={onSelectOwner} />)}</TableBody>
        </Table>
      </div>
    </>
  );
}

function OwnerWorkspaceTable({ rows, search, selectedOwner, onCreateOwner, onEditOwner, onSearchChange, onSelectOwner }: OwnerWorkspaceTableProps) {
  const hasSearch = Boolean(search.trim());
  const emptyState = <EmptyState title={hasSearch ? 'لا توجد نتائج مطابقة' : 'لا يوجد ملاك'} description={hasSearch ? 'جرّب البحث باسم أو هاتف أو بريد أو اسم عقار آخر.' : 'أضف أول مالك لبدء ربطه بالعقارات.'} action={hasSearch ? undefined : <Button onClick={onCreateOwner}>إضافة مالك</Button>} />;

  return <div className="space-y-4"><div className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-10" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="بحث باسم المالك أو الهاتف أو الإيميل أو العقار" /></div>{rows.length > 0 ? <OwnerTableContent rows={rows} selectedOwner={selectedOwner} onEditOwner={onEditOwner} onSelectOwner={onSelectOwner} /> : emptyState}</div>;
}

type OwnerRelationshipsListProps = Readonly<{ linkedProperties: LinkedPropertyItem[]; endLinkPending: boolean; onEditLink: (link: PropertyOwner) => void; onEndLink: (link: PropertyOwner) => void }>;

function OwnerRelationshipsList({ linkedProperties, endLinkPending, onEditLink, onEndLink }: OwnerRelationshipsListProps) {
  if (!linkedProperties.length) return <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">لا توجد عقارات مرتبطة بهذا المالك بعد.</p>;
  return linkedProperties.map(({ property, links }) => links.map((link) => <div key={link.id} className="rounded-2xl border border-border bg-muted/25 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{property.title}</p><p className="text-xs text-muted-foreground">{property.address}</p></div><StatusBadge tone={link.is_primary ? 'blue' : 'gray'}>{link.is_primary ? 'أساسي' : 'ثانوي'}</StatusBadge></div><div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3"><span>نسبة الملكية: <b className="text-foreground">{link.ownership_percentage}%</b></span><span>من: <b className="text-foreground">{link.starts_on ?? '—'}</b></span><span>إلى: <b className="text-foreground">{link.ends_on ?? '—'}</b></span></div><div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => onEditLink(link)}>تعديل العلاقة</Button><Button type="button" variant="danger" className="min-h-9 px-3" disabled={endLinkPending} onClick={() => onEndLink(link)}>إنهاء العلاقة</Button></div></div>));
}

type OwnershipLinkFormProps = Readonly<{
  values: PropertyOwnershipLinkFormValues;
  availableProperties: PropertyWithOwners[];
  editingLink: EditingPropertyOwnerLink | null;
  error: string | null;
  isSaving: boolean;
  onCancelEdit: () => void;
  onSubmit: (event: FormEvent) => void;
  onValueChange: <FieldName extends keyof PropertyOwnershipLinkFormValues>(field: FieldName, value: PropertyOwnershipLinkFormValues[FieldName]) => void;
}>;

function OwnershipLinkForm({ values, availableProperties, editingLink, error, isSaving, onCancelEdit, onSubmit, onValueChange }: OwnershipLinkFormProps) {
  const isEditing = Boolean(editingLink);
  return (
    <form className="rounded-2xl border border-border bg-card p-4" onSubmit={onSubmit}>
      <h3 className="font-black">{isEditing ? 'تعديل علاقة الملكية' : 'ربط عقار'}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{isEditing ? 'تحديث نسبة الملكية والحالة والتواريخ بدون إنشاء سجل مالي.' : 'إضافة علاقة ملكية بسيطة بدون إنشاء سجل مالي.'}</p>
      {error ? <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive">{error}</div> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem]"><OwnerPropertySelect value={values.property_id} onValueChange={(propertyId) => onValueChange('property_id', propertyId)} disabled={isEditing || !availableProperties.length} properties={availableProperties} /><Input type="number" min="0.01" max="100" step="0.01" value={values.ownership_percentage} onChange={(event) => onValueChange('ownership_percentage', event.target.value)} aria-label="نسبة الملكية" /></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="تاريخ البداية"><Input type="date" value={values.starts_on} onChange={(event) => onValueChange('starts_on', event.target.value)} /></Field><Field label="تاريخ النهاية"><Input type="date" value={values.ends_on} onChange={(event) => onValueChange('ends_on', event.target.value)} /></Field></div>
      <OwnerCheckbox checked={values.is_primary} label="مالك أساسي" onCheckedChange={(checked) => onValueChange('is_primary', checked)} className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3 text-sm font-bold" />
      <Button className="mt-3 w-full" type="submit" disabled={!values.property_id || isSaving}>{isEditing ? 'حفظ علاقة الملكية' : 'ربط المالك بالعقار'}</Button>
      {isEditing ? <Button className="mt-2 w-full" type="button" variant="secondary" onClick={onCancelEdit}>إلغاء التعديل</Button> : null}
    </form>
  );
}

function getLinkedPropertiesForOwner(owner: Owner | null, properties: PropertyWithOwners[]): LinkedPropertyItem[] {
  if (!owner) return [];
  return properties
    .map((property) => ({ property, links: property.property_owners.filter((link) => link.owner_id === owner.id && isActivePropertyOwnerLink(link)) }))
    .filter((item) => item.links.length > 0);
}

function getAvailablePropertiesForLink(owner: Owner | null, properties: PropertyWithOwners[], editingLink: EditingPropertyOwnerLink | null): PropertyWithOwners[] {
  if (!owner) return [];
  if (editingLink) return properties.filter((property) => property.id === editingLink.propertyId);
  return properties.filter((property) => !property.property_owners.some((link) => link.owner_id === owner.id && isActivePropertyOwnerLink(link)));
}

export function OwnersPage() {
  const ownersQuery = useOwners();
  const propertiesQuery = usePropertiesWithOwners();
  const linkMutation = useLinkOwnerToProperty();
  const updateLinkMutation = useUpdatePropertyOwnerLink();
  const unlinkMutation = useUnlinkOwnerFromProperty();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [linkFormValues, setLinkFormValues] = useState<PropertyOwnershipLinkFormValues>(emptyPropertyOwnershipLinkFormValues);
  const [linkFormError, setLinkFormError] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<EditingPropertyOwnerLink | null>(null);

  const owners = ownersQuery.data ?? [];
  const properties = propertiesQuery.data ?? [];
  const propertyIds = useMemo(() => properties.map((property) => property.id), [properties]);
  const activeContractsQuery = useOwnerActiveContracts(propertyIds);
  const activeContracts = activeContractsQuery.data ?? [];
  const isSavingLink = linkMutation.isPending || updateLinkMutation.isPending;
  const selectedOwner = owners.find((owner) => owner.id === selectedOwnerId) ?? owners[0] ?? null;
  const summary = useMemo(() => summarizeOwners(owners, properties), [owners, properties]);
  const ownerWorkspaceRows = useMemo(() => buildOwnerWorkspaceRows(owners, properties, activeContracts), [activeContracts, owners, properties]);
  const filteredOwnerRows = useMemo(() => filterOwnerWorkspaceRows(ownerWorkspaceRows, ownerSearch), [ownerSearch, ownerWorkspaceRows]);
  const linkedProperties = useMemo(() => getLinkedPropertiesForOwner(selectedOwner, properties), [properties, selectedOwner]);
  const availableProperties = useMemo(() => getAvailablePropertiesForLink(selectedOwner, properties, editingLink), [editingLink, properties, selectedOwner]);

  useEffect(() => {
    if (!selectedOwnerId && owners[0]) setSelectedOwnerId(owners[0].id);
  }, [owners, selectedOwnerId]);

  const openCreateForm = () => { setEditingOwner(null); setFormOpen(true); };
  const openEditForm = (owner: Owner) => { setEditingOwner(owner); setFormOpen(true); };
  const setLinkField = <FieldName extends keyof PropertyOwnershipLinkFormValues>(field: FieldName, value: PropertyOwnershipLinkFormValues[FieldName]) => { setLinkFormValues((current) => ({ ...current, [field]: value })); setLinkFormError(null); };
  const beginEditLink = (link: PropertyOwner) => { setEditingLink({ id: link.id, propertyId: link.property_id, ownerId: link.owner_id }); setLinkFormValues(propertyOwnerLinkToFormValues(link)); setLinkFormError(null); };
  const resetLinkForm = () => { setEditingLink(null); setLinkFormValues(emptyPropertyOwnershipLinkFormValues); setLinkFormError(null); };
  const handleEndPropertyOwnership = async (link: PropertyOwner) => {
    try {
      await unlinkMutation.mutateAsync({ linkId: link.id, propertyId: link.property_id, ownerId: link.owner_id });
      if (editingLink?.id === link.id) resetLinkForm();
    } catch (error) {
      setLinkFormError(error instanceof Error ? error.message : 'تعذر إنهاء علاقة الملكية. تحقق من الصلاحيات وحاول مرة أخرى.');
    }
  };
  const handleLinkProperty = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOwner) return;
    const validationError = validatePropertyOwnershipLinkForm(linkFormValues);
    if (validationError) { setLinkFormError(validationError); return; }
    try {
      if (editingLink) await updateLinkMutation.mutateAsync({ linkId: editingLink.id, payload: propertyOwnershipLinkFormToPayload(linkFormValues) });
      else await linkMutation.mutateAsync({ owner_id: selectedOwner.id, property_id: linkFormValues.property_id, ...propertyOwnershipLinkFormToPayload(linkFormValues) });
      resetLinkForm();
    } catch (error) {
      setLinkFormError(error instanceof Error ? error.message : 'تعذر حفظ علاقة الملكية. تحقق من الصلاحيات وحاول مرة أخرى.');
    }
  };

  const firstLoadError = ownersQuery.error ?? propertiesQuery.error ?? activeContractsQuery.error;
  const hasLoadError = ownersQuery.isError || propertiesQuery.isError || activeContractsQuery.isError;
  const retryOwnerWorkspace = async () => {
    await Promise.all([ownersQuery.refetch(), propertiesQuery.refetch(), activeContractsQuery.refetch()]);
  };

  if (ownersQuery.isLoading || propertiesQuery.isLoading || activeContractsQuery.isLoading) return <div className="space-y-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div>;

  if (hasLoadError) {
    return (
      <EmptyState
        title="تعذر تحميل مساحة عمل الملاك"
        description={getOwnerPageErrorMessage(firstLoadError, 'حدث خطأ غير متوقع أثناء تحميل الملاك والعقارات المرتبطة.')}
        action={<Button type="button" onClick={retryOwnerWorkspace}>إعادة المحاولة</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">إدارة الملاك</h2><p className="text-sm text-muted-foreground">إدارة علاقات ملكية العقارات بشكل منفصل عن الحسابات والتسويات المالية.</p></div><Button onClick={openCreateForm}><Plus className="ml-2 size-4" />إضافة مالك</Button></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><SummaryCard label="إجمالي الملاك" value={summary.totalOwners} icon={Users} /><SummaryCard label="الملاك النشطون" value={summary.activeOwners} icon={Users} /><SummaryCard label="عقارات مرتبطة" value={summary.linkedPropertiesCount} icon={Building2} /><SummaryCard label="عقارات بلا علاقة مالك" value={summary.propertiesWithoutLinkedOwner} icon={LinkIcon} /></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]">
        <Card className="overflow-hidden"><CardHeader><CardTitle>مساحة عمل الملاك</CardTitle><CardDescription>ملخص آمن من بيانات الملاك والعقارات والعقود الحالية بدون أرصدة أو تسويات افتراضية.</CardDescription></CardHeader><CardContent><OwnerWorkspaceTable rows={filteredOwnerRows} search={ownerSearch} selectedOwner={selectedOwner} onCreateOwner={openCreateForm} onEditOwner={openEditForm} onSearchChange={setOwnerSearch} onSelectOwner={setSelectedOwnerId} /></CardContent></Card>
        <Card><CardHeader><CardTitle>علاقات الملكية</CardTitle><CardDescription>{selectedOwner ? `العقارات المرتبطة بـ ${getOwnerDisplayLabel(selectedOwner)}` : 'اختر مالكاً لعرض علاقات الملكية.'}</CardDescription></CardHeader><CardContent className="space-y-5">{selectedOwner ? <><div className="space-y-3"><OwnerRelationshipsList linkedProperties={linkedProperties} endLinkPending={unlinkMutation.isPending} onEditLink={beginEditLink} onEndLink={handleEndPropertyOwnership} /></div><OwnershipLinkForm values={linkFormValues} availableProperties={availableProperties} editingLink={editingLink} error={linkFormError} isSaving={isSavingLink} onCancelEdit={resetLinkForm} onSubmit={handleLinkProperty} onValueChange={setLinkField} /></> : null}</CardContent></Card>
      </div>
      <OwnerFormDialog owner={editingOwner} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
