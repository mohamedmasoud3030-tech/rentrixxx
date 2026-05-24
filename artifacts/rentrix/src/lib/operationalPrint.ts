export function canPrintOperationalReport(hasData: boolean, isLoading: boolean, hasError: boolean): boolean {
  return hasData && !isLoading && !hasError;
}

type OperationalPrintSummaryItem = Readonly<{ label: string; value: string }>;
type OperationalPrintTable = Readonly<{ title: string; columns: readonly string[]; rows: ReadonlyArray<readonly string[]> }>;
type OperationalPrintOptions = Readonly<{
  title: string;
  generatedAt: string;
  summaryItems?: ReadonlyArray<OperationalPrintSummaryItem>;
  tables?: ReadonlyArray<OperationalPrintTable>;
  emptyMessage?: string;
}>;

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const buildOperationalPrintHtml = (options: OperationalPrintOptions) => {
  const summaryHtml = (options.summaryItems ?? []).map((item) => `<article class="card"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></article>`).join('');
  const tableHtml = (options.tables ?? []).map((table) => {
    const head = table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
    const body = table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    return `<section class="block"><h3>${escapeHtml(table.title)}</h3><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
  }).join('');
  const hasContent = Boolean(summaryHtml || tableHtml);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>${escapeHtml(options.title)}</title><style>@page{size:A4;margin:8mm 10mm}*{box-sizing:border-box}body{margin:0;color:#111;font-family:"Tahoma","Segoe UI","Noto Naskh Arabic","Arial",sans-serif;font-size:10px;line-height:1.45;word-break:break-word;overflow-wrap:anywhere}.sheet{padding:2mm 0}.block{border:1px solid #d7d7d7;border-radius:8px;padding:8px;margin-bottom:6px;break-inside:avoid;page-break-inside:avoid}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.card{padding:5px;border:1px solid #e5e5e5;border-radius:6px}.card span{display:block;color:#444;font-size:9px}h1{font-size:17px;margin:0 0 4px}h2{font-size:11px;margin:0 0 4px}h3{font-size:11px;margin:0 0 4px}table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{border:1px solid #ddd;padding:3px 4px;text-align:right;vertical-align:top}tr{break-inside:avoid;page-break-inside:avoid}</style></head><body><main class="sheet"><section class="block"><h1>${escapeHtml(options.title)}</h1><h2>تاريخ الإنشاء: ${escapeHtml(options.generatedAt)}</h2></section>${summaryHtml ? `<section class="block"><h3>الملخص التشغيلي</h3><div class="meta">${summaryHtml}</div></section>` : ''}${tableHtml}${hasContent ? '' : `<section class="block">${escapeHtml(options.emptyMessage ?? 'لا توجد بيانات تشغيلية متاحة للطباعة حالياً.')}</section>`}</main></body></html>`;
};

const openPrintWindow = (): Window => {
  const popup = globalThis.open('', '_blank', 'width=1024,height=768');
  if (!popup) throw new Error('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة ثم إعادة المحاولة.');
  return popup;
};

export function runOperationalPrint(hasData: boolean, isLoading: boolean, hasError: boolean, options?: OperationalPrintOptions): string | null {
  if (isLoading) return 'لا يمكن الطباعة أثناء تحميل البيانات.';
  if (hasError) return 'تعذر تجهيز التقرير للطباعة بسبب خطأ في تحميل البيانات.';
  if (!hasData) return 'لا توجد بيانات تشغيلية متاحة للطباعة حالياً.';
  if (!options) {
    globalThis.print();
    return null;
  }
  const windowRef = openPrintWindow();
  const htmlBlob = new Blob([buildOperationalPrintHtml(options)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(htmlBlob);
  const cleanup = () => URL.revokeObjectURL(url);
  windowRef.onafterprint = cleanup;
  windowRef.onbeforeunload = cleanup;
  windowRef.onload = () => {
    windowRef.focus();
    windowRef.print();
  };
  windowRef.location.replace(url);
  return null;
}
