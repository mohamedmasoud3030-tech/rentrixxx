import { jsPDF } from 'jspdf';
import type { SignatureRole, UnifiedDocumentModel } from './types';

const ARABIC_REGEX = /[\u0600-\u06FF]/;
const DEFAULT_SIGNATURE_LABELS = new Set(['توقيع المالك', 'توقيع المستأجر', 'توقيع المحاسب', 'توقيع المدير العام']);
const signatureLabel: Record<SignatureRole, string> = { owner: 'توقيع المالك', tenant: 'توقيع المستأجر', accountant: 'توقيع المحاسب', general_manager: 'توقيع المدير العام' };
const PAGE_MARGIN_X = 14; const PAGE_MARGIN_Y = 16; const LINE_HEIGHT = 7;
const newDoc = (): jsPDF => new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
const ensurePage = (doc: jsPDF, y: number, needed = 10): number => (y + needed < 285 ? y : (doc.addPage(), PAGE_MARGIN_Y));

export const collectDocumentTextChunks = (model: UnifiedDocumentModel): string[] => {
  const signatureTexts = model.footer.signatures.map((role) => signatureLabel[role]).filter((label) => !DEFAULT_SIGNATURE_LABELS.has(label));
  return [model.header.companyName, model.header.companyAddress, model.header.companyPhone, model.header.title, model.header.documentNo, model.header.dateLabel, model.header.dateValue, ...model.metadata?.flatMap((item) => [item.label, item.value]) ?? [], ...model.kpis.flatMap((k) => [k.label, k.value]), ...model.tables.flatMap((t) => [t.title, ...t.columns, ...t.rows.flat(), ...(t.totals ?? [])]), ...(model.footer.notes ?? []), model.footer.companyStampLabel, model.footer.metadata, ...signatureTexts].filter((v): v is string => Boolean(v));
};
const modelHasArabicText = (model: UnifiedDocumentModel): boolean => collectDocumentTextChunks(model).some((x) => ARABIC_REGEX.test(x));
const buildHtmlRows = (rows: string[][]) => rows.map((r) => {
  const cellsHtml = r.map((c) => `<td>${c}</td>`).join('');
  return `<tr>${cellsHtml}</tr>`;
}).join('');
const buildHtmlTable = (table: UnifiedDocumentModel['tables'][number]) => {
  const tableHead = table.columns.map((column) => `<th>${column}</th>`).join('');
  const footerCells = table.totals?.map((total) => `<th>${total}</th>`).join('') ?? '';
  const tableFootMarkup = `<tfoot><tr>${footerCells}</tr></tfoot>`;
  const hasTotals = Boolean(table.totals?.length);
  const tableFoot = hasTotals ? tableFootMarkup : '';
  return `<section><h3>${table.title ?? ''}</h3><table><thead><tr>${tableHead}</tr></thead><tbody>${buildHtmlRows(table.rows)}</tbody>${tableFoot}</table></section>`;
};
export const buildRtlPrintHtml = (model: UnifiedDocumentModel) => {
  const kpiHtml = model.kpis.map((k) => `<article class="kpi-card"><span>${k.label}</span><strong>${k.value}</strong></article>`).join('');
  const metadataHtml = (model.metadata ?? []).map((item) => `<article class="meta-item"><span>${item.label}</span><strong>${item.value}</strong></article>`).join('');
  const notesHtml = (model.footer.notes ?? []).map((note) => `<li>${note}</li>`).join('');
  const signaturesHtml = model.footer.signatures.map((role) => `<p>${signatureLabel[role]}: ____________________</p>`).join('');
  return [
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>',
    '<style>@page{size:A4;margin:8mm 10mm}*{box-sizing:border-box}body{margin:0;font-family:"Tahoma","Segoe UI","Noto Naskh Arabic","Arial",sans-serif;font-size:10.5px;line-height:1.4;color:#111;word-break:break-word;overflow-wrap:anywhere}.sheet{padding:2mm 0}.block{border:1px solid #d7d7d7;border-radius:8px;padding:8px;margin-bottom:6px;break-inside:avoid;page-break-inside:avoid}.meta-grid,.kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.meta-item,.kpi-card{padding:5px;border:1px solid #ececec;border-radius:6px;break-inside:avoid}.meta-item span,.kpi-card span{display:block;font-size:9px;color:#444}h1{font-size:17px;margin:0 0 4px}h2{font-size:13px;margin:0 0 3px}h3{font-size:11px;margin:0 0 4px}table{width:100%;border-collapse:collapse;font-size:9.6px;table-layout:fixed}td,th{border:1px solid #ddd;padding:3px 4px;text-align:right;vertical-align:top}tr{break-inside:avoid;page-break-inside:avoid}ul{margin:0;padding-inline-start:14px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.screen-only{display:none}}</style>',
    '</head><body>',
    '<main class="sheet">',
    `<section class="block"><h2>${model.header.companyName}</h2><h1>${model.header.title}</h1></section>`,
    metadataHtml ? `<section class="block"><h3>بيانات المستند</h3><div class="meta-grid">${metadataHtml}</div></section>` : '',
    kpiHtml ? `<section class="block"><h3>الملخص التشغيلي</h3><div class="kpi-grid">${kpiHtml}</div></section>` : '',
    model.tables.map(buildHtmlTable).join(''),
    notesHtml ? `<section class="block"><h3>ملاحظات</h3><ul>${notesHtml}</ul></section>` : '',
    '<h3>التواقيع</h3>',
    `<section class="block">${signaturesHtml}</section>`,
    `<p>${model.footer.companyStampLabel ?? ''}</p>`,
    `<p>${model.footer.metadata ?? ''}</p>`,
    '</main></body></html>',
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
  const cleanup = () => {
    w.removeEventListener('load', onLoad);
    URL.revokeObjectURL(objectUrl);
  };
  const onLoad = () => {
    w.focus();
    w.print();
    cleanup();
  };
  w.addEventListener('load', onLoad);
  w.onbeforeunload = cleanup;
  w.location.replace(objectUrl);
};

const renderPdfHeader = (doc: jsPDF, model: UnifiedDocumentModel, y: number): number => { doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text(model.header.companyName || 'Rentrix', PAGE_MARGIN_X, y); y+=LINE_HEIGHT; doc.setFont('helvetica','normal'); doc.setFontSize(9); [model.header.companyAddress, model.header.companyPhone].forEach((line)=>{ if(line){doc.text(line, PAGE_MARGIN_X, y); y+=LINE_HEIGHT;}}); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text(model.header.title, PAGE_MARGIN_X, y); y+=LINE_HEIGHT; doc.setFont('helvetica','normal'); doc.setFontSize(10); if(model.header.documentNo){doc.text(`No: ${model.header.documentNo}`, PAGE_MARGIN_X,y); y+=LINE_HEIGHT;} if(model.header.dateLabel&&model.header.dateValue){doc.text(`${model.header.dateLabel}: ${model.header.dateValue}`, PAGE_MARGIN_X,y); y+=LINE_HEIGHT;} return y+2; };
const renderPdfKpis = (doc: jsPDF, model: UnifiedDocumentModel, y: number): number => { model.kpis.forEach((k)=>{ y=ensurePage(doc,y,LINE_HEIGHT); doc.setFont('helvetica','bold'); doc.text(`${k.label}:`,PAGE_MARGIN_X,y); doc.setFont('helvetica','normal'); doc.text(k.value,PAGE_MARGIN_X+55,y); y+=LINE_HEIGHT;}); return y+2; };
const renderPdfTables = (doc: jsPDF, model: UnifiedDocumentModel, y: number): number => { model.tables.forEach((t)=>{ y=ensurePage(doc,y,20); if(t.title){doc.setFont('helvetica','bold'); doc.text(t.title,PAGE_MARGIN_X,y); y+=LINE_HEIGHT;} doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(t.columns.join(' | '),PAGE_MARGIN_X,y); y+=LINE_HEIGHT; doc.setFont('helvetica','normal'); t.rows.forEach((r)=>{ y=ensurePage(doc,y,LINE_HEIGHT); doc.text(r.join(' | '),PAGE_MARGIN_X,y); y+=LINE_HEIGHT;}); if(t.totals?.length){ y=ensurePage(doc,y,LINE_HEIGHT); doc.setFont('helvetica','bold'); doc.text(t.totals.join(' | '),PAGE_MARGIN_X,y); y+=LINE_HEIGHT;} y+=2;}); return y; };
const renderPdfFooter = (doc: jsPDF, model: UnifiedDocumentModel, y: number): number => { y=ensurePage(doc,y,24); doc.setFont('helvetica','bold'); doc.text('Signatures',PAGE_MARGIN_X,y); y+=LINE_HEIGHT; model.footer.signatures.forEach((r)=>{ y=ensurePage(doc,y,LINE_HEIGHT); doc.setFont('helvetica','normal'); const signatureText = `${signatureLabel[r]}: ____________________`; doc.text(signatureText,PAGE_MARGIN_X,y); y+=LINE_HEIGHT;}); [model.footer.companyStampLabel, model.footer.metadata].forEach((line)=>{ if(line){ y=ensurePage(doc,y,LINE_HEIGHT); doc.text(line,PAGE_MARGIN_X,y); y+=LINE_HEIGHT;}}); return y; };

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
