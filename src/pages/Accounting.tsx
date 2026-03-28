import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Account } from '../types';
import { formatCurrency } from '../utils/helpers';
import NumberInput from '../components/ui/NumberInput';
import { 
    PlusCircle, Trash2, Edit2, BookOpen, FilePen, Scale, 
    ChevronDown, PieChart, Wallet, TrendingUp, 
    TrendingDown, Calculator, Search, Download, CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type AccountingTab = 'chart' | 'voucher' | 'trial';

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    ASSET: { label: 'الأصول', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Wallet size={18} /> },
    LIABILITY: { label: 'الالتزامات', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Scale size={18} /> },
    EQUITY: { label: 'حقوق الملكية', color: 'text-purple-600 bg-purple-50 border-purple-100', icon: <PieChart size={18} /> },
    REVENUE: { label: 'الإيرادات', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <TrendingUp size={18} /> },
    EXPENSE: { label: 'المصروفات', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <TrendingDown size={18} /> },
};

const Accounting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AccountingTab>('chart');
    const { db } = useApp();

    const stats = useMemo(() => {
        const balances = db.accountBalances || [];
        const accounts = db.accounts || [];
        const totals = { assets: 0, liabilities: 0, equity: 0, revenue: 0, expense: 0 };
        
        balances.forEach(b => {
            const acc = accounts.find(a => a.id === b.accountId);
            if (!acc) return;
            if (acc.type === 'ASSET') totals.assets += b.balance;
            else if (acc.type === 'LIABILITY') totals.liabilities += Math.abs(b.balance);
            else if (acc.type === 'EQUITY') totals.equity += Math.abs(b.balance);
            else if (acc.type === 'REVENUE') totals.revenue += Math.abs(b.balance);
            else if (acc.type === 'EXPENSE') totals.expense += b.balance;
        });
        return totals;
    }, [db.accountBalances, db.accounts]);

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="إجمالي الأصول" value={stats.assets} icon={<Wallet />} color="blue" />
                <StatCard label="الالتزامات" value={stats.liabilities} icon={<Scale />} color="amber" />
                <StatCard label="حقوق الملكية" value={stats.equity} icon={<PieChart />} color="purple" />
                <StatCard label="الإيرادات" value={stats.revenue} icon={<TrendingUp />} color="emerald" />
                <StatCard label="المصروفات" value={stats.expense} icon={<TrendingDown />} color="rose" />
            </div>

            <Card className="p-0 overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-border gap-4">
                    <div className="flex bg-background/50 p-1 rounded-xl border border-border self-start">
                        <TabButton active={activeTab === 'chart'} onClick={() => setActiveTab('chart')} icon={<BookOpen size={16} />} label="دليل الحسابات" />
                        <TabButton active={activeTab === 'voucher'} onClick={() => setActiveTab('voucher')} icon={<FilePen size={16} />} label="قيد يدوي" />
                        <TabButton active={activeTab === 'trial'} onClick={() => setActiveTab('trial')} icon={<Calculator size={16} />} label="ميزان المراجعة" />
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'chart' && <ChartOfAccounts />}
                    {activeTab === 'voucher' && <ManualVoucher />}
                    {activeTab === 'trial' && <TrialBalance />}
                </div>
            </Card>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => {
    const colorClasses: Record<string, string> = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
    };
    return (
        <div className={`p-4 rounded-2xl border ${colorClasses[color]} flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all`}>
            <div className="mb-2 opacity-80">{icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">{label}</p>
            <p className="text-lg font-black" dir="ltr">{formatCurrency(value)}</p>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            active ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text hover:bg-background'
        }`}
    >
        {icon}
        {label}
    </button>
);

const ChartOfAccounts: React.FC = () => {
    const { db, dataService } = useApp();
    const accounts = db.accounts || [];
    const accountBalances = db.accountBalances || [];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']));

    const balanceMap = useMemo(() =>
        new Map(accountBalances.map(ab => [ab.accountId, ab.balance])),
        [accountBalances]
    );

    const filteredAccounts = useMemo(() => {
        if (!searchTerm) return accounts;
        return accounts.filter(a => 
            a.name.includes(searchTerm) || 
            a.no.includes(searchTerm)
        );
    }, [accounts, searchTerm]);

    const grouped = useMemo(() => {
        const types: Record<string, Account[]> = { ASSET: [], LIABILITY: [], EQUITY: [], REVENUE: [], EXPENSE: [] };
        filteredAccounts.forEach(acc => {
            if (types[acc.type]) types[acc.type].push(acc);
        });
        return types;
    }, [filteredAccounts]);

    const toggleType = (type: string) => {
        setExpandedTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type); else next.add(type);
            return next;
        });
    };

    const handleDelete = async (acc: Account) => {
        if (window.confirm(`هل تريد حذف الحساب "${acc.name}"؟`)) {
            await dataService.remove('accounts', acc.id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="بحث برقم الحساب أو الاسم..."
                        className="w-full pr-10 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/20 px-6 py-2.5"
                    onClick={() => { setEditingAccount(null); setIsModalOpen(true); }}
                >
                    <PlusCircle size={18} /> إضافة حساب جديد
                </button>
            </div>

            <div className="space-y-4">
                {Object.entries(ACCOUNT_TYPE_CONFIG).map(([type, config]) => {
                    const accs = grouped[type] || [];
                    const expanded = expandedTypes.has(type);
                    const typeTotal = accs.reduce((s, a) => s + (balanceMap.get(a.id) || 0), 0);
                    
                    if (searchTerm && accs.length === 0) return null;

                    return (
                        <div key={type} className="bg-background/40 border border-border rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                            <button
                                className={`w-full flex items-center justify-between px-5 py-4 font-bold text-sm transition-all ${expanded ? 'bg-background border-b border-border' : 'hover:bg-background/80'}`}
                                onClick={() => toggleType(type)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${config.color.split(' ')[1]}`}>
                                        {config.icon}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-base">{config.label}</p>
                                        <p className="text-[10px] text-text-muted font-normal">{accs.length} حسابات مسجلة</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-left">
                                        <p className="text-[10px] text-text-muted font-normal mb-0.5">إجمالي الرصيد</p>
                                        <p className={`font-mono text-base ${typeTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                                            {formatCurrency(typeTotal)}
                                        </p>
                                    </div>
                                    <div className={`p-1.5 rounded-full transition-transform duration-300 ${expanded ? 'rotate-180 bg-background border border-border shadow-inner' : 'bg-background/50'}`}>
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </button>
                            
                            {expanded && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-text-muted bg-background/30 text-[10px] uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3 text-right font-black">رقم الحساب</th>
                                                <th className="px-6 py-3 text-right font-black">اسم الحساب</th>
                                                <th className="px-6 py-3 text-right font-black">النوع</th>
                                                <th className="px-6 py-3 text-right font-black">الرصيد الحالي</th>
                                                <th className="px-6 py-3 text-center font-black">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {accs.length === 0 && (
                                                <tr><td colSpan={5} className="px-6 py-8 text-text-muted text-center italic">لا توجد حسابات مطابقة للبحث</td></tr>
                                            )}
                                            {accs.map(acc => (
                                                <tr key={acc.id} className="hover:bg-primary/5 transition-colors group">
                                                    <td className="px-6 py-4 font-mono font-bold text-primary">{acc.no}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{acc.name}</span>
                                                            {acc.isParent && <span className="text-[10px] text-primary/70 font-bold bg-primary/10 self-start px-1.5 rounded-full mt-1">حساب رئيسي</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${config.color}`}>{config.label}</span>
                                                    </td>
                                                    <td className={`px-6 py-4 font-mono font-bold text-base ${ (balanceMap.get(acc.id) || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                                                        {formatCurrency(balanceMap.get(acc.id) || 0)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => { setEditingAccount(acc); setIsModalOpen(true); }}
                                                                className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                                title="تعديل"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(acc)}
                                                                className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                                title="حذف"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {isModalOpen && (
                <AccountForm
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    account={editingAccount}
                    accounts={accounts}
                />
            )}
        </div>
    );
};

const AccountForm: React.FC<{ isOpen: boolean; onClose: () => void; account: Account | null; accounts: Account[] }> = ({ isOpen, onClose, account, accounts }) => {
    const { dataService } = useApp();
    const [data, setData] = useState<Partial<Account>>(
        account || { type: 'ASSET', isParent: false, parentId: null }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.no || !data.name || !data.type) return toast.error('يرجى تعبئة جميع الحقول المطلوبة.');
        if (account) {
            await dataService.update('accounts', account.id, data);
        } else {
            await dataService.add('accounts', data as any);
        }
        onClose();
    };

    const parentAccounts = accounts.filter(a => a.isParent && a.type === data.type);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={account ? 'تعديل بيانات الحساب' : 'إضافة حساب مالي جديد'}>
            <form onSubmit={handleSubmit} className="space-y-5 p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted mr-1">رقم الحساب</label>
                        <input name="no" value={data.no || ''} onChange={handleChange} placeholder="مثال: 1110" className="w-full" required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted mr-1">اسم الحساب</label>
                        <input name="name" value={data.name || ''} onChange={handleChange} placeholder="مثال: البنك الوطني" className="w-full" required />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-black text-text-muted mr-1">تصنيف الحساب</label>
                    <select name="type" value={data.type} onChange={handleChange} className="w-full" required>
                        {Object.entries(ACCOUNT_TYPE_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3 p-4 bg-background rounded-2xl border border-border">
                    <input type="checkbox" name="isParent" id="isParent" checked={!!data.isParent} onChange={handleChange} className="w-5 h-5 accent-primary" />
                    <label htmlFor="isParent" className="text-sm font-bold cursor-pointer">هذا حساب رئيسي (أبوي) - تندرج تحته حسابات فرعية</label>
                </div>

                {!data.isParent && parentAccounts.length > 0 && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-text-muted mr-1">يندرج تحت حساب رئيسي</label>
                        <select name="parentId" value={data.parentId || ''} onChange={handleChange} className="w-full">
                            <option value="">— حساب مستقل (بدون أب) —</option>
                            {parentAccounts.map(a => (
                                <option key={a.id} value={a.id}>{a.no} - {a.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="btn btn-ghost flex-1 py-3">إلغاء</button>
                    <button type="submit" className="btn btn-primary flex-1 py-3 shadow-lg shadow-primary/20">حفظ الحساب</button>
                </div>
            </form>
        </Modal>
    );
};

interface VoucherLine {
    accountId: string;
    debit: number;
    credit: number;
}

const ManualVoucher: React.FC = () => {
    const { db, financeService } = useApp();
    const accounts = db.accounts || [];
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<VoucherLine[]>([
        { accountId: '', debit: 0, credit: 0 },
        { accountId: '', debit: 0, credit: 0 },
    ]);
    const [loading, setLoading] = useState(false);

    const totalDebits = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredits = lines.reduce((s, l) => s + (l.credit || 0), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001 && totalDebits > 0;

    const updateLine = (index: number, field: keyof VoucherLine, value: string | number) => {
        setLines(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addLine = () => setLines(prev => [...prev, { accountId: '', debit: 0, credit: 0 }]);
    const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) return toast.error('القيد غير متوازن.');
        setLoading(true);
        try {
            await financeService.addManualJournalVoucher({ date, notes, lines });
            setLines([{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }]);
            setNotes('');
            toast.success('تم تسجيل القيد بنجاح');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    <FilePen size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black">إنشاء قيد محاسبي يدوي</h3>
                    <p className="text-sm text-text-muted">أضف القيود المحاسبية المزدوجة بدقة</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-background/30 p-6 rounded-2xl border border-border">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-text-muted mr-1">تاريخ القيد</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full text-lg font-bold" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-text-muted mr-1">البيان (وصف القيد)</label>
                        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اكتب وصفاً مختصراً للعملية..." className="w-full text-lg" />
                    </div>
                </div>

                <div className="overflow-hidden border border-border rounded-2xl shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-background text-text-muted text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4 text-right">الحساب المالي</th>
                                <th className="px-6 py-4 text-right w-40">مدين (Debit)</th>
                                <th className="px-6 py-4 text-right w-40">دائن (Credit)</th>
                                <th className="px-6 py-4 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {lines.map((line, i) => (
                                <tr key={i} className="hover:bg-background/20 transition-colors">
                                    <td className="px-6 py-3">
                                        <select
                                            value={line.accountId}
                                            onChange={e => updateLine(i, 'accountId', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 font-bold"
                                            required
                                        >
                                            <option value="">— اختر الحساب —</option>
                                            {accounts.filter(a => !a.isParent).map(a => (
                                                <option key={a.id} value={a.id}>{a.no} - {a.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="bg-blue-50/50 rounded-xl px-3 border border-blue-100 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                                            <NumberInput value={line.debit || ''} onChange={v => updateLine(i, 'debit', v)} className="bg-transparent border-none w-full text-left font-mono font-bold text-blue-700" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="bg-emerald-50/50 rounded-xl px-3 border border-emerald-100 focus-within:ring-2 focus-within:ring-emerald-200 transition-all">
                                            <NumberInput value={line.credit || ''} onChange={v => updateLine(i, 'credit', v)} className="bg-transparent border-none w-full text-left font-mono font-bold text-emerald-700" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {lines.length > 2 && (
                                            <button type="button" onClick={() => removeLine(i)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-background/50">
                            <tr className="font-black text-base">
                                <td className="px-6 py-4 text-left">المجاميع النهائية</td>
                                <td className="px-6 py-4 text-left text-blue-700 font-mono" dir="ltr">{totalDebits.toFixed(3)}</td>
                                <td className="px-6 py-4 text-left text-emerald-700 font-mono" dir="ltr">{totalCredits.toFixed(3)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <button type="button" onClick={addLine} className="btn btn-ghost flex items-center gap-2 px-6 border border-dashed border-border hover:border-primary">
                        <PlusCircle size={18} /> إضافة سطر جديد للحساب
                    </button>
                    
                    <div className="flex items-center gap-6 bg-background p-4 rounded-2xl border border-border shadow-sm">
                        <div className="flex flex-col items-end">
                            {!isBalanced && totalDebits > 0 ? (
                                <>
                                    <span className="text-rose-600 text-xs font-black uppercase tracking-wider mb-1">القيد غير متوازن</span>
                                    <span className="text-rose-500 text-sm font-bold font-mono">الفرق: {Math.abs(totalDebits - totalCredits).toFixed(3)}</span>
                                </>
                            ) : isBalanced ? (
                                <>
                                    <span className="text-emerald-600 text-xs font-black uppercase tracking-wider mb-1">القيد متوازن تماماً</span>
                                    <span className="text-emerald-500 text-sm font-bold flex items-center gap-1">
                                        <CheckCircle size={14} /> جاهز للترحيل
                                    </span>
                                </>
                            ) : null}
                        </div>
                        <button
                            type="submit"
                            disabled={!isBalanced || loading}
                            className={`btn btn-primary px-10 py-3 shadow-xl ${isBalanced ? 'shadow-primary/30' : 'opacity-50 grayscale'}`}
                        >
                            {loading ? 'جاري الترحيل...' : 'ترحيل القيد للمحاسبة'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

const TrialBalance: React.FC = () => {
    const { db, rebuildSnapshotsFromJournal } = useApp();
    const accounts = db.accounts || [];
    const accountBalances = db.accountBalances || [];

    const accountsMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

    type TrialRow = { id: string; no: string; name: string; type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'; debit: number; credit: number };

    const rows = useMemo<TrialRow[]>(() => {
        return accountBalances
            .map(ab => {
                const acc = accountsMap.get(ab.accountId);
                if (!acc || ab.balance === 0) return null;
                return {
                    id: ab.accountId,
                    no: acc.no,
                    name: acc.name,
                    type: acc.type,
                    debit: ab.balance > 0 ? ab.balance : 0,
                    credit: ab.balance < 0 ? Math.abs(ab.balance) : 0,
                };
            })
            .filter((r): r is TrialRow => r !== null)
            .sort((a, b) => a.no.localeCompare(b.no));
    }, [accountBalances, accountsMap]);

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-background/30 p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isBalanced ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black">ميزان المراجعة بالمجاميع</h3>
                        <p className="text-sm text-text-muted">الوضع الحالي: {isBalanced ? 'متوازن' : 'غير متوازن'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => rebuildSnapshotsFromJournal()} className="btn btn-secondary flex items-center gap-2">
                        <RefreshCw size={16} /> تحديث الأرصدة
                    </button>
                    <button className="btn btn-primary flex items-center gap-2">
                        <Download size={16} /> تصدير التقرير
                    </button>
                </div>
            </div>

            <div className="overflow-hidden border border-border rounded-2xl shadow-sm bg-background/20 backdrop-blur-md">
                <table className="w-full text-sm">
                    <thead className="bg-background/50 text-text-muted text-[10px] uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4 text-right">رقم الحساب</th>
                            <th className="px-6 py-4 text-right">اسم الحساب</th>
                            <th className="px-6 py-4 text-right">نوع الحساب</th>
                            <th className="px-6 py-4 text-right w-48">مدين (Debit)</th>
                            <th className="px-6 py-4 text-right w-48">دائن (Credit)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {rows.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-text-muted italic">لا توجد بيانات متاحة حالياً.</td></tr>
                        )}
                        {rows.map(r => (
                            <tr key={r.id} className="hover:bg-background/30 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-primary">{r.no}</td>
                                <td className="px-6 py-4 font-bold">{r.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${ACCOUNT_TYPE_CONFIG[r.type]?.color}`}>
                                        {ACCOUNT_TYPE_CONFIG[r.type]?.label}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-blue-700 font-mono font-bold text-base text-left" dir="ltr">{r.debit > 0 ? formatCurrency(r.debit) : '-'}</td>
                                <td className="px-6 py-4 text-emerald-700 font-mono font-bold text-base text-left" dir="ltr">{r.credit > 0 ? formatCurrency(r.credit) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-background/50">
                        <tr className="font-black text-lg border-t-2 border-border">
                            <td colSpan={3} className="px-6 py-5">المجاميع النهائية للميزان</td>
                            <td className="px-6 py-5 text-blue-700 font-mono text-left" dir="ltr">{formatCurrency(totalDebit)}</td>
                            <td className="px-6 py-5 text-emerald-700 font-mono text-left" dir="ltr">{formatCurrency(totalCredit)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {!isBalanced && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 shadow-sm">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold">تنبيه: يوجد عدم توازن في ميزان المراجعة بقيمة {formatCurrency(Math.abs(totalDebit - totalCredit))}. يرجى مراجعة القيود اليدوية.</p>
                </div>
            )}
        </div>
    );
};

export default Accounting;
