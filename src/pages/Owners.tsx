import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Owner } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { MessageCircle, Users, BookOpen, Link as LinkIcon, Search, Building2, Home, HandCoins } from 'lucide-react';
import NumberInput from '../components/ui/NumberInput';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/helpers';

const Owners: React.FC = () => {
    const app = useApp();
    const navigate = useNavigate();
    const { db, dataService, generateOwnerPortalLink, ownerBalances } = app;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
    const [search, setSearch] = useState('');
    const [settlementOwner, setSettlementOwner] = useState<Owner | null>(null);

    const owners = db.owners || [];
    const properties = db.properties || [];
    const units = db.units || [];

    const filteredOwners = useMemo(() => owners.filter(o => o.name.toLowerCase().includes(search.toLowerCase()) || (o.phone || '').includes(search)), [owners, search]);

    const handleOpenModal = (owner: Owner | null = null) => {
        setEditingOwner(owner);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (properties.some(p => p.ownerId === id)) {
            toast.error('لا يمكن حذف المالك لأنه يمتلك عقارات مسجلة.');
            return;
        }
        await dataService.remove('owners', id);
    };

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">قائمة الملاك</h2>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة مالك</button>
                </div>

                <div className="relative max-w-sm mb-4">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم المالك أو الهاتف" className="w-full pr-9" />
                </div>

                {filteredOwners.length === 0 ? (
                    <div className="text-center py-12">
                        <Users size={48} className="mx-auto text-text-muted" />
                        <h3 className="mt-4 text-lg font-semibold">لا يوجد ملاك</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredOwners.map(owner => {
                            const balance = ownerBalances[owner.id];
                            const propertyCount = properties.filter(p => p.ownerId === owner.id).length;
                            const ownerPropertyIds = new Set(properties.filter(p => p.ownerId === owner.id).map(p => p.id));
                            const unitCount = units.filter(u => ownerPropertyIds.has(u.propertyId)).length;
                            const net = balance?.net || 0;
                            return (
                                <Card key={owner.id} className="border border-border shadow-sm">
                                    <div className="flex justify-between gap-3 items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-primary">{owner.name}</h3>
                                            <p className="text-sm text-text-muted">{owner.phone || '-'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => app.sendWhatsApp(owner.phone, `سيد ${owner.name}، إليك تقرير العقارات آخر تحديث...`)} className="p-2 bg-green-100 text-green-700 rounded-full"><MessageCircle size={18} /></button>
                                            <button
                                                onClick={async () => {
                                                    const link = await generateOwnerPortalLink(owner.id);
                                                    navigator.clipboard.writeText(link);
                                                    toast.success('تم نسخ رابط المالك!');
                                                }}
                                                className="flex items-center gap-1 px-3 py-1 text-xs border border-blue-500 text-blue-600 rounded-md"
                                            >
                                                <LinkIcon size={14} /> رابط المالك
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 my-4">
                                        ⚠️ روابط المالك مؤقتة وغير محمية بتوقيع — لا ترسلها عبر قنوات عامة.
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="p-2 rounded bg-background border border-border">
                                            <div className="text-xs text-text-muted">إجمالي التحصيلات</div>
                                            <div className="font-bold" dir="ltr">{formatCurrency(balance?.collections || 0)}</div>
                                        </div>
                                        <div className="p-2 rounded bg-background border border-border">
                                            <div className="text-xs text-text-muted">إجمالي المصروفات</div>
                                            <div className="font-bold" dir="ltr">{formatCurrency(balance?.expenses || 0)}</div>
                                        </div>
                                        <div className="p-2 rounded bg-background border border-border col-span-2">
                                            <div className="text-xs text-text-muted">صافي المستحق</div>
                                            <div className={`font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">{formatCurrency(net)}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-3 text-sm text-text-muted">
                                        <span className="flex items-center gap-1"><Building2 size={14} /> {propertyCount} عقار</span>
                                        <span className="flex items-center gap-1"><Home size={14} /> {unitCount} وحدة</span>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <button className="btn btn-secondary" onClick={() => setSettlementOwner(owner)}><HandCoins size={14} /> تسوية جديدة</button>
                                        <ActionsMenu items={[
                                            EditAction(() => handleOpenModal(owner)),
                                            { label: 'كشف حساب احترافي', icon: <BookOpen size={16} />, onClick: () => navigate(`/reports?tab=owner&ownerId=${owner.id}`) },
                                            DeleteAction(() => handleDelete(owner.id)),
                                        ]} />
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </Card>

            <OwnerForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} owner={editingOwner} />
            {settlementOwner && <OwnerSettlementModal owner={settlementOwner} onClose={() => setSettlementOwner(null)} />}
        </div>
    );
};

const OwnerSettlementModal: React.FC<{ owner: Owner; onClose: () => void }> = ({ owner, onClose }) => {
    const { dataService } = useApp();
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [amount, setAmount] = useState(0);
    const [notes, setNotes] = useState('');
    const [method, setMethod] = useState<'CASH' | 'BANK' | 'OTHER'>('BANK');
    const [saving, setSaving] = useState(false);

    return (
        <Modal isOpen onClose={onClose} title={`تسوية جديدة - ${owner.name}`}>
            <div className="space-y-4">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                <NumberInput value={amount} onChange={setAmount} />
                <select value={method} onChange={e => setMethod(e.target.value as 'CASH' | 'BANK' | 'OTHER')}>
                    <option value="CASH">نقد</option>
                    <option value="BANK">بنك</option>
                    <option value="OTHER">أخرى</option>
                </select>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات" />
                <div className="flex justify-end gap-2">
                    <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
                    <button
                        className="btn btn-primary"
                        disabled={saving || amount <= 0}
                        onClick={async () => {
                            setSaving(true);
                            await dataService.add('ownerSettlements', { ownerId: owner.id, date, amount, method, ref: '', notes });
                            toast.success('تم تسجيل التسوية');
                            setSaving(false);
                            onClose();
                        }}
                    >
                        حفظ
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const OwnerForm: React.FC<{ isOpen: boolean; onClose: () => void; owner: Owner | null }> = ({ isOpen, onClose, owner }) => {
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
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    React.useEffect(() => {
        if (!isOpen) return;
        if (owner) {
            setName(owner.name); setPhone(owner.phone); setAddress(owner.address || ''); setManagementContractDate(owner.managementContractDate || '');
            setBankName(owner.bankName || ''); setBankAccountNumber(owner.bankAccountNumber || ''); setNotes(owner.notes); setCommissionType(owner.commissionType); setCommissionValue(owner.commissionValue);
        } else {
            setName(''); setPhone(''); setAddress(''); setManagementContractDate(''); setBankName(''); setBankAccountNumber(''); setNotes(''); setCommissionType('RATE'); setCommissionValue(0);
        }
    }, [owner, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current || !name.trim()) return;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = { name: name.trim(), phone: phone.trim(), address: address || undefined, managementContractDate: managementContractDate || undefined, bankName: bankName || undefined, bankAccountNumber: bankAccountNumber || undefined, notes, commissionType, commissionValue };
            if (owner) await dataService.update('owners', owner.id, data); else await dataService.add('owners', data);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={owner ? 'تعديل مالك' : 'إضافة مالك'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="الاسم" />
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="الهاتف" />
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="العنوان" />
                <input type="date" value={managementContractDate} onChange={e => setManagementContractDate(e.target.value)} />
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="اسم البنك" />
                <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="رقم الحساب" />
                <select value={commissionType} onChange={e => setCommissionType(e.target.value as Owner['commissionType'])}><option value="RATE">نسبة</option><option value="FIXED_MONTHLY">ثابت شهري</option></select>
                <NumberInput value={commissionValue} onChange={setCommissionValue} />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                {owner && <AttachmentsManager entityType="OWNER" entityId={owner.id} />}
                <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button><button type="submit" className="btn btn-primary" disabled={isSaving}>حفظ</button></div>
            </form>
        </Modal>
    );
};

export default Owners;
