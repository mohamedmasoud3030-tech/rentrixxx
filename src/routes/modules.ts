export const ROUTES = {
  dashboard: '/',
  properties: '/properties',
  tenants: '/tenants',
  owners: '/owners',
  ownerHub: (ownerId: string) => `/owners/${ownerId}/hub`,
  contracts: '/contracts',
  maintenance: '/maintenance',
  financialBase: '/financial',
  reports: '/reports',
  leads: '/leads',
  communication: '/communication',
  lands: '/lands',
  commissions: '/commissions',
  // Users route: intentional sub-module — see docs/architecture/ADR-001
  settings: '/settings',
  auditLog: '/audit-log',
  smartAssistant: '/smart-assistant',
} as const;

export const FINANCIAL_ROUTES = {
  invoices: '/financial/invoices',
  payments: '/financial/payments',
  expenses: '/financial/expenses',
  receipts: '/financial/receipts',
  arrears: '/financial/arrears',
  maintenance: '/financial/maintenance',
  gl: '/financial/gl',
  accounting: '/financial/accounting',
} as const;

export const LEGACY_FINANCIAL_ALIASES: Record<string, string> = {
  '/finance': FINANCIAL_ROUTES.invoices,
  '/finance/invoices': FINANCIAL_ROUTES.invoices,
  '/finance/financials': FINANCIAL_ROUTES.receipts,
  '/finance/payments': FINANCIAL_ROUTES.payments,
  '/finance/expenses': FINANCIAL_ROUTES.expenses,
  '/finance/receipts': FINANCIAL_ROUTES.receipts,
  '/finance/arrears': FINANCIAL_ROUTES.arrears,
  '/finance/maintenance': FINANCIAL_ROUTES.maintenance,
  '/finance/gl': FINANCIAL_ROUTES.gl,
  '/finance/accounting': FINANCIAL_ROUTES.accounting,
};
