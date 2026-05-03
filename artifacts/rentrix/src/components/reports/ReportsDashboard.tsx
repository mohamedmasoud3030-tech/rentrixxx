import React, { memo, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { reportEngine } from '@/services/reports/ReportEngine';
import { useApp } from '@/contexts/AppContext';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/PageStates';
import { AppShellLayout } from '@/app/layouts/AppShellLayout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LineChart, Line, PieChart, Pie, Legend
} from 'recharts';
import { Lock, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/services/api/supabaseClient';
import type { BalanceReconciliationRow } from '@/types/supabase';

// ─── Types ───────────────────────────────────────────────────
type ReportId =
  | 'summary' | 'income_statement' | 'trial_balance' | 'balance_sheet'
  | 'aged_receivables' | 'overdue' | 'daily_collection'
  | 'rent_roll' | 'owner_statement' | 'tenant_statement'
  | 'reconciliation';

type ReconciliationRow = BalanceReconciliationRow;

interface DateRange { from: string; to: string }
type LoadState = 'idle' | 'loading' | 'done' | 'error';
interface OverdueReportRow {
  tenant_name: string;
  tenant_phone?: string;
  property_name: string;
  unit_name: string;
  invoice_no: string;
  due_date: string;
  days_overdue: number;
  remaining: number;
}

interface OverdueReportData {
  total: number;
  count: number;
  rows: OverdueReportRow[];
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n: number, currency = 'OMR') =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    .format(n) + ' ' + currency;

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const today = () => new Date().toISOString().slice(0, 10);
const firstOfYear = () => `${new Date().getFullYear()}-01-01`;

const MONTH_PRESETS = [
  { label: 'هذا الشهر',  from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10), to: today },
  { label: 'الشهر السابق', from: () => new Date(new Date().getFullYear(), new Date().getMonth()-1, 1).toISOString().slice(0,10),
    to: () => new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0,10) },
  { label: 'هذه السنة',  from: firstOfYear, to: today },
];

const AGING_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#991b1b'];

const useLoadOnce = (loader: () => Promise<void>) => {
  const didRun = useRef(false);
  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    void loader();
  }, [loader]);
};

// ─── Kpi Card ─────────────────────────────────────────────────
const KpiCardReport: React.FC<{ label: string; value: string; sub?: string; color?: string }> = memo(({ label, value, sub, color = 'text-primary' }) => (
  <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
    <p className="text-xs text-text-muted font-medium">{label}</p>
    <p className={`text-xl font-black font-mono ${color}`} dir="ltr">{value}</p>
    {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
  </div>
));

// ─── Section Header ───────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; onPrint?: () => void }> = memo(({ title, onPrint }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-black text-base text-text">{title}</h3>
    {onPrint && (
      <button onClick={onPrint}
        className="text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition active:scale-[0.98] font-bold">
        طباعة / PDF
      </button>
    )}
  </div>
));

