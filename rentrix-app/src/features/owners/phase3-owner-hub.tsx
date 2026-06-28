import { Building2, FileText, Home, Plus, Users } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable } from '@/components/ui/entity-table';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { KpiCard } from '@/components/ui/kpi-card';
import { OwnerCard } from '@/components/ui/owner-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMockAgreements, useMockContracts, useMockOwners, useMockProperties, useMockUnits } from '@/hooks/use-mock-repositories';
import type { MockDatabaseState } from '@/store/mock-db-store';
import type { AgreementType, Owner, Property } from '@/domain/types';

type Phase3OwnerFormValues = Readonly<{ name: string; phone: string; email: string }>;
type Phase3AgreementFormValues = Readonly<{
  ownerId: string;
  propertyId: string;
  agreementType: AgreementType;
  startDate: string;
  endDate: string;
  commissionRate: string;
  fixedFee: string;
}>;

type OwnerHubRow = Readonly<{
  owner: Owner;
  properties: Property[];
  activeAgreementCount: number;
  activeContractCount: number;
  unitCount: number;
}>;

function formatArabicNumber(value: number): string {
  return value.toLocaleString('ar');
}

const emptyOwnerFormValues: Phase3OwnerFormValues = { name: '', phone: '', email: '' };
const emptyAgreementFormValues: Phase3AgreementFormValues = {
  ownerId: '',
  propertyId: '',
  agreementType: 'property_management',
  startDate: '',
  endDate: '',
  commissionRate: '',
  fixedFee: '',
};

export function validatePhase3OwnerForm(values: Phase3OwnerFormValues): string | null {
  if (!values.name.trim()) return 'اسم المالك مطلوب.';
  if (!values.phone.trim()) return 'رقم الهاتف مطلوب.';
  return null;
}

function parseOptionalPositiveNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  return Number(value);
}

export function validatePhase3AgreementForm(values: Phase3AgreementFormValues): string | null {
  if (!values.ownerId) return 'اختيار المالك مطلوب قبل إنشاء الاتفاقية.';
  if (!values.propertyId) return 'اختيار العقار مطلوب قبل إنشاء الاتفاقية.';
  if (!values.startDate) return 'تاريخ بداية الاتفاقية مطلوب.';
  if (values.endDate && values.startDate > values.endDate) return 'تاريخ بداية الاتفاقية يجب أن يسبق تاريخ النهاية.';

  const commissionRate = parseOptionalPositiveNumber(values.commissionRate);
  const fixedFee = parseOptionalPositiveNumber(values.fixedFee);
  if (commissionRate !== undefined && (!Number.isFinite(commissionRate) || commissionRate <= 0)) return 'نسبة العمولة يجب أن تكون رقماً موجباً.';
  if (fixedFee !== undefined && (!Number.isFinite(fixedFee) || fixedFee <= 0)) return 'المبلغ الثابت يجب أن يكون رقماً موجباً.';
  if (values.agreementType === 'property_management' && commissionRate === undefined && fixedFee === undefined) {
    return 'اتفاقية إدارة الأملاك تحتاج نسبة عمولة أو رسماً ثابتاً.';
  }
  if (values.agreementType === 'master_lease' && fixedFee === undefined) return 'اتفاقية الاستئجار الرئيسي تحتاج التزاماً ثابتاً.';
  return null;
}

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="space-y-2 text-sm font-bold">
      <span>{label}</span>
      {children}
    </label>
  );
}

function buildOwnerHubRows(
  owners: readonly Owner[],
  properties: readonly Property[],
  agreements: MockDatabaseState['agreements'],
  contracts: MockDatabaseState['contracts'],
  units: MockDatabaseState['units'],
): OwnerHubRow[] {
  return owners.map((owner) => {
    const ownerProperties = properties.filter((property) => property.ownerId === owner.id);
    const ownerPropertyIds = new Set(ownerProperties.map((property) => property.id));
    return {
      owner,
      properties: ownerProperties,
      activeAgreementCount: agreements.filter((agreement) => agreement.ownerId === owner.id && agreement.status === 'active').length,
      activeContractCount: contracts.filter((contract) => ownerPropertyIds.has(contract.propertyId) && contract.status === 'active').length,
      unitCount: units.filter((unit) => ownerPropertyIds.has(unit.propertyId)).length,
    };
  });
}

