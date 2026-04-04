import React, { useState, useMemo, useRef, memo, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { useApp } from '../contexts/AppContext';
import { Property, Unit, UtilityRecord, UtilityType, UTILITY_TYPE_AR, UTILITY_ICON } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import ConfirmActionModal from '../components/shared/ConfirmActionModal';
import { formatCurrency, toArabicDigits, formatDate, normalizeArabicNumerals } from '../utils/helpers';
import NumberInput from '../components/ui/NumberInput';
import { Building, Home, ArrowRight, User, Map as MapIcon, AlertCircle, Clock, FileText, Wrench, Phone, Percent, TrendingUp, Zap, Droplets, Flame, Wifi, ChevronRight, Plus, Image, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PropertyMapView from './PropertyMap';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import { getAttachmentUrl, uploadAttachment } from '../services/attachmentService';

interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode; fallback?: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] UnitDetailView crashed:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <div className="p-8 text-center space-y-4">
                    <p className="text-lg font-bold text-red-600">حدث خطأ أثناء عرض تفاصيل الوحدة</p>
                    <p className="text-sm text-text-muted">{this.state.error?.message}</p>
                    <button className="btn btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>إعادة المحاولة</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const Properties: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
    return (
        <div className="space-y-6">
            <Card>
                <div className="border-b border-border mb-6">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setActiveTab('list')} className={`${activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-text-muted'} py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                            <Building size={16}/> العقارات والوحدات
                        </button>
                        <button onClick={() => setActiveTab('map')} className={`${activeTab === 'map' ? 'border-primary text-primary' : 'border-transparent text-text-muted'} py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}>
                            <MapIcon size={16}/> الخارطة
                        </button>
                    </nav>
                </div>
                 <div className="pt-2">
                    {activeTab === 'list' && <PropertiesListView />}
                    {activeTab === 'map' && <PropertyMapView />}
                </div>
            </Card>
        </div>
    );
};

