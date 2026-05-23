export function canPrintOperationalReport(hasData: boolean, isLoading: boolean, hasError: boolean): boolean {
  return hasData && !isLoading && !hasError;
}

export function runOperationalPrint(hasData: boolean, isLoading: boolean, hasError: boolean): string | null {
  if (isLoading) return 'لا يمكن الطباعة أثناء تحميل البيانات.';
  if (hasError) return 'تعذر تجهيز التقرير للطباعة بسبب خطأ في تحميل البيانات.';
  if (!hasData) return 'لا توجد بيانات تشغيلية متاحة للطباعة حالياً.';
  globalThis.print();
  return null;
}
