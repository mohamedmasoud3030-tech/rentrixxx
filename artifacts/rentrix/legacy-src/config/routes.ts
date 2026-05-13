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
