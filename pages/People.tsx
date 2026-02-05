import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Owner, Tenant } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { MessageCircle, Users, BookOpen, Link as LinkIcon } from 'lucide-react';
import { WhatsAppComposerModal } from '../components/shared/WhatsAppComposerModal';
import { formatDate } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbEngine } from '../services/db';

const People: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tenants' | 'owners'>('tenants');
    
    return (
        <Card>
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('tenants')}
                        className={`${activeTab === 'tenants' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        المستأجرون
                    </button>
                    <button
                        onClick={() => setActiveTab('owners')}
                        className={`${activeTab === 'owners' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        الملاك
                    </button>
                </nav>
            </div>
            <div className="pt-6">
                {activeTab === 'tenants' && <TenantsView />}
                {activeTab === 'owners' && <OwnersView />}
            </div>
        </Card>
    );
};

// Tenants Component
const TenantsView: React.FC = () => {
    // FIX: Use dataService for data manipulation
    const { dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);

    const tenants = useLiveQuery(() => dbEngine.tenants.toArray()) || [];
    const contracts = useLiveQuery(() => dbEngine.contracts.toArray()) || [];

    const handleOpenModal = (tenant: Tenant | null = null) => {
        setEditingTenant(tenant);
        setIsModalOpen(true);
    };

    const handleOpenWhatsAppModal = (person: Tenant) => {
        if (!person.phone) {
            toast.error('لا يوجد رقم هاتف لهذا الشخص.');
            return;
        }
        setWhatsAppContext({
            recipient: { name: person.name, phone: person.phone },
            type: 'tenant',
            data: { tenant: person }
        });
    };

    const handleCloseModals = () => {
        setIsModalOpen(false);
        setWhatsAppContext(null);
    };

    const handleDelete = (id: string) => {
        if (contracts.some(c => c.tenantId === id)) {
            toast.error("لا يمكن حذف المستأجر لأنه مرتبط بعقود. يرجى حذف العقود أولاً.");
            return;
        }
        // FIX: Use dataService for data manipulation
        dataService.remove('tenants', id);
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة المستأجرين</h2>
                <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة مستأجر</button>
            </div>
            {tenants.length === 0 ? (
                 <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-text-muted" />
                    <h3 className="mt-4 text-lg font-semibold">لا يوجد مستأجرون بعد</h3>
                    <p className="mt-2 text-sm text-text-muted">ابدأ بإضافة بيانات المستأجرين لتتمكن من إنشاء العقود.</p>
                    <button onClick={() => handleOpenModal()} className="mt-6 btn btn-primary">
                        إضافة مستأجر جديد
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right border-collapse border border-border">
                        <thead className="text-xs uppercase bg-background text-text">
                            <tr>
                                <th scope="col" className="px-6 py-3 border border-border">الاسم</th>
                                <th scope="col" className="px-6 py-3 border border-border">الهاتف</th>
                                <th scope="col" className="px-6 py-3 border border-border">رقم الهوية</th>
                                <th scope="col" className="px-6 py-3 border border-border">الحالة</th>
                                <th scope="col" className="px-6 py-3 border border-border">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map(t => (
                                <tr key={t.id} className="bg-card hover:bg-background">
                                    <td className="px-6 py-4 font-medium text-text border border-border">{t.name}</td>
                                    <td className="px-6 py-4 border border-border">{t.phone}</td>
                                    <td className="px-6 py-4 border border-border">{t.idNo}</td>
                                    <td className="px-6 py-4 border border-border">
                                        <span className={`px-2 py-1 text-xs rounded-full ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/50' : 'bg-red-100 text-red-800 dark:bg-red-900/50'}`}>
                                            {t.status === 'ACTIVE' ? 'نشط' : (t.status === 'BLACKLIST' ? 'قائمة سوداء' : 'غير نشط')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 border border-border">
                                        <ActionsMenu items={[
                                            EditAction(() => handleOpenModal(t)),
                                            { label: 'مراسلة واتساب', icon: <MessageCircle size={16} />, onClick: () => handleOpenWhatsAppModal(t) },
                                            DeleteAction(() => handleDelete(t.id)),
                                        ]} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <TenantForm isOpen={isModalOpen} onClose={handleCloseModals} tenant={editingTenant} />
            <WhatsAppComposerModal isOpen={!!whatsAppContext} onClose={() => setWhatsAppContext(null)} context={whatsAppContext} />
        </div>
    );
};

// Owners Component
const OwnersView: React.FC = () => {
    const app = useApp();
    const navigate = useNavigate();
    // FIX: Use dataService for data manipulation
    const { dataService, generateOwnerPortalLink } = app;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOwner, setEditingOwner] = useState<Owner | null>(null);

    const owners = useLiveQuery(() => dbEngine.owners.toArray()) || [];
    const properties = useLiveQuery(() => dbEngine.properties.toArray()) || [];

    const handleOpenModal = (owner: Owner | null = null) => {
        setEditingOwner(owner);
        setIsModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsModalOpen(false);
    };
    
    const handleDelete = (id: string) => {
        if (properties.some(p => p.ownerId === id)) {
            toast.error("لا يمكن حذف المالك لأنه يمتلك عقارات مسجلة. يرجى تغيير ملكية العقارات أولاً.");
            return;
        }
        // FIX: Use dataService for data manipulation
        dataService.remove('owners', id);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة الملاك</h2>
                <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة مالك</button>
            </div>
            {owners.length === 0 ? (
                <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-text-muted" />
                    <h3 className="mt-4 text-lg font-semibold">لا يوجد ملاك بعد</h3>
                    <p className="mt-2 text-sm text-text-muted">أضف الملاك لتتمكن من ربطهم بالعقارات.</p>
                    <button onClick={() => handleOpenModal()} className="mt-6 btn btn-primary">
                        إضافة مالك جديد
                    </button>
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
            <OwnerForm isOpen={isModalOpen} onClose={handleCloseModals} owner={editingOwner} />
        </div>
    );
};

// Forms
const TenantForm: React.FC<{ isOpen: boolean, onClose: () => void, tenant: Tenant | null }> = ({ isOpen, onClose, tenant }) => {
    // FIX: Use dataService for data manipulation
    const { dataService } = useApp();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [idNo, setIdNo] = useState('');
    const [status, setStatus] = useState<Tenant['status']>('ACTIVE');
    const [notes, setNotes] = useState('');

    React.useEffect(() => {
        if (tenant) {
            setName(tenant.name);
            setPhone(tenant.phone);
            setIdNo(tenant.idNo);
            setStatus(tenant.status);
            setNotes(tenant.notes);
        } else {
            setName('');
            setPhone('');
            setIdNo('');
            setStatus('ACTIVE');
            setNotes('');
        }
    }, [tenant, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) { toast.error("اسم المستأجر مطلوب"); return; }

        const data = { name, phone, idNo, status, notes };
        if (tenant) {
            // FIX: Use dataService for data manipulation
            dataService.update('tenants', tenant.id, data);
        } else {
            // FIX: Use dataService for data manipulation
            dataService.add('tenants', data);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={tenant ? 'تعديل مستأجر' : 'إضافة مستأجر'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الاسم</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الهاتف</label>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم الهوية</label>
                            <input type="text" value={idNo} onChange={e => setIdNo(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحالة</label>
                            <select value={status} onChange={e => setStatus(e.target.value as Tenant['status'])}>
                                <option value="ACTIVE">نشط</option>
                                <option value="INACTIVE">غير نشط</option>
                                <option value="BLACKLIST">قائمة سوداء</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>

                {tenant && <AttachmentsManager entityType="TENANT" entityId={tenant.id} />}

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};


const OwnerForm: React.FC<{ isOpen: boolean, onClose: () => void, owner: Owner | null }> = ({ isOpen, onClose, owner }) => {
    // FIX: Use dataService for data manipulation
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
        }
    }, [owner, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) { toast.error("اسم المالك مطلوب"); return; }

        const data = { name, phone, address, managementContractDate, bankName, bankAccountNumber, notes, commissionType, commissionValue };
        if (owner) {
            // FIX: Use dataService for data manipulation
            dataService.update('owners', owner.id, data);
        } else {
            // FIX: Use dataService for data manipulation
            dataService.add('owners', data as any);
        }
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={owner ? 'تعديل مالك' : 'إضافة مالك'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">المعلومات الأساسية</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">الاسم</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الهاتف</label>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium mb-1">العنوان</label>
                            <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
                        </div>
                    </div>

                    {/* Contract Info */}
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
                                <input type="number" value={commissionValue} onChange={e => setCommissionValue(Number(e.target.value))} required />
                            </div>
                        </div>
                    </div>

                    {/* Bank Info */}
                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">المعلومات البنكية</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم البنك</label>
                                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">رقم الحساب</label>
                                <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                         <h3 className="text-md font-semibold mb-3 border-b border-border pb-2">ملاحظات</h3>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-4" rows={3}/>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};


export default People;