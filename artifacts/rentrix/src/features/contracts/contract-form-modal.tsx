import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { FileAttachmentField } from '@/components/ui/file-attachment-field';
import { Input } from '@/components/ui/input';
import { ResponsiveFormOverlay } from '@/components/ui/responsive-form-overlay';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { listPeople } from '@/features/people/people-service';
import { listProperties } from '@/features/properties/property-service';
import { listUnitsByProperty } from '@/features/units/unit-service';
import { buildContractUnitOptionLabel, getContractUnitSelectionIssue, isUnitSelectableForContract } from './contract-unit-options';
import { contractSchema, contractStatusLabels, contractStatusValues, paymentCycleLabels, paymentCycleValues, type ContractFormValues } from './contractSchema';
import { useContract, useCreateContract, useUpdateContract } from './useContracts';

function fieldError(message?: string) {
  return message ? <span className="text-xs font-bold text-destructive">{message}</span> : null;
}

interface ContractFormModalProps {
  open: boolean;
  onClose: () => void;
  contractId?: string;
}

export function ContractFormModal({ open, onClose, contractId }: ContractFormModalProps) {
  const isEdit = Boolean(contractId);
  const contractQuery = useContract(contractId ?? '');
  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract(contractId ?? '');
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      property_id: '',
      unit_id: '',
      tenant_id: '',
      start_date: '',
      end_date: '',
      rent_amount: 0,
      payment_cycle: 'monthly',
      status: 'draft',
      cancellation_reason: '',
      notes: '',
      attachment_url: null,
    },
  });

  const propertyId = useWatch({ control: form.control, name: 'property_id' });
  const propertiesQuery = useQuery({ queryKey: ['contracts', 'properties-options'], queryFn: () => listProperties({ search: '', status: 'all', page: 1, pageSize: 200 }) });
  const peopleQuery = useQuery({ queryKey: ['contracts', 'tenant-options'], queryFn: () => listPeople({ search: '', type: 'tenant', page: 1, pageSize: 200 }) });
  const unitsQuery = useQuery({ queryKey: ['contracts', 'unit-options', propertyId], queryFn: () => listUnitsByProperty(propertyId || ''), enabled: Boolean(propertyId) });
  const selectedProperty = propertiesQuery.data?.rows.find((property) => property.id === propertyId);
  const currentLinkedUnitId = isEdit ? contractQuery.data?.unit_id ?? null : null;

  useEffect(() => {
    if (!open) {
      form.reset();
      return;
    }
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
      attachment_url: contractQuery.data.attachment_url ?? null,
    });
  }, [contractQuery.data, form, open]);

  const submitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = contractSchema.parse(values);
    const unitIssue = getContractUnitSelectionIssue({
      units: unitsQuery.data ?? [],
      propertyId: payload.property_id,
      unitId: payload.unit_id,
      currentLinkedUnitId,
    });
    if (unitIssue) {
      form.setError('unit_id', { type: 'validate', message: unitIssue });
      return;
    }
    if (isEdit && contractId) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  });

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={(v) => { if (!v) onClose(); }}
      title={isEdit ? 'تعديل عقد' : 'إنشاء عقد'}
      className="max-h-[90dvh] overflow-y-auto max-w-2xl"
    >
        {isEdit && contractQuery.isLoading ? (
          <RouteLoadingState />
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold">
              العقار
              <Select {...form.register('property_id')} autoFocus>
                <option value="">اختر العقار</option>
                {propertiesQuery.data?.rows.map((property) => (
                  <option key={property.id} value={property.id}>{property.title}</option>
                ))}
              </Select>
              {fieldError(form.formState.errors.property_id?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              الوحدة
              <Select {...form.register('unit_id')} disabled={!propertyId}>
                <option value="">اختر الوحدة</option>
                {unitsQuery.data?.map((unit) => (
                  <option
                    key={unit.id}
                    value={unit.id}
                    disabled={!isUnitSelectableForContract({ unit, currentLinkedUnitId })}
                  >
                    {buildContractUnitOptionLabel({ unit, property: selectedProperty })}
                  </option>
                ))}
              </Select>
              {fieldError(form.formState.errors.unit_id?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              المستأجر
              <Select {...form.register('tenant_id')}>
                <option value="">اختر المستأجر</option>
                {peopleQuery.data?.rows.map((person) => (
                  <option key={person.id} value={person.id}>{person.full_name}</option>
                ))}
              </Select>
              {fieldError(form.formState.errors.tenant_id?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              الحالة
              <Select {...form.register('status')}>
                {contractStatusValues.map((status) => (
                  <option key={status} value={status}>{contractStatusLabels[status]}</option>
                ))}
              </Select>
              {fieldError(form.formState.errors.status?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              تاريخ البداية
              <Input type="date" {...form.register('start_date')} />
              {fieldError(form.formState.errors.start_date?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              تاريخ النهاية
              <Input type="date" {...form.register('end_date')} />
              {fieldError(form.formState.errors.end_date?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              قيمة الإيجار
              <Input type="number" step="0.01" min="0.01" {...form.register('rent_amount')} />
              {fieldError(form.formState.errors.rent_amount?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              دورة السداد
              <Select {...form.register('payment_cycle')}>
                {paymentCycleValues.map((cycle) => (
                  <option key={cycle} value={cycle}>{paymentCycleLabels[cycle]}</option>
                ))}
              </Select>
              {fieldError(form.formState.errors.payment_cycle?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold md:col-span-2">
              سبب الإلغاء
              <Textarea {...form.register('cancellation_reason')} placeholder="يظهر عند إلغاء العقد" />
            </label>
            <label className="grid gap-2 text-sm font-bold md:col-span-2">
              ملاحظات
              <Textarea {...form.register('notes')} placeholder="ملاحظات العقد" />
            </label>
            <div className="md:col-span-2">
              <Controller
                control={form.control}
                name="attachment_url"
                render={({ field }) => (
                  <FileAttachmentField label="نسخة العقد الموقعة (PDF أو صورة)" value={field.value ?? null} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="flex justify-end gap-3 md:col-span-2">
              <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جار الحفظ...' : 'حفظ العقد'}
              </Button>
            </div>
          </form>
        )}
    </ResponsiveFormOverlay>
  );
}
