import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive' | 'warning' | 'success' | 'default';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-muted text-foreground',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  warning: 'bg-[hsl(var(--warning))] text-white hover:bg-[hsl(var(--warning)/0.9)]',
  success: 'bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.9)]',
};

export function Button({ asChild = false, className, variant = 'primary', type = 'button', ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(
        'pressable inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
