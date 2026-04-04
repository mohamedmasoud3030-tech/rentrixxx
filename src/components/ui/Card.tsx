import React from 'react';

type CardSemanticVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
type CardLegacyVariant = 'default' | 'elevated' | 'bordered' | 'accent';
type CardVariant = CardSemanticVariant | CardLegacyVariant;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
}

const baseClasses = [
  'rounded-[var(--rx-radius-md,var(--radius))]',
  'border',
  'p-4 sm:p-5 md:p-6',
  'text-sm leading-6 text-[var(--rx-text-primary,hsl(var(--color-text-primary)))]',
  'transition-all duration-200',
  'focus-within:outline-none focus-within:ring-2',
  'focus-within:ring-[var(--rx-primary,hsl(var(--color-primary)))]',
  'focus-within:ring-offset-2 focus-within:ring-offset-[var(--rx-bg,hsl(var(--color-bg)))]',
].join(' ');

const semanticVariantClasses: Record<CardSemanticVariant, string> = {
  primary: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_36%,var(--rx-border,hsl(var(--color-border)))_64%)]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
    'hover:[box-shadow:var(--rx-shadow-card-hover,var(--shadow-card-hover))]',
  ].join(' '),
  secondary: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[var(--rx-border,hsl(var(--color-border)))]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
    'hover:[box-shadow:var(--rx-shadow-card-hover,var(--shadow-card-hover))]',
  ].join(' '),
  success: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[color-mix(in_srgb,var(--rx-badge-success-text,hsl(var(--color-success-text)))_38%,var(--rx-border,hsl(var(--color-border)))_62%)]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
    'hover:[box-shadow:var(--rx-shadow-card-hover,var(--shadow-card-hover))]',
  ].join(' '),
  warning: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[color-mix(in_srgb,var(--rx-badge-warning-text,hsl(var(--color-warning-text)))_38%,var(--rx-border,hsl(var(--color-border)))_62%)]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
    'hover:[box-shadow:var(--rx-shadow-card-hover,var(--shadow-card-hover))]',
  ].join(' '),
  error: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[color-mix(in_srgb,var(--rx-badge-danger-text,hsl(var(--color-danger-text)))_40%,var(--rx-border,hsl(var(--color-border)))_60%)]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
    'hover:[box-shadow:var(--rx-shadow-card-hover,var(--shadow-card-hover))]',
  ].join(' '),
  neutral: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[var(--rx-border-subtle,var(--rx-border,hsl(var(--color-border))))]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
    'hover:[box-shadow:var(--rx-shadow-card-hover,var(--shadow-card-hover))]',
  ].join(' '),
};

const legacyVariantMap: Record<CardLegacyVariant, CardSemanticVariant> = {
  default: 'neutral',
  elevated: 'secondary',
  bordered: 'secondary',
  accent: 'primary',
};

const Card: React.FC<CardProps> = ({ children, className = '', variant = 'neutral', ...props }) => {
  const semanticVariant = (legacyVariantMap[variant as CardLegacyVariant] ?? variant) as CardSemanticVariant;

  return (
    <div
      {...props}
      data-variant={semanticVariant}
      className={[baseClasses, semanticVariantClasses[semanticVariant], className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
};

export default Card;
