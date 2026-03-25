import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Contract, Receipt, Expense } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, toArabicDigits, getStatusBadgeClass, formatDateTime, formatDate, exportToCsv, CONTRACT_STATUS_AR } from '../utils/helpers';
import HardGateBanner from '../components/shared/HardGateBanner';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { FileText, Download, CheckCircle, AlertTriangle, Clock, Users, RefreshCw } from 'lucide-react';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { exportContractToPdf } from '../services/pdfService';
import { toast } from 'react-hot-toast';

const ContractPrintable: React.FC<{ contract: Contract }> = ({ contract }) => {
    const { db } = useApp();
    const tenant = db.tenants.find(t => t.id === contract.tenantId);
    const unit = db.units.find(u => u.id === contract.unitId);
    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
    const owner = property ? db.owners.find(o => o.id === property.ownerId) : null;
    const company = db.settings.general.company;
    
    return (
         <div className="bg-card text-text text-sm leading-relaxed font-['Cairo'] p-4" dir="rtl">
            <header className="text-center mb-6 pb-4 border-b-2 border-border">
                <h1 className="text-2xl font-bold">{company.name}</h1>
                <p className="text-xs">{company.address} - هاتف: {company.phone}</p>
                {company.crNumber && <p className="text-xs">س.ت: {company.crNumber}</p>}
            </header>
            <h2 className="text-2xl font-bold text-center underline mb-6">عقد إيجار</h2>

            <p className="mb-4">انه في يوم .../.../...... الموافق {formatDate(new Date(contract.createdAt).toISOString())} تم الاتفاق بين كل من الاطراف:</p>

            <div className="space-y-3 mb-4">
                <p><strong>الطرف الأول (المؤجر):</strong> {owner?.name || company.name}</p>
                <div className="grid grid-cols-2 gap-x-6 text-xs border border-border p-2 rounded-md">
                    <p><strong>الجنسية:</strong> ......................</p>
                    <p><strong>حامل الهوية رقم:</strong> ......................</p>
                    <p><strong>والمقيم في:</strong> {owner?.address || company.address}</p>
                    <p><strong>رقم الهاتف:</strong> {owner?.phone || company.phone}</p>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                <p><strong>الطرف الثاني (المستأجر):</strong> {tenant?.name}</p>
                <div className="grid grid-cols-2 gap-x-6 text-xs border border-border p-2 rounded-md">
                    <p><strong>الجنسية:</strong> {tenant?.nationality || '......................'}</p>
                    <p><strong>حامل الهوية رقم:</strong> {tenant?.idNo}</p>
                    <p><strong>والمقيم في:</strong> {property?.location}</p>
                    <p><strong>رقم الهاتف:</strong> {tenant?.phone}</p>
                </div>
            </div>
            
            <p className="mb-4">
               <strong>اسم الكفيل بالنسبة للوافدين:</strong> {contract.sponsorName || '......................'} <strong>هوية رقم:</strong> {contract.sponsorId || '......................'} <strong>الهاتف:</strong> {contract.sponsorPhone || '......................'}
            </p>

            <p className="font-bold mb-4">واتفق الطرفين علي النحو التالي:</p>

            <p className="mb-2">
                رغبة الطرف الثاني في الاستئجار في المبنى رقم ({property?.name}) الكائن في محافظة/ولاية/منطقة: {property?.location}.
                وهو عبارة عن {unit?.type} رقم ({unit?.name}).
            </p>
            <p className="mb-4">
                ويسري عقد الايجار لمدة سنة ميلادية تبدأ من تاريخ {formatDate(contract.start)} إلى تاريخ {formatDate(contract.end)}.
            </p>

            <div className="space-y-2 text-justify text-xs">
                <p><strong>1.</strong> يعتبر التمهيد السابق جزءًا لا يتجزأ من هذا العقد.</p>
                <p><strong>2.</strong> يتجدد العقد تلقائيا طبقا لاحكام المرسوم السلطاني رقم ( 89/6 ) في شان تنظيم العلاقه بين المؤجر والمستاجر سوي المساكن او المحلات التجاريه او الصناعيه وغيرها وتسجيل عقود الايجار الخاصه بها وتعديلاته ما لم يخطر المستاجرالمؤجر كتابة برغبته في الاخلاء اقل شي ثلاث اشهر علي الاقل اذا مقيد بمده معينه, اما اذا كان العقد مفتوح يلتزم الطرف الثاني (المستاجر) باخطار الطرف الاول قبل شهر من تاريخ الاخلاء اذا لم يرغب في المواصله او دفع ايجار شهر بدل اخطار الاخلاء. كذلك علي الطرف الاول (المؤجر) اذا اراد الاخلاء بسبب خارج عن الاراده عليه ابلاغ المستاجر قبل شهر او شهر ونصف علي الاقل.</p>
                <p><strong>3.</strong> يلتزم الطرف الثاني بان يؤدي الي الطرف الاول اجره شهريا مقدارها (<strong>{formatCurrency(contract.rent, db.settings.operational.currency)}</strong>) ريال عماني، ويجب دفعها مقدمًا كل شهر، او خلال مده لا تتجاوز 15 يوما من تاريخ استحقاقه.</p>
                <p><strong>4.</strong> في حال تأخر الطرف الثاني (المستأجر) عن سداد قيمة الإيجار في المواعيد المحددة، يحق للطرف الأول (المؤجر) مطالبته فورًا بكامل المبالغ المستحقة، ويكون للطرف الأول الحق في إنهاء العقد من تلقاء نفسه ودون الحاجة إلى حكم قضائي مسبق أو إنذار ، واحتفاظه بحقه في المطالبة بجميع التكاليف والمصاريف الناتجة عن ذلك، بما في ذلك المصاريف دون الإخلال بأي حقوق أخرى مقررة له نظامًا أو بموجب هذا العقد ان وجدت الرسمية وغير الرسمية.</p>
                <p><strong>5.</strong> علي الطرف الاول (المؤجر) مسؤولية الصيانة الأساسية للهيكل والمواد الثابته في العقار.</p>
                <p><strong>6.</strong> يلتزم الطرف الثاني (المستأجر) في حال كان محلا تجاريًا أو شقة سكنية أو منزلاً مستقلا، بكامل المسؤولية عن الصيانة الروتينية للعقار، وسداد جميع فواتير الخدمات بما في ذلك الكهرباء والمياه والإنترنت اما الصرف الصحي يقسم بين الوحدات. ما عدا المنزل عليه المسؤوليه كامله، وذلك اعتبارًا من تاريخ بداية العقد وحتى نهاية المدة ولا يحق له عند انتهاء العقد أو فسخه لأي سبب كان المطالبة باسترداد أو تعويض أي مبالغ قام بسدادها خلال مدة العقد.</p>
                <p><strong>7.</strong> في حال استئجار غرفة فقط، فيتحمل الطرف الأول (المؤجر ) كامل فواتير الخدمات طوال مدة العقد, اما الطرف الثاني يتحمل تكاليف الصيانه الناتجه عن استعماله.</p>
                <p><strong>8.</strong> في حالة حدوث مشكلة تؤثر على العقاراو المماطله في دفع الايجار، يحق للطرف الأول إخراج الطرف الثاني من العقار، ويلزم بدفع اي غرمات ماليه متعلقه بتاخير ايجار او عدم دفع فواتير الخدمات المذكوره ولا يحق للطرف الثاني في الاعتراض على هذه الإجراءات الازمه.</p>
                <p><strong>9.</strong> لا يجوز للمستاجر اجراء اي تغيرات جوهريه داخل العين المؤجره سواء بالهدم او البناء ولا يجوز ان يؤجر للغير من باطنه او يسلبه لخلافه بدون اذن صريح من الطرف الاول واذا خالف ذلك يحق للطرف الاول فسخ العقد بدون سابق انذار.</p>
                <p><strong>10.</strong> يلتزم الطرف الثاني برد العين المؤجره في نهايته التعاقد بنفس الحاله التي كانت عليها وقت التعاقد.</p>
            </div>

            <footer className="mt-24 flex justify-around text-center">
                <div>
                    <p className="font-bold">توقيع الطرف الاول (المؤجر)</p>
                    <p className="mt-16">.........................</p>
                </div>
                <div>
                    <p className="font-bold">توقيع الطرف الثاني (المستاجر)</p>
                    <p className="mt-16">.........................</p>
                </div>
            </footer>
        </div>
    );
};


