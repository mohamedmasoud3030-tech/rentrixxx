import React from 'react';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const baseClasses = [
  'inline-flex items-center justify-center',
  'max-w-full',
  'px-2.5 py-1',
  'rounded-[var(--rx-radius-pill,999px)]',
  'border',
  'text-xs font-semibold leading-5',
  'tracking-[0.01em]',
  'whitespace-nowrap',
  'align-middle',
  'select-none',
].join(' ');

const variantClasses: Record<BadgeVariant, string> = {
  primary: [
    'bg-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_18%,var(--rx-surface,hsl(var(--color-card)))_82%)]',
    'text-[var(--rx-primary,hsl(var(--color-primary)))]',
    'border-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_45%,var(--rx-border,hsl(var(--color-border)))_55%)]',
  ].join(' '),
  secondary: [
    'bg-[color-mix(in_srgb,var(--rx-surface,hsl(var(--color-card)))_65%,var(--rx-border,hsl(var(--color-border)))_35%)]',
    'text-[hsl(var(--rx-color-on-surface,var(--color-text-primary)))]',
    'border-[var(--rx-border,hsl(var(--color-border)))]',
  ].join(' '),
  success: [
    'bg-[color-mix(in_srgb,var(--rx-success,hsl(var(--color-success-text)))_18%,var(--rx-surface,hsl(var(--color-card)))_82%)]',
    'text-[var(--rx-success,hsl(var(--color-success-text)))]',
    'border-[color-mix(in_srgb,var(--rx-success,hsl(var(--color-success-text)))_45%,var(--rx-border,hsl(var(--color-border)))_55%)]',
  ].join(' '),
  warning: [
    'bg-[color-mix(in_srgb,hsl(var(--rx-color-warning-text,var(--color-warning-text)))_14%,var(--rx-surface,hsl(var(--color-card)))_86%)]',
    'text-[hsl(var(--rx-color-warning-text,var(--color-warning-text)))]',
    'border-[color-mix(in_srgb,hsl(var(--rx-color-warning-text,var(--color-warning-text)))_42%,var(--rx-border,hsl(var(--color-border)))_58%)]',
  ].join(' '),
  error: [
    'bg-[color-mix(in_srgb,var(--rx-error,hsl(var(--color-danger-text)))_18%,var(--rx-surface,hsl(var(--color-card)))_82%)]',
    'text-[var(--rx-error,hsl(var(--color-danger-text)))]',
    'border-[color-mix(in_srgb,var(--rx-error,hsl(var(--color-danger-text)))_45%,var(--rx-border,hsl(var(--color-border)))_55%)]',
  ].join(' '),
  neutral: [
    'bg-[color-mix(in_srgb,var(--rx-border,hsl(var(--color-border)))_22%,var(--rx-surface,hsl(var(--color-card)))_78%)]',
    'text-[hsl(var(--rx-color-on-surface-variant,var(--color-text-muted)))]',
    'border-[color-mix(in_srgb,var(--rx-border,hsl(var(--color-border)))_72%,var(--rx-surface,hsl(var(--color-card)))_28%)]',
  ].join(' '),
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', className = '', children, ...props }, ref) => (
    <span
      {...props}
      ref={ref}
      data-variant={variant}
      className={[baseClasses, variantClasses[variant], className].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';

export default Badge;
