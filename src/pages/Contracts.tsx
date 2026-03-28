import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Contract, Receipt, Expense } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, toArabicDigits, getStatusBadgeClass, formatDateTime, formatDate, exportToCsv, CONTRACT_STATUS_AR, parseLocalizedNumber } from '../utils/helpers';
import NumberInput from '../components/ui/NumberInput';
import HardGateBanner from '../components/shared/HardGateBanner';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { FileText, Download, CheckCircle, AlertTriangle, Clock, Users, RefreshCw } from 'lucide-react';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { exportContractToPdf } from '../services/pdfService';
import { toast } from 'react-hot-toast';

const ContractPrintable: React.FC<{ contract: Contract }> = ({ contract }) => {
    const { db, settings } = useApp();
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
                {(settings.documentTemplates?.contractClauses || []).map((clause, index) => (
                    <p key={index}><strong>{index + 1}.</strong> {clause}</p>
                ))}
            </div>

            {settings.documentTemplates?.contractFooterNote && (
                <p className="mt-4 text-xs text-center border-t border-border pt-3 italic">{settings.documentTemplates.contractFooterNote}</p>
            )}

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
    const contracts = Array.isArray(db.contracts) ? db.contracts : [];
    const units = Array.isArray(db.units) ? db.units : [];
    const properties = Array.isArray(db.properties) ? db.properties : [];
    const tenants = Array.isArray(db.tenants) ? db.tenants : [];
    const receipts = Array.isArray(db.receipts) ? db.receipts : [];
    const expenses = Array.isArray(db.expenses) ? db.expenses : [];
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
            const contractToEdit = contracts.find(c => c.id === contractId);
            if (contractToEdit) {
                handleOpenModal(contractToEdit);
            }
            navigate('/contracts', { replace: true });
        }
    }, [location, contracts, navigate]);

    const handleCloseModal = () => {
        setEditingContract(null);
        setIsModalOpen(false);
        setDefaultUnitId(undefined);
    };

    const handleDelete = async (id: string) => {
<<<<<<< HEAD
        const hasReceipts = db.receipts.some(r => r.contractId === id);
        const hasExpenses = db.expenses.some(e => e.contractId === id);
        const hasInvoices = db.invoices.some(i => i.contractId === id);
        
        if (hasReceipts || hasExpenses || hasInvoices) {
            const items = [];
            if (hasReceipts) items.push('سندات قبض');
            if (hasExpenses) items.push('مصروفات');
            if (hasInvoices) items.push('فواتير');
            toast.error(`لا يمكن حذف العقد لأنه يحتوي على ${items.join(' و ')} مرتبطة به.`);
=======
        if (receipts.some(r => r.contractId === id) || expenses.some(e => e.contractId === id)) {
            toast.error("لا يمكن حذف العقد لوجود حركات مالية مرتبطة به.");
>>>>>>> e45aa20c70971e52a53c2ecff2f6f4408c3f718b
            return;
        }
        await dataService.remove('contracts', id);
    };
    
    const handlePrint = (id: string) => {
        const contractToPrint = contracts.find(c => c.id === id);
        if (contractToPrint) {
            setPrintingContract(contractToPrint);
        }
    };

    const handleExportPdf = (contract: Contract) => {
        try {
            exportContractToPdf(contract, db);
            toast.success('تم تصدير العقد بصيغة PDF بنجاح');
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast.error('حدث خطأ في تصدير ملف PDF. يرجى المحاولة مرة أخرى.');
        }
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
        const rows = contracts.map(c => {
            const unit = units.find(u => u.id === c.unitId);
            const property = unit ? properties.find(p => p.id === unit.propertyId) : null;
            const tenant = tenants.find(t => t.id === c.tenantId);
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
        const active = contracts.filter(c => c.status === 'ACTIVE').length;
        const expiring = contracts.filter(c => c.status === 'ACTIVE' && new Date(c.end) <= futureDate).length;
        const expired = contracts.filter(c => c.status === 'ENDED').length;
        const totalBalance = Object.values(contractBalances).reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0);
        return { total: contracts.length, active, expiring, expired, totalBalance };
    }, [contracts, contractBalances, db.settings]);

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
                {contracts.length === 0 ? (
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
                                {contracts.map(c => {
                                    const unit = units.find(u => u.id === c.unitId);
                                    const property = unit ? properties.find(p => p.id === unit.propertyId) : null;
                                    const tenant = tenants.find(t => t.id === c.tenantId);
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
    const [rentInput, setRentInput] = useState('');
    const [dueDay, setDueDay] = useState(1);
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [depositInput, setDepositInput] = useState('');
    const [status, setStatus] = useState<Contract['status']>('ACTIVE');
    const [sponsorName, setSponsorName] = useState('');
    const [sponsorId, setSponsorId] = useState('');
    const [sponsorPhone, setSponsorPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);
    const initializedRef = useRef(false);
    
    const contracts = Array.isArray(db.contracts) ? db.contracts : [];
    const units = Array.isArray(db.units) ? db.units : [];
    const tenants = Array.isArray(db.tenants) ? db.tenants : [];
    const expenses = Array.isArray(db.expenses) ? db.expenses : [];
    const receipts = Array.isArray(db.receipts) ? db.receipts : [];
    const properties = Array.isArray(db.properties) ? db.properties : [];

    const availableUnits = units.filter(u => 
        !contracts.some(c => c.unitId === u.id && c.status === 'ACTIVE' && c.id !== contract?.id)
    );

    const contractTransactions = useMemo(() => {
        if (!contract) return [];
        const contractReceipts = receipts.filter(r => r.contractId === contract.id);
        const contractExpenses = expenses.filter(e => e.contractId === contract.id && e.chargedTo === 'TENANT');
        const all: (Receipt | Expense)[] = [...contractReceipts, ...contractExpenses];
        all.sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        return all;
    }, [contract, receipts, expenses]);


    React.useEffect(() => {
        if (!isOpen) {
            initializedRef.current = false;
            return;
        }
        
        const today = new Date().toISOString().slice(0, 10);
        if (contract) {
            // Always load contract data when editing
            setUnitId(contract.unitId);
            setTenantId(contract.tenantId);
            setRentInput(String(contract.rent ?? ''));
            setDueDay(contract.dueDay);
            setStart(contract.start);
            setEnd(contract.end);
            setDepositInput(String(contract.deposit ?? ''));
            setStatus(contract.status);
            setSponsorName(contract.sponsorName || '');
            setSponsorId(contract.sponsorId || '');
            setSponsorPhone(contract.sponsorPhone || '');
            initializedRef.current = true;
        } else if (!initializedRef.current) {
            // Initialize new contract only once
            const startDate = new Date(today);
            const endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            
            setUnitId(defaultUnitId || availableUnits[0]?.id || '');
            setTenantId(tenants[0]?.id || '');
            setRentInput('');
            setDueDay(1);
            setStart(today);
            setEnd(endDate.toISOString().slice(0,10));
            setDepositInput('');
            setStatus('ACTIVE');
            setSponsorName('');
            setSponsorId('');
            setSponsorPhone('');
            initializedRef.current = true;
        }
<<<<<<< HEAD
    }, [contract, isOpen, defaultUnitId, availableUnits, db.tenants]);
=======
    }, [contract, isOpen, tenants, availableUnits, defaultUnitId]);

    const handleMoneyInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        if (!/^[0-9٠-٩۰-۹.,٬٫+\-\s\u00A0\u200E\u200F]*$/.test(next)) return;
        setter(next);
    };
>>>>>>> e45aa20c70971e52a53c2ecff2f6f4408c3f718b

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
        if (isSavingRef.current) return;
        if (!unitId || !tenantId || !start || !end) {
            toast.error("يرجى ملء جميع الحقول المطلوبة (الوحدة، المستأجر، تاريخ البدء والانتهاء).");
            return;
        }

        if (status === 'ACTIVE') {
            const tenantHasActiveContract = contracts.some(c =>
                c.tenantId === tenantId && c.status === 'ACTIVE' && c.id !== contract?.id
            );
            if (tenantHasActiveContract) {
                toast.error('لا يمكن تسجيل هذا العقد: المستأجر لديه عقد نشط بالفعل. يرجى إنهاء العقد الحالي أولاً.');
                return;
            }
            const unitHasActiveContract = contracts.some(c =>
                c.unitId === unitId && c.status === 'ACTIVE' && c.id !== contract?.id
            );
            if (unitHasActiveContract) {
                toast.error('لا يمكن تسجيل هذا العقد: الوحدة مرتبطة بعقد نشط آخر. يرجى إنهاء العقد الحالي أولاً.');
                return;
            }
        }

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const rent = parseLocalizedNumber(rentInput);
            const deposit = parseLocalizedNumber(depositInput);
            const data = { unitId, tenantId, rent, dueDay, start, end, deposit, status, sponsorName, sponsorId, sponsorPhone };
            if (contract) {
                await dataService.update('contracts', contract.id, data);
            } else {
                await dataService.add('contracts', data);
            }
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={contract ? 'تعديل عقد' : 'إضافة عقد'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <h3 className="text-md font-semibold border-b border-border pb-2">تفاصيل العقد الأساسية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الوحدة (الشاغرة فقط)</label>
                            <select value={unitId} onChange={e => setUnitId(e.target.value)} required className="w-full px-3 py-2 border border-border rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="">-- اختر وحدة --</option>
                                {contract && !availableUnits.some(u => u.id === contract.unitId) && <option value={contract.unitId}>الوحدة الحالية</option>}
                                {availableUnits.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({properties.find(p => p.id === u.propertyId)?.name})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">المستأجر</label>
<<<<<<< HEAD
                            <select value={tenantId} onChange={e => setTenantId(e.target.value)} required className="w-full px-3 py-2 border border-border rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="">-- اختر مستأجر --</option>
                                {db.tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
=======
                            <select value={tenantId} onChange={e => setTenantId(e.target.value)} required>
                                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
>>>>>>> e45aa20c70971e52a53c2ecff2f6f4408c3f718b
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الإيجار الشهري</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={rentInput}
                                onChange={handleMoneyInputChange(setRentInput)}
                                required
                                disabled={isSaving}
                                className="ltr-input"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">يوم الاستحقاق</label>
                            <NumberInput value={dueDay} onChange={setDueDay} allowDecimal={false} min={1} max={28} required disabled={isSaving} />
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
                            <input
                                type="text"
                                inputMode="decimal"
                                value={depositInput}
                                onChange={handleMoneyInputChange(setDepositInput)}
                                disabled={isSaving}
                                className="ltr-input"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحالة</label>
                            <select value={status} onChange={e => setStatus(e.target.value as Contract['status'])} className="w-full px-3 py-2 border border-border rounded-lg bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary">
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
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default Contracts;
