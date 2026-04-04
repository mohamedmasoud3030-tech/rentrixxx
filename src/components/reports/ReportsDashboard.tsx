import React, { Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useApp } from '../../contexts/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LineChart, Line, PieChart, Pie, Legend
} from 'recharts';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { TableShell, Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from '../ui/Table';

// ─── Types ───────────────────────────────────────────────────
type ReportId =
  | 'summary' | 'income_statement' | 'trial_balance' | 'balance_sheet'
  | 'aged_receivables' | 'overdue' | 'daily_collection'
  | 'rent_roll' | 'owner_statement' | 'tenant_statement';

interface DateRange { from: string; to: string }
type LoadState = 'idle' | 'loading' | 'done' | 'error';
interface DashboardProps {
  currency?: string;
  owners?: any[];
  contracts?: any[];
  startDate: string;
  endDate: string;
}
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

// ─── Loading spinner ──────────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
  </div>
);

const ReportsSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 w-44 rounded-lg bg-background" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="h-24 rounded-xl bg-background" />
      <div className="h-24 rounded-xl bg-background" />
      <div className="h-24 rounded-xl bg-background" />
    </div>
    <div className="h-72 rounded-xl bg-background" />
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────────
const KPI: React.FC<{ label: string; value: string; sub?: string; color?: string }> = ({ label, value, sub, color = 'text-primary' }) => (
  <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
    <p className="text-xs text-text-muted font-medium">{label}</p>
    <p className={`text-xl font-black font-mono ${color}`} dir="ltr">{value}</p>
    {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
  </div>
);

// ─── Section Header ───────────────────────────────────────────
const SH: React.FC<{ title: string; onPrint?: () => void }> = ({ title, onPrint }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-black text-base text-text">{title}</h3>
    {onPrint && (
      <button onClick={onPrint}
        className="text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition font-bold">
        طباعة / PDF
      </button>
    )}
  </div>
);

// ─── Table wrapper ────────────────────────────────────────────
const Tbl: React.FC<{ heads: string[]; rows: React.ReactNode[][]; footer?: React.ReactNode[] }> = ({ heads, rows, footer }) => (
  <TableShell>
    <Table>
      <TableHead>
        <TableRow>{heads.map((h, i) => <TableHeadCell key={i}>{h}</TableHeadCell>)}</TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            {r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={heads.length} className="py-10 text-center text-text-muted">لا توجد بيانات</TableCell></TableRow>
        )}
      </TableBody>
      {footer && (
        <tfoot className="font-black text-text">
          <TableRow>{footer.map((c, i) => <TableCell key={i}>{c}</TableCell>)}</TableRow>
        </tfoot>
      )}
    </Table>
  </TableShell>
);

// ─── Badge ─────────────────────────────────────────────────────
const BadgeByAge: React.FC<{ days: number }> = ({ days }) => {
  const variant = days > 60 ? 'danger' : days > 30 ? 'warning' : 'info';
  return <Badge variant={variant}>{days} يوم</Badge>;
};

// ─── Date Range Picker ────────────────────────────────────────
const DatePicker: React.FC<{ range: DateRange; onChange: (r: DateRange) => void; onGo: () => void; loading: boolean }> = ({ range, onChange, onGo, loading }) => (
  <div className="flex flex-wrap items-center gap-2 p-4 bg-card border border-border rounded-2xl">
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-muted font-bold">من</label>
      <Input type="date" value={range.from} onChange={e => onChange({ ...range, from: e.target.value })} className="text-sm min-h-[2.5rem]"/>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-muted font-bold">إلى</label>
      <Input type="date" value={range.to} onChange={e => onChange({ ...range, to: e.target.value })} className="text-sm min-h-[2.5rem]"/>
    </div>
    <div className="flex gap-1">
      {MONTH_PRESETS.map(p => (
        <Button key={p.label} onClick={() => { onChange({ from: p.from(), to: p.to() }); }}
          variant="secondary" className="text-xs min-h-[2.25rem] px-3">
          {p.label}
        </Button>
      ))}
    </div>
    <Button onClick={onGo} disabled={loading} className="mr-auto px-5">
      {loading ? '...' : 'عرض'}
    </Button>
  </div>
);

// ════════════════════════════════════════════════════════════════
// REPORT VIEWS
// ════════════════════════════════════════════════════════════════

