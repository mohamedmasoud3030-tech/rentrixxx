import { documentEngine } from '@/services/documents/documentEngine';

export function canPrintOperationalReport(hasData: boolean, isLoading: boolean, hasError: boolean): boolean {
  return hasData && !isLoading && !hasError;
}

type OperationalPrintSummaryItem = Readonly<{ label: string; value: string }>;
type OperationalPrintTable = Readonly<{ title: string; columns: readonly string[]; rows: ReadonlyArray<readonly string[]> }>;
type OperationalPrintOptions = Readonly<{ title: string; generatedAt: string; summaryItems?: ReadonlyArray<OperationalPrintSummaryItem>; tables?: ReadonlyArray<OperationalPrintTable> }>;

export const buildOperationalPrintHtml = () => '';

export function runOperationalPrint(hasData: boolean, isLoading: boolean, hasError: boolean, options?: OperationalPrintOptions): string | null {
  if (!canPrintOperationalReport(hasData, isLoading, hasError)) return 'لا يمكن الطباعة حالياً.';
  if (!options) return null;
  const result = documentEngine.previewDocument('properties-report', {
    generatedAt: options.generatedAt,
    companyName: 'Rentrix',
    properties: (options.tables?.[0]?.rows ?? []).map((row) => ({ title: row[0] ?? '—', type: row[1] ?? '—', owner: '—', status: row[2] ?? '—', address: '—', amount: '—' })),
  });
  return result.success ? null : (result.errorMessage ?? 'تعذر فتح نافذة الطباعة.');
}
