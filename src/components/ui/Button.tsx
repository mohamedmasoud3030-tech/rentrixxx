import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gradient';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--rx-primary,hsl(var(--color-primary)))]',
    'text-[var(--rx-on-primary,hsl(var(--color-primary-fg)))]',
    'border-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_70%,var(--rx-border,hsl(var(--color-border)))_30%)]',
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
  ghost: [
    'bg-transparent',
    'text-[var(--rx-text-muted,hsl(var(--color-text-muted)))]',
    'border-transparent',
    'hover:bg-[color-mix(in_srgb,var(--rx-text,hsl(var(--color-text-primary)))_8%,transparent)]',
    'hover:text-[var(--rx-text,hsl(var(--color-text-primary)))]',
    'active:bg-[color-mix(in_srgb,var(--rx-text,hsl(var(--color-text-primary)))_14%,transparent)]',
    'focus-visible:ring-[var(--rx-primary,hsl(var(--color-primary)))]',
  ].join(' '),
  gradient: [
    'rx-gradient-btn',
    'text-[var(--rx-on-primary,hsl(var(--color-primary-fg)))]',
    'border-transparent',
    'focus-visible:ring-[var(--rx-primary,hsl(var(--color-primary)))]',
    'hover:shadow-lg',
    'active:scale-95',
  ].join(' '),
};

const baseClasses = [
  'inline-flex items-center justify-center gap-2',
  'min-h-[42px] px-4 sm:px-5 py-2.5',
  'rounded-[var(--rx-radius-md,var(--radius))]',
  'border',
  'text-sm font-bold leading-none',
  'whitespace-nowrap',
  'transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'focus-visible:ring-offset-[var(--rx-bg,hsl(var(--color-bg)))]',
  'active:translate-y-px',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
].join(' ');

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

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          baseClasses,
          variantClasses[variant],
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
