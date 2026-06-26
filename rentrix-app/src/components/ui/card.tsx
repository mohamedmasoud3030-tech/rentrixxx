import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'muted' | 'outlined' | 'elevated';

const cardVariants: Record<CardVariant, string> = {
  default: 'border border-border bg-card text-card-foreground shadow-sm',
  muted: 'border border-border/60 bg-muted/40 text-card-foreground shadow-none',
  outlined: 'border-2 border-border bg-transparent text-card-foreground shadow-none',
  elevated: 'border border-border bg-card text-card-foreground shadow-lg',
};

/**
 * AppCard primitive — the single card surface for the whole app.
 * Use `variant` instead of ad-hoc className overrides for border/background/shadow.
 *
 * @example
 * <Card variant="outlined"><CardHeader>…</CardHeader><CardContent>…</CardContent><CardFooter>…</CardFooter></Card>
 */
export function Card({ className, variant = 'default', ...props }: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cn('hover-card rounded-2xl', cardVariants[variant], className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-black tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-6 text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 p-6 pt-0', className)} {...props} />;
}
