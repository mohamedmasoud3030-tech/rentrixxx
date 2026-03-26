import React, { useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Building2,
  Users,
  FileText,
  Bell,
  Banknote,
  BarChart2,
  Settings,
  UserPlus,
  MessageSquare,
  Map as MapIcon,
  Bot,
  ScrollText,
  ShieldCheck,
  Database,
  Palette,
  Zap,
  SearchCheck,
  Calculator,
} from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { getLastRunDate } from '../../../services/automationService';

interface NavLinkItem {
  path: string;
  label: string;
  icon: React.FC<any>;
  adminOnly?: boolean;
  badgeKey?: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navGroups: { title: string; links: NavLinkItem[] }[] = [
  {
    title: 'الرئيسية',
    links: [{ path: '/', label: 'لوحة التحكم', icon: LayoutGrid }],
  },
  {
    title: 'العمليات',
    links: [
      { path: '/properties', label: 'العقارات', icon: Building2 },
      { path: '/people', label: 'الأشخاص', icon: Users },
      { path: '/contracts', label: 'العقود', icon: FileText, badgeKey: 'expiringContracts' },
    ],
  },
  {
    title: 'المالية',
    links: [{ path: '/finance', label: 'المركز المالي', icon: Banknote, badgeKey: 'overdueInvoices' }],
  },
  {
    title: 'التسويق',
    links: [
      { path: '/leads', label: 'العملاء المحتملون', icon: UserPlus, badgeKey: 'newLeads' },
      { path: '/lands', label: 'الأراضي والعمولات', icon: MapIcon },
      { path: '/communication', label: 'التواصل', icon: MessageSquare, badgeKey: 'pendingNotifications' },
    ],
  },
  {
    title: 'التحليل',
    links: [
      { path: '/reports', label: 'التقارير', icon: BarChart2 },
      { path: '/audit-log', label: 'سجل المراجعة', icon: ScrollText, adminOnly: true },
      { path: '/smart-assistant', label: 'المساعد الذكي', icon: Bot },
    ],
  },
  {
    title: 'الإعدادات',
    links: [
      { path: '/settings', label: 'الإعدادات', icon: Settings },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { auth, settings, db } = useApp();
  const { pathname } = useLocation();
  const sidebar = useRef<HTMLDivElement>(null);
  const lastRunDate = getLastRunDate();

  const badges = useMemo(() => {
    const now = new Date();
    const alertDays = settings.operational?.contractAlertDays ?? 30;
    const futureDate = new Date(now.getTime() + alertDays * 86400000);
    const expiringContracts = db.contracts.filter(c => c.status === 'ACTIVE' && new Date(c.end) <= futureDate).length;
    const overdueInvoices = db.invoices.filter(i => i.status === 'OVERDUE' || (i.status === 'UNPAID' && new Date(i.dueDate) < now)).length;
    const newLeads = db.leads.filter(l => l.status === 'NEW').length;
    const pendingNotifications = db.outgoingNotifications.filter(n => n.status === 'PENDING').length;
    return { expiringContracts, overdueInvoices, newLeads, pendingNotifications } as Record<string, number>;
  }, [db, settings]);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current) return;
      if (!sidebarOpen || sidebar.current.contains(target as Node)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [sidebarOpen, setSidebarOpen]);

  const isLinkActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const companyName = settings.general?.company?.name ?? 'Rentrix';

  return (
    <aside
      ref={sidebar}
      className={`absolute right-0 top-0 z-50 flex h-screen w-72 flex-col overflow-y-hidden bg-sidebar-bg border-l border-border duration-300 ease-in-out lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ boxShadow: 'var(--shadow-sidebar)' }}
    >
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.7))',
            boxShadow: '0 4px 12px hsl(var(--color-primary) / 0.35)',
          }}
        >
          {companyName.charAt(0)}
        </div>
        <div className="min-w-0">
          <span className="block text-base font-black text-text truncate">{companyName}</span>
          <span className="block text-xs text-text-muted">نظام Rentrix</span>
        </div>
      </div>

      <div className="flex flex-col overflow-y-auto flex-1 py-4 px-3 scrollbar-hide">
        <nav>
          {navGroups.map(group => {
            const visibleLinks = group.links.filter(link => !link.adminOnly || auth.currentUser?.role === 'ADMIN');
            if (visibleLinks.length === 0) return null;

            return (
              <div key={group.title} className="mb-5">
                <h3 className="mb-2 px-3 text-[10px] font-black text-text-muted uppercase tracking-[0.18em] opacity-60">{group.title}</h3>
                <ul className="flex flex-col gap-0.5">
                  {visibleLinks.map(link => {
                    const active = isLinkActive(link.path);
                    return (
                      <li key={link.path}>
                        <NavLink
                          to={link.path}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold text-sm transition-all duration-200 ${
                            active ? 'text-sidebar-active-text' : 'text-sidebar-text hover:text-text'
                          }`}
                          style={
                            active
                              ? {
                                  background: 'hsl(var(--color-sidebar-active-bg))',
                                  boxShadow: '0 2px 8px hsl(var(--color-primary) / 0.25)',
                                }
                              : undefined
                          }
                          onMouseEnter={e => {
                            if (!active) {
                              (e.currentTarget as HTMLElement).style.background = 'hsl(var(--color-sidebar-hover-bg))';
                            }
                          }}
                          onMouseLeave={e => {
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
                          {active && !link.badgeKey && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
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

      {lastRunDate && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <Bot size={12} className="text-primary flex-shrink-0" />
            <span>آخر تشغيل للأتمتة: {lastRunDate}</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
