export type CsvValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvValue>;

export const CSV_UTF8_BOM = '\uFEFF';

export function escapeCsvValue(value: CsvValue) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  const trimmedStart = value.trimStart();
  const safeValue = /^[=+\-@]/.test(trimmedStart) ? `'${value}` : value;
  return JSON.stringify(safeValue);
}

export function buildCsv(rows: readonly CsvRow[]) {
  const keys = Object.keys(rows[0] ?? {}).sort((a, b) => a.localeCompare(b));
  return [keys.join(','), ...rows.map((row) => keys.map((key) => escapeCsvValue(row[key])).join(','))].join('\n');
}

export function withUtf8Bom(csv: string) {
  return `${CSV_UTF8_BOM}${csv}`;
}
