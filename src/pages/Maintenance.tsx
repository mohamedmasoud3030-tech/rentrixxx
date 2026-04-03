import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { MaintenanceRecord, Expense, Invoice } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import { formatCurrency, formatDate, getStatusBadgeClass, normalizeArabicNumerals, exportToCsv } from '../utils/helpers';
import HardGateBanner from '../components/shared/HardGateBanner';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { toast } from 'react-hot-toast';
import { Clock, Loader2, CheckCircle, Download, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getMaintenanceSummary, updateMaintenanceStatus } from '../services/operationsService';

const MAINTENANCE_FILTER_KEY = 'rentrix:maintenance_filter';

type MaintenanceStatusFilter = 'ALL' | MaintenanceRecord['status'];

const normalizeMaintenanceStatus = (status: string): MaintenanceRecord['status'] => {
    if (status === 'NEW') return 'PENDING';
    if (status === 'CLOSED') return 'COMPLETED';
    if (status === 'CANCELED') return 'CANCELLED';
    return status as MaintenanceRecord['status'];
};

const statusLabel: Record<MaintenanceRecord['status'], string> = {
    PENDING: 'قيد الانتظار',
    IN_PROGRESS: 'جارٍ التنفيذ',
    COMPLETED: 'مكتملة',
    CANCELLED: 'ملغاة',
};

const statusTabs: { value: MaintenanceStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'الكل' },
    { value: 'PENDING', label: 'قيد الانتظار' },
    { value: 'IN_PROGRESS', label: 'جارٍ التنفيذ' },
    { value: 'COMPLETED', label: 'مكتملة' },
    { value: 'CANCELLED', label: 'ملغاة' },
];

const priorityBadgeClass: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300',
};

const priorityLabel: Record<string, string> = {
    URGENT: 'عاجلة',
    HIGH: 'عالية',
    MEDIUM: 'متوسطة',
    LOW: 'منخفضة',
};

