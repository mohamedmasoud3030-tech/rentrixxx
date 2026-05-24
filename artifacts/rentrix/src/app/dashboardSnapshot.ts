import { getTodayLocalDateString } from '@/features/financials/financials-date-utils';
import {
  getAgedReceivablesReport,
  getArrearsSummaryReport,
  getFinancialPeriodSummaryReport,
  getOverdueInvoicesReport,
  type AgedReceivablesBucket,
  type AgedReceivablesReport,
  type ArrearsSummaryReport,
  type FinancialPeriodSummaryReport,
  type OverdueInvoicesReport,
} from '@/features/financials/reports/financialReportsService';
import { listContracts, type ContractListItem } from '@/features/contracts/services/contractService';
import { getDashboardOverview, type DashboardOverview } from './dashboardService';

export type DashboardPeriod = {
  dateFrom: string;
  dateTo: string;
  asOf: string;
  month: number;
  year: number;
};

export type DashboardFinancialMetrics = {
  rentDue: number;
  collectedRent: number;
  outstandingRent: number;
  expenses: number;
  netPosition: number;
  invoicesCount: number;
  paymentsCount: number;
  expensesCount: number;
};

export type DashboardOperationalMetrics = {
  properties: number;
  units: number;
  activeContracts: number;
  expiringContracts30Days: number;
  vacantUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
};

export type DashboardArrearsMetrics = {
  totalOverdue: number;
  overdueInvoiceCount: number;
  averageDaysOverdue: number;
  over90Amount: number;
  over90InvoiceCount: number;
  overdueInvoices: OverdueInvoicesReport['rows'];
  agedReceivables: AgedReceivablesReport;
};

export type DashboardDeferredMetric = {
  key: 'recentPayments' | 'tenantStatement' | 'ledgerProfitLoss';
  reason: string;
};

export type DashboardSectionWarning = {
  section: "overview" | "periodSummary" | "overdueInvoices" | "arrearsSummary" | "agedReceivables" | "activeContracts";
  message: string;
};

export type DashboardSnapshot = {
  period: DashboardPeriod;
  overview: DashboardOverview;
  financial: DashboardFinancialMetrics;
  operational: DashboardOperationalMetrics;
  arrears: DashboardArrearsMetrics;
  activeContracts: ContractListItem[];
  deferred: DashboardDeferredMetric[];
  warnings: DashboardSectionWarning[];
};

