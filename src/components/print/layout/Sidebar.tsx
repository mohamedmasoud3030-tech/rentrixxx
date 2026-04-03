import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Bot, X, LogOut } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { WORKFLOW_STATUS } from '../../../constants/status';
import { normalizeWorkflowStatus } from '../../../utils/status';
import { getLastRunDate } from '../../../services/automationService';
import { createSidebarConfig, type SidebarNavItem } from './sidebarConfig';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { auth, settings, db } = useApp();
  const { pathname } = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [lastRunDate, setLastRunDate] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadLastRunDate = async () => {
      const value = await getLastRunDate();
      setLastRunDate(value);
    };
    void loadLastRunDate();
  }, []);

  const isRtl = useMemo(() => {
    if (typeof document === 'undefined') return true;
    return getComputedStyle(document.documentElement).direction === 'rtl';
  }, []);

  const badges = useMemo(() => {
    const now = new Date();
    const alertDays = settings.operational?.contractAlertDays ?? 30;
    const futureDate = new Date(now.getTime() + alertDays * 86400000);
    const expiringContracts = db.contracts.filter(c => c.status === 'ACTIVE' && new Date(c.end) <= futureDate).length;
    const overdueInvoices = db.invoices.filter(i => i.status === 'OVERDUE' || (i.status === 'UNPAID' && new Date(i.dueDate) < now)).length;
    const pendingNotifications = db.outgoingNotifications.filter(
      n => normalizeWorkflowStatus(n.status) === WORKFLOW_STATUS.Pending,
    ).length;

    return { expiringContracts, overdueInvoices, pendingNotifications } as Record<string, number>;
  }, [db, settings]);

  const navItems = useMemo(() => createSidebarConfig(), []);

  const isPathActive = (path?: string) => {
    if (!path) return false;
    const normalizedPath = path.split('?')[0];
    if (normalizedPath === '/') return pathname === '/';
    return pathname.startsWith(normalizedPath);
  };

  const isItemActive = (item: SidebarNavItem): boolean => {
    if (isPathActive(item.path)) return true;
    if (!item.children?.length) return false;
    return item.children.some(child => isItemActive(child));
  };

  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};

    const collectExpanded = (items: SidebarNavItem[]) => {
      items.forEach(item => {
        if (item.children?.length) {
          initialExpanded[item.id] = isItemActive(item);
          collectExpanded(item.children);
        }
      });
    };

    collectExpanded(navItems);
    setExpandedItems(prev => ({ ...initialExpanded, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, navItems]);

  const companyName = settings.general?.company?.name ?? 'Rentrix';
  const getGroupKey = (title: string) => `group:${title}`;

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setSidebarOpen, sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const activeGroup = navGroups.find(group =>
      group.links.some(link => isLinkActive(link.path)),
    );
    if (!activeGroup) return;
    const key = getGroupKey(activeGroup.title);
    setCollapsedGroups(prev => ({ ...prev, [key]: false }));
  }, [pathname]);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const renderNavItem = (item: SidebarNavItem, depth = 0) => {
    if (item.adminOnly && auth.currentUser?.role !== 'ADMIN') return null;

    const hasChildren = !!item.children?.length;
    const active = isItemActive(item);
    const isExpanded = expandedItems[item.id] ?? active;
    const itemPadding = depth === 0 ? 'px-3' : 'px-2';
    const nestedIndent = depth > 0 ? (isRtl ? 'mr-4' : 'ml-4') : '';

    return (
      <li key={item.id} className={nestedIndent}>
        <div
          className={`group flex items-center gap-3 rounded-xl ${itemPadding} py-2.5 font-bold text-sm transition-all duration-200 ${
            active
              ? 'text-sidebar-active-text bg-[hsl(var(--color-sidebar-active-bg))] shadow-[0_2px_8px_hsl(var(--color-primary)/0.25)]'
              : 'text-sidebar-text hover:text-text hover:bg-[hsl(var(--color-sidebar-hover-bg))]'
          }`}
        >
          {item.path ? (
            <NavLink
              to={item.path}
              className="flex min-w-0 flex-1 items-center gap-3"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon
                size={17}
                className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-sidebar-active-text' : ''}`}
              />
              <span className="truncate">{item.label}</span>
              {item.badgeKey && badges[item.badgeKey] > 0 && (
                <span className={`${isRtl ? 'mr-auto' : 'ml-auto'} min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black px-1.5`}>
                  {badges[item.badgeKey]}
                </span>
              )}
            </NavLink>
          ) : (
            <>
              <item.icon
                size={17}
                className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-sidebar-active-text' : ''}`}
              />
              <span className="truncate">{item.label}</span>
            </>
          )}

          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className={`${isRtl ? 'mr-auto' : 'ml-auto'} inline-flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text`}
              aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <ul className={`mt-1 flex flex-col gap-0.5 ${isRtl ? 'border-r pr-2' : 'border-l pl-2'} border-border/60`}>
            {item.children?.map(child => renderNavItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside
      className={`absolute right-0 top-0 z-50 flex h-screen w-72 flex-col overflow-y-hidden border-l border-border bg-sidebar-bg duration-300 ease-in-out lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ boxShadow: 'var(--shadow-sidebar)' }}
      role="dialog"
      aria-modal={sidebarOpen ? 'true' : undefined}
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div
          className="h-10 w-10 flex-shrink-0 rounded-xl text-xl font-black text-white flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.7))',
            boxShadow: '0 4px 12px hsl(var(--color-primary) / 0.35)',
          }}
        >
          {companyName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-base font-black text-text">{companyName}</span>
          <span className="block text-xs text-text-muted">Rentrix Navigation Hub</span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-text-muted transition-colors active:scale-95 hover:bg-background lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <div className="scrollbar-hide flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <nav>
          <ul className="flex flex-col gap-1">{navItems.map(item => renderNavItem(item))}</ul>
        </nav>
      </div>

      {lastRunDate && (
        <div className="hidden border-t border-border px-4 py-2 lg:block">
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <Bot size={12} className="text-primary flex-shrink-0" />
            <span>آخر تشغيل تلقائي: {lastRunDate}</span>
          </div>
        </div>
      )}

      <div className="border-t border-border px-4 py-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
            style={{ background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.75))' }}
          >
            {(auth.currentUser?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text">{auth.currentUser?.username}</p>
            <p className="text-xs text-text-muted">{auth.currentUser?.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم'}</p>
          </div>
          <button
            onClick={auth.logout}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-danger-text transition-colors active:scale-95 hover:bg-danger-bg"
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
