import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { Printer, ArrowRight } from 'lucide-react';
import DocumentHeader from '../../components/shared/DocumentHeader';

const PrintReceipt: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { db } = useApp();
    const navigate = useNavigate();

    const receipt = db.receipts.find(r => r.id === id);
    if (!receipt) return <div className="p-10 text-center">سند القبض غير موجود.</div>;

    const contract = db.contracts.find(c => c.id === receipt.contractId);
    const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
    const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;

    const receiptPurpose = `وذلك عن دفعة إيجار للوحدة ${unit?.name || ''} بالعقار ${property?.name || ''}`;

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen">
            <div className="p-4 bg-card shadow-md print:hidden flex justify-between items-center">
                <h3 className="font-bold text-lg">معاينة طباعة السند</h3>
                <div className="flex items-center gap-4">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white">
                        <Printer size={18} />
                        طباعة
                    </button>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border">
                        <ArrowRight size={18} />
                        رجوع
                    </button>
                </div>
            </div>
            <div className="p-4 font-['Cairo']" dir="rtl">
                <div className="bg-white text-black w-[210mm] h-[148mm] mx-auto p-10 border-2 border-black flex flex-col shadow-lg">
                    <DocumentHeader
                        docTitle="سند قبض"
                        docNo={receipt.no}
                        docDate={formatDateTime(receipt.dateTime)}
                    />

                    <main className="mt-4 text-lg flex-grow">
                        <div className="flex items-center mb-5">
                            <span className="w-48 font-bold">استلمنا من السيد/السادة:</span>
                            <span>{tenant?.name || 'غير معروف'}</span>
                        </div>
                        <div className="flex items-center mb-5">
                            <span className="w-48 font-bold">مبلغا وقدره:</span>
                            <span className="font-bold text-xl px-4 py-2 border-2 border-black rounded-md bg-gray-100">
                                {formatCurrency(receipt.amount, db.settings.operational.currency)}
                            </span>
                        </div>
                        <div className="flex items-start mb-5">
                            <span className="w-48 font-bold">وذلك عن:</span>
                            <span className="flex-1">{receiptPurpose}</span>
                        </div>
                        <div className="flex items-center mb-5">
                            <span className="w-48 font-bold">طريقة الدفع:</span>
                            <span>{receipt.channel === 'CASH' ? 'نقدي' : receipt.channel === 'BANK' ? 'تحويل بنكي' : receipt.channel === 'POS' ? 'شبكة' : 'أخرى'}</span>
                        </div>
                        {receipt.notes && (
                            <div className="flex items-start">
                                <span className="w-48 font-bold">ملاحظات:</span>
                                <span className="flex-1">{receipt.notes}</span>
                            </div>
                        )}
                    </main>

                    <footer className="mt-8 grid grid-cols-3 gap-6 text-center">
                        <div>
                            <p className="font-bold">توقيع المستلم</p>
                            <div className="mt-10 border-b border-black h-8" />
                            <p className="text-xs mt-1">الاسم</p>
                        </div>
                        <div>
                            <p className="font-bold">توقيع المستأجر</p>
                            <div className="mt-10 border-b border-black h-8" />
                            <p className="text-xs mt-1">الاسم</p>
                        </div>
                        <div>
                            <p className="font-bold">اعتماد المكتب</p>
                            <div className="mt-10 border-b border-black h-8" />
                            <p className="text-xs mt-1">توقيع وختم</p>
                        </div>
                    </footer>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A5 landscape; }
                    body { -webkit-print-color-adjust: exact; }
                    .print\\:hidden { display: none; }
                    .p-4 { padding: 0; }
                    .bg-slate-100 { background-color: white !important; }
                    .min-h-screen { min-height: 0; }
                    .w-\\[210mm\\] {
                        width: 100%;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .h-\\[148mm\\] { height: 100vh; }
                    div { page-break-inside: avoid; }
                }
            `}</style>
        </div>
    );
};

export default PrintReceipt;
