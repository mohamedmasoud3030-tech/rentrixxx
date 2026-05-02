import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/print/layout/Layout';
import Login from '@/ui/Login';
import ChangePassword from '@/ui/ChangePassword';
import OwnerView from '@/ui/OwnerView';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { NAVIGATION_META } from '@/config/navigationMeta';
import { supabase } from '@/services/supabase';
import { applyThemePreset, initThemePreset, type ThemeMode } from '@/design-system';
import { applyBrandConfig } from '@/branding/brand-config/defaultBrand';
import { tenantThemeRegistry } from '@/branding/tenant-themes/tenantThemeRegistry';
import { applyUIPack } from '@/design-system/marketplace/uiPackRegistry';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppErrorFallback } from '@/components/AppErrorFallback';

const Dashboard = lazy(() => import('@/ui/Dashboard'));
const Properties = lazy(() => import('@/ui/Properties'));
const Tenants = lazy(() => import('@/ui/Tenants'));
const Owners = lazy(() => import('@/ui/Owners'));
const Contracts = lazy(() => import('@/ui/Contracts'));
const Finance = lazy(() => import('@/ui/Finance'));
const Reports = lazy(() => import('@/ui/Reports'));
const Settings = lazy(() => import('@/ui/System'));
const Leads = lazy(() => import('@/ui/Leads'));
const CommunicationHub = lazy(() => import('@/ui/CommunicationHub'));
const Lands = lazy(() => import('@/ui/Lands'));
const Commissions = lazy(() => import('@/ui/Commissions'));
const Maintenance = lazy(() => import('@/ui/Maintenance'));
const AuditLog = lazy(() => import('@/ui/AuditLog'));
const SmartAssistant = lazy(() => import('@/ui/SmartAssistant'));
const OwnersHub = lazy(() => import('@/ui/OwnersHub'));


