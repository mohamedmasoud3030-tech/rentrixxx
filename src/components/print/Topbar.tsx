import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import Notifications from './Notifications';

interface TopbarProps {
  setSidebarOpen: (open: boolean) => void;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const { auth, settings, updateSettings } = useApp();

  const toggleTheme = () => {
    const currentTheme = settings.appearance?.theme ?? 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    updateSettings({ appearance: { ...settings.appearance, theme: newTheme } });
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const currentTheme = settings.appearance?.theme ?? 'light';
  const username = auth.currentUser?.username || '';
  const role = auth.currentUser?.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم';

  return (
    <header
      className="sticky top-0 z-40 flex w-full bg-card border-b border-border"
      style={{ boxShadow: '0 1px 8px -2px rgba(0,0,0,0.07)' }}
    >
      <div className="flex flex-grow items-center justify-between px-4 py-2 md:px-6">
        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(true);
            }}
            className="rounded-lg border border-border bg-card p-1.5 hover:bg-background transition-colors"
          >
            <Menu className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="hidden sm:block flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-background transition-colors"
            title={currentTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          >
            {currentTheme === 'dark'
              ? <Sun className="w-4.5 h-4.5 text-text-muted" />
              : <Moon className="w-4.5 h-4.5 text-text-muted" />
            }
          </button>

          {/* Notifications */}
          <Notifications />

          {/* Divider */}
          <div className="h-7 w-px bg-border mx-1" />

          {/* User Info + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right">
              <span className="block text-sm font-bold text-text leading-tight">{username}</span>
              <span className="block text-xs text-text-muted">{role}</span>
            </div>

            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.75))' }}
            >
              {username.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={auth.logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-danger-bg hover:text-danger-text transition-colors text-sm text-text-muted"
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
