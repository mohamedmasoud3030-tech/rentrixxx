import { Phone, Plus, User, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable, type ColumnDef } from '@/components/ui/entity-table';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { EntityCard, entityCardContactMeta } from '@/components/ui/entity-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMockContracts, useMockTenants } from '@/hooks/use-mock-repositories';
import { tenantRepo } from '@/services/mock-repos';
import type { Tenant } from '@/domain/types';

export type Phase4TenantFormValues = Readonly<{ name: string; phone: string; email: string }>;

export function validatePhase4TenantForm(values: Phase4TenantFormValues): string | null {
  if (!values.name.trim()) return 'اسم المستأجر مطلوب.';
  if (!values.phone.trim()) return 'رقم الهاتف مطلوب.';
  return null;
}

const emptyTenantFormValues: Phase4TenantFormValues = { name: '', phone: '', email: '' };

function formatArabicNumber(value: number): string {
  return value.toLocaleString('ar');
}

export function Phase4TenantHubPage() {
  const tenantsQuery = useMockTenants();
  const contractsQuery = useMockContracts();

  const [search, setSearch] = useState('');
  const [formValues, setFormValues] = useState<Phase4TenantFormValues>(emptyTenantFormValues);
  const [editTenantId, setEditTenantId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const activeTenants = tenantsQuery.data;
  const filteredTenants = activeTenants.filter((tenant: Tenant) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      tenant.name.toLowerCase().includes(term) ||
      tenant.phone.toLowerCase().includes(term) ||
      (tenant.email && tenant.email.toLowerCase().includes(term))
    );
  });

  const activeContractsCount = contractsQuery.data.filter((contract) => contract.status === 'active').length;

  const updateFormField = (field: keyof Phase4TenantFormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormError(null);
    setFormSuccess(null);
  };

  const startCreate = () => {
    setEditTenantId(null);
    setFormValues(emptyTenantFormValues);
    setFormError(null);
    setFormSuccess(null);
  };

  const startEdit = (tenant: Tenant) => {
    setEditTenantId(tenant.id);
    setFormValues({ name: tenant.name, phone: tenant.phone, email: tenant.email || '' });
    setFormError(null);
    setFormSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validatePhase4TenantForm(formValues);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormSaving(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      if (editTenantId) {
        await tenantRepo.update(editTenantId, {
          name: formValues.name.trim(),
          phone: formValues.phone.trim(),
          email: formValues.email.trim() || undefined,
        });
        setFormSuccess('تم تحديث بيانات المستأجر محلياً بنجاح.');
      } else {
        await tenantsQuery.execute({
          name: formValues.name.trim(),
          phone: formValues.phone.trim(),
          email: formValues.email.trim() || undefined,
        });
        setFormSuccess('تم إضافة المستأجر محلياً بنجاح.');
      }
      setFormValues(emptyTenantFormValues);
      setEditTenantId(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر حفظ المستأجر محلياً.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleArchive = async (tenantId: string) => {
    setArchiveError(null);
    try {
      await tenantRepo.archive(tenantId);
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : 'تعذر أرشفة المستأجر.');
    }
  };

  const columns: ColumnDef<Tenant>[] = [
    {
      key: 'name',
      header: 'المستأجر',
      render: (t: Tenant) => <EntityCell icon={User} title={t.name} subtitle={t.id} />,
    },
    {
      key: 'contact',
      header: 'التواصل',
      render: (t: Tenant) => (
        <div className="text-sm" dir="ltr">
          {t.phone} {t.email ? `· ${t.email}` : ''}
        </div>
      ),
    },
    {
      key: 'contracts',
      header: 'العقود النشطة',
      render: (t: Tenant) => {
        const count = contractsQuery.data.filter((c) => c.tenantId === t.id && c.status === 'active').length;
        return <span className="font-bold">{formatArabicNumber(count)}</span>;
      },
    },
    { key: 'status', header: 'الحالة', render: (_t: Tenant) => <StatusBadge tone="success">نشط</StatusBadge> },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (t: Tenant) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" onClick={() => startEdit(t)}>
            تعديل
          </Button>
          <Button variant="danger" onClick={() => handleArchive(t.id)}>
            أرشفة
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Users className="size-4" />
            إدارة المستأجرين
          </div>
          <h1 className="mt-2 text-3xl font-black">مركز المستأجرين</h1>
          <p className="text-sm text-muted-foreground">
            إضافة المستأجرين وتعديل بياناتهم وأرشفتهم مع التحقق من ارتباطهم بالعقود النشطة.
          </p>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="size-4" />
          إضافة مستأجر جديد
        </Button>
      </div>

      {archiveError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
          {archiveError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label="المستأجرين النشطين"
          value={formatArabicNumber(activeTenants.length)}
          sub="إجمالي المستأجرين غير المؤرشفين محلياً"
          accent="primary"
          icon={Users}
        />
        <KpiCard
          label="العقود النشطة"
          value={formatArabicNumber(activeContractsCount)}
          sub="إجمالي العقود المرتبطة بالمستأجرين حالياً"
          accent="emerald"
          icon={Phone}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-black">
            {editTenantId ? 'تعديل بيانات مستأجر' : 'تسجيل مستأجر جديد'}
          </CardTitle>
          <CardDescription>
            أدخل الاسم، رقم الهاتف، والبريد الإلكتروني للمستأجر. يحظر أرشفة أي مستأجر لديه عقود نشطة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-bold">اسم المستأجر</label>
                <Input
                  placeholder="مثال: أحمد عبد الله"
                  value={formValues.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">رقم الهاتف</label>
                <Input
                  placeholder="مثال: 0500000000"
                  value={formValues.phone}
                  onChange={(e) => updateFormField('phone', e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">البريد الإلكتروني (اختياري)</label>
                <Input
                  placeholder="example@domain.com"
                  value={formValues.email}
                  onChange={(e) => updateFormField('email', e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            {formError && <p className="text-sm font-bold text-rose-600">{formError}</p>}
            {formSuccess && <p className="text-sm font-bold text-emerald-600">{formSuccess}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={formSaving}>
                {formSaving ? 'جار الحفظ...' : editTenantId ? 'حفظ التعديلات' : 'تسجيل المستأجر'}
              </Button>
              {editTenantId && (
                <Button type="button" variant="secondary" onClick={startCreate}>
                  إلغاء التعديل
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-black">قائمة المستأجرين</CardTitle>
            <CardDescription>عرض السجلات مع إمكانية التعديل والأرشفة الآمنة</CardDescription>
          </div>
          <div className="w-full md:w-72">
            <Input
              placeholder="بحث بالاسم أو الهاتف أو الإيميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <EntityTable<Tenant>
            aria-label="جدول المستأجرين"
            rows={filteredTenants}
            keyOf={(t) => t.id}
            emptyTitle="لا توجد سجلات مستأجرين"
            emptyDescription="قم بإضافة مستأجر جديد."
            renderMobileCard={(tenant: Tenant) => {
              const contractsCount = contractsQuery.data.filter(
                (c) => c.tenantId === tenant.id && c.status === 'active',
              ).length;
              return (
                <EntityCard
                  id={tenant.id}
                  name={tenant.name}
                  subtitle={`عقود نشطة: ${formatArabicNumber(contractsCount)}`}
                  type="tenant"
                  badge={<StatusBadge tone="success">نشط</StatusBadge>}
                  meta={[
                    entityCardContactMeta.phone(tenant.phone),
                    ...(tenant.email ? [entityCardContactMeta.email(tenant.email)] : []),
                  ]}
                  actions={[
                    { label: 'تعديل', onClick: () => startEdit(tenant) },
                    { label: 'أرشفة', variant: 'danger', ariaLabel: `أرشفة ${tenant.name}`, onClick: () => handleArchive(tenant.id) },
                  ]}
                />
              );
            }}
            columns={columns}
          />
        </CardContent>
      </Card>
    </div>
  );
}
