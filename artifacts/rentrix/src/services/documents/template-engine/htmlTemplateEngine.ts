import type { TemplateEngine, TemplateModel, TemplateSummaryItem, TemplateTable } from './templateTypes';

const popupBlockedMessage = 'تعذر فتح معاينة المستند. يرجى السماح بالنوافذ المنبثقة ثم إعادة المحاولة.';

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const documentStyles = `
@page{size:A4;margin:10mm}
*{box-sizing:border-box}
body{margin:0;background:#eef2f7;color:#111827;font-family:"Tahoma","Segoe UI","Noto Naskh Arabic","Arial",sans-serif;font-size:12px;line-height:1.55;word-break:break-word;overflow-wrap:anywhere}
.sheet{width:min(100%,210mm);min-height:297mm;margin:0 auto;background:#fff;padding:12mm;box-shadow:0 18px 60px rgba(15,23,42,.14)}
.header{display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid var(--accent,#1d4ed8);padding-bottom:12px;margin-bottom:14px}
.brand h2,.title h1{margin:0}.brand p,.title p{margin:4px 0 0;color:#64748b}.title{text-align:end}
.section{border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin-bottom:12px;break-inside:avoid;page-break-inside:avoid}
.section h3{margin:0 0 8px;font-size:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.item{border:1px solid #edf2f7;border-radius:10px;padding:8px;background:#f8fafc}.item span{display:block;color:#64748b;font-size:11px}.item strong{display:block;margin-top:2px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:640px}th{background:#f1f5f9}td,th{border:1px solid #e2e8f0;padding:7px 8px;text-align:inherit;vertical-align:top}tfoot th{background:#eaf2ff}.notes{margin:0;padding-inline-start:18px}.actions{position:sticky;bottom:12px;display:flex;justify-content:center;gap:8px;margin-top:16px}.actions button{border:0;border-radius:999px;background:#111827;color:#fff;padding:10px 16px;font-weight:700;cursor:pointer}.actions button.secondary{background:#e5e7eb;color:#111827}
@media screen and (max-width:768px){body{background:#fff;font-size:13px}.sheet{width:100%;min-height:auto;padding:12px;box-shadow:none}.header{display:block}.title{text-align:start;margin-top:10px}.grid{grid-template-columns:1fr}table{min-width:560px}.actions{position:static}}
@media print{body{background:#fff;font-size:10px;line-height:1.45}.sheet{width:auto;min-height:auto;padding:0;box-shadow:none}.section{border-radius:8px;padding:8px;margin-bottom:6px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.item{padding:5px}.item span{font-size:9px}.table-wrap{overflow:visible}table{min-width:0;table-layout:fixed}td,th{padding:3px 4px}.actions{display:none}}
`;

function renderSummary(items: ReadonlyArray<TemplateSummaryItem> | undefined, title: string): string {
  if (!items?.length) return '';
  const cards = items.map((item) => `<article class="item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></article>`).join('');
  return `<section class="section"><h3>${escapeHtml(title)}</h3><div class="grid">${cards}</div></section>`;
}

function renderTable(table: TemplateTable): string {
  const columns = table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
  const totals = table.totals?.length ? `<tfoot><tr>${table.totals.map((total) => `<th>${escapeHtml(total)}</th>`).join('')}</tr></tfoot>` : '';
  return `<section class="section"><h3>${escapeHtml(table.title ?? 'البيانات')}</h3><div class="table-wrap"><table><thead><tr>${columns}</tr></thead><tbody>${rows}</tbody>${totals}</table></div></section>`;
}

export function buildTemplateHtml(model: TemplateModel): string {
  const direction = model.direction;
  const accent = model.branding.primaryColor ?? '#1d4ed8';
  const metadata = renderSummary(model.metadata, 'بيانات المستند');
  const summary = renderSummary(model.summaryItems, 'الملخص التشغيلي');
  const tables = (model.tables ?? []).map(renderTable).join('');
  const notes = model.notes?.length ? `<section class="section"><h3>ملاحظات</h3><ul class="notes">${model.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></section>` : '';
  return `<!doctype html><html lang="ar" dir="${direction}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(model.title)}</title><style>:root{--accent:${escapeHtml(accent)}}${documentStyles}</style></head><body><main class="sheet"><header class="header"><div class="brand"><h2>${escapeHtml(model.branding.companyName)}</h2>${model.branding.companyAddress ? `<p>${escapeHtml(model.branding.companyAddress)}</p>` : ''}${model.branding.companyPhone ? `<p dir="ltr">${escapeHtml(model.branding.companyPhone)}</p>` : ''}</div><div class="title"><h1>${escapeHtml(model.title)}</h1><p>${escapeHtml(model.generatedAt)}</p></div></header>${metadata}${summary}${tables}${notes}<div class="actions"><button type="button" onclick="window.print()">طباعة</button><button type="button" class="secondary" onclick="window.close()">إغلاق</button></div></main></body></html>`;
}

function openTemplateWindow(html: string): void {
  const popup = globalThis.open('', '_blank', 'width=1120,height=820');
  if (!popup) throw new Error(popupBlockedMessage);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    URL.revokeObjectURL(url);
  };
  popup.addEventListener('load', () => {
    popup.focus();
    popup.addEventListener('beforeunload', cleanup, { once: true });
  }, { once: true });
  popup.location.replace(url);
}

export const htmlTemplateEngine: TemplateEngine = {
  preview(model) {
    openTemplateWindow(buildTemplateHtml(model));
  },
  download(model) {
    openTemplateWindow(buildTemplateHtml(model));
  },
};
