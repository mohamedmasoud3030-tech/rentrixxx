import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { renewContractAtomic } from '../services/antiMistakeService';
import { checkUnitMaintenanceBlock, type MaintenanceBlockResult } from '../services/operationsService';
import { getContractStatusSummary, getContractsExpiringSoon } from '../services/contractMonitoringService';
import { supabaseData } from '../services/supabaseDataService';
import { Contract, Receipt, Expense } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, toArabicDigits, getStatusBadgeClass, formatDateTime, formatDate, exportToCsv, CONTRACT_STATUS_AR, parseLocalizedNumber } from '../utils/helpers';
import NumberInput from '../components/ui/NumberInput';
import HardGateBanner from '../components/shared/HardGateBanner';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { FileText, Download, CheckCircle, AlertTriangle, Clock, Users, RefreshCw, Search, ChevronDown, Printer, Ban } from 'lucide-react';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { exportContractToPdf } from '../services/pdfService';
import { toast } from 'react-hot-toast';
import { DocumentHeaderInline } from '../components/shared/DocumentHeader';

type ContractFilter = 'ALL' | 'ACTIVE' | 'ENDED' | 'TERMINATED' | 'SUSPENDED';

const CONTRACT_FILTERS: { key: ContractFilter; label: string }[] = [
    { key: 'ALL', label: 'الكل' },
    { key: 'ACTIVE', label: 'نشطة' },
    { key: 'ENDED', label: 'منتهية' },
    { key: 'TERMINATED', label: 'مُنهاة' },
    { key: 'SUSPENDED', label: 'معلقة' },
];

