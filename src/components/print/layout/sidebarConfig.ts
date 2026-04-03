import {
  Bell,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutGrid,
  Receipt,
  Settings,
  Users,
  UserCheck,
  WalletCards,
  BarChart2,
  Wrench,
  CreditCard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  window.localStorage.getItem(LAST_FINANCE_TAB_KEY) || '/finance/invoices';

export const createSidebarConfig = (): SidebarNavItem[] => {
  const financeRoot = getDefaultFinancePath();

  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
      path: '/',
    },
    {
      id: 'owners',
      label: 'Owners',
      icon: UserCheck,
      path: '/owners',
    },
    {
      id: 'contracts',
      label: 'Contracts',
      icon: FileText,
      path: '/contracts',
      badgeKey: 'expiringContracts',
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: Building2,
      path: '/properties',
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: WalletCards,
      path: financeRoot,
      badgeKey: 'overdueInvoices',
      children: [
        { id: 'financial-invoices', label: 'Invoices', icon: Receipt, path: '/finance/invoices' },
        { id: 'financial-payments', label: 'Payments', icon: CreditCard, path: '/finance/financials' },
        { id: 'financial-expenses', label: 'Expenses', icon: CircleDollarSign, path: '/finance/financials' },
        { id: 'financial-receipts', label: 'Receipts', icon: ClipboardList, path: '/finance/financials' },
        { id: 'financial-arrears', label: 'Arrears', icon: FileText, path: '/finance/invoices?status=OVERDUE' },
      ],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart2,
      path: '/reports',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      path: '/communication',
      badgeKey: 'pendingNotifications',
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Wrench,
      path: '/maintenance',
      children: [
        { id: 'operations-maintenance', label: 'Maintenance', icon: Wrench, path: '/maintenance' },
        { id: 'operations-tenants', label: 'Tenants', icon: Users, path: '/tenants' },
      ],
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      path: '/settings/users',
      adminOnly: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings/general',
      adminOnly: true,
    },
  ];
};
