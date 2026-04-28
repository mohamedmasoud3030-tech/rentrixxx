import { jsPDF } from 'jspdf';
import type { UnifiedDocumentModel, SignatureRole } from './types';

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

export const DocumentRenderer = {
  renderToPDF(model: UnifiedDocumentModel): void {
    const doc = newDoc();
    let y = PAGE_MARGIN_Y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(model.header.companyName || 'Rentrix', PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (model.header.companyAddress) {
      doc.text(model.header.companyAddress, PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;
    }
    if (model.header.companyPhone) {
      doc.text(model.header.companyPhone, PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(model.header.title, PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (model.header.documentNo) {
      doc.text(`No: ${model.header.documentNo}`, PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;
    }
    if (model.header.dateLabel && model.header.dateValue) {
      doc.text(`${model.header.dateLabel}: ${model.header.dateValue}`, PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;
    }

    y += 2;
    model.kpis.forEach((kpi) => {
      y = ensurePage(doc, y, LINE_HEIGHT);
      doc.setFont('helvetica', 'bold');
      doc.text(`${kpi.label}:`, PAGE_MARGIN_X, y);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.value, PAGE_MARGIN_X + 55, y);
      y += LINE_HEIGHT;
    });

    y += 2;
    model.tables.forEach((table) => {
      y = ensurePage(doc, y, 20);
      if (table.title) {
        doc.setFont('helvetica', 'bold');
        doc.text(table.title, PAGE_MARGIN_X, y);
        y += LINE_HEIGHT;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(table.columns.join(' | '), PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;

      doc.setFont('helvetica', 'normal');
      table.rows.forEach((row) => {
        y = ensurePage(doc, y, LINE_HEIGHT);
        doc.text(row.join(' | '), PAGE_MARGIN_X, y);
        y += LINE_HEIGHT;
      });

      if (table.totals?.length) {
        y = ensurePage(doc, y, LINE_HEIGHT);
        doc.setFont('helvetica', 'bold');
        doc.text(table.totals.join(' | '), PAGE_MARGIN_X, y);
        y += LINE_HEIGHT;
      }

      y += 2;
    });

    if (model.charts?.length) {
      y = ensurePage(doc, y, 12);
      doc.setFont('helvetica', 'bold');
      doc.text('Charts', PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;
      doc.setFont('helvetica', 'normal');
      model.charts.forEach((chart) => {
        y = ensurePage(doc, y, LINE_HEIGHT);
        doc.text(`${chart.kind.toUpperCase()} - ${chart.title}`, PAGE_MARGIN_X, y);
        y += LINE_HEIGHT;
      });
    }

    y = ensurePage(doc, y, 24);
    doc.setFont('helvetica', 'bold');
    doc.text('Signatures', PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;
    model.footer.signatures.forEach((role) => {
      y = ensurePage(doc, y, LINE_HEIGHT);
      doc.setFont('helvetica', 'normal');
      doc.text(`${signatureLabel[role]}: ____________________`, PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;
    });

    if (model.footer.companyStampLabel) {
      y = ensurePage(doc, y, LINE_HEIGHT);
      doc.text(model.footer.companyStampLabel, PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;
    }

    if (model.footer.metadata) {
      y = ensurePage(doc, y, LINE_HEIGHT);
      doc.text(model.footer.metadata, PAGE_MARGIN_X, y);
    }

    doc.save(`${model.fileName}.pdf`);
  },
};
