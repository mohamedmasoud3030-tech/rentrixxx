import React from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import Notifications from './Notifications';
import { useLocation } from 'react-router-dom';
import { NAVIGATION_META } from '../../../config/navigationMeta';

interface TopbarProps {
  setSidebarOpen: (open: boolean) => void;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const { auth, settings, updateSettings } = useApp();
  const { pathname } = useLocation();

  const toggleTheme = () => {
    const currentTheme = settings.appearance?.theme ?? 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    updateSettings({ appearance: { ...settings.appearance, theme: newTheme } });
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const currentTheme = settings.appearance?.theme ?? 'light';
  const username = auth.currentUser?.username || '';
  const role = auth.currentUser?.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم';

  const pageKey = Object.keys(NAVIGATION_META)
    .filter(k => k !== '/')
    .sort((a, b) => b.length - a.length)
    .find(k => pathname.startsWith(k)) ?? (pathname === '/' ? '/' : null);
  const pageTitle = pageKey ? NAVIGATION_META[pageKey]?.titleAr ?? '' : '';

  return (
    <header
      className="sticky top-0 z-40 flex w-full bg-card border-b border-border"
      style={{ boxShadow: '0 1px 8px -2px rgba(0,0,0,0.07)' }}
    >
      <div className="flex flex-grow items-center justify-between px-4 py-2 md:px-6">

        {/* Mobile: hamburger + page title */}
        <div className="lg:hidden flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-background text-text-muted transition-colors active:scale-95 flex-shrink-0"
            aria-label="فتح القائمة"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-black text-text truncate">{pageTitle}</span>
        </div>

        {/* Desktop: spacer */}
        <div className="hidden lg:block flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-background transition-colors active:scale-95"
            title={currentTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          >
            {currentTheme === 'dark'
              ? <Sun className="w-[18px] h-[18px] text-text-muted" />
              : <Moon className="w-[18px] h-[18px] text-text-muted" />
            }
          </button>

          {/* Notifications */}
          <Notifications />

          {/* Divider */}
          <div className="h-7 w-px bg-border mx-0.5" />

          {/* User Info + Logout */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:block text-right">
              <span className="block text-sm font-bold text-text leading-tight">{username}</span>
              <span className="block text-xs text-text-muted">{role}</span>
            </div>

            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 cursor-default"
              style={{ background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.75))' }}
            >
              {username.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={auth.logout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-danger-bg hover:text-danger-text transition-colors text-sm text-text-muted active:scale-95"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
