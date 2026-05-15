import { Building2, LinkIcon, Pencil, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { OwnerCheckbox } from './OwnerCheckbox';
import { OwnerPropertySelect } from './OwnerPropertySelect';
import type { Owner, PropertyOwner } from './ownerService';
import {
  useCreateOwner,
  useLinkOwnerToProperty,
  useOwners,
  usePropertiesWithOwners,
  useUnlinkOwnerFromProperty,
  useUpdateOwner,
  useUpdatePropertyOwnerLink,
} from './useOwners';
import {
  countLinkedPropertiesForOwner,
  emptyOwnerFormValues,
  emptyPropertyOwnershipLinkFormValues,
  getOwnerDisplayLabel,
  ownerToFormValues,
  propertyOwnerLinkToFormValues,
  propertyOwnershipLinkFormToPayload,
  summarizeOwners,
  validateOwnerForm,
  validatePropertyOwnershipLinkForm,
  type OwnerFormValues,
  type PropertyOwnershipLinkFormValues,
} from './ownerUiHelpers';

type FieldProps = Readonly<{
  label: string;
  children: ReactNode;
}>;

function Field({ label, children }: FieldProps) {
  return (
    <label className="space-y-2 text-sm font-bold">
      <span>{label}</span>
      {children}
    </label>
  );
}

type SummaryCardProps = Readonly<{
  label: string;
  value: number;
  icon: typeof Users;
}>;

type EditingPropertyOwnerLink = Readonly<{
  id: string;
  propertyId: string;
  ownerId: string;
}>;

function SummaryCard({ label, value, icon: Icon }: SummaryCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black">{value.toLocaleString('ar')}</p>
        </div>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
}

type OwnerFormDialogProps = Readonly<{
  owner: Owner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

function OwnerFormDialog({
  owner,
  open,
  onOpenChange,
}: OwnerFormDialogProps) {
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

    if (owner) {
      await updateOwner.mutateAsync(payload);
    } else {
      await createOwner.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل بيانات المالك' : 'إضافة مالك'}</DialogTitle>
          <DialogDescription>بيانات تعريفية خفيفة للملاك بدون إضافة أرصدة أو تسويات مالية.</DialogDescription>
        </DialogHeader>
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={isPending}>{isEditing ? 'حفظ التعديلات' : 'إنشاء المالك'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OwnersPage() {
  const ownersQuery = useOwners();
  const propertiesQuery = usePropertiesWithOwners();
  const linkMutation = useLinkOwnerToProperty();
  const updateLinkMutation = useUpdatePropertyOwnerLink();
  const unlinkMutation = useUnlinkOwnerFromProperty();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [linkFormValues, setLinkFormValues] = useState<PropertyOwnershipLinkFormValues>(emptyPropertyOwnershipLinkFormValues);
  const [linkFormError, setLinkFormError] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<EditingPropertyOwnerLink | null>(null);

  const owners = ownersQuery.data ?? [];
  const properties = propertiesQuery.data ?? [];
  const isSavingLink = linkMutation.isPending || updateLinkMutation.isPending;
  const selectedOwner = owners.find((owner) => owner.id === selectedOwnerId) ?? owners[0] ?? null;
  const summary = useMemo(() => summarizeOwners(owners, properties), [owners, properties]);
  const linkedProperties = useMemo(() => {
    if (!selectedOwner) {
      return [];
    }
    return properties
      .map((property) => ({
        property,
        links: property.property_owners.filter((link) => link.owner_id === selectedOwner.id),
      }))
      .filter((item) => item.links.length > 0);
  }, [properties, selectedOwner]);
  const availableProperties = useMemo(() => {
    if (!selectedOwner) {
      return [];
    }

    if (editingLink) {
      return properties.filter((property) => property.id === editingLink.propertyId);
    }

    return properties.filter((property) => !property.property_owners.some((link) => link.owner_id === selectedOwner.id && !link.ends_on));
  }, [editingLink, properties, selectedOwner]);

  useEffect(() => {
    if (!selectedOwnerId && owners[0]) {
      setSelectedOwnerId(owners[0].id);
    }
  }, [owners, selectedOwnerId]);

  const openCreateForm = () => {
    setEditingOwner(null);
    setFormOpen(true);
  };

  const openEditForm = (owner: Owner) => {
    setEditingOwner(owner);
    setFormOpen(true);
  };

  const setLinkField = <FieldName extends keyof PropertyOwnershipLinkFormValues>(field: FieldName, value: PropertyOwnershipLinkFormValues[FieldName]) => {
    setLinkFormValues((current) => ({ ...current, [field]: value }));
    setLinkFormError(null);
  };

  const beginEditLink = (link: PropertyOwner) => {
    setEditingLink({ id: link.id, propertyId: link.property_id, ownerId: link.owner_id });
    setLinkFormValues(propertyOwnerLinkToFormValues(link));
    setLinkFormError(null);
  };

  const resetLinkForm = () => {
    setEditingLink(null);
    setLinkFormValues(emptyPropertyOwnershipLinkFormValues);
    setLinkFormError(null);
  };

  const handleUnlinkProperty = async (link: PropertyOwner) => {
    await unlinkMutation.mutateAsync({ linkId: link.id, propertyId: link.property_id, ownerId: link.owner_id });
    if (editingLink?.id === link.id) {
      resetLinkForm();
    }
  };

  const handleLinkProperty = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOwner) {
      return;
    }

    const validationError = validatePropertyOwnershipLinkForm(linkFormValues);
    if (validationError) {
      setLinkFormError(validationError);
      return;
    }

    if (editingLink) {
      await updateLinkMutation.mutateAsync({
        linkId: editingLink.id,
        payload: propertyOwnershipLinkFormToPayload(linkFormValues),
      });
    } else {
      await linkMutation.mutateAsync({
        owner_id: selectedOwner.id,
        property_id: linkFormValues.property_id,
        ...propertyOwnershipLinkFormToPayload(linkFormValues),
      });
    }

    resetLinkForm();
  };

  if (ownersQuery.isLoading || propertiesQuery.isLoading) {
    return <div className="space-y-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">إدارة الملاك</h2>
          <p className="text-sm text-muted-foreground">إدارة علاقات ملكية العقارات بشكل منفصل عن الحسابات والتسويات المالية.</p>
        </div>
        <Button onClick={openCreateForm}><Plus className="ml-2 size-4" />إضافة مالك</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="إجمالي الملاك" value={summary.totalOwners} icon={Users} />
        <SummaryCard label="الملاك النشطون" value={summary.activeOwners} icon={Users} />
        <SummaryCard label="عقارات مرتبطة" value={summary.linkedPropertiesCount} icon={Building2} />
        <SummaryCard label="عقارات بلا علاقة مالك" value={summary.propertiesWithoutLinkedOwner} icon={LinkIcon} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>قائمة الملاك</CardTitle>
            <CardDescription>اختر مالكاً لعرض العقارات المرتبطة أو تعديل بياناته.</CardDescription>
          </CardHeader>
          <CardContent>
            {owners.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المالك</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>البريد</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>العقارات</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {owners.map((owner) => (
                      <TableRow key={owner.id} className={owner.id === selectedOwner?.id ? 'bg-primary/5' : undefined}>
                        <TableCell>
                          <button type="button" className="text-right font-black hover:text-primary" onClick={() => setSelectedOwnerId(owner.id)}>
                            {getOwnerDisplayLabel(owner)}
                          </button>
                          {owner.display_name ? <div className="text-xs text-muted-foreground">{owner.full_name}</div> : null}
                        </TableCell>
                        <TableCell>{owner.phone ?? '—'}</TableCell>
                        <TableCell dir="ltr">{owner.email ?? '—'}</TableCell>
                        <TableCell><StatusBadge tone={owner.is_active ? 'green' : 'gray'}>{owner.is_active ? 'نشط' : 'غير نشط'}</StatusBadge></TableCell>
                        <TableCell>{countLinkedPropertiesForOwner(owner.id, properties).toLocaleString('ar')}</TableCell>
                        <TableCell><Button variant="secondary" className="min-h-9 px-3" onClick={() => openEditForm(owner)}><Pencil className="size-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState title="لا يوجد ملاك" description="أضف أول مالك لبدء ربطه بالعقارات." action={<Button onClick={openCreateForm}>إضافة مالك</Button>} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>علاقات الملكية</CardTitle>
            <CardDescription>{selectedOwner ? `العقارات المرتبطة بـ ${getOwnerDisplayLabel(selectedOwner)}` : 'اختر مالكاً لعرض علاقات الملكية.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {selectedOwner ? (
              <>
                <div className="space-y-3">
                  {linkedProperties.length ? linkedProperties.map(({ property, links }) => links.map((link) => (
                    <div key={link.id} className="rounded-2xl border border-border bg-muted/25 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{property.title}</p>
                          <p className="text-xs text-muted-foreground">{property.address}</p>
                        </div>
                        <StatusBadge tone={link.is_primary ? 'blue' : 'gray'}>{link.is_primary ? 'أساسي' : 'ثانوي'}</StatusBadge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                        <span>نسبة الملكية: <b className="text-foreground">{link.ownership_percentage}%</b></span>
                        <span>من: <b className="text-foreground">{link.starts_on ?? '—'}</b></span>
                        <span>إلى: <b className="text-foreground">{link.ends_on ?? '—'}</b></span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => beginEditLink(link)}>تعديل العلاقة</Button>
                        <Button type="button" variant="danger" className="min-h-9 px-3" disabled={unlinkMutation.isPending} onClick={() => handleUnlinkProperty(link)}>إلغاء الربط</Button>
                      </div>
                    </div>
                  ))) : <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">لا توجد عقارات مرتبطة بهذا المالك بعد.</p>}
                </div>

                <form className="rounded-2xl border border-border bg-card p-4" onSubmit={handleLinkProperty}>
                  <h3 className="font-black">{editingLink ? 'تعديل علاقة الملكية' : 'ربط عقار'}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{editingLink ? 'تحديث نسبة الملكية والحالة والتواريخ بدون إنشاء سجل مالي.' : 'إضافة علاقة ملكية بسيطة بدون إنشاء سجل مالي.'}</p>
                  {linkFormError ? <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive">{linkFormError}</div> : null}
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <OwnerPropertySelect
                      value={linkFormValues.property_id}
                      onValueChange={(propertyId) => setLinkField('property_id', propertyId)}
                      disabled={Boolean(editingLink) || !availableProperties.length}
                      properties={availableProperties}
                    />
                    <Input type="number" min="0.01" max="100" step="0.01" value={linkFormValues.ownership_percentage} onChange={(event) => setLinkField('ownership_percentage', event.target.value)} aria-label="نسبة الملكية" />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="تاريخ البداية"><Input type="date" value={linkFormValues.starts_on} onChange={(event) => setLinkField('starts_on', event.target.value)} /></Field>
                    <Field label="تاريخ النهاية"><Input type="date" value={linkFormValues.ends_on} onChange={(event) => setLinkField('ends_on', event.target.value)} /></Field>
                  </div>
                  <OwnerCheckbox
                    checked={linkFormValues.is_primary}
                    label="مالك أساسي"
                    onCheckedChange={(checked) => setLinkField('is_primary', checked)}
                    className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3 text-sm font-bold"
                  />
                  <Button className="mt-3 w-full" type="submit" disabled={!linkFormValues.property_id || isSavingLink}>{editingLink ? 'حفظ علاقة الملكية' : 'ربط المالك بالعقار'}</Button>
                  {editingLink ? <Button className="mt-2 w-full" type="button" variant="secondary" onClick={resetLinkForm}>إلغاء التعديل</Button> : null}
                </form>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <OwnerFormDialog owner={editingOwner} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
