import { Button } from '@/components/ui/button';

export function FormActions({ submitLabel, isSubmitting, onSubmit }: { submitLabel: string; isSubmitting?: boolean; onSubmit: () => void }) {
  return <Button isLoading={isSubmitting} onClick={onSubmit}>{submitLabel}</Button>;
}
