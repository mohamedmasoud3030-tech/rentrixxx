import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { DataErrorScreen } from '@/components/data-error-screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { updateCurrentUserPassword } from './change-password-service';

const MIN_PASSWORD_LENGTH = 8;

export type ChangePasswordFormState = Readonly<{
  password: string;
  confirmPassword: string;
}>;

export function validateChangePasswordForm(form: ChangePasswordFormState): string | null {
  if (form.password.length < MIN_PASSWORD_LENGTH) return 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.';
  if (form.password !== form.confirmPassword) return 'تأكيد كلمة المرور غير مطابق.';
  return null;
}

export function ChangePasswordPage() {
  const [form, setForm] = useState<ChangePasswordFormState>({ password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<unknown>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSucceeded(false);
    setServiceError(null);

    const nextValidationError = validateChangePasswordForm(form);
    setValidationError(nextValidationError);
    if (nextValidationError) return;

    setIsSubmitting(true);
    const result = await updateCurrentUserPassword(supabase, form.password);
    setIsSubmitting(false);

    if (!result.ok) {
      setServiceError(result.error);
      return;
    }

    setForm({ password: '', confirmPassword: '' });
    setSucceeded(true);
  };

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl"><KeyRound className="size-6 text-primary" />تغيير كلمة المرور</CardTitle>
          <CardDescription>يتم تحديث كلمة مرور المستخدم الحالي فقط عبر جلسة Supabase الحالية.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm font-bold">
              <span>كلمة المرور الجديدة</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <label className="block space-y-2 text-sm font-bold">
              <span>تأكيد كلمة المرور</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              />
            </label>
            {validationError ? <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive" role="alert">{validationError}</p> : null}
            {succeeded ? <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-700" role="status">تم تحديث كلمة المرور بنجاح.</p> : null}
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جارٍ الحفظ...' : 'تحديث كلمة المرور'}</Button>
          </form>
        </CardContent>
      </Card>
      {serviceError ? <DataErrorScreen title="فشل تحديث كلمة المرور" fallbackMessage="تحقق من الجلسة الحالية وحاول مرة أخرى." error={serviceError} /> : null}
    </section>
  );
}
