import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Tenant } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { MessageCircle, Users, BookOpen, Download, ArrowRight, FileText, Home, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { WhatsAppComposerModal } from '../components/shared/WhatsAppComposerModal';
import { formatDate, formatCurrency, exportToCsv, TENANT_STATUS_AR, CHANNEL_AR, normalizeArabicNumerals, getEffectiveInvoiceStatus } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import SearchFilterBar from '../components/shared/SearchFilterBar';

const TENANTS_FILTER_KEY = 'rentrix:tenants_filter';

type TenantStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const Tenants: React.FC = () => {
    const { db, dataService } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>('ALL');

    useEffect(() => {
        const saved = sessionStorage.getItem(TENANTS_FILTER_KEY);
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved) as { search?: string; status?: TenantStatusFilter };
            if (parsed.search) setSearchTerm(parsed.search);
            if (parsed.status && ['ALL', 'ACTIVE', 'INACTIVE'].includes(parsed.status)) {
                setStatusFilter(parsed.status);
            }
        } catch {
            // noop
        }
    }, []);

    useEffect(() => {
        sessionStorage.setItem(TENANTS_FILTER_KEY, JSON.stringify({ search: searchTerm, status: statusFilter }));
    }, [searchTerm, statusFilter]);

    const tenants = db.tenants || [];
    const contracts = db.contracts || [];
    const invoices = db.invoices || [];
    const today = new Date().toISOString().slice(0, 10);
    const graceDays = db.settings?.operational?.lateFee?.graceDays ?? 0;

    const overdueTenantIds = useMemo(() => {
        const overdueContractIds = new Set(
            invoices
                .filter(i => getEffectiveInvoiceStatus(i, graceDays) === 'OVERDUE' && i.dueDate <= today)
                .map(i => i.contractId),
        );
        return new Set(contracts.filter(c => overdueContractIds.has(c.id)).map(c => c.tenantId));
    }, [invoices, contracts, today, graceDays]);

    const activeTenantIds = useMemo(() => new Set(contracts.filter(c => c.status === 'ACTIVE').map(c => c.tenantId)), [contracts]);

    const filteredTenants = useMemo(() => {
        const q = normalizeArabicNumerals(searchTerm).trim().toLowerCase();
        return tenants.filter(t => {
            const statusMatch = statusFilter === 'ALL' || t.status === statusFilter;
            const queryMatch =
                !q ||
                normalizeArabicNumerals(t.name || '').toLowerCase().includes(q) ||
                normalizeArabicNumerals(t.phone || '').toLowerCase().includes(q) ||
                normalizeArabicNumerals(t.idNo || '').toLowerCase().includes(q);
            return statusMatch && queryMatch;
        });
    }, [tenants, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = tenants.length;
        const active = tenants.filter(t => t.status === 'ACTIVE').length;
        const overdue = tenants.filter(t => overdueTenantIds.has(t.id)).length;
        const noActiveContract = tenants.filter(t => !activeTenantIds.has(t.id)).length;
        return { total, active, overdue, noActiveContract };
    }, [tenants, overdueTenantIds, activeTenantIds]);

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
            data: { tenant: person },
        });
    };

    const handleCloseModals = () => {
        setIsModalOpen(false);
        setWhatsAppContext(null);
    };

    const handleDelete = async (id: string) => {
        if (contracts.some(c => c.tenantId === id)) {
            toast.error('لا يمكن حذف المستأجر لأنه مرتبط بعقود. يرجى حذف العقود أولاً.');
            return;
        }
        await dataService.remove('tenants', id);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <p className="text-lg font-black">{stats.total}</p>
                    <p className="text-[11px] text-text-muted">إجمالي المستأجرين</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <p className="text-lg font-black text-green-600">{stats.active}</p>
                    <p className="text-[11px] text-text-muted">نشطون</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <p className="text-lg font-black text-red-600">{stats.overdue}</p>
                    <p className="text-[11px] text-text-muted">لديهم فواتير متأخرة</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <p className="text-lg font-black text-amber-600">{stats.noActiveContract}</p>
                    <p className="text-[11px] text-text-muted">بدون عقد نشط</p>
                </div>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">قائمة المستأجرين</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                exportToCsv(
                                    'مستأجرون_rentrix',
                                    filteredTenants.map(t => ({
                                        الاسم: t.name,
                                        الهاتف: t.phone,
                                        'رقم الهوية': t.idNo,
                                        الجنسية: t.nationality || '',
                                        الحالة: TENANT_STATUS_AR[t.status] || t.status,
                                        'فواتير متأخرة': overdueTenantIds.has(t.id) ? 'نعم' : 'لا',
                                        'تاريخ الإضافة': new Date(t.createdAt).toLocaleDateString('ar'),
                                    })),
                                )
                            }
                            className="btn btn-secondary"
                        >
                            <Download size={14} />
                            تصدير CSV
                        </button>
                        <button onClick={() => handleOpenModal()} className="btn btn-primary">
                            إضافة مستأجر
                        </button>
                    </div>
                </div>

                <SearchFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    placeholder="بحث بالاسم، الهاتف، أو رقم الهوية..."
                />
                <div className="flex items-center gap-2 mt-3">
                    <button className={`btn text-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter('ALL')}>
                        الكل
                    </button>
                    <button className={`btn text-sm ${statusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter('ACTIVE')}>
                        نشط
                    </button>
                    <button className={`btn text-sm ${statusFilter === 'INACTIVE' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter('INACTIVE')}>
                        غير نشط
                    </button>
                </div>

                {filteredTenants.length === 0 ? (
                    <div className="text-center py-12">
                        <Users size={48} className="mx-auto text-text-muted" />
                        <h3 className="mt-4 text-lg font-semibold">لا يوجد مستأجرون مطابقون</h3>
                        <p className="mt-2 text-sm text-text-muted">جرّب تغيير البحث أو الفلتر، أو أضف مستأجرًا جديدًا.</p>
                        <button onClick={() => handleOpenModal()} className="mt-6 btn btn-primary">
                            إضافة مستأجر جديد
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto mt-3">
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
                                {filteredTenants.map(t => (
                                    <tr key={t.id} className="bg-card hover:bg-background">
                                        <td className="px-6 py-4 font-medium text-primary border border-border cursor-pointer hover:underline" onClick={() => setSelectedTenant(t)}>
                                            <div className="flex items-center gap-2">
                                                <span>{t.name}</span>
                                                {overdueTenantIds.has(t.id) && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                        لديه فواتير متأخرة
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border border-border">{t.phone}</td>
                                        <td className="px-6 py-4 border border-border">{t.idNo}</td>
                                        <td className="px-6 py-4 border border-border">
                                            <span className={`px-2 py-1 text-xs rounded-full ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/50' : 'bg-red-100 text-red-800 dark:bg-red-900/50'}`}>
                                                {TENANT_STATUS_AR[t.status] || t.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 border border-border">
                                            <ActionsMenu
                                                items={[
                                                    { label: 'عرض التفاصيل', icon: <FileText size={16} />, onClick: () => setSelectedTenant(t) },
                                                    EditAction(() => handleOpenModal(t)),
                                                    { label: 'مراسلة واتساب', icon: <MessageCircle size={16} />, onClick: () => handleOpenWhatsAppModal(t) },
                                                    DeleteAction(() => handleDelete(t.id)),
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <TenantForm isOpen={isModalOpen} onClose={handleCloseModals} tenant={editingTenant} />
                <WhatsAppComposerModal isOpen={!!whatsAppContext} onClose={() => setWhatsAppContext(null)} context={whatsAppContext} />
            </Card>
        </div>
    );
};

const TenantDetailView: React.FC<{ tenant: Tenant; onBack: () => void }> = ({ tenant, onBack }) => {
    const { db, settings, tenantBalances } = useApp();
    const navigate = useNavigate();
    const currency = settings.operational?.currency ?? 'OMR';

    const tenantContracts = useMemo(() => db.contracts.filter(c => c.tenantId === tenant.id), [db.contracts, tenant.id]);
    const tenantInvoices = useMemo(() => db.invoices.filter(i => tenantContracts.some(c => c.id === i.contractId)), [db.invoices, tenantContracts]);
    const tenantReceipts = useMemo(() => {
        const contractIds = new Set(tenantContracts.map(c => c.id));
        return db.receipts
            .filter(r => contractIds.has(r.contractId) && r.status !== 'VOID')
            .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [db.receipts, tenantContracts]);
    const tenantMaintenance = useMemo(() => {
        const unitIds = tenantContracts.filter(c => c.status === 'ACTIVE').map(c => c.unitId);
        return db.maintenanceRecords.filter(m => unitIds.includes(m.unitId));
    }, [db.maintenanceRecords, tenantContracts]);

    const totalInvoiced = tenantInvoices.reduce((s, i) => s + (i.amount || 0) + (i.taxAmount || 0), 0);
    const totalPaid = tenantReceipts.reduce((s, r) => s + r.amount, 0);
    const balance = tenantBalances[tenant.id]?.balance ?? 0;
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
                    <p className="text-xs text-text-muted">إجمالي الفوترة (شامل الضريبة)</p>
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
                <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">المدفوعات الأخيرة</h3>
                {tenantReceipts.length > 0 ? (
                    <table className="w-full text-sm border-collapse border border-border">
                        <thead><tr className="bg-background">
                            <th className="px-4 py-2 border border-border">الرقم</th>
                            <th className="px-4 py-2 border border-border">التاريخ</th>
                            <th className="px-4 py-2 border border-border">المبلغ</th>
                            <th className="px-4 py-2 border border-border">طريقة الدفع</th>
                        </tr></thead>
                        <tbody>{tenantReceipts.slice(0, 5).map(r => (
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

const TenantForm: React.FC<{ isOpen: boolean; onClose: () => void; tenant: Tenant | null }> = ({ isOpen, onClose, tenant }) => {
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
    const isSavingRef = useRef(false);

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
        if (isSavingRef.current) return;
        if (!name.trim()) { toast.error('اسم المستأجر مطلوب'); return; }

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const payload = {
                name: name.trim(), phone: phone.trim(), email: email.trim() || undefined,
                idNo: idNo.trim(), tenantType, crNumber: crNumber.trim() || undefined,
                address: address.trim() || undefined, postalCode: postalCode.trim() || undefined,
                poBox: poBox.trim() || undefined, nationality: nationality.trim() || undefined,
                status, notes,
            };
            if (tenant) await dataService.update('tenants', tenant.id, payload);
            else await dataService.add('tenants', payload);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={tenant ? 'تعديل بيانات المستأجر' : 'إضافة مستأجر جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">الاسم الكامل *</label>
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الهاتف</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">رقم الهوية</label>
                        <input value={idNo} onChange={e => setIdNo(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الجنسية</label>
                        <input value={nationality} onChange={e => setNationality(e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع المستأجر</label>
                        <select value={tenantType} onChange={e => setTenantType(e.target.value as 'INDIVIDUAL' | 'COMPANY')}>
                            <option value="INDIVIDUAL">فرد</option>
                            <option value="COMPANY">شركة</option>
                        </select>
                    </div>
                    {tenantType === 'COMPANY' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم السجل التجاري</label>
                            <input value={crNumber} onChange={e => setCrNumber(e.target.value)} />
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">العنوان</label>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الرمز البريدي</label>
                        <input value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">صندوق البريد</label>
                        <input value={poBox} onChange={e => setPoBox(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">الحالة</label>
                    <select value={status} onChange={e => setStatus(e.target.value as Tenant['status'])}>
                        <option value="ACTIVE">نشط</option>
                        <option value="INACTIVE">غير نشط</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">ملاحظات</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default Tenants;
