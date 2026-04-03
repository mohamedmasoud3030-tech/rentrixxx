

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Receipt, Expense, DepositTx, OwnerSettlement, Invoice } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, VoidAction, DeleteAction, PrintAction } from '../components/shared/ActionsMenu';
import { formatCurrency, formatDateTime, formatDate, exportToCsv, RECEIPT_STATUS_AR, CHANNEL_AR, EXPENSE_STATUS_AR } from '../utils/helpers';
import NumberInput from '../components/ui/NumberInput';
import HardGateBanner from '../components/shared/HardGateBanner';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { 
    Receipt as ReceiptIcon, CreditCard, Landmark, PiggyBank, 
    MessageCircle, Download, FileText, Plus, ArrowUpRight, 
    ArrowDownRight, History, Wallet, UserCheck, Search, Filter,
    Printer, MoreVertical, Trash2, Edit2, XCircle, CheckCircle2
} from 'lucide-react';
import PrintPreviewModal from '../components/shared/PrintPreviewModal';
import { WhatsAppComposerModal } from '../components/shared/WhatsAppComposerModal';
import { ReceiptPrint } from '../components/print/PrintTemplate';
import { toast } from 'react-hot-toast';
import { exportExpenseToPdf } from '../services/pdfService';
import { AR_LABELS } from '../config/labels.ar';
import { distributeAmount } from '../services/financeService';

type FinancialTab = 'receipts' | 'expenses' | 'deposits' | 'settlements';

