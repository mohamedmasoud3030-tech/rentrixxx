import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, title, children }) => {
    const componentRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = () => {
        const content = componentRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'height=800,width=1000');
        if (printWindow) {
            printWindow.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>طباعة</title>');
            printWindow.document.write(`
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body { 
                        font-family: 'Cairo', sans-serif;
                        direction: rtl;
                        color: #333;
                        width: 210mm;
                        height: 297mm;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    .print-container {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 15mm;
                        page-break-after: always;
                        background: white;
                    }
                    .page-break { page-break-after: always; break-after: page; }
                    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
                    thead { background-color: #f2f2f2; }
                    h1, h2, h3, h4 { margin-bottom: 1rem; color: #1e3a8a; }
                    .print-header {
                        text-align: center;
                        border-bottom: 3px solid #1e3a8a;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: 700; }
                    .text-sm { font-size: 0.875rem; }
                    .text-text-muted { color: #666; }
                    @media print {
                        body { margin: 0 !important; padding: 0 !important; width: 210mm; height: 297mm; }
                        .print-container { margin: 0 !important; padding: 15mm; }
                        .no-print { display: none !important; }
                    }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write(content.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4">
            <div className="bg-slate-200 dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl h-[95vh] flex flex-col">
                <div className="bg-white dark:bg-slate-800 p-3 flex justify-between items-center rounded-t-lg border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white">
                            <Printer size={18} />
                            طباعة / حفظ PDF
                        </button>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <div className="p-5 overflow-y-auto flex-1">
                    <div ref={componentRef} className="bg-card text-text shadow-lg mx-auto p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintPreviewModal;