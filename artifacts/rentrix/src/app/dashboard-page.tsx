import { Building2, FileText, ReceiptText, WalletCards } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


export function DashboardPage() {
  const now = new Date();
  const { data } = useQuery({ queryKey: ['financial-summary', now.getMonth()+1, now.getFullYear()], queryFn: async () => { const { data, error } = await supabase.rpc('rpt_financial_summary', { month: now.getMonth() + 1, year: now.getFullYear() }); if (error) throw error; return data as { total_collected: number; total_overdue_invoices: number; total_expenses: number; net_revenue: number }; } });
  const cards = [
    { title: 'إجمالي التحصيل هذا الشهر', value: data?.total_collected ?? '—', icon: WalletCards, description: 'الدفعات المحصلة' },
    { title: 'إجمالي الفواتير المتأخرة', value: data?.total_overdue_invoices ?? '—', icon: ReceiptText, description: 'فواتير overdue' },
    { title: 'إجمالي المصروفات هذا الشهر', value: data?.total_expenses ?? '—', icon: Building2, description: 'المصاريف المسجلة' },
    { title: 'صافي الإيراد', value: data?.net_revenue ?? '—', icon: FileText, description: 'التحصيل - المصروفات' },
  ];
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-bold text-primary">نظام سطح مكتب · مكتب عقاري واحد</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight">بنية Rentrix الجديدة موحدة وآمنة وجاهزة للتوسع المرحلي.</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Supabase هو مصدر الحقيقة الوحيد، وDexie طبقة كاش ومزامنة مؤقتة فقط. جميع المستخدمين المصادقين مديرون.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => { const Icon = card.icon; return <Card key={card.title}><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle>{card.title}</CardTitle><CardDescription>{card.description}</CardDescription></div><Icon className="size-5 text-primary" /></CardHeader><CardContent><p className="text-3xl font-black">{card.value}</p></CardContent></Card>; })}
      </section>
    </div>
  );
}
