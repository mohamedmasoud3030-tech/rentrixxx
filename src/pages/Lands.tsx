import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Eye, MapPin, PlusCircle } from 'lucide-react';
import { Land } from '../types';
import { formatCurrency, normalizeArabicNumerals } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';

const Lands: React.FC = () => {
    const { db, dataService, settings } = useApp();
    const lands = db.lands || [];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLand, setEditingLand] = useState<Land | null>(null);

    const handleOpenModal = (land: Land | null = null) => {
        setEditingLand(land);
        setIsModalOpen(true);
    };

    const getCategoryStyle = (category: string) => {
        switch (category) {
            case 'سكني': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'تجاري': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'صناعي': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700';
            case 'RESERVED': return 'bg-amber-100 text-amber-700';
            case 'SOLD': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'متاحة';
            case 'RESERVED': return 'محجوزة';
            case 'SOLD': return 'مباعة';
            default: return status;
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text flex items-center gap-2">🗺️ مستودع عروض الأراضي</h2>
                <button onClick={() => handleOpenModal()} className="btn btn-primary flex items-center gap-2">
                    <PlusCircle size={16} /> إضافة أرض جديدة
                </button>
            </div>

            {lands.length === 0 ? (
                <div className="text-center py-16">
                    <MapPin size={48} className="mx-auto text-text-muted mb-4" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد أراضي مسجلة</h3>
                    <p className="text-sm text-text-muted mb-6">ابدأ بإضافة عروض الأراضي المتاحة للبيع.</p>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة أرض جديدة</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lands.map(land => (
                        <div key={land.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-lg hover:ring-2 hover:ring-primary transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getCategoryStyle(land.category)}`}>
                                        {land.category}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusStyle(land.status)}`}>
                                        {getStatusLabel(land.status)}
                                    </span>
                                </div>
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <ActionsMenu items={[
                                        EditAction(() => handleOpenModal(land)),
                                        DeleteAction(async () => await dataService.remove('lands', land.id))
                                    ]} />
                                </div>
                            </div>

                            <div onClick={() => handleOpenModal(land)} className="cursor-pointer">
                                <h3 className="text-lg font-bold text-text mb-1">{land.name}</h3>
                                <p className="text-text-muted text-xs mb-1">قطعة رقم: {land.plotNo}</p>
                                {land.location && <p className="text-text-muted text-xs flex items-center gap-1"><MapPin size={10} /> {land.location}</p>}
                                {land.area > 0 && <p className="text-text-muted text-xs mt-1">المساحة: {land.area} م²</p>}

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
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(land); }} className="flex-1 border border-primary text-primary py-2 rounded-md hover:bg-primary hover:text-white transition-all text-sm flex items-center justify-center gap-2">
                                        <Eye size={16} /> عرض التفاصيل
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); const q = encodeURIComponent(`${land.location} ${land.plotNo}`); window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank'); }} className="p-2 border border-border rounded-md text-text-muted hover:bg-background">
                                        <MapPin size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && <LandForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} land={editingLand} />}
        </Card>
    );
};

const LandForm: React.FC<{ isOpen: boolean, onClose: () => void, land: Land | null }> = ({ isOpen, onClose, land }) => {
    const { dataService, settings } = useApp();
    const [data, setData] = useState<Partial<Land>>({});
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    React.useEffect(() => {
        if (land) setData(land);
        else setData({ category: 'سكني', status: 'AVAILABLE', ownerPrice: 0, commission: 0, area: 0 });
    }, [land]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = ['area', 'ownerPrice', 'commission'];
        const normalized = numericFields.includes(name) ? normalizeArabicNumerals(value) : value;
        setData(prev => ({ ...prev, [name]: numericFields.includes(name) ? parseFloat(normalized) : normalized }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const wasPreviouslyNotSold = !land || land.status !== 'SOLD';
            const isNowSold = data.status === 'SOLD';

            if (land) {
                await dataService.update('lands', land.id, data);
            } else {
                const newLand: Omit<Land, 'id' | 'createdAt' | 'updatedAt'> = {
                    plotNo: data.plotNo || '',
                    name: data.name || '',
                    location: data.location || '',
                    area: data.area || 0,
                    category: (data.category as Land['category']) || 'سكني',
                    status: (data.status as Land['status']) || 'AVAILABLE',
                    ownerPrice: data.ownerPrice || 0,
                    commission: data.commission || 0,
                    notes: data.notes || '',
                };
                await dataService.add('lands', newLand);
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
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={land ? 'تعديل بيانات الأرض' : 'إضافة أرض جديدة'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input name="plotNo" value={data.plotNo || ''} onChange={handleChange} placeholder="رقم القطعة" required />
                    <input name="name" value={data.name || ''} onChange={handleChange} placeholder="اسم/وصف الموقع" required />
                    <input name="location" value={data.location || ''} onChange={handleChange} placeholder="الموقع (مثال: الخوض)" />
                    <div>
                        <label className="block text-sm font-medium mb-1">المساحة (م²)</label>
                        <input name="area" type="number" value={data.area || ''} onChange={handleChange} min="0" step="0.01" />
                    </div>
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
                    <div>
                        <label className="block text-sm font-medium mb-1">صافي المالك</label>
                        <input name="ownerPrice" type="number" value={data.ownerPrice || ''} onChange={handleChange} min="0" step="0.01" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">عمولة المكتب</label>
                        <input name="commission" type="number" value={data.commission || ''} onChange={handleChange} min="0" step="0.01" />
                    </div>
                </div>
                <textarea name="notes" value={data.notes || ''} onChange={handleChange} placeholder="ملاحظات..." />
                <div className="flex justify-end items-center pt-4 border-t gap-2">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default Lands;
