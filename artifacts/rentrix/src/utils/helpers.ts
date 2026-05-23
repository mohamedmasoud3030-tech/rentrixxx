export type CsvRow = Record<string, string | number | boolean | null | undefined | Date>;

const arabicHeaderMap: Record<string, string> = {
  name: 'الاسم',
  property: 'العقار',
  unit: 'الوحدة',
  tenant: 'المستأجر',
  owner: 'المالك',
  status: 'الحالة',
  amount: 'المبلغ',
  date: 'التاريخ',
  dueDate: 'تاريخ الاستحقاق',
  notes: 'ملاحظات',
};

function escapeCsvValue(value: CsvRow[string]): string {
  if (value === null || value === undefined) return '';
  const normalized = value instanceof Date ? value.toISOString() : String(value);
  const escaped = normalized.replaceAll('"', '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function mapCsvHeader(header: string): string {
  return arabicHeaderMap[header] ?? header;
}

export function toCsv(rows: CsvRow[], headers?: string[]): string {
  if (rows.length === 0) return '';
  const keys = headers ?? Object.keys(rows[0]);
  const headerRow = keys.map((key) => escapeCsvValue(mapCsvHeader(key))).join(',');
  const dataRows = rows.map((row) => keys.map((key) => escapeCsvValue(row[key])).join(','));
  return [headerRow, ...dataRows].join('\n');
}

export function downloadCsv(filename: string, rows: CsvRow[], headers?: string[]): void {
  const csv = toCsv(rows, headers);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
