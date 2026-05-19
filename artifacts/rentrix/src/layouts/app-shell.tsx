import { Link, Outlet, useMatches, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Bot, Building2, ChevronLeft, ClipboardList, FileText, Home, Landmark, LayoutDashboard, LogOut, Map, Menu, MessageCircle, Moon, ReceiptText, Settings, Sun, UserRoundCog, Users, WalletCards, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { getAppLanguageState, translateSharedLabel } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

const navigation = [
  { to: '/', labelKey: 'dashboard', icon: LayoutDashboard },
  { to: '/properties', labelKey: 'properties', icon: Building2 },
  { to: '/people', labelKey: 'people', icon: Users },
  { to: '/tenants', labelKey: 'tenants', icon: Users },
  { to: '/owners', labelKey: 'owners', icon: UserRoundCog },
  { to: '/contracts', labelKey: 'contracts', icon: FileText },
  { to: '/financials', labelKey: 'financials', icon: WalletCards },
  { to: '/invoices', labelKey: 'invoices', icon: ReceiptText },
  { to: '/arrears', labelKey: 'arrears', icon: ClipboardList },
  { to: '/accounting', labelKey: 'accounting', icon: ReceiptText },
  { to: '/reports', labelKey: 'reports', icon: Home },
  { to: '/maintenance', labelKey: 'maintenance', icon: Wrench },
  { to: '/settings', labelKey: 'settings', icon: Settings },
] as const;

const recoveryModules = [
  { labelKey: 'communications', icon: MessageCircle },
  { labelKey: 'propertyMap', icon: Map },
  { labelKey: 'lands', icon: Landmark },
  { labelKey: 'prospects', icon: Users },
  { labelKey: 'commissions', icon: WalletCards },
  { labelKey: 'auditLog', icon: ClipboardList },
  { labelKey: 'aiAssistant', icon: Bot },
] as const;

type SharedLabel = (key: string) => string;

type NavigationLinksProps = Readonly<{
  expanded: boolean;
  sharedLabel: SharedLabel;
  onNavigate?: () => void;
}>;

type RecoveryLinksProps = Readonly<{
  expanded: boolean;
  sharedLabel: SharedLabel;
}>;

type MobileNavigationDrawerProps = Readonly<{
  appName: string;
  closeMenuLabel: string;
  sharedLabel: SharedLabel;
  onClose: () => void;
  onLogout: () => void;
}>;

function NavigationLinks({ expanded, sharedLabel, onNavigate }: NavigationLinksProps) {
  return (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to} onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-white [&.active]:bg-primary [&.active]:text-primary-foreground [&.active]:shadow-[0_10px_28px_-14px_hsl(var(--primary))]" activeOptions={{ exact: item.to === '/' }}>
            <Icon className="size-5 shrink-0" />
            {expanded ? <span>{sharedLabel(item.labelKey)}</span> : null}
          </Link>
        );
      })}
    </>
  );
}

function RecoveryLinks({ expanded, sharedLabel }: RecoveryLinksProps) {
  return (
    <>
      {expanded ? (
        <div className="pt-3">
          <p className="px-3 text-[11px] font-black uppercase tracking-wide text-sidebar-foreground/60">{sharedLabel('recoverySection')}</p>
        </div>
      ) : null}
      {recoveryModules.map((item) => {
        const Icon = item.icon;
        const label = sharedLabel(item.labelKey);
        return (
          <div key={item.labelKey} className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-sidebar-foreground/55" title={sharedLabel('recoveryTooltip')}>
            <Icon className="size-5 shrink-0" />
            {expanded ? <span>{label}</span> : null}
          </div>
        );
      })}
    </>
  );
}

function MobileNavigationDrawer({ appName, closeMenuLabel, sharedLabel, onClose, onLogout }: MobileNavigationDrawerProps) {
  return (
    <dialog open className="fixed inset-0 z-[90] m-0 h-dvh w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 lg:hidden" aria-label={closeMenuLabel}>
      <button type="button" className="absolute inset-0 bg-slate-950/55" aria-label={closeMenuLabel} onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sidebar">
        <div className="h-[3px] w-full bg-accent" />
        <div className="flex h-24 items-center justify-between gap-3 border-b border-white/10 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-lg font-black text-slate-950 shadow-lg shadow-blue-500/10">R</div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black text-white">{appName}</p>
              <p className="truncate text-xs font-bold text-sidebar-foreground">{sharedLabel('realEstateManagement')}</p>
            </div>
          </div>
          <Button variant="ghost" className="size-11 shrink-0 px-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white" onClick={onClose} aria-label={closeMenuLabel}>
            <ChevronLeft className="size-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <NavigationLinks expanded sharedLabel={sharedLabel} onNavigate={onClose} />
          <RecoveryLinks expanded sharedLabel={sharedLabel} />
        </nav>
        <div className="border-t border-white/10 p-4">
          <Button variant="ghost" className="min-h-11 w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white" onClick={onLogout}>
            <LogOut className="size-5" />
            <span>{sharedLabel('logout')}</span>
          </Button>
        </div>
      </aside>
    </dialog>
  );
}

