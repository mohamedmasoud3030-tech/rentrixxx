import {
  Building2,
  FileText,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


export function DashboardPage() {
  const now = new Date();
  const { data } = useQuery({ queryKey: ['financial-summary', now.getMonth()+1, now.getFullYear()], queryFn: async () => { const { data, error } = await supabase.rpc('rpt_financial_summary', { month: now.getMonth() + 1, year: now.getFullYear() }); if (error) throw error; return data as { total_collected: number; total_overdue_invoices: number; total_expenses: number; net_revenue: number }; } });

  const { data: kpis } = useQuery({
    queryKey: ['operational-kpis'],
    queryFn: async () => {
      const propertiesResp = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true });
      if (propertiesResp.error) throw propertiesResp.error;

      const unitsResp = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true });
      if (unitsResp.error) throw unitsResp.error;

      const activeContractsResp = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      if (activeContractsResp.error) throw activeContractsResp.error;

      const overdueInvoicesResp = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'overdue');
      if (overdueInvoicesResp.error) throw overdueInvoicesResp.error;

      return {
        properties: propertiesResp.count ?? 0,
        units: unitsResp.count ?? 0,
        activeContracts: activeContractsResp.count ?? 0,
        overdueInvoices: overdueInvoicesResp.count ?? 0,
      };
    },
  });

  const cards = [
    {
      title: 'إجمالي التحصيل هذا الشهر',
      value: data?.total_collected ?? '—',
      icon: WalletCards,
      description: 'الدفعات المحصلة',
    },
    {
      title: 'إجمالي الفواتير المتأخرة',
      value: data?.total_overdue_invoices ?? '—',
      icon: ReceiptText,
      description: 'فواتير overdue',
    },
    {
      title: 'إجمالي المصروفات هذا الشهر',
      value: data?.total_expenses ?? '—',
      icon: Building2,
      description: 'المصاريف المسجلة',
    },
    {
      title: 'صافي الإيراد',
      value: data?.net_revenue ?? '—',
      icon: FileText,
      description: 'التحصيل - المصروفات',
    },
  ];

  const kpiCards = [
    {
      title: 'العقارات',
      value: kpis?.properties ?? '—',
      icon: Building2,
      description: 'إجمالي عدد العقارات',
    },
    {
      title: 'الوحدات',
      value: kpis?.units ?? '—',
      icon: Building2,
      description: 'إجمالي عدد الوحدات',
    },
    {
      title: 'العقود النشطة',
      value: kpis?.activeContracts ?? '—',
      icon: FileText,
      description: 'عقود سارية المفعول',
    },
    {
      title: 'الفواتير المتأخرة',
      value: kpis?.overdueInvoices ?? '—',
      icon: ReceiptText,
      description: 'فواتير متأخرة السداد',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
                <Icon className="size-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
                <Icon className="size-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
