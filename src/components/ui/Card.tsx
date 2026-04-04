import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accentClassName?: string;
  accent?: boolean;
  accentWidth?: string;
  accentColor?: string;
  elevated?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  accentClassName,
  accent = false,
  accentWidth = '0.25rem',
  accentColor = 'var(--rx-border-accent, var(--rx-primary, hsl(var(--color-primary))))',
  elevated = false,
}) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--rx-surface-card, var(--rx-surface-1, hsl(var(--color-card))))',
    borderColor: 'var(--rx-border-subtle, var(--rx-border, hsl(var(--color-border))))',
    color: 'var(--rx-text-primary, var(--rx-on-surface, hsl(var(--color-text))))',
    boxShadow: elevated
      ? 'var(--rx-shadow-card-hover, var(--rx-shadow-card, var(--shadow-card-hover)))'
      : 'var(--rx-shadow-card, var(--shadow-card))',
    borderInlineStart: accent ? `${accentWidth} solid ${accentColor}` : undefined,
  };

  return (
    <div
      style={cardStyle}
      className={`rounded-xl border p-4 sm:p-5 md:p-6 transition-shadow duration-200 ${
        elevated
          ? 'hover:[box-shadow:var(--rx-shadow-card-hover,var(--shadow-card-hover))]'
          : 'hover:[box-shadow:var(--rx-shadow-card,var(--shadow-card))]'
      } ${accentClassName ?? ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
