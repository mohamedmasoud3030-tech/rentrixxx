import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary/30',
  secondary: 'border border-border bg-card text-text hover:bg-background/60 focus-visible:ring-primary/20',
  ghost: 'bg-transparent text-text-muted hover:bg-background hover:text-text focus-visible:ring-primary/20',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-300',
  glass: 'bg-white/10 text-text border border-white/25 backdrop-blur-md hover:bg-white/15 focus-visible:ring-white/35',
};

export const DSButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }> = ({
  variant = 'primary',
  className = '',
  loading,
  disabled,
  children,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
  >
    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
    {children}
  </button>
);