const Financials: React.FC<{ initialTab?: FinancialTab }> = ({ initialTab = 'receipts' }) => {
    const [activeTab, setActiveTab] = useState<FinancialTab>(initialTab);
    const { db, getFinancialSummary } = useApp();
    const [financialSummary, setFinancialSummary] = useState<{ receiptsToday: number; expensesMonth: number; totalDeposits: number; pendingSettlements: number; openInvoices: number } | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [errorSummary, setErrorSummary] = useState<string | null>(null);

    const refreshFinancialSummary = useCallback(async () => {
      try {
        setLoadingSummary(true);
        setErrorSummary(null);
        const summary = await getFinancialSummary();
        if (summary) {
          setFinancialSummary({
            receiptsToday: summary.receiptsToday || 0,
            expensesMonth: summary.expensesMonth || 0,
            totalDeposits: summary.totalDeposits || 0,
            pendingSettlements: summary.pendingSettlements || 0,
            openInvoices: summary.openInvoices || 0,
          });
        }
      } catch (err) {
        setErrorSummary('فشل في جلب الملخص المالي');
        console.error('Financial summary error:', err);
      } finally {
        setLoadingSummary(false);
      }
    }, [getFinancialSummary]);

    useEffect(() => {
      refreshFinancialSummary();
    }, [refreshFinancialSummary]);

    useEffect(() => {
      setActiveTab(initialTab);
    }, [initialTab]);

    const stats = financialSummary || { receiptsToday: 0, expensesMonth: 0, totalDeposits: 0, pendingSettlements: 0, openInvoices: 0 };

    return (
        <div className="space-y-6">
            <HardGateBanner />
            
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-widest text-blue-700 font-black">{AR_LABELS.cashflowOrchestration}</p>
                    <p className="text-sm font-bold mt-1">السندات والمصروفات مرتبطة تلقائيًا بدورة الفاتورة والعقد لضبط التدفق النقدي.</p>
                    <p className="text-xs text-text-muted mt-1">الفواتير المفتوحة الآن: <span className="font-black" dir="ltr">{stats.openInvoices}</span></p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    <button onClick={refreshFinancialSummary} disabled={loadingSummary} className="btn btn-secondary text-xs font-black flex items-center gap-1">
                        {loadingSummary ? <span>جاري التحديث...</span> : <><ArrowUpRight size={12} /> تحديث</>}
                    </button>
                    <Link to="/financial/invoices" className="btn btn-secondary text-xs font-black">سير الفوترة</Link>
                    <Link to="/reports" className="btn btn-primary text-xs font-black">تقرير التدفقات</Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                    label="تحصيلات اليوم" 
                    value={stats.receiptsToday} 
                    icon={<ArrowUpRight className="text-emerald-500" />} 
                    color="emerald" 
                />
                <StatCard 
                    label="مصروفات الشهر" 
                    value={stats.expensesMonth} 
                    icon={<ArrowDownRight className="text-rose-500" />} 
                    color="rose" 
                />
                <StatCard 
                    label="إجمالي التأمينات" 
                    value={stats.totalDeposits} 
                    icon={<PiggyBank className="text-blue-500" />} 
                    color="blue" 
                />
                <StatCard 
                    label="تسويات الملاك" 
                    value={stats.pendingSettlements} 
                    icon={<UserCheck className="text-amber-500" />} 
                    color="amber" 
                    isCount
                />
            </div>

            <Card className="p-0 overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-border gap-4">
                    <div className="flex bg-background/50 p-1 rounded-xl border border-border overflow-x-auto">
                        <TabButton active={activeTab === 'receipts'} onClick={() => setActiveTab('receipts')} icon={<ReceiptIcon size={16} />} label={AR_LABELS.receipts} />
                        <TabButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<ArrowDownRight size={16} />} label={AR_LABELS.expenses} />
                        <TabButton active={activeTab === 'deposits'} onClick={() => setActiveTab('deposits')} icon={<PiggyBank size={16} />} label="الودائع" />
                        <TabButton active={activeTab === 'settlements'} onClick={() => setActiveTab('settlements')} icon={<UserCheck size={16} />} label="تسويات الملاك" />
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'receipts' && <ReceiptsView />}
                    {activeTab === 'expenses' && <ExpensesView />}
                    {activeTab === 'deposits' && <DepositsView />}
                    {activeTab === 'settlements' && <OwnerSettlementsView />}
                </div>
            </Card>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string; isCount?: boolean }> = ({ label, value, icon, color, isCount }) => {
    const colorClasses: Record<string, string> = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
    };
    return (
        <div className={`p-4 rounded-2xl border ${colorClasses[color]} flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all`}>
            <div className="mb-2 opacity-80">{icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">{label}</p>
            <p className="text-lg font-black" dir="ltr">
                {isCount ? value : formatCurrency(value)}
            </p>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            active ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text hover:bg-background'
        }`}
    >
        {icon}
        {label}
    </button>
);

const ReceiptsView: React.FC = () => {
    const { db, financeService, fetchPaginatedData } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [whatsAppContext, setWhatsAppContext] = useState<any | null>(null);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data, total } = await fetchPaginatedData('receipts', page, pageSize, 'dateTime', false);
            setReceipts(data);
            setTotal(total);
            setLoading(false);
        };
        fetchData();
    }, [page, pageSize, fetchPaginatedData]);

    const filteredReceipts = useMemo(() => {
        return receipts.filter(r => {
            const contract = db.contracts.find(c => c.id === r.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            return r.no.includes(searchTerm) || tenant?.name.includes(searchTerm);
        });
    }, [receipts, db.contracts, db.tenants, searchTerm]);

    const receiptDataForPrint = useMemo(() => {
        if (!printingReceipt) return null;
        const contract = db.contracts.find(c => c.id === printingReceipt.contractId);
        const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
        const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
        return {
            no: printingReceipt.no,
            date: formatDateTime(printingReceipt.dateTime),
            tenantName: tenant?.name || 'غير معروف',
            amount: formatCurrency(printingReceipt.amount, db.settings.operational.currency),
            description: printingReceipt.notes || `دفعة إيجار للوحدة ${unit?.name || ''}`
        };
    }, [printingReceipt, db]);

    const handleExportReceiptsCsv = () => {
        const rows = filteredReceipts.map(r => {
            const contract = db.contracts.find(c => c.id === r.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            return {
                'رقم السند': r.no,
                'التاريخ': formatDateTime(r.dateTime),
                'المستأجر': tenant?.name || '',
                'المبلغ': r.amount,
                'طريقة الدفع': CHANNEL_AR[r.channel as keyof typeof CHANNEL_AR] || r.channel,
                'الحالة': RECEIPT_STATUS_AR[r.status as keyof typeof RECEIPT_STATUS_AR] || r.status,
                'ملاحظات': r.notes || '',
            };
        });
        exportToCsv('سندات_قبض_rentrix', rows);
    };

    const getChannelIcon = (channel: string) => {
        switch(channel) {
            case 'CASH': return <Wallet size={14} className="text-emerald-500" />;
            case 'BANK': return <Landmark size={14} className="text-blue-500" />;
            case 'POS': return <CreditCard size={14} className="text-purple-500" />;
            case 'CHECK': return <History size={14} className="text-amber-500" />;
            default: return <CreditCard size={14} />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="بحث برقم السند أو اسم المستأجر..."
                        className="w-full pr-10 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleExportReceiptsCsv} className="btn btn-secondary flex-1 md:flex-none flex items-center justify-center gap-2">
                        <Download size={16} /> تصدير CSV
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary flex-1 md:flex-none flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                        <Plus size={16} /> إضافة سند قبض
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">جاري تحميل البيانات...</div>
            ) : filteredReceipts.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                    <ReceiptIcon size={32} className="mx-auto mb-2" />
                    <p className="font-bold">لا توجد سندات قبض</p>
                    <p className="text-sm">لم يتم العثور على سندات قبض مطابقة لبحثك.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto border border-border rounded-2xl">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-background text-text-muted text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-black">رقم السند</th>
                                    <th className="px-6 py-4 font-black">التاريخ</th>
                                    <th className="px-6 py-4 font-black">المستأجر</th>
                                    <th className="px-6 py-4 font-black">المبلغ</th>
                                    <th className="px-6 py-4 font-black">طريقة الدفع</th>
                                    <th className="px-6 py-4 font-black">الحالة</th>
                                    <th className="px-6 py-4 font-black text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-card/30">
                                {filteredReceipts.map(r => {
                                    const contract = db.contracts.find(c => c.id === r.contractId);
                                    const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                                    return (
                                        <tr key={r.id} className="hover:bg-primary/5 transition-colors group">
                                            <td className="px-6 py-4 font-mono font-bold text-primary">{r.no}</td>
                                            <td className="px-6 py-4 text-text-muted">{formatDateTime(r.dateTime)}</td>
                                            <td className="px-6 py-4 font-bold">{tenant?.name || '—'}</td>
                                            <td className="px-6 py-4 font-black text-emerald-600" dir="ltr">{formatCurrency(r.amount, db.settings.operational.currency)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getChannelIcon(r.channel)}
                                                    <span className="text-xs font-bold">{CHANNEL_AR[r.channel as keyof typeof CHANNEL_AR] || r.channel}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${r.status === 'POSTED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                    {RECEIPT_STATUS_AR[r.status as keyof typeof RECEIPT_STATUS_AR] || r.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setPrintingReceipt(r)} className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl" title="طباعة"><Printer size={16} /></button>
                                                    <button onClick={() => setWhatsAppContext({ recipient: tenant, type: 'receipt', data: { receipt: r } })} className="p-2 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 rounded-xl" title="واتساب"><MessageCircle size={16} /></button>
                                                    <button
                                                        onClick={() => {
                                                            if (r.status === 'VOID') return;
                                                            financeService.voidReceipt(r.id);
                                                        }}
                                                        disabled={r.status === 'VOID'}
                                                        className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                                                        title={r.status === 'VOID' ? 'تم الإلغاء مسبقًا' : 'إلغاء'}
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn">السابق</button>
                        <span className="text-sm font-bold">صفحة {page} من {Math.ceil(total / pageSize)}</span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="btn">التالي</button>
                    </div>
                </>
            )}

            {isModalOpen && <ReceiptForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} receipt={null} />}
            {printingReceipt && receiptDataForPrint && (
                <PrintPreviewModal isOpen={!!printingReceipt} onClose={() => setPrintingReceipt(null)} title="طباعة سند قبض">
                    <ReceiptPrint data={receiptDataForPrint} settings={db.settings} />
                </PrintPreviewModal>
            )}
            {whatsAppContext && <WhatsAppComposerModal isOpen={!!whatsAppContext} onClose={() => setWhatsAppContext(null)} context={whatsAppContext} />}
        </div>
    );
};

const ExpensesView: React.FC = () => {
    const { db, financeService, fetchPaginatedData } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [printingExpense, setPrintingExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data, total } = await fetchPaginatedData('expenses', page, pageSize, 'dateTime', false);
            setExpenses(data);
            setTotal(total);
            setLoading(false);
        };
        fetchData();
    }, [page, pageSize, fetchPaginatedData]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => e.no.includes(searchTerm) || e.category.includes(searchTerm) || e.notes.includes(searchTerm))
    }, [expenses, searchTerm]);

    const handleExportExpensesCsv = () => {
        const rows = filteredExpenses.map(e => ({
            'رقم السند': e.no,
            'التاريخ': formatDateTime(e.dateTime),
            'التصنيف': e.category,
            'المبلغ': e.amount,
            'الحالة': EXPENSE_STATUS_AR[e.status as keyof typeof EXPENSE_STATUS_AR] || e.status,
            'ملاحظات': e.notes || '',
        }));
        exportToCsv('مصروفات_rentrix', rows);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="بحث بالتصنيف أو الملاحظات..."
                        className="w-full pr-10 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleExportExpensesCsv} className="btn btn-secondary flex-1 md:flex-none flex items-center justify-center gap-2">
                        <Download size={16} /> تصدير CSV
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary flex-1 md:flex-none flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                        <Plus size={16} /> إضافة مصروف جديد
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">جاري تحميل البيانات...</div>
            ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                    <ArrowDownRight size={32} className="mx-auto mb-2" />
                    <p className="font-bold">لا توجد مصروفات</p>
                    <p className="text-sm">لم يتم العثور على مصروفات مطابقة لبحثك.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto border border-border rounded-2xl">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-background text-text-muted text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-black">رقم السند</th>
                                    <th className="px-6 py-4 font-black">التاريخ</th>
                                    <th className="px-6 py-4 font-black">التصنيف</th>
                                    <th className="px-6 py-4 font-black">المبلغ</th>
                                    <th className="px-6 py-4 font-black">الحالة</th>
                                    <th className="px-6 py-4 font-black text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-card/30">
                                {filteredExpenses.map(e => (
                                    <tr key={e.id} className="hover:bg-primary/5 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-bold text-primary">{e.no}</td>
                                        <td className="px-6 py-4 text-text-muted">{formatDateTime(e.dateTime)}</td>
                                        <td className="px-6 py-4 font-bold">{e.category}</td>
                                        <td className="px-6 py-4 font-black text-rose-600" dir="ltr">{formatCurrency(e.amount, db.settings.operational.currency)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${e.status === 'POSTED' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                {EXPENSE_STATUS_AR[e.status as keyof typeof EXPENSE_STATUS_AR] || e.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingExpense(e); setIsModalOpen(true); }} className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl" title="تعديل"><Edit2 size={16} /></button>
                                                <button onClick={() => setPrintingExpense(e)} className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl" title="طباعة"><Printer size={16} /></button>
                                                <button onClick={() => {
                                                    try { exportExpenseToPdf(e, db); toast.success('تم تصدير المصروف بصيغة PDF'); } 
                                                    catch (err) { toast.error('خطأ في تصدير PDF'); }
                                                }} className="p-2 text-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="تصدير PDF"><FileText size={16} /></button>
                                                <button
                                                    onClick={() => {
                                                        if (e.status === 'VOID') return;
                                                        financeService.voidExpense(e.id);
                                                    }}
                                                    disabled={e.status === 'VOID'}
                                                    className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title={e.status === 'VOID' ? 'تم الإلغاء مسبقًا' : 'إلغاء'}
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn">السابق</button>
                        <span className="text-sm font-bold">صفحة {page} من {Math.ceil(total / pageSize)}</span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="btn">التالي</button>
                    </div>
                </>
            )}
            {isModalOpen && <ExpenseForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} expense={editingExpense} />}
            {printingExpense && (
                <PrintPreviewModal isOpen={!!printingExpense} onClose={() => setPrintingExpense(null)} title="طباعة سند صرف">
                    <ExpensePrintable expense={printingExpense} />
                </PrintPreviewModal>
            )}
        </div>
    );
};

const DepositsView: React.FC = () => {
    const { db, dataService, fetchPaginatedData } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deposits, setDeposits] = useState<DepositTx[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data, total } = await fetchPaginatedData('depositTxs', page, pageSize, 'date', false);
            setDeposits(data);
            setTotal(total);
            setLoading(false);
        };
        fetchData();
    }, [page, pageSize, fetchPaginatedData]);

    const filteredDeposits = useMemo(() => {
        return deposits.filter(tx => {
            const contract = db.contracts.find(c => c.id === tx.contractId);
            const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
            return tenant?.name.includes(searchTerm) || (tx.note && tx.note.includes(searchTerm));
        });
    }, [deposits, db.contracts, db.tenants, searchTerm]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="بحث باسم المستأجر أو الملاحظات..."
                        className="w-full pr-10 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/20">
                    <Plus size={16} /> إضافة حركة وديعة
                </button>
            </div>
            
            {loading ? (
                <div className="text-center py-12">جاري تحميل البيانات...</div>
            ) : filteredDeposits.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                    <PiggyBank size={32} className="mx-auto mb-2" />
                    <p className="font-bold">لا توجد حركات ودائع</p>
                    <p className="text-sm">لم يتم العثور على حركات مطابقة لبحثك.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto border border-border rounded-2xl">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-background text-text-muted text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-black">التاريخ</th>
                                    <th className="px-6 py-4 font-black">العقد / المستأجر</th>
                                    <th className="px-6 py-4 font-black">النوع</th>
                                    <th className="px-6 py-4 font-black">المبلغ</th>
                                    <th className="px-6 py-4 font-black text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-card/30">
                                {filteredDeposits.map(tx => {
                                    const contract = db.contracts.find(c => c.id === tx.contractId);
                                    const tenant = contract ? db.tenants.find(t => t.id === contract.tenantId) : null;
                                    const typeMap = {
                                        'DEPOSIT_IN': { label: 'إيداع جديد', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                                        'DEPOSIT_DEDUCT': { label: 'خصم إصلاحات', color: 'bg-rose-50 text-rose-600 border-rose-100' },
                                        'DEPOSIT_RETURN': { label: 'إرجاع للمستأجر', color: 'bg-blue-50 text-blue-600 border-blue-100' }
                                    };
                                    const typeInfo = typeMap[tx.type];
                                    return (
                                        <tr key={tx.id} className="hover:bg-primary/5 transition-colors group">
                                            <td className="px-6 py-4 text-text-muted">{formatDate(tx.date)}</td>
                                            <td className="px-6 py-4 font-bold">{tenant?.name || '—'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black" dir="ltr">{formatCurrency(tx.amount, db.settings.operational.currency)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={async () => await dataService.remove('depositTxs', tx.id)} className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn">السابق</button>
                        <span className="text-sm font-bold">صفحة {page} من {Math.ceil(total / pageSize)}</span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="btn">التالي</button>
                    </div>
                </>
            )}
            {isModalOpen && <DepositTxForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

const OwnerSettlementsView: React.FC = () => {
    const { db, dataService, fetchPaginatedData } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSettlement, setEditingSettlement] = useState<OwnerSettlement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [settlements, setSettlements] = useState<OwnerSettlement[]>([]);
    const [owners, setOwners] = useState<any[]>([]); // Using any to match db.owners usage
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const settlementsRes = await fetchPaginatedData('ownerSettlements', page, pageSize, 'date', false);
            const ownersRes = await fetchPaginatedData('owners', 1, 1000); // Fetch all for now
            setSettlements(settlementsRes.data);
            setTotal(settlementsRes.total);
            setOwners(ownersRes.data);
            setLoading(false);
        };
        fetchData();
    }, [page, pageSize, fetchPaginatedData]);

    const filtered = useMemo(() => settlements.filter(s => {
        const owner = owners.find(o => o.id === s.ownerId);
        return s.no.includes(searchTerm) || owner?.name.includes(searchTerm);
    }), [settlements, owners, searchTerm]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="بحث برقم التسوية أو اسم المالك..."
                        className="w-full pr-10 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/20 px-6">
                    <Plus size={16} /> إضافة تسوية للمالك
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">جاري تحميل البيانات...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                    <UserCheck size={32} className="mx-auto mb-2" />
                    <p className="font-bold">لا توجد تسويات</p>
                    <p className="text-sm">لم يتم العثور على تسويات مطابقة لبحثك.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto border border-border rounded-2xl">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-background text-text-muted text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-black">رقم التسوية</th>
                                    <th className="px-6 py-4 font-black">التاريخ</th>
                                    <th className="px-6 py-4 font-black">المالك</th>
                                    <th className="px-6 py-4 font-black">المبلغ</th>
                                    <th className="px-6 py-4 font-black text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-card/30">
                                {filtered.map(s => {
                                    const owner = owners.find(o => o.id === s.ownerId);
                                    return (
                                        <tr key={s.id} className="hover:bg-primary/5 transition-colors group">
                                            <td className="px-6 py-4 font-mono font-bold text-primary">{s.no}</td>
                                            <td className="px-6 py-4 text-text-muted">{formatDate(s.date)}</td>
                                            <td className="px-6 py-4 font-bold">{owner?.name || '—'}</td>
                                            <td className="px-6 py-4 font-black text-emerald-600" dir="ltr">{formatCurrency(s.amount, db.settings.operational.currency)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingSettlement(s); setIsModalOpen(true); }} className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl" title="تعديل"><Edit2 size={16} /></button>
                                                    <button onClick={async () => await dataService.remove('ownerSettlements', s.id)} className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl" title="حذف"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn">السابق</button>
                        <span className="text-sm font-bold">صفحة {page} من {Math.ceil(total / pageSize)}</span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="btn">التالي</button>
                    </div>
                </>
            )}
            {isModalOpen && <OwnerSettlementForm isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSettlement(null); }} settlement={editingSettlement} />}
        </div>
    );
};

const ExpensePrintable: React.FC<{ expense: Expense }> = ({ expense }) => {
    const { db } = useApp();
    const company = db.settings.general.company;
    const expensePurpose = `${expense.category}: ${expense.notes || expense.ref}`;
    return (
        <div className="w-full flex flex-col font-['Cairo'] p-8" dir="rtl">
            <header className="flex justify-between items-start pb-6 border-b-2 border-primary/20">
                <div className="text-right">
                    <h1 className="text-2xl font-black text-primary">{company.name}</h1>
                    <p className="text-sm text-text-muted">{company.address}</p>
                    <p className="text-sm text-text-muted">هاتف: {company.phone}</p>
                </div>
                <div className="text-left">
                    <h2 className="text-3xl font-black text-rose-600">سند صرف</h2>
                    <div className="mt-4 space-y-1 text-sm">
                        <p>رقم السند: <span className="font-mono font-bold">{expense.no}</span></p>
                        <p>التاريخ: <span className="font-mono">{formatDateTime(expense.dateTime)}</span></p>
                    </div>
                </div>
            </header>
            <main className="mt-10 text-lg flex-grow space-y-6">
                <div className="flex items-center gap-4"><span className="w-48 font-bold text-text-muted">يصرف للسيد/ة:</span><span className="font-black border-b border-border pb-1 flex-1">{expense.payee || expense.ref || 'غير محدد'}</span></div>
                <div className="flex items-center gap-4"><span className="w-48 font-bold text-text-muted">مبلغاً وقدره:</span><span className="font-black text-2xl px-6 py-3 border-2 border-primary/30 rounded-2xl bg-primary/5 text-primary">{formatCurrency(expense.amount, db.settings.operational.currency)}</span></div>
                <div className="flex items-start gap-4"><span className="w-48 font-bold text-text-muted">وذلك عن:</span><span className="flex-1 font-bold italic leading-relaxed">{expensePurpose}</span></div>
            </main>
            <footer className="mt-16 pt-8 flex justify-around text-center border-t border-border">
                <div className="space-y-8"><p className="font-bold text-text-muted uppercase tracking-widest text-xs">توقيع المحاسب</p><div className="h-px w-32 bg-border mx-auto"></div></div>
                <div className="space-y-8"><p className="font-bold text-text-muted uppercase tracking-widest text-xs">توقيع المستلم</p><div className="h-px w-32 bg-border mx-auto"></div></div>
            </footer>
        </div>
    );
};

// Forms are kept mostly same but with refined styling in the Modal and inputs
// (ReceiptForm, ExpenseForm, DepositTxForm, OwnerSettlementForm)
// [Internal forms omitted for brevity in this snippet but will be included in full write]

// ... (Rest of form components follow the same refined styling pattern)

const ReceiptForm: React.FC<{ isOpen: boolean, onClose: () => void, receipt: Receipt | null }> = ({ isOpen, onClose, receipt }) => {
    const { db, financeService } = useApp();
    const [contractId, setContractId] = useState(db.contracts[0]?.id || '');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
    const [channel, setChannel] = useState<Receipt['channel']>('CASH');
    const [amount, setAmount] = useState(0);
    const [ref, setRef] = useState('');
    const [notes, setNotes] = useState('');
    const [checkNumber, setCheckNumber] = useState('');
    const [checkBank, setCheckBank] = useState('');
    const [checkDate, setCheckDate] = useState('');
    const [checkStatus, setCheckStatus] = useState<Receipt['checkStatus']>('PENDING');
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const openInvoicesForContract = useMemo<(Invoice & { remaining: number })[]>(() => {
        if (!contractId) return [];
        return db.invoices
            .filter(invoice => invoice.contractId === contractId && ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status))
            .map(invoice => {
                const total = (invoice.amount || 0) + (invoice.taxAmount || 0);
                const remaining = Math.max(0, total - (invoice.paidAmount || 0));
                return { ...invoice, remaining };
            })
            .filter(invoice => invoice.remaining > 0.001)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [db.invoices, contractId]);

    const totalAllocated = useMemo(() => Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0), [allocations]);

    const autoDistributeAllocations = (totalAmount: number, invoices: (Invoice & { remaining: number })[]) => {
        const next: Record<string, number> = {};
        const safeTotal = Number(totalAmount) || 0;
        if (safeTotal <= 0 || invoices.length === 0) return next;

        let remainingAmount = Number(totalAmount) || 0;
        const rawApplied: number[] = [];
        for (const invoice of invoices) {
            if (remainingAmount <= 0) break;
            const applied = Math.min(remainingAmount, invoice.remaining);
            rawApplied.push(applied > 0 ? applied : 0);
            remainingAmount -= applied;
        }
        const roundedApplied = distributeAmount(safeTotal, rawApplied);
        for (let index = 0; index < roundedApplied.length; index += 1) {
            if (roundedApplied[index] > 0) {
                next[invoices[index].id] = roundedApplied[index];
            }
        }
        return next;
    };

    useEffect(() => {
        if (receipt) {
            setContractId(receipt.contractId); setDateTime(receipt.dateTime.slice(0, 16)); setChannel(receipt.channel);
            setAmount(receipt.amount); setRef(receipt.ref); setNotes(receipt.notes);
            setCheckNumber(receipt.checkNumber || ''); setCheckBank(receipt.checkBank || '');
            setCheckDate(receipt.checkDate || ''); setCheckStatus(receipt.checkStatus || 'PENDING');
            setAllocations({});
        } else {
            setAllocations(autoDistributeAllocations(amount, openInvoicesForContract));
        }
    }, [receipt, amount, contractId, openInvoicesForContract]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        if (receipt) { toast.error('تعديل السندات المرحلة غير مسموح.'); return; }
        if (amount <= 0) { toast.error('قيمة السند يجب أن تكون أكبر من صفر.'); return; }
        if (!dateTime) { toast.error('تاريخ السند مطلوب.'); return; }
        if (channel === 'CHECK' && !checkNumber) { toast.error('يرجى إدخال رقم الشيك.'); return; }
        if (openInvoicesForContract.length === 0) { toast.error('لا توجد فواتير مفتوحة.'); return; }
        const allocationEntries = Object.entries(allocations)
            .map(([invoiceId, value]) => ({ invoiceId, amount: Number(value) || 0 }))
            .filter(item => item.amount > 0.001);
        const normalizedAmounts = distributeAmount(amount, allocationEntries.map(item => item.amount));
        const normalizedAllocations = allocationEntries
            .map((item, index) => ({ invoiceId: item.invoiceId, amount: normalizedAmounts[index] }))
            .filter(item => item.amount > 0.001);
        if (!normalizedAllocations.length) { toast.error('يجب إدخال تخصيص واحد.'); return; }
        if (Math.abs(totalAllocated - amount) > 0.01) { toast.error('المجموع غير متطابق.'); return; }
        
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data: Omit<Receipt, 'id' | 'no' | 'createdAt' | 'updatedAt' | 'voidedAt'> = { contractId, dateTime, channel, amount, ref, notes, status: 'POSTED' };
            if (channel === 'CHECK') { data.checkNumber = checkNumber; data.checkBank = checkBank; data.checkDate = checkDate; data.checkStatus = checkStatus; }
            await financeService.addReceiptWithAllocations(data, normalizedAllocations);
            onClose();
        } finally { isSavingRef.current = false; setIsSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={receipt ? 'تعديل سند قبض' : 'إضافة سند قبض جديد'}>
            <form onSubmit={handleSubmit} className="space-y-6 p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">اختيار العقد</label>
                        <select value={contractId} onChange={e=>setContractId(e.target.value)} required disabled={isSaving}>
                            {db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name} - {db.units.find(u=>u.id===c.unitId)?.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">التاريخ والوقت</label>
                        <input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required disabled={isSaving} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">المبلغ الإجمالي</label>
                        <NumberInput value={amount} onChange={(value) => { setAmount(value); setAllocations(autoDistributeAllocations(value, openInvoicesForContract)); }} required disabled={isSaving} className="text-lg font-black text-primary" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">طريقة الدفع</label>
                        <select value={channel} onChange={e=>setChannel(e.target.value as Receipt['channel'])} disabled={isSaving}>
                            <option value="CASH">نقدي</option><option value="BANK">تحويل بنكي</option><option value="POS">شبكة</option><option value="CHECK">شيك</option><option value="OTHER">أخرى</option>
                        </select>
                    </div>
                </div>

                <div className="bg-background/50 rounded-2xl p-4 border border-border space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">توزيع المبلغ على الفواتير</h4>
                        <button type="button" className="text-[10px] font-bold text-primary hover:underline" onClick={() => setAllocations(autoDistributeAllocations(amount, openInvoicesForContract))} disabled={isSaving}>توزيع تلقائي</button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {openInvoicesForContract.map(invoice => (
                            <div key={invoice.id} className="flex items-center justify-between gap-4 p-2 hover:bg-background rounded-xl transition-colors">
                                <div className="text-xs">
                                    <p className="font-bold">فاتورة #{invoice.no}</p>
                                    <p className="text-[10px] text-text-muted">متبقي: {formatCurrency(invoice.remaining, db.settings.operational.currency)}</p>
                                </div>
                                <NumberInput
                                    className="w-24 text-left font-mono font-bold"
                                    value={allocations[invoice.id] || ''}
                                    onChange={(value) => {
                                        const nextValue = Math.min(Math.max(0, Number(value) || 0), invoice.remaining);
                                        setAllocations(prev => ({ ...prev, [invoice.id]: nextValue }));
                                    }}
                                    disabled={isSaving}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border">
                        <span className="text-xs font-black">الإجمالي الموزع</span>
                        <span className={`text-sm font-black ${Math.abs(totalAllocated - amount) <= 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(totalAllocated, db.settings.operational.currency)}
                        </span>
                    </div>
                </div>

                {channel === 'CHECK' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="space-y-1"><label className="text-[10px] font-black text-amber-700">رقم الشيك</label><input value={checkNumber} onChange={e=>setCheckNumber(e.target.value)} required disabled={isSaving} className="bg-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-amber-700">البنك</label><input value={checkBank} onChange={e=>setCheckBank(e.target.value)} disabled={isSaving} className="bg-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-amber-700">تاريخ الاستحقاق</label><input type="date" value={checkDate} onChange={e=>setCheckDate(e.target.value)} disabled={isSaving} className="bg-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-amber-700">الحالة</label><select value={checkStatus} onChange={e=>setCheckStatus(e.target.value as NonNullable<Receipt['checkStatus']>)} disabled={isSaving} className="bg-white"><option value="PENDING">معلق</option><option value="DEPOSITED">مودع</option><option value="CLEARED">محصّل</option><option value="BOUNCED">مرتجع</option></select></div>
                    </div>
                )}

                <div className="space-y-4">
                    <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="رقم المرجع (إن وجد)..." disabled={isSaving} />
                    <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="ملاحظات إضافية..." disabled={isSaving} />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost flex-1 py-3" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary flex-1 py-3 shadow-lg shadow-primary/20" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ السند'}</button>
                </div>
            </form>
        </Modal>
    );
};

