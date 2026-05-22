import { Link, Outlet, useMatches, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  Bot, Building2, ChevronLeft, ChevronRight, ClipboardList, FileText, Home,
  Landmark, LayoutDashboard, LogOut, Map, Menu, MessageCircle,
  Moon, ReceiptText, Settings, Sun, UserRoundCog, Users,
  WalletCards, Wrench, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { getAppLanguageState, translateSharedLabel } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

const navigation = [
  { to: '/',            labelKey: 'dashboard',   icon: LayoutDashboard },
  { to: '/properties',  labelKey: 'properties',  icon: Building2 },
  { to: '/tenants',     labelKey: 'tenants',      icon: Users },
  { to: '/owners',      labelKey: 'owners',      icon: UserRoundCog },
  { to: '/contracts',   labelKey: 'contracts',   icon: FileText },
  { to: '/financials',  labelKey: 'financials',  icon: WalletCards },
  { to: '/invoices',    labelKey: 'invoices',    icon: ReceiptText },
  { to: '/arrears',     labelKey: 'arrears',     icon: ClipboardList },
  { to: '/accounting',  labelKey: 'accounting',  icon: ReceiptText },
  { to: '/reports',     labelKey: 'reports',     icon: Home },
  { to: '/maintenance', labelKey: 'maintenance', icon: Wrench },
  { to: '/leads',       labelKey: 'leads',       icon: Users },
  { to: '/property-map', labelKey: 'propertyMap', icon: Map },
  { to: '/settings',   labelKey: 'settings',    icon: Settings },
] as const;

// Bottom nav shows the 5 most-used routes on mobile
const bottomNavItems = [
  { to: '/',           labelKey: 'dashboard',  icon: LayoutDashboard },
  { to: '/contracts',  labelKey: 'contracts',  icon: FileText },
  { to: '/financials', labelKey: 'financials', icon: WalletCards },
  { to: '/invoices',   labelKey: 'invoices',   icon: ReceiptText },
  { to: '/arrears',    labelKey: 'arrears',    icon: ClipboardList },
] as const;

const recoveryModules = [
  { to: '/communication', labelKey: 'communications', icon: MessageCircle, enabled: true },
  { to: '/audit-log', labelKey: 'auditLog', icon: ClipboardList, enabled: true },
  { to: '/assistant', labelKey: 'aiAssistant', icon: Bot, enabled: true },
  { labelKey: 'lands', icon: Landmark, enabled: false },
  { labelKey: 'commissions', icon: WalletCards, enabled: false },
] as const;

type SharedLabel = (key: string) => string;

function NavigationLinks({
  expanded,
  sharedLabel,
  onNavigate,
}: Readonly<{ expanded: boolean; sharedLabel: SharedLabel; onNavigate?: () => void }>) {
  return (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-white [&.active]:bg-primary [&.active]:text-primary-foreground [&.active]:shadow-[0_10px_28px_-14px_hsl(var(--primary))]"
            activeOptions={{ exact: item.to === '/' }}
          >
            <Icon className="size-5 shrink-0" />
            {expanded ? <span>{sharedLabel(item.labelKey)}</span> : null}
          </Link>
        );
      })}
    </>
  );
}

function RecoveryLinks({
  expanded,
  sharedLabel,
}: Readonly<{ expanded: boolean; sharedLabel: SharedLabel }>) {
  return (
    <>
      {expanded ? (
        <div className="pt-3">
          <p className="px-3 text-[11px] font-black uppercase tracking-wide text-sidebar-foreground/60">
            {sharedLabel('recoverySection')}
          </p>
        </div>
      ) : null}
      {recoveryModules.map((item) => {
        const Icon = item.icon;
        if (item.enabled && item.to) {
          return (
            <Link
              key={item.labelKey}
              to={item.to}
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-white [&.active]:bg-primary [&.active]:text-primary-foreground"
            >
              <Icon className="size-5 shrink-0" />
              {expanded ? <span>{sharedLabel(item.labelKey)}</span> : null}
            </Link>
          );
        }
        return (
          <div
            key={item.labelKey}
            className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-sidebar-foreground/55"
            title={sharedLabel('recoveryTooltip')}
          >
            <Icon className="size-5 shrink-0" />
            {expanded ? <span>{sharedLabel(item.labelKey)}</span> : null}
          </div>
        );
      })}
    </>
  );
}

