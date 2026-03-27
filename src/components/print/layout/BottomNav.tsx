import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Building2, Users, Banknote, MoreHorizontal } from 'lucide-react';
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
    <nav
      className="fixed bottom-0 right-0 left-0 z-40 lg:hidden safe-bottom"
      style={{
        background: 'hsl(var(--color-card) / 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(var(--color-border) / 0.6)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
      }}
    >
      <div className="flex items-end h-[62px] px-2 pb-1">
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-end pb-1 gap-0.5 relative"
              style={{ color: active ? 'hsl(var(--color-primary))' : 'hsl(var(--color-text-muted))' }}
            >
              {/* Active pill background */}
              <div
                className="flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200 relative"
                style={active ? {
                  background: 'hsl(var(--color-primary) / 0.12)',
                } : {}}
              >
                <item.icon size={active ? 21 : 20} strokeWidth={active ? 2.5 : 1.8} />
                {item.badge && item.badge > 0 && (
                  <span
                    className="absolute -top-1 -left-0.5 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-white text-[9px] font-black px-0.5"
                    style={{ background: '#ef4444' }}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] leading-none font-bold transition-all duration-200"
                style={{ opacity: active ? 1 : 0.65 }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}

        {/* More / Menu button */}
        <button
          onClick={onMenuOpen}
          className="flex-1 flex flex-col items-center justify-end pb-1 gap-0.5"
          style={{ color: 'hsl(var(--color-text-muted))' }}
        >
          <div className="flex items-center justify-center w-12 h-7 rounded-full">
            <MoreHorizontal size={20} strokeWidth={1.8} />
          </div>
          <span className="text-[10px] leading-none font-bold" style={{ opacity: 0.65 }}>المزيد</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
