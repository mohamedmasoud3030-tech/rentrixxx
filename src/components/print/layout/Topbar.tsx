import React from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import Notifications from './Notifications';

interface TopbarProps {
  setSidebarOpen: (open: boolean) => void;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const { auth, settings, updateSettings } = useApp();

  const toggleTheme = () => {
    const newTheme = settings.appearance.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ appearance: { ...settings.appearance, theme: newTheme } });
  };

  return (
    <header className="sticky top-0 z-40 flex w-full bg-card border-b border-border">
      <div className="flex flex-grow items-center justify-between px-4 py-2.5 shadow-sm md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(true);
            }}
            className="z-50 block rounded-lg border border-border bg-card p-1.5 shadow-sm lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="hidden sm:block">
           {/* Placeholder for potential future content */}
        </div>

        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            <li>
              <button onClick={toggleTheme} className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-background">
                {settings.appearance.theme === 'dark' ? <Sun className="w-5 h-5 text-text-muted" /> : <Moon className="w-5 h-5 text-text-muted" />}
              </button>
            </li>
            <Notifications />
          </ul>

          <div className="h-8 w-px bg-border"></div>

          <div className="flex items-center gap-4">
            <span className="hidden text-right lg:block">
              <span className="block text-sm font-medium text-text">
                {auth.currentUser?.username}
              </span>
              <span className="block text-xs text-text-muted">{auth.currentUser?.role}</span>
            </span>
            <button onClick={auth.logout} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-background">
              <LogOut size={18} className="text-text-muted"/>
              <span className="text-sm">خروج</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;