const hexToHsl = (hex: string): string => {
  hex = hex.replace('#', '');
  const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
  const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
  const b = Number.parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const PageLoader: React.FC = () => {
  const { t } = useTranslation();
  return (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="animate-pulse text-sm font-bold text-text-muted">{t('app.loading')}</p>
    </div>
  </div>
);
};

const ROUTE_META: Record<string, { title: string; description: string }> = Object.fromEntries(
  Object.entries(NAVIGATION_META)
    .filter(([, meta]) => typeof meta.description === 'string')
    .map(([path, meta]) => [path, { title: meta.titleAr, description: meta.description as string }]),
);


const withRouteBoundary = (element: React.ReactNode, boundaryName: string): React.ReactNode => (
  <ErrorBoundary
    boundaryName={boundaryName}
    fallback={({ retry, severity }) => <AppErrorFallback retry={retry} severity={severity} />}
  >
    {element}
  </ErrorBoundary>
);

const withRouteGroupBoundary = (element: React.ReactNode, boundaryName: string): React.ReactNode => (
  <ErrorBoundary
    boundaryName={boundaryName}
    fallback={({ retry, severity }) => (
      <AppErrorFallback
        retry={retry}
        severity={severity}
        title="حدث خطأ في وحدة تشغيل حرجة / Critical module failure"
        description="تعذر تحميل هذه الوحدة حالياً. حاول مرة أخرى أو تواصل مع الدعم. / We could not load this module right now."
      />
    )}
  >
    {element}
  </ErrorBoundary>
);

type Todo = {
  id: number | string;
  name: string;
};

const App: React.FC = () => {
  const { settings, auth } = useApp();
  const location = useLocation();
  const [todos, setTodos] = useState<Todo[]>([]);


  useEffect(() => {
    async function getTodos() {
      const { data } = await supabase.from('todos').select('id, name');

      if (data) {
        setTodos(data as Todo[]);
      }
    }

    getTodos();
  }, []);

  useEffect(() => {
    initThemePreset('light');
  }, []);

  useEffect(() => {
    initThemePreset('light');
  }, []);

  useEffect(() => {
    if (settings) {
      const tenantKey = settings.general?.company?.name?.toLowerCase().includes('enterprise') ? 'enterprise' : 'rentrix';
      const brand = tenantThemeRegistry[tenantKey] ?? tenantThemeRegistry.rentrix;
      applyBrandConfig(brand);

      const theme = (settings.appearance?.theme as ThemeMode | undefined) ?? brand.defaultTheme ?? 'light';
      applyThemePreset(theme);
      const getUIPack = (t: string) => {
        if (t === 'glass') return 'glass';
        if (t === 'dark') return 'enterprise';
        return 'minimal';
      };
      applyUIPack(getUIPack(theme));

      const companyName = settings.general?.company?.name ?? brand.companyName;
      const primaryColor = settings.appearance?.primaryColor ?? brand.primaryColor;

      const matchedKey = ROUTE_META[location.pathname]
        ? location.pathname
        : Object.keys(ROUTE_META)
            .filter((k) => k !== '/')
            .sort((a, b) => b.length - a.length)
            .find((k) => location.pathname.startsWith(k)) || '/';

      const routeMeta = ROUTE_META[matchedKey];
      document.title = routeMeta ? `${routeMeta.title} — ${companyName}` : companyName;
      const descEl = document.querySelector('meta[name="description"]');
      if (descEl && routeMeta) descEl.setAttribute('content', routeMeta.description);
      const ogTitleEl = document.querySelector('meta[property="og:title"]');
      if (ogTitleEl && routeMeta) ogTitleEl.setAttribute('content', `${routeMeta.title} — ${companyName}`);
      const ogDescEl = document.querySelector('meta[property="og:description"]');
      if (ogDescEl && routeMeta) ogDescEl.setAttribute('content', routeMeta.description);
      const canonicalUrl = `${globalThis.location.origin}${location.pathname}`;
      const canonicalEl = document.getElementById('canonical-link') as HTMLLinkElement | null;
      if (canonicalEl) canonicalEl.href = canonicalUrl;
      const ogUrlEl = document.getElementById('og-url') as HTMLMetaElement | null;
      if (ogUrlEl) ogUrlEl.content = canonicalUrl;
      document.documentElement.style.setProperty('--color-primary', hexToHsl(primaryColor));
    }
  }, [settings, location.pathname]);

  if (auth.currentUser === undefined) return <PageLoader />;
  if (settings == null && auth.currentUser !== null) return <PageLoader />;

  return (
    <>
      <Toaster position="top-center" />

      {todos.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50 max-h-40 overflow-auto rounded-md border border-border bg-card/95 p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-text-muted">Supabase Todos</p>
          <ul className="space-y-1 text-xs">
            {todos.map((todo) => (
              <li key={todo.id}>{todo.name}</li>
            ))}
          </ul>
        </div>
      )}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/owner-view/:ownerId" element={withRouteBoundary(<OwnerView />, 'route-owner-view')} />
          <Route path="/portal/:ownerId" element={withRouteBoundary(<OwnerView />, 'route-portal-owner-view')} />

          {!auth.currentUser ? (
            <>
              <Route path="/login" element={withRouteBoundary(<Login />, 'route-login')} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : auth.currentUser.mustChange ? (
            <Route path="*" element={withRouteBoundary(<ChangePassword />, 'route-change-password')} />
          ) : (
            <Route element={withRouteBoundary(<Layout />, 'shell-layout')}>
              <Route path="/" element={withRouteBoundary(<Dashboard />, 'route-dashboard')} />
              <Route path="/properties" element={withRouteBoundary(<Properties />, 'route-properties')} />
              <Route path="/tenants" element={withRouteBoundary(<Tenants />, 'route-tenants')} />
              <Route path="/owners" element={withRouteBoundary(<Owners />, 'route-owners')} />
              <Route path="/owners/:ownerId/hub" element={withRouteBoundary(<OwnersHub />, 'route-owners-hub')} />
              <Route path="/contracts" element={withRouteBoundary(<Contracts />, 'route-contracts')} />
              <Route path="/maintenance" element={withRouteGroupBoundary(<Maintenance />, 'route-group-ops')} />
              <Route path="/financial/*" element={withRouteGroupBoundary(<ProtectedRoute capability="VIEW_FINANCIALS"><Finance /></ProtectedRoute>, 'route-group-finance')} />

              {/* CRM & Growth */}
              <Route path="/leads" element={withRouteBoundary(<Leads />, 'route-leads')} />
              <Route path="/communication" element={withRouteBoundary(<CommunicationHub />, 'route-communication')} />
              <Route path="/lands" element={withRouteBoundary(<Lands />, 'route-lands')} />
              <Route path="/commissions" element={withRouteBoundary(<Commissions />, 'route-commissions')} />
              <Route path="/reports" element={withRouteGroupBoundary(<Reports />, 'route-group-reports')} />
              <Route path="/smart-assistant" element={withRouteBoundary(<ProtectedRoute capability="USE_SMART_ASSISTANT"><SmartAssistant /></ProtectedRoute>, 'route-smart-assistant')} />
              {auth.currentUser.role === 'ADMIN' && (
                <>
                  <Route path="/audit-log" element={withRouteBoundary(<ProtectedRoute capability="VIEW_AUDIT_LOG"><AuditLog /></ProtectedRoute>, 'route-audit-log')} />
                  {/* Users: settings sub-module by design — see docs/architecture/ADR-001 */}
                  <Route path="/settings/*" element={withRouteBoundary(<ProtectedRoute capability="MANAGE_SETTINGS"><Settings /></ProtectedRoute>, 'route-settings')} />
                </>
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
