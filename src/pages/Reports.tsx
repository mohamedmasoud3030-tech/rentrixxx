
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Printer, FileText, BarChart3, TrendingUp, Wallet, TrendingDown, Users, PieChart, ChevronsRight, ArrowUp, ArrowDown, Banknote, Percent } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { exportRentRollToPdf, exportOwnerLedgerToPdf, exportTenantStatementToPdf, exportIncomeStatementToPdf, exportTrialBalanceToPdf, exportBalanceSheetToPdf, exportAgedReceivablesToPdf } from '../services/pdfService';
import { calculateBalanceSheetData, calculateIncomeStatementData, calculateAgedReceivables } from '../services/accountingService';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

type ReportTab = 'rent_roll' | 'owner' | 'tenant' | 'income_statement' | 'balance_sheet' | 'trial_balance' | 'aged_receivables';

const ReportCard: React.FC<{title: string, subtitle: string, icon: React.ReactNode, onClick: () => void}> = ({ title, subtitle, icon, onClick }) => (
    <div onClick={onClick} className="bg-card border border-border rounded-lg p-5 text-center flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:shadow-lg transition-all">
        <div className="bg-primary/10 text-primary p-3 rounded-full mb-3">{icon}</div>
        <h3 className="font-bold text-text">{title}</h3>
        <p className="text-xs text-text-muted mt-1">{subtitle}</p>
    </div>
);

const KpiDisplayCard: React.FC<{ title: string; value: string; icon: React.ReactNode; colorClass: string; }> = ({ title, value, icon, colorClass }) => (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm flex items-start gap-4">
        <div className={`p-3 rounded-full ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-text-muted">{title}</p>
            <p className="text-2xl font-bold text-text" dir="ltr">{value}</p>
        </div>
    </div>
);


const Reports: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { db, contractBalances, ownerBalances } = useApp();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    
    const [activeTab, setActiveTab] = useState<ReportTab | null>(queryParams.get('tab') as ReportTab | null);
    
    // --- State for KPI date filtering ---
    const [dateRange, setDateRange] = useState({ 
        start: startOfMonth(new Date()), 
        end: endOfMonth(new Date()) 
    });
    const [rangeLabel, setRangeLabel] = useState('هذا الشهر');

    const setRange = (label: 'هذا الشهر' | 'الشهر الماضي' | 'هذا العام') => {
        const now = new Date();
        let start, end;
        switch (label) {
            case 'هذا الشهر':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'الشهر الماضي':
                const lastMonth = subMonths(now, 1);
                start = startOfMonth(lastMonth);
                end = endOfMonth(lastMonth);
                break;
            case 'هذا العام':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
        }
        setDateRange({ start, end });
        setRangeLabel(label);
    };

    const kpiData = useMemo(() => {
        if (!db) return null;
        
        // Financial KPIs based on date range
        const revenue = db.receipts
            .filter(r => r.status === 'POSTED' && isWithinInterval(new Date(r.dateTime), dateRange))
            .reduce((sum, r) => sum + r.amount, 0);

        const expenses = db.expenses
            .filter(e => e.status === 'POSTED' && (e.chargedTo === 'OFFICE' || e.chargedTo === 'OWNER') && isWithinInterval(new Date(e.dateTime), dateRange))
            .reduce((sum, e) => sum + e.amount, 0);

        const netIncome = revenue - expenses;

        // Overall Operational KPIs (not date-range dependent)
        const activeContracts = db.contracts.filter(c => c.status === 'ACTIVE').length;
        const totalUnits = db.units.length;
        const occupancyRate = totalUnits > 0 ? (activeContracts / totalUnits) * 100 : 0;

        const totalReceivables = Object.values(contractBalances).reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);
        const totalOwnerPayables = Object.values(ownerBalances).reduce((sum, b) => sum + (b.net > 0 ? b.net : 0), 0);

        return {
            revenue,
            expenses,
            netIncome,
            occupancyRate,
            totalReceivables,
            totalOwnerPayables,
        };
    }, [db, dateRange, contractBalances, ownerBalances]);

    const handleCardClick = (tab: ReportTab) => {
        setActiveTab(tab);
        navigate(`/reports?tab=${tab}`);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'rent_roll': return <RentRoll />;
            case 'owner': return <OwnerLedger />;
            case 'tenant': return <TenantStatement />;
            case 'income_statement': return <IncomeStatement />;
            case 'balance_sheet': return <BalanceSheet />;
            case 'trial_balance': return <TrialBalance />;
            case 'aged_receivables': return <AgedReceivables />;
            default: return null;
        }
    };
    
    if (!kpiData) return null;

    return (
        <div className="space-y-6">
            {!activeTab ? (
                <>
                    <Card>
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h2 className="text-xl font-bold">مؤشرات الأداء الرئيسية (KPIs)</h2>
                            <div className="flex items-center gap-2 p-1 bg-background rounded-md border border-border">
                                {['هذا الشهر', 'الشهر الماضي', 'هذا العام'].map((label) => (
                                    <button key={label} onClick={() => setRange(label as any)} className={`px-3 py-1 text-sm rounded ${rangeLabel === label ? 'bg-primary text-white shadow' : 'text-text-muted hover:bg-border/50'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <KpiDisplayCard title={`إجمالي الإيرادات (${rangeLabel})`} value={formatCurrency(kpiData.revenue)} icon={<ArrowUp size={24} />} colorClass="bg-green-100 dark:bg-green-900/50 text-green-600" />
                            <KpiDisplayCard title={`إجمالي المصروفات (${rangeLabel})`} value={formatCurrency(kpiData.expenses)} icon={<ArrowDown size={24} />} colorClass="bg-red-100 dark:bg-red-900/50 text-red-600" />
                            <KpiDisplayCard title={`صافي الدخل (${rangeLabel})`} value={formatCurrency(kpiData.netIncome)} icon={<Banknote size={24} />} colorClass="bg-blue-100 dark:bg-blue-900/50 text-blue-600" />
                            <KpiDisplayCard title="نسبة الإشغال الحالية" value={`${kpiData.occupancyRate.toFixed(1)} %`} icon={<Percent size={24} />} colorClass="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" />
                            <KpiDisplayCard title="إجمالي الذمم المدينة" value={formatCurrency(kpiData.totalReceivables)} icon={<Users size={24} />} colorClass="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600" />
                            <KpiDisplayCard title="إجمالي مستحقات الملاك" value={formatCurrency(kpiData.totalOwnerPayables)} icon={<Wallet size={24} />} colorClass="bg-purple-100 dark:bg-purple-900/50 text-purple-600" />
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">التقارير التفصيلية</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <ReportCard title="التقارير المالية" subtitle="قائمة الدخل، الميزانية، ميزان المراجعة" icon={<BarChart3 />} onClick={() => handleCardClick('income_statement')} />
                            <ReportCard title="كشوفات الحساب" subtitle="للملاك والمستأجرين" icon={<Users />} onClick={() => handleCardClick('owner')} />
                            <ReportCard title="تحليل الذمم" subtitle="تقارير أعمار الديون والمتأخرات" icon={<TrendingDown />} onClick={() => handleCardClick('aged_receivables')} />
                            <ReportCard title="تقارير تشغيلية" subtitle="قائمة الإيجارات الحالية (Rent Roll)" icon={<PieChart />} onClick={() => handleCardClick('rent_roll')} />
                        </div>
                    </div>
                </>
            ) : (
                <Card>
                    <button onClick={() => { setActiveTab(null); navigate('/reports'); }} className="btn btn-ghost mb-4">← العودة إلى قائمة التقارير</button>
                    {renderContent()}
                </Card>
            )}
        </div>
    );
};

