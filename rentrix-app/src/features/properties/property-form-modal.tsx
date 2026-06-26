import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RouteLoadingState } from '@/components/loading-state';
import { propertySchema, propertyStatusLabels, propertyStatusValues, type PropertyFormValues } from './property-schema';
import { useCreateProperty, useProperty, useUpdateProperty } from './use-properties';

function fieldError(id: string, message?: string) {
  return message ? <p id={id} className="text-xs font-bold text-destructive">{message}</p> : null;
}

interface PropertyFormModalProps {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
}

export function PropertyFormModal({ open, onClose, propertyId }: PropertyFormModalProps) {
  const isEdit = Boolean(propertyId);
  const propertyQuery = useProperty(propertyId ?? '');
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty(propertyId ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: '',
      type: '',
      address: '',
      owner_name: '',
      purchase_value: null,
      current_value: null,
      status: 'active',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setSubmitError(null);
      return;
    }
    setSubmitError(null);
    if (propertyQuery.data) {
      form.reset({
        title: propertyQuery.data.title,
        type: propertyQuery.data.type,
        address: propertyQuery.data.address,
        owner_name: propertyQuery.data.owner_name ?? '',
        purchase_value: propertyQuery.data.purchase_value,
        current_value: propertyQuery.data.current_value,
        status: propertyQuery.data.status,
        notes: propertyQuery.data.notes ?? '',
      });
    }
  }, [form, propertyQuery.data, open]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const errors = form.formState.errors;

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = propertySchema.parse(values);
    try {
      if (isEdit && propertyId) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'تعذر حفظ العقار. تحقق من الصلاحيات ثم أعد المحاولة.');
    }
  });

  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={isEdit ? 'تعديل عقار' : 'إضافة عقار جديد'}
      className="max-w-2xl"
    >
      {isEdit && propertyQuery.isLoading ? (
        <RouteLoadingState />
      ) : (
        <form className="grid gap-4 md:grid-cols-2" noValidate onSubmit={handleSubmit}>
          {submitError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-bold text-destructive md:col-span-2" role="alert">{submitError}</div>
          ) : null}
          <label className="grid gap-2 text-sm font-bold">
            اسم العقار
            <Input hasError={Boolean(errors.title)} aria-describedby={errors.title ? 'property-title-error' : undefined} {...form.register('title')} placeholder="مثال: عمارة الندى" autoFocus />
            {fieldError('property-title-error', errors.title?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            نوع العقار
            <Input hasError={Boolean(errors.type)} aria-describedby={errors.type ? 'property-type-error' : undefined} {...form.register('type')} placeholder="سكني، تجاري، أرض..." />
            {fieldError('property-type-error', errors.type?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            العنوان
            <Input hasError={Boolean(errors.address)} aria-describedby={errors.address ? 'property-address-error' : undefined} {...form.register('address')} placeholder="المدينة، الحي، الشارع" />
            {fieldError('property-address-error', errors.address?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            اسم المالك للعرض
            <Input {...form.register('owner_name')} placeholder="اسم عرض اختياري" />
            <p className="text-xs font-medium text-muted-foreground">حقل نصي خفيف للعرض فقط.</p>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            الحالة
            <Select hasError={Boolean(errors.status)} aria-describedby={errors.status ? 'property-status-error' : undefined} {...form.register('status')}>
              {propertyStatusValues.map((status) => (
                <option key={status} value={status}>{propertyStatusLabels[status]}</option>
              ))}
            </Select>
            {fieldError('property-status-error', errors.status?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            قيمة الشراء
            <Input hasError={Boolean(errors.purchase_value)} aria-describedby={errors.purchase_value ? 'property-purchase-error' : undefined} type="number" step="0.01" min="0" {...form.register('purchase_value')} />
            {fieldError('property-purchase-error', errors.purchase_value?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            القيمة الحالية
            <Input hasError={Boolean(errors.current_value)} aria-describedby={errors.current_value ? 'property-current-error' : undefined} type="number" step="0.01" min="0" {...form.register('current_value')} />
            {fieldError('property-current-error', errors.current_value?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            ملاحظات
            <Textarea {...form.register('notes')} placeholder="أي تفاصيل إضافية" />
          </label>
          <div className="safe-bottom-overlay -mx-4 flex flex-col-reverse gap-3 border-t border-border/60 px-4 pt-4 sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:px-0 sm:pb-0 md:col-span-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>إلغاء</Button>
            <Button type="submit" isLoading={isSubmitting}>حفظ</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
