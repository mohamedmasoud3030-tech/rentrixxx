import { buildCsv, downloadCsv as downloadCsvText, type CsvCell } from '@/lib/csv';

export type CsvRow = Record<string, CsvCell | Date>;

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
  fullName: 'الاسم',
  type: 'النوع',
  phone: 'الهاتف',
  email: 'البريد الإلكتروني',
  nationalId: 'رقم الهوية',
  address: 'العنوان',
  propertyTitle: 'العقار',
  unitNumber: 'الوحدة',
  activeContractCount: 'العقود النشطة',
  safeLinks: 'روابط آمنة',
  propertyCount: 'عدد العقارات',
};

const normalizeCsvValue = (value: CsvRow[string]): CsvCell => (value instanceof Date ? value.toISOString() : value);

export function mapCsvHeader(header: string): string {
  return arabicHeaderMap[header] ?? header;
}

export function toCsv(rows: CsvRow[], headers?: string[]): string {
  if (rows.length === 0) return '';
  const keys = headers ?? Object.keys(rows[0]);
  const columns = keys.map((key) => ({ header: mapCsvHeader(key), value: (row: CsvRow) => normalizeCsvValue(row[key]) }));
  return buildCsv(columns, rows);
}

export function downloadCsv(filename: string, rows: CsvRow[], headers?: string[]): void {
  downloadCsvText(filename, toCsv(rows, headers));
}
