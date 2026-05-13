import { Link, Outlet, useMatches, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Building2, ChevronLeft, FileText, Home, LayoutDashboard, LogOut, Menu, Moon, ReceiptText, Settings, Sun, Users, WalletCards, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

const navigation = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/properties', label: 'العقارات', icon: Building2 },
  { to: '/people', label: 'الأشخاص', icon: Users },
  { to: '/contracts', label: 'العقود', icon: FileText },
  { to: '/financials', label: 'المالية', icon: WalletCards },
  { to: '/accounting', label: 'المحاسبة', icon: ReceiptText },
  { to: '/reports', label: 'التقارير', icon: Home },
  { to: '/maintenance', label: 'الصيانة', icon: Wrench },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
] as const;

export function AppShell() {
  const router = useRouter();
  const matches = useMatches();
  const { logout, user } = useAuth();
  const { sidebarCollapsed, theme, toggleSidebar, setTheme, syncStatus, lastSyncedAt } = useUiStore();
  const pageTitle = ([...matches].reverse().find((match) => (match.staticData as { title?: string } | undefined)?.title)?.staticData as { title?: string } | undefined)?.title ?? 'Rentrix';

  useEffect(() => { document.title = `${pageTitle} | Rentrix`; }, [pageTitle]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        const current = window.location.pathname;
        if (current.endsWith('/properties')) void router.navigate({ to: '/properties/new' });
        if (current.endsWith('/people')) void router.navigate({ to: '/people/new' });
        if (current.endsWith('/contracts')) void router.navigate({ to: '/contracts/new' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل الخروج بنجاح');
    await router.navigate({ to: '/login' });
  };

  return (<div className="min-h-screen bg-background text-foreground" dir="rtl"><aside className={cn('fixed inset-y-0 right-0 z-30 hidden overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sidebar transition-all lg:flex lg:flex-col', sidebarCollapsed ? 'w-20' : 'w-72')}><div className="h-[3px] w-full bg-accent" /><div className="flex h-24 items-center gap-3 border-b border-white/10 px-5"><div className="grid size-11 place-items-center rounded-2xl bg-white text-lg font-black text-slate-950 shadow-lg shadow-blue-500/10">R</div>{!sidebarCollapsed ? <div><p className="text-xl font-black text-white">Rentrix</p><p className="text-xs font-bold text-sidebar-foreground">إدارة العقارات</p></div> : null}</div><nav className="flex-1 space-y-2 p-4">{navigation.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-white [&.active]:bg-primary [&.active]:text-primary-foreground [&.active]:shadow-[0_10px_28px_-14px_hsl(var(--primary))]" activeOptions={{ exact: item.to === '/' }}><Icon className="size-5 shrink-0" />{!sidebarCollapsed ? <span>{item.label}</span> : null}</Link>; })}</nav><div className="border-t border-white/10 p-4"><Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white" onClick={handleLogout}><LogOut className="size-5" />{!sidebarCollapsed ? <span>تسجيل الخروج</span> : null}</Button></div></aside><div className={cn('transition-all lg:pr-72', sidebarCollapsed && 'lg:pr-20')}><header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur-xl"><div className="flex h-20 items-center justify-between px-6"><div className="flex items-center gap-4"><Button variant="ghost" className="size-10 px-0" onClick={toggleSidebar} aria-label="طي القائمة"><Menu className="size-5" /></Button><div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span>الرئيسية</span><ChevronLeft className="size-3" /><span>{pageTitle}</span></div><h1 className="mt-1 text-3xl font-black tracking-tight">{pageTitle}</h1></div></div><div className="flex items-center gap-3"><div className="rounded-2xl border border-border bg-card px-4 py-2 text-xs text-muted-foreground"><span className="font-bold text-foreground">{syncStatus}</span>{lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString('ar')}` : ''}</div><Button variant="secondary" className="size-10 px-0" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="تبديل الوضع">{theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}</Button><div className="hidden text-left text-xs text-muted-foreground xl:block" dir="ltr">{user?.email}</div></div></div></header><main className="animate-route-in p-6"><Outlet /></main></div></div>);
}
