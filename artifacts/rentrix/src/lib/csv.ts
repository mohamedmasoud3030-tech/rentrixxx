export type CsvCell = string | number | boolean | null | undefined;

export type CsvColumn<T> = Readonly<{
  header: string;
  value: (row: T) => CsvCell;
}>;

const formulaLikePrefixPattern = /^[\t\r\n]*[=+\-@]/;

const normalizeCsvCell = (value: CsvCell): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const neutralizeFormulaLikeCell = (cell: string): string => (formulaLikePrefixPattern.test(cell) ? `'${cell}` : cell);

export const escapeCsvCell = (value: CsvCell): string => {
  const cell = neutralizeFormulaLikeCell(normalizeCsvCell(value));
  const escaped = cell.replaceAll('"', '""');
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
