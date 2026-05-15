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

const dashboardWindowDays = 30;

function readCount({ count, error }: CountResponse) {
  if (error) throw error;
  return count ?? 0;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function countProperties() {
  return readCount(
    await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
  );
}

async function countUnits() {
  return readCount(
    await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
  );
}

async function countActiveContracts() {
  return readCount(
    await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('deleted_at', null),
  );
}

async function countExpiringContracts30Days(date: Date) {
  return readCount(
    await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('end_date', toDateInputValue(date))
      .lte('end_date', toDateInputValue(addDays(date, dashboardWindowDays)))
      .is('deleted_at', null),
  );
}

async function countVacantUnits() {
  return readCount(
    await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'available')
      .is('deleted_at', null),
  );
}

async function countOverdueInvoices() {
  return readCount(
    await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'overdue')
      .is('deleted_at', null),
  );
}

export async function getDashboardOverview(date = new Date()): Promise<DashboardOverview> {
  const [financialResp, properties, units, activeContracts, expiringContracts30Days, vacantUnits, overdueInvoices] = await Promise.all([
    supabase.rpc('rpt_financial_summary', {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
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
