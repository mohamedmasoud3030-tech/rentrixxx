import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Titled grouping for form fields with consistent spacing. Use inside a
 * `<form>` to break long forms (contracts, properties, settings…) into
 * labeled sections instead of one flat field grid.
 *
 * @example
 * <FormSection title="بيانات العقد" description="الحقول الأساسية للعقد">
 *   <div className="grid gap-5 md:grid-cols-2">…fields…</div>
 * </FormSection>
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && <h2 className="text-sm font-black">{title}</h2>}
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
