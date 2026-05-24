import type { DocumentKV, DocumentRenderModel, DocumentTable } from '../documentTypes';

const emptyValue = '—';

const esc = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const val = (value?: string) => (value?.trim() ? value : emptyValue);
const join = (parts: readonly string[]) => parts.join('');

function wrap(tagName: string, content: string, attributes = ''): string {
  const attributeText = attributes ? ` ${attributes}` : '';
  return `<${tagName}${attributeText}>${content}</${tagName}>`;
}

function renderCard(item: DocumentKV): string {
  return wrap('article', join([
    wrap('span', esc(item.label)),
    wrap('strong', esc(val(item.value))),
  ]), 'class="card"');
}

function renderSection(title: string, items?: readonly DocumentKV[]): string {
  if (items?.length) {
    return wrap('section', join([
      wrap('h3', esc(title)),
      wrap('div', items.map(renderCard).join(''), 'class="grid"'),
    ]), 'class="section"');
  }
  return '';
}

function renderTableHeadCell(column: string): string {
  return wrap('th', esc(column));
}

function renderTableCell(cell: string): string {
  return wrap('td', esc(val(cell)));
}

function renderTableRow(row: readonly string[]): string {
  return wrap('tr', row.map(renderTableCell).join(''));
}

function renderTableTotals(totals?: readonly string[]): string {
  if (totals?.length) {
    const cells = totals.map((value) => wrap('th', esc(value))).join('');
    return wrap('tfoot', wrap('tr', cells));
  }
  return '';
}

function renderTable(tableModel: DocumentTable): string {
  const header = wrap('thead', wrap('tr', tableModel.columns.map(renderTableHeadCell).join('')));
  const body = wrap('tbody', tableModel.rows.map(renderTableRow).join(''));
  const tableMarkup = wrap('table', join([header, body, renderTableTotals(tableModel.totals)]));

  return wrap('section', join([
    wrap('h3', esc(tableModel.title)),
    wrap('div', tableMarkup, 'class="table-wrap"'),
  ]), 'class="section"');
}

function renderToolbar(withToolbar: boolean): string {
  if (withToolbar) {
    return '<div class="preview-toolbar"><button onclick="window.print()">طباعة</button><button onclick="window.close()">إغلاق</button></div>';
  }
  return '';
}

