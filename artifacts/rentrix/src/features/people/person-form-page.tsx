import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams, useRouter } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { personSchema, personTypeLabels, personTypeValues, type PersonFormValues } from './person-schema';
import { useCreatePerson, usePerson, useUpdatePerson } from './use-people';

function fieldError(message?: string) {
  return message ? <p className="text-xs font-bold text-destructive">{message}</p> : null;
}

export function PersonFormPage() {
  const params = useParams({ strict: false });
  const personId = typeof params.personId === 'string' ? params.personId : undefined;
  const isEdit = Boolean(personId);
  const router = useRouter();
  const personQuery = usePerson(personId ?? '');
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson(personId ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      national_id: '',
      type: 'tenant',
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (personQuery.data) {
      form.reset({
        full_name: personQuery.data.full_name,
        phone: personQuery.data.phone ?? '',
        email: personQuery.data.email ?? '',
        national_id: personQuery.data.national_id ?? '',
        type: personQuery.data.type,
        address: personQuery.data.address ?? '',
        notes: personQuery.data.notes ?? '',
      });
    }
  }, [form, personQuery.data]);

  if (isEdit && personQuery.isLoading) return <RouteLoadingState />;

  if (isEdit && personQuery.isError) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader><CardTitle>تعذر تحميل بيانات الشخص</CardTitle><CardDescription>{personQuery.error instanceof Error ? personQuery.error.message : 'حدث خطأ أثناء التحميل.'}</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-3"><Button type="button" onClick={() => { void personQuery.refetch(); }}>إعادة المحاولة</Button><Button variant="secondary" asChild><Link to="/people">العودة</Link></Button></CardContent>
      </Card>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{isEdit ? 'تعديل شخص' : 'إضافة شخص'}</CardTitle>
          <CardDescription>الجدول موحد للمستأجرين والملاك وجهات الاتصال.</CardDescription>
        </div>
        <Button variant="secondary" asChild><Link to="/people"><ArrowRight className="ml-2 size-4" />العودة</Link></Button>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-5 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            setSubmitError(null);
            const payload = personSchema.parse(values);
            try {
              if (isEdit && personId) {
                await updateMutation.mutateAsync(payload);
              } else {
                await createMutation.mutateAsync(payload);
              }
              await router.navigate({ to: '/people' });
            } catch (error) {
              setSubmitError(error instanceof Error ? error.message : 'تعذر حفظ بيانات الشخص. تحقق من الصلاحيات وحاول مرة أخرى.');
            }
          })}
        >
          {submitError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive md:col-span-2" role="alert">{submitError}</div> : null}
          <label className="grid gap-2 text-sm font-bold">
            الاسم الكامل
            <Input {...form.register('full_name')} />
            {fieldError(form.formState.errors.full_name?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            النوع
            <Select {...form.register('type')}>
              {personTypeValues.map((type) => <option key={type} value={type}>{personTypeLabels[type]}</option>)}
            </Select>
            {fieldError(form.formState.errors.type?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            الهاتف
            <Input {...form.register('phone')} dir="ltr" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            البريد الإلكتروني
            <Input {...form.register('email')} dir="ltr" />
            {fieldError(form.formState.errors.email?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            رقم الهوية
            <Input {...form.register('national_id')} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            العنوان
            <Input {...form.register('address')} />
          </label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            ملاحظات
            <Textarea {...form.register('notes')} />
          </label>
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button variant="secondary" asChild><Link to="/people">إلغاء</Link></Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جار الحفظ...' : 'حفظ'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