// 1. ملخص مالي
const SummaryView: React.FC<{ currency: string; defaultRange: DateRange }> = ({ currency, defaultRange }) => {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await supabase.rpc('rpt_financial_summary', { p_from: range.from, p_to: range.to });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [range]);

  useEffect(() => { setRange(defaultRange); }, [defaultRange.from, defaultRange.to]);
  useEffect(() => { load(); }, []);

  const occupancy = data ? [
    { name: 'مشغول', value: data.occupied_units },
    { name: 'شاغر',  value: data.total_units - data.occupied_units },
  ] : [];

  return (
    <div className="space-y-5">
      <DatePicker range={range} onChange={setRange} onGo={load} loading={state === 'loading'}/>
      {state === 'loading' && <Spinner/>}
      {state === 'done' && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="إجمالي المحصّل"    value={fmt(data.collected, currency)}   color="text-emerald-600"/>
            <KPI label="إجمالي المصروفات"  value={fmt(data.expenses, currency)}    color="text-red-500"/>
            <KPI label="صافي الفترة"        value={fmt(data.net, currency)}         color={data.net >= 0 ? 'text-primary' : 'text-red-600'}/>
            <KPI label="المتأخرات"          value={fmt(data.overdue_amount, currency)} sub={`${data.overdue_count} فاتورة`} color="text-orange-600"/>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KPI label="العقود النشطة"   value={String(data.active_contracts)}/>
            <KPI label="نسبة الإشغال"    value={`${data.occupancy_rate}%`} sub={`${data.occupied_units} / ${data.total_units} وحدة`}/>
            <KPI label="فواتير معلّقة"   value={fmt(data.pending_invoices, currency)} color="text-yellow-600"/>
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
      {state === 'error' && <p className="text-red-500 text-sm text-center py-8">حدث خطأ في تحميل البيانات</p>}
    </div>
  );
};

// 2. قائمة الدخل
const IncomeView: React.FC<{ currency: string; defaultRange: DateRange }> = ({ currency, defaultRange }) => {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await supabase.rpc('rpt_income_statement', { p_from: range.from, p_to: range.to });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [range]);

  useEffect(() => { setRange(defaultRange); }, [defaultRange.from, defaultRange.to]);
  useEffect(() => { load(); }, []);

  const chartData = data ? [
    { name: 'الإيرادات', amount: data.total_revenue, fill: '#10b981' },
    { name: 'المصروفات', amount: data.total_expense, fill: '#ef4444' },
    { name: 'الصافي',    amount: data.net_income,    fill: data.net_income >= 0 ? '#3b82f6' : '#f97316' },
  ] : [];

  return (
    <div className="space-y-5">
      <DatePicker range={range} onChange={setRange} onGo={load} loading={state === 'loading'}/>
      {state === 'loading' && <Spinner/>}
      {state === 'done' && data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPI label="إجمالي الإيرادات" value={fmt(data.total_revenue, currency)} color="text-emerald-600"/>
            <KPI label="إجمالي المصروفات" value={fmt(data.total_expense, currency)} color="text-red-500"/>
            <KPI label="صافي الدخل"        value={fmt(data.net_income, currency)}    color={data.net_income >= 0 ? 'text-primary' : 'text-red-600'}/>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 11 }}/>
                <Tooltip formatter={(v: any) => fmt(Number(v), currency)}/>
                <Bar dataKey="amount" radius={[8,8,0,0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <SH title="الإيرادات"/>
              <Tbl
                heads={['رقم', 'الحساب', 'المبلغ']}
                rows={(data.revenues || []).map((r: any) => [r.no, r.name, <span dir="ltr" className="font-mono text-emerald-700">{fmt(r.balance, currency)}</span>])}
                footer={['','المجموع', <span dir="ltr" className="font-mono text-emerald-700">{fmt(data.total_revenue, currency)}</span>]}
              />
            </div>
            <div>
              <SH title="المصروفات"/>
              <Tbl
                heads={['رقم', 'الحساب', 'المبلغ']}
                rows={(data.expenses || []).map((r: any) => [r.no, r.name, <span dir="ltr" className="font-mono text-red-600">{fmt(r.balance, currency)}</span>])}
                footer={['','المجموع', <span dir="ltr" className="font-mono text-red-600">{fmt(data.total_expense, currency)}</span>]}
              />
            </div>
          </div>
        </>
      )}
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
    const { data: d, error } = await supabase.rpc('rpt_trial_balance', { p_as_of: asOf });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [asOf]);

  useEffect(() => { load(); }, []);

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
      {state === 'loading' && <Spinner/>}
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
    </div>
  );
};

