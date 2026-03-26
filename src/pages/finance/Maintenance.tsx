

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { MaintenanceRecord, Expense, Invoice } from '../../types';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../../components/shared/ActionsMenu';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../utils/helpers';
import HardGateBanner from '../../components/shared/HardGateBanner';
import SearchFilterBar from '../../components/shared/SearchFilterBar';
import { toast } from 'react-hot-toast';
import { Wrench, Clock, Loader2, CheckCircle, DollarSign } from 'lucide-react';

const Maintenance: React.FC = () => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
            toast.error("لا يمكن حذف طلب الصيانة هذا لأنه مرتبط بحركة مالية. يرجى إلغاء المصروف أو الفاتورة أولاً.");
            return;
        }
        await dataService.remove('maintenanceRecords', id);
    };

    const expensesMap = useMemo(() => new Map(db?.expenses.map(e => [e.id, e])), [db?.expenses]);
    const invoicesMap = useMemo(() => new Map(db?.invoices.map(i => [i.id, i])), [db?.invoices]);

    const filteredRecords = useMemo(() => {
        if (!db) return [];
        return db.maintenanceRecords.filter(rec => {
            const unit = db.units.find(u => u.id === rec.unitId);
            return rec.no.includes(searchTerm) || rec.description.includes(searchTerm) || unit?.name.includes(searchTerm);
        }).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [db, searchTerm]);
    
    const maintenanceStats = useMemo(() => {
        if (!db) return { total: 0, newCount: 0, inProgress: 0, completed: 0, totalCost: 0 };
        const records = db.maintenanceRecords;
        return {
            total: records.length,
            newCount: records.filter(r => r.status === 'NEW').length,
            inProgress: records.filter(r => r.status === 'IN_PROGRESS').length,
            completed: records.filter(r => r.status === 'COMPLETED' || r.status === 'CLOSED').length,
            totalCost: records.reduce((s, r) => s + (r.cost || 0), 0),
        };
    }, [db]);

    if (!db) return null;

    return (
        <div className="space-y-6">
            <HardGateBanner />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Wrench size={18} className="mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-black">{maintenanceStats.total}</p>
                    <p className="text-[10px] text-text-muted">إجمالي الطلبات</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Clock size={18} className="mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-black text-amber-600">{maintenanceStats.newCount}</p>
                    <p className="text-[10px] text-text-muted">طلبات جديدة</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Loader2 size={18} className="mx-auto mb-1 text-orange-500" />
                    <p className="text-lg font-black text-orange-600">{maintenanceStats.inProgress}</p>
                    <p className="text-[10px] text-text-muted">قيد التنفيذ</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <CheckCircle size={18} className="mx-auto mb-1 text-emerald-500" />
                    <p className="text-lg font-black text-emerald-600">{maintenanceStats.completed}</p>
                    <p className="text-[10px] text-text-muted">مكتملة</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <DollarSign size={18} className="mx-auto mb-1 text-red-500" />
                    <p className="text-lg font-black text-red-600" dir="ltr">{formatCurrency(maintenanceStats.totalCost, db.settings.operational.currency)}</p>
                    <p className="text-[10px] text-text-muted">إجمالي التكاليف</p>
                </div>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">طلبات الصيانة</h2>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة طلب صيانة</button>
                </div>
                <SearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="بحث برقم الطلب، الوصف، أو اسم الوحدة..." />
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right border-collapse border border-border">
                        <thead className="text-xs uppercase bg-background text-text">
                            <tr>
                                <th scope="col" className="px-6 py-3 border border-border">رقم الطلب</th>
                                <th scope="col" className="px-6 py-3 border border-border">الوحدة</th>
                                <th scope="col" className="px-6 py-3 border border-border">تاريخ الطلب</th>
                                <th scope="col" className="px-6 py-3 border border-border">المصروف/الفاتورة</th>
                                <th scope="col" className="px-6 py-3 border border-border">التكلفة</th>
                                <th scope="col" className="px-6 py-3 border border-border">الحالة</th>
                                <th scope="col" className="px-6 py-3 border border-border">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(rec => {
                                const unit = db.units.find(u => u.id === rec.unitId);
                                const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;
                                const linkedExpense = rec.expenseId ? expensesMap.get(rec.expenseId) : null;
                                const linkedInvoice = rec.invoiceId ? invoicesMap.get(rec.invoiceId) : null;
                                const linkedDoc = linkedExpense || linkedInvoice;
                                return (
                                    <tr key={rec.id} onClick={() => handleOpenModal(rec)} className="bg-card hover:bg-background cursor-pointer">
                                        <td className="px-6 py-4 font-mono border border-border">{rec.no}</td>
                                        <td className="px-6 py-4 font-medium text-text border border-border">
                                            {unit?.name} <span className="text-xs text-text-muted">({property?.name})</span>
                                        </td>
                                        <td className="px-6 py-4 border border-border">{formatDate(rec.requestDate)}</td>
                                        <td className="px-6 py-4 font-mono text-xs border border-border">{linkedDoc ? (linkedDoc as Invoice | Expense).no : '—'}</td>
                                        {/* FIX: Corrected path to currency settings */}
                                        <td className="px-6 py-4 border border-border">{formatCurrency(rec.cost, db.settings.operational.currency)}</td>
                                        <td className="px-6 py-4 border border-border">
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(rec.status)}`}>
                                                {rec.status === 'NEW' ? 'جديد' : rec.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : rec.status === 'COMPLETED' ? 'مكتمل' : 'مغلق'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 border border-border">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <ActionsMenu items={[
                                                    EditAction(() => handleOpenModal(rec)),
                                                    DeleteAction(() => handleDelete(rec.id)),
                                                ]} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
            <MaintenanceForm isOpen={isModalOpen} onClose={handleCloseModal} record={editingRecord} />
        </div>
    );
};


const MaintenanceForm: React.FC<{ isOpen: boolean, onClose: () => void, record: MaintenanceRecord | null }> = ({ isOpen, onClose, record }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [unitId, setUnitId] = useState('');
    const [requestDate, setRequestDate] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<MaintenanceRecord['status']>('NEW');
    const [cost, setCost] = useState(0);
    const [chargedTo, setChargedTo] = useState<MaintenanceRecord['chargedTo']>('OWNER');

    useEffect(() => {
        if (!db) return;
        if (record) {
            setUnitId(record.unitId);
            setRequestDate(record.requestDate);
            setDescription(record.description);
            setStatus(record.status);
            setCost(record.cost);
            setChargedTo(record.chargedTo);
        } else {
            setUnitId(db.units[0]?.id || '');
            setRequestDate(new Date().toISOString().slice(0, 10));
            setDescription('');
            setStatus('NEW');
            setCost(0);
            // FIX: Corrected path to maintenance settings
            setChargedTo(db.settings.operational.maintenance.defaultChargedTo);
        }
    }, [record, isOpen, db]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        if (!unitId || !description) {
            toast.error("الوحدة والوصف مطلوبان.");
            return;
        }

        // This is an update
        if (record) {
            // Prevent editing financial fields if already linked to a transaction
            if ((record.expenseId || record.invoiceId) && (record.status !== status || record.cost !== cost || record.chargedTo !== chargedTo)) {
                toast.error("لا يمكن تعديل البيانات المالية لطلب صيانة مرتبط بالفعل بحركة مالية. لإجراء تغيير، يجب إلغاء المصروف أو الفاتورة أولاً.");
                return;
            }

            const isNewlyCompleted = ['COMPLETED', 'CLOSED'].includes(status) && !['COMPLETED', 'CLOSED'].includes(record.status) && cost > 0;
            let updates: Partial<MaintenanceRecord> = { unitId, requestDate, description, status, cost, chargedTo };

            if (isNewlyCompleted) {
                const activeContract = db.contracts.find(c => c.unitId === unitId && c.status === 'ACTIVE');
                if (chargedTo === 'TENANT') {
                    if (!activeContract) {
                        toast.error("لا يمكن تحميل التكلفة على المستأجر لعدم وجود عقد نشط لهذه الوحدة.");
                        return; // Stop submission
                    }
                    // FIX: Use dataService for data manipulation
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
                } else { // OWNER or OFFICE
                    // FIX: Use dataService for data manipulation
                    const newExpense = await dataService.add('expenses', {
                        contractId: activeContract?.id || null, // For context
                        dateTime: new Date().toISOString(),
                        category: 'صيانة',
                        amount: cost,
                        ref: `صيانة للوحدة ${db.units.find(u => u.id === unitId)?.name}`,
                        notes: description,
                        chargedTo,
                        // FIX: Added missing `status` property required by the Expense type.
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
            await dataService.add('maintenanceRecords', { unitId, requestDate, description, status, cost, chargedTo });
        }
        onClose();
    };
    
    if (!db) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? "تعديل طلب صيانة" : "إضافة طلب صيانة"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الوحدة</label>
                        <select value={unitId} onChange={e => setUnitId(e.target.value)} required>
                           {db.units.map(u => <option key={u.id} value={u.id}>{u.name} ({db.properties.find(p=>p.id === u.propertyId)?.name})</option>)}
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
                            <option value="NEW">جديد</option>
                            <option value="IN_PROGRESS">قيد التنفيذ</option>
                            <option value="COMPLETED">مكتمل</option>
                            <option value="CLOSED">مغلق</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">التكلفة</label>
                        <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} />
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
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default Maintenance;