// ... (rest of the report components: RentRoll, TrialBalance, etc. remain the same) ...

const ReportPrintableContent: React.FC<{title: string, date: string, children: React.ReactNode}> = ({title, date, children}) => {
    const { settings } = useApp();
    // FIX: Corrected path to company settings
    const { company } = settings.general;
    return (
        <div>
            <div className="text-center mb-6">
                 <h1 className="text-xl font-bold">{company.name}</h1>
                <p className="text-xs text-text-muted">{company.address} - هاتف: {company.phone}</p>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">{title}</h2>
            <p className="text-center text-sm text-text-muted mb-6">{date}</p>
            {children}
        </div>
    );
};


const RentRoll: React.FC = () => {
    const { db, contractBalances, settings } = useApp();
    const [isPrinting, setIsPrinting] = useState(false);

    const rentRollData = useMemo(() => {
        const unitsWithDetails = db.units.map(unit => {
            const property = db.properties.find(p => p.id === unit.propertyId);
            const activeContract = db.contracts.find(c => c.unitId === unit.id && c.status === 'ACTIVE');
            
            if (activeContract) {
                const tenant = db.tenants.find(t => t.id === activeContract.tenantId);
                const contractBalance = contractBalances[activeContract.id];
                return {
                    property: property?.name || '-', unit: unit.name, tenant: tenant?.name || '-',
                    startDate: activeContract.start, endDate: activeContract.end, rent: activeContract.rent,
                    deposit: activeContract.deposit, balance: contractBalance?.balance || 0, status: 'مؤجرة'
                };
            } else {
                return {
                    property: property?.name || '-', unit: unit.name, tenant: '-', startDate: '-',
                    endDate: '-', rent: unit.rentDefault, deposit: 0, balance: 0, status: 'شاغرة'
                };
            }
        });

        const totals = unitsWithDetails.reduce((acc, item) => {
            if(item.status === 'مؤجرة') { acc.totalRent += item.rent; acc.totalBalance += item.balance; }
            return acc;
        }, { totalRent: 0, totalBalance: 0 });

        return { units: unitsWithDetails.sort((a,b) => `${a.property}-${a.unit}`.localeCompare(`${b.property}-${b.unit}`)), totals };
    }, [db, contractBalances]);

    const handleExportPdf = () => { exportRentRollToPdf(rentRollData.units, rentRollData.totals, settings); };

    const reportContent = (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse border border-border">
                <thead className="text-xs uppercase bg-background text-text">
                    <tr>
                        <th className="px-2 py-3 border border-border">العقار</th><th className="px-2 py-3 border border-border">الوحدة</th>
                        <th className="px-2 py-3 border border-border">الحالة</th><th className="px-2 py-3 border border-border">المستأجر</th>
                        <th className="px-2 py-3 border border-border">بدء العقد</th><th className="px-2 py-3 border border-border">انتهاء العقد</th>
                        <th className="px-2 py-3 border border-border">الإيجار</th><th className="px-2 py-3 border border-border">التأمين</th>
                        <th className="px-2 py-3 border border-border">الرصيد المستحق</th>
                    </tr>
                </thead>
                <tbody>
                    {rentRollData.units.map((item, i) => (
                        <tr key={i} className="bg-card">
                            <td className="px-2 py-4 border border-border">{item.property}</td><td className="px-2 py-4 border border-border">{item.unit}</td>
                            <td className="px-2 py-4 border border-border">{item.status}</td><td className="px-2 py-4 border border-border">{item.tenant}</td>
                            <td className="px-2 py-4 border border-border">{item.startDate !== '-' ? formatDate(item.startDate) : '-'}</td>
                            <td className="px-2 py-4 border border-border">{item.endDate !== '-' ? formatDate(item.endDate) : '-'}</td>
                            {/* FIX: Corrected path to currency settings */}
                            <td className="px-2 py-4 border border-border">{formatCurrency(item.rent, settings.operational.currency)}</td>
                            {/* FIX: Corrected path to currency settings */}
                            <td className="px-2 py-4 border border-border">{formatCurrency(item.deposit, settings.operational.currency)}</td>
                            {/* FIX: Corrected path to currency settings */}
                            <td className={`px-2 py-4 font-bold border border-border ${item.balance > 0 ? 'text-red-500' : ''}`}>{formatCurrency(item.balance, settings.operational.currency)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold text-base bg-background text-text">
                        <td colSpan={6} className="px-2 py-4 text-left border border-border">الإجمالي (للوحدات المؤجرة)</td>
                        {/* FIX: Corrected path to currency settings */}
                        <td className="px-2 py-4 border border-border">{formatCurrency(rentRollData.totals.totalRent, settings.operational.currency)}</td>
                        <td className='border border-border'></td>
                        {/* FIX: Corrected path to currency settings */}
                        <td className="px-2 py-4 border border-border">{formatCurrency(rentRollData.totals.totalBalance, settings.operational.currency)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );

    return (
        <div>
             <h2 className="text-xl font-bold mb-4">قائمة الإيجارات (Rent Roll)</h2>
            <div className="mb-4 flex gap-4 items-end">
                <button onClick={() => setIsPrinting(true)} className="btn btn-primary flex items-center gap-2"><Printer size={16} /> طباعة</button>
                <button onClick={handleExportPdf} className="btn btn-secondary flex items-center gap-2"><FileText size={16} /> تصدير PDF</button>
            </div>
            <ReportPrintableContent title="تقرير قائمة الإيجارات (Rent Roll)" date={`تاريخ التقرير: ${formatDate(new Date().toISOString())}`}>
                {reportContent}
            </ReportPrintableContent>
            {isPrinting && (
                <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="معاينة طباعة قائمة الإيجارات">
                     <ReportPrintableContent title="تقرير قائمة الإيجارات (Rent Roll)" date={`تاريخ التقرير: ${formatDate(new Date().toISOString())}`}>{reportContent}</ReportPrintableContent>
                </PrintPreviewModal>
            )}
        </div>
    );
};

const TrialBalance: React.FC = () => {
    const { db, settings } = useApp();
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [isPrinting, setIsPrinting] = useState(false);

    const trialBalanceData = useMemo(() => {
        const end = new Date(endDate);
        const balances = new Map<string, { debit: number, credit: number }>();

        db.accounts.forEach(acc => balances.set(acc.id, { debit: 0, credit: 0 }));

        db.journalEntries.filter(je => new Date(je.date) <= end).forEach(je => {
            const balance = balances.get(je.accountId);
            if (balance) {
                if(je.type === 'DEBIT') balance.debit += je.amount;
                if(je.type === 'CREDIT') balance.credit += je.amount;
            }
        });

        const accountsMap = new Map(db.accounts.map(acc => [acc.id, acc]));
        let totalDebit = 0; let totalCredit = 0;

        const reportLines = Array.from(balances.entries()).map(([accountId, {debit, credit}]) => {
            const account = accountsMap.get(accountId)!;
            const balance = debit - credit;
            const finalDebit = balance > 0 ? balance : 0;
            const finalCredit = balance < 0 ? -balance : 0;
            totalDebit += finalDebit;
            totalCredit += finalCredit;
            return { no: account.no, name: account.name, debit: finalDebit, credit: finalCredit };
        }).filter(line => line.debit > 0 || line.credit > 0).sort((a,b) => a.no.localeCompare(b.no));

        return { lines: reportLines, totalDebit, totalCredit };
    }, [db.accounts, db.journalEntries, endDate]);
    
    const handleExportPdf = () => { exportTrialBalanceToPdf(trialBalanceData, settings, endDate); };

    const reportContent = (
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse border border-border">
                <thead className="text-xs uppercase bg-background text-text">
                    <tr>
                        <th className="px-6 py-3 border border-border">رقم الحساب</th><th className="px-6 py-3 border border-border">اسم الحساب</th>
                        <th className="px-6 py-3 border border-border">مدين</th><th className="px-6 py-3 border border-border">دائن</th>
                    </tr>
                </thead>
                <tbody>
                    {trialBalanceData.lines.map((line: { no: string; name: string; debit: number; credit: number; }) => (
                        <tr key={line.no} className="bg-card">
                            <td className="px-6 py-4 font-mono border border-border">{line.no}</td><td className="px-6 py-4 border border-border">{line.name}</td>
                            {/* FIX: Corrected path to currency settings */}
                            <td className="px-6 py-4 font-mono border border-border">{line.debit > 0 ? formatCurrency(line.debit, settings.operational.currency) : '-'}</td>
                            {/* FIX: Corrected path to currency settings */}
                            <td className="px-6 py-4 font-mono border border-border">{line.credit > 0 ? formatCurrency(line.credit, settings.operational.currency) : '-'}</td>
                        </tr>
                    ))}
                </tbody>
                    <tfoot>
                    <tr className="font-bold text-base bg-background text-text">
                        <td colSpan={2} className="px-6 py-4 text-left border border-border">الإجمالي</td>
                        {/* FIX: Corrected path to currency settings */}
                        <td className="px-6 py-4 font-mono border border-border">{formatCurrency(trialBalanceData.totalDebit, settings.operational.currency)}</td>
                        {/* FIX: Corrected path to currency settings */}
                        <td className="px-6 py-4 font-mono border border-border">{formatCurrency(trialBalanceData.totalCredit, settings.operational.currency)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
    
    return (
        <div>
             <h2 className="text-xl font-bold mb-4">ميزان المراجعة</h2>
            <div className="mb-4 flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">حتى تاريخ</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <button onClick={() => setIsPrinting(true)} className="btn btn-primary flex items-center gap-2"><Printer size={16} /> طباعة</button>
                <button onClick={handleExportPdf} className="btn btn-secondary flex items-center gap-2"><FileText size={16} /> تصدير PDF</button>
            </div>
            <ReportPrintableContent title="ميزان المراجعة" date={`حتى تاريخ ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>
            {isPrinting && (
                <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="معاينة طباعة ميزان المراجعة">
                    <ReportPrintableContent title="ميزان المراجعة" date={`حتى تاريخ ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>
                </PrintPreviewModal>
            )}
        </div>
    );
};


const OwnerLedger: React.FC = () => {
    const { db, settings } = useApp(); const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const ownerIdFromUrl = queryParams.get('ownerId');
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>(ownerIdFromUrl || db.owners[0]?.id || '');
    const today = new Date(); const firstDayOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(firstDayOfYear);
    const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
    const [showCommission, setShowCommission] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    
    useEffect(() => { const ownerIdFromUrl = queryParams.get('ownerId'); if (ownerIdFromUrl) { setSelectedOwnerId(ownerIdFromUrl); } }, [location.search]);

    const ledgerData = useMemo(() => {
        if (!selectedOwnerId) return null; const owner = db.owners.find(o => o.id === selectedOwnerId); if (!owner) return null;
        const ownerProperties = db.properties.filter(p => p.ownerId === selectedOwnerId).map(p => p.id);
        const ownerUnits = db.units.filter(u => ownerProperties.includes(u.propertyId)).map(u => u.id);
        const ownerContracts = db.contracts.filter(c => ownerUnits.includes(c.unitId)).map(c => c.id);
        const start = new Date(startDate); const end = new Date(endDate);
        const transactions: any[] = [];
        db.receipts.forEach(r => {
            if (r.status === 'POSTED' && ownerContracts.includes(r.contractId) && new Date(r.dateTime) >= start && new Date(r.dateTime) <= end) {
                const officeShare = showCommission && owner.commissionType === 'RATE' ? r.amount * (owner.commissionValue / 100) : 0;
                transactions.push({ date: r.dateTime, details: `تحصيل من عقد ${r.no}`, type: 'receipt', gross: r.amount, officeShare: officeShare, net: r.amount - officeShare });
            }
        });
        db.expenses.forEach(e => {
            if (e.status === 'POSTED' && e.contractId && ownerContracts.includes(e.contractId) && e.chargedTo === 'OWNER' && new Date(e.dateTime) >= start && new Date(e.dateTime) <= end) {
                transactions.push({ date: e.dateTime, details: `مصروف صيانة ${e.no}`, type: 'expense', gross: -e.amount, officeShare: 0, net: -e.amount });
            }
        });
        db.ownerSettlements.forEach(s => {
            if (s.ownerId === selectedOwnerId && new Date(s.date) >= start && new Date(s.date) <= end) {
                transactions.push({ date: s.date, details: `تسوية مالية - دفعة #${s.no}`, type: 'settlement', gross: -s.amount, officeShare: 0, net: -s.amount });
            }
        });
        if (showCommission && owner.commissionType === 'FIXED_MONTHLY') {
            const commissionMonths = new Set<string>();
            transactions.filter(tx => tx.type === 'receipt').forEach(tx => commissionMonths.add(tx.date.slice(0, 7)));
            commissionMonths.forEach(month => {
                const lastDayOfMonth = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).toISOString();
                transactions.push({ date: lastDayOfMonth, details: `عمولة إدارة ثابتة لشهر ${month}`, type: 'expense', gross: 0, officeShare: owner.commissionValue, net: -owner.commissionValue });
            });
        }
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const totals = transactions.reduce((acc, tx) => { acc.gross += tx.gross; acc.officeShare += tx.officeShare; acc.net += tx.net; return acc; }, { gross: 0, officeShare: 0, net: 0 });
        return { transactions, totals };
    }, [selectedOwnerId, startDate, endDate, db, showCommission]);
    
    const handleExportPdf = () => {
        if (!ledgerData || !selectedOwnerId) return;
        const ownerName = db.owners.find(o => o.id === selectedOwnerId)?.name || '';
        const dateRange = `للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`;
        exportOwnerLedgerToPdf(ledgerData.transactions, ledgerData.totals, settings, ownerName, dateRange, showCommission);
    };
    const reportContent = ledgerData && (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse border border-border">
                <thead className="text-xs uppercase bg-background text-text"><tr><th className="px-6 py-3 border border-border">التاريخ</th><th className="px-6 py-3 border border-border">البيان</th><th className="px-6 py-3 border border-border">إجمالي المبلغ</th>{showCommission && <th className="px-6 py-3 border border-border">حصة المكتب</th>}<th className="px-6 py-3 border border-border">صافي المبلغ للمالك</th></tr></thead>
                {/* FIX: Corrected path to currency settings */}
                <tbody>{ledgerData.transactions.map((tx, i) => (<tr key={i} className="bg-card"><td className="px-6 py-4 border border-border">{formatDate(tx.date)}</td><td className="px-6 py-4 border border-border">{tx.details}</td><td className={`px-6 py-4 border border-border ${tx.gross >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(tx.gross, settings.operational.currency)}</td>{showCommission && <td className="px-6 py-4 text-red-600 border border-border">{tx.officeShare > 0 ? formatCurrency(-tx.officeShare, settings.operational.currency) : '-'}</td>}<td className="px-6 py-4 font-bold border border-border">{formatCurrency(tx.net, settings.operational.currency)}</td></tr>))}</tbody>
                {/* FIX: Corrected path to currency settings */}
                <tfoot><tr className="font-bold text-base bg-background text-text"><td colSpan={2} className="px-6 py-4 text-left border border-border">الرصيد الختامي للفترة</td><td className="px-6 py-4 border border-border">{formatCurrency(ledgerData.totals.gross, settings.operational.currency)}</td>{showCommission && <td className="px-6 py-4 border border-border">{formatCurrency(-ledgerData.totals.officeShare, settings.operational.currency)}</td>}<td className="px-6 py-4 border border-border">{formatCurrency(ledgerData.totals.net, settings.operational.currency)}</td></tr></tfoot>
            </table>
        </div>
    );
    return (
        <div>
             <h2 className="text-xl font-bold mb-4">كشف حساب المالك</h2>
            <div className="mb-6 flex flex-wrap gap-4 items-end">
                <div><label className="block text-sm font-medium mb-1">اختر المالك</label><select value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)}><option value="">-- اختر --</option>{db.owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">من تاريخ</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">إلى تاريخ</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                <div className="flex flex-col"><label className="block text-sm font-medium mb-1">عرض العمولة</label><div className="flex items-center gap-4"><label className="flex items-center gap-2"><input type="radio" name="commission" checked={!showCommission} onChange={() => setShowCommission(false)} /> قبل الخصم</label><label className="flex items-center gap-2"><input type="radio" name="commission" checked={showCommission} onChange={() => setShowCommission(true)} /> بعد الخصم</label></div></div>
                <button onClick={() => setIsPrinting(true)} className="btn btn-primary flex items-center gap-2"><Printer size={16} /> طباعة</button>
                <button onClick={handleExportPdf} className="btn btn-secondary flex items-center gap-2"><FileText size={16} /> تصدير PDF</button>
            </div>
            {reportContent && (<ReportPrintableContent title={`كشف حساب المالك: ${db.owners.find(o => o.id === selectedOwnerId)?.name}`} date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)} - ${showCommission ? 'بعد خصم عمولة المكتب' : 'قبل خصم عمولة المكتب'}`}>{reportContent}</ReportPrintableContent>)}
            {isPrinting && reportContent && (<PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="معاينة طباعة كشف حساب المالك"><ReportPrintableContent title={`كشف حساب المالك: ${db.owners.find(o => o.id === selectedOwnerId)?.name}`} date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)} - ${showCommission ? 'بعد خصم عمولة المكتب' : 'قبل خصم عمولة المكتب'}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>)}
        </div>
    );
};

const TenantStatement: React.FC = () => {
    const { db, settings, contractBalances } = useApp();
    const [selectedContractId, setSelectedContractId] = useState<string>(db.contracts[0]?.id || '');
    const [isPrinting, setIsPrinting] = useState(false);
    const statementData = useMemo(() => {
        if (!selectedContractId) return null; const contract = db.contracts.find(c => c.id === selectedContractId); if (!contract) return null;
        const tenant = db.tenants.find(t => t.id === contract.tenantId); const unit = db.units.find(u => u.id === contract.unitId);
        const property = db.properties.find(p => p.id === unit?.propertyId);
        const invoices = db.invoices.filter(inv => inv.contractId === contract.id);
        const receipts = db.receipts.filter(r => r.contractId === contract.id && r.status === 'POSTED');
        let transactions: { date: string, description: string, debit: number, credit: number }[] = [];
        invoices.forEach(inv => { transactions.push({ date: inv.dueDate, description: inv.notes || `فاتورة رقم ${inv.no}`, debit: inv.amount, credit: 0 }); });
        const channelLabels: {[key: string]: string} = { 'CASH': 'نقدي', 'BANK': 'تحويل بنكي', 'POS': 'شبكة', 'OTHER': 'أخرى' };
        receipts.forEach(r => { transactions.push({ date: r.dateTime, description: `دفعة (${channelLabels[r.channel] || r.channel}) - سند رقم ${r.no}`, debit: 0, credit: r.amount }); });
        transactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let balance = 0; const statement = transactions.map(tx => { balance += tx.debit - tx.credit; return { ...tx, balance }; });
        const finalBalance = contractBalances[contract.id]?.balance || 0;
        return { contract, tenant, unit, property, statement, finalBalance };
    }, [selectedContractId, db, contractBalances]);
    const handleExportPdf = () => { if (!statementData) return; exportTenantStatementToPdf(statementData, settings); };
    const reportContent = statementData && (
        <div>
            <div className="grid grid-cols-2 gap-4 text-sm p-4 border rounded-md border-border mb-6">
                <div><strong>المستأجر:</strong> {statementData.tenant?.name}</div><div><strong>العقار:</strong> {statementData.property?.name}</div>
                <div><strong>الهاتف:</strong> {statementData.tenant?.phone}</div><div><strong>الوحدة:</strong> {statementData.unit?.name}</div>
            </div>
            {/* FIX: Corrected path to currency settings */}
            <div className="overflow-x-auto"><table className="w-full text-sm text-right border-collapse border border-border"><thead className="text-xs uppercase bg-background text-text"><tr><th scope="col" className="px-6 py-3 border border-border">التاريخ</th><th scope="col" className="px-6 py-3 border border-border">البيان</th><th scope="col" className="px-6 py-3 border border-border">مدين</th><th scope="col" className="px-6 py-3 border border-border">دائن</th><th scope="col" className="px-6 py-3 border border-border">الرصيد</th></tr></thead><tbody>{statementData.statement.map((tx, i) => (<tr key={i} className="bg-card"><td className="px-6 py-4 border border-border">{formatDate(tx.date)}</td><td className="px-6 py-4 border border-border">{tx.description}</td><td className="px-6 py-4 text-red-500 border border-border">{tx.debit > 0 ? formatCurrency(tx.debit, db.settings.operational.currency) : '-'}</td><td className="px-6 py-4 text-green-500 border border-border">{tx.credit > 0 ? formatCurrency(tx.credit, db.settings.operational.currency) : '-'}</td><td className="px-6 py-4 font-bold border border-border">{formatCurrency(tx.balance, db.settings.operational.currency)}</td></tr>))}</tbody><tfoot><tr className="font-bold text-base bg-background text-text"><td colSpan={4} className="px-6 py-4 text-left border border-border">الرصيد النهائي المستحق</td><td className="px-6 py-4 border border-border">{formatCurrency(statementData.finalBalance, db.settings.operational.currency)}</td></tr></tfoot></table></div>
        </div>
    );
    return (
        <div>
             <h2 className="text-xl font-bold mb-4">كشف حساب المستأجر</h2>
            <div className="mb-4 flex gap-4 items-end">
                <div className="flex-grow"><label className="block text-sm font-medium mb-1">اختر العقد</label><select value={selectedContractId} onChange={(e) => setSelectedContractId(e.target.value)} className="w-full md:w-1/2"><option value="">-- اختر --</option>{db.contracts.map(c => { const t = db.tenants.find(t => t.id === c.tenantId); const u = db.units.find(u => u.id === c.unitId); return <option key={c.id} value={c.id}>{u?.name} / {t?.name} (يبدأ في {c.start})</option> })}</select></div>
                <button onClick={() => setIsPrinting(true)} className="btn btn-primary flex items-center gap-2"><Printer size={16} /> طباعة</button>
                <button onClick={handleExportPdf} className="btn btn-secondary flex items-center gap-2"><FileText size={16} /> تصدير PDF</button>
            </div>
            {reportContent && (<ReportPrintableContent title="كشف حساب مستأجر" date={`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`}>{reportContent}</ReportPrintableContent>)}
            {isPrinting && reportContent && (<PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="معاينة طباعة كشف حساب المستأجر"><ReportPrintableContent title="كشف حساب مستأجر" date={`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>)}
        </div>
    )
};

const IncomeStatement: React.FC = () => {
    const { db, settings } = useApp();
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(firstDayOfYear);
    const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
    const [isPrinting, setIsPrinting] = useState(false);

    const data = useMemo(() => calculateIncomeStatementData(db, startDate, endDate), [db, startDate, endDate]);
    
    const handleExportPdf = () => {
        const dateRange = `للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`;
        exportIncomeStatementToPdf(data, settings, dateRange);
    };
    
    const reportContent = (
         <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h3 className="text-lg font-bold border-b-2 border-primary pb-2 mb-3 flex items-center gap-2"><TrendingUp className="text-green-500" /> الإيرادات</h3>
                {data.revenues.map(item => (
                    <div key={item.no} className="flex justify-between text-sm py-1">
                        <span>{item.name}</span>
                        {/* FIX: Corrected path to currency settings */}
                        <span className="font-mono">{formatCurrency(item.balance, settings.operational.currency)}</span>
                    </div>
                ))}
                <div className="flex justify-between text-md font-bold pt-2 border-t mt-2">
                    <span>إجمالي الإيرادات</span>
                    {/* FIX: Corrected path to currency settings */}
                    <span>{formatCurrency(data.totalRevenue, settings.operational.currency)}</span>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-bold border-b-2 border-primary pb-2 mb-3 flex items-center gap-2"><TrendingDown className="text-red-500" /> المصروفات</h3>
                {data.expenses.map(item => (
                    <div key={item.no} className="flex justify-between text-sm py-1">
                        <span>{item.name}</span>
                        {/* FIX: Corrected path to currency settings */}
                        <span className="font-mono">({formatCurrency(item.balance, settings.operational.currency)})</span>
                    </div>
                ))}
                <div className="flex justify-between text-md font-bold pt-2 border-t mt-2">
                    <span>إجمالي المصروفات</span>
                    {/* FIX: Corrected path to currency settings */}
                    <span>({formatCurrency(data.totalExpense, settings.operational.currency)})</span>
                </div>
            </div>
            <div className={`p-4 rounded-md space-y-3 ${data.netIncome >= 0 ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
                <div className="flex justify-between text-lg font-black">
                    <span>صافي الربح / (الخسارة)</span>
                    {/* FIX: Corrected path to currency settings */}
                    <span>{formatCurrency(data.netIncome, settings.operational.currency)}</span>
                </div>
            </div>
        </div>
    );
    return (
        <div>
             <h2 className="text-xl font-bold mb-4">قائمة الدخل</h2>
            <div className="mb-6 flex flex-wrap gap-4 items-end">
                <div><label className="block text-sm font-medium mb-1">من تاريخ</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">إلى تاريخ</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                <button onClick={() => setIsPrinting(true)} className="btn btn-primary flex items-center gap-2"><Printer size={16} /> طباعة</button>
                <button onClick={handleExportPdf} className="btn btn-secondary flex items-center gap-2"><FileText size={16} /> تصدير PDF</button>
            </div>
            <ReportPrintableContent title="قائمة الدخل" date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent>
            {isPrinting && (<PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="معاينة طباعة قائمة الدخل"><ReportPrintableContent title="قائمة الدخل" date={`للفترة من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>)}
        </div>
    );
};

const BalanceSheet: React.FC = () => {
    const { db, settings } = useApp();
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
    const [isPrinting, setIsPrinting] = useState(false);
    
    const data = useMemo(() => calculateBalanceSheetData(db, asOfDate), [db, asOfDate]);

    const handleExportPdf = () => exportBalanceSheetToPdf(data, settings, asOfDate);

    const renderLines = (lines: any[], indent = 0) => (
        <>
            {lines.map(line => (
                <React.Fragment key={line.no}>
                    <tr className={line.isParent ? 'font-bold bg-background' : ''}>
                        <td className="p-2 border" style={{ paddingRight: `${1 + indent}rem` }}>{line.name}</td>
                        {/* FIX: Corrected path to currency settings */}
                        <td className="p-2 border font-mono">{line.balance > 0 ? formatCurrency(line.balance, settings.operational.currency) : '-'}</td>
                    </tr>
                    {line.children && renderLines(line.children, indent + 1.5)}
                </React.Fragment>
            ))}
        </>
    );
    
    const reportContent = (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Wallet/> الأصول</h3>
                <table className="w-full text-sm border-collapse border">
                    <tbody>{renderLines(data.assets)}</tbody>
                    {/* FIX: Corrected path to currency settings */}
                    <tfoot><tr className="font-black text-base bg-blue-100 dark:bg-blue-900"><td className="p-2 border">إجمالي الأصول</td><td className="p-2 border font-mono">{formatCurrency(data.totalAssets, settings.operational.currency)}</td></tr></tfoot>
                </table>
            </div>
            <div>
                 <h3 className="text-lg font-bold mb-2">الالتزامات وحقوق الملكية</h3>
                 <table className="w-full text-sm border-collapse border">
                    <tbody>
                        {renderLines(data.liabilities)}
                        {/* FIX: Corrected path to currency settings */}
                        <tr className="font-bold bg-background"><td className="p-2 border">إجمالي الالتزامات</td><td className="p-2 border font-mono">{formatCurrency(data.totalLiabilities, settings.operational.currency)}</td></tr>
                        {renderLines(data.equity)}
                        {/* FIX: Corrected path to currency settings */}
                        <tr className="font-bold bg-background"><td className="p-2 border">إجمالي حقوق الملكية</td><td className="p-2 border font-mono">{formatCurrency(data.totalEquity, settings.operational.currency)}</td></tr>
                    </tbody>
                    {/* FIX: Corrected path to currency settings */}
                    <tfoot><tr className="font-black text-base bg-blue-100 dark:bg-blue-900"><td className="p-2 border">إجمالي الالتزامات وحقوق الملكية</td><td className="p-2 border font-mono">{formatCurrency(data.totalLiabilities + data.totalEquity, settings.operational.currency)}</td></tr></tfoot>
                </table>
            </div>
        </div>
    );
    
    return (
        <div>
             <h2 className="text-xl font-bold mb-4">الميزانية العمومية</h2>
            <div className="mb-6 flex flex-wrap gap-4 items-end">
                <div><label className="block text-sm font-medium mb-1">حتى تاريخ</label><input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} /></div>
                <button onClick={() => setIsPrinting(true)} className="btn btn-primary flex items-center gap-2"><Printer size={16} /> طباعة</button>
                <button onClick={handleExportPdf} className="btn btn-secondary flex items-center gap-2"><FileText size={16} /> تصدير PDF</button>
            </div>
            <ReportPrintableContent title="الميزانية العمومية" date={`كما في تاريخ ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent>
             {isPrinting && (<PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="معاينة طباعة الميزانية العمومية"><ReportPrintableContent title="الميزانية العمومية" date={`كما في تاريخ ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent></PrintPreviewModal>)}
        </div>
    );
};

const AgedReceivables: React.FC = () => {
    const { db, settings } = useApp();
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
    const [isPrinting, setIsPrinting] = useState(false);

    const data = useMemo(() => calculateAgedReceivables(db, asOfDate), [db, asOfDate]);

    const handleExportPdf = () => {
        exportAgedReceivablesToPdf(data, settings, asOfDate);
    };
    
    const reportContent = (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse border border-border">
                <thead className="text-xs uppercase bg-background text-text">
                    <tr>
                        <th className="px-4 py-3 border">المستأجر</th>
                        <th className="px-4 py-3 border">الإجمالي المستحق</th>
                        <th className="px-4 py-3 border">حالي</th>
                        <th className="px-4 py-3 border">1-30 يوم</th>
                        <th className="px-4 py-3 border">31-60 يوم</th>
                        <th className="px-4 py-3 border">61-90 يوم</th>
                        <th className="px-4 py-3 border">+90 يوم</th>
                    </tr>
                </thead>
                <tbody>
                    {data.lines.map((line, index) => (
                        <tr key={index} className="bg-card hover:bg-background">
                            <td className="px-4 py-2 border font-bold">{line.tenantName}</td>
                            {/* FIX: Corrected path to currency settings */}
                            <td className="px-4 py-2 border font-mono font-bold">{formatCurrency(line.total, settings.operational.currency)}</td>
                            <td className="px-4 py-2 border font-mono">{line.current > 0 ? formatCurrency(line.current, settings.operational.currency) : '-'}</td>
                            <td className="px-4 py-2 border font-mono">{line['1-30'] > 0 ? formatCurrency(line['1-30'], settings.operational.currency) : '-'}</td>
                            <td className="px-4 py-2 border font-mono">{line['31-60'] > 0 ? formatCurrency(line['31-60'], settings.operational.currency) : '-'}</td>
                            <td className="px-4 py-2 border font-mono">{line['61-90'] > 0 ? formatCurrency(line['61-90'], settings.operational.currency) : '-'}</td>
                            <td className="px-4 py-2 border font-mono">{line['90+'] > 0 ? formatCurrency(line['90+'], settings.operational.currency) : '-'}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold text-base bg-background text-text">
                        <td className="px-4 py-3 border text-left">الإجمالي</td>
                        {/* FIX: Corrected path to currency settings */}
                        <td className="px-4 py-3 border font-mono">{formatCurrency(data.totals.total, settings.operational.currency)}</td>
                        <td className="px-4 py-3 border font-mono">{formatCurrency(data.totals.current, settings.operational.currency)}</td>
                        <td className="px-4 py-3 border font-mono">{formatCurrency(data.totals['1-30'], settings.operational.currency)}</td>
                        <td className="px-4 py-3 border font-mono">{formatCurrency(data.totals['31-60'], settings.operational.currency)}</td>
                        <td className="px-4 py-3 border font-mono">{formatCurrency(data.totals['61-90'], settings.operational.currency)}</td>
                        <td className="px-4 py-3 border font-mono">{formatCurrency(data.totals['90+'], settings.operational.currency)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );

    return (
        <div>
             <h2 className="text-xl font-bold mb-4">تقرير أعمار الذمم المدينة</h2>
            <div className="mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium mb-1">التقرير كما في تاريخ</label>
                    <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
                </div>
                <button onClick={() => setIsPrinting(true)} className="btn btn-primary flex items-center gap-2"><Printer size={16} /> طباعة</button>
                <button onClick={handleExportPdf} className="btn btn-secondary flex items-center gap-2"><FileText size={16} /> تصدير PDF</button>
            </div>
            <ReportPrintableContent title="تقرير أعمار الذمم المدينة" date={`كما في تاريخ ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent>
             {isPrinting && (
                <PrintPreviewModal isOpen={isPrinting} onClose={() => setIsPrinting(false)} title="معاينة طباعة تقرير أعمار الذمم">
                    <ReportPrintableContent title="تقرير أعمار الذمم المدينة" date={`كما في تاريخ ${formatDate(asOfDate)}`}>{reportContent}</ReportPrintableContent>
                </PrintPreviewModal>
            )}
        </div>
    );
};


export default Reports;
