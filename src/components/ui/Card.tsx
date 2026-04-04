import React from 'react';

type CardVariant = 'default' | 'elevated' | 'bordered' | 'accent';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  default: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[var(--rx-border-subtle,var(--rx-border,hsl(var(--color-border))))]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
  ].join(' '),
  elevated: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[var(--rx-border-subtle,var(--rx-border,hsl(var(--color-border))))]',
    'shadow-[var(--rx-shadow-card-hover,var(--shadow-card-hover))]',
  ].join(' '),
  bordered: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[var(--rx-border,hsl(var(--color-border)))]',
    'shadow-none',
  ].join(' '),
  accent: [
    'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
    'border-[var(--rx-border-subtle,var(--rx-border,hsl(var(--color-border))))]',
    'shadow-[var(--rx-shadow-card,var(--shadow-card))]',
    'border-s-4 border-s-[var(--rx-primary,hsl(var(--color-primary)))]',
  ].join(' '),
};

const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default' }) => {
  return (
    <div
      className={[
        'rounded-xl border p-4 sm:p-5 md:p-6 text-[var(--rx-text-primary,hsl(var(--color-text-primary)))] transition-shadow duration-200',
        variantClasses[variant],
        'hover:[box-shadow:var(--rx-shadow-card-hover,var(--shadow-card-hover))]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
};

export default Card;