function renderDocumentStyles(model: DocumentRenderModel): string {
  const primaryColor = esc(model.branding.primaryColor ?? '#1d4ed8');
  return join([
    '<style>',
    `@page{size:A4 ${model.orientation};margin:10mm}`,
    '*{box-sizing:border-box}',
    'body{margin:0;background:#e5e7eb;font-family:Tahoma,Arial,sans-serif}',
    '.preview-toolbar{position:sticky;top:0;background:#111827;color:#fff;padding:8px;display:flex;gap:8px;justify-content:center}',
    '.preview-toolbar button{padding:8px 10px;border:0;border-radius:8px}',
    '.preview-area{padding:16px;overflow:auto}',
    '.sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:12mm;box-shadow:0 14px 44px rgba(0,0,0,.2)}',
    '.header-top{display:flex;justify-content:space-between;gap:12px}',
    '.company-side{display:flex;gap:8px;align-items:flex-start}',
    '.logo-box{width:52px;height:52px;border:1px solid #cbd5e1;display:grid;place-items:center;font-weight:700}',
    '.document-meta-side{text-align:start}',
    '.header-title{text-align:center}',
    `.header-divider{height:3px;background:${primaryColor};margin-top:8px}`,
    '.section{border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-top:8px}',
    '.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '.card{border:1px solid #e2e8f0;padding:6px}',
    '.card span{font-size:11px;color:#64748b;display:block}',
    'table{width:100%;border-collapse:collapse}',
    'th,td{border:1px solid #cbd5e1;padding:6px;text-align:inherit}',
    '.footer{margin-top:12px;font-size:11px}',
    '@media print{body{background:#fff}.preview-toolbar,.preview-area{padding:0}.preview-toolbar{display:none}.sheet{margin:0;box-shadow:none;width:auto;min-height:auto;padding:0}}',
    '</style>',
  ]);
}

function renderLogo(model: DocumentRenderModel): string {
  if (model.branding.logoUrl) {
    const src = esc(model.branding.logoUrl);
    return `<img src="${src}" alt="logo" style="max-width:100%;max-height:100%"/>`;
  }
  return esc(model.branding.companyName.slice(0, 1) || 'R');
}

function renderCompanyRegistrationLine(model: DocumentRenderModel): string {
  const taxText = model.branding.taxNumber ? `ض.ر ${model.branding.taxNumber}` : '';
  const registrationText = model.branding.commercialRegistration ? `س.ت ${model.branding.commercialRegistration}` : '';
  return esc(val([taxText, registrationText].filter(Boolean).join(' / ')));
}

function renderCompanyInfo(model: DocumentRenderModel): string {
  const contactLine = [model.branding.companyPhone, model.branding.companyEmail].filter(Boolean).join(' / ');
  return wrap('div', join([
    wrap('h2', esc(model.branding.companyName)),
    wrap('p', esc(val(model.branding.companyAddress))),
    wrap('p', esc(val(contactLine)), 'dir="ltr"'),
    wrap('p', renderCompanyRegistrationLine(model)),
  ]), 'class="company-info"');
}

function renderHeaderMeta(model: DocumentRenderModel): string {
  const fallbackMeta = [{ label: 'تاريخ الإصدار', value: model.generatedAt }];
  const meta = model.headerMeta?.length ? model.headerMeta : fallbackMeta;
  const rows = meta.map((item) => {
    const label = wrap('strong', `${esc(item.label)}:`);
    return wrap('p', `${label} ${esc(val(item.value))}`);
  });
  return wrap('div', rows.join(''), 'class="document-meta-side"');
}

function renderHeader(model: DocumentRenderModel): string {
  const logoBox = wrap('div', renderLogo(model), 'class="logo-box"');
  const companySide = wrap('div', join([logoBox, renderCompanyInfo(model)]), 'class="company-side"');
  const headerTop = wrap('div', join([companySide, renderHeaderMeta(model)]), 'class="header-top"');
  const title = wrap('div', wrap('h1', esc(model.title)), 'class="header-title"');
  const divider = '<div class="header-divider"></div>';
  return wrap('header', join([headerTop, title, divider]), 'class="document-header"');
}

function renderNotes(notes?: readonly string[]): string {
  if (notes?.length) {
    const items = notes.map((note) => wrap('li', esc(note))).join('');
    return wrap('section', join([wrap('h3', 'ملاحظات'), wrap('ul', items)]), 'class="section"');
  }
  return '';
}

function renderFooter(model: DocumentRenderModel): string {
  const notes = (model.footerNotes ?? []).map((note) => wrap('p', esc(note))).join('');
  const signatures = model.signatureLabels?.length
    ? wrap('div', model.signatureLabels.map((label) => wrap('span', esc(label), 'style="margin-inline-end:12px"')).join(''))
    : '';
  return wrap('footer', join([notes, signatures]), 'class="footer"');
}

function renderBody(model: DocumentRenderModel, withToolbar: boolean): string {
  const tables = (model.tables ?? []).map(renderTable).join('');
  const sheet = wrap('main', join([
    renderHeader(model),
    renderSection('بيانات المستند', model.metadata),
    renderSection('الملخص', model.summaryItems),
    tables,
    renderNotes(model.notes),
    renderFooter(model),
  ]), 'class="sheet"');

  return join([
    renderToolbar(withToolbar),
    wrap('div', sheet, 'class="preview-area"'),
  ]);
}

export function renderSharedDocumentShell(model: DocumentRenderModel, withToolbar: boolean): string {
  return join([
    '<!doctype html>',
    `<html lang="ar" dir="${model.direction}">`,
    '<head>',
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
    wrap('title', esc(model.title)),
    renderDocumentStyles(model),
    '</head>',
    '<body>',
    renderBody(model, withToolbar),
    '</body>',
    '</html>',
  ]);
}