export function AppShell() {
  const router = useRouter();
  const matches = useMatches();
  const { logout, user } = useAuth();
  const { sidebarCollapsed, theme, toggleSidebar, setTheme, syncStatus, lastSyncedAt } = useUiStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const appLanguage = getAppLanguageState();
  const isSidebarExpanded = sidebarCollapsed === false;
  const pageTitle = ([...matches].reverse().find((match) => (match.staticData as { title?: string } | undefined)?.title)?.staticData as { title?: string } | undefined)?.title ?? 'Rentrix';
  const sharedLabel = (key: string) => translateSharedLabel(key, appLanguage.language);
  const appName = sharedLabel('appName');
  const openMenuLabel = appLanguage.language === 'ar' ? 'فتح القائمة' : 'Open menu';
  const closeMenuLabel = appLanguage.language === 'ar' ? 'إغلاق القائمة' : 'Close menu';

  useEffect(() => { document.title = `${pageTitle} | ${appName}`; }, [appName, pageTitle]);
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

  const closeMobileNav = () => setMobileNavOpen(false);

  const handleLogout = async () => {
    await logout();
    closeMobileNav();
    toast.success(sharedLabel('logoutSuccess'));
    await router.navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground" dir={appLanguage.direction}>
      {mobileNavOpen ? (
        <MobileNavigationDrawer appName={appName} closeMenuLabel={closeMenuLabel} sharedLabel={sharedLabel} onClose={closeMobileNav} onLogout={handleLogout} />
      ) : null}
      <aside className={cn('fixed inset-y-0 right-0 z-30 hidden overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sidebar transition-all lg:flex lg:flex-col', sidebarCollapsed ? 'w-20' : 'w-72')}>
        <div className="h-[3px] w-full bg-accent" />
        <div className="flex h-24 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-white text-lg font-black text-slate-950 shadow-lg shadow-blue-500/10">R</div>
          {isSidebarExpanded ? (
            <div>
              <p className="text-xl font-black text-white">{appName}</p>
              <p className="text-xs font-bold text-sidebar-foreground">{sharedLabel('realEstateManagement')}</p>
            </div>
          ) : null}
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <NavigationLinks expanded={isSidebarExpanded} sharedLabel={sharedLabel} />
          <RecoveryLinks expanded={isSidebarExpanded} sharedLabel={sharedLabel} />
        </nav>
        <div className="border-t border-white/10 p-4">
          <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white" onClick={handleLogout}>
            <LogOut className="size-5" />
            {isSidebarExpanded ? <span>{sharedLabel('logout')}</span> : null}
          </Button>
        </div>
      </aside>
      <div className={cn('w-full transition-all lg:pr-72', sidebarCollapsed && 'lg:pr-20')}>
        <header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur-xl">
          <div className="flex min-h-20 flex-col items-stretch justify-center gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Button variant="ghost" className="size-10 shrink-0 px-0 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label={openMenuLabel}>
                <Menu className="size-5" />
              </Button>
              <Button variant="ghost" className="hidden size-10 shrink-0 px-0 lg:inline-flex" onClick={toggleSidebar} aria-label={sharedLabel('collapseMenu')}>
                <Menu className="size-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2 truncate text-xs text-muted-foreground">
                  <span>{sharedLabel('home')}</span>
                  <ChevronLeft className="size-3" />
                  <span>{pageTitle}</span>
                </div>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
              <div className="min-w-0 truncate rounded-2xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:px-4">
                <span className="font-bold text-foreground">{syncStatus}</span>
                {lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString(appLanguage.locale)}` : ''}
              </div>
              <Button variant="secondary" className="size-10 px-0" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={sharedLabel('toggleTheme')}>
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
              <div className="hidden text-left text-xs text-muted-foreground xl:block" dir="ltr">{user?.email}</div>
            </div>
          </div>
        </header>
        <main className="animate-route-in overflow-x-hidden p-3 sm:p-5 lg:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
