import {
  Bell,
  Building2,
  FileText,
  LayoutGrid,
  Settings,
  Users,
  UserCheck,
  WalletCards,
  BarChart2,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NAVIGATION_META } from '../../../config/navigationMeta';
import { FINANCIAL_ROUTES } from '../../../routes/modules';

export type SidebarBadgeKey =
  | 'expiringContracts'
  | 'overdueInvoices'
  | 'pendingNotifications';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  adminOnly?: boolean;
  badgeKey?: SidebarBadgeKey;
  children?: SidebarNavItem[];
}

export const LAST_FINANCE_TAB_KEY = 'rentrix:last-finance-tab';

const getDefaultFinancePath = () =>
  window.localStorage.getItem(LAST_FINANCE_TAB_KEY) || FINANCIAL_ROUTES.invoices;

const withMeta = (path: string) => ({
  label: NAVIGATION_META[path]?.titleAr ?? NAVIGATION_META[path]?.title ?? path,
  icon: NAVIGATION_META[path]?.icon,
  path,
});

export const createSidebarConfig = (): SidebarNavItem[] => {
  const financeRoot = getDefaultFinancePath();

  return [
    {
      id: 'dashboard',
      ...withMeta('/'),
      icon: LayoutGrid,
    },
    {
      id: 'owners',
      ...withMeta('/owners'),
      icon: UserCheck,
    },
    {
      id: 'tenants',
      ...withMeta('/tenants'),
      icon: Users,
    },
    {
      id: 'contracts',
      ...withMeta('/contracts'),
      icon: FileText,
      badgeKey: 'expiringContracts',
    },
    {
      id: 'properties',
      ...withMeta('/properties'),
      icon: Building2,
    },
    {
      id: 'financial',
      label: NAVIGATION_META['/financial'].titleAr,
      icon: WalletCards,
      path: financeRoot,
      badgeKey: 'overdueInvoices',
      children: [
        { id: 'financial-invoices', ...withMeta(FINANCIAL_ROUTES.invoices) },
        { id: 'financial-payments', ...withMeta(FINANCIAL_ROUTES.payments) },
        { id: 'financial-expenses', ...withMeta(FINANCIAL_ROUTES.expenses) },
        { id: 'financial-receipts', ...withMeta(FINANCIAL_ROUTES.receipts) },
        { id: 'financial-arrears', ...withMeta(FINANCIAL_ROUTES.arrears), path: `${FINANCIAL_ROUTES.invoices}?status=OVERDUE` },
      ],
    },
    {
      id: 'reports',
      ...withMeta('/reports'),
      icon: BarChart2,
    },
    {
      id: 'communication',
      ...withMeta('/communication'),
      icon: Bell,
      badgeKey: 'pendingNotifications',
    },
    {
      id: 'maintenance',
      ...withMeta('/maintenance'),
      icon: Wrench,
    },
    {
      id: 'settings',
      ...withMeta('/settings'),
      icon: Settings,
      path: '/settings/general',
      adminOnly: true,
    },
  ];
};