export function createDashboardPeriod(date = new Date()): DashboardPeriod {
  const dateFrom = getTodayLocalDateString(new Date(date.getFullYear(), date.getMonth(), 1));
  const dateTo = getTodayLocalDateString(date);

  return {
    dateFrom,
    dateTo,
    asOf: dateTo,
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function calculateOccupancyRate(units: number, vacantUnits: number): number {
  if (units <= 0) return 0;
  const occupiedUnits = Math.max(0, units - Math.max(0, vacantUnits));
  return Math.round((occupiedUnits / units) * 100);
}

export function summarizeDashboardFinancialMetrics(periodSummary: FinancialPeriodSummaryReport): DashboardFinancialMetrics {
  return {
    rentDue: periodSummary.invoiced,
    collectedRent: periodSummary.paid,
    outstandingRent: periodSummary.outstanding,
    expenses: periodSummary.expenses,
    netPosition: periodSummary.netCash,
    invoicesCount: periodSummary.invoicesCount,
    paymentsCount: periodSummary.paymentsCount,
    expensesCount: periodSummary.expensesCount,
  };
}

export function summarizeDashboardOperationalMetrics(
  overview: DashboardOverview,
  activeContracts: ContractListItem[],
): DashboardOperationalMetrics {
  const units = overview.operational.units;
  const vacantUnits = overview.operational.vacantUnits;

  return {
    properties: overview.operational.properties,
    units,
    activeContracts: activeContracts.length || overview.operational.activeContracts,
    expiringContracts30Days: overview.operational.expiringContracts30Days,
    vacantUnits,
    occupiedUnits: Math.max(0, units - Math.max(0, vacantUnits)),
    occupancyRate: calculateOccupancyRate(units, vacantUnits),
  };
}

export function summarizeDashboardArrearsMetrics(params: {
  overdueInvoices: OverdueInvoicesReport;
  arrearsSummary: ArrearsSummaryReport;
  agedReceivables: AgedReceivablesReport;
}): DashboardArrearsMetrics {
  return {
    totalOverdue: params.overdueInvoices.totalOverdue,
    overdueInvoiceCount: params.overdueInvoices.invoiceCount,
    averageDaysOverdue: params.arrearsSummary.averageDaysOverdue,
    over90Amount: params.arrearsSummary.over90Amount,
    over90InvoiceCount: params.arrearsSummary.over90InvoiceCount,
    overdueInvoices: params.overdueInvoices.rows,
    agedReceivables: params.agedReceivables,
  };
}



function createZeroBucket(key: AgedReceivablesBucket['key'], label: string): AgedReceivablesBucket {
  return { key, label, total: 0, invoiceCount: 0 };
}

function createEmptyAgedReceivables(asOf: string): AgedReceivablesReport {
  return {
    asOf,
    buckets: {
      current: createZeroBucket('current', 'Current / not overdue'),
      days_1_30: createZeroBucket('days_1_30', '1-30 days'),
      days_31_60: createZeroBucket('days_31_60', '31-60 days'),
      days_61_90: createZeroBucket('days_61_90', '61-90 days'),
      days_90_plus: createZeroBucket('days_90_plus', '90+ days'),
    },
    totalOutstanding: 0,
    totalOverdue: 0,
    rows: [],
  };
}

const dashboardDeferredMetrics: DashboardDeferredMetric[] = [
  {
    key: 'recentPayments',
    reason: 'Recent payment rows need a safe row-level payment context before dashboard display; no receipt/payment actions are added in Phase 5.2.',
  },
  {
    key: 'tenantStatement',
    reason: 'Tenant statement behavior belongs to later Tenant/Reports phases and must not be inferred from dashboard rows.',
  },
  {
    key: 'ledgerProfitLoss',
    reason: 'Accounting-grade profit/loss belongs to the later Accounting/Ledger phase; dashboard uses net cash/position from existing reports only.',
  },
];

export async function getDashboardSnapshot(date = new Date()): Promise<DashboardSnapshot> {
  const period = createDashboardPeriod(date);
  const periodFilters = { dateFrom: period.dateFrom, dateTo: period.dateTo };
  const arrearsFilters = { asOf: period.asOf };

  const warnings: DashboardSectionWarning[] = [];

  const [
    overviewResult,
    periodSummaryResult,
    overdueInvoicesResult,
    arrearsSummaryResult,
    agedReceivablesResult,
    activeContractsResult,
  ] = await Promise.allSettled([
    getDashboardOverview(date),
    getFinancialPeriodSummaryReport(periodFilters),
    getOverdueInvoicesReport(arrearsFilters),
    getArrearsSummaryReport(arrearsFilters),
    getAgedReceivablesReport(arrearsFilters),
    listContracts({ status: 'active' }),
  ]);

  const warn = (section: DashboardSectionWarning['section'], result: PromiseSettledResult<unknown>) => {
    if (result.status === 'fulfilled') return;
    const message = result.reason instanceof Error ? result.reason.message : `${section} failed`;
    warnings.push({ section, message });
    console.error('[dashboard] section failed', { section, message });
  };

  warn('overview', overviewResult);
  warn('periodSummary', periodSummaryResult);
  warn('overdueInvoices', overdueInvoicesResult);
  warn('arrearsSummary', arrearsSummaryResult);
  warn('agedReceivables', agedReceivablesResult);
  warn('activeContracts', activeContractsResult);

  const overview: DashboardOverview = overviewResult.status === 'fulfilled'
    ? overviewResult.value
    : {
        financial: { total_collected: 0, total_overdue_invoices: 0, total_expenses: 0, net_revenue: 0 },
        operational: {
          properties: 0,
          units: 0,
          activeContracts: 0,
          expiringContracts30Days: 0,
          vacantUnits: 0,
          overdueInvoices: 0,
        },
      };

  const periodSummary: FinancialPeriodSummaryReport = periodSummaryResult.status === 'fulfilled'
    ? periodSummaryResult.value
    : {
        invoiced: 0,
        paid: 0,
        outstanding: 0,
        expenses: 0,
        netCash: 0,
        invoicesCount: 0,
        paymentsCount: 0,
        expensesCount: 0,
      };

  const overdueInvoices: OverdueInvoicesReport = overdueInvoicesResult.status === 'fulfilled'
    ? overdueInvoicesResult.value
    : { asOf: period.asOf, rows: [], totalOverdue: 0, invoiceCount: 0 };

  const arrearsSummary: ArrearsSummaryReport = arrearsSummaryResult.status === 'fulfilled'
    ? arrearsSummaryResult.value
    : { asOf: period.asOf, totalOverdue: 0, overdueInvoiceCount: 0, averageDaysOverdue: 0, over90Amount: 0, over90InvoiceCount: 0 };

  const agedReceivables: AgedReceivablesReport = agedReceivablesResult.status === 'fulfilled'
    ? agedReceivablesResult.value
    : createEmptyAgedReceivables(period.asOf);

  const activeContracts: ContractListItem[] = activeContractsResult.status === 'fulfilled' ? activeContractsResult.value : [];

  return {
    period,
    overview,
    financial: summarizeDashboardFinancialMetrics(periodSummary),
    operational: summarizeDashboardOperationalMetrics(overview, activeContracts),
    arrears: summarizeDashboardArrearsMetrics({ overdueInvoices, arrearsSummary, agedReceivables }),
    activeContracts,
    deferred: dashboardDeferredMetrics,
    warnings,
  };
}
