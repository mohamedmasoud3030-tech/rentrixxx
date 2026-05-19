import { jsPDF } from 'jspdf';
import type { SignatureRole, UnifiedDocumentModel } from './types';

const PAGE_MARGIN_X = 14;
const PAGE_MARGIN_Y = 16;
const LINE_HEIGHT = 7;

const signatureLabel: Record<SignatureRole, string> = {
  owner: 'توقيع المالك',
  tenant: 'توقيع المستأجر',
  accountant: 'توقيع المحاسب',
  general_manager: 'توقيع المدير العام',
};

const newDoc = (): jsPDF => new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

const ensurePage = (doc: jsPDF, y: number, needed = 10): number => {
  if (y + needed < 285) return y;
  doc.addPage();
  return PAGE_MARGIN_Y;
};

const ARABIC_REGEX = /[\u0600-\u06FF]/;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function modelHasArabicText(model: UnifiedDocumentModel): boolean {
  const chunks: string[] = [
    model.header.companyName,
    model.header.companyAddress ?? '',
    model.header.companyPhone ?? '',
    model.header.title,
    model.header.documentNo ?? '',
    model.header.dateLabel ?? '',
    model.header.dateValue ?? '',
    ...model.kpis.flatMap((kpi) => [kpi.label, kpi.value]),
    ...model.tables.flatMap((table) => [table.title ?? '', ...table.columns, ...table.rows.flat(), ...(table.totals ?? [])]),
    ...model.footer.signatures.map((role) => signatureLabel[role]),
    model.footer.companyStampLabel ?? '',
    model.footer.metadata ?? '',
  ];
  return chunks.some((chunk) => ARABIC_REGEX.test(chunk));
}

function renderRtlPrintPreview(model: UnifiedDocumentModel): void {
  const popup = globalThis.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
  if (!popup) return;
  const kpis = model.kpis.map((kpi) => `<tr><th>${escapeHtml(kpi.label)}</th><td>${escapeHtml(kpi.value)}</td></tr>`).join('');
  const tables = model.tables.map((table) => {
    const header = table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
    const rows = table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    const totals = table.totals?.length ? `<tfoot><tr>${table.totals.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr></tfoot>` : '';
    const title = table.title ? `<h3>${escapeHtml(table.title)}</h3>` : '';
    return `${title}<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody>${totals}</table>`;
  }).join('');
  popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>${escapeHtml(model.fileName)}</title><style>body{font-family:"Noto Naskh Arabic","Tahoma","Arial",sans-serif;padding:24px;line-height:1.6}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:8px;text-align:right}h1,h2,h3{margin:8px 0}</style></head><body><h1>${escapeHtml(model.header.companyName)}</h1><h2>${escapeHtml(model.header.title)}</h2><p>${escapeHtml(model.header.documentNo ? `رقم: ${model.header.documentNo}` : '')}</p><p>${escapeHtml(model.header.dateValue ? `${model.header.dateLabel ?? 'التاريخ'}: ${model.header.dateValue}` : '')}</p><table><tbody>${kpis}</tbody></table>${tables}</body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export const DocumentRenderer = {
  renderToPDF(model: UnifiedDocumentModel): void {
    if (modelHasArabicText(model)) {
      renderRtlPrintPreview(model);
      return;
    }
    const doc = newDoc();
    let y = PAGE_MARGIN_Y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(model.header.companyName || 'Rentrix', PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (model.header.companyAddress) { doc.text(model.header.companyAddress, PAGE_MARGIN_X, y); y += LINE_HEIGHT; }
    if (model.header.companyPhone) { doc.text(model.header.companyPhone, PAGE_MARGIN_X, y); y += LINE_HEIGHT; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(model.header.title, PAGE_MARGIN_X, y); y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    if (model.header.documentNo) { doc.text(`No: ${model.header.documentNo}`, PAGE_MARGIN_X, y); y += LINE_HEIGHT; }
    if (model.header.dateLabel && model.header.dateValue) { doc.text(`${model.header.dateLabel}: ${model.header.dateValue}`, PAGE_MARGIN_X, y); y += LINE_HEIGHT; }
    y += 2;
    model.kpis.forEach((kpi) => { y = ensurePage(doc, y, LINE_HEIGHT); doc.setFont('helvetica', 'bold'); doc.text(`${kpi.label}:`, PAGE_MARGIN_X, y); doc.setFont('helvetica', 'normal'); doc.text(kpi.value, PAGE_MARGIN_X + 55, y); y += LINE_HEIGHT; });
    y += 2;
    model.tables.forEach((table) => {
      y = ensurePage(doc, y, 20);
      if (table.title) { doc.setFont('helvetica', 'bold'); doc.text(table.title, PAGE_MARGIN_X, y); y += LINE_HEIGHT; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(table.columns.join(' | '), PAGE_MARGIN_X, y); y += LINE_HEIGHT;
      doc.setFont('helvetica', 'normal');
      table.rows.forEach((row) => { y = ensurePage(doc, y, LINE_HEIGHT); doc.text(row.join(' | '), PAGE_MARGIN_X, y); y += LINE_HEIGHT; });
      if (table.totals?.length) { y = ensurePage(doc, y, LINE_HEIGHT); doc.setFont('helvetica', 'bold'); doc.text(table.totals.join(' | '), PAGE_MARGIN_X, y); y += LINE_HEIGHT; }
      y += 2;
    });
    y = ensurePage(doc, y, 24); doc.setFont('helvetica', 'bold'); doc.text('Signatures', PAGE_MARGIN_X, y); y += LINE_HEIGHT;
    model.footer.signatures.forEach((role) => { y = ensurePage(doc, y, LINE_HEIGHT); doc.setFont('helvetica', 'normal'); doc.text(`${signatureLabel[role]}: ____________________`, PAGE_MARGIN_X, y); y += LINE_HEIGHT; });
    doc.save(`${model.fileName}.pdf`);
  },
};
