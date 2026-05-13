import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams, useRouter } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RouteLoadingState } from '@/components/loading-state';
import { propertySchema, propertyStatusLabels, propertyStatusValues, type PropertyFormValues } from './property-schema';
import { useCreateProperty, useProperty, useUpdateProperty } from './use-properties';

function fieldError(message?: string) {
  return message ? <p className="text-xs font-bold text-destructive">{message}</p> : null;
}

export function PropertyFormPage() {
  const params = useParams({ strict: false });
  const propertyId = typeof params.propertyId === 'string' ? params.propertyId : undefined;
  const isEdit = Boolean(propertyId);
  const router = useRouter();
  const propertyQuery = useProperty(propertyId ?? '');
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty(propertyId ?? '');
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
  }, [form, propertyQuery.data]);

  if (isEdit && propertyQuery.isLoading) return <RouteLoadingState />;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{isEdit ? 'تعديل عقار' : 'إضافة عقار جديد'}</CardTitle>
          <CardDescription>أدخل بيانات العقار الأساسية. الحذف لاحقاً يكون حذفاً أرشيفياً فقط.</CardDescription>
        </div>
        <Button variant="secondary" asChild><Link to="/properties"><ArrowRight className="ml-2 size-4" />العودة</Link></Button>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-5 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            const payload = propertySchema.parse(values);
            if (isEdit && propertyId) {
              await updateMutation.mutateAsync(payload);
            } else {
              await createMutation.mutateAsync(payload);
            }
            await router.navigate({ to: '/properties' });
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
            اسم المالك
            <Input {...form.register('owner_name')} placeholder="اختياري" />
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
            <Button variant="secondary" asChild><Link to="/properties">إلغاء</Link></Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جار الحفظ...' : 'حفظ'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
