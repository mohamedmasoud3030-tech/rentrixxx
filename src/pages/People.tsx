import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Owner, Tenant } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { MessageCircle, Users, BookOpen, Link as LinkIcon, Download, ArrowRight, FileText, Home, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { WhatsAppComposerModal } from '../components/shared/WhatsAppComposerModal';
import { formatDate, formatCurrency, exportToCsv, TENANT_STATUS_AR, CHANNEL_AR } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

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
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

    const tenants = db.tenants || [];
    const contracts = db.contracts || [];

    if (selectedTenant) {
        return <TenantDetailView tenant={selectedTenant} onBack={() => setSelectedTenant(null)} />;
    }

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

    const handleDelete = async (id: string) => {
        if (contracts.some(c => c.tenantId === id)) {
            toast.error("لا يمكن حذف المستأجر لأنه مرتبط بعقود. يرجى حذف العقود أولاً.");
            return;
        }
        await dataService.remove('tenants', id);
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة المستأجرين</h2>
                <div className="flex gap-2">
                    <button onClick={() => exportToCsv('مستأجرون_rentrix', tenants.map(t => ({ 'الاسم': t.name, 'الهاتف': t.phone, 'رقم الهوية': t.idNo, 'الجنسية': t.nationality || '', 'الحالة': TENANT_STATUS_AR[t.status] || t.status, 'تاريخ الإضافة': new Date(t.createdAt).toLocaleDateString('ar') })))} className="btn btn-secondary">
                        <Download size={14} />
                        تصدير CSV
                    </button>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة مستأجر</button>
                </div>
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
                                    <td className="px-6 py-4 font-medium text-primary border border-border cursor-pointer hover:underline" onClick={() => setSelectedTenant(t)}>{t.name}</td>
                                    <td className="px-6 py-4 border border-border">{t.phone}</td>
                                    <td className="px-6 py-4 border border-border">{t.idNo}</td>
                                    <td className="px-6 py-4 border border-border">
                                        <span className={`px-2 py-1 text-xs rounded-full ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/50' : 'bg-red-100 text-red-800 dark:bg-red-900/50'}`}>
                                            {TENANT_STATUS_AR[t.status] || t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 border border-border">
                                        <ActionsMenu items={[
                                            { label: 'عرض التفاصيل', icon: <FileText size={16} />, onClick: () => setSelectedTenant(t) },
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

const TenantDetailView: React.FC<{ tenant: Tenant; onBack: () => void }> = ({ tenant, onBack }) => {
    const { db, settings } = useApp();
    const navigate = useNavigate();
    const currency = settings.operational?.currency ?? 'OMR';

    const tenantContracts = useMemo(() => db.contracts.filter(c => c.tenantId === tenant.id), [db.contracts, tenant.id]);
    const tenantInvoices = useMemo(() => db.invoices.filter(i => tenantContracts.some(c => c.id === i.contractId)), [db.invoices, tenantContracts]);
    const tenantReceipts = useMemo(() => {
        const contractIds = new Set(tenantContracts.map(c => c.id));
        return db.receipts.filter(r => contractIds.has(r.contractId) && r.status !== 'VOID');
    }, [db.receipts, tenantContracts]);
    const tenantMaintenance = useMemo(() => {
        const unitIds = tenantContracts.filter(c => c.status === 'ACTIVE').map(c => c.unitId);
        return db.maintenanceRecords.filter(m => unitIds.includes(m.unitId));
    }, [db.maintenanceRecords, tenantContracts]);

    const totalInvoiced = tenantInvoices.reduce((s, i) => s + i.amount, 0);
    const totalPaid = tenantReceipts.reduce((s, r) => s + r.amount, 0);
    const balance = totalInvoiced - totalPaid;
    const activeContract = tenantContracts.find(c => c.status === 'ACTIVE');
    const unit = activeContract ? db.units.find(u => u.id === activeContract.unitId) : null;
    const property = unit ? db.properties.find(p => p.id === unit.propertyId) : null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn btn-ghost"><ArrowRight /></button>
                    <h2 className="text-xl font-bold">ملف المستأجر: {tenant.name}</h2>
                </div>
                <button onClick={() => navigate(`/reports?tab=tenant&tenantId=${tenant.id}`)} className="btn btn-secondary flex items-center gap-2">
                    <BookOpen size={16} /> كشف حساب
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalInvoiced, currency)}</p>
                    <p className="text-xs text-text-muted">إجمالي الفوترة</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid, currency)}</p>
                    <p className="text-xs text-text-muted">إجمالي المدفوع</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balance, currency)}</p>
                    <p className="text-xs text-text-muted">الرصيد المتبقي</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 space-y-3">
                    <h3 className="font-bold text-lg border-b border-border pb-2">البيانات الشخصية</h3>
                    <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2"><Phone size={14} /> {tenant.phone || 'غير محدد'}</p>
                        {tenant.email && <p className="flex items-center gap-2"><Mail size={14} /> {tenant.email}</p>}
                        <p className="flex items-center gap-2"><CreditCard size={14} /> رقم الهوية: {tenant.idNo || 'غير محدد'}</p>
                        {tenant.nationality && <p>الجنسية: {tenant.nationality}</p>}
                        {tenant.tenantType === 'COMPANY' && <p>نوع: شركة {tenant.crNumber ? `(سجل: ${tenant.crNumber})` : ''}</p>}
                        {tenant.address && <p className="flex items-center gap-2"><MapPin size={14} /> {tenant.address}</p>}
                        {(tenant.postalCode || tenant.poBox) && <p>الرمز البريدي: {tenant.postalCode || '-'} | ص.ب: {tenant.poBox || '-'}</p>}
                    </div>
                </Card>

                <Card className="p-5 space-y-3">
                    <h3 className="font-bold text-lg border-b border-border pb-2">الوحدة والعقد الحالي</h3>
                    {activeContract ? (
                        <div className="space-y-2 text-sm">
                            <p className="flex items-center gap-2"><Home size={14} /> {property?.name} - {unit?.name}</p>
                            <p>الإيجار الشهري: <span className="font-bold text-primary">{formatCurrency(activeContract.rent, currency)}</span></p>
                            <p>بداية العقد: {formatDate(activeContract.start)}</p>
                            <p>نهاية العقد: {formatDate(activeContract.end)}</p>
                            <p>التأمين: {formatCurrency(activeContract.deposit || 0, currency)}</p>
                        </div>
                    ) : (
                        <p className="text-text-muted text-sm">لا يوجد عقد نشط حالياً</p>
                    )}
                </Card>
            </div>

            <Card className="p-5">
                <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">سجل العقود ({tenantContracts.length})</h3>
                {tenantContracts.length > 0 ? (
                    <table className="w-full text-sm border-collapse border border-border">
                        <thead><tr className="bg-background">
                            <th className="px-4 py-2 border border-border">الوحدة</th>
                            <th className="px-4 py-2 border border-border">البداية</th>
                            <th className="px-4 py-2 border border-border">النهاية</th>
                            <th className="px-4 py-2 border border-border">الإيجار</th>
                            <th className="px-4 py-2 border border-border">الحالة</th>
                        </tr></thead>
                        <tbody>{tenantContracts.map(c => {
                            const u = db.units.find(x => x.id === c.unitId);
                            return (
                                <tr key={c.id} className="hover:bg-background">
                                    <td className="px-4 py-2 border border-border">{u?.name || '-'}</td>
                                    <td className="px-4 py-2 border border-border">{formatDate(c.start)}</td>
                                    <td className="px-4 py-2 border border-border">{formatDate(c.end)}</td>
                                    <td className="px-4 py-2 border border-border">{formatCurrency(c.rent, currency)}</td>
                                    <td className="px-4 py-2 border border-border">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {c.status === 'ACTIVE' ? 'نشط' : c.status === 'ENDED' ? 'منتهي' : c.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                ) : <p className="text-text-muted text-sm">لا توجد عقود</p>}
            </Card>

            <Card className="p-5">
                <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">آخر المدفوعات ({tenantReceipts.length})</h3>
                {tenantReceipts.length > 0 ? (
                    <table className="w-full text-sm border-collapse border border-border">
                        <thead><tr className="bg-background">
                            <th className="px-4 py-2 border border-border">الرقم</th>
                            <th className="px-4 py-2 border border-border">التاريخ</th>
                            <th className="px-4 py-2 border border-border">المبلغ</th>
                            <th className="px-4 py-2 border border-border">طريقة الدفع</th>
                        </tr></thead>
                        <tbody>{tenantReceipts.slice(0, 10).map(r => (
                            <tr key={r.id} className="hover:bg-background">
                                <td className="px-4 py-2 border border-border">{r.no}</td>
                                <td className="px-4 py-2 border border-border">{formatDate(r.dateTime)}</td>
                                <td className="px-4 py-2 border border-border font-bold">{formatCurrency(r.amount, currency)}</td>
                                <td className="px-4 py-2 border border-border">{CHANNEL_AR[r.channel] || r.channel}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                ) : <p className="text-text-muted text-sm">لا توجد مدفوعات</p>}
            </Card>

            {tenantMaintenance.length > 0 && (
                <Card className="p-5">
                    <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">طلبات الصيانة ({tenantMaintenance.length})</h3>
                    <table className="w-full text-sm border-collapse border border-border">
                        <thead><tr className="bg-background">
                            <th className="px-4 py-2 border border-border">الوصف</th>
                            <th className="px-4 py-2 border border-border">التاريخ</th>
                            <th className="px-4 py-2 border border-border">التكلفة</th>
                            <th className="px-4 py-2 border border-border">الحالة</th>
                        </tr></thead>
                        <tbody>{tenantMaintenance.map(m => (
                            <tr key={m.id} className="hover:bg-background">
                                <td className="px-4 py-2 border border-border">{m.description}</td>
                                <td className="px-4 py-2 border border-border">{m.requestDate}</td>
                                <td className="px-4 py-2 border border-border">{formatCurrency(m.cost || 0, currency)}</td>
                                <td className="px-4 py-2 border border-border">{m.status}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </Card>
            )}

            <Card className="p-5">
                <AttachmentsManager entityType="TENANT" entityId={tenant.id} />
            </Card>
        </div>
    );
};

// Owners Component
const OwnersView: React.FC = () => {
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

    const handleCloseModals = () => {
        setIsModalOpen(false);
    };
    
    const handleDelete = async (id: string) => {
        if (properties.some(p => p.ownerId === id)) {
            toast.error("لا يمكن حذف المالك لأنه يمتلك عقارات مسجلة. يرجى تغيير ملكية العقارات أولاً.");
            return;
        }
        await dataService.remove('owners', id);
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
    const { dataService } = useApp();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [idNo, setIdNo] = useState('');
    const [tenantType, setTenantType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
    const [crNumber, setCrNumber] = useState('');
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [poBox, setPoBox] = useState('');
    const [nationality, setNationality] = useState('');
    const [status, setStatus] = useState<Tenant['status']>('ACTIVE');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (tenant) {
            setName(tenant.name); setPhone(tenant.phone); setEmail(tenant.email || '');
            setIdNo(tenant.idNo); setTenantType(tenant.tenantType || 'INDIVIDUAL');
            setCrNumber(tenant.crNumber || ''); setAddress(tenant.address || '');
            setPostalCode(tenant.postalCode || ''); setPoBox(tenant.poBox || '');
            setNationality(tenant.nationality || ''); setStatus(tenant.status); setNotes(tenant.notes);
        } else {
            setName(''); setPhone(''); setEmail(''); setIdNo(''); setTenantType('INDIVIDUAL');
            setCrNumber(''); setAddress(''); setPostalCode(''); setPoBox('');
            setNationality(''); setStatus('ACTIVE'); setNotes('');
        }
    }, [tenant, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error("اسم المستأجر مطلوب"); return; }
        
        setIsSaving(true);
        try {
            const data = {
                name: name.trim(), 
                phone: phone.trim() || undefined, 
                email: email.trim() || undefined, 
                idNo: idNo.trim() || undefined, 
                tenantType,
                crNumber: crNumber.trim() || undefined, 
                address: address.trim() || undefined,
                postalCode: postalCode.trim() || undefined, 
                poBox: poBox.trim() || undefined,
                nationality: nationality.trim() || undefined, 
                status, 
                notes: notes.trim() || undefined,
            };
            
            if (tenant) {
                await dataService.update('tenants', tenant.id, data);
            } else {
                await dataService.add('tenants', data);
            }
            onClose();
        } catch (error: any) {
            console.error('TenantForm error:', error);
            toast.error(`خطأ: ${error?.message || 'فشل الحفظ'}`);
        } finally {
            setIsSaving(false);
        }
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
                            <label className="block text-sm font-medium mb-1">نوع المستأجر</label>
                            <select value={tenantType} onChange={e => setTenantType(e.target.value as 'INDIVIDUAL' | 'COMPANY')}>
                                <option value="INDIVIDUAL">شخص</option>
                                <option value="COMPANY">شركة</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الهاتف</label>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم الهوية</label>
                            <input type="text" value={idNo} onChange={e => setIdNo(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الجنسية</label>
                            <input type="text" value={nationality} onChange={e => setNationality(e.target.value)} />
                        </div>
                        {tenantType === 'COMPANY' && (
                            <div>
                                <label className="block text-sm font-medium mb-1">رقم السجل التجاري</label>
                                <input type="text" value={crNumber} onChange={e => setCrNumber(e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-1">الحالة</label>
                            <select value={status} onChange={e => setStatus(e.target.value as Tenant['status'])}>
                                <option value="ACTIVE">نشط</option>
                                <option value="INACTIVE">غير نشط</option>
                                <option value="BLACKLIST">قائمة سوداء</option>
                            </select>
                        </div>
                    </div>

                    <h4 className="font-bold text-sm text-text-muted pt-2 border-t border-border">العنوان</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium mb-1">العنوان</label>
                            <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الرمز البريدي</label>
                            <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">صندوق البريد</label>
                            <input type="text" value={poBox} onChange={e => setPoBox(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>

                {tenant && <AttachmentsManager entityType="TENANT" entityId={tenant.id} />}

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                </div>
            </form>
        </Modal>
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
    const [isSaving, setIsSaving] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error("اسم المالك مطلوب"); return; }
        
        setIsSaving(true);
        try {
            const data = { 
                name: name.trim(), 
                phone: phone.trim() || undefined, 
                address: address.trim() || undefined, 
                managementContractDate: managementContractDate || undefined, 
                bankName: bankName.trim() || undefined, 
                bankAccountNumber: bankAccountNumber.trim() || undefined, 
                notes: notes.trim() || undefined, 
                commissionType, 
                commissionValue 
            };
            if (owner) {
                await dataService.update('owners', owner.id, data);
            } else {
                await dataService.add('owners', data as any);
            }
            onClose();
        } catch (error: any) {
            console.error('OwnerForm error:', error);
            toast.error(`خطأ: ${error?.message || 'فشل الحفظ'}`);
        } finally {
            setIsSaving(false);
        }
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


export default People;