import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { DollarSign } from 'lucide-react';
import { Commission } from '../types';
import { formatCurrency } from '../utils/helpers';
import NumberInput from '../components/ui/NumberInput';
import { toast } from 'react-hot-toast';
import ActionsMenu, { EditAction } from '../components/shared/ActionsMenu';

const Commissions: React.FC = () => {
    const { db, dataService, financeService } = useApp();
    const commissions = db.commissions || [];
    const users = db.auth?.users || [];
    const [payoutLoading, setPayoutLoading] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCommission, setEditingCommission] = useState<Commission | null>(null);

    const usersMap = useMemo(() => new Map<string, string>(
        users ? users.map(u => [u.id, u.username] as [string, string]) : []
    ), [users]);

    const handlePayout = async (commission: Commission) => {
        if (window.confirm(`هل أنت متأكد من صرف عمولة بقيمة ${formatCurrency(commission.amount)} للموظف ${usersMap.get(commission.staffId)}؟ سيتم إنشاء قيد محاسبي تلقائياً.`)) {
            setPayoutLoading(commission.id);
            try {
                await financeService.payoutCommission(commission.id);
                toast.success("تم صرف العمولة وتسجيل القيد بنجاح.");
            } catch (e: any) {
                toast.error(e.message);
            } finally {
                setPayoutLoading(null);
            }
        }
    };

    const totalPending = commissions.filter(c => c.status === 'UNPAID').reduce((s, c) => s + c.amount, 0);
    const totalPaid = commissions.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amount, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
                    <p className="text-xs text-text-muted mt-1">عمولات قيد الانتظار</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                    <p className="text-xs text-text-muted mt-1">عمولات تم صرفها</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{commissions.length}</p>
                    <p className="text-xs text-text-muted mt-1">إجمالي العمولات</p>
                </Card>
            </div>

            <Card>
                <div className="flex justify-between items-center p-4 border-b border-border bg-background">
                    <h3 className="font-bold text-text flex items-center gap-2">💰 سجل نسب وعمولات الموظفين</h3>
                    <button onClick={() => { setEditingCommission(null); setIsModalOpen(true); }} className="btn btn-primary btn-sm">إضافة عمولة</button>
                </div>

                {commissions.length === 0 ? (
                    <div className="text-center py-12">
                        <DollarSign size={48} className="mx-auto text-text-muted mb-4" />
                        <h3 className="text-lg font-semibold mb-2">لا توجد عمولات مسجلة</h3>
                        <p className="text-sm text-text-muted">ابدأ بإضافة عمولات الموظفين.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="text-text-muted text-sm bg-background">
                                <tr>
                                    <th className="p-4">الموظف</th>
                                    <th className="p-4">العملية</th>
                                    <th className="p-4">قيمة الصفقة</th>
                                    <th className="p-4">النسبة</th>
                                    <th className="p-4">المستحق</th>
                                    <th className="p-4">الحالة</th>
                                    <th className="p-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="text-text">
                                {commissions.map(comm => (
                                    <tr key={comm.id} className="border-t border-border hover:bg-background transition-colors">
                                        <td className="p-4 font-medium">{usersMap.get(comm.staffId) || 'غير معروف'}</td>
                                        <td className="p-4 text-sm">
                                            {comm.type === 'SALE' ? '💎 بيع أرض' : comm.type === 'RENT' ? '🏠 تأجير وحدة' : '📝 تعاقد إداري'}
                                        </td>
                                        <td className="p-4">{formatCurrency(comm.dealValue)}</td>
                                        <td className="p-4 text-blue-500">{comm.percentage}%</td>
                                        <td className="p-4 font-bold text-green-600">{formatCurrency(comm.amount)}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${comm.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {comm.status === 'PAID' ? 'تم الصرف' : 'قيد الانتظار'}
                                            </span>
                                        </td>
                                        <td className="p-4 action-cell">
                                            <ActionsMenu items={[
                                                EditAction(() => { setEditingCommission(comm); setIsModalOpen(true); }),
                                                ...(comm.status === 'UNPAID' ? [{
                                                    label: payoutLoading === comm.id ? 'جاري الصرف...' : 'صرف العمولة',
                                                    icon: <DollarSign size={16} />,
                                                    onClick: () => handlePayout(comm)
                                                }] : []),
                                            ]} />
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
            type: 'RENT',
            status: 'UNPAID',
            dealValue: 0,
            percentage: 0
        });
    }, [commission, users]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const calculatedAmount = useMemo(() => {
        if (data.dealValue && data.percentage) {
            return (data.dealValue * data.percentage) / 100;
        }
        return data.amount || 0;
    }, [data.dealValue, data.percentage, data.amount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const finalData: Omit<Commission, 'id' | 'createdAt' | 'expenseId' | 'paidAt'> = {
                staffId: data.staffId || users[0]?.id || '',
                type: (data.type as Commission['type']) || 'RENT',
                dealValue: data.dealValue || 0,
                percentage: data.percentage || 0,
                amount: calculatedAmount,
                status: (data.status as Commission['status']) || 'UNPAID',
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
                        <label className="block text-sm font-medium mb-1">قيمة الصفقة</label>
                        <NumberInput value={data.dealValue || ''} onChange={v => setData(prev => ({ ...prev, dealValue: v }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">النسبة %</label>
                        <NumberInput value={data.percentage || ''} onChange={v => setData(prev => ({ ...prev, percentage: v }))} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">المبلغ المستحق</label>
                    <NumberInput value={calculatedAmount} onChange={v => setData(prev => ({ ...prev, amount: v }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <select name="type" value={data.type} onChange={handleChange}>
                        <option value="RENT">تأجير وحدة</option>
                        <option value="SALE">بيع أرض</option>
                        <option value="MANAGEMENT">تعاقد إداري</option>
                    </select>
                    <select name="status" value={data.status} onChange={handleChange}>
                        <option value="UNPAID">قيد الانتظار</option>
                        <option value="PAID">تم الصرف</option>
                    </select>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default Commissions;
