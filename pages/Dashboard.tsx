import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { tafneeta } from '../utils/numberToArabic';
import { formatCurrency } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbEngine } from '../services/db';
// FIX: Import types for explicit type annotation
import { Contract, Tenant, Unit, Receipt } from '../types';

const QuickSearch = () => {
    const [query, setQuery] = useState("");
    const navigate = useNavigate();
    
    const contracts = useLiveQuery(() => dbEngine.contracts.toArray()) || [];
    const tenants = useLiveQuery(() => dbEngine.tenants.toArray()) || [];
    const units = useLiveQuery(() => dbEngine.units.toArray()) || [];

    const results = useMemo(() => {
        if (query.length < 2) return [];
        const lowerQuery = query.toLowerCase();

        const searchableContracts = contracts.map(c => {
            const tenant = tenants.find(t => t.id === c.tenantId);
            const unit = units.find(u => u.id === c.unitId);
            return {
                ...c,
                tenantName: tenant?.name || '',
                unitName: unit?.name || ''
            };
        });

        return searchableContracts.filter(c =>
            c.tenantName.toLowerCase().includes(lowerQuery) ||
            c.unitName.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);
    }, [query, contracts, tenants, units]);

    const handleSelect = (contractId: string) => {
        setQuery("");
        navigate(`/contracts?contractId=${contractId}`);
    };

    return (
        <div className="relative max-w-lg mx-auto">
            <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                <input
                    type="text"
                    placeholder="ابحث عن مستأجر، أو وحدة..."
                    className="w-full p-3 pr-12 text-base rounded-full border-2 border-border focus:border-primary focus:ring-primary transition-all shadow-sm"
                    onChange={(e) => setQuery(e.target.value)}
                    value={query}
                />
            </div>
            {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    {results.map(r => (
                        <div key={r.id} onClick={() => handleSelect(r.id)} className="p-3 hover:bg-background cursor-pointer border-b border-border last:border-b-0 flex justify-between items-center text-sm">
                            <span className="font-bold">🏠 وحدة: {r.unitName}</span>
                            <span className="text-text-muted">{r.tenantName}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const Dashboard: React.FC = () => {
    const { settings } = useApp();
    const navigate = useNavigate();

    const contracts = useLiveQuery(() => dbEngine.contracts.toArray()) || [];
    const receipts = useLiveQuery(() => dbEngine.receipts.toArray()) || [];
    const expenses = useLiveQuery(() => dbEngine.expenses.toArray()) || [];
    const units = useLiveQuery(() => dbEngine.units.toArray()) || [];

    // إحصائيات سريعة
    const stats = useMemo(() => {
        const totalCollected = receipts.filter(r => r.status === 'POSTED').reduce((s, r) => s + r.amount, 0);
        const officeExpenses = expenses.filter(e => e.status === 'POSTED' && (e.chargedTo === 'OFFICE' || !e.contractId)).reduce((s, e) => s + e.amount, 0);

        return {
            totalCollected,
            officeExpenses,
            activeContracts: contracts.filter((c: any) => c.status === 'ACTIVE').length || 0,
            expiringSoon: contracts.filter((c: any) => {
                const diff = new Date(c.end).getTime() - Date.now();
                const alertDays = settings.operational.contractAlertDays || 30;
                return c.status === 'ACTIVE' && diff > 0 && diff < (alertDays * 24 * 60 * 60 * 1000);
            }).length || 0
        };
    }, [contracts, receipts, expenses, settings.operational.contractAlertDays]);

    const latestReceiptsData = useLiveQuery(async () => {
        const latest = await dbEngine.receipts.orderBy('dateTime').reverse().limit(5).toArray();
        const contractIds = latest.map(r => r.contractId);
        const contracts = await dbEngine.contracts.where('id').anyOf(contractIds).toArray();
        const tenantIds = contracts.map(c => c.tenantId);
        const tenants = await dbEngine.tenants.where('id').anyOf(tenantIds).toArray();
        
        // FIX: Added explicit types to Map to resolve type inference issues.
        const tenantsMap = new Map<string, Tenant>(tenants.map(t => [t.id, t]));
        const contractsMap = new Map<string, Contract>(contracts.map(c => [c.id, c]));

        // FIX: Added explicit type for 'r' to prevent 'unknown' type errors.
        return latest.map((r: Receipt) => {
            const contract = contractsMap.get(r.contractId);
            const tenant = contract ? tenantsMap.get(contract.tenantId) : null;
            return {
                ...r,
                tenantName: tenant?.name || 'غير معروف'
            };
        });
    }, []) || [];


    return (
        <div className="space-y-8">
            {/* الترحيب والترويسة */}
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text">لوحة التحكم الذكية</h1>
                    <p className="text-text-muted mt-1">مرحباً بك في {settings?.general.company.name}</p>
                </div>
                <div className="p-2 bg-card rounded-lg shadow-sm border border-border">
                    <span className="text-text-muted text-sm">الحالة: </span>
                    <span className="text-green-600 font-bold text-sm">● متصل ومؤمن</span>
                </div>
            </header>

            <QuickSearch />

            {/* شبكة الـ KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* كارت إجمالي الدخل - سحر الألوان المندمجة */}
                <div className="bg-gradient-to-br from-blue-700 to-blue-500 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                    <p className="opacity-80 text-sm mb-2">إجمالي التحصيل المالي</p>
                    <h2 className="text-3xl font-bold mb-3" dir="ltr">{formatCurrency(stats.totalCollected, settings.operational.currency)}</h2>
                    <p className="text-xs bg-white/20 px-2 py-1 rounded-full inline-block">
                        {tafneeta(stats.totalCollected)}
                    </p>
                </div>
                
                {/* كارت الخزنة - لون ذهبي فخم */}
                 <div className="bg-gradient-to-br from-amber-600 to-yellow-400 p-6 rounded-2xl text-white shadow-lg shadow-yellow-500/20">
                    <div className="flex justify-between items-center">
                        <p className="opacity-80 text-sm">رصيد الخزنة الحالي</p>
                        <span className="text-2xl">💰</span>
                    </div>
                    <h2 className="text-3xl font-bold my-2" dir="ltr">
                        {formatCurrency(stats.totalCollected - stats.officeExpenses, settings.operational.currency)}
                    </h2>
                    <div className="text-xs bg-black/10 px-2 py-1 rounded-full">
                        جاهز للتوريد أو الصرف للملاك
                    </div>
                </div>

                {/* كارت العقود النشطة */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <p className="text-text-muted text-sm mb-2">العقود السارية</p>
                    <h2 className="text-3xl font-bold text-text">{stats.activeContracts} <span className="text-lg font-medium text-text-muted">عقد</span></h2>
                    <div className="mt-4 h-2 w-full bg-background rounded-full">
                        <div style={{ width: `${(stats.activeContracts/ (units.length||1)) * 100}%` }} className="h-full bg-green-500 rounded-full"></div>
                    </div>
                </div>

                {/* كارت التنبيهات - الأحمر الجذاب */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                     <p className="text-red-500 text-sm mb-2 font-semibold">تنبيهات المتابعة</p>
                    <h2 className="text-3xl font-bold text-text">{stats.expiringSoon} <span className="text-lg font-medium text-text-muted">عقود تنتهي قريباً</span></h2>
                    <button onClick={() => navigate('/contracts')} className="mt-4 border-none bg-none text-primary font-bold cursor-pointer p-0 hover:underline">عرض القائمة ←</button>
                </div>
            </div>

            {/* قسم الجداول المختصرة */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="mb-4 text-lg font-bold">آخر العمليات المالية</h3>
                <table className="w-full border-collapse text-right">
                    <thead>
                        <tr className="border-b-2 border-border text-text-muted text-sm">
                            <th className="py-3 font-semibold">رقم السند</th>
                            <th className="py-3 font-semibold">المستأجر</th>
                            <th className="py-3 font-semibold">المبلغ</th>
                            <th className="py-3 font-semibold">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {latestReceiptsData.map((r: any) => (
                            <tr key={r.id} className="border-b border-border last:border-0 text-sm">
                                <td className="py-3 font-mono">{r.no}</td>
                                <td className="py-3">{r.tenantName}</td>
                                <td className="py-3 font-bold" dir="ltr">{formatCurrency(r.amount, settings.operational.currency)}</td>
                                <td className="py-3">
                                    <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">مكتمل</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;