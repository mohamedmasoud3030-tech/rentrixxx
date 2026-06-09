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

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthRange(date: Date): { p_from: string; p_to: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { p_from: toISODate(firstDay), p_to: toISODate(lastDay) };
}

async function countRows(
  table: CountTable,
  buildQuery?: (query: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>,
) {
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
  return countRows('contracts', (query) => query.eq('status', 'ACTIVE'));
}

function countExpiringContracts30Days(date: Date) {
  return countRows('contracts', (query) =>
    query
      .eq('status', 'ACTIVE')
      .gte('end_date', toISODate(date))
      .lte('end_date', toISODate(addDays(date, dashboardWindowDays))),
  );
}

function countVacantUnits() {
  return countRows('units', (query) => query.eq('status', 'available'));
}

function countOverdueInvoices() {
  return countRows('invoices', (query) => query.eq('status', 'OVERDUE'));
}

export async function getDashboardOverview(date = new Date()): Promise<DashboardOverview> {
  const { p_from, p_to } = getMonthRange(date);

  const [financialResp, properties, units, activeContracts, expiringContracts30Days, vacantUnits, overdueInvoices] =
    await Promise.all([
      supabase.rpc('rpt_financial_summary', { p_from, p_to }),
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
      total_collected: Number(financial?.collected ?? 0),
      total_overdue_invoices: Number(financial?.overdue_amount ?? 0),
      total_expenses: Number(financial?.expenses ?? 0),
      net_revenue: Number(financial?.net ?? 0),
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
