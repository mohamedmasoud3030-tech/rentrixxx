import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { Users, Eye, MapPin, PlusCircle, DollarSign } from 'lucide-react';
import { Land, Commission } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { toast } from 'react-hot-toast';
import ActionsMenu, { EditAction, DeleteAction } from '../../components/shared/ActionsMenu';

const LandsAndCommissions: React.FC = () => {
  return (
    <div className="space-y-6">
      <LandSalesManager />
      <StaffRewards />
    </div>
  );
};

const LandSalesManager = () => {
  // FIX: Use dataService for data manipulation
  const { db, dataService } = useApp();
  const lands = db.lands || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLand, setEditingLand] = useState<Land | null>(null);

  const handleOpenModal = (land: Land | null = null) => {
    setEditingLand(land);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);
  
  const getCategoryStyle = (category: string) => {
    switch (category) {
        case 'سكني': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'تجاري': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'صناعي': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-2">🗺️ مستودع عروض الأراضي</h2>
        <button onClick={() => handleOpenModal()} className="btn btn-primary flex items-center gap-2"><PlusCircle size={16}/> إضافة أرض جديدة</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(lands || []).map(land => (
          <div key={land.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-lg hover:ring-2 hover:ring-primary transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className={`px-2 py-1 rounded text-xs font-bold ${getCategoryStyle(land.category)}`}>
                {land.category}
              </span>
               <div className="relative" onClick={(e) => e.stopPropagation()}>
                    {/* FIX: Use dataService for data manipulation */}
                    <ActionsMenu items={[ EditAction(() => handleOpenModal(land)), DeleteAction(async () => await dataService.remove('lands', land.id)) ]} />
                </div>
            </div>
            
            <div onClick={() => handleOpenModal(land)} className="cursor-pointer">
              <h3 className="text-lg font-bold text-text mb-2">{land.name}</h3>
              <p className="text-text-muted text-xs">قطعة رقم: {land.plotNo}</p>
              
              <div className="space-y-2 border-t border-border pt-3 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">صافي المالك:</span>
                  <span className="text-text font-medium">{formatCurrency(land.ownerPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">عمولة المكتب:</span>
                  <span className="text-primary font-bold">{formatCurrency(land.commission)}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(land);}} className="flex-1 border border-primary text-primary py-2 rounded-md hover:bg-primary hover:text-white transition-all text-sm flex items-center justify-center gap-2">
                  <Eye size={16}/> عرض التفاصيل
                </button>
                <button onClick={(e) => { e.stopPropagation(); const query = encodeURIComponent(`${land.location} ${land.plotNo}`); window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank'); }} className="p-2 border border-border rounded-md text-text-muted hover:bg-background">
                  <MapPin size={16}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && <LandForm isOpen={isModalOpen} onClose={handleCloseModal} land={editingLand} />}
    </Card>
  );
};

const StaffRewards = () => {
  // FIX: Use financeService for financial operations
  const { db, financeService } = useApp();
  const commissions = db.commissions || [];
  const users = db.auth?.users || [];
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);
  
  // FIX: Explicitly type the Map to Map<string, string> to resolve 'unknown' type error in JSX by ensuring the return type of Map.get() is inferred correctly.
  const usersMap = useMemo(() => new Map<string, string>(users ? users.map(u => [u.id, u.username] as [string, string]) : []), [users]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);

  const handlePayout = async (commission: Commission) => {
    if(window.confirm(`هل أنت متأكد من صرف عمولة بقيمة ${formatCurrency(commission.amount)} للموظف ${usersMap.get(commission.staffId)}؟ سيتم إنشاء قيد محاسبي تلقائياً.`)) {
        setPayoutLoading(commission.id);
        try {
            // FIX: Use financeService for financial operations
            await financeService.payoutCommission(commission.id);
            toast.success("تم صرف العمولة وتسجيل القيد بنجاح.");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setPayoutLoading(null);
        }
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center p-4 border-b border-border bg-background">
        <h3 className="font-bold text-text flex items-center gap-2">💰 سجل نسب وعمولات الموظفين</h3>
        <button onClick={() => { setEditingCommission(null); setIsModalOpen(true); }} className="btn btn-secondary btn-sm">إضافة عمولة</button>
      </div>
      <table className="w-full text-right">
        <thead className="text-text-muted text-sm">
          <tr>
            <th className="p-4">الموظف</th><th className="p-4">العملية</th>
            <th className="p-4">قيمة الصفقة</th><th className="p-4">النسبة</th>
            <th className="p-4">المستحق</th><th className="p-4">الحالة</th>
            <th className="p-4">إجراءات</th>
          </tr>
        </thead>
        <tbody className="text-text">
          {(commissions || []).map(comm => (
            <tr key={comm.id} className="border-t border-border hover:bg-background transition-colors">
              <td className="p-4 font-medium">{usersMap.get(comm.staffId) || 'غير معروف'}</td>
              <td className="p-4 text-sm">{comm.type === 'SALE' ? '💎 بيع أرض' : comm.type === 'RENT' ? '🏠 تأجير وحدة' : '📝 تعاقد إداري'}</td>
              <td className="p-4">{formatCurrency(comm.dealValue)}</td>
              <td className="p-4 text-blue-500">{comm.percentage}%</td>
              <td className="p-4 font-bold text-green-600">{formatCurrency(comm.amount)}</td>
              <td className="p-4">
                <span className={`px-3 py-1 rounded-full text-[10px] ${comm.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
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
                ]}/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isModalOpen && <CommissionForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} commission={editingCommission} />}
    </Card>
  );
};

const CommissionForm: React.FC<{ isOpen: boolean, onClose: () => void, commission: Commission | null }> = ({ isOpen, onClose, commission }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [data, setData] = useState<Partial<Commission>>({});
    
    if (!db) return null;

    useEffect(() => {
        if(commission) setData(commission);
        else setData({
            staffId: db.auth.users[0]?.id || '',
            type: 'RENT', status: 'UNPAID', dealValue: 0, percentage: 0
        });
    }, [commission, db.auth.users]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: ['dealValue', 'percentage', 'amount'].includes(name) ? parseFloat(value) : value }));
    };

    const calculatedAmount = useMemo(() => {
        if (data.dealValue && data.percentage) {
            return (data.dealValue * data.percentage) / 100;
        }
        return data.amount || 0;
    }, [data.dealValue, data.percentage, data.amount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = { ...data, amount: calculatedAmount };
        if(commission) {
            await dataService.update('commissions', commission.id, finalData);
        } else {
            await dataService.add('commissions', finalData as any);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={commission ? 'تعديل عمولة' : 'إضافة عمولة جديدة'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select name="staffId" value={data.staffId} onChange={handleChange} required>
                    {db.auth.users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" name="dealValue" value={data.dealValue || ''} onChange={handleChange} placeholder="قيمة الصفقة"/>
                    <input type="number" name="percentage" value={data.percentage || ''} onChange={handleChange} placeholder="النسبة %"/>
                </div>
                <input type="number" name="amount" value={calculatedAmount} onChange={handleChange} placeholder="المبلغ المستحق" required />
                 <div className="grid grid-cols-2 gap-4">
                    <select name="type" value={data.type} onChange={handleChange}>
                        <option value="RENT">تأجير وحدة</option><option value="SALE">بيع أرض</option><option value="MANAGEMENT">تعاقد إداري</option>
                    </select>
                     <select name="status" value={data.status} onChange={handleChange}>
                        <option value="UNPAID">قيد الانتظار</option><option value="PAID">تم الصرف</option>
                    </select>
                 </div>
                <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button><button type="submit" className="btn btn-primary">حفظ</button></div>
            </form>
        </Modal>
    );
};

const LandForm: React.FC<{ isOpen: boolean, onClose: () => void, land: Land | null }> = ({ isOpen, onClose, land }) => {
    const { dataService, settings } = useApp();
    const [data, setData] = useState<Partial<Land>>({});

    React.useEffect(() => {
        if (land) setData(land);
        else setData({ category: 'سكني', status: 'AVAILABLE', ownerPrice: 0, commission: 0, area: 0 });
    }, [land]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: name === 'area' || name === 'ownerPrice' || name === 'commission' ? parseFloat(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const wasPreviouslyNotSold = !land || land.status !== 'SOLD';
        const isNowSold = data.status === 'SOLD';

        if (land) {
            await dataService.update('lands', land.id, data);
        } else {
            await dataService.add('lands', data as any);
        }

        if (wasPreviouslyNotSold && isNowSold && data.commission && data.commission > 0) {
            try {
                const mappings = settings.accounting?.accountMappings;
                const cashAccount = mappings?.paymentMethods?.CASH || '1111';
                const commissionRevenueAccount = mappings?.revenue?.OFFICE_COMMISSION || '4120';
                const landId = land?.id || 'new-land';
                await dataService.add('journalEntries', {
                    date: new Date().toISOString().slice(0, 10),
                    accountId: cashAccount,
                    amount: data.commission!,
                    type: 'DEBIT',
                    sourceId: `LAND-SALE-${landId}`,
                });
                await dataService.add('journalEntries', {
                    date: new Date().toISOString().slice(0, 10),
                    accountId: commissionRevenueAccount,
                    amount: data.commission!,
                    type: 'CREDIT',
                    sourceId: `LAND-SALE-${landId}`,
                });
                toast.success('تم تسجيل قيد إيراد عمولة بيع الأرض.');
            } catch (err) {
                console.error('Failed to post land commission journal entry', err);
            }
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={land ? 'تعديل بيانات الأرض' : 'إضافة أرض جديدة'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <input name="plotNo" value={data.plotNo || ''} onChange={handleChange} placeholder="رقم القطعة" required />
                   <input name="name" value={data.name || ''} onChange={handleChange} placeholder="اسم/وصف الموقع" required />
                   <input name="location" value={data.location || ''} onChange={handleChange} placeholder="الموقع (مثال: الخوض)" />
                   <input name="area" type="number" value={data.area || ''} onChange={handleChange} placeholder="المساحة (م²)" />
                   <select name="category" value={data.category} onChange={handleChange}>
                       <option value="سكني">سكني</option>
                       <option value="تجاري">تجاري</option>
                       <option value="صناعي">صناعي</option>
                   </select>
                   <select name="status" value={data.status} onChange={handleChange}>
                       <option value="AVAILABLE">متاحة</option>
                       <option value="RESERVED">محجوزة</option>
                       <option value="SOLD">مباعة</option>
                   </select>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input name="ownerPrice" type="number" value={data.ownerPrice || ''} onChange={handleChange} placeholder="صافي المالك" />
                    <input name="commission" type="number" value={data.commission || ''} onChange={handleChange} placeholder="عمولة المكتب" />
                 </div>
                 <textarea name="notes" value={data.notes || ''} onChange={handleChange} placeholder="ملاحظات..." />

                 <div className="flex justify-end items-center pt-4 border-t gap-2">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                 </div>
            </form>
        </Modal>
    );
};

export default LandsAndCommissions;
