import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContracts } from '@/features/contracts/useContracts';
import {
  useDailyCollectionReport,
  useExpenseBreakdownReport,
  useFinancialCashflowReport,
  useOverdueInvoicesReport,
} from '@/features/financials/reports/useFinancialReports';
import { buildExpenseBreakdownRows, buildPaymentsTrendRows } from './reports-page.helpers';

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {});
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ReportsPage() {
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const financialFilters = useMemo(() => ({ dateFrom: from, dateTo: to }), [from, to]);
  const arrearsFilters = useMemo(() => ({ asOf: to }), [to]);

  const financialCashflowQuery = useFinancialCashflowReport(financialFilters);
  const dailyCollectionQuery = useDailyCollectionReport(financialFilters);
  const expenseBreakdownQuery = useExpenseBreakdownReport(financialFilters);
  const overdueInvoicesQuery = useOverdueInvoicesReport(arrearsFilters);
  const contractsQuery = useContracts({ status: 'all' });

  const financial = financialCashflowQuery.data?.rows ?? [];
  const expenseBreakdown = buildExpenseBreakdownRows(expenseBreakdownQuery.data);
  const contracts = useMemo(() => {
    const today = new Date();
    const in30 = new Date();
    in30.setDate(today.getDate() + 30);
    let active = 0;
    let expiring = 0;
    let expired = 0;

    for (const contract of contractsQuery.data ?? []) {
      const end = new Date(contract.end_date);
      if (contract.status === 'active') active++;
      if (end < today) expired++;
      else if (end <= in30) expiring++;
    }

    return [
      { name: 'نشط', value: active },
      { name: 'ينتهي خلال 30 يوم', value: expiring },
      { name: 'منتهي', value: expired },
    ];
  }, [contractsQuery.data]);
  const paymentsTrend = useMemo(
    () => buildPaymentsTrendRows({ dailyCollections: dailyCollectionQuery.data?.rows, overdueInvoices: overdueInvoicesQuery.data?.rows }),
    [dailyCollectionQuery.data?.rows, overdueInvoicesQuery.data?.rows],
  );

  const isLoading = financialCashflowQuery.isLoading
    || dailyCollectionQuery.isLoading
    || expenseBreakdownQuery.isLoading
    || overdueInvoicesQuery.isLoading
    || contractsQuery.isLoading;
  const isError = financialCashflowQuery.isError
    || dailyCollectionQuery.isError
    || expenseBreakdownQuery.isError
    || overdueInvoicesQuery.isError
    || contractsQuery.isError;


  return <div className='space-y-6' dir='rtl'>
    <div className='flex gap-2'><input type='date' value={from} onChange={(e)=>setFrom(e.target.value)} className='rounded border px-2'/><input type='date' value={to} onChange={(e)=>setTo(e.target.value)} className='rounded border px-2'/></div>
    {isError ? <Card><CardContent className='p-4 text-sm text-red-600'>تعذر تحميل التقارير</CardContent></Card> : null}
    {isLoading ? <Card><CardContent className='p-4 text-sm text-muted-foreground'>جاري تحميل التقارير...</CardContent></Card> : null}
    <Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>التقرير المالي</CardTitle><Button onClick={() => downloadCsv('financial-report.csv', financial)}>تصدير CSV</Button></CardHeader><CardContent className='h-80'><ResponsiveContainer><BarChart data={financial}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='month'/><YAxis/><Tooltip/><Legend/><Bar dataKey='revenue' name='الإيرادات' fill='#10b981'/><Bar dataKey='expenses' name='المصاريف' fill='#ef4444'/></BarChart></ResponsiveContainer></CardContent></Card>
    <Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>تقرير المصاريف</CardTitle><Button onClick={() => downloadCsv('expense-report.csv', expenseBreakdown)}>تصدير CSV</Button></CardHeader><CardContent className='h-80'><ResponsiveContainer><BarChart data={expenseBreakdown}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='name'/><YAxis/><Tooltip/><Legend/><Bar dataKey='value' name='المصاريف' fill='#f59e0b'/></BarChart></ResponsiveContainer></CardContent></Card>
    <Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>تقرير العقود</CardTitle><Button onClick={() => downloadCsv('contracts-report.csv', contracts)}>تصدير CSV</Button></CardHeader><CardContent className='h-80'><ResponsiveContainer><BarChart data={contracts}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='name'/><YAxis/><Tooltip/><Bar dataKey='value' fill='#8b5cf6'/></BarChart></ResponsiveContainer></CardContent></Card>
    <Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>تقرير المدفوعات والذمم المتأخرة</CardTitle><Button onClick={() => downloadCsv('payments-report.csv', paymentsTrend)}>تصدير CSV</Button></CardHeader><CardContent className='h-80'><ResponsiveContainer><LineChart data={paymentsTrend}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='month'/><YAxis/><Tooltip/><Legend/><Line dataKey='collections' name='التحصيل' stroke='#16a34a'/><Line dataKey='overdue' name='المتأخرات' stroke='#dc2626'/></LineChart></ResponsiveContainer></CardContent></Card>
  </div>;
}