function OwnerPropertyList({ properties }: Readonly<{ properties: readonly Property[] }>) {
  if (!properties.length) return <span className="text-muted-foreground">لا توجد عقارات بعد</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {properties.map((property) => (
        <span key={property.id} className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          {property.name}
        </span>
      ))}
    </div>
  );
}

export function Phase3OwnerHubPage() {
  const ownersQuery = useMockOwners();
  const propertiesQuery = useMockProperties();
  const agreementsQuery = useMockAgreements();
  const contractsQuery = useMockContracts();
  const unitsQuery = useMockUnits();
  const [ownerFormValues, setOwnerFormValues] = useState<Phase3OwnerFormValues>(emptyOwnerFormValues);
  const [ownerFormError, setOwnerFormError] = useState<string | null>(null);
  const [ownerFormSuccess, setOwnerFormSuccess] = useState<string | null>(null);
  const [ownerFormSaving, setOwnerFormSaving] = useState(false);
  const [agreementFormValues, setAgreementFormValues] = useState<Phase3AgreementFormValues>(emptyAgreementFormValues);
  const [agreementFormError, setAgreementFormError] = useState<string | null>(null);
  const [agreementFormSuccess, setAgreementFormSuccess] = useState<string | null>(null);
  const [agreementFormSaving, setAgreementFormSaving] = useState(false);

  const rows = buildOwnerHubRows(
    ownersQuery.data,
    propertiesQuery.data,
    agreementsQuery.data,
    contractsQuery.data,
    unitsQuery.data,
  );
  const totalProperties = propertiesQuery.data.length;
  const totalUnits = unitsQuery.data.length;
  const activeAgreementCount = agreementsQuery.data.filter((agreement) => agreement.status === 'active').length;
  const agreementOwnerProperties = propertiesQuery.data.filter((property) => property.ownerId === agreementFormValues.ownerId);

  const updateOwnerFormField = (field: keyof Phase3OwnerFormValues, value: string) => {
    setOwnerFormValues((current) => ({ ...current, [field]: value }));
    setOwnerFormError(null);
    setOwnerFormSuccess(null);
  };

  const updateAgreementFormField = (field: keyof Phase3AgreementFormValues, value: string) => {
    setAgreementFormValues((current) => ({
      ...current,
      [field]: value,
      ...(field === 'ownerId' ? { propertyId: '' } : null),
      ...(field === 'agreementType' && value === 'master_lease' ? { commissionRate: '' } : null),
    }));
    setAgreementFormError(null);
    setAgreementFormSuccess(null);
  };

  const handleOwnerFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validatePhase3OwnerForm(ownerFormValues);
    if (validationError) {
      setOwnerFormError(validationError);
      return;
    }

    setOwnerFormSaving(true);
    setOwnerFormError(null);
    setOwnerFormSuccess(null);
    try {
      await ownersQuery.execute({
        name: ownerFormValues.name.trim(),
        phone: ownerFormValues.phone.trim(),
        email: ownerFormValues.email.trim() || undefined,
      });
      setOwnerFormValues(emptyOwnerFormValues);
      setOwnerFormSuccess('تم تسجيل المالك محلياً بنجاح.');
    } catch (error) {
      setOwnerFormError(error instanceof Error ? error.message : 'تعذر تسجيل المالك محلياً.');
    } finally {
      setOwnerFormSaving(false);
    }
  };

  const handleAgreementFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validatePhase3AgreementForm(agreementFormValues);
    if (validationError) {
      setAgreementFormError(validationError);
      return;
    }

    setAgreementFormSaving(true);
    setAgreementFormError(null);
    setAgreementFormSuccess(null);
    try {
      await agreementsQuery.execute({
        ownerId: agreementFormValues.ownerId,
        propertyId: agreementFormValues.propertyId,
        agreementType: agreementFormValues.agreementType,
        startDate: agreementFormValues.startDate,
        endDate: agreementFormValues.endDate || null,
        commissionRate: parseOptionalPositiveNumber(agreementFormValues.commissionRate),
        fixedFee: parseOptionalPositiveNumber(agreementFormValues.fixedFee),
      });
      setAgreementFormValues(emptyAgreementFormValues);
      setAgreementFormSuccess('تم إنشاء اتفاقية التشغيل محلياً بنجاح.');
    } catch (error) {
      setAgreementFormError(error instanceof Error ? error.message : 'تعذر إنشاء اتفاقية التشغيل محلياً.');
    } finally {
      setAgreementFormSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <StatusBadge tone="blue">Phase 3 · شبكة البطاقات</StatusBadge>
          <div>
            <h1 className="text-2xl font-black tracking-tight">مركز الملاك</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              أول واجهة محلية من Phase 3 لعرض الملاك وربطهم بالعقارات والاتفاقيات والوحدات من طبقة البيانات التجريبية بدون Supabase.
            </p>
          </div>
        </div>
        <Button type="button" className="min-h-11 gap-2" onClick={() => document.getElementById('phase3-owner-registration-name')?.focus()}>
          <Plus className="size-4" /> تسجيل مالك
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="إجمالي الملاك" value={ownersQuery.data.length} icon={Users} accent="primary" />
        <KpiCard label="العقارات المرتبطة" value={totalProperties} icon={Building2} accent="sky" />
        <KpiCard label="اتفاقيات نشطة" value={activeAgreementCount} icon={FileText} accent="emerald" />
        <KpiCard label="الوحدات" value={totalUnits} icon={Home} accent="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تسجيل مالك جديد</CardTitle>
          <CardDescription>نموذج Phase 3 المحلي يحفظ بيانات المالك في mock store فقط، بدون Supabase أو قيود قاعدة بيانات مباشرة.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end" onSubmit={handleOwnerFormSubmit}>
            <Field label="اسم المالك *">
              <Input
                id="phase3-owner-registration-name"
                value={ownerFormValues.name}
                onChange={(event) => updateOwnerFormField('name', event.target.value)}
                placeholder="مثال: شركة الربيع العقارية"
              />
            </Field>
            <Field label="الهاتف *">
              <Input
                dir="ltr"
                value={ownerFormValues.phone}
                onChange={(event) => updateOwnerFormField('phone', event.target.value)}
                placeholder="+9665xxxxxxxx"
              />
            </Field>
            <Field label="البريد الإلكتروني">
              <Input
                dir="ltr"
                type="email"
                value={ownerFormValues.email}
                onChange={(event) => updateOwnerFormField('email', event.target.value)}
                placeholder="owner@example.com"
              />
            </Field>
            <Button type="submit" className="min-h-11 gap-2" disabled={ownerFormSaving}>
              <Plus className="size-4" /> إضافة محلية
            </Button>
          </form>
          {ownerFormError ? <p className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive">{ownerFormError}</p> : null}
          {ownerFormSuccess ? <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{ownerFormSuccess}</p> : null}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>إنشاء اتفاقية تشغيل</CardTitle>
          <CardDescription>يدعم نموذج Phase 3 نمطي إدارة الأملاك والاستئجار الرئيسي، ولا يسمح بإنشاء اتفاقية قبل اختيار مالك وعقار مرتبط به.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 xl:grid-cols-4" onSubmit={handleAgreementFormSubmit}>
            <Field label="المالك *">
              <Select value={agreementFormValues.ownerId} onChange={(event) => updateAgreementFormField('ownerId', event.target.value)}>
                <option value="">اختر المالك</option>
                {ownersQuery.data.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
              </Select>
            </Field>
            <Field label="العقار *">
              <Select value={agreementFormValues.propertyId} onChange={(event) => updateAgreementFormField('propertyId', event.target.value)} disabled={!agreementFormValues.ownerId}>
                <option value="">اختر العقار المرتبط</option>
                {agreementOwnerProperties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
              </Select>
            </Field>
            <Field label="نموذج التشغيل *">
              <Select value={agreementFormValues.agreementType} onChange={(event) => updateAgreementFormField('agreementType', event.target.value)}>
                <option value="property_management">إدارة أملاك</option>
                <option value="master_lease">استئجار رئيسي</option>
              </Select>
            </Field>
            <Field label="تاريخ البداية *">
              <Input dir="ltr" type="date" value={agreementFormValues.startDate} onChange={(event) => updateAgreementFormField('startDate', event.target.value)} />
            </Field>
            <Field label="تاريخ النهاية">
              <Input dir="ltr" type="date" value={agreementFormValues.endDate} onChange={(event) => updateAgreementFormField('endDate', event.target.value)} />
            </Field>
            <Field label="نسبة العمولة %">
              <Input dir="ltr" type="number" min="0" step="0.01" value={agreementFormValues.commissionRate} onChange={(event) => updateAgreementFormField('commissionRate', event.target.value)} disabled={agreementFormValues.agreementType === 'master_lease'} placeholder="8" />
            </Field>
            <Field label={agreementFormValues.agreementType === 'master_lease' ? 'التزام المالك الثابت *' : 'رسم ثابت اختياري'}>
              <Input dir="ltr" type="number" min="0" step="0.01" value={agreementFormValues.fixedFee} onChange={(event) => updateAgreementFormField('fixedFee', event.target.value)} placeholder="1500" />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="min-h-11 w-full gap-2" disabled={agreementFormSaving}>
                <FileText className="size-4" /> إنشاء اتفاقية
              </Button>
            </div>
          </form>
          {agreementFormError ? <p className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive">{agreementFormError}</p> : null}
          {agreementFormSuccess ? <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{agreementFormSuccess}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>شبكة البطاقات</CardTitle>
          <CardDescription>عرض عربي/RTL سريع للملاك مع ملخص العقارات والعقود النشطة تمهيداً لنماذج التسجيل والاتفاقيات.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <EntityTable
            aria-label="جدول مركز الملاك المحلي"
            rows={rows}
            keyOf={(row) => row.owner.id}
            emptyTitle="لا يوجد ملاك"
            emptyDescription="بيانات Phase 3 المحلية لا تحتوي على ملاك حالياً."
            renderMobileCard={(row) => (
              <OwnerCard
                id={row.owner.id}
                displayName={row.owner.name}
                phone={row.owner.phone}
                email={row.owner.email}
                propertyCount={row.properties.length}
                activeContractCount={row.activeContractCount}
              />
            )}
            columns={[
              {
                key: 'owner',
                header: 'المالك',
                render: (row) => (
                  <EntityCell
                    icon={Users}
                    title={row.owner.name}
                    subtitle={row.owner.email ?? row.owner.phone}
                    meta={<span dir="ltr">{row.owner.id}</span>}
                  />
                ),
              },
              { key: 'properties', header: 'العقارات', render: (row) => <OwnerPropertyList properties={row.properties} /> },
              { key: 'units', header: 'الوحدات', render: (row) => formatArabicNumber(row.unitCount) },
              { key: 'agreements', header: 'الاتفاقيات النشطة', render: (row) => formatArabicNumber(row.activeAgreementCount) },
              { key: 'contracts', header: 'العقود النشطة', render: (row) => row.activeContractCount ? formatArabicNumber(row.activeContractCount) : '—' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
