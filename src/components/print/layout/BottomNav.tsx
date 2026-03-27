import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Building2, Users, Banknote, Menu } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';

interface BottomNavProps {
  onMenuOpen: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onMenuOpen }) => {
  const { db, settings } = useApp();
  const { pathname } = useLocation();

  const badges = useMemo(() => {
    const now = new Date();
    const alertDays = settings.operational?.contractAlertDays ?? 30;
    const futureDate = new Date(now.getTime() + alertDays * 86400000);
    const expiringContracts = db.contracts.filter(c => c.status === 'ACTIVE' && new Date(c.end) <= futureDate).length;
    const overdueInvoices = db.invoices.filter(i => i.status === 'OVERDUE' || (i.status === 'UNPAID' && new Date(i.dueDate) < now)).length;
    return { expiringContracts, overdueInvoices };
  }, [db, settings]);

  const navItems = [
    { path: '/', label: 'الرئيسية', icon: LayoutGrid },
    { path: '/properties', label: 'العقارات', icon: Building2 },
    { path: '/tenants', label: 'المستأجرون', icon: Users, badge: badges.expiringContracts },
    { path: '/finance', label: 'المالية', icon: Banknote, badge: badges.overdueInvoices },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 right-0 left-0 z-40 lg:hidden bg-card border-t border-border safe-bottom"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
      <div className="flex items-stretch h-16">
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all"
              style={active ? { color: 'hsl(var(--color-primary))' } : { color: 'var(--color-text-muted)' }}
            >
              {active && (
                <span className="absolute top-0 right-1/2 translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ background: 'hsl(var(--color-primary))' }} />
              )}
              <div className="relative">
                <item.icon size={22} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold leading-none">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Menu button */}
        <button
          onClick={onMenuOpen}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-text-muted"
        >
          <Menu size={22} />
          <span className="text-[10px] font-bold leading-none">القائمة</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
