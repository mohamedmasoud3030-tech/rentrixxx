import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Unit } from '../../types';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { Link, useNavigate } from 'react-router-dom';
import { Building, AlertCircle, Clock, Home, User, FileText, Wrench, Phone } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/helpers';

type UnitStatus = 'vacant' | 'occupied' | 'expiring' | 'overdue';

// FIX: Changed interface to extend from Omit<Unit, 'status'> to correctly override the status property.
interface UnitWithDetails extends Omit<Unit, 'status'> {
    status: UnitStatus;
    contractId?: string;
    tenantName?: string;
    tenantPhone?: string;
    contractEnd?: string;
    balance?: number;
}

const PropertyMap: React.FC = () => {
    const { db, contractBalances, settings } = useApp();
    const [filter, setFilter] = useState<UnitStatus | 'all'>('all');
    const [selectedUnit, setSelectedUnit] = useState<UnitWithDetails | null>(null);

    const propertiesWithUnits = useMemo(() => {
        if (!db) return [];
        const unitsWithDetails: UnitWithDetails[] = db.units.map(unit => {
            const activeContract = db.contracts.find(c => c.unitId === unit.id && c.status === 'ACTIVE');
            if (!activeContract) {
                return { ...unit, status: 'vacant' as UnitStatus };
            }

            const contractData = contractBalances[activeContract.id];
            const tenant = db.tenants.find(t => t.id === activeContract.tenantId);
            const alertDate = new Date();
            alertDate.setDate(alertDate.getDate() + (settings.operational?.contractAlertDays ?? 30));
            const isExpiring = new Date(activeContract.end) <= alertDate;

            let status: UnitStatus = 'occupied';
            if (contractData?.balance > 0) status = 'overdue';
            else if (isExpiring) status = 'expiring';

            return {
                ...unit,
                status,
                contractId: activeContract.id,
                tenantName: tenant?.name,
                tenantPhone: tenant?.phone,
                contractEnd: activeContract.end,
                balance: contractData?.balance,
            };
        });

        return db.properties.map(prop => ({
            ...prop,
            units: unitsWithDetails.filter(u => u.propertyId === prop.id),
        })).sort((a,b) => a.name.localeCompare(b.name));

    }, [db, contractBalances, settings.operational?.contractAlertDays ?? 30]);
    
    const filteredProperties = useMemo(() => {
        if (filter === 'all') return propertiesWithUnits;
        return propertiesWithUnits.map(prop => ({
            ...prop,
            units: prop.units.filter(u => u.status === filter),
        })).filter(prop => prop.units.length > 0);
    }, [propertiesWithUnits, filter]);

    const statusFilters: { key: UnitStatus | 'all', label: string, color: string }[] = [
        { key: 'all', label: 'الكل', color: 'bg-gray-500' },
        { key: 'vacant', label: 'شاغرة', color: 'bg-blue-500' },
        { key: 'overdue', label: 'متأخرة', color: 'bg-red-500' },
        { key: 'expiring', label: 'ينتهي قريباً', color: 'bg-yellow-500' },
        { key: 'occupied', label: 'مؤجرة', color: 'bg-green-500' },
    ];
    
    if (!db) return null;

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold">خارطة العقارات</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        {statusFilters.map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1 text-sm rounded-full flex items-center gap-2 ${filter === f.key ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-background' : ''}`}>
                                <span className={`w-3 h-3 rounded-full ${f.color}`}></span>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {filteredProperties.map(prop => (
                <Card key={prop.id}>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Building size={20}/> {prop.name}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {prop.units.map(unit => <UnitCard key={unit.id} unit={unit} onClick={() => setSelectedUnit(unit)} />)}
                    </div>
                </Card>
            ))}

            {selectedUnit && <UnitDetailModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} />}
        </div>
    );
};

const UnitCard: React.FC<{ unit: UnitWithDetails, onClick: () => void }> = ({ unit, onClick }) => {
    const statusClasses: Record<UnitStatus, string> = {
        vacant: 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 text-blue-800 dark:text-blue-300',
        occupied: 'bg-green-100 dark:bg-green-900/50 border-green-400 text-green-800 dark:text-green-300',
        expiring: 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-400 text-yellow-800 dark:text-yellow-300',
        overdue: 'bg-red-100 dark:bg-red-900/50 border-red-400 text-red-800 dark:text-red-300',
    };
    
    const Icon = unit.status === 'overdue' ? AlertCircle : unit.status === 'expiring' ? Clock : Home;

    return (
        <button onClick={onClick} className={`p-3 rounded-lg border-l-4 text-right transition-transform hover:scale-105 ${statusClasses[unit.status]}`}>
            <div className="flex justify-between items-center">
                <p className="font-bold text-sm truncate">{unit.name}</p>
                <Icon size={16} />
            </div>
            <p className="text-xs mt-1 truncate">{unit.tenantName || 'شاغرة'}</p>
        </button>
    );
};

const UnitDetailModal: React.FC<{ unit: UnitWithDetails, onClose: () => void }> = ({ unit, onClose }) => {
    const navigate = useNavigate();

    const handleNavigate = (path: string) => {
        onClose();
        navigate(path);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`تفاصيل الوحدة: ${unit.name}`}>
            <div className="space-y-4">
                {unit.status === 'vacant' ? (
                     <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md text-center">
                        <Home size={32} className="mx-auto text-blue-500 mb-2" />
                        <p className="font-bold text-blue-800 dark:text-blue-300">الوحدة شاغرة</p>
                    </div>
                ) : (
                    <div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2"><User size={16} className="text-text-muted"/><span>المستأجر:</span><strong className="text-text">{unit.tenantName}</strong></div>
                            <div className="flex items-center gap-2"><Phone size={16} className="text-text-muted"/><span>الهاتف:</span><strong className="text-text">{unit.tenantPhone}</strong></div>
                            <div className="flex items-center gap-2"><Clock size={16} className="text-text-muted"/><span>انتهاء العقد:</span><strong>{formatDate(unit.contractEnd!)}</strong></div>
                            <div className="flex items-center gap-2"><AlertCircle size={16} className="text-text-muted"/><span>الرصيد المستحق:</span><strong className="text-red-500">{formatCurrency(unit.balance || 0, 'OMR')}</strong></div>
                        </div>
                    </div>
                )}
                 <div className="flex justify-center gap-3 pt-4 border-t border-border">
                    {unit.contractId && (
                        <button onClick={() => handleNavigate('/contracts')} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white">
                            <FileText size={16} /> عرض العقد
                        </button>
                    )}
                     <button onClick={() => handleNavigate('/finance/maintenance')} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border">
                        <Wrench size={16} /> إضافة صيانة
                    </button>
                </div>
            </div>
        </Modal>
    );
};


export default PropertyMap;