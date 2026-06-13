import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Property } from '@/types/domain';
import { propertySchema, propertyStatusLabels, propertyStatusValues, type PropertyFormValues } from './property-schema';
import { useCreateProperty, useUpdateProperty } from './use-properties';

type PropertyFormModalProps = {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function fieldError(message?: string) {
  return message ? <p className="text-xs font-bold text-destructive">{message}</p> : null;
}

export function PropertyFormModal({ property, open, onOpenChange }: PropertyFormModalProps) {
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty(property?.id ?? '');
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
    if (open) {
      form.reset({
        title: property?.title ?? '',
        type: property?.type ?? '',
        address: property?.address ?? '',
        owner_name: property?.owner_name ?? '',
        purchase_value: property?.purchase_value ?? null,
        current_value: property?.current_value ?? null,
        status: property?.status ?? 'active',
        notes: property?.notes ?? '',
      });
    }
  }, [form, open, property]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{property ? 'تعديل عقار' : 'إضافة عقار جديد'}</DialogTitle>
          <DialogDescription>أدخل بيانات العقار الأساسية. اسم المالك هنا للعرض الخفيف فقط وليس ربط ملكية أو حسابات ملاك.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            const payload = propertySchema.parse(values);
            if (property) {
              await updateMutation.mutateAsync(payload);
            } else {
              await createMutation.mutateAsync(payload);
            }
            onOpenChange(false);
          })}
        >
          <label className="grid gap-2 text-sm font-bold">
            اسم العقار
            <Input {...form.register('title')} placeholder="مثال: عمارة الندى" />
            {fieldError(form.formState.errors.title?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            نوع العقار
            <Input {...form.register('type')} placeholder="سكني، تجاري، أرض..." />
            {fieldError(form.formState.errors.type?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            العنوان
            <Input {...form.register('address')} placeholder="المدينة، الحي، الشارع" />
            {fieldError(form.formState.errors.address?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            اسم المالك للعرض
            <Input {...form.register('owner_name')} placeholder="اسم عرض اختياري يظهر في قائمة وتفاصيل العقار" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            الحالة
            <Select {...form.register('status')}>
              {propertyStatusValues.map((status) => <option key={status} value={status}>{propertyStatusLabels[status]}</option>)}
            </Select>
            {fieldError(form.formState.errors.status?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            قيمة الشراء
            <Input type="number" step="0.01" min="0" {...form.register('purchase_value')} />
            {fieldError(form.formState.errors.purchase_value?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            القيمة الحالية
            <Input type="number" step="0.01" min="0" {...form.register('current_value')} />
            {fieldError(form.formState.errors.current_value?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            ملاحظات
            <Textarea {...form.register('notes')} placeholder="أي تفاصيل إضافية" />
          </label>
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جار الحفظ...' : 'حفظ'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