const Maintenance: React.FC = () => {
    const { db, dataService, settings } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<MaintenanceStatusFilter>('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchParams] = useSearchParams();
    const prefilledUnitId = searchParams.get('unitId') || '';

    useEffect(() => {
        const saved = sessionStorage.getItem(MAINTENANCE_FILTER_KEY);
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved) as { status?: MaintenanceStatusFilter; fromDate?: string; toDate?: string };
            if (parsed.status && ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(parsed.status)) {
                setStatusFilter(parsed.status);
            }
            if (parsed.fromDate) setFromDate(parsed.fromDate);
            if (parsed.toDate) setToDate(parsed.toDate);
        } catch {
            // noop
        }
    }, []);

    useEffect(() => {
        sessionStorage.setItem(
            MAINTENANCE_FILTER_KEY,
            JSON.stringify({ status: statusFilter, fromDate, toDate }),
        );
    }, [statusFilter, fromDate, toDate]);

    const handleOpenModal = (record: MaintenanceRecord | null = null) => {
        setEditingRecord(record);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingRecord(null);
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (!db) return;
        const record = db.maintenanceRecords.find(r => r.id === id);
        if (record?.expenseId || record?.invoiceId) {
            toast.error('لا يمكن حذف طلب الصيانة هذا لأنه مرتبط بحركة مالية. يرجى إلغاء المصروف أو الفاتورة أولاً.');
            return;
        }
        await dataService.remove('maintenanceRecords', id);
    };

    const expensesMap = useMemo(() => new Map(db?.expenses.map(e => [e.id, e])), [db?.expenses]);
    const invoicesMap = useMemo(() => new Map(db?.invoices.map(i => [i.id, i])), [db?.invoices]);

    const filteredRecords = useMemo(() => {
        if (!db) return [];
        const q = normalizeArabicNumerals(searchTerm).trim();
        return db.maintenanceRecords
            .filter(rec => {
                const unit = db.units.find(u => u.id === rec.unitId);
                const normalizedNo = normalizeArabicNumerals(rec.no || '');
                const normalizedDescription = normalizeArabicNumerals(rec.description || '');
                const normalizedUnitName = normalizeArabicNumerals(unit?.name || '');
                const normalizedStatus = normalizeMaintenanceStatus(rec.status);
                const statusMatch = statusFilter === 'ALL' || normalizedStatus === statusFilter;
                const fromMatch = !fromDate || rec.requestDate >= fromDate;
                const toMatch = !toDate || rec.requestDate <= toDate;
                const queryMatch =
                    !q || normalizedNo.includes(q) || normalizedDescription.includes(q) || normalizedUnitName.includes(q);
                return statusMatch && fromMatch && toMatch && queryMatch;
            })
            .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [db, searchTerm, statusFilter, fromDate, toDate]);

    const filteredTotalCost = useMemo(
        () => filteredRecords.reduce((sum, record) => sum + (record.cost || 0), 0),
        [filteredRecords],
    );

    const normalizedRecords = useMemo(
        () => (db?.maintenanceRecords || []).map(record => ({ ...record, status: normalizeMaintenanceStatus(record.status) })),
        [db],
    );
    const maintenanceSummary = useMemo(() => getMaintenanceSummary(normalizedRecords), [normalizedRecords]);

    const handleStatusUpdate = async (record: MaintenanceRecord, nextStatus: MaintenanceRecord['status']) => {
        const currentStatus = normalizeMaintenanceStatus(record.status);
        if (currentStatus === nextStatus) return;
        const result = await updateMaintenanceStatus(record.id, nextStatus, { currentStatus });
        if (!result.success) {
            toast.error(result.error || 'تعذر تحديث الحالة');
            return;
        }
        const updates: Partial<MaintenanceRecord> = { status: nextStatus };
        if (nextStatus === 'COMPLETED') updates.completedAt = Date.now();
        if (nextStatus === 'CANCELLED') updates.cancelledAt = new Date().toISOString();
        await dataService.update('maintenanceRecords', record.id, updates);
        toast.success('تم تحديث الحالة');
    };

    if (!db) return null;

    return (
        <div className="space-y-6">
            <HardGateBanner />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Clock size={18} className="mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-black text-amber-600">{maintenanceSummary.pending}</p>
                    <p className="text-[10px] text-text-muted">قيد الانتظار</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Loader2 size={18} className="mx-auto mb-1 text-orange-500" />
                    <p className="text-lg font-black text-orange-600">{maintenanceSummary.inProgress}</p>
                    <p className="text-[10px] text-text-muted">جارٍ التنفيذ</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <CheckCircle size={18} className="mx-auto mb-1 text-emerald-500" />
                    <p className="text-lg font-black text-emerald-600">{maintenanceSummary.completed}</p>
                    <p className="text-[10px] text-text-muted">مكتملة</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <XCircle size={18} className="mx-auto mb-1 text-red-500" />
                    <p className="text-lg font-black text-red-600">{maintenanceSummary.cancelled}</p>
                    <p className="text-[10px] text-text-muted">ملغاة</p>
                </div>
            </div>

            <Card>
                <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">طلبات الصيانة</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const data = filteredRecords.map(r => ({
                                    'رقم الطلب': r.no,
                                    الوحدة: db.units.find(u => u.id === r.unitId)?.name || '—',
                                    'تاريخ الطلب': formatDate(r.requestDate),
                                    الوصف: r.description || '—',
                                    'مكلّف إلى': r.assignedTo || '—',
                                    الأولوية: priorityLabel[r.priority || 'LOW'] || 'منخفضة',
                                    التكلفة: formatCurrency(r.cost || 0, settings.operational.currency),
                                    الحالة: statusLabel[normalizeMaintenanceStatus(r.status)],
                                }));
                                exportToCsv('طلبات_صيانة_rentrix', data);
                            }}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Download size={14} /> تصدير CSV
                        </button>
                        <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة طلب صيانة</button>
                    </div>
                </div>
                <SearchFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    placeholder="بحث برقم الطلب، الوصف، أو اسم الوحدة..."
                />
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    {statusTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`btn text-sm ${statusFilter === tab.value ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                        <label className="block text-xs text-text-muted mb-1">من تاريخ الطلب</label>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-text-muted mb-1">إلى تاريخ الطلب</label>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                </div>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-right border-collapse border border-border">
                        <thead className="text-xs uppercase bg-background text-text">
                            <tr>
                                <th scope="col" className="px-4 py-3 border border-border">رقم الطلب</th>
                                <th scope="col" className="px-4 py-3 border border-border">الوحدة</th>
                                <th scope="col" className="px-4 py-3 border border-border">تاريخ الطلب</th>
                                <th scope="col" className="px-4 py-3 border border-border">مُكلَّف إلى</th>
                                <th scope="col" className="px-4 py-3 border border-border">الأولوية</th>
                                <th scope="col" className="px-4 py-3 border border-border">المصروف/الفاتورة</th>
                                <th scope="col" className="px-4 py-3 border border-border">التكلفة</th>
                                <th scope="col" className="px-4 py-3 border border-border">الحالة</th>
                                <th scope="col" className="px-4 py-3 border border-border">تاريخ الإنجاز</th>
                                <th scope="col" className="px-4 py-3 border border-border">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(rec => {
                                const unit = db.units.find(u => u.id === rec.unitId);
                                const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
                                const linkedExpense = rec.expenseId ? expensesMap.get(rec.expenseId) : null;
                                const linkedInvoice = rec.invoiceId ? invoicesMap.get(rec.invoiceId) : null;
                                const linkedDoc = linkedExpense || linkedInvoice;
                                const completionDate = rec.completionDate || (rec.completedAt ? new Date(rec.completedAt).toISOString().slice(0, 10) : '');
                                const normalizedStatus = normalizeMaintenanceStatus(rec.status);
                                return (
                                    <tr key={rec.id} onClick={() => handleOpenModal(rec)} className="bg-card hover:bg-background cursor-pointer">
                                        <td className="px-4 py-3 font-mono border border-border">{rec.no}</td>
                                        <td className="px-4 py-3 font-medium text-text border border-border">
                                            {unit?.name} <span className="text-xs text-text-muted">({property?.name})</span>
                                        </td>
                                        <td className="px-4 py-3 border border-border">{formatDate(rec.requestDate)}</td>
                                        <td className="px-4 py-3 border border-border">{rec.assignedTo || '—'}</td>
                                        <td className="px-4 py-3 border border-border">
                                            <span className={`px-2 py-1 text-xs rounded-full ${priorityBadgeClass[rec.priority || 'LOW']}`}>
                                                {priorityLabel[rec.priority || 'LOW']}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs border border-border">{linkedDoc ? (linkedDoc as Invoice | Expense).no : '—'}</td>
                                        <td className="px-4 py-3 border border-border">{formatCurrency(rec.cost || 0, settings.operational.currency)}</td>
                                        <td className="px-4 py-3 border border-border">
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(normalizedStatus)}`}>
                                                {statusLabel[normalizedStatus]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 border border-border">
                                            {normalizedStatus === 'COMPLETED' && completionDate ? formatDate(completionDate) : '—'}
                                        </td>
                                        <td className="px-4 py-3 border border-border" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    aria-label="تحديث الحالة"
                                                    className="text-xs"
                                                    value={normalizedStatus}
                                                    onChange={e => handleStatusUpdate(rec, e.target.value as MaintenanceRecord['status'])}
                                                >
                                                    <option value="PENDING">تحديث الحالة: قيد الانتظار</option>
                                                    <option value="IN_PROGRESS">تحديث الحالة: جارٍ التنفيذ</option>
                                                    <option value="COMPLETED">تحديث الحالة: مكتملة</option>
                                                    <option value="CANCELLED">تحديث الحالة: ملغاة</option>
                                                </select>
                                                <ActionsMenu
                                                    items={[
                                                        EditAction(() => handleOpenModal(rec)),
                                                        DeleteAction(() => handleDelete(rec.id)),
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-background border border-border rounded-lg p-3">
                        <p className="text-xs text-text-muted mb-1">إجمالي التكلفة</p>
                        <p className="font-bold" dir="ltr">{formatCurrency(maintenanceSummary.totalCost, settings.operational.currency)}</p>
                    </div>
                    <div className="bg-background border border-border rounded-lg p-3">
                        <p className="text-xs text-text-muted mb-1">حصة المالك</p>
                        <p className="font-bold" dir="ltr">{formatCurrency(maintenanceSummary.ownerCost, settings.operational.currency)}</p>
                    </div>
                    <div className="bg-background border border-border rounded-lg p-3">
                        <p className="text-xs text-text-muted mb-1">حصة المستأجر</p>
                        <p className="font-bold" dir="ltr">{formatCurrency(maintenanceSummary.tenantCost, settings.operational.currency)}</p>
                    </div>
                    <div className="bg-background border border-border rounded-lg p-3">
                        <p className="text-xs text-text-muted mb-1">حصة المكتب</p>
                        <p className="font-bold" dir="ltr">{formatCurrency(maintenanceSummary.officeCost, settings.operational.currency)}</p>
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex justify-end">
                    <p className="text-sm font-bold">
                        إجمالي تكاليف الفترة المفلترة: <span className="text-primary">{formatCurrency(filteredTotalCost, settings.operational.currency)}</span>
                    </p>
                </div>
            </Card>
            <MaintenanceForm
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                record={editingRecord}
                prefilledUnitId={prefilledUnitId}
            />
        </div>
    );
};

const MaintenanceForm: React.FC<{ isOpen: boolean; onClose: () => void; record: MaintenanceRecord | null; prefilledUnitId?: string }> = ({ isOpen, onClose, record, prefilledUnitId }) => {
    const { db, dataService, settings } = useApp();
    const [unitId, setUnitId] = useState('');
    const [requestDate, setRequestDate] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<MaintenanceRecord['status']>('PENDING');
    const [cost, setCost] = useState(0);
    const [chargedTo, setChargedTo] = useState<MaintenanceRecord['chargedTo']>('OWNER');
    const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
    const [assignedTo, setAssignedTo] = useState('');
    const [completionDate, setCompletionDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    useEffect(() => {
        if (!db) return;
        if (record) {
            setUnitId(record.unitId);
            setRequestDate(record.requestDate);
            setDescription(record.description);
            setStatus(normalizeMaintenanceStatus(record.status));
            setCost(record.cost || 0);
            setChargedTo(record.chargedTo);
            setPriority(record.priority || 'MEDIUM');
            setAssignedTo(record.assignedTo || '');
            setCompletionDate(record.completionDate || (record.completedAt ? new Date(record.completedAt).toISOString().slice(0, 10) : ''));
        } else {
            setUnitId(prefilledUnitId || db.units[0]?.id || '');
            setRequestDate(new Date().toISOString().slice(0, 10));
            setDescription('');
            setStatus('PENDING');
            setCost(0);
            setChargedTo(settings.operational.maintenance.defaultChargedTo);
            setPriority('MEDIUM');
            setAssignedTo('');
            setCompletionDate('');
        }
    }, [record, isOpen, db, prefilledUnitId, settings.operational.maintenance.defaultChargedTo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        if (!db) return;
        if (!unitId || !description) {
            toast.error('الوحدة والوصف مطلوبان.');
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            if (record) {
                if ((record.expenseId || record.invoiceId) && (record.status !== status || record.cost !== cost || record.chargedTo !== chargedTo)) {
                    toast.error('لا يمكن تعديل البيانات المالية لطلب صيانة مرتبط بالفعل بحركة مالية. لإجراء تغيير، يجب إلغاء المصروف أو الفاتورة أولاً.');
                    return;
                }

                const normalizedRecordStatus = normalizeMaintenanceStatus(record.status);
                const isNewlyCompleted = status === 'COMPLETED' && normalizedRecordStatus !== 'COMPLETED' && cost > 0;
                const updates: Partial<MaintenanceRecord> = {
                    unitId,
                    requestDate,
                    description,
                    status,
                    cost,
                    chargedTo,
                    priority,
                    assignedTo: assignedTo || undefined,
                    completionDate: status === 'COMPLETED' ? (completionDate || new Date().toISOString().slice(0, 10)) : undefined,
                };

                if (isNewlyCompleted) {
                    const activeContract = db.contracts.find(c => c.unitId === unitId && c.status === 'ACTIVE');
                    if (chargedTo === 'TENANT') {
                        if (!activeContract) {
                            toast.error('لا يمكن تحميل التكلفة على المستأجر لعدم وجود عقد نشط لهذه الوحدة.');
                            return;
                        }
                        const newInvoice = await dataService.add('invoices', {
                            contractId: activeContract.id,
                            dueDate: new Date().toISOString().slice(0, 10),
                            amount: cost,
                            paidAmount: 0,
                            status: 'UNPAID',
                            type: 'MAINTENANCE',
                            notes: `فاتورة صيانة: ${description}`.slice(0, 100),
                        });
                        if (newInvoice) {
                            updates.invoiceId = newInvoice.id;
                            updates.completedAt = Date.now();
                        }
                    } else {
                        const newExpense = await dataService.add('expenses', {
                            contractId: activeContract?.id || null,
                            dateTime: new Date().toISOString(),
                            category: 'صيانة',
                            amount: cost,
                            ref: `صيانة للوحدة ${db.units.find(u => u.id === unitId)?.name}`,
                            notes: description,
                            chargedTo,
                            status: 'POSTED',
                        });
                        if (newExpense) {
                            updates.expenseId = newExpense.id;
                            updates.completedAt = Date.now();
                        }
                    }
                }
                await dataService.update('maintenanceRecords', record.id, updates);
            } else {
                await dataService.add('maintenanceRecords', {
                    unitId,
                    requestDate,
                    description,
                    status,
                    cost,
                    chargedTo,
                    priority,
                    assignedTo: assignedTo || undefined,
                    completionDate: status === 'COMPLETED' ? (completionDate || new Date().toISOString().slice(0, 10)) : undefined,
                });
            }
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    if (!db) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? 'تعديل طلب صيانة' : 'إضافة طلب صيانة'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الوحدة</label>
                        <select value={unitId} onChange={e => setUnitId(e.target.value)} required>
                            {db.units.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({db.properties.find(p => p.id === u.propertyId)?.name})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">تاريخ الطلب</label>
                        <input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">الوصف</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={3} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الحالة</label>
                        <select value={status} onChange={e => setStatus(e.target.value as MaintenanceRecord['status'])}>
                            <option value="PENDING">قيد الانتظار</option>
                            <option value="IN_PROGRESS">جارٍ التنفيذ</option>
                            <option value="COMPLETED">مكتملة</option>
                            <option value="CANCELLED">ملغاة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">التكلفة ({settings.operational.currency})</label>
                        <input type="number" value={cost} onChange={e => setCost(Number(normalizeArabicNumerals(e.target.value)))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">تحميل على</label>
                        <select value={chargedTo} onChange={e => setChargedTo(e.target.value as MaintenanceRecord['chargedTo'])}>
                            <option value="OWNER">المالك</option>
                            <option value="OFFICE">المكتب</option>
                            <option value="TENANT">المستأجر</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الأولوية</label>
                        <select value={priority} onChange={e => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')}>
                            <option value="LOW">منخفضة</option>
                            <option value="MEDIUM">متوسطة</option>
                            <option value="HIGH">عالية</option>
                            <option value="URGENT">عاجلة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">مُكلَّف إلى</label>
                        <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="اسم الفني / المقاول" />
                    </div>
                    {status === 'COMPLETED' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">تاريخ الإنجاز</label>
                            <input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} />
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>
                        إلغاء
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default Maintenance;
