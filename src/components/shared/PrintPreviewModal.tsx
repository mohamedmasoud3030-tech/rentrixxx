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

        const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(node => node.outerHTML)
            .join('\n');

        const printWindow = window.open('', '', 'height=800,width=1000');
        if (!printWindow) return;

        printWindow.document.write('<!DOCTYPE html><html><head><title>طباعة</title>');
        printWindow.document.write(`
            ${headStyles}
            <style>
                body {
                    font-family: 'Cairo', sans-serif;
                    direction: rtl;
                    margin: 0;
                    padding: 16px;
                    background: #fff;
                    color: #333;
                }
                #print-root {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    #print-root {
                        max-width: 100%;
                    }
                }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<div id="print-root">${content.innerHTML}</div>`);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
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
