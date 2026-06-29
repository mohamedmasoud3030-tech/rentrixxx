import { FileText, Plus, RefreshCw } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable, type ColumnDef } from '@/components/ui/entity-table';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { Select } from '@/components/ui/select';
import { EntityCard } from '@/components/ui/entity-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMockAgreements, useMockContracts, useMockProperties, useMockTenants, useMockUnits } from '@/hooks/use-mock-repositories';
import { contractRepo } from '@/services/mock-repos';
import type { ContractStatus, LeaseContract, PaymentFrequency } from '@/domain/types';

export type Phase4ContractFormValues = Readonly<{
  propertyId: string;
  unitId: string;
  tenantId: string;
  agreementId: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  paymentFrequency: PaymentFrequency;
}>;

export function validatePhase4ContractForm(values: Phase4ContractFormValues): string | null {
  if (!values.unitId) return 'يجب اختيار الوحدة.';
  if (!values.tenantId) return 'يجب اختيار المستأجر.';
  if (!values.agreementId) return 'يجب تحديد اتفاقية التشغيل.';
  if (!values.startDate) return 'تاريخ البداية مطلوب.';
  if (!values.endDate) return 'تاريخ النهاية مطلوب.';
  if (values.startDate >= values.endDate) return 'تاريخ البداية يجب أن يسبق تاريخ النهاية.';
  const amount = Number(values.rentAmount);
  if (isNaN(amount) || amount <= 0) return 'قيمة الإيجار يجب أن تكون رقماً موجباً.';
  return null;
}

const emptyContractFormValues: Phase4ContractFormValues = {
  propertyId: '',
  unitId: '',
  tenantId: '',
  agreementId: '',
  startDate: '',
  endDate: '',
  rentAmount: '',
  paymentFrequency: 'monthly',
};

function formatArabicNumber(value: number): string {
  return value.toLocaleString('ar');
}

const statusMap: Record<ContractStatus, { label: string; tone: 'success' | 'neutral' | 'danger' | 'warning' }> = {
  active: { label: 'نشط', tone: 'success' },
  expired: { label: 'منتهي', tone: 'neutral' },
  terminated: { label: 'مفسوخ', tone: 'danger' },
  draft: { label: 'مسودة', tone: 'warning' },
};

const frequencyLabels: Record<PaymentFrequency, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

