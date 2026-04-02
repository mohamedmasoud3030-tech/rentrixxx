import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Owner } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { MessageCircle, Users, BookOpen, Link as LinkIcon } from 'lucide-react';
import NumberInput from '../components/ui/NumberInput';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Owners: React.FC = () => {
    const app = useApp();
    const navigate = useNavigate();
    const { db, dataService, generateOwnerPortalLink } = app;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOwner, setEditingOwner] = useState<Owner | null>(null);

    const owners = db.owners || [];
    const properties = db.properties || [];

    const handleOpenModal = (owner: Owner | null = null) => {
        setEditingOwner(owner);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (properties.some(p => p.ownerId === id)) {
            toast.error("لا يمكن حذف المالك لأنه يمتلك عقارات مسجلة. يرجى تغيير ملكية العقارات أولاً.");
            return;
        }
        await dataService.remove('owners', id);
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة الملاك</h2>
                <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة مالك</button>
            </div>
            {owners.length === 0 ? (
                <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-text-muted" />
                    <h3 className="mt-4 text-lg font-semibold">لا يوجد ملاك بعد</h3>
                    <p className="mt-2 text-sm text-text-muted">أضف الملاك لتتمكن من ربطهم بالعقارات.</p>
                    <button onClick={() => handleOpenModal()} className="mt-6 btn btn-primary">إضافة مالك جديد</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {owners.map(owner => (
                        <Card key={owner.id}>
                            <div className="flex justify-between items-center">
                                <div onClick={() => handleOpenModal(owner)} className="cursor-pointer">
                                    <h3 className="font-bold text-lg text-primary">{owner.name}</h3>
                                    <p className="text-sm text-text-muted">{owner.phone}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => app.sendWhatsApp(owner.phone, `سيد ${owner.name}، إليك تقرير العقارات اخر تحديث...`)}
                                        className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                                        title="إرسال واتساب"
                                    >
                                        <MessageCircle size={18} />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const link = await generateOwnerPortalLink(owner.id);
                                            navigator.clipboard.writeText(link);
                                            toast.success("تم نسخ رابط المالك!");
                                        }}
                                        className="flex items-center gap-1 px-3 py-1 text-xs border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
                                    >
                                        <LinkIcon size={14} /> رابط المالك
                                    </button>
                                    <ActionsMenu items={[
                                        EditAction(() => handleOpenModal(owner)),
                                        { label: 'كشف حساب احترافي', icon: <BookOpen size={16} />, onClick: () => navigate(`/reports?tab=owner&ownerId=${owner.id}`) },
                                        DeleteAction(() => handleDelete(owner.id))
                                    ]} />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <OwnerForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} owner={editingOwner} />
        </Card>
    );
};

const OwnerForm: React.FC<{ isOpen: boolean, onClose: () => void, owner: Owner | null }> = ({ isOpen, onClose, owner }) => {
    const { dataService } = useApp();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [managementContractDate, setManagementContractDate] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [commissionType, setCommissionType] = useState<Owner['commissionType']>('RATE');
    const [commissionValue, setCommissionValue] = useState(0);
    const [firstPropertyName, setFirstPropertyName] = useState('');
    const [firstPropertyLocation, setFirstPropertyLocation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    React.useEffect(() => {
        if (owner) {
            setName(owner.name);
            setPhone(owner.phone);
            setAddress(owner.address || '');
            setManagementContractDate(owner.managementContractDate || '');
            setBankName(owner.bankName || '');
            setBankAccountNumber(owner.bankAccountNumber || '');
            setNotes(owner.notes);
            setCommissionType(owner.commissionType);
            setCommissionValue(owner.commissionValue);
        } else {
            setName('');
            setPhone('');
            setAddress('');
            setManagementContractDate('');
            setBankName('');
            setBankAccountNumber('');
            setNotes('');
            setCommissionType('RATE');
            setCommissionValue(0);
            setFirstPropertyName('');
            setFirstPropertyLocation('');
        }
    }, [owner, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        if (!name.trim()) { toast.error("اسم المالك مطلوب"); return; }
        if (!owner && !firstPropertyName.trim()) { toast.error("يجب إدخال اسم عقار واحد على الأقل عند إنشاء مالك جديد"); return; }

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = {
                name: name.trim(),
                phone: phone.trim(),
                address: address.trim() || undefined,
                managementContractDate: managementContractDate || undefined,
                bankName: bankName.trim() || undefined,
                bankAccountNumber: bankAccountNumber.trim() || undefined,
                notes: notes.trim(),
                commissionType,
                commissionValue
            };
            if (owner) {
                await dataService.update('owners', owner.id, data);
            } else {
                const newOwner = await dataService.add('owners', data);
                if (newOwner && firstPropertyName.trim()) {
                    await dataService.add('properties', {
                        ownerId: newOwner.id,
                        name: firstPropertyName.trim(),
                        type: 'سكني',
                        location: firstPropertyLocation.trim() || '',
                        notes: '',
                    });
                }
            }
            onClose();
        } catch (error: any) {
            console.error('OwnerForm error:', error);
            toast.error(`خطأ: ${error?.message || 'فشل الحفظ'}`);
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={owner ? 'تعديل مالك' : 'إضافة مالك'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">المعلومات الأساسية</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label htmlFor="owner-name" className="block text-sm font-medium mb-1">الاسم</label>
                                <input id="owner-name" type="text" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label htmlFor="owner-phone" className="block text-sm font-medium mb-1">الهاتف</label>
                                <input id="owner-phone" type="text" value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="owner-address" className="block text-sm font-medium mb-1">العنوان</label>
                            <input id="owner-address" type="text" value={address} onChange={e => setAddress(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">معلومات التعاقد والعمولة</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">تاريخ التعاقد</label>
                                <input type="date" value={managementContractDate} onChange={e => setManagementContractDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">نوع عمولة المكتب</label>
                                <select value={commissionType} onChange={e => setCommissionType(e.target.value as Owner['commissionType'])}>
                                    <option value="RATE">نسبة مئوية (%)</option>
                                    <option value="FIXED_MONTHLY">مبلغ شهري ثابت</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {commissionType === 'RATE' ? 'قيمة النسبة (%)' : 'المبلغ الشهري'}
                                </label>
                                <NumberInput value={commissionValue} onChange={setCommissionValue} required />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">المعلومات البنكية</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label htmlFor="owner-bankname" className="block text-sm font-medium mb-1">اسم البنك</label>
                                <input id="owner-bankname" type="text" value={bankName} onChange={e => setBankName(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="owner-bankaccount" className="block text-sm font-medium mb-1">رقم الحساب</label>
                                <input id="owner-bankaccount" type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {!owner && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
                            <h3 className="text-md font-semibold mb-3 text-amber-800 dark:text-amber-200">العقار الأول (مطلوب)</h3>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">يجب ربط عقار بالمالك عند إنشائه. يمكنك إضافة عقارات أخرى لاحقاً من صفحة العقارات.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">اسم العقار <span className="text-red-500">*</span></label>
                                    <input type="text" value={firstPropertyName} onChange={e => setFirstPropertyName(e.target.value)} required disabled={isSaving} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">الموقع</label>
                                    <input type="text" value={firstPropertyLocation} onChange={e => setFirstPropertyLocation(e.target.value)} disabled={isSaving} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">ملاحظات</h3>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-4" rows={3} />
                    </div>
                </div>

                {owner && <AttachmentsManager entityType="OWNER" entityId={owner.id} />}

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default Owners;
