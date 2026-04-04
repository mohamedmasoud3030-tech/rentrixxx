import React from 'react';

import Button, { type ButtonProps } from './Button';

interface TableEmptyStateAction {
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: ButtonProps['variant'];
  buttonProps?: Omit<ButtonProps, 'children' | 'onClick' | 'variant'>;
}

export interface TableEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: TableEmptyStateAction;
}

const TableEmptyState: React.FC<TableEmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
  ...props
}) => {
  return (
    <div
      {...props}
      role="status"
      aria-live="polite"
      className={[
        'w-full min-h-[240px] px-6 py-10',
        'flex items-center justify-center',
        'bg-[var(--rx-surface-card,var(--rx-surface,hsl(var(--color-card))))]',
        'text-[var(--rx-text-muted,hsl(var(--color-text-muted)))]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        {icon ? (
          <div
            aria-hidden="true"
            className={[
              'flex h-11 w-11 items-center justify-center rounded-full',
              'bg-[color-mix(in_srgb,var(--rx-text-muted,hsl(var(--color-text-muted)))_14%,transparent)]',
              'text-[var(--rx-text-muted,hsl(var(--color-text-muted)))]',
            ].join(' ')}
          >
            {icon}
          </div>
        ) : null}

        <h3 className="text-base font-semibold leading-6 text-[var(--rx-text,hsl(var(--color-text-primary)))]">
          {title}
        </h3>

        {description ? (
          <p className="text-sm leading-6 text-[var(--rx-text-muted,hsl(var(--color-text-muted)))]">
            {description}
          </p>
        ) : null}

        {action ? (
          <Button
            type="button"
            variant={action.variant ?? 'secondary'}
            onClick={action.onClick}
            className="mt-2"
            {...action.buttonProps}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default TableEmptyState;
