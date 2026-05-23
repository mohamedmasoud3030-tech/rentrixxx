import { Button } from '@/components/ui/button';

export function FormActions({ submitLabel, isSubmitting, onSubmit }: Readonly<{ submitLabel: string; isSubmitting?: boolean; onSubmit: () => void }>) {
  return <Button onClick={onSubmit} disabled={isSubmitting}>{submitLabel}</Button>;
}
