import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const PRINT_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
    font-family: 'Cairo', sans-serif;
    direction: rtl;
    color: #1e293b;
    background: white;
    font-size: 14px;
    line-height: 1.6;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
@page { size: A4; margin: 12mm; }

.print\\:hidden { display: none !important; }

h1, h2, h3, h4 { margin-bottom: 0.75rem; color: #1e3a8a; }
h3 { font-size: 1.1rem; }
h4 { font-size: 0.95rem; }

table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; }
thead tr, .bg-background { background-color: #f1f5f9 !important; }
tfoot tr { background-color: #e2e8f0 !important; font-weight: 700; }
tbody tr:nth-child(even) { background-color: #f8fafc; }

svg { max-width: 100%; height: auto; }

.font-bold { font-weight: 700; }
.font-black { font-weight: 900; }
.font-medium { font-weight: 500; }
.font-mono { font-family: 'Courier New', monospace; }
.font-semibold { font-weight: 600; }
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-base { font-size: 1rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-3xl { font-size: 1.875rem; }
.text-\\[10px\\] { font-size: 10px; }
.uppercase { text-transform: uppercase; }
.tracking-wide { letter-spacing: 0.025em; }
.tracking-widest { letter-spacing: 0.1em; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.underline { text-decoration: underline; }
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
[dir="ltr"] { direction: ltr; }

.flex { display: flex; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.items-center { align-items: center; }
.items-start { align-items: start; }
.items-end { align-items: flex-end; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1 1 0%; }
.flex-shrink-0 { flex-shrink: 0; }

.gap-1 { gap: 0.25rem; }
.gap-1\\.5 { gap: 0.375rem; }
.gap-2 { gap: 0.5rem; }
.gap-2\\.5 { gap: 0.625rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lg\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.lg\\:col-span-2 { grid-column: span 2 / span 2; }

.w-full { width: 100%; }
.min-w-0 { min-width: 0; }
.h-48 { height: 12rem; }
.h-56 { height: 14rem; }
.h-72 { height: 18rem; }

.p-2 { padding: 0.5rem; }
.p-2\\.5 { padding: 0.625rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-8 { padding: 2rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.pb-1 { padding-bottom: 0.25rem; }
.pb-2 { padding-bottom: 0.5rem; }
.pt-3 { padding-top: 0.75rem; }

.m-0 { margin: 0; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mt-2 { margin-top: 0.5rem; }
.mr-2 { margin-right: 0.5rem; }
.mr-auto { margin-right: auto; }

.space-y-2 > * + * { margin-top: 0.5rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }

.border { border: 1px solid #e2e8f0; }
.border-b { border-bottom: 1px solid #e2e8f0; }
.border-t { border-top: 1px solid #e2e8f0; }
.border-border { border-color: #e2e8f0; }
.border-b-2 { border-bottom-width: 2px; }
.border-t-2 { border-top-width: 2px; }
.border-emerald-500, .border-emerald-500 { border-color: #10b981; }
.border-red-500 { border-color: #ef4444; }
.border-emerald-200 { border-color: #a7f3d0; }
.border-emerald-800 { border-color: #065f46; }
.border-red-200 { border-color: #fecaca; }
.border-red-800 { border-color: #991b1b; }

.rounded { border-radius: 0.25rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-full { border-radius: 9999px; }
.rounded-t-lg { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
.overflow-hidden { overflow: hidden; }
.overflow-x-auto { overflow-x: auto; }

.bg-card, .bg-white { background-color: #ffffff !important; }
.bg-background, .bg-slate-50 { background-color: #f1f5f9 !important; }

.bg-blue-50 { background-color: #eff6ff !important; }
.bg-blue-100 { background-color: #dbeafe !important; }
.bg-green-100 { background-color: #dcfce7 !important; }
.bg-green-800 { background-color: #166534 !important; }
.bg-emerald-50 { background-color: #ecfdf5 !important; }
.bg-emerald-100 { background-color: #d1fae5 !important; }
.bg-red-50 { background-color: #fef2f2 !important; }
.bg-red-100 { background-color: #fee2e2 !important; }
.bg-amber-100 { background-color: #fef3c7 !important; }
.bg-yellow-100 { background-color: #fef9c3 !important; }
.bg-orange-100 { background-color: #ffedd5 !important; }
.bg-purple-100 { background-color: #f3e8ff !important; }
.bg-indigo-100 { background-color: #e0e7ff !important; }
.bg-gray-100 { background-color: #f3f4f6 !important; }

.dark\\:bg-blue-900\\/20, .dark\\:bg-emerald-900\\/20, .dark\\:bg-red-900\\/20,
.dark\\:bg-green-900\\/40, .dark\\:bg-green-900\\/50, .dark\\:bg-emerald-900\\/40,
.dark\\:bg-red-900\\/40, .dark\\:bg-amber-900\\/40, .dark\\:bg-amber-900\\/50,
.dark\\:bg-yellow-900\\/50, .dark\\:bg-purple-900\\/40, .dark\\:bg-indigo-900\\/40 {
    /* ignore dark mode in print */ }

.text-text { color: #1e293b; }
.text-text-muted { color: #64748b; }
.text-white { color: #ffffff; }
.text-blue-600 { color: #2563eb; }
.text-blue-700 { color: #1d4ed8; }
.text-blue-800 { color: #1e40af; }
.text-green-600 { color: #16a34a; }
.text-green-700 { color: #15803d; }
.text-green-800 { color: #166534; }
.text-green-300 { color: #86efac; }
.text-emerald-500 { color: #10b981; }
.text-emerald-600 { color: #059669; }
.text-green-500 { color: #22c55e; }
.text-red-500 { color: #ef4444; }
.text-red-600 { color: #dc2626; }
.text-red-700 { color: #b91c1c; }
.text-amber-600 { color: #d97706; }
.text-amber-700 { color: #b45309; }
.text-amber-300 { color: #fcd34d; }
.text-yellow-600 { color: #ca8a04; }
.text-yellow-700 { color: #a16207; }
.text-orange-600 { color: #ea580c; }
.text-orange-700 { color: #c2410c; }
.text-purple-600 { color: #9333ea; }
.text-purple-700 { color: #7e22ce; }
.text-indigo-600 { color: #4f46e5; }
.text-gray-700 { color: #374151; }
.text-primary { color: #1e3a8a; }

.bg-primary\\/5 { background-color: rgba(30, 58, 138, 0.05) !important; }
.bg-background\\/50 { background-color: rgba(241, 245, 249, 0.5) !important; }

.opacity-60 { opacity: 0.6; }
.last\\:border-0:last-child { border: 0; }
.border-border\\/50 { border-color: rgba(226, 232, 240, 0.5); }

.recharts-responsive-container { width: 100% !important; }
.recharts-wrapper { width: 100% !important; }

.print-header {
    text-align: center;
    border-bottom: 3px solid #1e3a8a;
    padding-bottom: 15px;
    margin-bottom: 20px;
}

.page-break { page-break-after: always; break-after: page; }

@media print {
    body { margin: 0 !important; padding: 0 !important; }
    .no-print, .print\\:hidden { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, title, children }) => {
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = componentRef.current;
        if (!content) return;

        const clone = content.cloneNode(true) as HTMLElement;

        clone.querySelectorAll('svg').forEach(svg => {
            if (!svg.getAttribute('xmlns')) {
                svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
        });

        const computedStyles: string[] = [];
        clone.querySelectorAll('[style]').forEach(el => {
            const id = 'ps-' + Math.random().toString(36).slice(2, 9);
            el.setAttribute('data-print-id', id);
            computedStyles.push(`[data-print-id="${id}"] { ${(el as HTMLElement).style.cssText} }`);
        });

        const printWindow = window.open('', '', 'height=900,width=1100');
        if (printWindow) {
            printWindow.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>');
            printWindow.document.write(title);
            printWindow.document.write('</title><style>');
            printWindow.document.write(PRINT_STYLES);
            if (computedStyles.length > 0) {
                printWindow.document.write(computedStyles.join('\n'));
            }
            printWindow.document.write('</style></head><body>');
            printWindow.document.write('<div style="padding: 8mm;">');
            printWindow.document.write(clone.innerHTML);
            printWindow.document.write('</div>');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-2 sm:p-4 md:p-6">
            <div className="bg-slate-200 dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-6xl h-[97vh] sm:h-[95vh] flex flex-col">
                <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 flex justify-between items-center rounded-t-xl border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-base sm:text-lg font-bold">{title}</h3>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-3 sm:px-4 min-h-[40px] rounded-lg bg-primary text-white text-sm font-bold">
                            <Printer size={18} />
                            طباعة / حفظ PDF
                        </button>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 w-10 h-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                            <X size={22} />
                        </button>
                    </div>
                </div>
                <div className="p-3 sm:p-5 md:p-6 overflow-y-auto flex-1">
                    <div ref={componentRef} className="bg-card text-text shadow-lg mx-auto p-4 sm:p-6 md:p-8 w-full max-w-[1080px]">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintPreviewModal;
