import { supabase } from '@/integrations/supabase/client';

export type DashboardFinancialSummary = {
  total_collected: number;
  total_overdue_invoices: number;
  total_expenses: number;
  net_revenue: number;
};

export type DashboardOperationalKpis = {
  properties: number;
  units: number;
  activeContracts: number;
  vacantUnits: number;
  overdueInvoices: number;
};

export type DashboardOverview = {
  financial: DashboardFinancialSummary;
  operational: DashboardOperationalKpis;
};

async function countRows(table: 'properties' | 'units' | 'contracts' | 'invoices', filters?: (query: any) => any) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filters) query = filters(query);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardOverview(date = new Date()): Promise<DashboardOverview> {
  const [financialResp, properties, units, activeContracts, vacantUnits, overdueInvoices] = await Promise.all([
    supabase.rpc('rpt_financial_summary', {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    }),
    countRows('properties'),
    countRows('units'),
    countRows('contracts', (query) => query.eq('status', 'active').is('deleted_at', null)),
    countRows('units', (query) => query.eq('status', 'available')),
    countRows('invoices', (query) => query.eq('status', 'overdue')),
  ]);

  if (financialResp.error) throw financialResp.error;

  const financial = financialResp.data as DashboardFinancialSummary | null;

  return {
    financial: {
      total_collected: Number(financial?.total_collected ?? 0),
      total_overdue_invoices: Number(financial?.total_overdue_invoices ?? 0),
      total_expenses: Number(financial?.total_expenses ?? 0),
      net_revenue: Number(financial?.net_revenue ?? 0),
    },
    operational: {
      properties,
      units,
      activeContracts,
      vacantUnits,
      overdueInvoices,
    },
  };
}
