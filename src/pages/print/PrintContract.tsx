import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatDate, toArabicDigits } from '../../utils/helpers';
import { Printer, ArrowRight } from 'lucide-react';
import DocumentHeader from '../../components/shared/DocumentHeader';

const PrintContract: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { db } = useApp();
    const navigate = useNavigate();

    const contract = db.contracts.find(c => c.id === id);
    if (!contract) return <div className="p-10 text-center">العقد غير موجود.</div>;
    
    const tenant = db.tenants.find(t => t.id === contract.tenantId);
    const unit = db.units.find(u => u.id === contract.unitId);
    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
    const company = db.settings.general.company;

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen">
             <div className="p-4 bg-card shadow-md print:hidden flex justify-between items-center">
                <h3 className="font-bold text-lg">معاينة طباعة العقد</h3>
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
            <div className="p-4">
                <div className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto p-10 border border-black text-sm leading-relaxed shadow-lg">
                    <DocumentHeader docTitle="عقد إيجار" />

                    <main>
                        <p className="mb-4">
                            تم تحرير هذا العقد في يوم ............ الموافق <span className="font-bold">{formatDate(new Date().toISOString())}</span> بين كل من:
                        </p>

                        <div className="mb-6 p-3 border border-black">
                            <p>
                                <span className="font-bold">الطرف الأول (المؤجر):</span> {company.name}، ويمثله في هذا العقد ..................................
                            </p>
                            <p>
                                العنوان: {company.address}، هاتف: {company.phone}
                            </p>
                        </div>
                        
                        <div className="mb-6 p-3 border border-black">
                            <p>
                                <span className="font-bold">الطرف الثاني (المستأجر):</span> {tenant?.name}
                            </p>
                            <p>
                                رقم الهوية: {tenant?.idNo}، هاتف: {tenant?.phone}
                            </p>
                        </div>

                        <h2 className="text-lg font-bold mt-8 mb-4 border-b border-black pb-1">البند الأول: العين المؤجرة</h2>
                        <p>
                            أجر الطرف الأول للطرف الثاني ما هو العين المؤجرة وهي عبارة عن {unit?.type} رقم ({unit?.name}) بالعقار الكائن في {property?.location} والمسمى بـ "{property?.name}".
                        </p>

                        <h2 className="text-lg font-bold mt-6 mb-4 border-b border-black pb-1">البند الثاني: مدة الإيجار</h2>
                        <p>
                            مدة هذا العقد هي سنة ميلادية تبدأ من تاريخ <span className="font-bold">{formatDate(contract.start)}</span> وتنتهي في <span className="font-bold">{formatDate(contract.end)}</span>.
                        </p>

                        <h2 className="text-lg font-bold mt-6 mb-4 border-b border-black pb-1">البند الثالث: القيمة الإيجارية</h2>
                        <p>
                            تم هذا الإيجار بقيمة إيجارية شهرية قدرها <span className="font-bold">{formatCurrency(contract.rent, db.settings.operational.currency)}</span>، ويتعهد الطرف الثاني بسداد الإيجار في موعد أقصاه يوم {toArabicDigits(contract.dueDay)} من كل شهر ميلادي.
                        </p>
                        
                        <h2 className="text-lg font-bold mt-6 mb-4 border-b border-black pb-1">البند الرابع: التأمين</h2>
                         <p>
                            دفع الطرف الثاني للطرف الأول مبلغاً وقدره <span className="font-bold">{formatCurrency(contract.deposit, db.settings.operational.currency)}</span> كتأمين، لا يرد إلا عند انتهاء العقد وتسليم العين المؤجرة بالحالة التي كانت عليها.
                        </p>

                        <h2 className="text-lg font-bold mt-6 mb-4 border-b border-black pb-1">البند الخامس: أحكام عامة</h2>
                        <ul className="list-decimal list-inside space-y-2 pr-4">
                            <li>يقر المستأجر بأنه عاين الوحدة ووجدها صالحة للغرض الذي استأجرها من أجله.</li>
                            <li>لا يجوز للمستأجر تأجير الوحدة من الباطن أو التنازل عنها للغير.</li>
                            <li>جميع استهلاكات المياه والكهرباء والغاز والصيانة على عاتق المستأجر.</li>
                        </ul>

                        <p className="mt-8">
                            حرر هذا العقد من نسختين، بيد كل طرف نسخة للعمل بموجبها عند اللزوم.
                        </p>
                    </main>

                    <footer className="mt-24 flex justify-around text-center">
                        <div>
                            <p className="font-bold">توقيع الطرف الأول (المؤجر)</p>
                            <p className="mt-16">.........................</p>
                        </div>
                        <div>
                            <p className="font-bold">توقيع الطرف الثاني (المستاجر)</p>
                            <p className="mt-16">.........................</p>
                        </div>
                    </footer>
                </div>
            </div>
            <style>{`
                @media print {
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
                    .min-h-\\[297mm\\] { min-height: 0; height: auto; }
                     div, p, h2, footer, main, header, ul, li {
                       page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
};

export default PrintContract;
