import React from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Sun, Moon, LogOut, Menu, Search, Bell } from 'lucide-react';
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
    <header className="sticky top-0 z-40 h-16 w-full bg-surface-container-low border-b border-outline-variant/40">
      <div className="flex h-full items-center justify-between flex-row-reverse px-4 md:px-6 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors active:scale-95" aria-label="فتح القائمة">
            <Menu size={20} />
          </button>
          <span className="text-base font-black text-on-surface truncate lg:hidden">{pageTitle}</span>
          <div className="hidden lg:flex items-center min-w-[260px] relative">
            <Search size={16} className="absolute end-3 text-on-surface-variant" />
            <input readOnly placeholder="بحث سريع..." className="bg-rx-surface-high rounded-xl border-none pe-9 text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-surface-container transition-colors active:scale-95" title={currentTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}>
            {currentTheme === 'dark' ? <Sun className="w-[18px] h-[18px] text-on-surface-variant" /> : <Moon className="w-[18px] h-[18px] text-on-surface-variant" />}
          </button>
          <button className="hidden sm:flex items-center justify-center h-9 w-9 rounded-xl hover:bg-surface-container text-on-surface-variant">
            <Bell size={18} />
          </button>
          <Notifications />
          <div className="h-7 w-px bg-outline-variant/40 mx-0.5" />
          <div className="flex items-center gap-2">
            <div className="hidden lg:block text-start">
              <span className="block text-sm font-bold text-on-surface leading-tight">{username}</span>
              <span className="block text-xs text-on-surface-variant">{role}</span>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-on-primary font-bold text-sm rx-gradient-btn">{username.charAt(0).toUpperCase()}</div>
            <button onClick={auth.logout} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-error/15 hover:text-error transition-colors text-sm text-on-surface-variant active:scale-95" title="تسجيل الخروج">
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
