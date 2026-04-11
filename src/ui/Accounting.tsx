import React, { useMemo, useState } from 'react';
import { BookOpen, Calculator, Download, FilePen, HeartPulse, Wallet, Scale, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ManualVoucherForm from '../components/finance/ManualVoucherForm';
import { Account } from '../types';
import { formatCurrency, exportToCsv, formatDate } from '../utils/helpers';
import {
  calculateGeneralLedgerForAccount,
  calculateTrialBalanceData,
  getAccountingHealthCheck,
} from '../services/accountingService';
import { exportTrialBalanceToPdf } from '../services/pdfService';

const round3 = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 1000) / 1000;
type AccountingTab = 'chart' | 'voucher' | 'trial';

const labelByType: Record<Account['type'], string> = {
  ASSET: 'الأصول',
  LIABILITY: 'الالتزامات',
  EQUITY: 'حقوق الملكية',
  REVENUE: 'الإيرادات',
  EXPENSE: 'المصروفات',
};

const Accounting: React.FC = () => {
  const { db } = useApp();
  const [activeTab, setActiveTab] = useState<AccountingTab>('chart');
  const [showHealth, setShowHealth] = useState(false);

  const stats = useMemo(() => {
    const accountMap = new Map(db.accounts.map((a) => [a.id, a]));
    const totals = { assets: 0, liabilities: 0, equity: 0, revenue: 0, expense: 0 };

    for (const b of db.accountBalances || []) {
      const acc = accountMap.get(b.accountId);
      if (!acc) continue;
      if (acc.type === 'ASSET') totals.assets += b.balance;
      else if (acc.type === 'LIABILITY') totals.liabilities += -b.balance;
      else if (acc.type === 'EQUITY') totals.equity += -b.balance;
      else if (acc.type === 'REVENUE') totals.revenue += -b.balance;
      else if (acc.type === 'EXPENSE') totals.expense += b.balance;
    }

    return {
      assets: round3(totals.assets),
      liabilities: round3(totals.liabilities),
      equity: round3(totals.equity),
      revenue: round3(totals.revenue),
      expense: round3(totals.expense),
    };
  }, [db.accounts, db.accountBalances]);

  const health = useMemo(() => getAccountingHealthCheck(db), [db]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-xl border border-primary/20 p-4 bg-primary/5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-black text-lg">المحاسبة</h1>
          <p className="text-xs text-text-muted">مركز القيود، دليل الحسابات، وميزان المراجعة.</p>
        </div>
        <Link to="/reports?tab=trial_balance" className="btn btn-secondary">الانتقال للتقارير</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="الأصول" value={stats.assets} icon={<Wallet size={15} />} />
        <Stat label="الالتزامات" value={stats.liabilities} icon={<Scale size={15} />} />
        <Stat label="حقوق الملكية" value={stats.equity} icon={<PieChart size={15} />} />
        <Stat label="الإيرادات" value={stats.revenue} icon={<TrendingUp size={15} />} />
        <Stat label="المصروفات" value={stats.expense} icon={<TrendingDown size={15} />} />
        <button onClick={() => setShowHealth(true)} className={`rounded-xl border p-3 text-right ${health.isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <p className="text-xs font-bold mb-1">Health Check</p>
          <p className={`font-black text-sm ${health.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>{health.isBalanced ? '✔ متوازن' : '⚠ غير متوازن'}</p>
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b border-border flex gap-2">
          <Tab active={activeTab === 'chart'} onClick={() => setActiveTab('chart')} icon={<BookOpen size={16} />} text="دليل الحسابات" />
          <Tab active={activeTab === 'voucher'} onClick={() => setActiveTab('voucher')} icon={<FilePen size={16} />} text="قيد يدوي" />
          <Tab active={activeTab === 'trial'} onClick={() => setActiveTab('trial')} icon={<Calculator size={16} />} text="ميزان المراجعة" />
        </div>
        <div className="p-4">
          {activeTab === 'chart' && <ChartOfAccounts />}
          {activeTab === 'voucher' && <ManualVoucherTab />}
          {activeTab === 'trial' && <TrialBalanceTab />}
        </div>
      </Card>

      <Modal isOpen={showHealth} onClose={() => setShowHealth(false)} title="تفاصيل الفحص المحاسبي">
        <div className="space-y-2 text-sm">
          <p>الحالة: <span className={health.isBalanced ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>{health.isBalanced ? 'متوازن' : 'غير متوازن'}</span></p>
          <p>الفرق: <span dir="ltr" className="font-mono">{health.discrepancy.toFixed(3)}</span></p>
          <p>عدد القيود: <span dir="ltr" className="font-mono">{health.journalCount}</span></p>
          <p>عدد الحسابات: <span dir="ltr" className="font-mono">{health.accountCount}</span></p>
        </div>
      </Modal>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-border p-3 bg-card text-center">
    <div className="opacity-60 mb-1 inline-flex">{icon}</div>
    <p className="text-[11px] font-bold text-text-muted">{label}</p>
    <p className="font-black" dir="ltr">{formatCurrency(value)}</p>
  </div>
);

const Tab: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; text: string }> = ({ active, onClick, icon, text }) => (
  <button onClick={onClick} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${active ? 'bg-primary text-white' : 'hover:bg-background'}`}>
    {icon}{text}
  </button>
);

const ChartOfAccounts: React.FC = () => {
  const { db } = useApp();
  const [account, setAccount] = useState<Account | null>(null);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ ASSET: true, LIABILITY: true, EQUITY: true, REVENUE: true, EXPENSE: true });

  const sums = useMemo(() => {
    const m = new Map<string, { debit: number; credit: number }>();
    for (const je of db.journalEntries) {
      const current = m.get(je.accountId) ?? { debit: 0, credit: 0 };
      if (je.type === 'DEBIT') current.debit = round3(current.debit + je.amount);
      if (je.type === 'CREDIT') current.credit = round3(current.credit + je.amount);
      m.set(je.accountId, current);
    }
    return m;
  }, [db.journalEntries]);

  const accountBalance = (acc: Account) => {
    const sum = sums.get(acc.id) ?? { debit: 0, credit: 0 };
    if (acc.type === 'ASSET' || acc.type === 'EXPENSE') return round3(sum.debit - sum.credit);
    return round3(sum.credit - sum.debit);
  };

  const grouped = useMemo(() => {
    const groups: Record<Account['type'], Account[]> = { ASSET: [], LIABILITY: [], EQUITY: [], REVENUE: [], EXPENSE: [] };
    for (const acc of db.accounts) groups[acc.type].push(acc);
    return groups;
  }, [db.accounts]);

  const exportGroupCsv = (type: Account['type']) => {
    const rows = grouped[type].map((acc) => ({
      'رقم الحساب': acc.no,
      'اسم الحساب': acc.name,
      'النوع': labelByType[acc.type],
      'الرصيد': accountBalance(acc).toFixed(3),
    }));
    exportToCsv(`accounts_${type.toLowerCase()}`, rows);
  };

  const accountLines = useMemo(() => {
    if (!account) return [];
    return calculateGeneralLedgerForAccount(db, account.id, startDate, endDate);
  }, [db, account, startDate, endDate]);

  return (
    <div className="space-y-3">
      {Object.keys(grouped).map((type) => {
        const key = type as Account['type'];
        return (
          <div key={key} className="border border-border rounded-xl overflow-hidden">
            <div className="p-3 bg-background/60 flex items-center justify-between">
              <button className="font-black" onClick={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))}>{labelByType[key]}</button>
              <button className="btn btn-ghost" onClick={() => exportGroupCsv(key)}><Download size={14} /> تحميل CSV</button>
            </div>
            {expanded[key] && (
              <table className="w-full text-sm">
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-right">رقم</th>
                    <th className="px-3 py-2 text-right">الحساب</th>
                    <th className="px-3 py-2 text-right">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {grouped[key].map((acc) => (
                    <tr key={acc.id} className="cursor-pointer hover:bg-background/40" onClick={() => setAccount(acc)}>
                      <td className="px-3 py-2 font-mono">{acc.no}</td>
                      <td className="px-3 py-2">{acc.name}</td>
                      <td className="px-3 py-2 font-mono" dir="ltr">{formatCurrency(accountBalance(acc))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      <Modal isOpen={!!account} onClose={() => setAccount(null)} title={`حركة الحساب: ${account?.name || ''}`}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="max-h-[50vh] overflow-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="text-xs text-text-muted bg-background">
              <tr>
                <th className="px-2 py-2 text-right">تاريخ</th>
                <th className="px-2 py-2 text-right">رقم قيد</th>
                <th className="px-2 py-2 text-right">مدين (Debit)</th>
                <th className="px-2 py-2 text-right">دائن (Credit)</th>
                <th className="px-2 py-2 text-right">رصيد متراكم</th>
              </tr>
            </thead>
            <tbody>
              {accountLines.map((line) => (
                <tr key={line.id}>
                  <td className="px-2 py-2">{formatDate(line.date)}</td>
                  <td className="px-2 py-2 font-bold">{line.no}</td>
                  <td className="px-2 py-2" dir="ltr">{line.debit ? formatCurrency(line.debit) : '-'}</td>
                  <td className="px-2 py-2" dir="ltr">{line.credit ? formatCurrency(line.credit) : '-'}</td>
                  <td className="px-2 py-2" dir="ltr">{formatCurrency(line.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};

const ManualVoucherTab: React.FC = () => {
  const { financeService } = useApp();
  return (
    <ManualVoucherForm
      onSubmit={async (payload) => {
        await financeService.addManualJournalVoucher(payload);
      }}
    />
  );
};

const TrialBalanceTab: React.FC = () => {
  const { db, settings } = useApp();
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const result = useMemo(() => calculateTrialBalanceData(db, endDate), [db, endDate]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-background/50 rounded-xl p-3 border border-border">
        <div className="flex items-center gap-2">
          <HeartPulse size={18} className={result.isBalanced ? 'text-emerald-600' : 'text-rose-600'} />
          <p className={`font-black ${result.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
            {result.isBalanced ? 'متوازن' : `غير متوازن — الفرق ${Math.abs(result.totalDebit - result.totalCredit).toFixed(3)}`}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs text-text-muted block">حتى تاريخ</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button
            className="btn btn-secondary"
            onClick={() =>
              exportTrialBalanceToPdf(
                {
                  lines: result.lines.map((line) => ({ no: line.no, name: line.name, debit: line.totalDebit, credit: line.totalCredit })),
                  totalDebit: result.totalDebit,
                  totalCredit: result.totalCredit,
                },
                settings,
                endDate,
              )
            }
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-xs text-text-muted bg-background">
            <tr>
              <th className="px-3 py-2 text-right">رقم</th>
              <th className="px-3 py-2 text-right">الحساب</th>
              <th className="px-3 py-2 text-right">إجمالي مدين (Debit)</th>
              <th className="px-3 py-2 text-right">إجمالي دائن (Credit)</th>
              <th className="px-3 py-2 text-right">صافي الرصيد</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {result.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-3 py-2 font-mono">{line.no}</td>
                <td className="px-3 py-2">{line.name}</td>
                <td className="px-3 py-2 font-mono" dir="ltr">{formatCurrency(line.totalDebit)}</td>
                <td className="px-3 py-2 font-mono" dir="ltr">{formatCurrency(line.totalCredit)}</td>
                <td className="px-3 py-2 font-mono" dir="ltr">{formatCurrency(line.netBalance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-background/60 font-black">
            <tr>
              <td colSpan={2} className="px-3 py-2">الإجمالي</td>
              <td className="px-3 py-2 font-mono" dir="ltr">{formatCurrency(result.totalDebit)}</td>
              <td className="px-3 py-2 font-mono" dir="ltr">{formatCurrency(result.totalCredit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default Accounting;
