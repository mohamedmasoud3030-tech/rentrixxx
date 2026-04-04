import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

type PageItem = number | 'ellipsis';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createPageRange = (start: number, end: number): number[] => {
  const safeStart = Math.floor(start);
  const safeEnd = Math.floor(end);

  if (safeEnd < safeStart) {
    return [];
  }

  return Array.from({ length: safeEnd - safeStart + 1 }, (_, index) => safeStart + index);
};

const getPaginationRange = (currentPage: number, totalPages: number, siblingCount: number): PageItem[] => {
  if (totalPages <= 0) {
    return [];
  }

  const totalVisibleNumbers = siblingCount + 5;

  if (totalVisibleNumbers >= totalPages) {
    return createPageRange(1, totalPages);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = createPageRange(1, 3 + siblingCount * 2);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = createPageRange(totalPages - (2 + siblingCount * 2), totalPages);
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = createPageRange(leftSiblingIndex, rightSiblingIndex);
  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
};

const controlBaseClasses = [
  'inline-flex items-center justify-center',
  'min-h-9 min-w-9 px-3',
  'rounded-[var(--rx-radius-sm,var(--radius))]',
  'border border-[var(--rx-border,hsl(var(--color-border)))]',
  'bg-[var(--rx-surface,hsl(var(--color-card)))]',
  'text-[var(--rx-text,hsl(var(--color-text-primary)))] text-sm font-medium',
  'transition-colors duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rx-primary,hsl(var(--color-primary)))] focus-visible:ring-offset-2',
  'focus-visible:ring-offset-[var(--rx-bg,hsl(var(--color-bg)))]',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'hover:bg-[color-mix(in_srgb,var(--rx-surface,hsl(var(--color-card)))_88%,var(--rx-border,hsl(var(--color-border)))_12%)]',
].join(' ');

const activePageClasses = [
  'border-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_65%,var(--rx-border,hsl(var(--color-border)))_35%)]',
  'bg-[color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_15%,var(--rx-surface,hsl(var(--color-card)))_85%)]',
  'text-[var(--rx-primary,hsl(var(--color-primary)))]',
  'shadow-[0_0_0_1px_color-mix(in_srgb,var(--rx-primary,hsl(var(--color-primary)))_22%,transparent)]',
].join(' ');

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = '',
}) => {
  const safeTotalPages = Math.max(0, Math.floor(totalPages));
  const safeSiblingCount = Math.max(0, Math.floor(siblingCount));
  const safeCurrentPage = clamp(Math.floor(currentPage), 1, Math.max(safeTotalPages, 1));

  if (safeTotalPages <= 1) {
    return null;
  }

  const pageItems = getPaginationRange(safeCurrentPage, safeTotalPages, safeSiblingCount);

  return (
    <nav
      aria-label="Pagination"
      className={['inline-flex w-full items-center justify-center', className].filter(Boolean).join(' ')}
    >
      <ul className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
        <li>
          <button
            type="button"
            className={controlBaseClasses}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            aria-label="Go to previous page"
          >
            Previous
          </button>
        </li>

        {pageItems.map((item, index) => {
          if (item === 'ellipsis') {
            return (
              <li key={`ellipsis-${index}`} aria-hidden="true">
                <span className="inline-flex min-h-9 min-w-9 items-center justify-center px-2 text-sm text-[var(--rx-text-muted,hsl(var(--color-text-muted)))]">
                  …
                </span>
              </li>
            );
          }

          const isActive = item === safeCurrentPage;

          return (
            <li key={`page-${item}`}>
              <button
                type="button"
                className={[controlBaseClasses, isActive ? activePageClasses : ''].filter(Boolean).join(' ')}
                onClick={() => onPageChange(item)}
                aria-label={`Go to page ${item}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            className={controlBaseClasses}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === safeTotalPages}
            aria-label="Go to next page"
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
};

export type { PaginationProps };
export default Pagination;
