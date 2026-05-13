import { Link, Outlet, useMatches, useRouter } from '@tanstack/react-router';
import { Building2, ChevronLeft, FileText, Home, LayoutDashboard, LogOut, Menu, Moon, ReceiptText, Settings, Sun, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

const navigation = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/properties', label: 'العقارات', icon: Building2 },
  { to: '/contracts', label: 'العقود', icon: FileText },
  { to: '/financials', label: 'المالية', icon: WalletCards },
  { to: '/accounting', label: 'المحاسبة', icon: ReceiptText },
  { to: '/reports', label: 'التقارير', icon: Home },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
] as const;

export function AppShell() {
  const router = useRouter();
  const matches = useMatches();
  const { logout, user } = useAuth();
  const { sidebarCollapsed, theme, toggleSidebar, setTheme, syncStatus, lastSyncedAt } = useUiStore();

  const pageTitle = ([...matches].reverse().find((match) => (match.staticData as { title?: string } | undefined)?.title)?.staticData as { title?: string } | undefined)?.title ?? 'Rentrix';

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل الخروج بنجاح');
    await router.navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <aside className={cn('fixed inset-y-0 right-0 z-30 hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground transition-all lg:block', sidebarCollapsed ? 'w-20' : 'w-72')}>
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">R</div>
          {!sidebarCollapsed ? (
            <div>
              <p className="text-lg font-black">Rentrix</p>
              <p className="text-xs text-sidebar-foreground/60">إدارة عقارية مكتبية</p>
            </div>
          ) : null}
        </div>
        <nav className="space-y-2 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
                activeOptions={{ exact: item.to === '/' }}
              >
                <Icon className="size-5 shrink-0" />
                {!sidebarCollapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={cn('transition-all lg:pr-72', sidebarCollapsed && 'lg:pr-20')}>
        <header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="size-10 px-0" onClick={toggleSidebar} aria-label="طي القائمة">
                <Menu className="size-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>الرئيسية</span>
                  <ChevronLeft className="size-3" />
                  <span>{pageTitle}</span>
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-tight">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-border bg-card px-4 py-2 text-xs text-muted-foreground md:block">
                حالة المزامنة: <span className="font-bold text-foreground">{syncStatus}</span>
                {lastSyncedAt ? <span> · {new Date(lastSyncedAt).toLocaleString('ar')}</span> : null}
              </div>
              <Button variant="secondary" className="size-10 px-0" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="تبديل السمة">
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
              <div className="hidden text-left text-xs md:block" dir="ltr">
                <p className="font-bold text-foreground">{user?.email}</p>
                <p className="text-muted-foreground">Admin</p>
              </div>
              <Button variant="ghost" className="size-10 px-0" onClick={handleLogout} aria-label="تسجيل الخروج">
                <LogOut className="size-5" />
              </Button>
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-5rem)] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
