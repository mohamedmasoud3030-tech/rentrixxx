import { Link } from '@tanstack/react-router';
import { Building2, Download, Eye, LinkIcon, Pencil, Plus, Printer, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { canPrintOperationalReport } from '@/lib/operationalPrint';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { htmlTemplateEngine } from '@/services/documents/template-engine/htmlTemplateEngine';
import { buildOwnersDocument } from '@/services/documents/templates/ownersTemplate';
import { downloadCsv, type CsvRow } from '@/utils/helpers';
import { OwnerCheckbox } from './OwnerCheckbox';
import { OwnerPropertySelect } from './OwnerPropertySelect';
import type { OwnerAgreementType } from './ownerAgreementTypes';
import type { Owner, PropertyOwner, PropertyWithOwners } from './ownerService';
import { useCreateOwnerAgreement, useOwnerAgreements, useTerminateOwnerAgreement, useUpdateOwnerAgreement } from './use-owner-agreements';
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

    if (owner) await updateOwner.mutateAsync(payload);
    else await createOwner.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'تعديل بيانات المالك' : 'إضافة مالك'}</DialogTitle><DialogDescription>بيانات تعريفية خفيفة للملاك بدون إضافة أرصدة أو تسويات مالية.</DialogDescription></DialogHeader>
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
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button><Button type="submit" disabled={isPending}>{isEditing ? 'حفظ التعديلات' : 'إنشاء المالك'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type OwnerWorkspaceTableProps = Readonly<{
  rows: OwnerWorkspaceRow[];
  search: string;
  selectedOwner: Owner | null;
  allSelected: boolean;
  isSelected: (ownerId: string) => boolean;
  onCreateOwner: () => void;
  onEditOwner: (owner: Owner) => void;
  onSearchChange: (search: string) => void;
  onSelectOwner: (ownerId: string) => void;
  onToggleAll: () => void;
  onToggleSelection: (ownerId: string) => void;
}>;

type OwnerWorkspaceRowProps = Readonly<{ row: OwnerWorkspaceRow; selectedOwnerId: string | null; isChecked: boolean; onEditOwner: (owner: Owner) => void; onSelectOwner: (ownerId: string) => void; onToggleSelection: (ownerId: string) => void }>;

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

function OwnerWorkspaceRowView({ row, selectedOwnerId, isChecked, onEditOwner, onSelectOwner, onToggleSelection }: OwnerWorkspaceRowProps) {
  const isSelected = row.owner.id === selectedOwnerId;
  return (
    <TableRow className={isSelected ? 'bg-primary/5' : undefined}>
      <TableCell><button type="button" className="text-right font-black hover:text-primary" onClick={() => onSelectOwner(row.owner.id)}>{getOwnerDisplayLabel(row.owner)}</button>{row.owner.display_name ? <div className="text-xs text-muted-foreground">{row.owner.full_name}</div> : null}</TableCell>
      <TableCell><OwnerContact owner={row.owner} /></TableCell>
      <TableCell>{row.propertyCount.toLocaleString('ar')}</TableCell>
      <TableCell><OwnerPropertyLinks row={row} /></TableCell>
      <TableCell><OwnershipSummary row={row} /></TableCell>
      <TableCell>{row.activeContractCount > 0 ? row.activeContractCount.toLocaleString('ar') : '—'}</TableCell>
      <TableCell className="text-center"><input type="checkbox" checked={isChecked} onChange={() => onToggleSelection(row.owner.id)} aria-label={`تحديد ${getOwnerDisplayLabel(row.owner)}`} className="size-4 accent-primary" /></TableCell>
      <TableCell><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => onSelectOwner(row.owner.id)}><Eye className="ms-1 size-4" />العلاقات</Button><Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => onEditOwner(row.owner)}><Pencil className="ms-1 size-4" />تعديل</Button></div></TableCell>
    </TableRow>
  );
}

function OwnerTableContent({ rows, selectedOwner, allSelected, isSelected, onEditOwner, onSelectOwner, onToggleAll, onToggleSelection }: Omit<OwnerWorkspaceTableProps, 'search' | 'onCreateOwner' | 'onSearchChange'>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>اسم المالك</TableHead><TableHead>الهاتف والإيميل</TableHead><TableHead>عدد العقارات</TableHead><TableHead>أسماء العقارات</TableHead><TableHead>نسبة الملكية/الدور</TableHead><TableHead>العقود النشطة</TableHead><TableHead className="text-center"><input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="تحديد جميع الملاك" className="size-4 accent-primary" /></TableHead><TableHead>روابط آمنة</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((row) => <OwnerWorkspaceRowView key={row.owner.id} row={row} selectedOwnerId={selectedOwner?.id ?? null} isChecked={isSelected(row.owner.id)} onEditOwner={onEditOwner} onSelectOwner={onSelectOwner} onToggleSelection={onToggleSelection} />)}</TableBody>
      </Table>
    </div>
  );
}

