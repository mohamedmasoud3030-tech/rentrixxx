import { jsPDF } from 'jspdf';
import type { SignatureRole, UnifiedDocumentModel } from './types';

const ARABIC_REGEX = /[\u0600-\u06FF]/;
const DEFAULT_SIGNATURE_LABELS = new Set(['توقيع المالك', 'توقيع المستأجر', 'توقيع المحاسب', 'توقيع المدير العام']);
const signatureLabel: Record<SignatureRole, string> = { owner: 'توقيع المالك', tenant: 'توقيع المستأجر', accountant: 'توقيع المحاسب', general_manager: 'توقيع المدير العام' };
const PAGE_MARGIN_X = 14; const PAGE_MARGIN_Y = 16; const LINE_HEIGHT = 7;
const newDoc = (): jsPDF => new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
const ensurePage = (doc: jsPDF, y: number, needed = 10): number => (y + needed < 285 ? y : (doc.addPage(), PAGE_MARGIN_Y));
export const escapeDocumentHtml = (value: string | null | undefined): string => (value ?? '').replace(/[&<>"']/g, (char) => {
  switch (char) {
    case '&': return '&amp;';
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '"': return '&quot;';
    case "'": return '&#39;';
    default: return char;
  }
});

export const collectDocumentTextChunks = (model: UnifiedDocumentModel): string[] => {
  const signatureTexts = model.footer.signatures.map((role) => signatureLabel[role]).filter((label) => !DEFAULT_SIGNATURE_LABELS.has(label));
  return [model.header.companyName, model.header.companyAddress, model.header.companyPhone, model.header.title, model.header.documentNo, model.header.dateLabel, model.header.dateValue, ...model.kpis.flatMap((k) => [k.label, k.value]), ...model.tables.flatMap((t) => [t.title, ...t.columns, ...t.rows.flat(), ...(t.totals ?? [])]), model.footer.companyStampLabel, model.footer.metadata, ...signatureTexts].filter((v): v is string => Boolean(v));
};
const modelHasArabicText = (model: UnifiedDocumentModel): boolean => collectDocumentTextChunks(model).some((x) => ARABIC_REGEX.test(x));
const buildHtmlRows = (rows: string[][]) => rows.map((r) => `<tr>${r.map((c) => `<td>${escapeDocumentHtml(c)}</td>`).join('')}</tr>`).join('');
const buildHtmlTable = (table: UnifiedDocumentModel['tables'][number]) => {
  const tableHead = table.columns.map((column) => `<th>${escapeDocumentHtml(column)}</th>`).join('');
  const tableFoot = table.totals?.length
    ? `<tfoot><tr>${table.totals.map((total) => `<th>${escapeDocumentHtml(total)}</th>`).join('')}</tr></tfoot>`
    : '';
  return `<section><h3>${escapeDocumentHtml(table.title)}</h3><table><thead><tr>${tableHead}</tr></thead><tbody>${buildHtmlRows(table.rows)}</tbody>${tableFoot}</table></section>`;
};
const buildRtlPrintHtml = (model: UnifiedDocumentModel) => {
  const kpiHtml = model.kpis.map((k) => `<p><strong>${escapeDocumentHtml(k.label)}:</strong> ${escapeDocumentHtml(k.value)}</p>`).join('');
  const signaturesHtml = model.footer.signatures.map((role) => `<p>${signatureLabel[role]}: ____________________</p>`).join('');
  return [
    '<!doctype html><html dir="rtl"><head><meta charset="utf-8"/>',
    '<style>body{font-family:Tahoma,Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px}h1,h2,h3{margin:8px 0}</style>',
    '</head><body>',
    `<h2>${escapeDocumentHtml(model.header.companyName)}</h2>`,
    `<h1>${escapeDocumentHtml(model.header.title)}</h1>`,
    kpiHtml,
    model.tables.map(buildHtmlTable).join(''),
    '<h3>التواقيع</h3>',
    signaturesHtml,
    `<p>${escapeDocumentHtml(model.footer.companyStampLabel)}</p>`,
    `<p>${escapeDocumentHtml(model.footer.metadata)}</p>`,
    '</body></html>',
  ].join('');
};
const openPrintWindowSafely = (): Window => {
  const popup = globalThis.open('', '_blank', 'width=1024,height=768');
  if (!popup) throw new Error('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة ثم إعادة المحاولة.');
  return popup;
};
const renderRtlPrintPreview = (model: UnifiedDocumentModel): void => {
  const w = openPrintWindowSafely();
  const htmlBlob = new Blob([buildRtlPrintHtml(model)], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(htmlBlob);
  const onLoad = () => {
    w.focus();
    w.print();
    w.removeEventListener('load', onLoad);
    URL.revokeObjectURL(objectUrl);
  };
  w.addEventListener('load', onLoad);
  w.location.replace(objectUrl);
};

const renderPdfHeader = (doc: jsPDF, model: UnifiedDocumentModel, y: number): number => { doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text(model.header.companyName || 'Rentrix', PAGE_MARGIN_X, y); y+=LINE_HEIGHT; doc.setFont('helvetica','normal'); doc.setFontSize(9); [model.header.companyAddress, model.header.companyPhone].forEach((line)=>{ if(line){doc.text(line, PAGE_MARGIN_X, y); y+=LINE_HEIGHT;}}); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text(model.header.title, PAGE_MARGIN_X, y); y+=LINE_HEIGHT; doc.setFont('helvetica','normal'); doc.setFontSize(10); if(model.header.documentNo){doc.text(`No: ${model.header.documentNo}`, PAGE_MARGIN_X,y); y+=LINE_HEIGHT;} if(model.header.dateLabel&&model.header.dateValue){doc.text(`${model.header.dateLabel}: ${model.header.dateValue}`, PAGE_MARGIN_X,y); y+=LINE_HEIGHT;} return y+2; };
const renderPdfKpis = (doc: jsPDF, model: UnifiedDocumentModel, y: number): number => { model.kpis.forEach((k)=>{ y=ensurePage(doc,y,LINE_HEIGHT); doc.setFont('helvetica','bold'); doc.text(`${k.label}:`,PAGE_MARGIN_X,y); doc.setFont('helvetica','normal'); doc.text(k.value,PAGE_MARGIN_X+55,y); y+=LINE_HEIGHT;}); return y+2; };
const renderPdfTables = (doc: jsPDF, model: UnifiedDocumentModel, y: number): number => { model.tables.forEach((t)=>{ y=ensurePage(doc,y,20); if(t.title){doc.setFont('helvetica','bold'); doc.text(t.title,PAGE_MARGIN_X,y); y+=LINE_HEIGHT;} doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(t.columns.join(' | '),PAGE_MARGIN_X,y); y+=LINE_HEIGHT; doc.setFont('helvetica','normal'); t.rows.forEach((r)=>{ y=ensurePage(doc,y,LINE_HEIGHT); doc.text(r.join(' | '),PAGE_MARGIN_X,y); y+=LINE_HEIGHT;}); if(t.totals?.length){ y=ensurePage(doc,y,LINE_HEIGHT); doc.setFont('helvetica','bold'); doc.text(t.totals.join(' | '),PAGE_MARGIN_X,y); y+=LINE_HEIGHT;} y+=2;}); return y; };
const renderPdfFooter = (doc: jsPDF, model: UnifiedDocumentModel, y: number): number => { y=ensurePage(doc,y,24); doc.setFont('helvetica','bold'); doc.text('Signatures',PAGE_MARGIN_X,y); y+=LINE_HEIGHT; model.footer.signatures.forEach((r)=>{ y=ensurePage(doc,y,LINE_HEIGHT); doc.setFont('helvetica','normal'); doc.text(`${signatureLabel[r]}: ____________________`,PAGE_MARGIN_X,y); y+=LINE_HEIGHT;}); [model.footer.companyStampLabel, model.footer.metadata].forEach((line)=>{ if(line){ y=ensurePage(doc,y,LINE_HEIGHT); doc.text(line,PAGE_MARGIN_X,y); y+=LINE_HEIGHT;}}); return y; };

export const DocumentRenderer = {
  renderToPDF(model: UnifiedDocumentModel): void {
    if (modelHasArabicText(model)) {
      renderRtlPrintPreview(model);
      return;
    }

    const doc = newDoc();
    let y = PAGE_MARGIN_Y;
    y = renderPdfHeader(doc, model, y);
    y = renderPdfKpis(doc, model, y);
    y = renderPdfTables(doc, model, y);
    renderPdfFooter(doc, model, y);
    doc.save(`${model.fileName}.pdf`);
  },
};
