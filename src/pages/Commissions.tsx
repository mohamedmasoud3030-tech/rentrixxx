import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { DollarSign } from 'lucide-react';
import { Commission } from '../types';
import NumberInput from '../components/ui/NumberInput';
import { toast } from 'react-hot-toast';
import ActionsMenu, { EditAction } from '../components/shared/ActionsMenu';
import ConfirmActionModal from '../components/shared/ConfirmActionModal';

type StatusFilter = 'ALL' | 'PENDING' | 'PAID';

const Commissions: React.FC = () => {
    const { db, dataService, financeService } = useApp();
    const commissions = db.commissions || [];
    const users = db.auth?.users || [];
    const [payoutLoading, setPayoutLoading] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
    const [commissionToPayout, setCommissionToPayout] = useState<Commission | null>(null);

    const usersMap = useMemo(() => new Map<string, string>(
        users ? users.map(u => [u.id, u.username] as [string, string]) : []
    ), [users]);

    const formatOmr = (value: number) => `${(Number.isFinite(value) ? value : 0).toFixed(3)} ر.ع`;
    const isPendingStatus = (status: Commission['status']) => status === 'PENDING' || status === 'UNPAID';

    const filteredCommissions = useMemo(() => {
        if (statusFilter === 'ALL') return commissions;
        if (statusFilter === 'PENDING') return commissions.filter(c => isPendingStatus(c.status));
        return commissions.filter(c => c.status === 'PAID');
    }, [commissions, statusFilter]);

    const totalPending = commissions.filter(c => isPendingStatus(c.status)).reduce((s, c) => s + c.amount, 0);
    const totalPaid = commissions.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amount, 0);
    const totalCommissions = commissions.reduce((s, c) => s + c.amount, 0);

    const getCommissionTypeLabel = (commission: Commission) => {
        const normalized = commission.commissionType || (commission.type === 'RENT' ? 'RENTAL' : commission.type);
        switch (normalized) {
            case 'SALE': return 'بيع';
            case 'RENTAL': return 'إيجار';
            case 'MANAGEMENT': return 'إدارة';
            default: return normalized;
        }
    };

    const handlePayout = async (commission: Commission) => {
        setPayoutLoading(commission.id);
        try {
            await financeService.payoutCommission(commission.id);
            toast.success('تم صرف العمولة وتسجيل القيد بنجاح.');
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'تعذر صرف العمولة حالياً.';
            toast.error(message);
        } finally {
            setPayoutLoading(null);
            setCommissionToPayout(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{formatOmr(totalPending)}</p>
                    <p className="text-xs text-text-muted mt-1">مستحقة</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{formatOmr(totalPaid)}</p>
                    <p className="text-xs text-text-muted mt-1">مدفوعة</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{formatOmr(totalCommissions)}</p>
                    <p className="text-xs text-text-muted mt-1">إجمالي العمولات</p>
                </Card>
            </div>

            <Card>
                <div className="flex flex-wrap justify-between items-center gap-3 p-4 border-b border-border bg-background">
                    <h3 className="font-bold text-text flex items-center gap-2">💰 سجل نسب وعمولات الموظفين</h3>
                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            className="min-w-[150px]"
                        >
                            <option value="ALL">ALL</option>
                            <option value="PENDING">PENDING</option>
                            <option value="PAID">PAID</option>
                        </select>
                        <button onClick={() => { setEditingCommission(null); setIsModalOpen(true); }} className="btn btn-primary btn-sm">إضافة عمولة</button>
                    </div>
                </div>

                {filteredCommissions.length === 0 ? (
                    <div className="text-center py-12">
                        <DollarSign size={48} className="mx-auto text-text-muted mb-4" />
                        <h3 className="text-lg font-semibold mb-2">لا توجد عمولات مطابقة</h3>
                        <p className="text-sm text-text-muted">جرّب تغيير الفلتر أو إضافة عمولة جديدة.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="text-text-muted text-sm bg-background">
                                <tr>
                                    <th className="p-4">الموظف</th>
                                    <th className="p-4">المبلغ</th>
                                    <th className="p-4">نوع العمولة</th>
                                    <th className="p-4">مرجع العقد</th>
                                    <th className="p-4">الحالة</th>
                                    <th className="p-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="text-text">
                                {filteredCommissions.map(comm => (
                                    <tr key={comm.id} className="border-t border-border hover:bg-background transition-colors">
                                        <td className="p-4 font-medium">{usersMap.get(comm.staffId) || 'غير معروف'}</td>
                                        <td className="p-4 font-bold text-green-600">{formatOmr(comm.amount)}</td>
                                        <td className="p-4 text-sm">{getCommissionTypeLabel(comm)}</td>
                                        <td className="p-4 text-sm">{comm.contractId || '—'}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${comm.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {comm.status === 'PAID' ? 'PAID' : 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="p-4 action-cell">
                                            <div className="flex justify-end items-center gap-2">
                                                {isPendingStatus(comm.status) && (
                                                    <button
                                                        onClick={() => setCommissionToPayout(comm)}
                                                        className="btn btn-primary btn-sm"
                                                        disabled={payoutLoading === comm.id}
                                                    >
                                                        {payoutLoading === comm.id ? 'جاري الصرف...' : 'صرف العمولة'}
                                                    </button>
                                                )}
                                                <ActionsMenu items={[
                                                    EditAction(() => { setEditingCommission(comm); setIsModalOpen(true); }),
                                                ]} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {isModalOpen && (
                <CommissionForm
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    commission={editingCommission}
                />
            )}
            <ConfirmActionModal
                isOpen={!!commissionToPayout}
                onClose={() => setCommissionToPayout(null)}
                onConfirm={() => commissionToPayout && handlePayout(commissionToPayout)}
                title="تأكيد صرف العمولة"
                message={commissionToPayout
                    ? `هل أنت متأكد من صرف عمولة بقيمة ${formatOmr(commissionToPayout.amount)} للموظف ${usersMap.get(commissionToPayout.staffId)}؟ سيتم إنشاء قيد محاسبي تلقائياً.`
                    : ''}
                confirmLabel="صرف العمولة"
                isLoading={!!commissionToPayout && payoutLoading === commissionToPayout.id}
                tone="primary"
            />
        </div>
    );
};

const CommissionForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    commission: Commission | null;
}> = ({ isOpen, onClose, commission }) => {
    const { db, dataService } = useApp();
    const users = db.auth?.users || [];
    const [data, setData] = useState<Partial<Commission>>({});
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    React.useEffect(() => {
        if (commission) setData(commission);
        else setData({
            staffId: users[0]?.id || '',
            commissionType: 'RENTAL',
            status: 'PENDING',
            amount: 0,
        });
    }, [commission, users]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const finalData: Omit<Commission, 'id' | 'createdAt' | 'expenseId' | 'paidAt'> = {
                staffId: data.staffId || users[0]?.id || '',
                contractId: data.contractId || undefined,
                commissionType: (data.commissionType as Commission['commissionType']) || 'RENTAL',
                description: data.description || '',
                type: (data.commissionType === 'RENTAL' ? 'RENT' : data.commissionType) as Commission['type'],
                dealValue: data.dealValue || 0,
                percentage: data.percentage || 0,
                amount: data.amount || 0,
                status: (data.status as Commission['status']) || 'PENDING',
            };
            if (commission) {
                await dataService.update('commissions', commission.id, finalData);
            } else {
                await dataService.add('commissions', finalData);
            }
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={commission ? 'تعديل عمولة' : 'إضافة عمولة جديدة'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select name="staffId" value={data.staffId} onChange={handleChange} required>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">قيمة العمولة</label>
                        <NumberInput value={data.amount || ''} onChange={v => setData(prev => ({ ...prev, amount: v }))} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">مرجع العقد</label>
                        <input name="contractId" value={data.contractId || ''} onChange={handleChange} placeholder="CTR-0001" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <select name="commissionType" value={data.commissionType || 'RENTAL'} onChange={handleChange}>
                        <option value="SALE">بيع</option>
                        <option value="RENTAL">إيجار</option>
                        <option value="MANAGEMENT">إدارة</option>
                    </select>
                    <select name="status" value={data.status} onChange={handleChange}>
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                    </select>
                </div>
                <input name="description" value={data.description || ''} onChange={handleChange} placeholder="وصف العمولة" />
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default Commissions;