function MobileNavigationDrawer({
  appName,
  closeMenuLabel,
  sharedLabel,
  onClose,
  onLogout,
}: Readonly<{
  appName: string;
  closeMenuLabel: string;
  sharedLabel: SharedLabel;
  onClose: () => void;
  onLogout: () => void;
}>) {
  return (
    <dialog
      open
      className="fixed inset-0 z-[90] m-0 h-dvh w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 lg:hidden"
      aria-label={closeMenuLabel}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55"
        aria-label={closeMenuLabel}
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sidebar">
        <div className="h-[3px] w-full bg-accent" />
        <div className="flex h-20 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-base font-black text-slate-950 shadow-lg shadow-blue-500/10">
              R
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-white">{appName}</p>
              <p className="truncate text-xs font-bold text-sidebar-foreground/70">
                {sharedLabel('realEstateManagement')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="size-10 shrink-0 px-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            onClick={onClose}
            aria-label={closeMenuLabel}
          >
            <X className="size-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavigationLinks expanded sharedLabel={sharedLabel} onNavigate={onClose} />
          <RecoveryLinks expanded sharedLabel={sharedLabel} />
        </nav>
        <div className="border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button
            variant="ghost"
            className="min-h-11 w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            onClick={onLogout}
          >
            <LogOut className="size-5" />
            <span>{sharedLabel('logout')}</span>
          </Button>
        </div>
      </aside>
    </dialog>
  );
}

/** Mobile bottom navigation bar — only the 5 primary routes */
function MobileBottomNav({
  sharedLabel,
}: Readonly<{ sharedLabel: SharedLabel }>) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid h-16 grid-cols-5">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors [&.active]:text-primary"
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-bold leading-none">
                {sharedLabel(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell() {
  const router = useRouter();
  const matches = useMatches();
  const { logout, user } = useAuth();
  const { sidebarCollapsed, theme, toggleSidebar, setTheme, syncStatus, lastSyncedAt } =
    useUiStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const appLanguage = getAppLanguageState();
  const isSidebarExpanded = sidebarCollapsed === false;

  const pageTitle =
    ([...matches]
      .reverse()
      .find((m) => (m.staticData as { title?: string } | undefined)?.title)
      ?.staticData as { title?: string } | undefined)?.title ?? 'Rentrix';

  const sharedLabel = (key: string) => translateSharedLabel(key, appLanguage.language);
  const appName = sharedLabel('appName');
  const openMenuLabel = appLanguage.language === 'ar' ? 'فتح القائمة' : 'Open menu';
  const closeMenuLabel = appLanguage.language === 'ar' ? 'إغلاق القائمة' : 'Close menu';

  useEffect(() => {
    document.title = `${pageTitle} | ${appName}`;
  }, [appName, pageTitle]);

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
    <div
      className="min-h-screen overflow-x-hidden bg-background text-foreground"
      dir={appLanguage.direction}
    >
      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <MobileNavigationDrawer
          appName={appName}
          closeMenuLabel={closeMenuLabel}
          sharedLabel={sharedLabel}
          onClose={closeMobileNav}
          onLogout={handleLogout}
        />
      ) : null}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-30 hidden overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sidebar transition-all lg:flex lg:flex-col',
          sidebarCollapsed ? 'w-20' : 'w-72',
        )}
      >
        <div className="h-[3px] w-full bg-accent" />
        <div className="flex h-24 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-white text-lg font-black text-slate-950 shadow-lg shadow-blue-500/10">
            R
          </div>
          {isSidebarExpanded ? (
            <div>
              <p className="text-xl font-black text-white">{appName}</p>
              <p className="text-xs font-bold text-sidebar-foreground/70">
                {sharedLabel('realEstateManagement')}
              </p>
            </div>
          ) : null}
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <NavigationLinks expanded={isSidebarExpanded} sharedLabel={sharedLabel} />
          <RecoveryLinks expanded={isSidebarExpanded} sharedLabel={sharedLabel} />
        </nav>
        <div className="border-t border-white/10 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="size-5" />
            {isSidebarExpanded ? <span>{sharedLabel('logout')}</span> : null}
          </Button>
        </div>
      </aside>

      {/* Content area */}
      <div className={cn('w-full transition-all lg:pr-72', sidebarCollapsed && 'lg:pr-20')}>
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-3 sm:h-20 sm:gap-3 sm:px-5">
            {/* Mobile: hamburger */}
            <Button
              variant="ghost"
              className="size-10 shrink-0 px-0 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label={openMenuLabel}
            >
              <Menu className="size-5" />
            </Button>
            {/* Desktop: collapse toggle */}
            <Button
              variant="ghost"
              className="hidden size-10 shrink-0 px-0 lg:inline-flex"
              onClick={toggleSidebar}
              aria-label={sharedLabel('collapseMenu')}
            >
              <Menu className="size-5" />
            </Button>

            {/* Title */}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                <span className="hidden sm:inline">{sharedLabel('home')}</span>
                {appLanguage.direction === "rtl" ? <ChevronRight className="hidden size-3 sm:inline" /> : <ChevronLeft className="hidden size-3 sm:inline" />}
                <span className="font-bold">{pageTitle}</span>
              </div>
              <h1 className="mt-0.5 truncate text-lg font-black tracking-tight sm:text-2xl lg:text-3xl">
                {pageTitle}
              </h1>
            </div>

            {/* Right actions */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Sync status — hidden on very small screens */}
              <div className="hidden min-w-0 max-w-[140px] truncate rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground sm:block sm:px-3">
                <span className="font-bold text-foreground">{syncStatus}</span>
                {lastSyncedAt
                  ? ` · ${new Date(lastSyncedAt).toLocaleTimeString(appLanguage.locale)}`
                  : ''}
              </div>
              <Button
                variant="secondary"
                className="size-9 px-0 sm:size-10"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={sharedLabel('toggleTheme')}
              >
                {theme === 'dark' ? <Sun className="size-4 sm:size-5" /> : <Moon className="size-4 sm:size-5" />}
              </Button>
              <div className="hidden text-left text-xs text-muted-foreground xl:block" dir="ltr">
                {user?.email}
              </div>
            </div>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for bottom nav */}
        <main className="animate-route-in overflow-x-hidden p-3 pb-24 sm:p-4 sm:pb-28 lg:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav sharedLabel={sharedLabel} />
    </div>
  );
}
