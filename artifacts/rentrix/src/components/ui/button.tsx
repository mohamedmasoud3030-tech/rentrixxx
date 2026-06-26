import { LoaderCircle } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'text-foreground hover:bg-muted',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

export function Button({
  asChild = false,
  className,
  variant = 'primary',
  type = 'button',
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  const isDisabled = disabled || isLoading;

  return (
    <Component
      className={cn(
        'pressable inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        isLoading && 'pointer-events-none cursor-wait opacity-70',
        className,
      )}
      type={asChild ? undefined : type}
      disabled={asChild ? undefined : isDisabled}
      aria-busy={isLoading || undefined}
      aria-disabled={asChild && isDisabled ? true : undefined}
      {...props}
    >
      {isLoading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
      {children}
    </Component>
  );
}
