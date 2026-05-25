import { supabase } from '@/integrations/supabase/client';
import { getTodayLocalDateString } from '@/features/financials/financials-date-utils';

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
  expiringContracts30Days: number;
  vacantUnits: number;
  overdueInvoices: number;
};

export type DashboardOverview = {
  financial: DashboardFinancialSummary;
  operational: DashboardOperationalKpis;
};

type CountResponse = {
  count: number | null;
  error: { message: string } | null;
};

type CountTable = 'properties' | 'units' | 'contracts' | 'invoices';

const dashboardWindowDays = 30;

function readCount({ count, error }: CountResponse) {
  if (error) throw error;
  return count ?? 0;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function countRows(table: CountTable, buildQuery?: (query: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>) {
  const baseQuery = supabase.from(table).select('id', { count: 'exact', head: true }).is('deleted_at', null);
  const response = buildQuery ? await buildQuery(baseQuery) : await baseQuery;
  return readCount(response as CountResponse);
}

function countProperties() {
  return countRows('properties');
}

function countUnits() {
  return countRows('units');
}

function countActiveContracts() {
  return countRows('contracts', (query) => query.eq('status', 'active'));
}

function countExpiringContracts30Days(date: Date) {
  return countRows('contracts', (query) =>
    query
      .eq('status', 'active')
      .gte('end_date', getTodayLocalDateString(date))
      .lte('end_date', getTodayLocalDateString(addDays(date, dashboardWindowDays))),
  );
}

function countVacantUnits() {
  return countRows('units', (query) => query.eq('status', 'available'));
}

function countOverdueInvoices() {
  return countRows('invoices', (query) => query.eq('status', 'overdue'));
}

export async function getDashboardOverview(date = new Date()): Promise<DashboardOverview> {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const [financialResp, properties, units, activeContracts, expiringContracts30Days, vacantUnits, overdueInvoices] = await Promise.all([
    supabase.rpc('rpt_financial_summary', {
      p_from: getTodayLocalDateString(monthStart),
      p_to: getTodayLocalDateString(monthEnd),
    }),
    countProperties(),
    countUnits(),
    countActiveContracts(),
    countExpiringContracts30Days(date),
    countVacantUnits(),
    countOverdueInvoices(),
  ]);

  if (financialResp.error) throw financialResp.error;

  const financial = financialResp.data;

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
      expiringContracts30Days,
      vacantUnits,
      overdueInvoices,
    },
  };
}
