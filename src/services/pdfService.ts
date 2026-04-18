// Updated PDF Service

import { PDFDocument } from 'pdf-lib';

export class PDFService {
    public async generatePDF(data: any): Promise<Uint8Array> {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        // Draw text on the page
        page.drawText(data.text, { x: 50, y: height - 50 });

        // Serialize the PDFDocument to bytes (a Uint8Array)
        const pdfBytes = await pdfDoc.save();
        return pdfBytes;
    }
    
    public async loadPDF(bytes: Uint8Array): Promise<void> {
        const pdfDoc = await PDFDocument.load(bytes);
        return pdfDoc;
    }
}