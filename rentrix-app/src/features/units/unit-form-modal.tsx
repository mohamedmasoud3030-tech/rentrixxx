import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveFormOverlay } from '@/components/ui/responsive-form-overlay';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Unit } from '@/types/domain';
import { unitSchema, unitStatusLabels, unitStatusValues, type UnitFormValues } from './unit-schema';
import { useCreateUnit, useUpdateUnit } from './use-units';

type UnitFormModalProps = {
  propertyId: string;
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function fieldError(message?: string) {
  return message ? <p className="text-xs font-bold text-destructive">{message}</p> : null;
}

export function UnitFormModal({ propertyId, unit, open, onOpenChange }: UnitFormModalProps) {
  const createMutation = useCreateUnit(propertyId);
  const updateMutation = useUpdateUnit(propertyId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unit_number: '',
      floor: '',
      status: 'available',
      rent_amount: null,
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      form.reset({
        unit_number: unit?.unit_number ?? '',
        floor: unit?.floor ?? '',
        status: unit?.status ?? 'available',
        rent_amount: unit?.rent_amount ?? null,
        notes: unit?.notes ?? '',
      });
    }
  }, [form, open, unit]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={unit ? 'تعديل وحدة' : 'إضافة وحدة'}
      description="الوحدات مرتبطة بالعقار الحالي وتُحذف أرشيفياً عند الإزالة."
      className="max-w-2xl"
    >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            setSubmitError(null);
            const payload = unitSchema.parse(values);
            try {
              if (unit) {
                await updateMutation.mutateAsync({ unitId: unit.id, payload });
              } else {
                await createMutation.mutateAsync(payload);
              }
              onOpenChange(false);
            } catch (error) {
              setSubmitError(error instanceof Error ? error.message : 'تعذر حفظ الوحدة. تحقق من الصلاحيات ثم أعد المحاولة.');
            }
          })}
        >
          {submitError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-bold text-destructive md:col-span-2" role="alert">{submitError}</div>
          ) : null}
          <label className="grid gap-2 text-sm font-bold">
            رقم الوحدة
            <Input {...form.register('unit_number')} />
            {fieldError(form.formState.errors.unit_number?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            الدور
            <Input {...form.register('floor')} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            الحالة
            <Select {...form.register('status')}>
              {unitStatusValues.map((status) => <option key={status} value={status}>{unitStatusLabels[status]}</option>)}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            قيمة الإيجار
            <Input type="number" step="0.01" min="0" {...form.register('rent_amount')} />
            {fieldError(form.formState.errors.rent_amount?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            ملاحظات
            <Textarea {...form.register('notes')} />
          </label>
          <div className="safe-bottom-overlay -mx-4 flex flex-col-reverse gap-3 border-t border-border/60 px-4 pt-4 sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:px-0 sm:pb-0 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جار الحفظ...' : 'حفظ الوحدة'}</Button>
          </div>
        </form>
    </ResponsiveFormOverlay>
  );
}
