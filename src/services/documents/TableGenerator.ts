import type { DocumentTable } from './types';

const toCell = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number' && Number.isFinite(value)) return value.toString();
  return String(value);
};

export const TableGenerator = {
  build(columns: string[], rows: unknown[][], totals?: unknown[]): DocumentTable {
    return {
      columns,
      rows: rows.map((row) => row.map(toCell)),
      totals: totals?.map(toCell),
    };
  },
};
