import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutGrid, Building2, Users, UserCheck, FileText, Banknote,
    BarChart2, Settings, UserPlus, MessageSquare, Map as MapIcon, DollarSign, Bot, ScrollText, Wrench, X, LogOut
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { WORKFLOW_STATUS } from '../../../constants/status';
import { normalizeWorkflowStatus } from '../../../utils/status';
import { getLastRunDate } from '../../../services/automationService';

interface NavLinkItem {
  path: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  badgeKey?: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const getPreferredFinancePath = () => window.localStorage.getItem('rentrix:last-finance-tab') || '/finance/invoices';

const navGroups: { title: string; links: NavLinkItem[] }[] = [
  {
    title: 'الرئيسية',
    links: [
      { path: '/', label: 'لوحة التحكم', icon: LayoutGrid },
    ],
  },
  {
    title: 'العمليات التشغيلية',
    links: [
      { path: '/properties', label: 'إدارة العقارات', icon: Building2 },
      { path: '/tenants', label: 'المستأجرون', icon: Users, badgeKey: 'expiringContracts' },
      { path: '/owners', label: 'الملاك', icon: UserCheck },
      { path: '/contracts', label: 'العقود', icon: FileText },
      { path: '/maintenance', label: 'الصيانة', icon: Wrench },
    ],
  },
  {
    title: 'المركز المالي',
    links: [
      { path: getPreferredFinancePath(), label: 'الحسابات والمالية', icon: Banknote, badgeKey: 'overdueInvoices' },
    ],
  },
  {
    title: 'التسويق والتطوير',
    links: [
      { path: '/leads', label: 'العملاء المحتملون', icon: UserPlus, badgeKey: 'newLeads' },
      { path: '/lands', label: 'الأراضي', icon: MapIcon },
      { path: '/commissions', label: 'العمولات', icon: DollarSign },
      { path: '/communication', label: 'مركز التواصل', icon: MessageSquare, badgeKey: 'pendingNotifications' },
    ],
  },
  {
    title: 'التحليل والإدارة',
    links: [
      { path: '/reports', label: 'التقارير', icon: BarChart2 },
      { path: '/smart-assistant', label: 'المساعد الذكي', icon: Bot },
      { path: '/audit-log', label: 'سجل المراجعة', icon: ScrollText, adminOnly: true },
    ],
  },
  {
    title: 'الإدارة والنظام',
    links: [
      { path: '/settings', label: 'الإعدادات', icon: Settings, adminOnly: true },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { auth, settings, db } = useApp();
  const { pathname } = useLocation();
  const lastRunDate = getLastRunDate();

  const badges = useMemo(() => {
    const now = new Date();
    const alertDays = settings.operational?.contractAlertDays ?? 30;
    const futureDate = new Date(now.getTime() + alertDays * 86400000);
    const expiringContracts = db.contracts.filter(c => c.status === 'ACTIVE' && new Date(c.end) <= futureDate).length;
    const overdueInvoices = db.invoices.filter(i => i.status === 'OVERDUE' || (i.status === 'UNPAID' && new Date(i.dueDate) < now)).length;
    const newLeads = db.leads.filter(l => l.status === 'NEW').length;
    const pendingNotifications = db.outgoingNotifications.filter(
      (n) => normalizeWorkflowStatus(n.status) === WORKFLOW_STATUS.Pending,
    ).length;
    return { expiringContracts, overdueInvoices, newLeads, pendingNotifications } as Record<string, number>;
  }, [db, settings]);

  const isLinkActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const companyName = settings.general?.company?.name ?? 'Rentrix';

  return (
    <aside
      className={`absolute right-0 top-0 z-50 flex h-screen w-72 flex-col overflow-y-hidden bg-sidebar-bg border-l border-border duration-300 ease-in-out lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ boxShadow: 'var(--shadow-sidebar)' }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.7))',
            boxShadow: '0 4px 12px hsl(var(--color-primary) / 0.35)',
          }}
        >
          {companyName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-base font-black text-text truncate">{companyName}</span>
          <span className="block text-xs text-text-muted">نظام Rentrix</span>
        </div>
        {/* Close button - mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl hover:bg-background text-text-muted transition-colors active:scale-95 flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto flex-1 py-4 px-3 scrollbar-hide">
        <nav>
          {navGroups.map(group => {
            const visibleLinks = group.links.filter(link => !link.adminOnly || auth.currentUser?.role === 'ADMIN');
            if (visibleLinks.length === 0) return null;

            return (
              <div key={group.title} className="mb-5">
                <h3 className="mb-2 px-3 text-[10px] font-black text-text-muted uppercase tracking-[0.18em] opacity-60">
                  {group.title}
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {visibleLinks.map(link => {
                    const active = isLinkActive(link.path);
                    return (
                      <li key={link.path}>
                        <NavLink
                          to={link.path}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold text-sm transition-all duration-200 ${
                            active
                              ? 'text-sidebar-active-text'
                              : 'text-sidebar-text hover:text-text'
                          }`}
                          style={active ? {
                            background: 'hsl(var(--color-sidebar-active-bg))',
                            boxShadow: '0 2px 8px hsl(var(--color-primary) / 0.25)',
                          } : undefined}
                          onMouseEnter={(e) => {
                            if (!active) {
                              (e.currentTarget as HTMLElement).style.background = 'hsl(var(--color-sidebar-hover-bg))';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              (e.currentTarget as HTMLElement).style.background = '';
                            }
                          }}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <link.icon
                            size={17}
                            className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-sidebar-active-text' : ''}`}
                          />
                          <span>{link.label}</span>
                          {link.badgeKey && badges[link.badgeKey] > 0 && (
                            <span className="mr-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black px-1.5">
                              {badges[link.badgeKey]}
                            </span>
                          )}
                          {active && !link.badgeKey && (
                            <span className="mr-auto w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Automation last run indicator */}
      {lastRunDate && (
        <div className="px-4 py-2 border-t border-border hidden lg:block">
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <Bot size={12} className="text-primary flex-shrink-0" />
            <span>آخر تشغيل تلقائي: {lastRunDate}</span>
          </div>
        </div>
      )}

      {/* Mobile: User info + logout */}
      <div className="lg:hidden px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.75))' }}
          >
            {(auth.currentUser?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text truncate">{auth.currentUser?.username}</p>
            <p className="text-xs text-text-muted">{auth.currentUser?.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم'}</p>
          </div>
          <button
            onClick={auth.logout}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-danger-text hover:bg-danger-bg transition-colors active:scale-95 flex-shrink-0"
            title="تسجيل الخروج"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
