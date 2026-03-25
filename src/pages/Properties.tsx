import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Property, Unit } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import { formatCurrency, toArabicDigits, formatDate } from '../utils/helpers';
import { Building, Home, ArrowRight, User, Map, AlertCircle, Clock, FileText, Wrench, Phone, Percent, TrendingUp } from 'lucide-react';
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
                            <Map size={16}/> الخارطة
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
    const units = db.units.filter(u => u.propertyId === property.id);

    const floors = [...new Set(units.map(u => u.floor || 'بدون دور'))];
    const hasFloors = units.some(u => u.floor);

    const rented = units.filter(u => u.status === 'RENTED').length;
    const available = units.filter(u => u.status === 'AVAILABLE').length;
    const onHold = units.filter(u => u.status === 'ON_HOLD').length;

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
                    <p className="text-2xl font-bold text-blue-600">{toArabicDigits(rented)}</p>
                    <p className="text-xs text-text-muted">مؤجرة</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{toArabicDigits(available)}</p>
                    <p className="text-xs text-text-muted">شاغرة</p>
                </div>
                <div className="bg-background border border-border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-600">{toArabicDigits(onHold)}</p>
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
                                {floorUnits.map(u => <UnitCard key={u.id} u={u} onEdit={() => { setEditingUnit(u); setIsUnitModalOpen(true); }} onDelete={async () => await dataService.remove('units', u.id)} />)}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {units.map(u => <UnitCard key={u.id} u={u} onEdit={() => { setEditingUnit(u); setIsUnitModalOpen(true); }} onDelete={async () => await dataService.remove('units', u.id)} />)}
                </div>
            )}
            {isUnitModalOpen && <UnitForm isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} unit={editingUnit} propertyId={property.id} />}
        </div>
    );
};

const UnitCard: React.FC<{ u: Unit; onEdit: () => void; onDelete: () => void }> = ({ u, onEdit, onDelete }) => {
    const st = UNIT_STATUS_MAP[u.status] || UNIT_STATUS_MAP.AVAILABLE;
    const featuresList: string[] = [];
    if (u.bedrooms) featuresList.push(`${u.bedrooms} غرف`);
    if (u.bathrooms) featuresList.push(`${u.bathrooms} حمام`);
    if (u.kitchens) featuresList.push(`${u.kitchens} مطبخ`);
    if (u.livingRooms) featuresList.push(`${u.livingRooms} صالة`);

    return (
        <div className="p-4 bg-background border border-border rounded-lg relative">
            <div className="absolute top-2 left-2"><ActionsMenu items={[EditAction(onEdit), DeleteAction(onDelete)]} /></div>
            <p className="font-bold mb-1">{u.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
            <p className="text-xs text-text-muted mt-1">{u.type}{u.area ? ` • ${u.area} م²` : ''}</p>
            {featuresList.length > 0 && <p className="text-xs text-text-muted mt-1">{featuresList.join(' • ')}</p>}
            <p className="text-sm font-bold mt-2 text-primary">{formatCurrency(u.rentDefault)}</p>
        </div>
    );
};

const PropertyForm: React.FC<{ isOpen: boolean, onClose: () => void, property: Property | null }> = ({ isOpen, onClose, property }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [name, setName] = useState(property?.name || '');
    const [ownerId, setOwnerId] = useState(property?.ownerId || db.owners[0]?.id || '');
    const [location, setLocation] = useState(property?.location || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = { name, ownerId, location, type: 'Building', notes: '' };
        if (property) await dataService.update('properties', property.id, data); else await dataService.add('properties', data as any);
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="بيانات العقار">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input placeholder="اسم العقار" value={name} onChange={e=>setName(e.target.value)} required />
                <select value={ownerId} onChange={e=>setOwnerId(e.target.value)}>{db.owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
                <input placeholder="الموقع" value={location} onChange={e=>setLocation(e.target.value)} />
                <button type="submit" className="btn btn-primary w-full">حفظ العقار</button>
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            name, type, floor, status, rentDefault: rent, area: area || undefined,
            bedrooms: bedrooms || undefined, bathrooms: bathrooms || undefined,
            kitchens: kitchens || undefined, livingRooms: livingRooms || undefined,
            waterMeter: waterMeter || undefined, electricityMeter: electricityMeter || undefined,
            features: features || undefined, notes, propertyId,
        };
        if (unit) await dataService.update('units', unit.id, data as any); else await dataService.add('units', data as any);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={unit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم/اسم الوحدة</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">نوع الوحدة</label>
                            <select value={type} onChange={e => setType(e.target.value)}>
                                {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الدور</label>
                            <select value={floor} onChange={e => setFloor(e.target.value)}>
                                <option value="">-- اختر الدور --</option>
                                {FLOOR_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحالة</label>
                            <select value={status} onChange={e => setStatus(e.target.value as Unit['status'])}>
                                <option value="AVAILABLE">شاغرة</option>
                                <option value="RENTED">مؤجرة</option>
                                <option value="MAINTENANCE">صيانة</option>
                                <option value="ON_HOLD">معلقة</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الإيجار الافتراضي</label>
                            <input type="number" value={rent} onChange={e => setRent(Number(e.target.value))} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">المساحة (م²)</label>
                            <input type="number" value={area} onChange={e => setArea(Number(e.target.value))} />
                        </div>
                    </div>

                    <h4 className="font-bold text-sm text-text-muted pt-2 border-t border-border">خصائص الوحدة</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">غرف النوم</label>
                            <input type="number" min="0" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الحمامات</label>
                            <input type="number" min="0" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">المطابخ</label>
                            <input type="number" min="0" value={kitchens} onChange={e => setKitchens(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الصالات</label>
                            <input type="number" min="0" value={livingRooms} onChange={e => setLivingRooms(Number(e.target.value))} />
                        </div>
                    </div>

                    <h4 className="font-bold text-sm text-text-muted pt-2 border-t border-border">العدادات</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم عداد المياه</label>
                            <input type="text" value={waterMeter} onChange={e => setWaterMeter(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">رقم عداد الكهرباء</label>
                            <input type="text" value={electricityMeter} onChange={e => setElectricityMeter(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">مميزات إضافية</label>
                        <input type="text" value={features} onChange={e => setFeatures(e.target.value)} placeholder="مثال: مكيف مركزي، موقف سيارة، بلكونة" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">ملاحظات</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ الوحدة</button>
                </div>
            </form>
        </Modal>
    );
};

export default Properties;
