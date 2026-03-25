import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    LayoutGrid, Building2, Users, FileText, Banknote, 
    BarChart2, Settings, UserPlus, MessageSquare, Map as MapIcon, Bot, ClipboardList, ScrollText
} from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { getLastRunDate } from '../../../services/automationService';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navGroups = [
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
      { path: '/people', label: 'الأشخاص', icon: Users },
      { path: '/contracts', label: 'العقود', icon: FileText },
    ],
  },
  {
    title: 'المركز المالي',
    links: [
      { path: '/finance', label: 'الحسابات والمالية', icon: Banknote },
    ],
  },
  {
    title: 'التسويق والتطوير',
    links: [
      { path: '/leads', label: 'العملاء المحتملون', icon: UserPlus },
      { path: '/lands', label: 'الأراضي والعمولات', icon: MapIcon },
      { path: '/communication', label: 'مركز التواصل', icon: MessageSquare },
    ],
  },
  {
    title: 'التحليل والإدارة',
    links: [
      { path: '/reports', label: 'التقارير', icon: BarChart2 },
      { path: '/audit-log', label: 'سجل المراجعة', icon: ScrollText, adminOnly: true },
      { path: '/smart-assistant', label: 'المساعد الذكي', icon: Bot },
      { path: '/settings', label: 'الإعدادات', icon: Settings, adminOnly: true },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { auth, settings } = useApp();
  const { pathname } = useLocation();
  const sidebar = useRef<HTMLDivElement>(null);
  const lastRunDate = getLastRunDate();

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
      {/* Logo / Brand */}
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
                          {active && (
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
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <Bot size={12} className="text-primary flex-shrink-0" />
            <span>آخر تشغيل تلقائي: {lastRunDate}</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
