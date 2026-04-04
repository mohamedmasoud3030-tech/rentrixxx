import React from 'react';

type SkeletonVariant = 'default' | 'text' | 'avatar' | 'card';
type SkeletonRounded = boolean | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  className?: string;
  rounded?: SkeletonRounded;
  variant?: SkeletonVariant;
  shimmer?: boolean;
}

const roundedClasses: Record<Exclude<SkeletonRounded, boolean>, string> = {
  sm: 'rounded-[calc(var(--rx-radius-sm,var(--radius))_-_4px)]',
  md: 'rounded-[var(--rx-radius-md,var(--radius))]',
  lg: 'rounded-[var(--rx-radius-lg,var(--radius-lg,var(--radius)))]',
  xl: 'rounded-[var(--rx-radius-xl,var(--radius-xl,var(--radius-lg,var(--radius))))]',
  full: 'rounded-full',
};

const variantClasses: Record<SkeletonVariant, string> = {
  default: 'min-h-4',
  text: 'h-4 w-full max-w-[32ch]',
  avatar: 'h-10 w-10 rounded-full shrink-0',
  card: 'h-32 w-full rounded-[var(--rx-radius-lg,var(--radius-lg,var(--radius)))]',
};

const resolveDimension = (value?: number | string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === 'number' ? `${value}px` : value;
};

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className = '',
  rounded = 'md',
  variant = 'default',
  shimmer = true,
  style,
  ...props
}) => {
  const resolvedRounded =
    typeof rounded === 'boolean' ? (rounded ? roundedClasses.md : 'rounded-none') : roundedClasses[rounded];

  return (
    <div
      {...props}
      aria-hidden="true"
      className={[
        'relative isolate overflow-hidden',
        'bg-[var(--rx-skeleton-base,var(--rx-surface-muted,var(--rx-surface,hsl(var(--color-card)))))]',
        'motion-safe:animate-pulse',
        variantClasses[variant],
        variant !== 'avatar' ? resolvedRounded : '',
        shimmer
          ? "after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:motion-safe:animate-[pulse_1.6s_ease-in-out_infinite] after:bg-[linear-gradient(90deg,transparent_0%,var(--rx-skeleton-highlight,color-mix(in_srgb,var(--rx-bg,hsl(var(--color-bg)))_30%,transparent))_50%,transparent_100%)]"
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: resolveDimension(width),
        height: resolveDimension(height),
        ...style,
      }}
    />
  );
};

export default Skeleton;
