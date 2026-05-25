export type CsvCell = string | number | boolean | null | undefined;

export type CsvColumn<T> = Readonly<{
  header: string;
  value: (row: T) => CsvCell;
}>;

const FORMULA_TRIGGER_PATTERN = /^[\t\r\n]*[=+@]/;
const LEADING_MINUS_PATTERN = /^[\t\r\n]*-/;
const NUMERIC_PATTERN = /^-?\d+(?:\.\d+)?$/;

const normalizeCsvCell = (value: CsvCell): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export const escapeCsvCell = (value: CsvCell): string => {
  const cell = normalizeCsvCell(value);
  const shouldNeutralize =
    FORMULA_TRIGGER_PATTERN.test(cell) || (LEADING_MINUS_PATTERN.test(cell) && !NUMERIC_PATTERN.test(cell));
  const neutralized = shouldNeutralize ? `'${cell}` : cell;
  const escaped = neutralized.replaceAll('"', '""');
  if (/[",\n\r]/.test(escaped)) return `"${escaped}"`;
  return escaped;
};

export function buildCsv<T>(columns: ReadonlyArray<CsvColumn<T>>, rows: readonly T[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(','));
  return [header, ...body].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}