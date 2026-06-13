import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveFormOverlay } from '@/components/ui/responsive-form-overlay';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { personSchema, personTypeLabels, personTypeValues, type PersonFormValues } from './person-schema';
import { useCreatePerson, usePerson, useUpdatePerson } from './use-people';

function fieldError(message?: string) {
  return message ? <p className="text-xs font-bold text-destructive">{message}</p> : null;
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

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = personSchema.parse(values);
    if (isEdit && personId) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  });

  const title = isEdit ? 'تعديل شخص' : (defaultType === 'owner' ? 'إضافة مالك' : 'إضافة شخص');

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={(v) => { if (!v) onClose(); }}
      title={title}
      className="max-h-[90dvh] overflow-y-auto"
    >
        {isEdit && personQuery.isLoading ? (
          <RouteLoadingState />
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold">
              الاسم الكامل
              <Input {...form.register('full_name')} autoFocus />
              {fieldError(form.formState.errors.full_name?.message)}
            </label>
            <label className="grid gap-2 text-sm font-bold">
              النوع
              <Select {...form.register('type')}>
                {personTypeValues.map((type) => (
                  <option key={type} value={type}>{personTypeLabels[type]}</option>
                ))}
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
              <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'جار الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </form>
        )}
    </ResponsiveFormOverlay>
  );
}
