import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {});
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

export function ReportsPage() {
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({ queryKey: ['reports', from, to], queryFn: async () => {
    const [payments, expenses, units, contracts, invoices] = await Promise.all([
      supabase.from('payments').select('*').is('deleted_at', null).gte('payment_date', from).lte('payment_date', to),
      supabase.from('expenses').select('*').is('deleted_at', null).gte('expense_date', from).lte('expense_date', to),
      supabase.from('units').select('id,property_id,status').is('deleted_at', null),
      supabase.from('contracts').select('id,end_date,status').is('deleted_at', null),
      supabase.from('invoices').select('id,due_date,status,amount,paid_amount').is('deleted_at', null),
    ]);
    if (payments.error || expenses.error || units.error || contracts.error || invoices.error) throw new Error('تعذر تحميل التقارير');
    return { payments: payments.data ?? [], expenses: expenses.data ?? [], units: units.data ?? [], contracts: contracts.data ?? [], invoices: invoices.data ?? [] };
  } });

  const financial = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; expenses: number }>();
    for (const p of data?.payments ?? []) { const m = p.payment_date.slice(0, 7); map.set(m, { month: m, revenue: (map.get(m)?.revenue ?? 0) + p.amount, expenses: map.get(m)?.expenses ?? 0 }); }
    for (const e of data?.expenses ?? []) { const m = e.expense_date.slice(0, 7); map.set(m, { month: m, revenue: map.get(m)?.revenue ?? 0, expenses: (map.get(m)?.expenses ?? 0) + e.amount }); }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);
  const occupancy = useMemo(() => Object.entries((data?.units ?? []).reduce<Record<string, {property:string; occupied:number; vacant:number}>>((acc, u) => { const k = u.property_id; acc[k] ??= { property: k.slice(0,8), occupied: 0, vacant: 0 }; if (u.status === 'occupied') acc[k].occupied++; else acc[k].vacant++; return acc; }, {})).map(([,v]) => v), [data]);
  const contracts = useMemo(() => {
    const today = new Date(); const in30 = new Date(); in30.setDate(today.getDate() + 30);
    let active = 0; let expiring = 0; let expired = 0;
    for (const c of data?.contracts ?? []) { const end = new Date(c.end_date); if (c.status === 'active') active++; if (end < today) expired++; else if (end <= in30) expiring++; }
    return [{ name: 'نشط', value: active }, { name: 'ينتهي خلال 30 يوم', value: expiring }, { name: 'منتهي', value: expired }];
  }, [data]);
  const paymentsTrend = useMemo(() => {
    const map = new Map<string, { month: string; collections: number; overdue: number }>();
    for (const p of data?.payments ?? []) { const m = p.payment_date.slice(0, 7); map.set(m, { month: m, collections: (map.get(m)?.collections ?? 0) + p.amount, overdue: map.get(m)?.overdue ?? 0 }); }
    for (const i of data?.invoices ?? []) { if (i.status !== 'overdue') continue; const m = i.due_date.slice(0, 7); map.set(m, { month: m, collections: map.get(m)?.collections ?? 0, overdue: (map.get(m)?.overdue ?? 0) + (i.amount - i.paid_amount) }); }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  return <div className='space-y-6' dir='rtl'>
    <div className='flex gap-2'><input type='date' value={from} onChange={(e)=>setFrom(e.target.value)} className='rounded border px-2'/><input type='date' value={to} onChange={(e)=>setTo(e.target.value)} className='rounded border px-2'/></div>
    <Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>التقرير المالي</CardTitle><Button onClick={() => downloadCsv('financial-report.csv', financial)}>تصدير CSV</Button></CardHeader><CardContent className='h-80'><ResponsiveContainer><BarChart data={financial}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='month'/><YAxis/><Tooltip/><Legend/><Bar dataKey='revenue' name='الإيرادات' fill='#10b981'/><Bar dataKey='expenses' name='المصاريف' fill='#ef4444'/></BarChart></ResponsiveContainer></CardContent></Card>
    <Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>تقرير الإشغال</CardTitle><Button onClick={() => downloadCsv('occupancy-report.csv', occupancy)}>تصدير CSV</Button></CardHeader><CardContent className='h-80'><ResponsiveContainer><BarChart data={occupancy}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='property'/><YAxis/><Tooltip/><Legend/><Bar dataKey='occupied' name='مشغول' fill='#3b82f6'/><Bar dataKey='vacant' name='شاغر' fill='#f59e0b'/></BarChart></ResponsiveContainer></CardContent></Card>
    <Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>تقرير العقود</CardTitle><Button onClick={() => downloadCsv('contracts-report.csv', contracts)}>تصدير CSV</Button></CardHeader><CardContent className='h-80'><ResponsiveContainer><BarChart data={contracts}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='name'/><YAxis/><Tooltip/><Bar dataKey='value' fill='#8b5cf6'/></BarChart></ResponsiveContainer></CardContent></Card>
    <Card><CardHeader className='flex flex-row items-center justify-between'><CardTitle>تقرير المدفوعات والذمم المتأخرة</CardTitle><Button onClick={() => downloadCsv('payments-report.csv', paymentsTrend)}>تصدير CSV</Button></CardHeader><CardContent className='h-80'><ResponsiveContainer><LineChart data={paymentsTrend}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='month'/><YAxis/><Tooltip/><Legend/><Line dataKey='collections' name='التحصيل' stroke='#16a34a'/><Line dataKey='overdue' name='المتأخرات' stroke='#dc2626'/></LineChart></ResponsiveContainer></CardContent></Card>
  </div>;
}
