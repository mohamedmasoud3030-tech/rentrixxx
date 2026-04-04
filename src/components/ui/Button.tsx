import React from 'react';

type ButtonSemanticVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
type ButtonLegacyVariant = 'ghost' | 'gradient' | 'danger';
type ButtonVariant = ButtonSemanticVariant | ButtonLegacyVariant;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const baseClasses = [
  'inline-flex items-center justify-center gap-2',
  'min-h-[42px] px-4 sm:px-5 py-2.5',
  'rounded-[var(--rx-radius-md,var(--radius))]',
  'border',
  'text-sm font-semibold leading-none',
  'whitespace-nowrap',
  'transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'focus-visible:ring-offset-[var(--rx-bg,hsl(var(--color-bg)))]',
  'active:translate-y-px',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
].join(' ');

const semanticVariantClasses: Record<ButtonSemanticVariant, string> = {
  primary: [
    'bg-[var(--rx-primary,hsl(var(--color-primary)))]',
    'text-[var(--rx-on-primary,hsl(var(--color-primary-fg)))]',
    'border-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_72%,var(--rx-border,hsl(var(--color-border)))_28%)]',
    'hover:bg-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_88%,var(--rx-surface,hsl(var(--color-card)))_12%)]',
    'active:bg-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_82%,var(--rx-surface,hsl(var(--color-card)))_18%)]',
    'focus-visible:ring-[var(--rx-primary,hsl(var(--color-primary)))]',
    'shadow-[0_2px_8px_-1px_color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_40%,transparent)]',
    'hover:shadow-[0_4px_14px_-2px_color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_48%,transparent)]',
  ].join(' '),
  secondary: [
    'bg-[var(--rx-surface,hsl(var(--color-card)))]',
    'text-[var(--rx-text,hsl(var(--color-text-primary)))]',
    'border-[var(--rx-border,hsl(var(--color-border)))]',
    'hover:bg-[color-mix(in_srgb,var(--rx-surface,hsl(var(--color-card)))_86%,var(--rx-border,hsl(var(--color-border)))_14%)]',
    'active:bg-[color-mix(in_srgb,var(--rx-surface,hsl(var(--color-card)))_80%,var(--rx-border,hsl(var(--color-border)))_20%)]',
    'focus-visible:ring-[var(--rx-primary,hsl(var(--color-primary)))]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
  ].join(' '),
  success: [
    'bg-[var(--rx-badge-success-bg,hsl(var(--color-success-bg)))]',
    'text-[var(--rx-badge-success-text,hsl(var(--color-success-text)))]',
    'border-[color-mix(in_srgb,var(--rx-badge-success-text,hsl(var(--color-success-text)))_22%,transparent)]',
    'hover:bg-[color-mix(in_srgb,var(--rx-badge-success-bg,hsl(var(--color-success-bg)))_88%,var(--rx-surface,hsl(var(--color-card)))_12%)]',
    'active:bg-[color-mix(in_srgb,var(--rx-badge-success-bg,hsl(var(--color-success-bg)))_82%,var(--rx-surface,hsl(var(--color-card)))_18%)]',
    'focus-visible:ring-[var(--rx-badge-success-text,hsl(var(--color-success-text)))]',
  ].join(' '),
  warning: [
    'bg-[var(--rx-badge-warning-bg,hsl(var(--color-warning-bg)))]',
    'text-[var(--rx-badge-warning-text,hsl(var(--color-warning-text)))]',
    'border-[color-mix(in_srgb,var(--rx-badge-warning-text,hsl(var(--color-warning-text)))_24%,transparent)]',
    'hover:bg-[color-mix(in_srgb,var(--rx-badge-warning-bg,hsl(var(--color-warning-bg)))_88%,var(--rx-surface,hsl(var(--color-card)))_12%)]',
    'active:bg-[color-mix(in_srgb,var(--rx-badge-warning-bg,hsl(var(--color-warning-bg)))_82%,var(--rx-surface,hsl(var(--color-card)))_18%)]',
    'focus-visible:ring-[var(--rx-badge-warning-text,hsl(var(--color-warning-text)))]',
  ].join(' '),
  error: [
    'bg-[var(--rx-badge-danger-bg,hsl(var(--color-danger-bg)))]',
    'text-[var(--rx-badge-danger-text,hsl(var(--color-danger-text)))]',
    'border-[color-mix(in_srgb,var(--rx-badge-danger-text,hsl(var(--color-danger-text)))_24%,transparent)]',
    'hover:bg-[color-mix(in_srgb,var(--rx-badge-danger-bg,hsl(var(--color-danger-bg)))_86%,var(--rx-surface,hsl(var(--color-card)))_14%)]',
    'active:bg-[color-mix(in_srgb,var(--rx-badge-danger-bg,hsl(var(--color-danger-bg)))_80%,var(--rx-surface,hsl(var(--color-card)))_20%)]',
    'focus-visible:ring-[var(--rx-badge-danger-text,hsl(var(--color-danger-text)))]',
  ].join(' '),
  neutral: [
    'bg-[color-mix(in_srgb,var(--rx-border,hsl(var(--color-border)))_18%,var(--rx-surface,hsl(var(--color-card)))_82%)]',
    'text-[var(--rx-text-muted,hsl(var(--color-text-muted)))]',
    'border-[color-mix(in_srgb,var(--rx-border,hsl(var(--color-border)))_68%,var(--rx-surface,hsl(var(--color-card)))_32%)]',
    'hover:bg-[color-mix(in_srgb,var(--rx-border,hsl(var(--color-border)))_24%,var(--rx-surface,hsl(var(--color-card)))_76%)]',
    'active:bg-[color-mix(in_srgb,var(--rx-border,hsl(var(--color-border)))_30%,var(--rx-surface,hsl(var(--color-card)))_70%)]',
    'focus-visible:ring-[var(--rx-primary,hsl(var(--color-primary)))]',
  ].join(' '),
};

const legacyVariantMap: Record<ButtonLegacyVariant, ButtonSemanticVariant> = {
  danger: 'error',
  ghost: 'neutral',
  gradient: 'primary',
};

const Spinner: React.FC = () => (
  <span
    aria-hidden="true"
    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
  />
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      type = 'button',
      variant = 'primary',
      className = '',
      disabled = false,
      loading = false,
      fullWidth = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const semanticVariant = (legacyVariantMap[variant as ButtonLegacyVariant] ?? variant) as ButtonSemanticVariant;

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-variant={semanticVariant}
        className={[
          baseClasses,
          semanticVariantClasses[semanticVariant],
          variant === 'gradient' ? 'rx-gradient-btn border-transparent hover:shadow-lg active:scale-95' : '',
          variant === 'ghost' ? 'bg-transparent border-transparent hover:text-[var(--rx-text,hsl(var(--color-text-primary)))]' : '',
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