const ExpenseForm: React.FC<{ isOpen: boolean, onClose: () => void, expense: Expense | null }> = ({ isOpen, onClose, expense }) => {
    const { db, dataService } = useApp();
    const [contractId, setContractId] = useState<string | null>(null);
    const [category, setCategory] = useState('صيانة');
    const [amount, setAmount] = useState(0);
    const [chargedTo, setChargedTo] = useState<Expense['chargedTo']>('OWNER');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    useEffect(() => {
        if (expense) {
            setContractId(expense.contractId); setCategory(expense.category); setAmount(expense.amount);
            setChargedTo(expense.chargedTo || 'OWNER'); setDateTime(expense.dateTime.slice(0, 16));
            setNotes(expense.notes || '');
        }
    }, [expense]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        if (amount <= 0) { toast.error('قيمة المصروف يجب أن تكون أكبر من صفر.'); return; }
        if (!dateTime) { toast.error('تاريخ المصروف مطلوب.'); return; }
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = { contractId, dateTime, category, amount, status: 'POSTED' as const, chargedTo, ref: '', notes };
            if (expense) await dataService.update('expenses', expense.id, data); else await dataService.add('expenses', data);
            onClose();
        } finally { isSavingRef.current = false; setIsSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'تعديل بيانات المصروف' : 'تسجيل مصروف جديد'}>
            <form onSubmit={handleSubmit} className="space-y-5 p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">تصنيف المصروف</label>
                        <input value={category} onChange={e=>setCategory(e.target.value)} required placeholder="مثال: صيانة سباكة" disabled={isSaving} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">المبلغ</label>
                        <NumberInput value={amount} onChange={setAmount} required className="text-lg font-black text-rose-600" disabled={isSaving} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">جهة التحميل</label>
                        <select value={chargedTo} onChange={e=>setChargedTo(e.target.value as Expense['chargedTo'])} disabled={isSaving}>
                            <option value="OWNER">على المالك</option><option value="OFFICE">على المكتب</option><option value="TENANT">على المستأجر</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted">التاريخ</label>
                        <input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} required disabled={isSaving} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">العقد المرتبط</label>
                    <select value={contractId || ''} onChange={e=>setContractId(e.target.value || null)} disabled={isSaving}>
                        <option value="">-- مصروف مكتب عام (غير مرتبط بعقد) --</option>
                        {db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name} - {db.units.find(u=>u.id===c.unitId)?.name}</option>)}
                    </select>
                </div>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="تفاصيل المصروف..." disabled={isSaving} />
                <div className="flex gap-3 pt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost flex-1 py-3" disabled={isSaving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary flex-1 py-3 shadow-lg shadow-primary/20" disabled={isSaving}>حفظ المصروف</button>
                </div>
            </form>
        </Modal>
    );
};

