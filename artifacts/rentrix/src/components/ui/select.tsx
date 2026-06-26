import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, hasError = false, 'aria-invalid': ariaInvalid, ...props }, ref) => {
  const isInvalid = hasError || ariaInvalid === true || ariaInvalid === 'true';

  return (
    <select
      ref={ref}
      aria-invalid={isInvalid || undefined}
      className={cn(
        'flex min-h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:text-sm',
        isInvalid && 'border-destructive focus:border-destructive focus:ring-destructive/10',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = 'Select';
