import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Account } from '../types';
import { formatCurrency } from '../utils/helpers';
import { PlusCircle, Trash2, Edit2, BookOpen, FilePen, Scale } from 'lucide-react';
import { toast } from 'react-hot-toast';

type AccountingTab = 'chart' | 'voucher' | 'trial';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    ASSET: 'أصول',
    LIABILITY: 'التزامات',
    EQUITY: 'حقوق الملكية',
    REVENUE: 'إيرادات',
    EXPENSE: 'مصروفات',
};

const ChartOfAccounts: React.FC = () => {
    const { db, dataService } = useApp();
    const accounts = db.accounts || [];
    const accountBalances = db.accountBalances || [];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']));

    const balanceMap = useMemo(() =>
        new Map(accountBalances.map(ab => [ab.accountId, ab.balance])),
        [accountBalances]
    );

    const grouped = useMemo(() => {
        const types: Record<string, Account[]> = { ASSET: [], LIABILITY: [], EQUITY: [], REVENUE: [], EXPENSE: [] };
        accounts.forEach(acc => {
            if (types[acc.type]) types[acc.type].push(acc);
        });
        return types;
    }, [accounts]);

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
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">دليل الحسابات</h3>
                <button
                    className="btn btn-primary flex items-center gap-2"
                    onClick={() => { setEditingAccount(null); setIsModalOpen(true); }}
                >
                    <PlusCircle size={16} /> إضافة حساب
                </button>
            </div>
            <div className="space-y-3">
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([type, label]) => {
                    const accs = grouped[type] || [];
                    const expanded = expandedTypes.has(type);
                    const typeTotal = accs.reduce((s, a) => s + (balanceMap.get(a.id) || 0), 0);
                    return (
                        <div key={type} className="border border-border rounded-lg overflow-hidden">
                            <button
                                className="w-full flex items-center justify-between px-4 py-3 bg-background font-bold text-sm hover:bg-background/80 transition-colors"
                                onClick={() => toggleType(type)}
                            >
                                <span>{label} ({accs.length})</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-text-muted text-xs font-normal">
                                        الرصيد: {formatCurrency(typeTotal)}
                                    </span>
                                    <span>{expanded ? '▲' : '▼'}</span>
                                </div>
                            </button>
                            {expanded && (
                                <table className="w-full text-sm">
                                    <thead className="text-text-muted border-t border-border">
                                        <tr>
                                            <th className="px-4 py-2 text-right">رقم الحساب</th>
                                            <th className="px-4 py-2 text-right">اسم الحساب</th>
                                            <th className="px-4 py-2 text-right">الرصيد</th>
                                            <th className="px-4 py-2 text-right">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accs.length === 0 && (
                                            <tr><td colSpan={4} className="px-4 py-3 text-text-muted text-center">لا توجد حسابات</td></tr>
                                        )}
                                        {accs.map(acc => (
                                            <tr key={acc.id} className="border-t border-border hover:bg-background/50">
                                                <td className="px-4 py-2 font-mono text-primary">{acc.no}</td>
                                                <td className="px-4 py-2">{acc.name} {acc.isParent && <span className="text-xs text-text-muted ml-1">(أساسي)</span>}</td>
                                                <td className="px-4 py-2 font-bold">{formatCurrency(balanceMap.get(acc.id) || 0)}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => { setEditingAccount(acc); setIsModalOpen(true); }}
                                                            className="p-1 text-text-muted hover:text-primary"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(acc)}
                                                            className="p-1 text-text-muted hover:text-red-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
        <Modal isOpen={isOpen} onClose={onClose} title={account ? 'تعديل حساب' : 'إضافة حساب جديد'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input name="no" value={data.no || ''} onChange={handleChange} placeholder="رقم الحساب" required />
                    <input name="name" value={data.name || ''} onChange={handleChange} placeholder="اسم الحساب" required />
                </div>
                <select name="type" value={data.type} onChange={handleChange} required>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2">
                    <input type="checkbox" name="isParent" id="isParent" checked={!!data.isParent} onChange={handleChange} />
                    <label htmlFor="isParent" className="text-sm">حساب رئيسي (أبوي)</label>
                </div>
                {!data.isParent && parentAccounts.length > 0 && (
                    <select name="parentId" value={data.parentId || ''} onChange={handleChange}>
                        <option value="">— بدون حساب أبوي —</option>
                        {parentAccounts.map(a => (
                            <option key={a.id} value={a.id}>{a.no} - {a.name}</option>
                        ))}
                    </select>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h3 className="text-lg font-bold mb-4">القيد اليدوي</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-text-muted mb-1">التاريخ</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm text-text-muted mb-1">البيان</label>
                        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="وصف القيد..." />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-text-muted">
                            <tr>
                                <th className="px-3 py-2 text-right">الحساب</th>
                                <th className="px-3 py-2 text-right">مدين</th>
                                <th className="px-3 py-2 text-right">دائن</th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line, i) => (
                                <tr key={i} className="border-t border-border">
                                    <td className="px-3 py-2 min-w-[200px]">
                                        <select
                                            value={line.accountId}
                                            onChange={e => updateLine(i, 'accountId', e.target.value)}
                                            required
                                        >
                                            <option value="">— اختر الحساب —</option>
                                            {accounts.filter(a => !a.isParent).map(a => (
                                                <option key={a.id} value={a.id}>{a.no} - {a.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            value={line.debit || ''}
                                            onChange={e => updateLine(i, 'debit', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            value={line.credit || ''}
                                            onChange={e => updateLine(i, 'credit', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        {lines.length > 2 && (
                                            <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-border font-bold">
                                <td className="px-3 py-2">الإجمالي</td>
                                <td className="px-3 py-2 text-blue-600">{totalDebits.toFixed(3)}</td>
                                <td className="px-3 py-2 text-green-600">{totalCredits.toFixed(3)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex items-center justify-between">
                    <button type="button" onClick={addLine} className="btn btn-ghost btn-sm flex items-center gap-1">
                        <PlusCircle size={14} /> إضافة سطر
                    </button>
                    <div className="flex items-center gap-3">
                        {!isBalanced && totalDebits > 0 && (
                            <span className="text-red-500 text-sm font-bold">
                                القيد غير متوازن (الفرق: {Math.abs(totalDebits - totalCredits).toFixed(3)})
                            </span>
                        )}
                        {isBalanced && (
                            <span className="text-green-500 text-sm font-bold">✓ القيد متوازن</span>
                        )}
                        <button
                            type="submit"
                            disabled={!isBalanced || loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'جاري الحفظ...' : 'حفظ القيد'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

const TrialBalance: React.FC = () => {
    const { db } = useApp();
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

    return (
        <div>
            <h3 className="text-lg font-bold mb-4">ميزان المراجعة</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-background text-text-muted">
                        <tr>
                            <th className="px-4 py-3 text-right">رقم الحساب</th>
                            <th className="px-4 py-3 text-right">اسم الحساب</th>
                            <th className="px-4 py-3 text-right">مدين</th>
                            <th className="px-4 py-3 text-right">دائن</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">لا توجد بيانات. قم بإعادة بناء اللقطات أولاً.</td></tr>
                        )}
                        {rows.map(r => (
                            <tr key={r.id} className="border-t border-border hover:bg-background/50">
                                <td className="px-4 py-2 font-mono text-primary">{r.no}</td>
                                <td className="px-4 py-2">{r.name}</td>
                                <td className="px-4 py-2 text-blue-600">{r.debit > 0 ? formatCurrency(r.debit) : '-'}</td>
                                <td className="px-4 py-2 text-green-600">{r.credit > 0 ? formatCurrency(r.credit) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-border font-bold bg-background">
                            <td colSpan={2} className="px-4 py-3">الإجمالي</td>
                            <td className="px-4 py-3 text-blue-600">{formatCurrency(totalDebit)}</td>
                            <td className="px-4 py-3 text-green-600">{formatCurrency(totalCredit)}</td>
                        </tr>
                        <tr className="border-t border-border">
                            <td colSpan={4} className="px-4 py-2 text-center">
                                {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                                    <span className="text-green-600 font-bold">✓ الميزان متوازن</span>
                                ) : (
                                    <span className="text-red-600 font-bold">⚠ الميزان غير متوازن (الفرق: {formatCurrency(Math.abs(totalDebit - totalCredit))})</span>
                                )}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const TABS: { id: AccountingTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chart', label: 'دليل الحسابات', icon: <BookOpen size={16} /> },
    { id: 'voucher', label: 'القيد اليدوي', icon: <FilePen size={16} /> },
    { id: 'trial', label: 'ميزان المراجعة', icon: <Scale size={16} /> },
];

const Accounting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AccountingTab>('chart');

    return (
        <Card>
            <div className="flex gap-2 mb-6 border-b border-border pb-4 flex-wrap">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === tab.id
                                ? 'bg-primary text-white shadow'
                                : 'text-text-muted hover:bg-background'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeTab === 'chart' && <ChartOfAccounts />}
            {activeTab === 'voucher' && <ManualVoucher />}
            {activeTab === 'trial' && <TrialBalance />}
        </Card>
    );
};

export default Accounting;