const getNewEndDate = (newStart: Date, frequency?: string) => {
    const d = new Date(newStart);
    if (frequency === 'MONTHLY') d.setMonth(d.getMonth() + 1);
    else if (frequency === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
    else d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    return d;
};

const ContractPrintable: React.FC<{ contract: Contract }> = ({ contract }) => {
    const { db, settings } = useApp();
    const tenant = db.tenants.find(t => t.id === contract.tenantId);
    const unit = db.units.find(u => u.id === contract.unitId);
    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
    const company = settings.general.company;
    const logo = settings.appearance?.logoDataUrl;

    return (
        <div className="bg-surface-container-low text-text text-sm leading-relaxed p-4 print-doc" dir="rtl">
            <div className="print-doc__header">
                <DocumentHeaderInline
                    company={company}
                    logoUrl={logo}
                    docTitle="عقد إيجار"
                    docNo={contract.no || contract.id}
                    docDate={formatDate(contract.createdAt)}
                />
            </div>
            <div className="space-y-2 print-doc__body">
                <p><strong>المستأجر:</strong> {tenant?.name || '-'}</p>
                <p><strong>الوحدة:</strong> {unit?.name || '-'} - {property?.name || '-'}</p>
                <p><strong>بداية العقد:</strong> {formatDate(contract.start)}</p>
                <p><strong>نهاية العقد:</strong> {formatDate(contract.end)}</p>
                <p><strong>الإيجار:</strong> {formatCurrency(contract.rent, db.settings.operational.currency)}</p>
            </div>
            <div className="print-doc__footer">
                <div className="flex justify-between text-xs">
                    <span>توقيع المؤجر: __________________</span>
                    <span>توقيع المستأجر: __________________</span>
                </div>
            </div>
        </div>
    );
};

const Contracts: React.FC = () => {
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
    const [filter, setFilter] = useState<ContractFilter>(() => (sessionStorage.getItem('rentrix:contracts_filter') as ContractFilter) || 'ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        sessionStorage.setItem('rentrix:contracts_filter', filter);
    }, [filter]);

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
            if (contractToEdit) handleOpenModal(contractToEdit);
            navigate('/contracts', { replace: true });
        }
    }, [location, contracts, navigate]);

    const handleCloseModal = () => {
        setEditingContract(null);
        setIsModalOpen(false);
        setDefaultUnitId(undefined);
    };

    const handleDelete = async (id: string) => {
        const targetContract = contracts.find(c => c.id === id);
        if (!targetContract) return;
        await dataService.remove('contracts', id);
    };

    const handleRenewContract = async (contract: Contract) => {
        try {
            const oldEnd = new Date(contract.end);
            const newStart = new Date(oldEnd);
            newStart.setDate(newStart.getDate() + 1);
            const frequency = (contract as Contract & { rentFrequency?: string }).rentFrequency;
            const newEnd = getNewEndDate(newStart, frequency);

            const nextNo = String(await supabaseData.incrementSerial('contract'));
            const payload = {
                id: crypto.randomUUID(),
                no: nextNo,
                unit_id: contract.unitId,
                tenant_id: contract.tenantId,
                rent_amount: contract.rent,
                due_day: contract.dueDay,
                start_date: newStart.toISOString().slice(0, 10),
                end_date: newEnd.toISOString().slice(0, 10),
                deposit: contract.deposit,
                sponsor_name: contract.sponsorName || '',
                sponsor_id: contract.sponsorId || '',
                sponsor_phone: contract.sponsorPhone || '',
                created_at: Date.now(),
            };
            const result = await renewContractAtomic(contract.id, payload);
            if (!result.success) {
                const rawError = String(result.error || 'خطأ غير معروف');
                if (rawError.includes('Unit already has another ACTIVE contract')) {
                    toast.error('تعذر تجديد العقد: الوحدة لديها عقد نشط آخر.');
                    return;
                }
                if (rawError.includes('Original contract is not ACTIVE')) {
                    toast.error('تعذر تجديد العقد: العقد الأصلي ليس في حالة نشطة.');
                    return;
                }
                toast.error(`فشل التجديد: ${rawError}`);
                return;
            }

            await Promise.all([
                supabaseData.fetchAll<Contract>('contracts'),
                supabaseData.fetchAll('contractBalances'),
            ]);
            toast.success('تم تجديد العقد بنجاح.');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'فشل التجديد');
        }
    };

    const filteredContracts = useMemo(() => {
        return contracts
            .filter(c => {
                if (filter === 'ALL') return true;
                if (filter === 'ACTIVE') return c.status === 'ACTIVE';
                if (filter === 'SUSPENDED') return c.status === 'SUSPENDED';
                if (filter === 'ENDED') return c.status === 'ENDED';
                if (filter === 'TERMINATED') return c.status === 'ENDED';
                return true;
            })
            .filter(c => {
                if (!searchTerm.trim()) return true;
                const term = searchTerm.toLowerCase();
                const tenant = tenants.find(t => t.id === c.tenantId);
                const unit = units.find(u => u.id === c.unitId);
                return (
                    tenant?.name.toLowerCase().includes(term) ||
                    unit?.name.toLowerCase().includes(term) ||
                    (c.no || '').toLowerCase().includes(term)
                );
            });
    }, [contracts, filter, searchTerm, tenants, units]);

    const contractStats = useMemo(() => {
        const now = new Date();
        const alertDays = db.settings.operational?.contractAlertDays ?? 30;
        const futureDate = new Date(now.getTime() + alertDays * 86400000);
        const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
        const active = activeContracts.length;
        const expiring = activeContracts.filter(c => new Date(c.end) <= futureDate && new Date(c.end) >= now).length;
        const totalOverdueBalance = Object.values(contractBalances).reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0);
        const totalMonthlyRent = activeContracts.reduce((s, c) => s + (c.rent || 0), 0);
        return { active, expiring, totalOverdueBalance, totalMonthlyRent };
    }, [contracts, contractBalances, db.settings]);

    const statusSummary = useMemo(() => getContractStatusSummary(contracts), [contracts]);

    const expiringSoonIds = useMemo(() => {
        const alertDays = db.settings.operational?.contractAlertDays ?? 30;
        return new Set(getContractsExpiringSoon(contracts, alertDays).map(contract => contract.id));
    }, [contracts, db.settings]);

    const handleExportCsv = () => {
        const rows = filteredContracts.map(c => {
            const unit = units.find(u => u.id === c.unitId);
            const property = unit ? properties.find(p => p.id === unit.propertyId) : null;
            const tenant = tenants.find(t => t.id === c.tenantId);
            const balance = contractBalances[c.id]?.balance || 0;
            return {
                'الوحدة': unit?.name || '',
                'العقار': property?.name || '',
                'المستأجر': tenant?.name || '',
                'رقم العقد': c.no || '',
                'الإيجار الشهري': c.rent,
                'الرصيد': balance,
                'الحالة': CONTRACT_STATUS_AR[c.status] || c.status,
            };
        });
        exportToCsv('عقود_rentrix', rows);
    };

    return (
        <div className="space-y-6">
            <HardGateBanner />

            <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="rounded-lg border border-outline-variant/40 p-3">
                        <p className="text-lg font-black">{statusSummary.active}</p>
                        <p className="text-xs text-text-muted">عقود نشطة</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                        <p className="text-lg font-black text-amber-600">{statusSummary.expiringSoon}</p>
                        <p className="text-xs text-text-muted">ينتهي قريباً</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50/40 p-3">
                        <p className="text-lg font-black text-red-600">{statusSummary.expired}</p>
                        <p className="text-xs text-text-muted">منتهية</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                        <p className="text-lg font-black text-slate-700">{statusSummary.draft}</p>
                        <p className="text-xs text-text-muted">مسودة</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <CheckCircle size={18} className="mx-auto mb-1 text-emerald-500" />
                    <p className="text-lg font-black">{contractStats.active}</p>
                    <p className="text-[10px] text-text-muted">عقود نشطة</p>
                </div>
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <AlertTriangle size={18} className="mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-black text-amber-600">{contractStats.expiring}</p>
                    <p className="text-[10px] text-text-muted">تنتهي قريباً</p>
                </div>
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <Clock size={18} className="mx-auto mb-1 text-red-500" />
                    <p className="text-lg font-black text-red-600" dir="ltr">{formatCurrency(contractStats.totalOverdueBalance, db.settings.operational.currency)}</p>
                    <p className="text-[10px] text-text-muted">إجمالي المتأخرات</p>
                </div>
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <Users size={18} className="mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-black text-blue-700" dir="ltr">{formatCurrency(contractStats.totalMonthlyRent, db.settings.operational.currency)}</p>
                    <p className="text-[10px] text-text-muted">إجمالي الإيجار الشهري</p>
                </div>
            </div>

            <Card>
                <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-4">
                    <h2 className="text-xl font-bold">قائمة العقود</h2>
                    <div className="flex gap-2">
                        <button onClick={handleExportCsv} className="btn btn-secondary"><Download size={14} /> تصدير CSV</button>
                        <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة عقد</button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                        {CONTRACT_FILTERS.map(item => (
                            <button
                                key={item.key}
                                onClick={() => setFilter(item.key)}
                                className={`px-3 py-1.5 text-xs rounded-lg border ${filter === item.key ? 'bg-primary text-white border-primary' : 'border-border text-text-muted'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative md:mr-auto w-full md:w-72">
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="بحث باسم المستأجر / الوحدة / رقم العقد"
                            className="w-full pr-9"
                        />
                    </div>
                </div>

                {filteredContracts.length === 0 ? (
                    <div className="text-center py-10 text-text-muted">لا توجد عقود مطابقة.</div>
                ) : (
                    <div className="overflow-x-auto border border-outline-variant/40 rounded-xl">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-background text-xs">
                                <tr>
                                    <th className="px-4 py-3">العقد</th>
                                    <th className="px-4 py-3">المستأجر / الوحدة</th>
                                    <th className="px-4 py-3">الفترة</th>
                                    <th className="px-4 py-3">الرصيد</th>
                                    <th className="px-4 py-3">الحالة</th>
                                    <th className="px-4 py-3">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContracts.map(c => {
                                    const unit = units.find(u => u.id === c.unitId);
                                    const property = unit ? properties.find(p => p.id === unit.propertyId) : null;
                                    const tenant = tenants.find(t => t.id === c.tenantId);
                                    const balance = contractBalances[c.id]?.balance || 0;
                                    const recentPayments = receipts
                                        .filter(r => r.contractId === c.id && r.status === 'POSTED')
                                        .sort((a, b) => (b.dateTime || '').localeCompare(a.dateTime || ''))
                                        .slice(0, 3);

                                    return (
                                        <React.Fragment key={c.id}>
                                            <tr className="hover:bg-surface-container-high/60 cursor-pointer" onClick={() => setExpandedId(prev => (prev === c.id ? null : c.id))}>
                                                <td className="px-4 py-3 font-mono">{c.no || c.id.slice(0, 8)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold">{tenant?.name || '-'}</div>
                                                    <div className="text-xs text-text-muted">{unit?.name || '-'} / {property?.name || '-'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs">{toArabicDigits(c.start)} ← {toArabicDigits(c.end)}</td>
                                                <td className={`px-4 py-3 font-bold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-amber-600' : 'text-emerald-600'}`} dir="ltr">
                                                    {formatCurrency(balance, db.settings.operational.currency)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="inline-flex items-center gap-2">
                                                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadgeClass(c.status)}`}>{CONTRACT_STATUS_AR[c.status] || c.status}</span>
                                                        {expiringSoonIds.has(c.id) && (
                                                            <span
                                                                className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500"
                                                                title="العقد ينتهي قريباً"
                                                                aria-label="العقد ينتهي قريباً"
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                    <ActionsMenu items={[
                                                        EditAction(() => handleOpenModal(c)),
                                                        PrintAction(() => setPrintingContract(c)),
                                                        { label: 'تصدير PDF', icon: <FileText size={16} />, onClick: () => exportContractToPdf(c, db) },
                                                        ...(c.status === 'ACTIVE' ? [{ label: 'تجديد العقد', icon: <RefreshCw size={16} />, onClick: () => handleRenewContract(c) }] : []),
                                                        DeleteAction(() => handleDelete(c.id)),
                                                    ]} />
                                                </td>
                                            </tr>
                                            {expandedId === c.id && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-4 bg-background/50 border-t border-border">
                                                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <p className="font-bold mb-2">بيانات المستأجر</p>
                                                                <p>{tenant?.name || '-'}</p>
                                                                <p className="text-text-muted">{tenant?.phone || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold mb-2">بيانات الوحدة</p>
                                                                <p>{unit?.name || '-'} - {property?.name || '-'}</p>
                                                                <p className="text-text-muted">{property?.location || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold mb-2">الرصيد</p>
                                                                <p className={`${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-amber-600' : 'text-emerald-600'} font-bold`} dir="ltr">
                                                                    {formatCurrency(balance, db.settings.operational.currency)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold mb-2">آخر 3 دفعات</p>
                                                                {recentPayments.length === 0 ? <p className="text-text-muted">لا توجد دفعات</p> : (
                                                                    <ul className="space-y-1 text-xs">
                                                                        {recentPayments.map(p => (
                                                                            <li key={p.id}>{formatDateTime(p.dateTime)} — {formatCurrency(p.amount, db.settings.operational.currency)}</li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-4">
                                                            <button className="btn btn-secondary" onClick={() => setPrintingContract(c)}><Printer size={14} /> طباعة</button>
                                                            <button className="btn btn-secondary" onClick={() => handleRenewContract(c)}><RefreshCw size={14} /> تجديد</button>
                                                            <button className="btn btn-ghost" onClick={() => dataService.update('contracts', c.id, { status: 'ENDED' })}><Ban size={14} /> إنهاء</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <ContractForm isOpen={isModalOpen} onClose={handleCloseModal} contract={editingContract} defaultUnitId={defaultUnitId} />
            {printingContract && (
                <PrintPreviewModal isOpen={!!printingContract} onClose={() => setPrintingContract(null)} title="معاينة طباعة العقد">
                    <ContractPrintable contract={printingContract} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

const ContractForm: React.FC<{ isOpen: boolean; onClose: () => void; contract: Contract | null; defaultUnitId?: string }> = ({ isOpen, onClose, contract, defaultUnitId }) => {
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
    const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(false);
    const [maintenanceBlock, setMaintenanceBlock] = useState<MaintenanceBlockResult | null>(null);
    const isSavingRef = useRef(false);

    const contracts = db.contracts || [];
    const units = db.units || [];
    const tenants = db.tenants || [];
    const properties = db.properties || [];
    const receipts = db.receipts || [];
    const expenses = db.expenses || [];

    const availableUnits = useMemo(
        () => units.filter(u => !contracts.some(c => c.unitId === u.id && c.status === 'ACTIVE' && c.id !== contract?.id)),
        [units, contracts, contract?.id]
    );

    const contractTransactions = useMemo(() => {
        if (!contract) return [];
        const contractReceipts = receipts.filter(r => r.contractId === contract.id);
        const contractExpenses = expenses.filter(e => e.contractId === contract.id && e.chargedTo === 'TENANT');
        const all: (Receipt | Expense)[] = [...contractReceipts, ...contractExpenses];
        all.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        return all;
    }, [contract, receipts, expenses]);

    useEffect(() => {
        if (!isOpen) return;
        const today = new Date().toISOString().slice(0, 10);
        if (contract) {
            setUnitId(contract.unitId);
            setTenantId(contract.tenantId);
            setRentInput(String(contract.rent));
            setDueDay(contract.dueDay);
            setStart(contract.start);
            setEnd(contract.end);
            setDepositInput(String(contract.deposit));
            setStatus(contract.status);
            setSponsorName(contract.sponsorName || '');
            setSponsorId(contract.sponsorId || '');
            setSponsorPhone(contract.sponsorPhone || '');
        } else {
            const startDate = new Date(today);
            const endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            setUnitId(defaultUnitId || availableUnits[0]?.id || '');
            setTenantId(tenants[0]?.id || '');
            setRentInput('');
            setDueDay(1);
            setStart(today);
            setEnd(endDate.toISOString().slice(0, 10));
            setDepositInput('');
            setStatus('ACTIVE');
            setSponsorName('');
            setSponsorId('');
            setSponsorPhone('');
        }
    }, [contract, isOpen, defaultUnitId, availableUnits, tenants]);

    useEffect(() => {
        let canceled = false;

        const runCheck = async () => {
            if (!isOpen || !!contract || !unitId) {
                setMaintenanceBlock(null);
                setIsCheckingMaintenance(false);
                return;
            }

            setIsCheckingMaintenance(true);
            try {
                const result = await checkUnitMaintenanceBlock(unitId);
                if (!canceled) setMaintenanceBlock(result);
            } catch (err: unknown) {
                if (!canceled) {
                    setMaintenanceBlock(null);
                    toast.error(err instanceof Error ? err.message : 'تعذر التحقق من طلبات الصيانة.');
                }
            } finally {
                if (!canceled) setIsCheckingMaintenance(false);
            }
        };

        void runCheck();

        return () => {
            canceled = true;
        };
    }, [isOpen, contract, unitId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        const rent = parseLocalizedNumber(rentInput);
        const deposit = parseLocalizedNumber(depositInput);
        if (!unitId || !tenantId || !start || !end || !Number.isFinite(rent) || rent <= 0) {
            toast.error('تحقق من الحقول المطلوبة.');
            return;
        }
        if (!contract && maintenanceBlock?.blocked) {
            toast.error('لا يمكن إنشاء عقد — يوجد طلبات صيانة حرجة مفتوحة على هذه الوحدة');
            return;
        }
        if (!contract && isCheckingMaintenance) {
            toast.error('يرجى الانتظار حتى اكتمال التحقق من طلبات الصيانة.');
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = { unitId, tenantId, rent, dueDay, start, end, deposit, status, sponsorName, sponsorId, sponsorPhone };
            if (contract) await dataService.update('contracts', contract.id, data);
            else await dataService.add('contracts', data);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={contract ? 'تعديل عقد' : 'إضافة عقد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الوحدة</label>
                        <select value={unitId} onChange={e => setUnitId(e.target.value)} required>
                            <option value="">-- اختر وحدة --</option>
                            {availableUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({properties.find(p => p.id === u.propertyId)?.name})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">المستأجر</label>
                        <select value={tenantId} onChange={e => setTenantId(e.target.value)} required>
                            <option value="">-- اختر --</option>
                            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">الإيجار</label><input value={rentInput} onChange={e => setRentInput(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium mb-1">يوم الاستحقاق</label><NumberInput value={dueDay} onChange={setDueDay} allowDecimal={false} min={1} max={28} /></div>
                    <div><label className="block text-sm font-medium mb-1">تاريخ البدء</label><input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium mb-1">تاريخ الانتهاء</label><input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium mb-1">الوديعة</label><input value={depositInput} onChange={e => setDepositInput(e.target.value)} /></div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الحالة</label>
                        <select value={status} onChange={e => setStatus(e.target.value as Contract['status'])}>
                            <option value="ACTIVE">نشط</option>
                            <option value="ENDED">منتهي</option>
                            <option value="SUSPENDED">معلق</option>
                        </select>
                    </div>
                </div>

                {!contract && maintenanceBlock?.blocked && (
                    <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
                        <p className="font-bold mb-2">لا يمكن إنشاء عقد — يوجد طلبات صيانة حرجة مفتوحة على هذه الوحدة</p>
                        <ul className="list-disc pr-5 space-y-1 text-sm">
                            {maintenanceBlock.requests.map((request) => (
                                <li key={request.id}>
                                    {request.title} — الأولوية: {request.priority}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {contract && <AttachmentsManager entityType="CONTRACT" entityId={contract.id} />}

                {contract && contractTransactions.length > 0 && (
                    <div className="pt-4 border-t border-border mt-4">
                        <h4 className="text-md font-bold mb-3">سجل الحركات المالية</h4>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {contractTransactions.map(tx => (
                                <div key={tx.id} className={`p-2 rounded-md text-sm ${'channel' in tx ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold">{'channel' in tx ? `سند قبض #${tx.no}` : `مصروف #${tx.no}`}</span>
                                        <span className={`font-bold ${'channel' in tx ? 'text-primary' : 'text-red-600'}`}>{formatCurrency(tx.amount, db.settings.operational.currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-text-muted"><span>{formatDateTime(tx.dateTime)}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>إلغاء</button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSaving || (!contract && (isCheckingMaintenance || maintenanceBlock?.blocked))}
                    >
                        {isSaving ? 'جاري الحفظ...' : 'حفظ العقد'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default Contracts;