// 4. أعمار الديون
const AgedReceivablesView: React.FC<{ currency: string; defaultRange: DateRange }> = ({ currency, defaultRange }) => {
  const [asOf, setAsOf] = useState(defaultRange.to);
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await supabase.rpc('rpt_aged_receivables', { p_as_of: asOf });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [asOf]);

  useEffect(() => { setAsOf(defaultRange.to); }, [defaultRange.to]);
  useEffect(() => { load(); }, []);

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
      {state === 'loading' && <Spinner/>}
      {state === 'done' && data && (
        <>
          <div className="grid grid-cols-5 gap-2">
            {buckets.map((b, i) => (
              <KPI key={b.name} label={b.name} value={fmt(b.value, currency)}
                color={i === 0 ? 'text-emerald-600' : i === 1 ? 'text-blue-600' : i === 2 ? 'text-yellow-600' : 'text-red-600'}/>
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
                  {buckets.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]}/>)}
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
    const { data: d, error } = await supabase.rpc('rpt_overdue_invoices', { p_as_of: today() });
    if (error) { setState('error'); return; }
    setData(d as OverdueReportData); setState('done');
  }, []);

  useEffect(() => { load(); }, []);

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
      {state === 'loading' && <Spinner/>}
      {state === 'done' && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="إجمالي المتأخرات"  value={fmt(data.total, currency)} color="text-red-600"/>
            <KPI label="عدد الفواتير"       value={String(data.count)}/>
            <KPI label="المتأخرون > 90 يوم" value={String(overdue90Count)} color="text-red-700"/>
            <KPI label="متوسط أيام التأخر"  value={averageOverdueDays !== null ? `${averageOverdueDays} يوم` : '—'}/>
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
              <BadgeByAge days={r.days_overdue}/>,
              <span dir="ltr" className="font-mono font-bold text-red-600">{fmt(r.remaining, currency)}</span>,
            ])}
          />
        </>
      )}
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
    const { data: d, error } = await supabase.rpc('rpt_tenant_statement', { p_contract_id: contractId });
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
      {state === 'loading' && <Spinner/>}
      {state === 'done' && data && !data.error && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPI label="المستأجر"   value={data.tenant_name}/>
            <KPI label="الوحدة"     value={`${data.property_name} / ${data.unit_name}`}/>
            <KPI label="الرصيد الإجمالي" value={fmt(data.final_balance, currency)}
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
    </div>
  );
};

// 7. كشف حساب المالك
const OwnerStatementView: React.FC<{ currency: string; owners: any[]; defaultRange: DateRange }> = ({ currency, owners, defaultRange }) => {
  const [ownerId, setOwnerId] = useState('');
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    if (!ownerId) return;
    setState('loading');
    const { data: d, error } = await supabase.rpc('rpt_owner_statement', { p_owner_id: ownerId, p_from: range.from, p_to: range.to });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [ownerId, range]);

  useEffect(() => { setRange(defaultRange); }, [defaultRange.from, defaultRange.to]);

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
      {state === 'loading' && <Spinner/>}
      {state === 'done' && data && !data.error && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPI label="الإجمالي المحصّل" value={fmt(data.total_gross, currency)} color="text-emerald-600"/>
            <KPI label="الاستقطاعات"      value={fmt(data.total_deductions, currency)} color="text-red-500"/>
            <KPI label="صافي المالك"      value={fmt(data.total_net, currency)} color="text-primary"/>
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
    </div>
  );
};

// 8. التحصيل اليومي
const DailyCollectionView: React.FC<{ currency: string; defaultRange: DateRange }> = ({ currency, defaultRange }) => {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await supabase.rpc('rpt_daily_collection', { p_from: range.from, p_to: range.to });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, [range]);

  useEffect(() => { setRange(defaultRange); }, [defaultRange.from, defaultRange.to]);
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <DatePicker range={range} onChange={setRange} onGo={load} loading={state === 'loading'}/>
      {state === 'loading' && <Spinner/>}
      {state === 'done' && data && (
        <>
          <KPI label="إجمالي التحصيل" value={fmt(data.total, currency)} color="text-emerald-600"/>
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
    </div>
  );
};

