import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    LayoutGrid, Building2, Users, FileText, Banknote, 
    BarChart2, Settings, UserPlus, MessageSquare, Map as MapIcon
} from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';

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
      { path: '/leads', label: 'العملاء المحتملين', icon: UserPlus },
      { path: '/lands', label: 'الأراضي والعمولات', icon: MapIcon },
      { path: '/communication', label: 'مركز التواصل', icon: MessageSquare },
    ],
  },
  {
    title: 'التحليل والإدارة',
    links: [
      { path: '/reports', label: 'التقارير', icon: BarChart2 },
      { path: '/settings', label: 'الإعدادات', icon: Settings, adminOnly: true },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { auth, settings } = useApp();
  const { pathname } = useLocation();
  const sidebar = useRef<HTMLDivElement>(null);

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

  return (
    <aside
      ref={sidebar}
      className={`absolute right-0 top-0 z-50 flex h-screen w-72 flex-col overflow-y-hidden bg-card border-l border-border duration-300 ease-linear lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-center gap-2 px-6 py-8 border-b border-border bg-background/50">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
            {settings.general.company.name.charAt(0)}
          </div>
          <span className="text-xl font-black text-text truncate">{settings.general.company.name}</span>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear flex-1 scrollbar-hide">
        <nav className="mt-5 py-4 px-4 lg:px-6">
          {navGroups.map(group => {
            const visibleLinks = group.links.filter(link => !link.adminOnly || auth.currentUser?.role === 'ADMIN');
            if (visibleLinks.length === 0) return null;

            return (
              <div key={group.title} className="mb-6">
                <h3 className="mb-4 ml-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-50">{group.title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {visibleLinks.map(link => (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 font-bold text-sm transition-all ${
                            isLinkActive(link.path)
                              ? 'bg-primary text-white shadow-md shadow-primary/20' 
                              : 'text-text-muted hover:bg-background hover:text-primary'
                          }`}
                      >
                        <link.icon size={18} />
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;