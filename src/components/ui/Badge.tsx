import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--rx-badge-default-bg,hsl(var(--color-default-bg)))] text-[var(--rx-badge-default-text,hsl(var(--color-default-text)))] border-[color-mix(in_srgb,var(--rx-badge-default-text,hsl(var(--color-default-text)))_22%,transparent)]',
  success: 'bg-[var(--rx-badge-success-bg,hsl(var(--color-success-bg)))] text-[var(--rx-badge-success-text,hsl(var(--color-success-text)))] border-[color-mix(in_srgb,var(--rx-badge-success-text,hsl(var(--color-success-text)))_26%,transparent)]',
  warning: 'bg-[var(--rx-badge-warning-bg,hsl(var(--color-warning-bg)))] text-[var(--rx-badge-warning-text,hsl(var(--color-warning-text)))] border-[color-mix(in_srgb,var(--rx-badge-warning-text,hsl(var(--color-warning-text)))_26%,transparent)]',
  danger: 'bg-[var(--rx-badge-danger-bg,hsl(var(--color-danger-bg)))] text-[var(--rx-badge-danger-text,hsl(var(--color-danger-text)))] border-[color-mix(in_srgb,var(--rx-badge-danger-text,hsl(var(--color-danger-text)))_28%,transparent)]',
  info: 'bg-[var(--rx-badge-info-bg,hsl(var(--color-info-bg)))] text-[var(--rx-badge-info-text,hsl(var(--color-info-text)))] border-[color-mix(in_srgb,var(--rx-badge-info-text,hsl(var(--color-info-text)))_24%,transparent)]',
};

const Badge: React.FC<BadgeProps> = ({ variant = 'default', className = '', children, ...props }) => (
  <span
    {...props}
    className={[
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold leading-none',
      variantClasses[variant],
      className,
    ].join(' ')}
  >
    {children}
  </span>
);

export default Badge;
