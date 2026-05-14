import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RouteLoadingState } from '@/components/loading-state';
import { listPeople } from '@/features/people/people-service';
import { listProperties } from '@/features/properties/property-service';
import { listUnitsByProperty } from '@/features/units/unit-service';
import { contractSchema, contractStatusLabels, contractStatusValues, paymentCycleLabels, paymentCycleValues, type ContractFormValues } from './contractSchema';
import { useContract, useCreateContract, useUpdateContract } from './useContracts';

function fieldError(message?: string) { return message ? <span className="text-xs font-bold text-destructive">{message}</span> : null; }

export function ContractFormPage() {
  const { contractId } = useParams({ strict: false }) as { contractId?: string };
  const isEdit = Boolean(contractId);
  const navigate = useNavigate();
  const contractQuery = useContract(contractId ?? '');
  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract(contractId ?? '');
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: { property_id: '', unit_id: '', tenant_id: '', start_date: '', end_date: '', rent_amount: 0, payment_cycle: 'monthly', status: 'draft', cancellation_reason: '', notes: '' },
  });
  const propertyId = useWatch({ control: form.control, name: 'property_id' });
  const propertiesQuery = useQuery({ queryKey: ['contracts', 'properties-options'], queryFn: () => listProperties({ search: '', status: 'all', page: 1, pageSize: 200 }) });
  const peopleQuery = useQuery({ queryKey: ['contracts', 'tenant-options'], queryFn: () => listPeople({ search: '', type: 'tenant', page: 1, pageSize: 200 }) });
  const unitsQuery = useQuery({ queryKey: ['contracts', 'unit-options', propertyId], queryFn: () => listUnitsByProperty(propertyId || ''), enabled: Boolean(propertyId) });

  useEffect(() => {
    if (!contractQuery.data) return;
    form.reset({
      property_id: contractQuery.data.property_id,
      unit_id: contractQuery.data.unit_id ?? '',
      tenant_id: contractQuery.data.tenant_id,
      start_date: contractQuery.data.start_date,
      end_date: contractQuery.data.end_date,
      rent_amount: contractQuery.data.rent_amount,
      payment_cycle: contractQuery.data.payment_cycle,
      status: contractQuery.data.status,
      cancellation_reason: contractQuery.data.cancellation_reason ?? '',
      notes: contractQuery.data.notes ?? '',
    });
  }, [contractQuery.data, form]);

  if (isEdit && contractQuery.isLoading) return <RouteLoadingState />;
  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div><CardTitle className="text-3xl">{isEdit ? 'تعديل عقد' : 'إنشاء عقد'}</CardTitle><CardDescription>العقد رقم، المستأجر، الوحدة، التواريخ، قيمة الإيجار، الحالة، والملاحظات.</CardDescription></div>
        <Button variant="secondary" asChild><Link to="/contracts"><ArrowRight className="ml-2 size-4" />العودة</Link></Button>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={form.handleSubmit(async (values) => { const payload = contractSchema.parse(values); if (isEdit && contractId) await updateMutation.mutateAsync(payload); else await createMutation.mutateAsync(payload); await navigate({ to: '/contracts' }); })}>
          <label className="grid gap-2 text-sm font-bold">العقار<Select {...form.register('property_id')}><option value="">اختر العقار</option>{propertiesQuery.data?.rows.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</Select>{fieldError(form.formState.errors.property_id?.message)}</label>
          <label className="grid gap-2 text-sm font-bold">الوحدة<Select {...form.register('unit_id')} disabled={!propertyId}><option value="">اختر الوحدة</option>{unitsQuery.data?.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_number}</option>)}</Select>{fieldError(form.formState.errors.unit_id?.message)}</label>
          <label className="grid gap-2 text-sm font-bold">المستأجر<Select {...form.register('tenant_id')}><option value="">اختر المستأجر</option>{peopleQuery.data?.rows.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</Select>{fieldError(form.formState.errors.tenant_id?.message)}</label>
          <label className="grid gap-2 text-sm font-bold">الحالة<Select {...form.register('status')}>{contractStatusValues.map((status) => <option key={status} value={status}>{contractStatusLabels[status]}</option>)}</Select>{fieldError(form.formState.errors.status?.message)}</label>
          <label className="grid gap-2 text-sm font-bold">تاريخ البداية<Input type="date" {...form.register('start_date')} />{fieldError(form.formState.errors.start_date?.message)}</label>
          <label className="grid gap-2 text-sm font-bold">تاريخ النهاية<Input type="date" {...form.register('end_date')} />{fieldError(form.formState.errors.end_date?.message)}</label>
          <label className="grid gap-2 text-sm font-bold">قيمة الإيجار<Input type="number" step="0.01" min="0.01" {...form.register('rent_amount')} />{fieldError(form.formState.errors.rent_amount?.message)}</label>
          <label className="grid gap-2 text-sm font-bold">دورة السداد<Select {...form.register('payment_cycle')}>{paymentCycleValues.map((cycle) => <option key={cycle} value={cycle}>{paymentCycleLabels[cycle]}</option>)}</Select>{fieldError(form.formState.errors.payment_cycle?.message)}</label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">سبب الإلغاء<Textarea {...form.register('cancellation_reason')} placeholder="يظهر عند إلغاء العقد" /></label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">ملاحظات<Textarea {...form.register('notes')} placeholder="ملاحظات العقد" /></label>
          <div className="flex justify-end gap-3 md:col-span-2"><Button variant="secondary" asChild><Link to="/contracts">إلغاء</Link></Button><Button type="submit" disabled={submitting}>{submitting ? 'جار الحفظ...' : 'حفظ العقد'}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