// 9. قائمة الإيجارات
const RentRollView: React.FC<{ currency: string }> = ({ currency }) => {
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<LoadState>('idle');

  const load = useCallback(async () => {
    setState('loading');
    const { data: d, error } = await supabase.rpc('rpt_rent_roll', { p_as_of: today() });
    if (error) { setState('error'); return; }
    setData(d); setState('done');
  }, []);

  useEffect(() => { load(); }, []);

  const rows = data?.rows || [];
  const totalRent = rows.filter((r:any) => r.tenant_name).reduce((s:number, r:any) => s + r.rent_amount, 0);

  return (
    <div className="space-y-4">
      {state === 'loading' && <Spinner/>}
      {state === 'done' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KPI label="إجمالي الوحدات"  value={String(rows.length)}/>
            <KPI label="وحدات مشغولة"    value={String(rows.filter((r:any) => r.tenant_name).length)} color="text-emerald-600"/>
            <KPI label="إيجار شهري"      value={fmt(totalRent, currency)} color="text-primary"/>
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
];

const DEFAULT_REPORT_ID: ReportId = 'summary';
const REPORT_IDS = new Set<ReportId>(REPORTS.map((report) => report.id));
const parseReportId = (value: string | null): ReportId =>
  REPORT_IDS.has(value as ReportId) ? (value as ReportId) : DEFAULT_REPORT_ID;

const ReportsDashboard: React.FC<DashboardProps> = ({ currency: currencyProp, owners: ownersProp, contracts: contractsProp, startDate, endDate }) => {
  const { settings, db } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = currencyProp ?? settings.operational?.currency ?? 'OMR';
  const owners = ownersProp ?? (db.owners || []);
  const contracts = contractsProp ?? (db.contracts || []);
  const requestedReport = parseReportId(searchParams.get('tab'));
  const [active, setActive] = useState<ReportId>(requestedReport);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const globalRange = useMemo<DateRange>(() => ({ from: startDate, to: endDate }), [startDate, endDate]);

  useEffect(() => {
    if (requestedReport !== active) {
      setActive(requestedReport);
    }
  }, [requestedReport, active]);

  useEffect(() => {
    setDashboardLoading(true);
    const timer = setTimeout(() => setDashboardLoading(false), 250);
    return () => clearTimeout(timer);
  }, [active, startDate, endDate]);

  const groups = Array.from(new Set(REPORTS.map(r => r.group)));
  const handleTabChange = (next: ReportId) => {
    setActive(next);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };

  const renderContent = () => {
    switch (active) {
      case 'summary':          return <SummaryView currency={currency} defaultRange={globalRange}/>;
      case 'income_statement': return <IncomeView currency={currency} defaultRange={globalRange}/>;
      case 'trial_balance':    return <TrialBalanceView currency={currency}/>;
      case 'aged_receivables': return <AgedReceivablesView currency={currency} defaultRange={globalRange}/>;
      case 'overdue':          return <OverdueView currency={currency}/>;
      case 'tenant_statement': return <TenantStatementView currency={currency} contracts={contracts}/>;
      case 'owner_statement':  return <OwnerStatementView currency={currency} owners={owners} defaultRange={globalRange}/>;
      case 'daily_collection': return <DailyCollectionView currency={currency} defaultRange={globalRange}/>;
      case 'rent_roll':        return <RentRollView currency={currency}/>;
      case 'balance_sheet':    return <TrialBalanceView currency={currency}/>; // placeholder
      default:                 return null;
    }
  };

  const currentLabel = REPORTS.find(r => r.id === active)?.label || '';

  return (
    <div className="flex gap-5 items-start min-h-screen">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-card border border-border rounded-2xl p-3 sticky top-4">
        {groups.map(group => (
          <div key={group} className="mb-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest px-2 mb-1">{group}</p>
            {REPORTS.filter(r => r.group === group).map(r => (
              <button key={r.id} onClick={() => handleTabChange(r.id)}
                className={`w-full text-right text-sm px-3 py-2 rounded-xl font-bold transition-all ${
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
          <Suspense fallback={<ReportsSkeleton />}>{renderContent()}</Suspense>
        </div>
      </main>
    </div>
  );
};

export default ReportsDashboard;