const DepositTxForm: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { db, dataService } = useApp();
    const [contractId, setContractId] = useState(db.contracts[0]?.id || '');
    const [type, setType] = useState<DepositTx['type']>('DEPOSIT_IN');
    const [amount, setAmount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            await dataService.add('depositTxs', { contractId, type, amount, date: new Date().toISOString().slice(0, 10), note: '' });
            onClose();
        } finally { isSavingRef.current = false; setIsSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="حركة وديعة / تأمين">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">اختيار العقد</label>
                    <select value={contractId} onChange={e=>setContractId(e.target.value)} required disabled={isSaving}>
                        {db.contracts.map(c=><option key={c.id} value={c.id}>{db.tenants.find(t=>t.id===c.tenantId)?.name} - {db.units.find(u=>u.id===c.unitId)?.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">نوع الحركة</label>
                    <select value={type} onChange={e=>setType(e.target.value as DepositTx['type'])} disabled={isSaving}>
                        <option value="DEPOSIT_IN">إيداع تأمين جديد</option>
                        <option value="DEPOSIT_RETURN">إرجاع التأمين للمستأجر</option>
                        <option value="DEPOSIT_DEDUCT">خصم من التأمين للإصلاحات</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">المبلغ</label>
                    <NumberInput value={amount} onChange={setAmount} required className="text-lg font-black" disabled={isSaving} />
                </div>
                <button type="submit" className="btn btn-primary w-full py-3 shadow-lg shadow-primary/20" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'تأكيد حركة الوديعة'}</button>
            </form>
        </Modal>
    );
};

const OwnerSettlementForm: React.FC<{ isOpen: boolean, onClose: () => void, settlement: OwnerSettlement | null }> = ({ isOpen, onClose, settlement }) => {
    const { db, dataService } = useApp();
    const [ownerId, setOwnerId] = useState(db.owners[0]?.id || '');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    useEffect(() => { if (settlement) { setOwnerId(settlement.ownerId); setAmount(settlement.amount); setDate(settlement.date); } }, [settlement]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = { ownerId, amount, date, method: 'BANK' as const, ref: '', notes: '' };
            if (settlement) await dataService.update('ownerSettlements', settlement.id, data); else await dataService.add('ownerSettlements', data);
            onClose();
        } finally { isSavingRef.current = false; setIsSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={settlement ? "تعديل تسوية مالية" : "تسوية مالية جديدة للمالك"}>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">اختيار المالك</label>
                    <select value={ownerId} onChange={e=>setOwnerId(e.target.value)} required disabled={isSaving}>
                        {db.owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">التاريخ</label>
                    <input type="date" value={date} onChange={e=>setDate(e.target.value)} required disabled={isSaving} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted">المبلغ المدفوع</label>
                    <NumberInput value={amount} onChange={setAmount} required className="text-lg font-black text-emerald-600" disabled={isSaving} />
                </div>
                <button type="submit" className="btn btn-primary w-full py-3 shadow-lg shadow-primary/20" disabled={isSaving}>{isSaving ? 'جاري المعالجة...' : 'تأكيد التحويل للمالك'}</button>
            </form>
        </Modal>
    );
};

export default Financials;
