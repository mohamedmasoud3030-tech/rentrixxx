import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { personSchema, personTypeLabels, personTypeValues, type PersonFormValues } from './person-schema';
import { useCreatePerson, usePerson, useUpdatePerson } from './use-people';

function fieldError(id: string, message?: string) {
  return message ? <p id={id} className="text-xs font-bold text-destructive">{message}</p> : null;
}

interface PersonFormModalProps {
  open: boolean;
  onClose: () => void;
  personId?: string;
  defaultType?: 'tenant' | 'owner' | 'contact';
}

export function PersonFormModal({ open, onClose, personId, defaultType = 'tenant' }: PersonFormModalProps) {
  const isEdit = Boolean(personId);
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
      type: defaultType,
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ full_name: '', phone: '', email: '', national_id: '', type: defaultType, address: '', notes: '' });
      setSubmitError(null);
      return;
    }
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
  }, [form, personQuery.data, open, defaultType]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const errors = form.formState.errors;

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = personSchema.parse(values);
    try {
      if (isEdit && personId) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'تعذر حفظ بيانات الشخص. تحقق من الصلاحيات وحاول مرة أخرى.');
    }
  });

  const title = isEdit ? 'تعديل شخص' : (defaultType === 'owner' ? 'إضافة مالك' : 'إضافة شخص');

  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={title}
      className="max-w-2xl"
    >
      {isEdit && personQuery.isLoading ? (
        <RouteLoadingState />
      ) : (
        <form className="grid gap-4 md:grid-cols-2" noValidate onSubmit={handleSubmit}>
          {submitError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive md:col-span-2" role="alert">{submitError}</div> : null}
          <label className="grid gap-2 text-sm font-bold">
            الاسم الكامل
            <Input hasError={Boolean(errors.full_name)} aria-describedby={errors.full_name ? 'person-name-error' : undefined} {...form.register('full_name')} autoFocus />
            {fieldError('person-name-error', errors.full_name?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            النوع
            <Select hasError={Boolean(errors.type)} aria-describedby={errors.type ? 'person-type-error' : undefined} {...form.register('type')}>
              {personTypeValues.map((type) => (
                <option key={type} value={type}>{personTypeLabels[type]}</option>
              ))}
            </Select>
            {fieldError('person-type-error', errors.type?.message)}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            الهاتف
            <Input {...form.register('phone')} dir="ltr" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            البريد الإلكتروني
            <Input hasError={Boolean(errors.email)} aria-describedby={errors.email ? 'person-email-error' : undefined} {...form.register('email')} dir="ltr" />
            {fieldError('person-email-error', errors.email?.message)}
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
          <div className="safe-bottom-overlay -mx-4 flex flex-col-reverse gap-3 border-t border-border/60 px-4 pt-4 sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:px-0 sm:pb-0 md:col-span-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>إلغاء</Button>
            <Button type="submit" isLoading={isSubmitting}>حفظ</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