const Contracts: React.FC = () => {
    // FIX: Use dataService and contractBalances from context
    const { db, dataService, contractBalances } = useApp();
    const location = useLocation();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [printingContract, setPrintingContract] = useState<Contract | null>(null);
    const [defaultUnitId, setDefaultUnitId] = useState<string | undefined>();

    const handleOpenModal = (contract: Contract | null = null, unitIdForNew?: string) => {
        setEditingContract(contract);
        setDefaultUnitId(unitIdForNew);
        setIsModalOpen(true);
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const action = params.get('action');
        const unitId = params.get('unitId');
        const contractId = params.get('contractId');

        if (action === 'add' && unitId) {
            handleOpenModal(null, unitId);
            navigate('/contracts', { replace: true });
        } else if (contractId) {
            const contractToEdit = db.contracts.find(c => c.id === contractId);
            if (contractToEdit) {
                handleOpenModal(contractToEdit);
            }
            navigate('/contracts', { replace: true });
        }
    }, [location, db.contracts, navigate]);

    const handleCloseModal = () => {
        setEditingContract(null);
        setIsModalOpen(false);
        setDefaultUnitId(undefined);
    };

    const handleDelete = async (id: string) => {
        if (db.receipts.some(r => r.contractId === id) || db.expenses.some(e => e.contractId === id)) {
            toast.error("لا يمكن حذف العقد لوجود حركات مالية مرتبطة به.");
            return;
        }
        await dataService.remove('contracts', id);
    };
    
    const handlePrint = (id: string) => {
        const contractToPrint = db.contracts.find(c => c.id === id);
        if (contractToPrint) {
            setPrintingContract(contractToPrint);
        }
    };

    const handleExportPdf = (contract: Contract) => {
        exportContractToPdf(contract, db);
    };

    const handleRenewContract = async (contract: Contract) => {
        try {
            const oldEnd = new Date(contract.end);
            const newStart = new Date(oldEnd);
            newStart.setDate(newStart.getDate() + 1);
            const newEnd = new Date(newStart);
            newEnd.setFullYear(newEnd.getFullYear() + 1);
            newEnd.setDate(newEnd.getDate() - 1);

            const newContract = await dataService.add('contracts', {
                unitId: contract.unitId,
                tenantId: contract.tenantId,
                rent: contract.rent,
                dueDay: contract.dueDay,
                start: newStart.toISOString().slice(0, 10),
                end: newEnd.toISOString().slice(0, 10),
                deposit: contract.deposit,
                status: 'ACTIVE' as const,
                sponsorName: contract.sponsorName || '',
                sponsorId: contract.sponsorId || '',
                sponsorPhone: contract.sponsorPhone || '',
            });

            if (!newContract) {
                toast.error('فشل إنشاء العقد الجديد. لم يتم تغيير العقد الحالي.');
                return;
            }

            await dataService.update('contracts', contract.id, { status: 'ENDED' as const });
            toast.success('تم تجديد العقد بنجاح! العقد القديم أصبح منتهياً والعقد الجديد نشط.');
        } catch (err: any) {
            console.error('Contract renewal failed:', err);
            toast.error('حدث خطأ أثناء تجديد العقد: ' + (err?.message || 'خطأ غير معروف'));
        }
    };

    const handleExportCsv = () => {
        const rows = db.contracts.map(c => {
            const unit = db.units.find(u => u.id === c.unitId);
            const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
            const tenant = db.tenants.find(t => t.id === c.tenantId);
            const balance = contractBalances[c.id]?.balance || 0;
            return {
                'الوحدة': unit?.name || '',
                'العقار': property?.name || '',
                'المستأجر': tenant?.name || '',
                'الإيجار الشهري': c.rent,
                'تاريخ البداية': c.start,
                'تاريخ الانتهاء': c.end,
                'الرصيد المستحق': balance,
                'الحالة': CONTRACT_STATUS_AR[c.status] || c.status,
            };
        });
        exportToCsv('عقود_rentrix', rows);
    };

    const contractStats = useMemo(() => {
        const now = new Date();
        const alertDays = db.settings.operational?.contractAlertDays ?? 30;
        const futureDate = new Date(now.getTime() + alertDays * 86400000);
        const active = db.contracts.filter(c => c.status === 'ACTIVE').length;
        const expiring = db.contracts.filter(c => c.status === 'ACTIVE' && new Date(c.end) <= futureDate).length;
        const expired = db.contracts.filter(c => c.status === 'ENDED').length;
        const totalBalance = Object.values(contractBalances).reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0);
        return { total: db.contracts.length, active, expiring, expired, totalBalance };
    }, [db.contracts, contractBalances, db.settings]);

    return (
        <div className="space-y-6">
            <HardGateBanner />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <FileText size={18} className="mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-black">{contractStats.total}</p>
                    <p className="text-[10px] text-text-muted">إجمالي العقود</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <CheckCircle size={18} className="mx-auto mb-1 text-emerald-500" />
                    <p className="text-lg font-black">{contractStats.active}</p>
                    <p className="text-[10px] text-text-muted">نشطة</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <AlertTriangle size={18} className="mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-black text-amber-600">{contractStats.expiring}</p>
                    <p className="text-[10px] text-text-muted">قاربت الانتهاء</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Clock size={18} className="mx-auto mb-1 text-red-500" />
                    <p className="text-lg font-black">{contractStats.expired}</p>
                    <p className="text-[10px] text-text-muted">منتهية</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Users size={18} className="mx-auto mb-1 text-purple-500" />
                    <p className="text-lg font-black text-red-600" dir="ltr">{formatCurrency(contractStats.totalBalance, db.settings.operational.currency)}</p>
                    <p className="text-[10px] text-text-muted">إجمالي الذمم</p>
                </div>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">قائمة العقود</h2>
                    <div className="flex gap-2">
                        <button onClick={handleExportCsv} className="btn btn-secondary">
                            <Download size={14} />
                            تصدير CSV
                        </button>
                        <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة عقد</button>
                    </div>
                </div>
                {db.contracts.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText size={48} className="mx-auto text-text-muted" />
                        <h3 className="mt-4 text-lg font-semibold">لا توجد عقود بعد</h3>
                        <p className="mt-2 text-sm text-text-muted">ابدأ بإضافة عقد جديد لإدارة الإيجارات والماليات.</p>
                        <button onClick={() => handleOpenModal()} className="mt-6 btn btn-primary">
                            إضافة عقد جديد
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right border-collapse border border-border">
                            <thead className="text-xs uppercase bg-background text-text">
                                <tr>
                                    <th scope="col" className="px-6 py-3 border border-border">الوحدة</th>
                                    <th scope="col" className="px-6 py-3 border border-border">المستأجر</th>
                                    <th scope="col" className="px-6 py-3 border border-border">الإيجار الشهري</th>
                                    <th scope="col" className="px-6 py-3 border border-border">الفترة</th>
                                    <th scope="col" className="px-6 py-3 border border-border">الرصيد المستحق</th>
                                    <th scope="col" className="px-6 py-3 border border-border">الحالة</th>
                                    <th scope="col" className="px-6 py-3 border border-border">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {db.contracts.map(c => {
                                    const unit = db.units.find(u => u.id === c.unitId);
                                    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
                                    const tenant = db.tenants.find(t => t.id === c.tenantId);
                                    // FIX: Use contractBalances instead of derivedData
                                    const balance = contractBalances[c.id]?.balance || 0;
                                    return (
                                        <tr key={c.id} className="bg-card hover:bg-background">
                                            <td className="px-6 py-4 font-medium text-text whitespace-nowrap border border-border">
                                                {unit?.name} <span className="text-xs text-text-muted">({property?.name})</span>
                                            </td>
                                            <td className="px-6 py-4 border border-border">{tenant?.name}</td>
                                            <td className="px-6 py-4 border border-border">{formatCurrency(c.rent, db.settings.operational.currency)}</td>
                                            <td className="px-6 py-4 border border-border">{toArabicDigits(c.start)} ← {toArabicDigits(c.end)}</td>
                                            <td className={`px-6 py-4 font-bold border border-border ${balance > 0 ? 'text-red-500' : ''}`}>{formatCurrency(balance, db.settings.operational.currency)}</td>
                                            <td className="px-6 py-4 border border-border">
                                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(c.status)}`}>
                                                    {CONTRACT_STATUS_AR[c.status] || c.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 border border-border">
                                                <ActionsMenu items={[
                                                    EditAction(() => handleOpenModal(c)),
                                                    PrintAction(() => handlePrint(c.id)),
                                                    { label: 'تصدير PDF', icon: <FileText size={16} />, onClick: () => handleExportPdf(c) },
                                                    ...(c.status === 'ACTIVE' ? [{ label: 'تجديد العقد', icon: <RefreshCw size={16} />, onClick: () => handleRenewContract(c) }] : []),
                                                    DeleteAction(() => handleDelete(c.id)),
                                                ]} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <ContractForm isOpen={isModalOpen} onClose={handleCloseModal} contract={editingContract} defaultUnitId={defaultUnitId} />
                {printingContract && (
                    <PrintPreviewModal 
                        isOpen={!!printingContract} 
                        onClose={() => setPrintingContract(null)} 
                        title={`معاينة طباعة العقد`}
                    >
                        <ContractPrintable contract={printingContract} />
                    </PrintPreviewModal>
                )}
            </Card>
        </div>
    );
};

// Form
const ContractForm: React.FC<{ isOpen: boolean, onClose: () => void, contract: Contract | null, defaultUnitId?: string }> = ({ isOpen, onClose, contract, defaultUnitId }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [unitId, setUnitId] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [rent, setRent] = useState(0);
    const [dueDay, setDueDay] = useState(1);
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [deposit, setDeposit] = useState(0);
    const [status, setStatus] = useState<Contract['status']>('ACTIVE');
    const [sponsorName, setSponsorName] = useState('');
    const [sponsorId, setSponsorId] = useState('');
    const [sponsorPhone, setSponsorPhone] = useState('');
    
    const availableUnits = db.units.filter(u => 
        !db.contracts.some(c => c.unitId === u.id && c.status === 'ACTIVE' && c.id !== contract?.id)
    );

    const contractTransactions = useMemo(() => {
        if (!contract) return [];
        const receipts = db.receipts.filter(r => r.contractId === contract.id);
        const expenses = db.expenses.filter(e => e.contractId === contract.id && e.chargedTo === 'TENANT');
        const all: (Receipt | Expense)[] = [...receipts, ...expenses];
        all.sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        return all;
    }, [contract, db.receipts, db.expenses]);


    React.useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        if (contract) {
            setUnitId(contract.unitId);
            setTenantId(contract.tenantId);
            setRent(contract.rent);
            setDueDay(contract.dueDay);
            setStart(contract.start);
            setEnd(contract.end);
            setDeposit(contract.deposit);
            setStatus(contract.status);
            setSponsorName(contract.sponsorName || '');
            setSponsorId(contract.sponsorId || '');
            setSponsorPhone(contract.sponsorPhone || '');
        } else {
            const startDate = new Date(today);
            const endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            
            setUnitId(defaultUnitId || availableUnits[0]?.id || '');
            setTenantId(db.tenants[0]?.id || '');
            setRent(0);
            setDueDay(1);
            setStart(today);
            setEnd(endDate.toISOString().slice(0,10));
            setDeposit(0);
            setStatus('ACTIVE');
            setSponsorName('');
            setSponsorId('');
            setSponsorPhone('');
        }
    }, [contract, isOpen, db.tenants, availableUnits, defaultUnitId]);

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setStart(newStart);
        try {
            const startDate = new Date(newStart);
            if(!isNaN(startDate.getTime())) {
                const endDate = new Date(startDate);
                endDate.setFullYear(startDate.getFullYear() + 1);
                endDate.setDate(endDate.getDate() - 1);
                setEnd(endDate.toISOString().slice(0, 10));
            }
        } catch (error) {
            // Handle invalid date case if needed
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!unitId || !tenantId || !start || !end) {
            toast.error("يرجى ملء جميع الحقول المطلوبة (الوحدة، المستأجر، تاريخ البدء والانتهاء).");
            return;
        }

        const data = { unitId, tenantId, rent, dueDay, start, end, deposit, status, sponsorName, sponsorId, sponsorPhone };
        if (contract) {
            await dataService.update('contracts', contract.id, data);
        } else {
            await dataService.add('contracts', data);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={contract ? 'تعديل عقد' : 'إضافة عقد'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <h3 className="text-md font-semibold border-b border-border pb-2">تفاصيل العقد الأساسية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الوحدة (الشاغرة فقط)</label>
                            <select value={unitId} onChange={e => setUnitId(e.target.value)} required>
                                {contract && !availableUnits.some(u => u.id === contract.unitId) && <option value={contract.unitId}>الوحدة الحالية</option>}
                                {availableUnits.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({db.properties.find(p => p.id === u.propertyId)?.name})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">المستأجر</label>
                            <select value={tenantId} onChange={e => setTenantId(e.target.value)} required>
                                {db.tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الإيجار الشهري</label>
                            <input type="number" value={rent} onChange={e => setRent(Number(e.target.value))} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">يوم الاستحقاق</label>
                            <input type="number" min="1" max="28" value={dueDay} onChange={e => setDueDay(Number(e.target.value))} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">تاريخ البدء</label>
                            <input type="date" value={start} onChange={handleStartDateChange} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">تاريخ الانتهاء</label>
                            <input type="date" value={end} onChange={e => setEnd(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الوديعة</label>
                            <input type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحالة</label>
                            <select value={status} onChange={e => setStatus(e.target.value as Contract['status'])}>
                                <option value="ACTIVE">نشط</option>
                                <option value="ENDED">منتهي</option>
                                <option value="SUSPENDED">معلق</option>
                            </select>
                        </div>
                    </div>
                </div>
                 <div className="space-y-4 mt-6">
                    <h3 className="text-md font-semibold border-b border-border pb-2">بيانات الكفيل (إن وجد)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">اسم الكفيل</label>
                            <input type="text" value={sponsorName} onChange={e => setSponsorName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم هوية الكفيل</label>
                            <input type="text" value={sponsorId} onChange={e => setSponsorId(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">هاتف الكفيل</label>
                            <input type="text" value={sponsorPhone} onChange={e => setSponsorPhone(e.target.value)} />
                        </div>
                    </div>
                 </div>

                {contract && <AttachmentsManager entityType="CONTRACT" entityId={contract.id} />}
                
                {contract && contractTransactions.length > 0 && (
                    <div className="pt-4 border-t border-border mt-4">
                        <h4 className="text-md font-bold mb-3">سجل الحركات المالية</h4>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {contractTransactions.map(tx => (
                                <div key={tx.id} className={`p-2 rounded-md text-sm ${'channel' in tx ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold">
                                            {'channel' in tx ? `سند قبض #${tx.no}` : `مصروف #${tx.no}`}
                                        </span>
                                        <span className={`font-bold ${'channel' in tx ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(tx.amount, db.settings.operational.currency)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-text-muted">
                                        <span>{formatDateTime(tx.dateTime)}</span>
                                        <span className={getStatusBadgeClass(tx.status)}>{tx.status === 'POSTED' ? 'مرحّل' : 'ملغي'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default Contracts;