export function Phase4ContractHubPage() {
  const contractsQuery = useMockContracts();
  const tenantsQuery = useMockTenants();
  const unitsQuery = useMockUnits();
  const agreementsQuery = useMockAgreements();
  const propertiesQuery = useMockProperties();

  const [activeView, setActiveView] = useState<'list' | 'create' | 'renew' | 'terminate'>('list');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Phase4ContractFormValues>(emptyContractFormValues);
  const [terminationDate, setTerminationDate] = useState('');
  const [terminationReason, setTerminationReason] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const allContracts = contractsQuery.data;
  const filteredContracts = allContracts.filter((contract: LeaseContract) => {
    if (statusFilter !== 'all' && contract.status !== statusFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const tenant = tenantsQuery.data.find((t) => t.id === contract.tenantId);
    const unit = unitsQuery.data.find((u) => u.id === contract.unitId);
    return (
      contract.id.toLowerCase().includes(term) ||
      (tenant && tenant.name.toLowerCase().includes(term)) ||
      (unit && unit.name.toLowerCase().includes(term))
    );
  });

  const activeContractsCount = allContracts.filter((c) => c.status === 'active').length;
  const vacantUnitsCount = unitsQuery.data.filter((u) => u.status === 'vacant').length;

  const availableUnits = unitsQuery.data.filter((u) => {
    if (formValues.propertyId && u.propertyId !== formValues.propertyId) return false;
    return u.status === 'vacant';
  });

  const availableAgreements = agreementsQuery.data.filter((a) => {
    if (formValues.propertyId && a.propertyId !== formValues.propertyId) return false;
    return a.status === 'active';
  });

  const updateFormField = (field: keyof Phase4ContractFormValues, value: string) => {
    setFormValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'propertyId') {
        next.unitId = '';
        next.agreementId = '';
      }
      if (field === 'unitId') {
        const u = unitsQuery.data.find((item) => item.id === value);
        if (u && !next.rentAmount) {
          next.rentAmount = String(u.rentAmount);
        }
      }
      return next;
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const startCreate = () => {
    setSelectedContractId(null);
    setFormValues(emptyContractFormValues);
    setFormError(null);
    setFormSuccess(null);
    setActiveView('create');
  };

  const startRenew = (contract: LeaseContract) => {
    setSelectedContractId(contract.id);
    setFormValues({
      propertyId: contract.propertyId,
      unitId: contract.unitId,
      tenantId: contract.tenantId,
      agreementId: contract.agreementId,
      startDate: contract.endDate,
      endDate: '',
      rentAmount: String(contract.rentAmount),
      paymentFrequency: contract.paymentFrequency,
    });
    setFormError(null);
    setFormSuccess(null);
    setActiveView('renew');
  };

  const startTerminate = (contract: LeaseContract) => {
    setSelectedContractId(contract.id);
    setTerminationDate(new Date().toISOString().split('T')[0]);
    setTerminationReason('');
    setFormError(null);
    setFormSuccess(null);
    setActiveView('terminate');
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validatePhase4ContractForm(formValues);
    if (error) {
      setFormError(error);
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      await contractsQuery.execute({
        propertyId: formValues.propertyId || (unitsQuery.data.find((u) => u.id === formValues.unitId)?.propertyId ?? ''),
        unitId: formValues.unitId,
        tenantId: formValues.tenantId,
        agreementId: formValues.agreementId,
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        rentAmount: Number(formValues.rentAmount),
        paymentFrequency: formValues.paymentFrequency,
      });
      setFormSuccess('تم إنشاء العقد محلياً بنجاح وحجز الوحدة.');
      setTimeout(() => setActiveView('list'), 1200);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر إنشاء العقد محلياً.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleRenewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContractId) return;
    if (!formValues.startDate || !formValues.endDate || formValues.startDate >= formValues.endDate) {
      setFormError('تواريخ التجديد غير صالحة.');
      return;
    }
    const amount = Number(formValues.rentAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('قيمة الإيجار غير صالحة.');
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      await contractRepo.renew(selectedContractId, {
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        rentAmount: amount,
        paymentFrequency: formValues.paymentFrequency,
      });
      setFormSuccess('تم تجديد العقد محلياً بنجاح وأرشفة القديم كمنتهي.');
      setTimeout(() => setActiveView('list'), 1200);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر تجديد العقد محلياً.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleTerminateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContractId) return;
    setFormSaving(true);
    setFormError(null);
    try {
      await contractRepo.terminate(selectedContractId, terminationDate, terminationReason);
      setFormSuccess('تم فسخ العقد وتحرير الوحدة بنجاح.');
      setTimeout(() => setActiveView('list'), 1200);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر فسخ العقد محلياً.');
    } finally {
      setFormSaving(false);
    }
  };

  const columns: ColumnDef<LeaseContract>[] = [
    {
      key: 'id',
      header: 'رقم العقد',
      render: (c: LeaseContract) => <span className="font-black text-primary">{c.id}</span>,
    },
    {
      key: 'unit',
      header: 'الوحدة / المستأجر',
      render: (c: LeaseContract) => {
        const tenant = tenantsQuery.data.find((t) => t.id === c.tenantId);
        const unit = unitsQuery.data.find((u) => u.id === c.unitId);
        return <EntityCell icon={FileText} title={unit?.name ?? c.unitId} subtitle={tenant?.name ?? c.tenantId} />;
      },
    },
    {
      key: 'dates',
      header: 'المدة',
      render: (c: LeaseContract) => (
        <span className="text-sm" dir="ltr">
          {c.startDate} → {c.endDate}
        </span>
      ),
    },
    {
      key: 'rent',
      header: 'الإيجار',
      render: (c: LeaseContract) => (
        <span className="font-bold">
          {formatArabicNumber(c.rentAmount)}{' '}
          <span className="text-xs text-muted-foreground">({frequencyLabels[c.paymentFrequency] || c.paymentFrequency})</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (c: LeaseContract) => {
        const st = statusMap[c.status] ?? { label: c.status, tone: 'neutral' };
        return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>;
      },
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (c: LeaseContract) =>
        c.status === 'active' ? (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" onClick={() => startRenew(c)}>
              تجديد
            </Button>
            <Button variant="danger" onClick={() => startTerminate(c)}>
              فسخ
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <FileText className="size-4" />
            المرحلة 4: إدارة عقود الإيجار
          </div>
          <h1 className="mt-2 text-3xl font-black">مركز العقود</h1>
          <p className="text-sm text-muted-foreground">
            إنشاء وتجديد وفسخ عقود الإيجار مع التحقق الصارم من الشواغر وتواريخ اتفاقيات التشغيل.
          </p>
        </div>
        {activeView === 'list' ? (
          <Button onClick={startCreate} className="gap-2">
            <Plus className="size-4" />
            إنشاء عقد جديد
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setActiveView('list')}>
            العودة للقائمة
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="إجمالي العقود"
          value={formatArabicNumber(allContracts.length)}
          sub="إجمالي العقود المسجلة في النموذج المحلي"
          accent="primary"
          icon={FileText}
        />
        <KpiCard
          label="العقود النشطة"
          value={formatArabicNumber(activeContractsCount)}
          sub="العقود السارية حالياً"
          accent="emerald"
          icon={RefreshCw}
        />
        <KpiCard
          label="الوحدات الشاغرة"
          value={formatArabicNumber(vacantUnitsCount)}
          sub="الوحدات المتاحة للتعاقد الفوري"
          accent="sky"
          icon={FileText}
        />
      </div>

      {activeView === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">إنشاء عقد إيجار جديد</CardTitle>
            <CardDescription>
              اختر العقار، الوحدة الشاغرة، المستأجر، واتفاقية التشغيل السارية. لا يُسمح بتداخل التواريخ.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">العقار (لتصفية الوحدات والاتفاقيات)</label>
                  <Select
                    value={formValues.propertyId}
                    onChange={(e) => updateFormField('propertyId', e.target.value)}
                  >
                    <option value="">جميع العقارات</option>
                    {propertiesQuery.data.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">الوحدة الشاغرة</label>
                  <Select
                    value={formValues.unitId}
                    onChange={(e) => updateFormField('unitId', e.target.value)}
                  >
                    <option value="">اختر الوحدة</option>
                    {availableUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} (إيجار: {formatArabicNumber(u.rentAmount)})</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">المستأجر</label>
                  <Select
                    value={formValues.tenantId}
                    onChange={(e) => updateFormField('tenantId', e.target.value)}
                  >
                    <option value="">اختر المستأجر</option>
                    {tenantsQuery.data.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">اتفاقية التشغيل السارية</label>
                  <Select
                    value={formValues.agreementId}
                    onChange={(e) => updateFormField('agreementId', e.target.value)}
                  >
                    <option value="">اختر الاتفاقية</option>
                    {availableAgreements.map((a) => (
                      <option key={a.id} value={a.id}>اتفاقية {a.id} ({a.startDate} → {a.endDate || 'مفتوحة'})</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">تاريخ البداية</label>
                  <Input
                    type="date"
                    value={formValues.startDate}
                    onChange={(e) => updateFormField('startDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">تاريخ النهاية</label>
                  <Input
                    type="date"
                    value={formValues.endDate}
                    onChange={(e) => updateFormField('endDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">قيمة الإيجار (رقم موجب)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formValues.rentAmount}
                    onChange={(e) => updateFormField('rentAmount', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">دورة السداد</label>
                  <Select
                    value={formValues.paymentFrequency}
                    onChange={(e) => updateFormField('paymentFrequency', e.target.value as PaymentFrequency)}
                  >
                    <option value="monthly">شهري</option>
                    <option value="quarterly">ربع سنوي</option>
                    <option value="semi-annual">نصف سنوي</option>
                    <option value="annual">سنوي</option>
                  </Select>
                </div>
              </div>

              {formError && <p className="text-sm font-bold text-rose-600">{formError}</p>}
              {formSuccess && <p className="text-sm font-bold text-emerald-600">{formSuccess}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={formSaving}>
                  {formSaving ? 'جار إنشاء العقد...' : 'حفظ العقد'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setActiveView('list')}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeView === 'renew' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">تجديد عقد الإيجار ({selectedContractId})</CardTitle>
            <CardDescription>
              إنشاء عقد سارٍ جديد لنفس الوحدة والمستأجر مع تحديث تاريخ العقد القديم إلى منتهي.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">تاريخ البداية الجديد</label>
                  <Input
                    type="date"
                    value={formValues.startDate}
                    onChange={(e) => updateFormField('startDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">تاريخ النهاية الجديد</label>
                  <Input
                    type="date"
                    value={formValues.endDate}
                    onChange={(e) => updateFormField('endDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">قيمة الإيجار الجديدة</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formValues.rentAmount}
                    onChange={(e) => updateFormField('rentAmount', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">دورة السداد</label>
                  <Select
                    value={formValues.paymentFrequency}
                    onChange={(e) => updateFormField('paymentFrequency', e.target.value as PaymentFrequency)}
                  >
                    <option value="monthly">شهري</option>
                    <option value="quarterly">ربع سنوي</option>
                    <option value="semi-annual">نصف سنوي</option>
                    <option value="annual">سنوي</option>
                  </Select>
                </div>
              </div>

              {formError && <p className="text-sm font-bold text-rose-600">{formError}</p>}
              {formSuccess && <p className="text-sm font-bold text-emerald-600">{formSuccess}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={formSaving}>
                  {formSaving ? 'جار التجديد...' : 'تأكيد التجديد'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setActiveView('list')}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeView === 'terminate' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">فسخ عقد الإيجار ({selectedContractId})</CardTitle>
            <CardDescription>
              تغيير حالة العقد إلى مفسوخ وإعادة حالة الوحدة المرتبطة إلى شاغرة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTerminateSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">تاريخ الفسخ الفعلي</label>
                  <Input
                    type="date"
                    value={terminationDate}
                    onChange={(e) => setTerminationDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">سبب الفسخ (اختياري)</label>
                  <Input
                    placeholder="مثال: طلب المستأجر الإخلاء المبكر"
                    value={terminationReason}
                    onChange={(e) => setTerminationReason(e.target.value)}
                  />
                </div>
              </div>

              {formError && <p className="text-sm font-bold text-rose-600">{formError}</p>}
              {formSuccess && <p className="text-sm font-bold text-emerald-600">{formSuccess}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="danger" disabled={formSaving}>
                  {formSaving ? 'جار إنهاء العقد...' : 'تأكيد فسخ العقد'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setActiveView('list')}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeView === 'list' && (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl font-black">قائمة عقود الإيجار</CardTitle>
              <CardDescription>عرض دورة حياة العقود وإدارة التجديد والفسخ</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ContractStatus | 'all')}
                className="w-full sm:w-40"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="expired">منتهي</option>
                <option value="terminated">مفسوخ</option>
                <option value="draft">مسودة</option>
              </Select>
              <Input
                placeholder="بحث برقم العقد أو الوحدة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-60"
              />
            </div>
          </CardHeader>
          <CardContent>
            <EntityTable<LeaseContract>
              aria-label="جدول العقود"
              rows={filteredContracts}
              keyOf={(c) => c.id}
              emptyTitle="لا توجد عقود مطابقة للتصفية"
              emptyDescription="قم بإنشاء عقد إيجار جديد."
              renderMobileCard={(contract: LeaseContract) => {
                const tenant = tenantsQuery.data.find((t) => t.id === contract.tenantId);
                const unit = unitsQuery.data.find((u) => u.id === contract.unitId);
                const st = statusMap[contract.status] ?? { label: contract.status, tone: 'neutral' };
                return (
                  <EntityCard
                    id={contract.id}
                    name={contract.id}
                    subtitle={`الوحدة: ${unit?.name ?? contract.unitId} · المستأجر: ${tenant?.name ?? contract.tenantId}`}
                    type="string"
                    badge={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
                    actions={
                      contract.status === 'active' ? [
                        { label: 'تجديد', onClick: () => startRenew(contract) },
                        { label: 'فسخ', variant: 'danger', onClick: () => startTerminate(contract) },
                      ] : undefined
                    }
                  />
                );
              }}
              columns={columns}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
