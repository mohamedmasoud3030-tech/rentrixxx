import React, { useState, useMemo, useRef, memo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { Property, Unit, UtilityRecord, UtilityType, UTILITY_TYPE_AR, UTILITY_ICON } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { formatCurrency, toArabicDigits, formatDate } from '../utils/helpers';
import { Building, Home, ArrowRight, User, Map as MapIcon, AlertCircle, Clock, FileText, Wrench, Phone, Percent, TrendingUp, Zap, Droplets, Flame, Wifi, ChevronRight, Plus, Image, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PropertyMapView from './PropertyMap';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

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
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [selectedProp, setSelectedProp] = useState<Property | null>(null);
    const [isPropModalOpen, setIsPropModalOpen] = useState(false);
    const [editingProp, setEditingProp] = useState<Property | null>(null);

    const stats = useMemo(() => {
        const totalUnits = db.units.length;
        const rented = db.units.filter(u => u.status === 'RENTED').length;
        const available = db.units.filter(u => u.status === 'AVAILABLE').length;
        const maintenance = db.units.filter(u => u.status === 'MAINTENANCE').length;
        const occupancy = totalUnits > 0 ? ((rented / totalUnits) * 100) : 0;
        return { totalUnits, rented, available, maintenance, occupancy };
    }, [db.units]);

    if (selectedProp) {
        return <UnitsView property={selectedProp} onBack={() => setSelectedProp(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                    <Building size={18} className="mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-black">{db.properties.length}</p>
                    <p className="text-[10px] text-text-muted">عقارات</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                    <Home size={18} className="mx-auto mb-1 text-indigo-500" />
                    <p className="text-lg font-black">{stats.totalUnits}</p>
                    <p className="text-[10px] text-text-muted">وحدات</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                    <User size={18} className="mx-auto mb-1 text-emerald-500" />
                    <p className="text-lg font-black">{stats.rented}</p>
                    <p className="text-[10px] text-text-muted">مؤجرة</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                    <AlertCircle size={18} className="mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-black">{stats.available}</p>
                    <p className="text-[10px] text-text-muted">شاغرة</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                    <Percent size={18} className="mx-auto mb-1 text-purple-500" />
                    <p className="text-lg font-black">{stats.occupancy.toFixed(0)}%</p>
                    <p className="text-[10px] text-text-muted">نسبة الإشغال</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">قائمة العقارات</h2>
                <button onClick={() => { setEditingProp(null); setIsPropModalOpen(true); }} className="btn btn-primary">إضافة عقار</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {db.properties.map(p => (
                    <div key={p.id} onClick={() => setSelectedProp(p)} className="bg-background p-4 rounded-lg border border-border cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{p.name}</h3>
                            <div onClick={(e) => e.stopPropagation()}>
                                {/* FIX: Use dataService for data manipulation */}
                                <ActionsMenu items={[ EditAction(() => { setEditingProp(p); setIsPropModalOpen(true); }), DeleteAction(async () => await dataService.remove('properties', p.id)) ]} />
                            </div>
                        </div>
                        <p className="text-sm text-text-muted mb-4">{p.location}</p>
                        <div className="flex justify-between text-xs text-text-muted">
                            <span>الوحدات: {toArabicDigits(db.units.filter(u=>u.propertyId===p.id).length)}</span>
                            <span>المالك: {db.owners.find(o=>o.id===p.ownerId)?.name}</span>
                        </div>
                    </div>
                ))}
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
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    
    const units = useMemo(() => db.units.filter(u => u.propertyId === property.id), [db.units, property.id]);
    
    const utilityCountMap = useMemo(() => {
        const map = new Map<string, number>();
        (db.utilityRecords || []).forEach(r => {
            map.set(r.unitId, (map.get(r.unitId) || 0) + 1);
        });
        return map;
    }, [db.utilityRecords]);

    if (selectedUnit) {
        return <UnitDetailView unit={selectedUnit} property={property} onBack={() => setSelectedUnit(null)} />;
    }

    const floors = useMemo(() => [...new Set(units.map(u => u.floor || 'بدون دور'))], [units]);
    const hasFloors = useMemo(() => units.some(u => u.floor), [units]);

    const stats = useMemo(() => ({
        rented: units.filter(u => u.status === 'RENTED').length,
        available: units.filter(u => u.status === 'AVAILABLE').length,
        onHold: units.filter(u => u.status === 'ON_HOLD').length,
    }), [units]);

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
                <div className="bg-background border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{toArabicDigits(units.length)}</p>
                    <p className="text-xs text-text-muted">إجمالي الوحدات</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{toArabicDigits(stats.rented)}</p>
                    <p className="text-xs text-text-muted">مؤجرة</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{toArabicDigits(stats.available)}</p>
                    <p className="text-xs text-text-muted">شاغرة</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-600">{toArabicDigits(stats.onHold)}</p>
                    <p className="text-xs text-text-muted">معلقة</p>
                </div>
            </div>

            {hasFloors ? (
                floors.map(fl => {
                    const floorUnits = units.filter(u => (u.floor || 'بدون دور') === fl);
                    return (
                        <div key={fl} className="space-y-3">
                            <h3 className="font-bold text-lg border-b border-border pb-2">{fl === 'بدون دور' ? fl : `الدور ${fl}`} <span className="text-sm text-text-muted font-normal">({toArabicDigits(floorUnits.length)} وحدات)</span></h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {floorUnits.map(u => (
                                    <UnitCard 
                                        key={u.id} 
                                        u={u} 
                                        utilCount={utilityCountMap.get(u.id) || 0}
                                        onEdit={() => { setEditingUnit(u); setIsUnitModalOpen(true); }} 
                                        onDelete={async () => await dataService.remove('units', u.id)} 
                                        onViewUtilities={() => setSelectedUnit(u)} 
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {units.map(u => (
                        <UnitCard 
                            key={u.id} 
                            u={u} 
                            utilCount={utilityCountMap.get(u.id) || 0}
                            onEdit={() => { setEditingUnit(u); setIsUnitModalOpen(true); }} 
                            onDelete={async () => await dataService.remove('units', u.id)} 
                            onViewUtilities={() => setSelectedUnit(u)} 
                        />
                    ))}
                </div>
            )}
            {isUnitModalOpen && <UnitForm isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} unit={editingUnit} propertyId={property.id} />}
        </div>
    );
};

const UnitCard: React.FC<{ u: Unit; utilCount: number; onEdit: () => void; onDelete: () => void; onViewUtilities: () => void }> = memo(({ u, utilCount, onEdit, onDelete, onViewUtilities }) => {
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
        <div className="p-4 bg-background border border-border rounded-lg relative group hover:shadow-lg transition-shadow">
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
            <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-bold text-primary">{formatCurrency(u.rentDefault)}</p>
                {utilCount > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{utilCount} مرافق</span>}
            </div>
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
    const { dataService, settings } = useApp();
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

    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const consumption = useMemo(() => Math.max(0, currReading - prevReading), [currReading, prevReading]);
    const amount = useMemo(() => consumption * unitPrice, [consumption, unitPrice]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة يجب أن يكون أقل من 5MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { setBillImageUrl(ev.target?.result as string); setBillImageMime(file.type); };
        reader.readAsDataURL(file);
    }, []);

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
            if (record) await dataService.update('utilityRecords', record.id, data as any);
            else await dataService.add('utilityRecords', data as any);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [record, currReading, prevReading, unitId, propertyId, type, month, amount, paidBy, notes, billImageUrl, billImageMime, dataService, onClose]);

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
                        <input type="number" min="0" value={prevReading} onChange={e => setPrevReading(Number(e.target.value))} required disabled={isSaving} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">القراءة الحالية</label>
                        <input type="number" min="0" value={currReading} onChange={e => setCurrReading(Number(e.target.value))} required disabled={isSaving} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">سعر الوحدة ({currency})</label>
                        <input type="number" min="0" step="0.001" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} required disabled={isSaving} />
                    </div>
                </div>
                <div className="bg-background border border-border rounded-lg p-3 flex justify-between items-center">
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
                    <label className="block text-sm font-medium mb-1">صورة الفاتورة</label>
                    <input type="file" accept="image/*,application/pdf" ref={fileRef} onChange={handleImageUpload} className="hidden" disabled={isSaving} />
                    {billImageUrl ? (
                        <div className="border border-border rounded-lg p-2 flex items-center justify-between">
                            {billImageMime?.startsWith('image/') && <img src={billImageUrl} alt="فاتورة" className="h-16 w-auto rounded object-cover" />}
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
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="أي ملاحظات إضافية..." />
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-ghost flex-1" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ السجل'}</button>
                </div>
            </form>
        </Modal>
    );
};

const UnitDetailView: React.FC<{ unit: Unit; property: Property; onBack: () => void }> = ({ unit, property, onBack }) => {
    const { db, dataService, settings } = useApp();
    const currency = settings.operational?.currency ?? 'OMR';
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<UtilityRecord | null>(null);
    const [activeType, setActiveType] = useState<UtilityType | 'ALL'>('ALL');

    const unitRecords = useMemo(() => (db.utilityRecords || []).filter(r => r.unitId === unit.id), [db.utilityRecords, unit.id]);
    const filtered = useMemo(() => activeType === 'ALL' ? unitRecords : unitRecords.filter(r => r.type === activeType), [unitRecords, activeType]);
    const sorted = useMemo(() => [...filtered].sort((a, b) => b.month.localeCompare(a.month)), [filtered]);

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
    const activeContract = db.contracts.find(c => c.unitId === unit.id && c.status === 'ACTIVE');
    const tenant = activeContract ? db.tenants.find(t => t.id === activeContract.tenantId) : null;

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف سجل المرفق هذا؟')) return;
        await dataService.remove('utilityRecords', id);
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
                <div className="bg-background border border-border rounded-lg p-4">
                    <p className="text-xs text-text-muted mb-1">رقم عداد المياه</p>
                    <p className="font-bold">{unit.waterMeter || '—'}</p>
                    <p className="text-2xl mt-1">💧</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-4">
                    <p className="text-xs text-text-muted mb-1">رقم عداد الكهرباء</p>
                    <p className="font-bold">{unit.electricityMeter || '—'}</p>
                    <p className="text-2xl mt-1">⚡</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-4">
                    <p className="text-xs text-text-muted mb-1">المستأجر الحالي</p>
                    <p className="font-bold text-sm">{tenant?.name || 'شاغرة'}</p>
                    <p className="text-xs text-text-muted mt-1">{tenant ? activeContract?.rent && formatCurrency(activeContract.rent, currency) + '/شهر' : ''}</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-4">
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
                                {r.notes && <p className="text-xs mt-2 opacity-75">{r.notes}</p>}
                            </div>
                            {r.billImageUrl && r.billImageMime?.startsWith('image/') && (
                                <img src={r.billImageUrl} alt="فاتورة" className="h-16 w-16 object-cover rounded-lg border border-white/50 cursor-pointer" onClick={() => window.open(r.billImageUrl, '_blank')} />
                            )}
                            <div className="shrink-0">
                                <ActionsMenu items={[
                                    EditAction(() => { setEditingRecord(r); setIsFormOpen(true); }),
                                    DeleteAction(() => handleDelete(r.id)),
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
        </div>
    );
};

const PropertyForm: React.FC<{ isOpen: boolean, onClose: () => void, property: Property | null }> = ({ isOpen, onClose, property }) => {
    const { db, dataService } = useApp();
    const [name, setName] = useState(property?.name || '');
    const [ownerId, setOwnerId] = useState(property?.ownerId || db.owners[0]?.id || '');
    const [location, setLocation] = useState(property?.location || '');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = { name, ownerId, location, type: 'Building', notes: '' };
            if (property) await dataService.update('properties', property.id, data); 
            else await dataService.add('properties', data as any);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [property, name, ownerId, location, dataService, onClose]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="بيانات العقار">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input placeholder="اسم العقار" value={name} onChange={e=>setName(e.target.value)} required disabled={isSaving} />
                <select value={ownerId} onChange={e=>setOwnerId(e.target.value)} disabled={isSaving}>{db.owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
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
    const isSavingRef = useRef(false);

    React.useEffect(() => {
        if (unit) {
            setName(unit.name); setType(unit.type || 'شقة'); setFloor(unit.floor || '');
            setStatus(unit.status); setRent(unit.rentDefault); setArea(unit.area || 0);
            setBedrooms(unit.bedrooms || 0); setBathrooms(unit.bathrooms || 0);
            setKitchens(unit.kitchens || 0); setLivingRooms(unit.livingRooms || 0);
            setWaterMeter(unit.waterMeter || ''); setElectricityMeter(unit.electricityMeter || '');
            setFeatures(unit.features || ''); setNotes(unit.notes || '');
        }
    }, [unit, isOpen]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = {
                name, type, floor, status, rentDefault: rent, area: area || undefined,
                bedrooms: bedrooms || undefined, bathrooms: bathrooms || undefined,
                kitchens: kitchens || undefined, livingRooms: livingRooms || undefined,
                waterMeter: waterMeter || undefined, electricityMeter: electricityMeter || undefined,
                features: features || undefined, notes, propertyId,
            };
            if (unit) await dataService.update('units', unit.id, data as any); 
            else await dataService.add('units', data as any);
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [unit, name, type, floor, status, rent, area, bedrooms, bathrooms, kitchens, livingRooms, waterMeter, electricityMeter, features, notes, propertyId, dataService, onClose]);

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
                            <select value={status} onChange={e => setStatus(e.target.value as Unit['status'])} disabled={isSaving}>
                                <option value="AVAILABLE">شاغرة</option>
                                <option value="RENTED">مؤجرة</option>
                                <option value="MAINTENANCE">صيانة</option>
                                <option value="ON_HOLD">معلقة</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الإيجار الافتراضي</label>
                            <input type="number" value={rent} onChange={e => setRent(Number(e.target.value))} required disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">المساحة (م²)</label>
                            <input type="number" value={area} onChange={e => setArea(Number(e.target.value))} disabled={isSaving} />
                        </div>
                    </div>

                    <h4 className="font-bold text-sm text-text-muted pt-2 border-t border-border">خصائص الوحدة</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">غرف النوم</label>
                            <input type="number" min="0" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحمامات</label>
                            <input type="number" min="0" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">المطابخ</label>
                            <input type="number" min="0" value={kitchens} onChange={e => setKitchens(Number(e.target.value))} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الصالات</label>
                            <input type="number" min="0" value={livingRooms} onChange={e => setLivingRooms(Number(e.target.value))} disabled={isSaving} />
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