function OwnerWorkspaceTable({ rows, search, selectedOwner, allSelected, isSelected, onCreateOwner, onEditOwner, onSearchChange, onSelectOwner, onToggleAll, onToggleSelection }: OwnerWorkspaceTableProps) {
  const hasSearch = Boolean(search.trim());
  const emptyState = <EmptyState title={hasSearch ? 'لا توجد نتائج مطابقة' : 'لا يوجد ملاك'} description={hasSearch ? 'جرّب البحث باسم أو هاتف أو بريد أو اسم عقار آخر.' : 'أضف أول مالك لبدء ربطه بالعقارات.'} action={hasSearch ? undefined : <Button onClick={onCreateOwner}>إضافة مالك</Button>} />;

  return <div className="space-y-4"><div className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-10" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="بحث باسم المالك أو الهاتف أو الإيميل أو العقار" /></div>{rows.length > 0 ? <OwnerTableContent rows={rows} selectedOwner={selectedOwner} allSelected={allSelected} isSelected={isSelected} onEditOwner={onEditOwner} onSelectOwner={onSelectOwner} onToggleAll={onToggleAll} onToggleSelection={onToggleSelection} /> : emptyState}</div>;
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
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  const [editingAgreementId, setEditingAgreementId] = useState<string | null>(null);
  const [agreementFormError, setAgreementFormError] = useState<string | null>(null);
  const [agreementValues, setAgreementValues] = useState({ property_id: '', agreement_type: 'percentage_of_gross_collections' as OwnerAgreementType, status: 'draft', starts_on: '', ends_on: '', currency: 'OMR', calculation_basis: 'cash_collected', payout_cycle: 'monthly', payout_day: '', notes: '' });

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
  const bulkSelection = useBulkSelection(filteredOwnerRows.map((row) => row.owner.id));
  const selectedOwnerRows = ownerWorkspaceRows.filter((row) => bulkSelection.selectedIds.has(row.owner.id));
  const linkedProperties = useMemo(() => getLinkedPropertiesForOwner(selectedOwner, properties), [properties, selectedOwner]);
  const availableProperties = useMemo(() => getAvailablePropertiesForLink(selectedOwner, properties, editingLink), [editingLink, properties, selectedOwner]);
  const agreementsQuery = useOwnerAgreements({ ownerId: selectedOwner?.id });
  const createAgreementMutation = useCreateOwnerAgreement();
  const updateAgreementMutation = useUpdateOwnerAgreement();
  const terminateAgreementMutation = useTerminateOwnerAgreement();

  useEffect(() => {
    if (!selectedOwnerId && owners[0]) setSelectedOwnerId(owners[0].id);
  }, [owners, selectedOwnerId]);

  const openCreateForm = () => { setEditingOwner(null); setFormOpen(true); };
  const openEditForm = (owner: Owner) => { setEditingOwner(owner); setFormOpen(true); };
  const setLinkField = <FieldName extends keyof PropertyOwnershipLinkFormValues>(field: FieldName, value: PropertyOwnershipLinkFormValues[FieldName]) => { setLinkFormValues((current) => ({ ...current, [field]: value })); setLinkFormError(null); };
  const beginEditLink = (link: PropertyOwner) => { setEditingLink({ id: link.id, propertyId: link.property_id, ownerId: link.owner_id }); setLinkFormValues(propertyOwnerLinkToFormValues(link)); setLinkFormError(null); };
  const resetLinkForm = () => { setEditingLink(null); setLinkFormValues(emptyPropertyOwnershipLinkFormValues); setLinkFormError(null); };
  const handleEndPropertyOwnership = async (link: PropertyOwner) => { await unlinkMutation.mutateAsync({ linkId: link.id, propertyId: link.property_id, ownerId: link.owner_id }); if (editingLink?.id === link.id) resetLinkForm(); };
  const handleLinkProperty = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOwner) return;
    const validationError = validatePropertyOwnershipLinkForm(linkFormValues);
    if (validationError) { setLinkFormError(validationError); return; }
    if (editingLink) await updateLinkMutation.mutateAsync({ linkId: editingLink.id, payload: propertyOwnershipLinkFormToPayload(linkFormValues) });
    else await linkMutation.mutateAsync({ owner_id: selectedOwner.id, property_id: linkFormValues.property_id, ...propertyOwnershipLinkFormToPayload(linkFormValues) });
    resetLinkForm();
  };
  const exportOwners = (mode: 'selected' | 'filtered') => {
    const rowsToExport = mode === 'selected' ? selectedOwnerRows : filteredOwnerRows;
    if (mode === 'selected' && rowsToExport.length !== bulkSelection.selectedCount) {
      toast.error('تعذر تصدير كل السجلات المحددة. ربما تم حذف بعض الملاك أو تغيّر الوصول إليهم.');
      return;
    }
    const csvRows: CsvRow[] = rowsToExport.map((row) => ({
      fullName: row.owner.full_name ?? '',
      phone: row.owner.phone ?? '',
      email: row.owner.email ?? '',
      nationalId: row.owner.national_id ?? '',
      propertyCount: row.propertyCount,
      activeContractCount: row.activeContractCount,
    }));
    downloadCsv('owners-export', csvRows, ['fullName', 'phone', 'email', 'nationalId', 'propertyCount', 'activeContractCount']);
  };
  const printOwners = () => {
    try {
      htmlTemplateEngine.preview(buildOwnersDocument({
        companyName: 'Rentrix',
        generatedAt: new Date().toLocaleDateString('ar-OM'),
        owners: filteredOwnerRows.slice(0, 80).map((row) => ({
          name: row.owner.full_name ?? '—',
          phone: row.owner.phone ?? null,
          propertyCount: row.propertyCount,
          contractCount: row.activeContractCount,
        })),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فتح معاينة مستند الملاك');
    }
  };

  const firstLoadError = ownersQuery.error ?? propertiesQuery.error ?? activeContractsQuery.error;
  const hasLoadError = ownersQuery.isError || propertiesQuery.isError || activeContractsQuery.isError;
  const retryOwnerWorkspace = async () => {
    await Promise.all([ownersQuery.refetch(), propertiesQuery.refetch(), activeContractsQuery.refetch()]);
  };
  const agreementTypeLabel: Record<OwnerAgreementType, string> = { percentage_of_gross_collections: 'نسبة من إجمالي التحصيل', percentage_of_net_collections: 'نسبة من صافي التحصيل', fixed_owner_payout: 'مبلغ ثابت للمالك', fixed_management_fee: 'رسوم إدارة ثابتة', guaranteed_minimum_plus_percentage: 'حد أدنى مضمون + نسبة', fixed_plus_profit_share: 'ثابت + مشاركة أرباح' };
  const statusLabel: Record<string, string> = { draft: 'مسودة', active: 'نشطة', superseded: 'مستبدلة', terminated: 'منتهية' };
  const payoutCycleLabel: Record<string, string> = { monthly: 'شهري', quarterly: 'ربع سنوي', custom: 'مخصص' };
  const openCreateAgreement = () => { setEditingAgreementId(null); setAgreementFormError(null); setAgreementValues({ property_id: '', agreement_type: 'percentage_of_gross_collections', status: 'draft', starts_on: '', ends_on: '', currency: 'OMR', calculation_basis: 'cash_collected', payout_cycle: 'monthly', payout_day: '', notes: '' }); setAgreementDialogOpen(true); };
  const openEditAgreement = (agreement: NonNullable<typeof agreementsQuery.data>[number]) => { setEditingAgreementId(agreement.id); setAgreementFormError(null); setAgreementValues({ property_id: agreement.property_id, agreement_type: agreement.agreement_type, status: agreement.status, starts_on: agreement.starts_on, ends_on: agreement.ends_on ?? '', currency: agreement.currency, calculation_basis: agreement.calculation_basis, payout_cycle: agreement.payout_cycle, payout_day: agreement.payout_day ? String(agreement.payout_day) : '', notes: agreement.notes ?? '' }); setAgreementDialogOpen(true); };
  const submitAgreement = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOwner || !agreementValues.property_id || !agreementValues.starts_on) { setAgreementFormError('يرجى تعبئة الحقول المطلوبة'); return; }
    try {
      const payload = { owner_id: selectedOwner.id, property_id: agreementValues.property_id, agreement_type: agreementValues.agreement_type, status: agreementValues.status as 'draft' | 'active' | 'superseded' | 'terminated', starts_on: agreementValues.starts_on, ends_on: agreementValues.ends_on || null, currency: agreementValues.currency, calculation_basis: agreementValues.calculation_basis as 'cash_collected' | 'accrual_billed', payout_cycle: agreementValues.payout_cycle as 'monthly' | 'quarterly' | 'custom', payout_day: agreementValues.payout_day ? Number(agreementValues.payout_day) : null, notes: agreementValues.notes || null };
      if (editingAgreementId) await updateAgreementMutation.mutateAsync({ id: editingAgreementId, input: payload });
      else await createAgreementMutation.mutateAsync(payload);
      setAgreementDialogOpen(false);
    } catch (error) {
      setAgreementFormError(error instanceof Error ? error.message : 'تعذر حفظ الاتفاقية');
    }
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
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">إدارة الملاك</h2><p className="text-sm text-muted-foreground">إدارة علاقات ملكية العقارات بشكل منفصل عن الحسابات والتسويات المالية.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={printOwners} disabled={!canPrintOperationalReport(filteredOwnerRows.length > 0, ownersQuery.isLoading || propertiesQuery.isLoading || activeContractsQuery.isLoading, hasLoadError)}><Printer className="ms-2 size-4" />طباعة قائمة الملاك</Button><Button variant="secondary" onClick={() => exportOwners('filtered')} disabled={filteredOwnerRows.length === 0}><Download className="ms-2 size-4" />تصدير النتائج</Button><Button onClick={openCreateForm}><Plus className="ms-2 size-4" />إضافة مالك</Button></div></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><SummaryCard label="إجمالي الملاك" value={summary.totalOwners} icon={Users} /><SummaryCard label="الملاك النشطون" value={summary.activeOwners} icon={Users} /><SummaryCard label="عقارات مرتبطة" value={summary.linkedPropertiesCount} icon={Building2} /><SummaryCard label="عقارات بلا علاقة مالك" value={summary.propertiesWithoutLinkedOwner} icon={LinkIcon} /></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]">
        <Card className="overflow-hidden"><CardHeader><CardTitle>مساحة عمل الملاك</CardTitle><CardDescription>ملخص آمن من بيانات الملاك والعقارات والعقود الحالية بدون أرصدة أو تسويات افتراضية.</CardDescription></CardHeader><CardContent><OwnerWorkspaceTable rows={filteredOwnerRows} search={ownerSearch} selectedOwner={selectedOwner} allSelected={bulkSelection.allSelected} isSelected={bulkSelection.isSelected} onCreateOwner={openCreateForm} onEditOwner={openEditForm} onSearchChange={setOwnerSearch} onSelectOwner={setSelectedOwnerId} onToggleAll={bulkSelection.toggleAll} onToggleSelection={bulkSelection.toggleOne} /></CardContent></Card>
        <Card><CardHeader><CardTitle>اتفاقيات الإدارة</CardTitle><CardDescription>هذه الاتفاقية تحدد طريقة العلاقة المالية بين المكتب والمالك، ولا يتم حساب كشف حساب المالك النهائي في هذه المرحلة.</CardDescription></CardHeader><CardContent className="space-y-3">{selectedOwner ? <><div className="flex justify-end"><Button onClick={openCreateAgreement}>إضافة اتفاقية</Button></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>العقار</TableHead><TableHead>النوع</TableHead><TableHead>الحالة</TableHead><TableHead>البداية</TableHead><TableHead>النهاية</TableHead><TableHead>الدورة</TableHead><TableHead>العملة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{(agreementsQuery.data ?? []).map((agreement) => <TableRow key={agreement.id}><TableCell>{agreement.property?.title ?? '—'}</TableCell><TableCell>{agreementTypeLabel[agreement.agreement_type]}</TableCell><TableCell>{statusLabel[agreement.status] ?? agreement.status}</TableCell><TableCell>{agreement.starts_on}</TableCell><TableCell>{agreement.ends_on ?? '—'}</TableCell><TableCell>{payoutCycleLabel[agreement.payout_cycle] ?? agreement.payout_cycle}</TableCell><TableCell>{agreement.currency}</TableCell><TableCell><div className="flex gap-2"><Button variant="secondary" className="min-h-8 px-2 text-xs" onClick={() => openEditAgreement(agreement)}>تعديل</Button><Button variant="danger" className="min-h-8 px-2 text-xs" disabled={terminateAgreementMutation.isPending || agreement.status === 'terminated'} onClick={() => terminateAgreementMutation.mutate({ id: agreement.id, endsOn: new Date().toISOString().slice(0, 10) })}>إنهاء</Button></div></TableCell></TableRow>)}</TableBody></Table></div></> : <p className="text-sm text-muted-foreground">اختر مالكاً لعرض الاتفاقيات.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>علاقات الملكية</CardTitle><CardDescription>{selectedOwner ? `العقارات المرتبطة بـ ${getOwnerDisplayLabel(selectedOwner)}` : 'اختر مالكاً لعرض علاقات الملكية.'}</CardDescription></CardHeader><CardContent className="space-y-5">{selectedOwner ? <><div className="space-y-3"><OwnerRelationshipsList linkedProperties={linkedProperties} endLinkPending={unlinkMutation.isPending} onEditLink={beginEditLink} onEndLink={handleEndPropertyOwnership} /></div><OwnershipLinkForm values={linkFormValues} availableProperties={availableProperties} editingLink={editingLink} error={linkFormError} isSaving={isSavingLink} onCancelEdit={resetLinkForm} onSubmit={handleLinkProperty} onValueChange={setLinkField} /></> : null}</CardContent></Card>
      </div>
      <BulkActionsBar selectedCount={bulkSelection.selectedCount} selectionLabel={`تم تحديد ${bulkSelection.selectedCount.toLocaleString('ar')} مالك`} onClear={bulkSelection.clear} actions={<Button variant="secondary" onClick={() => exportOwners('selected')}><Download className="ms-2 size-4" />تصدير المحدد</Button>} />
      <OwnerFormDialog owner={editingOwner} open={formOpen} onOpenChange={setFormOpen} />
      <Dialog open={agreementDialogOpen} onOpenChange={setAgreementDialogOpen}><DialogContent className="max-h-[88vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingAgreementId ? 'تعديل اتفاقية الإدارة' : 'إضافة اتفاقية إدارة'}</DialogTitle></DialogHeader><form className="grid gap-3" onSubmit={submitAgreement}>{agreementFormError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive">{agreementFormError}</div> : null}<Field label="العقار *"><select className="h-10 rounded-md border bg-background px-3" value={agreementValues.property_id} onChange={(event) => setAgreementValues((current) => ({ ...current, property_id: event.target.value }))}><option value="">اختر العقار</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select></Field><Field label="نوع الاتفاقية *"><select className="h-10 rounded-md border bg-background px-3" value={agreementValues.agreement_type} onChange={(event) => setAgreementValues((current) => ({ ...current, agreement_type: event.target.value as OwnerAgreementType }))}>{Object.entries(agreementTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="الحالة"><select className="h-10 rounded-md border bg-background px-3" value={agreementValues.status} onChange={(event) => setAgreementValues((current) => ({ ...current, status: event.target.value }))}><option value="draft">مسودة</option><option value="active">نشطة</option></select></Field><Field label="العملة"><Input value={agreementValues.currency} onChange={(event) => setAgreementValues((current) => ({ ...current, currency: event.target.value }))} /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label="تاريخ البداية *"><Input type="date" value={agreementValues.starts_on} onChange={(event) => setAgreementValues((current) => ({ ...current, starts_on: event.target.value }))} /></Field><Field label="تاريخ النهاية"><Input type="date" value={agreementValues.ends_on} onChange={(event) => setAgreementValues((current) => ({ ...current, ends_on: event.target.value }))} /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label="أساس الحساب"><select className="h-10 rounded-md border bg-background px-3" value={agreementValues.calculation_basis} onChange={(event) => setAgreementValues((current) => ({ ...current, calculation_basis: event.target.value }))}><option value="cash_collected">التحصيل النقدي</option><option value="accrual_billed">الاستحقاق المفوتر</option></select></Field><Field label="دورة الصرف"><select className="h-10 rounded-md border bg-background px-3" value={agreementValues.payout_cycle} onChange={(event) => setAgreementValues((current) => ({ ...current, payout_cycle: event.target.value }))}><option value="monthly">شهري</option><option value="quarterly">ربع سنوي</option><option value="custom">مخصص</option></select></Field></div><Field label="يوم الصرف"><Input type="number" min="1" max="31" value={agreementValues.payout_day} onChange={(event) => setAgreementValues((current) => ({ ...current, payout_day: event.target.value }))} /></Field><Field label="ملاحظات"><Textarea value={agreementValues.notes} onChange={(event) => setAgreementValues((current) => ({ ...current, notes: event.target.value }))} /></Field><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAgreementDialogOpen(false)}>إلغاء</Button><Button type="submit" disabled={createAgreementMutation.isPending || updateAgreementMutation.isPending}>{editingAgreementId ? 'حفظ التعديلات' : 'إنشاء الاتفاقية'}</Button></div></form></DialogContent></Dialog>
    </div>
  );
}