// ─── Table wrapper ────────────────────────────────────────────
const Tbl: React.FC<{ heads: string[]; rows: React.ReactNode[][]; footer?: React.ReactNode[] }> = memo(({ heads, rows, footer }) => (
  <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-sm text-right">
      <thead className="bg-background text-text-muted text-xs">
        <tr>{heads.map((h) => <th key={`head-${h}`} className="px-4 py-3 font-bold">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r, i) => {
          const rowKey = `row-${i}-${r.map(c => (typeof c === 'string' || typeof c === 'number') ? String(c) : '').join('-').slice(0, 50)}`;
          return (
            <tr key={rowKey} className="hover:bg-background/60 transition-colors">
              {r.map((c, j) => {
                const cellKey = `cell-${i}-${j}-${(typeof c === 'string' || typeof c === 'number') ? String(c) : ''}`;
                return <td key={cellKey} className="px-4 py-3">{c}</td>;
              })}
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr><td colSpan={heads.length} className="px-4 py-10 text-center text-text-muted">لا توجد بيانات</td></tr>
        )}
      </tbody>
      {footer && (
        <tfoot className="bg-background border-t-2 border-border font-black text-text">
          <tr>{footer.map((c, i) => <td key={`footer-${i}-${(typeof c === 'string' || typeof c === 'number') ? String(c) : ''}`} className="px-4 py-3">{c}</td>)}</tr>
        </tfoot>
      )}
    </table>
  </div>
));

// ─── Badge ─────────────────────────────────────────────────────
const Badge: React.FC<{ days: number }> = memo(({ days }) => {
  const cls = days > 90 ? 'bg-red-100 text-red-700' :
              days > 60 ? 'bg-orange-100 text-orange-700' :
              days > 30 ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700';
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cls}`}>{days} يوم</span>;
});

// ─── Date Range Picker ────────────────────────────────────────
const DatePicker: React.FC<{ range: DateRange; onChange: (r: DateRange) => void; onGo: () => void; loading: boolean }> = memo(({ range, onChange, onGo, loading }) => (
  <div className="flex flex-wrap items-center gap-2 p-4 bg-card border border-border rounded-2xl">
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-muted font-bold">من</label>
      <input type="date" value={range.from} onChange={e => onChange({ ...range, from: e.target.value })}
        className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background focus:ring-2 focus:ring-primary/20 outline-none"/>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-muted font-bold">إلى</label>
      <input type="date" value={range.to} onChange={e => onChange({ ...range, to: e.target.value })}
        className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background focus:ring-2 focus:ring-primary/20 outline-none"/>
    </div>
    <div className="flex gap-1">
      {MONTH_PRESETS.map(p => (
        <button key={p.label} onClick={() => { onChange({ from: p.from(), to: p.to() }); }}
          className="text-xs px-3 py-1.5 rounded-xl border border-border hover:border-primary hover:text-primary transition active:scale-[0.98] font-bold">
          {p.label}
        </button>
      ))}
    </div>
    <button onClick={onGo} disabled={loading}
      className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-black hover:bg-primary/90 transition active:scale-[0.98] disabled:opacity-60 mr-auto">
      {loading ? '...' : 'عرض'}
    </button>
  </div>
));

// ════════════════════════════════════════════════════════════════
// REPORT VIEWS
// ════════════════════════════════════════════════════════════════

// 1. ملخص مالي
const SummaryView: React.FC<{ currency: string }> = ({ currency }) => {
  const [range, setRange] = useState<DateRange>({ from: firstOfYear(), to: today() });
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'summary', rpcName: 'rpt_financial_summary', params: { p_from: range.from, p_to: range.to } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [range]);

  useLoadOnce(load);

  const occupancy = data ? [
    { name: 'مشغول', value: data.occupied_units },
    { name: 'شاغر',  value: data.total_units - data.occupied_units },
  ] : [];

  return (
    <div className="space-y-5">
      <DatePicker range={range} onChange={setRange} onGo={load} loading={state === 'loading'}/>
      {state === 'loading' && <LoadingState title="جاري تحميل الملخص المالي..." message="يتم تجهيز المؤشرات الآن."/>}
      {state === 'done' && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCardReport label="إجمالي المحصّل"    value={fmt(data.collected, currency)}   color="text-emerald-600"/>
            <KpiCardReport label="إجمالي المصروفات"  value={fmt(data.expenses, currency)}    color="text-red-500"/>
           <KpiCardReport label="صافي الربح" value={fmt(data.netProfit, currency)} color={data.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'} />
            <KpiCardReport label="المتأخرات"          value={fmt(data.overdue_amount, currency)} sub={`${data.overdue_count} فاتورة`} color="text-orange-600"/>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCardReport label="العقود النشطة"   value={String(data.active_contracts)}/>
            <KpiCardReport label="نسبة الإشغال"    value={`${data.occupancy_rate}%`} sub={`${data.occupied_units} / ${data.total_units} وحدة`}/>
            <KpiCardReport label="فواتير معلّقة"   value={fmt(data.pending_invoices, currency)} color="text-yellow-600"/>
          </div>
          {occupancy.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-bold text-text-muted mb-3">الإشغال</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={occupancy} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    <Cell fill="#10b981"/><Cell fill="#e5e7eb"/>
                  </Pie>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد بيانات ضمن الفترة المختارة."/>}
      {state === 'error' && <ErrorState message="حدث خطأ في تحميل البيانات." onRetry={load}/>}
    </div>
  );
};

// 2. قائمة الدخل
const IncomeView: React.FC<{ currency: string }> = ({ currency }) => {
  const [range, setRange] = useState<DateRange>({ from: firstOfYear(), to: today() });
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'income_statement', rpcName: 'rpt_income_statement', params: { p_from: range.from, p_to: range.to } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [range]);

  useLoadOnce(load);

  const chartData = data ? [
    { name: 'الإيرادات', amount: data.total_revenue, fill: '#10b981' },
    { name: 'المصروفات', amount: data.total_expense, fill: '#ef4444' },
    { name: 'الصافي',    amount: data.net_income,    fill: data.net_income >= 0 ? '#3b82f6' : '#f97316' },
  ] : [];

  return (
    <div className="space-y-5">
      <DatePicker range={range} onChange={setRange} onGo={load} loading={state === 'loading'}/>
      {state === 'loading' && <LoadingState title="جاري تحميل قائمة الدخل..." message="يتم تجهيز بيانات الإيرادات والمصروفات."/>}
      {state === 'done' && data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCardReport label="إجمالي الإيرادات" value={fmt(data.totalRevenue, currency)} color="text-emerald-700" />
            <KpiCardReport label="إجمالي المصاريف" value={fmt(data.totalExpense, currency)} color="text-red-600" />
            <KpiCardReport label="صافي الدخل"        value={fmt(data.net_income, currency)}    color={data.net_income >= 0 ? 'text-primary' : 'text-red-600'}/>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 11 }}/>
                <Tooltip formatter={(v: any) => fmt(Number(v), currency)}/>
                <Bar dataKey="amount" radius={[8,8,0,0]}>
                  {chartData.map((d, i) => <Cell key={`income-cell-${d.name}-${i}`} fill={d.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <SectionHeader title="الإيرادات"/>
              <Tbl
                heads={['رقم', 'الحساب', 'المبلغ']}
                rows={(data.revenues || []).map((r: any) => [r.no, r.name, <span dir="ltr" className="font-mono text-emerald-700">{fmt(r.balance, currency)}</span>])}
                footer={['','المجموع', <span dir="ltr" className="font-mono text-emerald-700">{fmt(data.total_revenue, currency)}</span>]}
              />
            </div>
            <div>
              <SectionHeader title="المصروفات"/>
              <Tbl
                heads={['رقم', 'الحساب', 'المبلغ']}
                rows={(data.expenses || []).map((r: any) => [r.no, r.name, <span dir="ltr" className="font-mono text-red-600">{fmt(r.balance, currency)}</span>])}
                footer={['','المجموع', <span dir="ltr" className="font-mono text-red-600">{fmt(data.total_expense, currency)}</span>]}
              />
            </div>
          </div>
        </>
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد بيانات لقائمة الدخل لهذه الفترة."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل قائمة الدخل." onRetry={load}/>}
    </div>
  );
};

// 3. ميزان المراجعة
const TrialBalanceView: React.FC<{ currency: string }> = ({ currency }) => {
  const [asOf, setAsOf] = useState(today());
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'trial_balance', rpcName: 'rpt_trial_balance', params: { p_as_of: asOf } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [asOf]);

  useLoadOnce(load);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl">
        <label className="text-xs text-text-muted font-bold">حتى تاريخ</label>
        <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/20"/>
        <button onClick={load} disabled={state === 'loading'}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-black hover:bg-primary/90 transition disabled:opacity-60">
          {state === 'loading' ? '...' : 'عرض'}
        </button>
        {data && (
          <span className={`mr-auto text-xs font-bold px-3 py-1.5 rounded-full ${data.is_balanced ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {data.is_balanced ? '✓ الميزان متوازن' : `⚠ فارق: ${fmt(Math.abs(data.discrepancy), currency)}`}
          </span>
        )}
      </div>
      {state === 'loading' && <LoadingState title="جاري تحميل ميزان المراجعة..." message="يتم تدقيق الأرصدة قبل العرض."/>}
      {state === 'done' && data && (
        <Tbl
          heads={['رقم', 'اسم الحساب', 'النوع', 'مدين', 'دائن', 'الرصيد']}
          rows={(data.lines || []).map((r: any) => [
            <span className="font-mono text-xs">{r.no}</span>,
            r.name,
            <span className="text-[11px] text-text-muted">{r.type}</span>,
            <span dir="ltr" className="font-mono">{fmt(r.total_debit, currency)}</span>,
            <span dir="ltr" className="font-mono">{fmt(r.total_credit, currency)}</span>,
            <span dir="ltr" className={`font-mono font-bold ${r.net_balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(r.net_balance, currency)}</span>,
          ])}
          footer={[
            '', 'الإجمالي', '',
            <span dir="ltr" className="font-mono font-black">{fmt(data.total_debit, currency)}</span>,
            <span dir="ltr" className="font-mono font-black">{fmt(data.total_credit, currency)}</span>,
            '',
          ]}
        />
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد قيود متاحة لميزان المراجعة في هذا التاريخ."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل ميزان المراجعة." onRetry={load}/>}
    </div>
  );
};

// 4b. الميزانية العمومية
const BalanceSheetView: React.FC<{ currency: string }> = ({ currency }) => {
  const [asOf, setAsOf] = useState(today());
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');
  const reportRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'balance_sheet', rpcName: 'rpt_balance_sheet', params: { p_as_of: asOf } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [asOf]);

  useLoadOnce(load);

  const printPdf = useCallback(() => {
    if (!reportRef.current) return;
    const printWindow = globalThis.open('', '', 'height=900,width=1200');
    if (!printWindow) return;
    const css = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');
    printWindow.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>الميزانية العمومية</title>${css}</head><body>`);
    printWindow.document.write(`<div style="padding:16mm">${reportRef.current.outerHTML}</div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }, []);

  const toRows = (lines: any[]) => (lines || []).map((r: any) => [
    <span className="font-mono text-xs">{r.no}</span>,
    r.name,
    <span dir="ltr" className="font-mono">{fmt(Number(r.balance || 0), currency)}</span>,
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl">
        <label className="text-xs text-text-muted font-bold">حتى تاريخ</label>
        <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/20"/>
        <button onClick={load} disabled={state === 'loading'}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-black hover:bg-primary/90 transition disabled:opacity-60">
          {state === 'loading' ? '...' : 'عرض'}
        </button>
        {data && (
          <span className={`mr-auto text-xs font-bold px-3 py-1.5 rounded-full ${data.is_balanced ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {data.is_balanced
              ? '✓ الأصول = الالتزامات + حقوق الملكية'
              : `⚠ فارق: ${fmt(Math.abs(Number(data.total_assets || 0) - Number(data.total_liabilities || 0) - Number(data.total_equity || 0)), currency)}`}
          </span>
        )}
      </div>

      {state === 'loading' && <LoadingState title="جاري تحميل الميزانية العمومية..." message="يتم إعداد الأصول والالتزامات وحقوق الملكية."/>}
      {state === 'done' && data && (
        <div ref={reportRef} className="space-y-5">
          <SectionHeader title="الميزانية العمومية" onPrint={printPdf}/>
          <div className="grid grid-cols-3 gap-3">
            <KpiCardReport label="إجمالي الأصول" value={fmt(Number(data.total_assets || 0), currency)} color="text-primary"/>
            <KpiCardReport label="إجمالي الالتزامات" value={fmt(Number(data.total_liabilities || 0), currency)} color="text-red-500"/>
            <KpiCardReport label="إجمالي حقوق الملكية" value={fmt(Number(data.total_equity || 0), currency)} color="text-emerald-600"/>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <SectionHeader title="الأصول"/>
              <Tbl
                heads={['رقم', 'الحساب', 'الرصيد']}
                rows={toRows(data.assets || [])}
                footer={['', 'الإجمالي', <span dir="ltr" className="font-mono font-black">{fmt(Number(data.total_assets || 0), currency)}</span>]}
              />
            </div>
            <div>
              <SectionHeader title="الالتزامات"/>
              <Tbl
                heads={['رقم', 'الحساب', 'الرصيد']}
                rows={toRows(data.liabilities || [])}
                footer={['', 'الإجمالي', <span dir="ltr" className="font-mono font-black">{fmt(Number(data.total_liabilities || 0), currency)}</span>]}
              />
            </div>
            <div>
              <SectionHeader title="حقوق الملكية"/>
              <Tbl
                heads={['رقم', 'الحساب', 'الرصيد']}
                rows={toRows(data.equity || [])}
                footer={['', 'الإجمالي', <span dir="ltr" className="font-mono font-black">{fmt(Number(data.total_equity || 0), currency)}</span>]}
              />
            </div>
          </div>
        </div>
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد بيانات للميزانية العمومية في التاريخ المحدد."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل الميزانية العمومية." onRetry={load}/>}
    </div>
  );
};

// 4. أعمار الديون
const AgedReceivablesView: React.FC<{ currency: string }> = ({ currency }) => {
  const [asOf, setAsOf] = useState(today());
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'aged_receivables', rpcName: 'rpt_aged_receivables', params: { p_as_of: asOf } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [asOf]);

  useLoadOnce(load);

  const buckets = data?.totals ? [
    { name: 'حالي',    value: data.totals.current },
    { name: '1-30',    value: data.totals['1_30']  },
    { name: '31-60',   value: data.totals['31_60'] },
    { name: '61-90',   value: data.totals['61_90'] },
    { name: '+90',     value: data.totals['90plus'] },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl">
        <label className="text-xs text-text-muted font-bold">حتى تاريخ</label>
        <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background outline-none"/>
        <button onClick={load} disabled={state === 'loading'}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-black disabled:opacity-60">
          {state === 'loading' ? '...' : 'عرض'}
        </button>
      </div>
      {state === 'loading' && <LoadingState title="جاري تحميل أعمار الديون..." message="يتم تصنيف المديونيات حسب الفترات."/>}
      {state === 'done' && data && (
        <>
          <div className="grid grid-cols-5 gap-2">
            {buckets.map((b, i) => (
              <KpiCardReport key={b.name} label={b.name} value={fmt(b.value, currency)}
                color={['text-emerald-600', 'text-blue-600', 'text-yellow-600'][i] ?? 'text-red-600'}/>
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={buckets} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 11 }}/>
                <Tooltip formatter={(v: any) => fmt(Number(v), currency)}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {buckets.map((bucket, i) => <Cell key={`aging-cell-${bucket.name}-${i}`} fill={AGING_COLORS[i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Tbl
            heads={['المستأجر', 'الهاتف', 'العقار', 'الوحدة', 'حالي', '1-30', '31-60', '61-90', '+90', 'الإجمالي']}
            rows={(data.lines || []).map((r: any) => [
              r.tenant_name,
              <a href={`tel:${r.tenant_phone}`} className="text-primary text-xs">{r.tenant_phone}</a>,
              r.property_name,
              r.unit_name,
              <span dir="ltr" className="font-mono text-xs">{fmt(r.current,currency)}</span>,
              <span dir="ltr" className="font-mono text-xs">{fmt(r['1_30'],currency)}</span>,
              <span dir="ltr" className="font-mono text-xs">{fmt(r['31_60'],currency)}</span>,
              <span dir="ltr" className="font-mono text-xs">{fmt(r['61_90'],currency)}</span>,
              <span dir="ltr" className="font-mono text-xs text-red-600">{fmt(r['90plus'],currency)}</span>,
              <span dir="ltr" className="font-mono font-bold">{fmt(r.total,currency)}</span>,
            ])}
            footer={['','','','','','','','','الإجمالي',
              <span dir="ltr" className="font-mono font-black">{fmt(data.totals.total,currency)}</span>]}
          />
        </>
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد بيانات أعمار ديون في التاريخ المحدد."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل تقرير أعمار الديون." onRetry={load}/>}
    </div>
  );
};

// 5. المتأخرون
const OverdueView: React.FC<{ currency: string }> = ({ currency }) => {
  const [data, setData] = useState<OverdueReportData | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'overdue', rpcName: 'rpt_overdue_invoices', params: { p_as_of: today() } });
    if (error) { setState('error'); return; }
    setData(d as OverdueReportData); setState('done');
  }, []);

  useLoadOnce(load);

  const rows = useMemo(
    () => (data?.rows || []).filter((r) =>
      !search || r.tenant_name?.includes(search) || r.unit_name?.includes(search) || r.property_name?.includes(search)
    ),
    [data?.rows, search],
  );
  const overdue90Count = useMemo(() => rows.filter((r) => r.days_overdue > 90).length, [rows]);
  const averageOverdueDays = useMemo(
    () => (rows.length ? Math.round(rows.reduce((sum, row) => sum + row.days_overdue, 0) / rows.length) : null),
    [rows],
  );

  return (
    <div className="space-y-4">
      {state === 'loading' && <LoadingState title="جاري تحميل تقرير المتأخرات..." message="يتم جمع الفواتير المتأخرة الآن."/>}
      {state === 'done' && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCardReport label="إجمالي المتأخرات"  value={fmt(data.total, currency)} color="text-red-600"/>
            <KpiCardReport label="عدد الفواتير"       value={String(data.count)}/>
            <KpiCardReport label="المتأخرون > 90 يوم" value={String(overdue90Count)} color="text-red-700"/>
            <KpiCardReport label="متوسط أيام التأخر"  value={averageOverdueDays !== null ? `${averageOverdueDays} يوم` : '—'}/>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم المستأجر أو الوحدة..."
            className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-card outline-none focus:ring-2 focus:ring-primary/20"/>
          <Tbl
            heads={['المستأجر','الهاتف','العقار','الوحدة','الفاتورة','تاريخ الاستحقاق','التأخر','المستحق']}
            rows={rows.map((r) => [
              r.tenant_name,
              <a href={`https://wa.me/${(r.tenant_phone||'').replace(/\D/g,'')}`} target="_blank" className="text-emerald-600 text-xs">{r.tenant_phone}</a>,
              r.property_name,
              r.unit_name,
              <span className="font-mono text-xs">#{r.invoice_no}</span>,
              fmtDate(r.due_date),
              <Badge days={r.days_overdue}/>,
              <span dir="ltr" className="font-mono font-bold text-red-600">{fmt(r.remaining, currency)}</span>,
            ])}
          />
          {rows.length === 0 && <EmptyState message="لا توجد نتائج مطابقة للبحث الحالي."/>}
        </>
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد فواتير متأخرة حالياً."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل تقرير المتأخرات." onRetry={load}/>}
    </div>
  );
};

// 6. كشف حساب المستأجر
const TenantStatementView: React.FC<{ currency: string; contracts: any[] }> = ({ currency, contracts }) => {
  const [contractId, setContractId] = useState('');
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    if (!contractId) return;
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'tenant_statement', rpcName: 'rpt_tenant_statement', params: { p_contract_id: contractId } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [contractId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl">
        <label className="text-xs text-text-muted font-bold">العقد</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)}
          className="flex-1 text-sm border border-border rounded-xl px-3 py-1.5 bg-background outline-none">
          <option value="">— اختر العقد —</option>
          {contracts.map((c: any) => (
            <option key={c.id} value={c.id}>{c.tenant_name} — {c.unit_name} ({c.start_date?.slice(0,7)})</option>
          ))}
        </select>
        <button onClick={load} disabled={!contractId || state === 'loading'}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-black disabled:opacity-60">
          {state === 'loading' ? '...' : 'عرض'}
        </button>
      </div>
      {state === 'loading' && <LoadingState title="جاري تحميل كشف المستأجر..." message="يتم تجهيز حركة الحساب."/>}
      {state === 'idle' && <EmptyState message="اختر عقدًا ثم اضغط عرض لعرض كشف حساب المستأجر."/>}
      {state === 'done' && data?.error && <ErrorState message={String(data.error)} onRetry={load}/>}
      {state === 'done' && data && !data.error && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCardReport label="المستأجر"   value={data.tenant_name}/>
            <KpiCardReport label="الوحدة"     value={`${data.property_name} / ${data.unit_name}`}/>
            <KpiCardReport label="الرصيد الإجمالي" value={fmt(data.final_balance, currency)}
              color={data.final_balance > 0 ? 'text-red-600' : 'text-emerald-600'}/>
          </div>
          <Tbl
            heads={['التاريخ','البيان','مدين','دائن','الرصيد']}
            rows={(data.lines || []).map((r: any) => [
              fmtDate(r.date),
              r.description,
              r.debit > 0 ? <span dir="ltr" className="font-mono text-red-600">{fmt(r.debit,currency)}</span> : '—',
              r.credit > 0 ? <span dir="ltr" className="font-mono text-emerald-600">{fmt(r.credit,currency)}</span> : '—',
              <span dir="ltr" className={`font-mono font-bold ${r.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(r.balance,currency)}</span>,
            ])}
          />
        </>
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد بيانات متاحة لهذا العقد."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل كشف حساب المستأجر." onRetry={load}/>}
    </div>
  );
};

// 7. كشف حساب المالك
const OwnerStatementView: React.FC<{ currency: string; owners: any[] }> = ({ currency, owners }) => {
  const [ownerId, setOwnerId] = useState('');
  const [range, setRange] = useState<DateRange>({ from: firstOfYear(), to: today() });
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    if (!ownerId) return;
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'owner_statement', rpcName: 'rpt_owner_statement', params: { p_owner_id: ownerId, p_from: range.from, p_to: range.to } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [ownerId, range]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-2xl">
        <select value={ownerId} onChange={e => setOwnerId(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background outline-none">
          <option value="">— اختر المالك —</option>
          {owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <input type="date" value={range.from} onChange={e => setRange(r => ({...r, from: e.target.value}))}
          className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background outline-none"/>
        <input type="date" value={range.to} onChange={e => setRange(r => ({...r, to: e.target.value}))}
          className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background outline-none"/>
        <button onClick={load} disabled={!ownerId || state === 'loading'}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-black disabled:opacity-60">
          {state === 'loading' ? '...' : 'عرض'}
        </button>
      </div>
      {state === 'loading' && <LoadingState title="جاري تحميل كشف المالك..." message="يتم تجهيز الحركات المالية للمالك."/>}
      {state === 'idle' && <EmptyState message="اختر مالكًا وحدد الفترة ثم اضغط عرض."/>}
      {state === 'done' && data?.error && <ErrorState message={String(data.error)} onRetry={load}/>}
      {state === 'done' && data && !data.error && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCardReport label="الإجمالي المحصّل" value={fmt(data.total_gross, currency)} color="text-emerald-600"/>
            <KpiCardReport label="الاستقطاعات"      value={fmt(data.total_deductions, currency)} color="text-red-500"/>
            <KpiCardReport label="صافي المالك"      value={fmt(data.total_net, currency)} color="text-primary"/>
          </div>
          <Tbl
            heads={['التاريخ','البيان','العقار','الإجمالي','الاستقطاع','الصافي']}
            rows={(data.transactions || []).map((r: any) => [
              fmtDate(r.date),
              r.details,
              r.property_name,
              <span dir="ltr" className={`font-mono ${r.gross >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(r.gross,currency)}</span>,
              r.deduction > 0 ? <span dir="ltr" className="font-mono text-red-500">{fmt(-r.deduction,currency)}</span> : '—',
              <span dir="ltr" className="font-mono font-bold">{fmt(r.net,currency)}</span>,
            ])}
            footer={['','','الإجمالي',
              <span dir="ltr" className="font-mono">{fmt(data.total_gross,currency)}</span>,
              <span dir="ltr" className="font-mono text-red-500">{fmt(-data.total_deductions,currency)}</span>,
              <span dir="ltr" className="font-mono font-black text-primary">{fmt(data.total_net,currency)}</span>]}
          />
        </>
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد حركات ضمن الفترة المختارة."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل كشف حساب المالك." onRetry={load}/>}
    </div>
  );
};

// 8. التحصيل اليومي
const DailyCollectionView: React.FC<{ currency: string }> = ({ currency }) => {
  const [range, setRange] = useState<DateRange>({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10), to: today() });
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'daily_collection', rpcName: 'rpt_daily_collection', params: { p_from: range.from, p_to: range.to } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [range]);

  useLoadOnce(load);

  return (
    <div className="space-y-5">
      <DatePicker range={range} onChange={setRange} onGo={load} loading={state === 'loading'}/>
      {state === 'loading' && <LoadingState title="جاري تحميل التحصيل اليومي..." message="يتم تحليل التدفقات اليومية."/>}
      {state === 'done' && data && (
        <>
          <KpiCardReport label="إجمالي التحصيل" value={fmt(data.total, currency)} color="text-emerald-600"/>
          <div className="bg-card border border-border rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.rows || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="date" tick={{ fontSize: 10 }}/>
                <YAxis tick={{ fontSize: 10 }}/>
                <Tooltip formatter={(v: any) => fmt(Number(v), currency)}/>
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Tbl
            heads={['التاريخ','الإجمالي','نقدي','بنكي','شبكة','أخرى','عدد السندات']}
            rows={(data.rows || []).map((r: any) => [
              fmtDate(r.date),
              <span dir="ltr" className="font-mono font-bold">{fmt(r.total,currency)}</span>,
              <span dir="ltr" className="font-mono text-xs">{fmt(r.cash,currency)}</span>,
              <span dir="ltr" className="font-mono text-xs">{fmt(r.bank,currency)}</span>,
              <span dir="ltr" className="font-mono text-xs">{fmt(r.pos,currency)}</span>,
              <span dir="ltr" className="font-mono text-xs">{fmt(r.other,currency)}</span>,
              r.count,
            ])}
          />
        </>
      )}
      {state === 'done' && !data && <EmptyState message="لا توجد بيانات تحصيل للفترة المختارة."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل تقرير التحصيل اليومي." onRetry={load}/>}
    </div>
  );
};

// 9. قائمة الإيجارات
const RentRollView: React.FC<{ currency: string }> = ({ currency }) => {
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await reportEngine.generate({ reportId: 'rent_roll', rpcName: 'rpt_rent_roll', params: { p_as_of: today() } });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, []);

  useLoadOnce(load);

  const rows = data?.rows || [];
  const totalRent = rows.filter((r:any) => r.tenant_name).reduce((s:number, r:any) => s + r.rent_amount, 0);

  return (
    <div className="space-y-4">
      {state === 'loading' && <LoadingState title="جاري تحميل قائمة الإيجارات..." message="يتم تجهيز تفاصيل الوحدات والعقود."/>}
      {state === 'done' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCardReport label="إجمالي الوحدات"  value={String(rows.length)}/>
            <KpiCardReport label="وحدات مشغولة"    value={String(rows.filter((r:any) => r.tenant_name).length)} color="text-emerald-600"/>
            <KpiCardReport label="إيجار شهري"      value={fmt(totalRent, currency)} color="text-primary"/>
          </div>
          <Tbl
            heads={['العقار','الوحدة','النوع','المستأجر','الهاتف','بداية العقد','نهاية العقد','الإيجار','المتأخر']}
            rows={rows.map((r: any) => [
              r.property_name,
              r.unit_name,
              r.unit_type || '—',
              r.tenant_name || <span className="text-text-muted text-xs">شاغر</span>,
              r.tenant_phone ? <a href={`tel:${r.tenant_phone}`} className="text-primary text-xs">{r.tenant_phone}</a> : '—',
              r.contract_start ? fmtDate(r.contract_start) : '—',
              r.contract_end
                ? <span className={`text-xs ${r.days_to_expiry <= 30 ? 'text-orange-600 font-bold' : ''}`}>{fmtDate(r.contract_end)}</span>
                : '—',
              r.rent_amount ? <span dir="ltr" className="font-mono text-xs">{fmt(r.rent_amount,currency)}</span> : '—',
              r.overdue_balance > 0 ? <span dir="ltr" className="font-mono text-red-600 text-xs">{fmt(r.overdue_balance,currency)}</span> : <span className="text-emerald-600 text-xs">✓</span>,
            ])}
          />
        </>
      )}
      {state === 'done' && rows.length === 0 && <EmptyState message="لا توجد بيانات لقائمة الإيجارات حالياً."/>}
      {state === 'error' && <ErrorState message="تعذر تحميل قائمة الإيجارات." onRetry={load}/>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// 11. مطابقة الأرصدة — Balance Reconciliation (ADMIN only)
// ════════════════════════════════════════════════════════════════

const ENTITY_LABELS: Record<string, string> = {
  account:  'حساب',
  owner:    'مالك',
  contract: 'عقد',
  tenant:   'مستأجر',
};

const StatusBadge: React.FC<{ status: ReconciliationRow['reconciliation_status'] }> = memo(({ status }) => {
  if (status === 'OK') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
      <CheckCircle size={11}/> OK
    </span>
  );
  if (status === 'WARN') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700">
      <AlertTriangle size={11}/> تحذير
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
      <XCircle size={11}/> حرج
    </span>
  );
});

const ReconciliationView: React.FC = () => {
  const { auth, rebuildSnapshotsFromJournal } = useApp();
  const isAdmin = auth.currentUser?.role === 'ADMIN';

  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [rebuilding, setRebuilding] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState('loading');
    const { data, error } = await supabase
      .from('v_balance_reconciliation')
      .select('entity_type,entity_id,entity_name,ledger_value,cached_value,drift,reconciliation_status,checked_at')
      .order('checked_at', { ascending: false });
    if (error) { setLoadState('error'); return; }
    setRows(data ?? []);
    if (data && data.length > 0) setLastChecked(data[0].checked_at);
    setLoadState('done');
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  const handleRebuild = useCallback(async () => {
    if (!isAdmin) return;
    setRebuilding(true);
    await rebuildSnapshotsFromJournal();
    setRebuilding(false);
    void load();
  }, [isAdmin, rebuildSnapshotsFromJournal, load]);

  const criticalCount = rows.filter(r => r.reconciliation_status === 'CRITICAL').length;
  const warnCount     = rows.filter(r => r.reconciliation_status === 'WARN').length;
  const okCount       = rows.filter(r => r.reconciliation_status === 'OK').length;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <Lock size={40} className="text-amber-500"/>
        <h3 className="text-lg font-bold">صلاحية غير كافية</h3>
        <p className="text-sm text-text-muted max-w-xs">مطابقة الأرصدة متاحة للمديرين فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h3 className="font-black text-base text-text">مطابقة الأرصدة</h3>
          {lastChecked && (
            <p className="text-xs text-text-muted mt-0.5">
              آخر فحص: {new Date(lastChecked).toLocaleString('ar-SA')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loadState === 'loading'}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-border hover:border-primary hover:text-primary transition active:scale-[0.98] font-bold disabled:opacity-50"
          >
            <RefreshCw size={13} className={loadState === 'loading' ? 'animate-spin' : ''}/>
            تحديث
          </button>
          <button
            onClick={handleRebuild}
            disabled={rebuilding || loadState === 'loading'}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-primary text-white font-black hover:bg-primary/90 transition active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw size={13} className={rebuilding ? 'animate-spin' : ''}/>
            {rebuilding ? 'جارٍ إعادة البناء...' : 'إعادة بناء الأرصدة'}
          </button>
        </div>
      </div>

      {/* KPI summary */}
      {loadState === 'done' && (
        <div className="grid grid-cols-3 gap-3">
          <KpiCardReport label="سجلات سليمة"   value={String(okCount)}       color="text-emerald-600"/>
          <KpiCardReport label="تحذيرات"        value={String(warnCount)}     color="text-yellow-600"/>
          <KpiCardReport label="حالات حرجة"    value={String(criticalCount)} color={criticalCount > 0 ? 'text-red-600' : 'text-emerald-600'}/>
        </div>
      )}

      {loadState === 'loading' && <LoadingState title="جاري فحص الأرصدة..." message="يتم مقارنة الأرصدة المخزنة مع سجلات القيود."/>}
      {loadState === 'error'   && <ErrorState message="تعذر تحميل بيانات المطابقة." onRetry={load}/>}

      {loadState === 'done' && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm text-right">
            <thead className="bg-background text-text-muted text-xs">
              <tr>
                <th className="px-4 py-3 font-bold">النوع</th>
                <th className="px-4 py-3 font-bold">الاسم / المعرف</th>
                <th className="px-4 py-3 font-bold text-left" dir="ltr">الرصيد المخزّن</th>
                <th className="px-4 py-3 font-bold text-left" dir="ltr">رصيد القيود</th>
                <th className="px-4 py-3 font-bold text-left" dir="ltr">الفارق</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-muted">لا توجد بيانات للمطابقة</td>
                </tr>
              )}
              {rows.map((row, i) => {
                const rowBg =
                  row.reconciliation_status === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/10' :
                  row.reconciliation_status === 'WARN'     ? 'bg-yellow-50 dark:bg-yellow-900/10' :
                  '';
                const driftColor =
                  row.reconciliation_status === 'CRITICAL' ? 'text-red-600 font-black' :
                  row.reconciliation_status === 'WARN'     ? 'text-yellow-600 font-bold' :
                  'text-emerald-600';
                return (
                  <tr key={`recon-${row.entity_type}-${row.entity_id}-${i}`} className={`transition-colors ${rowBg}`}>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-background border border-border">
                        {ENTITY_LABELS[row.entity_type] ?? row.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate" title={row.entity_name}>
                      {row.entity_name || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-left" dir="ltr">
                      {Number(row.cached_value).toFixed(3)}
                    </td>
                    <td className="px-4 py-3 font-mono text-left" dir="ltr">
                      {Number(row.ledger_value).toFixed(3)}
                    </td>
                    <td className={`px-4 py-3 font-mono text-left ${driftColor}`} dir="ltr">
                      {Number(row.drift) >= 0 ? '+' : ''}{Number(row.drift).toFixed(3)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.reconciliation_status}/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loadState === 'done' && criticalCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-400">
          <XCircle size={18} className="flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-black">يوجد {criticalCount} {criticalCount === 1 ? 'سجل حرج' : 'سجلات حرجة'} تستوجب الإصلاح</p>
            <p className="text-xs mt-0.5">استخدم زر "إعادة بناء الأرصدة" لمزامنة الأرصدة مع سجلات القيود المحاسبية.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
const REPORTS: { id: ReportId; label: string; group: string }[] = [
  { id: 'summary',          label: 'الملخص المالي',         group: 'عام' },
  { id: 'income_statement', label: 'قائمة الدخل',           group: 'مالي' },
  { id: 'trial_balance',    label: 'ميزان المراجعة',        group: 'مالي' },
  { id: 'balance_sheet',    label: 'الميزانية العمومية',    group: 'مالي' },
  { id: 'daily_collection', label: 'التحصيل اليومي',        group: 'مالي' },
  { id: 'aged_receivables', label: 'أعمار الديون',           group: 'إيجار' },
  { id: 'overdue',          label: 'المتأخرون عن الدفع',    group: 'إيجار' },
  { id: 'rent_roll',        label: 'قائمة الإيجارات',       group: 'إيجار' },
  { id: 'owner_statement',  label: 'كشف حساب المالك',       group: 'كشوف' },
  { id: 'tenant_statement', label: 'كشف حساب المستأجر',     group: 'كشوف' },
  { id: 'reconciliation',   label: 'مطابقة الأرصدة',        group: 'إدارة' },
];

const ReportsDashboard: React.FC = () => {
  const { settings, db, auth } = useApp();
  const currency = settings.operational?.currency ?? 'OMR';
  const owners = db.owners || [];
  const contracts = db.contracts || [];
  const isAdmin = auth.currentUser?.role === 'ADMIN';
  const [active, setActive] = useState<ReportId>('summary');

  const visibleReports = REPORTS.filter(r => r.id !== 'reconciliation' || isAdmin);
  const groups = Array.from(new Set(visibleReports.map(r => r.group)));

  const renderContent = () => {
    switch (active) {
      case 'summary':          return <SummaryView currency={currency}/>;
      case 'income_statement': return <IncomeView currency={currency}/>;
      case 'trial_balance':    return <TrialBalanceView currency={currency}/>;
      case 'aged_receivables': return <AgedReceivablesView currency={currency}/>;
      case 'overdue':          return <OverdueView currency={currency}/>;
      case 'tenant_statement': return <TenantStatementView currency={currency} contracts={contracts}/>;
      case 'owner_statement':  return <OwnerStatementView currency={currency} owners={owners}/>;
      case 'daily_collection': return <DailyCollectionView currency={currency}/>;
      case 'rent_roll':        return <RentRollView currency={currency}/>;
      case 'balance_sheet':    return <BalanceSheetView currency={currency}/>;
      case 'reconciliation':   return <ReconciliationView/>;
      default:                 return null;
    }
  };

  const currentLabel = REPORTS.find(r => r.id === active)?.label || '';

  return (
    <AppShellLayout>
    <div className="flex gap-5 items-start min-h-screen">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-card border border-border rounded-2xl p-3 sticky top-4">
        {groups.map(group => (
          <div key={group} className="mb-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest px-2 mb-1">{group}</p>
            {visibleReports.filter(r => r.group === group).map(r => (
              <button key={r.id} onClick={() => setActive(r.id)}
                className={`w-full text-right text-sm px-3 py-2 rounded-xl font-bold transition-all active:scale-[0.98] ${
                  active === r.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text hover:bg-background'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs text-text-muted">التقارير</span>
          <span className="text-text-muted">›</span>
          <span className="text-sm font-black text-text">{currentLabel}</span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          {renderContent()}
        </div>
      </main>
    </div>
    </AppShellLayout>
  );
};

export default ReportsDashboard;
