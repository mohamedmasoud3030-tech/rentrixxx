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

const UnitsView: React.FC<{ property: Property, onBack: () => void }> = ({ property, onBack }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const units = db.units.filter(u => u.propertyId === property.id);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn btn-ghost"><ArrowRight/></button>
                    <h2 className="text-xl font-bold">وحدات: {property.name}</h2>
                </div>
                <button onClick={() => { setEditingUnit(null); setIsUnitModalOpen(true); }} className="btn btn-primary">إضافة وحدة</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {units.map(u => (
                    <div key={u.id} className="p-4 bg-background border border-border rounded-lg relative">
                        {/* FIX: Use dataService for data manipulation */}
                        <div className="absolute top-2 left-2"><ActionsMenu items={[ EditAction(()=> {setEditingUnit(u); setIsUnitModalOpen(true);}), DeleteAction(async ()=> await dataService.remove('units', u.id)) ]} /></div>
                        <p className="font-bold mb-1">{u.name}</p>
                        <p className="text-xs text-text-muted">{u.type}</p>
                        <p className="text-sm font-bold mt-2 text-primary">{formatCurrency(u.rentDefault)}</p>
                    </div>
                ))}
            </div>
            {isUnitModalOpen && <UnitForm isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} unit={editingUnit} propertyId={property.id} />}
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

const UnitForm: React.FC<{ isOpen: boolean, onClose: () => void, unit: Unit | null, propertyId: string }> = ({ isOpen, onClose, unit, propertyId }) => {
    // FIX: Use dataService for data manipulation
    const { dataService } = useApp();
    const [name, setName] = useState(unit?.name || '');
    const [rent, setRent] = useState(unit?.rentDefault || 0);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = { name, rentDefault: rent, propertyId, type: 'Apartment', status: 'AVAILABLE' as const, notes: '' };
        if (unit) await dataService.update('units', unit.id, data as any); else await dataService.add('units', data as any);
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="بيانات الوحدة">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input placeholder="رقم/اسم الوحدة" value={name} onChange={e=>setName(e.target.value)} required />
                <input type="number" placeholder="الإيجار الافتراضي" value={rent} onChange={e=>setRent(Number(e.target.value))} required />
                <button type="submit" className="btn btn-primary w-full">حفظ الوحدة</button>
            </form>
        </Modal>
    );
};

export default Properties;