const PropertiesListView: React.FC = () => {
    const { db, dataService, settings, ownerBalances } = useApp();
    const properties = Array.isArray(db.properties) ? db.properties : [];
    const units = Array.isArray(db.units) ? db.units : [];
    const owners = Array.isArray(db.owners) ? db.owners : [];
    const [selectedProp, setSelectedProp] = useState<Property | null>(null);
    const [isPropModalOpen, setIsPropModalOpen] = useState(false);
    const [editingProp, setEditingProp] = useState<Property | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProperties = useMemo(() => {
        const q = normalizeArabicNumerals(searchTerm).trim().toLowerCase();
        if (!q) return properties;
        return properties.filter(p => {
            const ownerName = owners.find(o => o.id === p.ownerId)?.name || '';
            return [p.name, p.location, ownerName].some(value => normalizeArabicNumerals(value || '').toLowerCase().includes(q));
        });
    }, [properties, owners, searchTerm]);

    const handleDeleteProperty = useCallback(async (id: string) => {
        const linkedUnits = units.filter(u => u.propertyId === id);
        if (linkedUnits.length > 0) {
            toast.error(`لا يمكن حذف العقار لأنه يحتوي على ${linkedUnits.length} وحدة. احذف الوحدات أولاً.`);
            return;
        }
        await dataService.remove('properties', id);
    }, [dataService, units]);

    const stats = useMemo(() => {
        // unit.status is auto-synced by DB trigger — do not set manually
        const totalUnits = units.length;
        const rented = units.filter(u => u.status === 'RENTED').length;
        const available = units.filter(u => u.status === 'AVAILABLE').length;
        const maintenance = units.filter(u => u.status === 'MAINTENANCE').length;
        const occupancy = totalUnits > 0 ? ((rented / totalUnits) * 100) : 0;
        return { totalUnits, rented, available, maintenance, occupancy };
    }, [units]);

    if (selectedProp) {
        return <UnitsView property={selectedProp} onBack={() => setSelectedProp(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <Building size={18} className="mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-black">{properties.length}</p>
                    <p className="text-[10px] text-text-muted">عقارات</p>
                </div>
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <Home size={18} className="mx-auto mb-1 text-indigo-500" />
                    <p className="text-lg font-black">{stats.totalUnits}</p>
                    <p className="text-[10px] text-text-muted">وحدات</p>
                </div>
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <User size={18} className="mx-auto mb-1 text-emerald-500" />
                    <p className="text-lg font-black">{stats.rented}</p>
                    <p className="text-[10px] text-text-muted">مؤجرة</p>
                </div>
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <AlertCircle size={18} className="mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-black">{stats.available}</p>
                    <p className="text-[10px] text-text-muted">شاغرة</p>
                </div>
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-3 text-center">
                    <Percent size={18} className="mx-auto mb-1 text-purple-500" />
                    <p className="text-lg font-black">{stats.occupancy.toFixed(0)}%</p>
                    <p className="text-[10px] text-text-muted">نسبة الإشغال</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">قائمة العقارات</h2>
                <button onClick={() => { setEditingProp(null); setIsPropModalOpen(true); }} className="btn btn-primary">إضافة عقار</button>
            </div>
            <SearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="بحث باسم العقار، الموقع أو المالك..." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(p => {
                    const propertyUnits = units.filter(u => u.propertyId === p.id);
                    const rentedUnits = propertyUnits.filter(u => u.status === 'RENTED').length;
                    const occupancy = propertyUnits.length > 0 ? (rentedUnits / propertyUnits.length) * 100 : 0;
                    const activeContracts = db.contracts.filter(c => c.status === 'ACTIVE' && propertyUnits.some(u => u.id === c.unitId));
                    const monthlyRevenue = activeContracts.reduce((sum, c) => sum + (c.rent || 0), 0);
                    const netOwnerDue = ownerBalances[p.ownerId]?.net ?? 0;
                    return (
                    <div key={p.id} onClick={() => setSelectedProp(p)} className="bg-background p-4 rounded-lg border border-outline-variant/40 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{p.name}</h3>
                            <div onClick={(e) => e.stopPropagation()}>
                                <ActionsMenu items={[ EditAction(() => { setEditingProp(p); setIsPropModalOpen(true); }), DeleteAction(async () => await handleDeleteProperty(p.id)) ]} />
                            </div>
                        </div>
                        <p className="text-sm text-text-muted mb-4">{p.location}</p>
                        <div className="flex justify-between text-xs text-text-muted">
                            <span>الوحدات: {toArabicDigits(propertyUnits.length)}</span>
                            <span>المالك: {owners.find(o=>o.id===p.ownerId)?.name || '-'}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 mt-3 pt-3 border-t border-border text-xs">
                            <p>إجمالي الإيرادات الشهرية: <span className="font-bold text-primary">{formatCurrency(monthlyRevenue, settings.operational.currency)}</span></p>
                            <p>نسبة الإشغال: <span className="font-bold">{occupancy.toFixed(0)}%</span></p>
                            <p>صافي مستحق المالك: <span className={`font-bold ${netOwnerDue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netOwnerDue, settings.operational.currency)}</span></p>
                        </div>
                    </div>
                )})}
            </div>
            {isPropModalOpen && <PropertyForm isOpen={isPropModalOpen} onClose={() => setIsPropModalOpen(false)} property={editingProp} />}
        </div>
    );
};

const UNIT_STATUS_MAP: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: 'شاغرة', color: 'bg-green-100 text-green-800' },
    RENTED: { label: 'مؤجرة', color: 'bg-blue-100 text-blue-800' },
    MAINTENANCE: { label: 'صيانة', color: 'bg-yellow-100 text-yellow-800' },
    ON_HOLD: { label: 'معلقة', color: 'bg-gray-100 text-gray-800' },
};

const UnitsView: React.FC<{ property: Property, onBack: () => void }> = ({ property, onBack }) => {
    const { db, dataService } = useApp();
    const allUnits = Array.isArray(db.units) ? db.units : [];
    const utilityRecords = Array.isArray(db.utilityRecords) ? db.utilityRecords : [];
    const contracts = Array.isArray(db.contracts) ? db.contracts : [];
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | Unit['status']>('ALL');
    
    const units = useMemo(() => allUnits.filter(u => u.propertyId === property.id), [allUnits, property.id]);
    const filteredUnits = useMemo(() => statusFilter === 'ALL' ? units : units.filter(u => u.status === statusFilter), [units, statusFilter]);

    const activeContractsByUnit = useMemo(() => {
        const map = new Map<string, typeof contracts[number]>();
        contracts.filter(c => c.status === 'ACTIVE').forEach(c => map.set(c.unitId, c));
        return map;
    }, [contracts]);

    const handleDeleteUnit = useCallback(async (id: string) => {
        const hasContract = db.contracts.some(c => c.unitId === id && c.status === 'ACTIVE');
        if (hasContract) {
            toast.error('لا يمكن حذف وحدة مرتبطة بعقد نشط.');
            return;
        }
        await dataService.remove('units', id);
    }, [dataService, db.contracts]);
    
    const utilityCountMap = useMemo(() => {
        const map = new Map<string, number>();
        utilityRecords.forEach(r => {
            map.set(r.unitId, (map.get(r.unitId) || 0) + 1);
        });
        return map;
    }, [utilityRecords]);

    const floors = useMemo(() => [...new Set(filteredUnits.map(u => u.floor || 'بدون دور'))], [filteredUnits]);
    const hasFloors = useMemo(() => filteredUnits.some(u => u.floor), [filteredUnits]);

    const stats = useMemo(() => ({
        rented: units.filter(u => u.status === 'RENTED').length,
        available: units.filter(u => u.status === 'AVAILABLE').length,
        onHold: units.filter(u => u.status === 'ON_HOLD').length,
    }), [units]);
    if (selectedUnit) {
        return (
            <ErrorBoundary key={selectedUnit.id}>
                <UnitDetailView unit={selectedUnit} property={property} onBack={() => setSelectedUnit(null)} />
            </ErrorBoundary>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn btn-ghost"><ArrowRight/></button>
                    <h2 className="text-xl font-bold">وحدات: {property.name}</h2>
                </div>
                <button onClick={() => { setEditingUnit(null); setIsUnitModalOpen(true); }} className="btn btn-primary">إضافة وحدة</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background border border-outline-variant/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{toArabicDigits(units.length)}</p>
                    <p className="text-xs text-text-muted">إجمالي الوحدات</p>
                </div>
                <div className="bg-background border border-outline-variant/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{toArabicDigits(stats.rented)}</p>
                    <p className="text-xs text-text-muted">مؤجرة</p>
                </div>
                <div className="bg-background border border-outline-variant/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{toArabicDigits(stats.available)}</p>
                    <p className="text-xs text-text-muted">شاغرة</p>
                </div>
                <div className="bg-background border border-outline-variant/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-600">{toArabicDigits(stats.onHold)}</p>
                    <p className="text-xs text-text-muted">معلقة</p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button className={`btn text-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter('ALL')}>الكل</button>
                <button className={`btn text-sm ${statusFilter === 'RENTED' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter('RENTED')}>مؤجرة</button>
                <button className={`btn text-sm ${statusFilter === 'AVAILABLE' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter('AVAILABLE')}>شاغرة</button>
                <button className={`btn text-sm ${statusFilter === 'MAINTENANCE' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter('MAINTENANCE')}>صيانة</button>
                <button className={`btn text-sm ${statusFilter === 'ON_HOLD' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter('ON_HOLD')}>معلقة</button>
            </div>

            {hasFloors ? (
                floors.map(fl => {
                    const floorUnits = filteredUnits.filter(u => (u.floor || 'بدون دور') === fl);
                    return (
                        <div key={fl} className="space-y-3">
                            <h3 className="font-bold text-lg border-b border-border pb-2">{fl === 'بدون دور' ? fl : `الدور ${fl}`} <span className="text-sm text-text-muted font-normal">({toArabicDigits(floorUnits.length)} وحدات)</span></h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {floorUnits.map(u => (
                                    <UnitCard 
                                        key={u.id} 
                                        u={u} 
                                        activeContract={activeContractsByUnit.get(u.id)}
                                        utilCount={utilityCountMap.get(u.id) || 0}
                                        onEdit={() => { setEditingUnit(u); setIsUnitModalOpen(true); }} 
                                        onDelete={async () => await handleDeleteUnit(u.id)}
                                        onViewUtilities={() => setSelectedUnit(u)} 
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredUnits.map(u => (
                        <UnitCard 
                            key={u.id} 
                            u={u} 
                            activeContract={activeContractsByUnit.get(u.id)}
                            utilCount={utilityCountMap.get(u.id) || 0}
                            onEdit={() => { setEditingUnit(u); setIsUnitModalOpen(true); }} 
                            onDelete={async () => await handleDeleteUnit(u.id)}
                            onViewUtilities={() => setSelectedUnit(u)} 
                        />
                    ))}
                </div>
            )}
            {isUnitModalOpen && <UnitForm isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} unit={editingUnit} propertyId={property.id} />}
        </div>
    );
};

const UnitCard: React.FC<{ u: Unit; activeContract?: { rent: number } | null; utilCount: number; onEdit: () => void; onDelete: () => void; onViewUtilities: () => void }> = memo(({ u, activeContract, utilCount, onEdit, onDelete, onViewUtilities }) => {
    const navigate = useNavigate();
    const st = UNIT_STATUS_MAP[u.status] || UNIT_STATUS_MAP.AVAILABLE;
    
    const featuresList = useMemo(() => {
        const list: string[] = [];
        if (u.bedrooms) list.push(`${u.bedrooms} غرف`);
        if (u.bathrooms) list.push(`${u.bathrooms} حمام`);
        if (u.kitchens) list.push(`${u.kitchens} مطبخ`);
        if (u.livingRooms) list.push(`${u.livingRooms} صالة`);
        return list;
    }, [u.bedrooms, u.bathrooms, u.kitchens, u.livingRooms]);

    return (
        <div className="p-4 bg-background border border-outline-variant/40 rounded-lg relative group hover:shadow-lg transition-shadow">
            <div className="absolute top-2 left-2">
                <ActionsMenu items={[
                    { label: 'إدارة المرافق', icon: <Zap size={14} />, onClick: onViewUtilities },
                    EditAction(onEdit),
                    DeleteAction(onDelete),
                ]} />
            </div>
            <p className="font-bold mb-1 cursor-pointer hover:text-primary" onClick={onViewUtilities}>{u.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
            <p className="text-xs text-text-muted mt-1">{u.type}{u.area ? ` • ${u.area} م²` : ''}</p>
            {featuresList.length > 0 && <p className="text-xs text-text-muted mt-1">{featuresList.join(' • ')}</p>}
            {u.status === 'RENTED' && activeContract && (
                <p className="text-xs mt-1">
                    الإيجار الشهري: <span className="font-bold text-primary">{formatCurrency(activeContract.rent)}</span>
                </p>
            )}
            <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-bold text-primary">{formatCurrency(u.rentDefault)}</p>
                {utilCount > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{utilCount} مرافق</span>}
            </div>
            {u.status === 'AVAILABLE' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contracts?action=add&unitId=${u.id}`);
                    }}
                    className="btn btn-secondary w-full mt-2 text-xs"
                >
                    إضافة عقد جديد
                </button>
            )}
            {(u.waterMeter || u.electricityMeter) && (
                <p className="text-xs text-text-muted mt-1">
                    {u.waterMeter && `💧 ${u.waterMeter}`} {u.electricityMeter && `⚡ ${u.electricityMeter}`}
                </p>
            )}
        </div>
    );
});

const UTILITY_COLORS: Record<string, string> = {
    WATER: 'bg-blue-100 text-blue-700 border-blue-200',
    ELECTRICITY: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    GAS: 'bg-orange-100 text-orange-700 border-orange-200',
    INTERNET: 'bg-purple-100 text-purple-700 border-purple-200',
    OTHER: 'bg-gray-100 text-gray-700 border-gray-200',
};

const UtilityRecordForm: React.FC<{
    isOpen: boolean; onClose: () => void;
    record: UtilityRecord | null; unitId: string; propertyId: string;
}> = ({ isOpen, onClose, record, unitId, propertyId }) => {
    const { dataService, settings, db } = useApp();
    const properties = Array.isArray(db.properties) ? db.properties : [];
    const units = Array.isArray(db.units) ? db.units : [];
    const contracts = Array.isArray(db.contracts) ? db.contracts : [];
    const currency = settings.operational?.currency ?? 'OMR';
    const fileRef = useRef<HTMLInputElement>(null);

    const [type, setType] = useState<UtilityType>(record?.type || 'ELECTRICITY');
    const [month, setMonth] = useState(record?.month || new Date().toISOString().slice(0, 7));
    const [prevReading, setPrevReading] = useState(record?.previousReading ?? 0);
    const [currReading, setCurrReading] = useState(record?.currentReading ?? 0);
    const [unitPrice, setUnitPrice] = useState(record?.unitPrice ?? 0);
    const [paidBy, setPaidBy] = useState<UtilityRecord['paidBy']>(record?.paidBy || 'TENANT');
    const [notes, setNotes] = useState(record?.notes || '');
    const [billImageUrl, setBillImageUrl] = useState(record?.billImageUrl || '');
    const [billImageMime, setBillImageMime] = useState(record?.billImageMime || '');
    const [billPreviewUrl, setBillPreviewUrl] = useState('');

    React.useEffect(() => {
        if (record) {
            setType(record.type); setMonth(record.month);
            setPrevReading(record.previousReading); setCurrReading(record.currentReading);
            setUnitPrice(record.unitPrice); setPaidBy(record.paidBy);
            setNotes(record.notes || ''); setBillImageUrl(record.billImageUrl || '');
            setBillImageMime(record.billImageMime || '');
        } else {
            setType('ELECTRICITY'); setMonth(new Date().toISOString().slice(0, 7));
            setPrevReading(0); setCurrReading(0); setUnitPrice(0);
            setPaidBy('TENANT'); setNotes(''); setBillImageUrl(''); setBillImageMime('');
        }
    }, [record, isOpen]);

    React.useEffect(() => {
        let active = true;
        const resolvePreview = async () => {
            if (!billImageUrl) {
                setBillPreviewUrl('');
                return;
            }
            if (billImageUrl.startsWith('data:')) {
                setBillPreviewUrl(billImageUrl);
                return;
            }
            try {
                const signed = await getAttachmentUrl(billImageUrl);
                if (active) setBillPreviewUrl(signed);
            } catch {
                if (active) setBillPreviewUrl('');
            }
        };
        void resolvePreview();
        return () => {
            active = false;
        };
    }, [billImageUrl]);

    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const consumption = useMemo(() => Math.max(0, currReading - prevReading), [currReading, prevReading]);
    const amount = useMemo(() => consumption * unitPrice, [consumption, unitPrice]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const upload = async () => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                toast.error('نوع الملف غير مدعوم. المسموح: PDF أو JPG أو PNG أو WEBP.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) { toast.error('حجم الملف يجب أن يكون أقل من 10MB'); return; }
            try {
                const contextEntityId = record?.id || crypto.randomUUID();
                const { path } = await uploadAttachment(file, { entityType: 'UTILITY', entityId: contextEntityId });
                setBillImageUrl(path);
                setBillImageMime(file.type);
                toast.success('تم رفع المرفق بنجاح');
            } catch (error) {
                console.error(error);
                toast.error('تعذر رفع مرفق الفاتورة');
            }
        };
        void upload();
    }, [record?.id]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        if (currReading < prevReading) { toast.error('القراءة الحالية يجب أن تكون أكبر من أو تساوي القراءة السابقة'); return; }
        
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data: Omit<UtilityRecord, 'id' | 'createdAt'> = {
                unitId, propertyId, type, month, previousReading: prevReading,
                currentReading: currReading, unitPrice, amount, paidBy,
                notes: notes || undefined, billImageUrl: billImageUrl || undefined,
                billImageMime: billImageMime || undefined,
            };
            if (record) {
                await dataService.update('utilityRecords', record.id, data);
            } else {
                const newRecord = await dataService.add('utilityRecords', data);
                if (newRecord && amount > 0) {
                    const property = properties.find(p => p.id === propertyId);
                    const unit = units.find(u => u.id === unitId);
                    const UTILITY_AR: Record<string, string> = { WATER: 'مياه', ELECTRICITY: 'كهرباء', GAS: 'غاز', INTERNET: 'إنترنت', OTHER: 'مرافق' };
                    const expenseCategory = `مرافق - ${UTILITY_AR[type] || type}`;
                    const expenseNotes = `فاتورة ${UTILITY_AR[type] || type} - وحدة ${unit?.name || ''} - شهر ${month}`;
                    const chargedTo = paidBy === 'OWNER' ? 'OWNER' : paidBy === 'TENANT' ? 'TENANT' : 'OFFICE';
                    const unitContracts = contracts.filter(c => c.unitId === unitId);
                    const linkedContract =
                        unitContracts.find(c => c.status === 'ACTIVE') ||
                        unitContracts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] ||
                        null;
                    await dataService.add('expenses', {
                        dateTime: new Date(`${month}-01`).toISOString(),
                        category: expenseCategory,
                        amount,
                        status: 'POSTED' as const,
                        chargedTo,
                        contractId: linkedContract?.id || null,
                        ref: `UTIL-${newRecord.id?.slice?.(0, 8) || ''}`,
                        notes: expenseNotes,
                        payee: property?.name || 'مرافق',
                    });
                }
            }
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [record, currReading, prevReading, unitId, propertyId, type, month, amount, paidBy, notes, billImageUrl, billImageMime, dataService, db, onClose]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? 'تعديل سجل مرفق' : 'إضافة سجل مرفق جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع المرفق</label>
                        <select value={type} onChange={e => setType(e.target.value as UtilityType)} disabled={isSaving}>
                            {(Object.keys(UTILITY_TYPE_AR) as UtilityType[]).map(k => (
                                <option key={k} value={k}>{UTILITY_ICON[k]} {UTILITY_TYPE_AR[k]}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الشهر</label>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} required disabled={isSaving} />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">القراءة السابقة</label>
                        <NumberInput value={prevReading} onChange={setPrevReading} required disabled={isSaving} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">القراءة الحالية</label>
                        <NumberInput value={currReading} onChange={setCurrReading} required disabled={isSaving} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">سعر الوحدة ({currency})</label>
                        <NumberInput value={unitPrice} onChange={setUnitPrice} required disabled={isSaving} />
                    </div>
                </div>
                <div className="bg-background border border-outline-variant/40 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm">الاستهلاك: <strong>{consumption}</strong> وحدة</span>
                    <span className="text-sm">المبلغ: <strong className="text-primary">{formatCurrency(amount, currency)}</strong></span>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">على حساب</label>
                    <select value={paidBy} onChange={e => setPaidBy(e.target.value as UtilityRecord['paidBy'])} disabled={isSaving}>
                        <option value="TENANT">المستأجر</option>
                        <option value="OWNER">المالك</option>
                        <option value="OFFICE">المكتب</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="bill-image-upload" className="block text-sm font-medium mb-1">صورة الفاتورة</label>
                    <input id="bill-image-upload" type="file" accept="image/*,application/pdf" ref={fileRef} onChange={handleImageUpload} className="hidden" disabled={isSaving} />
                    {billImageUrl ? (
                        <div className="border border-outline-variant/40 rounded-lg p-2 flex items-center justify-between">
                            {billImageMime?.startsWith('image/') && billPreviewUrl && <img src={billPreviewUrl} alt="فاتورة" className="h-16 w-auto rounded object-cover" />}
                            {billImageMime === 'application/pdf' && <span className="text-sm text-blue-600">📄 PDF مرفق</span>}
                            <button type="button" onClick={() => { setBillImageUrl(''); setBillImageMime(''); }} className="text-red-500 hover:text-red-700" disabled={isSaving}><Trash2 size={16} /></button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary w-full flex items-center justify-center gap-2" disabled={isSaving}>
                            <Image size={16} /> رفع صورة الفاتورة
                        </button>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">ملاحظات</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                </div>
                {record && <AttachmentsManager entityType="UTILITY" entityId={record.id} />}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-ghost flex-1" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ السجل'}</button>
                </div>
            </form>
        </Modal>
    );
};

const UtilityBillThumbnail: React.FC<{ path: string }> = ({ path }) => {
    const [url, setUrl] = useState('');

    React.useEffect(() => {
        let active = true;
        const loadUrl = async () => {
            if (!path) return;
            if (path.startsWith('data:')) {
                setUrl(path);
                return;
            }
            try {
                const signedUrl = await getAttachmentUrl(path);
                if (active) setUrl(signedUrl);
            } catch {
                if (active) setUrl('');
            }
        };
        void loadUrl();
        return () => { active = false; };
    }, [path]);

    if (!url) return null;

    return (
        <img
            src={url}
            alt="فاتورة"
            className="h-16 w-16 object-cover rounded-lg border border-white/50 cursor-pointer"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        />
    );
};

const UnitDetailView: React.FC<{ unit: Unit; property: Property; onBack: () => void }> = ({ unit, property, onBack }) => {
    const { db, dataService, settings } = useApp();
    const utilityRecords = Array.isArray(db.utilityRecords) ? db.utilityRecords : [];
    const contracts = Array.isArray(db.contracts) ? db.contracts : [];
    const tenants = Array.isArray(db.tenants) ? db.tenants : [];
    const currency = settings.operational?.currency ?? 'OMR';
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<UtilityRecord | null>(null);
    const [activeType, setActiveType] = useState<UtilityType | 'ALL'>('ALL');
    const [recordToDelete, setRecordToDelete] = useState<UtilityRecord | null>(null);

    const unitRecords = useMemo(() => utilityRecords.filter(r => r.unitId === unit.id), [utilityRecords, unit.id]);
    const filtered = useMemo(() => activeType === 'ALL' ? unitRecords : unitRecords.filter(r => r.type === activeType), [unitRecords, activeType]);
    const sorted = useMemo(() => [...filtered].sort((a, b) => b.month.localeCompare(a.month)), [filtered]);
    const runningTotalsByType = useMemo(() => {
        const totalsMap = new Map<string, number>();
        const runningById = new Map<string, number>();
        [...sorted].reverse().forEach(record => {
            const current = (totalsMap.get(record.type) || 0) + (record.amount || 0);
            totalsMap.set(record.type, current);
            runningById.set(record.id, current);
        });
        return runningById;
    }, [sorted]);

    const totals = useMemo(() => {
        const byType: Record<string, { count: number; amount: number; consumption: number }> = {};
        unitRecords.forEach(r => {
            if (!byType[r.type]) byType[r.type] = { count: 0, amount: 0, consumption: 0 };
            byType[r.type].count++;
            byType[r.type].amount += r.amount;
            byType[r.type].consumption += Math.max(0, r.currentReading - r.previousReading);
        });
        return byType;
    }, [unitRecords]);

    const totalAmount = unitRecords.reduce((s, r) => s + r.amount, 0);
    const activeContract = contracts.find(c => c.unitId === unit.id && c.status === 'ACTIVE');
    const tenant = activeContract ? tenants.find(t => t.id === activeContract.tenantId) : null;

    const handleDelete = async (record: UtilityRecord) => {
        await dataService.remove('utilityRecords', record.id);
        setRecordToDelete(null);
        toast.success('تم حذف السجل');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <button onClick={onBack} className="hover:text-primary font-medium">{property.name}</button>
                    <ChevronRight size={14} />
                    <span className="text-text font-bold">{unit.name}</span>
                </div>
                <button onClick={() => { setEditingRecord(null); setIsFormOpen(true); }} className="btn btn-primary flex items-center gap-2">
                    <Plus size={16} /> إضافة قراءة مرافق
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background border border-outline-variant/40 rounded-lg p-4">
                    <p className="text-xs text-text-muted mb-1">رقم عداد المياه</p>
                    <p className="font-bold">{unit.waterMeter || '—'}</p>
                    <p className="text-2xl mt-1">💧</p>
                </div>
                <div className="bg-background border border-outline-variant/40 rounded-lg p-4">
                    <p className="text-xs text-text-muted mb-1">رقم عداد الكهرباء</p>
                    <p className="font-bold">{unit.electricityMeter || '—'}</p>
                    <p className="text-2xl mt-1">⚡</p>
                </div>
                <div className="bg-background border border-outline-variant/40 rounded-lg p-4">
                    <p className="text-xs text-text-muted mb-1">المستأجر الحالي</p>
                    <p className="font-bold text-sm">{tenant?.name || 'شاغرة'}</p>
                    <p className="text-xs text-text-muted mt-1">{tenant && activeContract?.rent ? formatCurrency(activeContract.rent, currency) + '/شهر' : ''}</p>
                </div>
                <div className="bg-background border border-outline-variant/40 rounded-lg p-4">
                    <p className="text-xs text-text-muted mb-1">إجمالي فواتير المرافق</p>
                    <p className="font-bold text-primary">{formatCurrency(totalAmount, currency)}</p>
                    <p className="text-xs text-text-muted mt-1">{unitRecords.length} سجل</p>
                </div>
            </div>

            {Object.keys(totals).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(Object.keys(UTILITY_TYPE_AR) as UtilityType[]).filter(t => totals[t]).map(t => (
                        <div key={t} className={`border rounded-lg p-4 cursor-pointer ${activeType === t ? 'ring-2 ring-primary' : ''} ${UTILITY_COLORS[t]}`} onClick={() => setActiveType(activeType === t ? 'ALL' : t)}>
                            <p className="text-2xl">{UTILITY_ICON[t]}</p>
                            <p className="font-bold text-sm mt-1">{UTILITY_TYPE_AR[t]}</p>
                            <p className="text-lg font-bold">{formatCurrency(totals[t].amount, currency)}</p>
                            <p className="text-xs">{totals[t].count} فاتورة</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setActiveType('ALL')} className={`btn text-sm ${activeType === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}>الكل ({unitRecords.length})</button>
                {(Object.keys(UTILITY_TYPE_AR) as UtilityType[]).filter(t => totals[t]).map(t => (
                    <button key={t} onClick={() => setActiveType(activeType === t ? 'ALL' : t)} className={`btn text-sm ${activeType === t ? 'btn-primary' : 'btn-ghost'}`}>
                        {UTILITY_ICON[t]} {UTILITY_TYPE_AR[t]} ({totals[t]?.count || 0})
                    </button>
                ))}
            </div>

            {sorted.length > 0 ? (
                <div className="space-y-3">
                    {sorted.map(r => (
                        <div key={r.id} className={`border rounded-lg p-4 flex items-start gap-4 ${UTILITY_COLORS[r.type]}`}>
                            <div className="text-3xl">{UTILITY_ICON[r.type as UtilityType]}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold">{UTILITY_TYPE_AR[r.type as UtilityType]}</span>
                                    <span className="text-sm">{r.month}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.paidBy === 'TENANT' ? 'bg-blue-200 text-blue-800' : r.paidBy === 'OWNER' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                        {r.paidBy === 'TENANT' ? 'مستأجر' : r.paidBy === 'OWNER' ? 'مالك' : 'مكتب'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div><span className="text-text-muted">سابق:</span> <strong>{r.previousReading}</strong></div>
                                    <div><span className="text-text-muted">حالي:</span> <strong>{r.currentReading}</strong></div>
                                    <div><span className="text-text-muted">استهلاك:</span> <strong>{Math.max(0, r.currentReading - r.previousReading)} وحدة</strong></div>
                                    <div><span className="text-text-muted">المبلغ:</span> <strong className="text-primary">{formatCurrency(r.amount, currency)}</strong></div>
                                </div>
                                <p className="text-xs mt-2">
                                    الإجمالي التراكمي ({UTILITY_TYPE_AR[r.type as UtilityType]}):{' '}
                                    <span className="font-bold">{formatCurrency(runningTotalsByType.get(r.id) || 0, currency)}</span>
                                </p>
                                {r.notes && <p className="text-xs mt-2 opacity-75">{r.notes}</p>}
                            </div>
                            {r.billImageUrl && r.billImageMime?.startsWith('image/') && (
                                <UtilityBillThumbnail path={r.billImageUrl} />
                            )}
                            <div className="shrink-0">
                                <ActionsMenu items={[
                                    EditAction(() => { setEditingRecord(r); setIsFormOpen(true); }),
                                    DeleteAction(() => setRecordToDelete(r)),
                                ]} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted">
                    <Zap size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">لا توجد سجلات مرافق لهذه الوحدة</p>
                    <p className="text-sm mt-1">ابدأ بإضافة قراءات العداد والفواتير</p>
                    <button onClick={() => { setEditingRecord(null); setIsFormOpen(true); }} className="btn btn-primary mt-4">
                        <Plus size={16} /> إضافة أول سجل
                    </button>
                </div>
            )}

            <AttachmentsManager entityType="UNIT" entityId={unit.id} />

            {isFormOpen && <UtilityRecordForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} record={editingRecord} unitId={unit.id} propertyId={property.id} />}
            <ConfirmActionModal
                isOpen={!!recordToDelete}
                onClose={() => setRecordToDelete(null)}
                onConfirm={() => recordToDelete && handleDelete(recordToDelete)}
                title="تأكيد حذف سجل المرافق"
                message="هل أنت متأكد من حذف سجل المرافق هذا؟ لا يمكن التراجع بعد الحذف."
                confirmLabel="حذف السجل"
            />
        </div>
    );
};

const PropertyForm: React.FC<{ isOpen: boolean, onClose: () => void, property: Property | null }> = ({ isOpen, onClose, property }) => {
    const { db, dataService } = useApp();
    const owners = Array.isArray(db.owners) ? db.owners : [];
    const properties = Array.isArray(db.properties) ? db.properties : [];
    const [name, setName] = useState(property?.name || '');
    const [ownerId, setOwnerId] = useState(property?.ownerId || owners[0]?.id || '');
    const [location, setLocation] = useState(property?.location || '');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;

        const ownerAlreadyHasProperty = properties.some(
            p => p.ownerId === ownerId && p.id !== property?.id
        );
        if (ownerAlreadyHasProperty) {
            toast.error('لا يمكن إسناد عقارين للمالك نفسه. يرجى اختيار مالك آخر أو إلغاء إسناد العقار الحالي أولاً.');
            return;
        }
        
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = { name, ownerId, location, type: 'Building', notes: '' };
            if (property) await dataService.update('properties', property.id, data); 
            else await dataService.add('properties', data);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [property, name, ownerId, location, properties, dataService, onClose]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="بيانات العقار">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input placeholder="اسم العقار" value={name} onChange={e=>setName(e.target.value)} required disabled={isSaving} />
                <select value={ownerId} onChange={e=>setOwnerId(e.target.value)} disabled={isSaving}>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
                <input placeholder="الموقع" value={location} onChange={e=>setLocation(e.target.value)} disabled={isSaving} />
                {property && <AttachmentsManager entityType="PROPERTY" entityId={property.id} />}
                <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ العقار'}</button>
            </form>
        </Modal>
    );
};

const UNIT_TYPES = [
    { value: 'شقة', label: 'شقة' },
    { value: 'محل', label: 'محل تجاري' },
    { value: 'مكتب', label: 'مكتب' },
    { value: 'استوديو', label: 'استوديو' },
    { value: 'فيلا', label: 'فيلا' },
    { value: 'مستودع', label: 'مستودع' },
    { value: 'غرفة', label: 'غرفة' },
    { value: 'أخرى', label: 'أخرى' },
];

const FLOOR_OPTIONS = [
    { value: 'أرضي', label: 'الدور الأرضي' },
    { value: 'أول', label: 'الدور الأول' },
    { value: 'ثاني', label: 'الدور الثاني' },
    { value: 'ثالث', label: 'الدور الثالث' },
    { value: 'رابع', label: 'الدور الرابع' },
    { value: 'خامس', label: 'الدور الخامس' },
    { value: 'سطح', label: 'السطح' },
    { value: 'بدروم', label: 'البدروم' },
];

const UnitForm: React.FC<{ isOpen: boolean, onClose: () => void, unit: Unit | null, propertyId: string }> = ({ isOpen, onClose, unit, propertyId }) => {
    const { dataService } = useApp();
    const [name, setName] = useState(unit?.name || '');
    const [type, setType] = useState(unit?.type || 'شقة');
    const [floor, setFloor] = useState(unit?.floor || '');
    const [status, setStatus] = useState<Unit['status']>(unit?.status || 'AVAILABLE');
    const [rent, setRent] = useState(unit?.rentDefault || 0);
    const [minRent, setMinRent] = useState(unit?.minRent || 0);
    const [area, setArea] = useState(unit?.area || 0);
    const [bedrooms, setBedrooms] = useState(unit?.bedrooms || 0);
    const [bathrooms, setBathrooms] = useState(unit?.bathrooms || 0);
    const [kitchens, setKitchens] = useState(unit?.kitchens || 0);
    const [livingRooms, setLivingRooms] = useState(unit?.livingRooms || 0);
    const [waterMeter, setWaterMeter] = useState(unit?.waterMeter || '');
    const [electricityMeter, setElectricityMeter] = useState(unit?.electricityMeter || '');
    const [features, setFeatures] = useState(unit?.features || '');
    const [notes, setNotes] = useState(unit?.notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [rentError, setRentError] = useState('');
    const isSavingRef = useRef(false);

    React.useEffect(() => {
        if (unit) {
            setName(unit.name); setType(unit.type || 'شقة'); setFloor(unit.floor || '');
            setStatus(unit.status); setRent(unit.rentDefault); setMinRent(unit.minRent || 0); setArea(unit.area || 0);
            setBedrooms(unit.bedrooms || 0); setBathrooms(unit.bathrooms || 0);
            setKitchens(unit.kitchens || 0); setLivingRooms(unit.livingRooms || 0);
            setWaterMeter(unit.waterMeter || ''); setElectricityMeter(unit.electricityMeter || '');
            setFeatures(unit.features || ''); setNotes(unit.notes || '');
        } else {
            setMinRent(0); setRentError('');
        }
    }, [unit, isOpen]);

    const handleRentChange = useCallback((val: number) => {
        setRent(val);
        if (minRent > 0 && val < minRent) {
            setRentError(`الإيجار لا يمكن أن يقل عن الحد الأدنى (${minRent})`);
        } else {
            setRentError('');
        }
    }, [minRent]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        if (minRent > 0 && rent < minRent) {
            toast.error(`الإيجار الافتراضي (${rent}) لا يمكن أن يقل عن الحد الأدنى (${minRent})`);
            return;
        }
        
        isSavingRef.current = true;
        setIsSaving(true);
        try {
                const data = {
                    name, type, floor, status, rentDefault: rent, minRent: minRent || undefined,
                area: area || undefined,
                bedrooms: bedrooms || undefined, bathrooms: bathrooms || undefined,
                kitchens: kitchens || undefined, livingRooms: livingRooms || undefined,
                waterMeter: waterMeter || undefined, electricityMeter: electricityMeter || undefined,
                features: features || undefined, notes, propertyId,
            };
            if (unit) await dataService.update('units', unit.id, data); 
            else await dataService.add('units', data);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [unit, name, type, floor, status, rent, minRent, area, bedrooms, bathrooms, kitchens, livingRooms, waterMeter, electricityMeter, features, notes, propertyId, dataService, onClose]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={unit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم/اسم الوحدة</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">نوع الوحدة</label>
                            <select value={type} onChange={e => setType(e.target.value)} disabled={isSaving}>
                                {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الدور</label>
                            <select value={floor} onChange={e => setFloor(e.target.value)} disabled={isSaving}>
                                <option value="">-- اختر الدور --</option>
                                {FLOOR_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحالة</label>
                            <select value={status} onChange={e => setStatus(e.target.value as Unit['status'])} disabled>
                                <option value="AVAILABLE">شاغرة</option>
                                <option value="RENTED">مؤجرة</option>
                                <option value="MAINTENANCE">صيانة</option>
                                <option value="ON_HOLD">معلقة</option>
                            </select>
                            <p className="text-xs text-text-muted mt-1">تتحدد الحالة تلقائياً وفق العقد النشط والصيانة.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الإيجار الافتراضي</label>
                            <NumberInput value={rent} onChange={handleRentChange} required disabled={isSaving} />
                            {rentError && <p className="text-xs text-red-500 mt-1">{rentError}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحد الأدنى للإيجار</label>
                            <NumberInput value={minRent} onChange={setMinRent} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">المساحة (م²)</label>
                            <NumberInput value={area} onChange={setArea} disabled={isSaving} />
                        </div>
                    </div>

                    <h4 className="font-bold text-sm text-text-muted pt-2 border-t border-border">خصائص الوحدة</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">غرف النوم</label>
                            <NumberInput value={bedrooms} onChange={setBedrooms} allowDecimal={false} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحمامات</label>
                            <NumberInput value={bathrooms} onChange={setBathrooms} allowDecimal={false} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">المطابخ</label>
                            <NumberInput value={kitchens} onChange={setKitchens} allowDecimal={false} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الصالات</label>
                            <NumberInput value={livingRooms} onChange={setLivingRooms} allowDecimal={false} disabled={isSaving} />
                        </div>
                    </div>

                    <h4 className="font-bold text-sm text-text-muted pt-2 border-t border-border">العدادات</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم عداد المياه</label>
                            <input type="text" value={waterMeter} onChange={e => setWaterMeter(e.target.value)} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم عداد الكهرباء</label>
                            <input type="text" value={electricityMeter} onChange={e => setElectricityMeter(e.target.value)} disabled={isSaving} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">مميزات إضافية</label>
                        <input type="text" value={features} onChange={e => setFeatures(e.target.value)} placeholder="مثال: مكيف مركزي، موقف سيارة، بلكونة" disabled={isSaving} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isSaving} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ الوحدة'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default Properties;
